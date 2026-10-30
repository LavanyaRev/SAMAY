import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { UserRole } from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";
import { DueItemKind, DueItemService } from "../deadlines/due-item.service";
import { DAY_MS } from "../deadlines/working-day-calendar.service";
import { ChannelsService } from "./channels.service";
import {
  EscalationPolicyService,
  NotificationChannelType,
} from "./escalation-policy.service";
import { TemplateService, TemplateVariables } from "./template.service";

export type DeliveryStatus = "QUEUED" | "SENT" | "DELIVERED" | "FAILED";

export interface NotificationDeliveryRecord {
  id: string;
  dedupKey: string; // (recipient, event_key, channel)
  recipientEmail: string;
  recipientPhone: string;
  recipientRole: string;
  eventKey: string;
  channel: NotificationChannelType;
  escalationLevel: number;
  templateCode: string;
  smsTemplateId: string;
  variables: TemplateVariables;
  status: DeliveryStatus;
  statusHistory: DeliveryStatus[];
  attemptNumber: number;
  maxAttempts: number;
  nextRetryBackoffMs: number;
  nextRetryAt: string | null;
  lastError: string | null;
  queuedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
}

export interface OutboxEventItem {
  id: string;
  eventKey: string;
  dueItemId: string;
  kind: DueItemKind;
  escalationLevel: 0 | 1 | 2 | 3;
  applicationId: string;
  institution: string;
  dueDate: string;
  daysRemaining: number;
  actionLink: string;
  status: "PENDING" | "PROCESSED";
  createdAt: string;
}

const ROLE_DIRECTORY: Record<
  string,
  { email: string; phone: string; name: string }
> = {
  [UserRole.INSTITUTION]: {
    email: "institution@aicte.gov.in",
    phone: "+919820010001",
    name: "Dr. Arvind Kulkarni (Principal, Walchand College)",
  },
  [UserRole.COMMITTEE_MEMBER]: {
    email: "committee.member@aicte.gov.in",
    phone: "+919820010002",
    name: "Prof. Vikram Rao (Responsible Scrutiny Officer)",
  },
  [UserRole.REGIONAL_OFFICER]: {
    email: "ro.western@aicte.gov.in",
    phone: "+919820010003",
    name: "Dr. Suresh Patil (Regional Officer WRO)",
  },
  [UserRole.BUREAU_OFFICER]: {
    email: "bureau.officer@aicte.gov.in",
    phone: "+919820010004",
    name: "Dr. Anita Deshmukh (Approval Bureau Officer HQ)",
  },
  [UserRole.ADMIN]: {
    email: "admin@aicte.gov.in",
    phone: "+919820010005",
    name: "Dr. Rameshwar Prasad (Designated Council Head)",
  },
};

@Injectable()
export class NotificationsService {
  private readonly outboxQueue: OutboxEventItem[] = [];

  /**
   * Deduplication index keyed by `${recipientEmail}::${eventKey}::${channel}`.
   * Guarantees at-least-once processing with strictly idempotent delivery.
   */
  private readonly dedupIndex = new Map<string, NotificationDeliveryRecord>();
  private readonly deliveryLog: NotificationDeliveryRecord[] = [];
  private readonly simulatedChannelFailures = new Set<string>();
  private readonly processedSweepStepIds = new Set<string>();

  constructor(
    private readonly clock: SystemClockService,
    private readonly policies: EscalationPolicyService,
    private readonly templates: TemplateService,
    private readonly channels: ChannelsService,
    private readonly dueItems: DueItemService,
  ) {}

  resetAll(): void {
    this.outboxQueue.length = 0;
    this.dedupIndex.clear();
    this.deliveryLog.length = 0;
    this.simulatedChannelFailures.clear();
    this.processedSweepStepIds.clear();
    this.channels.resetAllChannels();
    this.policies.resetDefaultPolicies();
    this.templates.resetDefaultTemplates();
  }

  /**
   * Configures a simulated channel failure for testing exponential backoff retries & replay.
   * Key format: `${recipientEmail}::${channel}` or `${channel}`
   */
  setSimulatedFailure(key: string, shouldFail: boolean): void {
    if (shouldFail) {
      this.simulatedChannelFailures.add(key);
    } else {
      this.simulatedChannelFailures.delete(key);
    }
  }

