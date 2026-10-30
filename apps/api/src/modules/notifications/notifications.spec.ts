import { Test, TestingModule } from "@nestjs/testing";
import { ClockModule } from "../../common/clock/clock.module";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { DeadlinesModule } from "../deadlines/deadlines.module";
import { DueItemService } from "../deadlines/due-item.service";
import { DAY_MS } from "../deadlines/working-day-calendar.service";
import { NotificationsModule } from "./notifications.module";
import { NotificationsService } from "./notifications.service";
import { TemplateService } from "./template.service";
import { EscalationPolicyService } from "./escalation-policy.service";
import { ChannelsService } from "./channels.service";

describe("Phase 6: Notifications, Outbox Processor & Escalation Ladder Engine", () => {
  let moduleRef: TestingModule;
  let clock: SystemClockService;
  let dueItems: DueItemService;
  let templateService: TemplateService;
  let escalationPolicyService: EscalationPolicyService;
  let channelsService: ChannelsService;
  let notificationsService: NotificationsService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ClockModule,
        PrismaModule,
        AuditModule,
        DeadlinesModule,
        NotificationsModule,
      ],
    }).compile();

    clock = moduleRef.get(SystemClockService);
    dueItems = moduleRef.get(DueItemService);
    templateService = moduleRef.get(TemplateService);
    escalationPolicyService = moduleRef.get(EscalationPolicyService);
    channelsService = moduleRef.get(ChannelsService);
    notificationsService = moduleRef.get(NotificationsService);

    clock.setSimulatedTime(clock.parseIso("2026-04-06T03:30:00.000Z").getTime());
    notificationsService.resetAll();
  });

  it("1. Guarantees at-least-once outbox processing with strict deduplication by (recipient, event_key, channel) under duplicate events and worker restarts", async () => {
    const eventPayload = {
      eventKey: "DUE_ITEM:DUE-DUP-001:STEP:OVERDUE_L0",
      dueItemId: "DUE-DUP-001",
      kind: "PROCESSING_STAGE" as const,
      escalationLevel: 0 as const,
      applicationId: "APP-2026-DUP-01",
      institution: "Vellore Institute of Technology & Engineering, Tamil Nadu",
      dueDate: "2026-04-06",
      daysRemaining: 0,
      actionLink: "/applications/APP-2026-DUP-01",
    };

    // Enqueue the exact same event 3 times (simulating duplicate outbox insertion + worker restart)
    notificationsService.enqueueOutboxEvent(eventPayload);
    notificationsService.enqueueOutboxEvent(eventPayload);
    notificationsService.enqueueOutboxEvent(eventPayload);

    // Run processor pass 1
    const pass1 = await notificationsService.processOutboxEvents();
    // Level 0 for PROCESSING_STAGE notifies 2 roles (COMMITTEE_MEMBER, INSTITUTION) x 3 channels (IN_APP, EMAIL, SMS) = 6 unique deliveries
    // The 2 duplicate outbox events must be deduplicated (6 * 2 = 12 skipped)
    expect(pass1.deliveriesSucceeded).toBe(6);
    expect(pass1.deduplicatedSkipped).toBe(12);

    // Simulate worker restart and re-enqueueing the same event (re-scanning all 4 outbox items = 24 skipped, 0 delivered)
    notificationsService.enqueueOutboxEvent(eventPayload);
    const pass2 = await notificationsService.processOutboxEvents();
    expect(pass2.deliveriesSucceeded).toBe(0);
    expect(pass2.deduplicatedSkipped).toBe(24);

    const allDeliveries = notificationsService.getDeliveryLog();
    expect(allDeliveries.length).toBe(6);
    expect(allDeliveries.every((d) => d.status === "DELIVERED")).toBe(true);
  });

  it("2. Renders English (en) and Hindi (hi) Handlebars templates with version immutability and SMS template-id enforcement", () => {
    const rendered = templateService.render(
      "TPL_ESCALATION_L1_REGIONAL_OFFICER",
      {
        institution: "COEP Technological University, Pune",
        applicationId: "APP-2026-0108",
        dueDate: "2026-04-15",
        daysRemaining: -3,
        actionLink: "/applications/APP-2026-0108",
      },
    );

    expect(rendered.en.subject).toContain("APP-2026-0108");
    expect(rendered.en.subject).toContain(
      "COEP Technological University, Pune",
    );
    expect(rendered.hi.subject).toContain("समय वृद्धि L1");
    expect(rendered.hi.body).toContain("COEP Technological University, Pune");
    expect(rendered.hi.body).toContain("/applications/APP-2026-0108");
    expect(rendered.smsTemplateId).toBe("DLT-AICTE-ESC-L1-RO-002");

    // Create v2 of the template and verify v1 remains immutable
    const v2 = templateService.createNewTemplateVersion({
      code: "TPL_ESCALATION_L1_REGIONAL_OFFICER",
      name: "Escalation Level 1 - Regional Officer Alert (v2)",
      smsTemplateId: "DLT-AICTE-ESC-L1-RO-V2",
      subjectEn: "[SAMAY-V2] L1 Alert for {{applicationId}}",
      bodyEn: "V2 EN Body for {{institution}}",
      subjectHi: "[SAMAY-V2-HI] {{applicationId}} सूचना",
      bodyHi: "V2 HI Body for {{institution}}",
      smsBodyEn: "V2 SMS EN {{applicationId}}",
      smsBodyHi: "V2 SMS HI {{applicationId}}",
    });

    expect(v2.version).toBe(2);
    const v1Rendered = templateService.render(
      "TPL_ESCALATION_L1_REGIONAL_OFFICER",
      {
        institution: "COEP Technological University, Pune",
        applicationId: "APP-2026-0108",
        dueDate: "2026-04-15",
        daysRemaining: -3,
        actionLink: "/applications/APP-2026-0108",
      },
      1,
    );
    expect(v1Rendered.templateVersion).toBe(1);
    expect(v1Rendered.smsTemplateId).toBe("DLT-AICTE-ESC-L1-RO-002");
  });

  it("3. Handles channel failure with exponential backoff retries (1000ms, 2000ms, 4000ms), records FAILED status, and replays to DELIVERED", async () => {
    notificationsService.setSimulatedFailure("EMAIL", true);

    notificationsService.enqueueOutboxEvent({
      eventKey: "DUE_ITEM:DUE-FAIL-01:STEP:OVERDUE_L2",
      kind: "PROCESSING_STAGE",
      escalationLevel: 2,
      applicationId: "APP-2026-FAIL-01",
      institution: "PSG College of Technology, Coimbatore",
      dueDate: "2026-04-10",
      daysRemaining: -7,
      actionLink: "/applications/APP-2026-FAIL-01",
    });

    const result = await notificationsService.processOutboxEvents();
    // Level 2 notifies BUREAU_OFFICER across IN_APP, EMAIL, SMS -> IN_APP and SMS succeed (2), EMAIL fails (1)
    expect(result.deliveriesSucceeded).toBe(2);
    expect(result.deliveriesFailed).toBe(1);

    const failedList = notificationsService.getFailedDeliveries();
    expect(failedList.length).toBe(1);
    expect(failedList[0].channel).toBe("EMAIL");
    expect(failedList[0].status).toBe("FAILED");
    expect(failedList[0].attemptNumber).toBe(1);
    expect(failedList[0].nextRetryBackoffMs).toBe(1000);

    // Replay while still failing -> attempt 2 backoff doubles to 2000ms
    const retryAttempt2 = await notificationsService.replayFailedDelivery(
      failedList[0].id,
    );
    expect(retryAttempt2.status).toBe("FAILED");
    expect(retryAttempt2.attemptNumber).toBe(2);
    expect(retryAttempt2.nextRetryBackoffMs).toBe(2000);

    // Replay while still failing -> attempt 3 backoff doubles to 4000ms
    const retryAttempt3 = await notificationsService.replayFailedDelivery(
      failedList[0].id,
    );
    expect(retryAttempt3.status).toBe("FAILED");
    expect(retryAttempt3.attemptNumber).toBe(3);
    expect(retryAttempt3.nextRetryBackoffMs).toBe(4000);

    // Restore EMAIL health and replay failed delivery
    notificationsService.setSimulatedFailure("EMAIL", false);
    const replayed = await notificationsService.replayFailedDelivery(
      failedList[0].id,
    );
    expect(replayed.status).toBe("DELIVERED");
    expect(notificationsService.getFailedDeliveries().length).toBe(0);
  });

  it("4. Simulates a 60-day timeline escalation ladder across L0 -> L1 -> L2 -> L3 with zero duplicate firings", async () => {
    const startMs = clock.parseIso("2026-06-01T03:30:00.000Z").getTime();
    clock.setSimulatedTime(startMs);

    const dueItem = await dueItems.createDueItem({
      id: "99999999-9999-4999-8999-999999999060",
      label: "60-DAY-LADDER:APP-2026-0600",
      kind: "UNDERTAKING",
      entityType: "UNDERTAKING",
      entityId: "44444444-4444-4444-8444-444444444405",
      dueAt: clock.fromEpochMs(startMs + 35 * DAY_MS),
      warningOffsets: [-30, -15, -7, -1],
    });

    // Advance day-by-day over 60 days, running sweep + outbox processor each day
    for (let day = 1; day <= 60; day++) {
      clock.advanceDays(1);
      await dueItems.runSweep();
      notificationsService.syncFromDueItemOutbox({
        applicationId: "APP-2026-0600",
        institution: "National Institute of Foundry & Forge Technology, Ranchi",
      });
      await notificationsService.processOutboxEvents();
    }

    const updatedItem = dueItems.getDueItem(dueItem.id);
    expect(updatedItem.status).toBe("OVERDUE");
    expect(updatedItem.escalationLevel).toBe(3);

    // Steps fired over 60 days:
    // T-30 (L0), T-15 (L0), T-7 (L0), T-1 (L0), OVERDUE (L0) -> 5 steps at L0 * 2 roles * 3 channels = 30 deliveries
    // ESCALATION_L1 (L1: RO) -> 1 * 3 = 3 deliveries
    // ESCALATION_L2 (L2: Bureau) -> 1 * 3 = 3 deliveries
    // ESCALATION_L3 (L3: Admin) -> 1 * 3 = 3 deliveries
    // Total = 39 deliveries across the 60-day timeline, never duplicated despite 60 daily sweeps
    const logs = notificationsService.getDeliveryLog();
    expect(logs.length).toBe(39);
    expect(logs.every((l) => l.status === "DELIVERED")).toBe(true);
    expect(escalationPolicyService.listPolicies().length).toBe(6);
  });

  it("5. Verification Deliverable: Uses the Demo Clock to push an overdue item through all levels (L0 -> L1 -> L2 -> L3) and prints Delivery Log, Mailpit Inbox, and In-App Notifications per Role", async () => {
    notificationsService.resetAll();

    const report =
      await notificationsService.runDemoClockEscalationLadderVerification({
        applicationId: "APP-2026-WRO-00104",
        institution: "Walchand College of Engineering, Sangli",
      });

    expect(report.finalEscalationLevel).toBe(3);
    expect(report.deliveryLogSummary.byStatus.DELIVERED).toBe(21);
    expect(report.deliveryLogSummary.byStatus.FAILED).toBe(0);
    expect(report.mailpitInbox.length).toBe(7);
    expect(report.smsGatewayReceipts.length).toBe(7);
    expect(
      report.inAppNotificationsByRole.INSTITUTION.length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      report.inAppNotificationsByRole.COMMITTEE_MEMBER.length,
    ).toBeGreaterThanOrEqual(2);
    expect(report.inAppNotificationsByRole.REGIONAL_OFFICER.length).toBe(1);
    expect(report.inAppNotificationsByRole.BUREAU_OFFICER.length).toBe(1);
    expect(report.inAppNotificationsByRole.ADMIN.length).toBe(1);

    // Print formatted Verification Deliverable tables
    console.log(
      "\n==========================================================================================",
    );
    console.log(
      "PHASE 6 VERIFICATION DELIVERABLE: DEMO CLOCK ESCALATION LADDER (L0 -> L1 -> L2 -> L3)",
    );
    console.log(
      `Demo Clock State: ${report.demoClockState.bannerText}`,
    );
    console.log(
      "==========================================================================================",
    );

    console.log("\n--- 1. DELIVERY LOG (QUEUED -> SENT -> DELIVERED) ---");
    console.table(
      report.deliveryLogSummary.entries.map((d) => ({
        Role: d.recipientRole,
        Recipient: d.recipientEmail,
        Channel: d.channel,
        Level: `L${d.escalationLevel}`,
        EventKey: d.eventKey.split(":").slice(-1)[0],
        Transitions: d.statusTransitions,
        SmsTemplateId: d.smsTemplateId ?? "-",
      })),
    );

    console.log("\n--- 2. MAILPIT SMTP INBOX ---");
    console.table(
      report.mailpitInbox.map((m) => ({
        MsgID: m.id,
        Role: m.recipientRole,
        To: m.to,
        SubjectEN: m.subjectEn.slice(0, 62),
        SubjectHI: m.subjectHi.slice(0, 48),
        SMTP: m.smtpResponse,
      })),
    );

    console.log("\n--- 3. IN-APP NOTIFICATIONS PER ROLE (SSE & BELL) ---");
    const roleRows = Object.entries(report.inAppNotificationsByRole).flatMap(
      ([role, items]) =>
        items.map((item) => ({
          Role: role,
          Level: `L${item.level}`,
          Step: item.eventKey.split(":").slice(-1)[0],
          TitleEN: item.titleEn.slice(0, 56),
          TitleHI: item.titleHi.slice(0, 44),
          DeepLink: item.actionLink,
        })),
    );
    console.table(roleRows);

    expect(channelsService.getUnreadCountsByRole().TOTAL).toBe(7);
  });
});