  /**
   * Enqueues an outbox event for the Outbox Processor.
   */
  enqueueOutboxEvent(input: {
    id?: string;
    eventKey: string;
    dueItemId?: string;
    kind: DueItemKind;
    escalationLevel: 0 | 1 | 2 | 3;
    applicationId: string;
    institution: string;
    dueDate: string;
    daysRemaining: number;
    actionLink?: string;
  }): OutboxEventItem {
    const item: OutboxEventItem = {
      id: input.id ?? randomUUID(),
      eventKey: input.eventKey,
      dueItemId: input.dueItemId ?? randomUUID(),
      kind: input.kind,
      escalationLevel: input.escalationLevel,
      applicationId: input.applicationId,
      institution: input.institution,
      dueDate: input.dueDate,
      daysRemaining: input.daysRemaining,
      actionLink:
        input.actionLink ?? `/applications/${input.applicationId}`,
      status: "PENDING",
      createdAt: this.clock.isoString(),
    };
    this.outboxQueue.push(item);
    return item;
  }

  /**
   * Synchronizes any newly emitted `DEADLINE_STEP_FIRED` outbox events from DueItemService
   * into the notification outbox queue.
   */
  syncFromDueItemOutbox(defaultMeta?: {
    applicationId?: string;
    institution?: string;
  }): number {
    const rawEvents = this.dueItems.getOutboxEvents();
    let imported = 0;

    for (const raw of rawEvents) {
      if (this.processedSweepStepIds.has(raw.id)) continue;
      this.processedSweepStepIds.add(raw.id);

      const p = raw.payload as Record<string, unknown>;
      const stepKey = String(p.stepKey || "OVERDUE");
      const dueItemId = String(p.dueItemId || raw.aggregateId);
      const kind = (p.kind as DueItemKind) || "PROCESSING_STAGE";
      const dueAtIso = String(p.dueAt || this.clock.isoString());

      let level: 0 | 1 | 2 | 3 = 0;
      if (stepKey === "ESCALATION_L1") level = 1;
      else if (stepKey === "ESCALATION_L2") level = 2;
      else if (stepKey === "ESCALATION_L3") level = 3;
      else level = 0;

      const dueMs = this.clock.parseIso(dueAtIso).getTime();
      const nowMs = this.clock.timestamp();
      const daysRemaining = Math.round((dueMs - nowMs) / DAY_MS);

      this.enqueueOutboxEvent({
        id: raw.id,
        eventKey: `${dueItemId}:${stepKey}`,
        dueItemId,
        kind,
        escalationLevel: level,
        applicationId:
          defaultMeta?.applicationId ||
          String(p.entityId || "APP-2026-WRO-00104"),
        institution:
          defaultMeta?.institution ||
          "Walchand College of Engineering, Sangli",
        dueDate: dueAtIso.slice(0, 10),
        daysRemaining,
        actionLink: `/applications/${String(p.entityId || "44444444-4444-4444-8444-444444444401")}`,
      });
      imported++;
    }
    return imported;
  }

  /**
   * Outbox Processor:
   * Polls pending outbox events, maps each event to notifications using the
   * escalation policy for that due-item kind and level, and delivers them across
   * IN_APP, EMAIL (Mailpit), and SMS (Mock Gateway) with deduplication by
   * `(recipient, event_key, channel)`.
   */
  async processOutboxEvents(): Promise<{
    eventsProcessed: number;
    deliveriesAttempted: number;
    deliveriesSucceeded: number;
    deliveriesFailed: number;
    deduplicatedSkipped: number;
  }> {
    this.syncFromDueItemOutbox();

    let eventsProcessed = 0;
    let deliveriesAttempted = 0;
    let deliveriesSucceeded = 0;
    let deliveriesFailed = 0;
    let deduplicatedSkipped = 0;

    for (const ev of this.outboxQueue) {
      const levelRule = this.policies.getLevelRule(
        ev.kind,
        ev.escalationLevel,
      );
      const variables: TemplateVariables = {
        institution: ev.institution,
        applicationId: ev.applicationId,
        dueDate: ev.dueDate,
        daysRemaining: ev.daysRemaining,
        actionLink: ev.actionLink,
        escalationLevel: ev.escalationLevel,
      };

      for (const role of levelRule.notifyRoles) {
        const recipientInfo = ROLE_DIRECTORY[role] || {
          email: `${String(role).toLowerCase()}@aicte.gov.in`,
          phone: "+919820010099",
          name: String(role),
        };

        for (const channel of levelRule.channels) {
          const dedupKey = `${recipientInfo.email}::${ev.eventKey}::${channel}`;
          const existing = this.dedupIndex.get(dedupKey);

          if (existing && existing.status === "DELIVERED") {
            deduplicatedSkipped++;
            continue;
          }

          deliveriesAttempted++;
          const delivery =
            existing ??
            this.createQueuedDelivery({
              dedupKey,
              recipientEmail: recipientInfo.email,
              recipientPhone: recipientInfo.phone,
              recipientRole: String(role),
              eventKey: ev.eventKey,
              channel,
              escalationLevel: ev.escalationLevel,
              templateCode: levelRule.templateCode,
              variables,
            });

          const outcome = await this.executeSingleDelivery(delivery);
          if (outcome.status === "DELIVERED") {
            deliveriesSucceeded++;
          } else {
            deliveriesFailed++;
          }
        }
      }

      ev.status = "PROCESSED";
      eventsProcessed++;
    }

    return {
      eventsProcessed,
      deliveriesAttempted,
      deliveriesSucceeded,
      deliveriesFailed,
      deduplicatedSkipped,
    };
  }

  private createQueuedDelivery(input: {
    dedupKey: string;
    recipientEmail: string;
    recipientPhone: string;
    recipientRole: string;
    eventKey: string;
    channel: NotificationChannelType;
    escalationLevel: number;
    templateCode: string;
    variables: TemplateVariables;
  }): NotificationDeliveryRecord {
    const activeTpl = this.templates.getActiveTemplate(input.templateCode);
    const nowIso = this.clock.isoString();
    const record: NotificationDeliveryRecord = {
      id: randomUUID(),
      dedupKey: input.dedupKey,
      recipientEmail: input.recipientEmail,
      recipientPhone: input.recipientPhone,
      recipientRole: input.recipientRole,
      eventKey: input.eventKey,
      channel: input.channel,
      escalationLevel: input.escalationLevel,
      templateCode: input.templateCode,
      smsTemplateId: activeTpl.smsTemplateId,
      variables: input.variables,
      status: "QUEUED",
      statusHistory: ["QUEUED"],
      attemptNumber: 0,
      maxAttempts: 5,
      nextRetryBackoffMs: 0,
      nextRetryAt: null,
      lastError: null,
      queuedAt: nowIso,
      sentAt: null,
      deliveredAt: null,
      failedAt: null,
    };
    this.dedupIndex.set(input.dedupKey, record);
    this.deliveryLog.push(record);
    return record;
  }

  private async executeSingleDelivery(
    delivery: NotificationDeliveryRecord,
  ): Promise<NotificationDeliveryRecord> {
    const nowIso = this.clock.isoString();
    delivery.attemptNumber += 1;

    // Transition QUEUED -> SENT
    delivery.status = "SENT";
    delivery.statusHistory.push("SENT");
    delivery.sentAt = nowIso;

    try {
      // Check if simulated failure is enabled for this channel or recipient
      if (
        this.simulatedChannelFailures.has(delivery.channel) ||
        this.simulatedChannelFailures.has(
          `${delivery.recipientEmail}::${delivery.channel}`,
        )
      ) {
        throw new Error(
          `Simulated transient ${delivery.channel} transport timeout on attempt #${delivery.attemptNumber}`,
        );
      }

      const rendered = this.templates.render(
        delivery.templateCode,
        delivery.variables,
      );

      if (delivery.channel === "IN_APP") {
        await this.channels.deliverInApp({
          recipientRole: delivery.recipientRole,
          recipientEmail: delivery.recipientEmail,
          applicationId: delivery.variables.applicationId,
          institution: delivery.variables.institution,
          escalationLevel: delivery.escalationLevel,
          titleEn: rendered.en.subject,
          bodyEn: rendered.en.body,
          titleHi: rendered.hi.subject,
          bodyHi: rendered.hi.body,
          actionLink: delivery.variables.actionLink,
          eventKey: delivery.eventKey,
        });
      } else if (delivery.channel === "EMAIL") {
        await this.channels.deliverEmailToMailpit({
          toEmail: delivery.recipientEmail,
          recipientRole: delivery.recipientRole,
          subjectEn: rendered.en.subject,
          bodyEn: rendered.en.body,
          subjectHi: rendered.hi.subject,
          bodyHi: rendered.hi.body,
          actionLink: delivery.variables.actionLink,
        });
      } else if (delivery.channel === "SMS") {
        await this.channels.deliverSms({
          recipientPhone: delivery.recipientPhone,
          recipientRole: delivery.recipientRole,
          templateId: rendered.smsTemplateId,
          messageEn: rendered.en.sms,
          messageHi: rendered.hi.sms,
          eventKey: delivery.eventKey,
        });
      }

      // Transition SENT -> DELIVERED
      delivery.status = "DELIVERED";
      delivery.statusHistory.push("DELIVERED");
      delivery.deliveredAt = this.clock.isoString();
      delivery.lastError = null;
      delivery.nextRetryBackoffMs = 0;
      delivery.nextRetryAt = null;
      return delivery;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Delivery failed";
      // Exponential backoff: 1000ms * 2^(attempt - 1)
      const backoffMs = 1000 * Math.pow(2, delivery.attemptNumber - 1);
      const nextRetryDate = this.clock.fromEpochMs(
        this.clock.timestamp() + backoffMs,
      );

      delivery.status = "FAILED";
      delivery.statusHistory.push("FAILED");
      delivery.failedAt = this.clock.isoString();
      delivery.lastError = errorMessage;
      delivery.nextRetryBackoffMs = backoffMs;
      delivery.nextRetryAt = nextRetryDate.toISOString();
      return delivery;
    }
  }

  /**
   * Failed-delivery list & replay
   */
  getDeliveryLog(filter?: {
    status?: DeliveryStatus;
    channel?: NotificationChannelType;
    recipientRole?: string;
  }): NotificationDeliveryRecord[] {
    return this.deliveryLog.filter((d) => {
      if (filter?.status && d.status !== filter.status) return false;
      if (filter?.channel && d.channel !== filter.channel) return false;
      if (
        filter?.recipientRole &&
        filter.recipientRole !== "ALL" &&
        d.recipientRole !== filter.recipientRole
      ) {
        return false;
      }
      return true;
    });
  }

  getFailedDeliveries(): NotificationDeliveryRecord[] {
    return this.deliveryLog.filter((d) => d.status === "FAILED");
  }

  async replayFailedDelivery(
    deliveryId: string,
  ): Promise<NotificationDeliveryRecord> {
    const found = this.deliveryLog.find((d) => d.id === deliveryId);
    if (!found) {
      throw new NotFoundException(`Delivery record ${deliveryId} not found`);
    }
    found.status = "QUEUED";
    found.statusHistory.push("QUEUED");
    return this.executeSingleDelivery(found);
  }

  async replayAllFailedDeliveries(): Promise<{
    replayedCount: number;
    deliveredCount: number;
    stillFailedCount: number;
  }> {
    const failed = this.getFailedDeliveries();
    let deliveredCount = 0;
    let stillFailedCount = 0;

    for (const d of failed) {
      d.status = "QUEUED";
      d.statusHistory.push("QUEUED");
      const res = await this.executeSingleDelivery(d);
      if (res.status === "DELIVERED") deliveredCount++;
      else stillFailedCount++;
    }

    return {
      replayedCount: failed.length,
      deliveredCount,
      stillFailedCount,
    };
  }

  /**
   * Verification Helper:
   * Uses the Demo Clock to push an overdue DueItem through all escalation levels
   * (Level 0 -> Level 1 -> Level 2 -> Level 3), returning the complete Delivery Log,
   * Mailpit Inbox, and In-App Notifications grouped by Role.
   */
  async runDemoClockEscalationLadderVerification(input?: {
    applicationId?: string;
    institution?: string;
  }) {
    const applicationId = input?.applicationId || "APP-2026-WRO-00104";
    const institution =
      input?.institution || "Walchand College of Engineering, Sangli";

    // Anchor clock and create a DueItem due in 7 days
    const startEpoch = this.clock.parseIso("2026-05-01T03:30:00.000Z").getTime();
    this.clock.setSimulatedTime(startEpoch);

    const dueItem = await this.dueItems.createDueItem({
      id: "88888888-8888-4888-8888-888888888001",
      label: `VERIFY-LADDER:${applicationId}`,
      kind: "PROCESSING_STAGE",
      entityType: "APPLICATION",
      entityId: "44444444-4444-4444-8444-444444444401",
      dueAt: this.clock.fromEpochMs(startEpoch + 7 * DAY_MS),
      warningOffsets: [-1],
    });

    // Step through days on the demo clock:
    // Day 6 -> T-1 (Level 0: COMMITTEE_MEMBER & INSTITUTION)
    // Day 7 -> OVERDUE (Level 0: COMMITTEE_MEMBER & INSTITUTION)
    // Day 8 -> ESCALATION_L1 (Level 1: REGIONAL_OFFICER)
    // Day 10 -> ESCALATION_L2 (Level 2: BUREAU_OFFICER)
    // Day 14 -> ESCALATION_L3 (Level 3: ADMIN / Designated Head)
    const checkpointDays = [6, 7, 8, 10, 14];
    let currentDay = 0;

    for (const targetDay of checkpointDays) {
      const delta = targetDay - currentDay;
      this.clock.advanceDays(delta);
      currentDay = targetDay;
      await this.dueItems.runSweep();
      this.syncFromDueItemOutbox({ applicationId, institution });
      await this.processOutboxEvents();
    }

    const inAppByRole: Record<string, Array<{ level: number; eventKey: string; titleEn: string; titleHi: string; actionLink: string }>> = {
      INSTITUTION: [],
      COMMITTEE_MEMBER: [],
      REGIONAL_OFFICER: [],
      BUREAU_OFFICER: [],
      ADMIN: [],
    };

    for (const n of this.channels.getInAppNotifications()) {
      if (!inAppByRole[n.recipientRole]) {
        inAppByRole[n.recipientRole] = [];
      }
      inAppByRole[n.recipientRole].push({
        level: n.escalationLevel,
        eventKey: n.eventKey,
        titleEn: n.titleEn,
        titleHi: n.titleHi,
        actionLink: n.actionLink,
      });
    }

    return {
      dueItemId: dueItem.id,
      finalEscalationLevel: this.dueItems.getDueItem(dueItem.id).escalationLevel,
      demoClockState: this.clock.getDemoClockState(),
      deliveryLogSummary: {
        totalDeliveries: this.deliveryLog.length,
        byStatus: {
          DELIVERED: this.deliveryLog.filter((d) => d.status === "DELIVERED").length,
          FAILED: this.deliveryLog.filter((d) => d.status === "FAILED").length,
        },
        entries: this.deliveryLog.map((d) => ({
          id: d.id,
          recipientRole: d.recipientRole,
          recipientEmail: d.recipientEmail,
          channel: d.channel,
          escalationLevel: d.escalationLevel,
          eventKey: d.eventKey,
          statusTransitions: d.statusHistory.join(" -> "),
          smsTemplateId: d.channel === "SMS" ? d.smsTemplateId : undefined,
        })),
      },
      mailpitInbox: this.channels.getMailpitMessages().map((m) => ({
        id: m.id,
        to: m.to[0],
        recipientRole: m.recipientRole,
        subjectEn: m.subjectEn,
        subjectHi: m.subjectHi,
        smtpResponse: m.smtpResponse,
      })),
      inAppNotificationsByRole: inAppByRole,
      smsGatewayReceipts: this.channels.getSmsMessages(),
    };
  }

  /**
   * Backward-compatible methods
   */
  getPendingOutbox() {
    const pending = this.outboxQueue.filter((e) => e.status === "PENDING");
    return {
      pendingCount: pending.length,
      items: pending,
      checkedAt: this.clock.isoString(),
    };
  }

  enqueue(payload: {
    recipient: string;
    channel: "EMAIL" | "SMS" | "IN_APP";
    template: string;
    idempotencyKey: string;
  }) {
    return {
      outboxId: "outbox-uuid-sample",
      ...payload,
      status: "PENDING_DISPATCH",
      enqueuedAt: this.clock.isoString(),
    };
  }
}
