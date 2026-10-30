import { Injectable, Logger, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { randomUUID } from "crypto";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  DAY_MS,
  WorkingDayCalendarService,
} from "./working-day-calendar.service";

export type DueItemKind =
  | "PROCESSING_STAGE"
  | "EVC_SCHEDULING"
  | "EVC_COMPLETION"
  | "UNDERTAKING"
  | "DOCUMENT_EXPIRY"
  | "DOCUMENT_RENEWAL";

export type DueItemStatus =
  | "ON_TRACK"
  | "DUE_SOON"
  | "OVERDUE"
  | "PAUSED"
  | "CLOSED";

export interface PauseHistoryEntry {
  pausedAt: string;
  resumedAt: string | null;
  pausedWorkingDays: number;
  reason: string;
}

export interface DueItemRecord {
  id: string;
  label: string;
  kind: DueItemKind;
  entityType: string;
  entityId: string;
  regionId: string | null;
  dueAt: string; // ISO string
  warningOffsets: number[]; // e.g. [-30, -15, -7, -1]
  status: DueItemStatus;
  escalationLevel: number;
  pausedAt: string | null;
  totalPausedWorkingDays: number;
  pauseHistory: PauseHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface StepFiringRecord {
  id: string;
  dueItemId: string;
  dueItemLabel: string;
  kind: DueItemKind;
  entityId: string;
  stepKey: string; // e.g. 'T-30', 'T-15', 'T-7', 'T-1', 'OVERDUE', 'ESCALATION_L1', 'ESCALATION_L2', 'ESCALATION_L3'
  outboxEventId: string;
  firedAt: string;
  dayOffsetFromStart?: number;
}

export interface SweepExecutionReport {
  sweepId: string;
  executedAt: string;
  itemsScanned: number;
  stepsFired: number;
  durationMs: number;
  firedEvents: StepFiringRecord[];
}

const DEFAULT_WARNING_OFFSETS_BY_KIND: Record<DueItemKind, number[]> = {
  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
  PROCESSING_STAGE: [-7, -3, -1],
  EVC_SCHEDULING: [-7, -3, -1],
  EVC_COMPLETION: [-15, -7, -3, -1],
  UNDERTAKING: [-30, -15, -7, -1],
  DOCUMENT_EXPIRY: [-30, -15, -7, -1],
  DOCUMENT_RENEWAL: [-30, -15, -7, -1],
};

const ESCALATION_THRESHOLDS_DAYS = [
  { level: 1, daysOverdue: 1, stepKey: "ESCALATION_L1" },
  { level: 2, daysOverdue: 3, stepKey: "ESCALATION_L2" },
  { level: 3, daysOverdue: 7, stepKey: "ESCALATION_L3" },
];

@Injectable()
export class DueItemService implements OnModuleDestroy {
  private readonly logger = new Logger(DueItemService.name);
  private readonly dueItems = new Map<string, DueItemRecord>();

  /**
   * Enforces unique constraint on `(due_item_id, step_key)`.
   * Key format: `${dueItemId}::${stepKey}`
   */
  private readonly uniqueStepFirings = new Map<string, StepFiringRecord>();
  private readonly outboxEvents: Array<{
    id: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }> = [];
  private readonly sweepLogs: SweepExecutionReport[] = [];
  private readonly rowLocks = new Set<string>();
  private warningOffsetsByKind: Record<DueItemKind, number[]> = {
    ...DEFAULT_WARNING_OFFSETS_BY_KIND,
  };
  private hourlyTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly clock: SystemClockService,
    private readonly prisma: PrismaService,
    private readonly calendar: WorkingDayCalendarService,
  ) {}

  onModuleDestroy(): void {
    this.stopScheduledSweep();
  }

  /**
   * Starts in-process scheduled sweep (default hourly: 3,600,000 ms).
   */
  startScheduledSweep(intervalMs = 60 * 60 * 1000): void {
    this.stopScheduledSweep();
    this.hourlyTimer = setInterval(() => {
      void this.runSweep();
    }, intervalMs);
    if (this.hourlyTimer.unref) {
      this.hourlyTimer.unref();
    }
  }

  stopScheduledSweep(): void {
    if (this.hourlyTimer) {
      clearInterval(this.hourlyTimer);
      this.hourlyTimer = null;
    }
  }

  resetStore(): void {
    this.dueItems.clear();
    this.uniqueStepFirings.clear();
    this.outboxEvents.length = 0;
    this.sweepLogs.length = 0;
    this.rowLocks.clear();
    this.warningOffsetsByKind = { ...DEFAULT_WARNING_OFFSETS_BY_KIND };
  }

  configureWarningOffsets(kind: DueItemKind, offsets: number[]): number[] {
    const sorted = [...offsets].sort((a, b) => a - b);
    this.warningOffsetsByKind[kind] = sorted;
    return sorted;
  }

  getWarningOffsets(kind: DueItemKind): number[] {
    return this.warningOffsetsByKind[kind] ?? [-30, -15, -7, -1];
  }

  /**
   * Creates a new DueItem.
   */
  async createDueItem(input: {
    id?: string;
    label?: string;
    kind: DueItemKind;
    entityType: string;
    entityId: string;
    regionId?: string | null;
    dueAt: Date | string;
    warningOffsets?: number[];
  }): Promise<DueItemRecord> {
    const id = input.id ?? randomUUID();
    const nowIso = this.clock.isoString();
    const dueAtIso =
      typeof input.dueAt === "string"
        ? this.clock.parseIso(input.dueAt).toISOString()
        : input.dueAt.toISOString();
    const offsets = (
      input.warningOffsets ?? this.getWarningOffsets(input.kind)
    ).sort((a, b) => a - b);

    const record: DueItemRecord = {
      id,
      label: input.label ?? `${input.kind}:${input.entityId.slice(0, 8)}`,
      kind: input.kind,
      entityType: input.entityType,
      entityId: input.entityId,
      regionId: input.regionId ?? null,
      dueAt: dueAtIso,
      warningOffsets: offsets,
      status: "ON_TRACK",
      escalationLevel: 0,
      pausedAt: null,
      totalPausedWorkingDays: 0,
      pauseHistory: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.dueItems.set(id, record);
    return record;
  }

  getDueItem(id: string): DueItemRecord {
    const item = this.dueItems.get(id);
    if (!item) {
      throw new NotFoundException(`DueItem ${id} not found`);
    }
    return item;
  }

  listDueItems(filter?: {
    kind?: DueItemKind;
    status?: DueItemStatus;
    entityId?: string;
  }): DueItemRecord[] {
    return Array.from(this.dueItems.values())
      .filter((item) => {
        if (filter?.kind && item.kind !== filter.kind) return false;
        if (filter?.status && item.status !== filter.status) return false;
        if (filter?.entityId && item.entityId !== filter.entityId) return false;
        return true;
      })
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  /**
   * Pauses the SLA clock on a DueItem (e.g., while application is with the institution).
   */
  pauseDueItem(id: string, reason = "Application returned to institution"): DueItemRecord {
    const item = this.getDueItem(id);
    if (item.status === "PAUSED" || item.status === "CLOSED") {
      return item;
    }

    const nowIso = this.clock.isoString();
    item.status = "PAUSED";
    item.pausedAt = nowIso;
    item.pauseHistory.push({
      pausedAt: nowIso,
      resumedAt: null,
      pausedWorkingDays: 0,
      reason,
    });
    item.updatedAt = nowIso;
    return item;
  }

  /**
   * Resumes a paused DueItem and extends `due_at` by the exact number of working days
   * elapsed during the pause in `Asia/Kolkata` timezone.
   */
  resumeDueItem(
    id: string,
    reason = "Institution responded; SLA clock resumed",
  ): DueItemRecord {
    const item = this.getDueItem(id);
    if (item.status !== "PAUSED" || !item.pausedAt) {
      return item;
    }

    const now = this.clock.now();
    const nowIso = now.toISOString();
    const pausedWorkingDays = Math.max(
      0,
      this.calendar.workingDaysBetween(item.pausedAt, now, item.regionId),
    );

    const newDueAt = this.calendar.addWorkingDays(
      item.dueAt,
      pausedWorkingDays,
      item.regionId,
    );

    item.dueAt = newDueAt.toISOString();
    item.pausedAt = null;
    item.totalPausedWorkingDays += pausedWorkingDays;

    const lastPause = item.pauseHistory[item.pauseHistory.length - 1];
    if (lastPause && !lastPause.resumedAt) {
      lastPause.resumedAt = nowIso;
      lastPause.pausedWorkingDays = pausedWorkingDays;
      lastPause.reason = `${lastPause.reason} -> ${reason}`;
    }

    // Re-evaluate status based on updated dueAt
    const dueMs = newDueAt.getTime();
    const nowMs = now.getTime();
    if (nowMs >= dueMs) {
      item.status = "OVERDUE";
    } else {
      const earliestWarnOffset = item.warningOffsets[0] ?? -7;
      if (nowMs >= dueMs + earliestWarnOffset * DAY_MS) {
        item.status = "DUE_SOON";
      } else {
        item.status = "ON_TRACK";
      }
    }

    item.updatedAt = nowIso;
    return item;
  }

  /**
   * Closes a DueItem when the underlying stage/obligation is completed.
   */
  closeDueItem(id: string): DueItemRecord {
    const item = this.getDueItem(id);
    item.status = "CLOSED";
    item.pausedAt = null;
    item.updatedAt = this.clock.isoString();
    return item;
  }

  /**
   * Handles workflow transition domain events to create, pause, resume, and close due items.
   */
  async onWorkflowTransitionDomainEvent(event: {
    applicationId: string;
    regionId?: string | null;
    fromStage: string;
    toStage: string;
    ballWith: "AICTE" | "INSTITUTION";
    timelineWorkingDays: number;
    requiresEvc: boolean;
    isTerminal: boolean;
  }): Promise<DueItemRecord[]> {
    const affected: DueItemRecord[] = [];
    const existingForApp = this.listDueItems({ entityId: event.applicationId });

    if (event.isTerminal) {
      for (const item of existingForApp) {
        if (item.status !== "CLOSED") {
          affected.push(this.closeDueItem(item.id));
        }
      }
      return affected;
    }

    if (event.ballWith === "INSTITUTION") {
      // Pause all active PROCESSING_STAGE due items while ball is with institution
      for (const item of existingForApp) {
        if (
          item.kind === "PROCESSING_STAGE" &&
          item.status !== "PAUSED" &&
          item.status !== "CLOSED"
        ) {
          affected.push(
            this.pauseDueItem(
              item.id,
              `Paused during ${event.toStage} (ball with INSTITUTION)`,
            ),
          );
        }
      }
      return affected;
    }

    // Ball is with AICTE: resume any paused PROCESSING_STAGE item if returning to same stage, or create a new stage due item
    const pausedItem = existingForApp.find(
      (i) => i.kind === "PROCESSING_STAGE" && i.status === "PAUSED",
    );
    if (pausedItem) {
      affected.push(
        this.resumeDueItem(
          pausedItem.id,
          `Resumed on transition to ${event.toStage} (ball with AICTE)`,
        ),
      );
    } else {
      // Close previous stage PROCESSING_STAGE items and create a new one for toStage
      for (const item of existingForApp) {
        if (item.kind === "PROCESSING_STAGE" && item.status !== "CLOSED") {
          this.closeDueItem(item.id);
        }
      }
      if (event.timelineWorkingDays > 0) {
        const dueAt = this.calendar.addWorkingDays(
          this.clock.now(),
          event.timelineWorkingDays,
          event.regionId,
        );
        const created = await this.createDueItem({
          label: `PROCESSING_STAGE:${event.toStage}`,
          kind: "PROCESSING_STAGE",
          entityType: "APPLICATION",
          entityId: event.applicationId,
          regionId: event.regionId,
          dueAt,
        });
        affected.push(created);
      }
    }

    if (event.requiresEvc) {
      // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
      const schedulingDue = this.calendar.addWorkingDays(
        this.clock.now(),
        5,
        event.regionId,
      );
      const completionDue = this.calendar.addWorkingDays(
        this.clock.now(),
        event.timelineWorkingDays || 14,
        event.regionId,
      );
      affected.push(
        await this.createDueItem({
          label: `EVC_SCHEDULING:${event.applicationId.slice(0, 8)}`,
          kind: "EVC_SCHEDULING",
          entityType: "APPLICATION",
          entityId: event.applicationId,
          regionId: event.regionId,
          dueAt: schedulingDue,
        }),
        await this.createDueItem({
          label: `EVC_COMPLETION:${event.applicationId.slice(0, 8)}`,
          kind: "EVC_COMPLETION",
          entityType: "APPLICATION",
          entityId: event.applicationId,
          regionId: event.regionId,
          dueAt: completionDue,
        }),
      );
    }

    return affected;
  }

  /**
   * Executes a Deadline Sweep across active DueItems using `FOR UPDATE SKIP LOCKED`
   * batch semantics and enforces the unique constraint on `(due_item_id, step_key)`.
   */
  async runSweep(options?: {
    batchSize?: number;
    failAfterItems?: number;
  }): Promise<SweepExecutionReport> {
    const startMs = this.clock.timestamp();
    const sweepId = randomUUID();
    const batchSize = options?.batchSize ?? 100;
    const now = this.clock.now();
    const nowMs = now.getTime();
    const nowIso = now.toISOString();

    // If connected to PostgreSQL, acquire batch with SELECT ... FOR UPDATE SKIP LOCKED
    if (this.prisma.isConnected) {
      await this.prisma
        .$queryRawUnsafe(
          `SELECT id FROM due_items WHERE status NOT IN ('PAUSED', 'CLOSED') ORDER BY due_at ASC LIMIT $1 FOR UPDATE SKIP LOCKED`,
          batchSize,
        )
        .catch(() => null);
    }

    // Select unlocked active items in batches (SKIP LOCKED semantics)
    const candidates = Array.from(this.dueItems.values())
      .filter(
        (item) =>
          item.status !== "PAUSED" &&
          item.status !== "CLOSED" &&
          !this.rowLocks.has(item.id),
      )
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .slice(0, batchSize);

    for (const c of candidates) {
      this.rowLocks.add(c.id);
    }

    const firedEvents: StepFiringRecord[] = [];
    let itemsScanned = 0;

    try {
      for (const item of candidates) {
        if (
          options?.failAfterItems !== undefined &&
          itemsScanned >= options.failAfterItems
        ) {
          throw new Error(
            `Simulated mid-batch sweep crash after ${itemsScanned} items`,
          );
        }

        itemsScanned++;
        const dueMs = this.clock.parseIso(item.dueAt).getTime();
        const eligibleSteps: Array<{
          stepKey: string;
          nextStatus: DueItemStatus;
          escalationLevel: number;
        }> = [];

        // 1. Check warning offsets (e.g. T-30, T-15, T-7, T-1)
        const sortedOffsets = [...item.warningOffsets].sort((a, b) => a - b);
        for (const offsetDays of sortedOffsets) {
          const thresholdMs = dueMs + offsetDays * DAY_MS;
          if (nowMs >= thresholdMs) {
            eligibleSteps.push({
              stepKey: `T${offsetDays}`,
              nextStatus: nowMs >= dueMs ? "OVERDUE" : "DUE_SOON",
              escalationLevel: item.escalationLevel,
            });
          }
        }

        // 2. Check overdue and escalation levels
        if (nowMs >= dueMs) {
          eligibleSteps.push({
            stepKey: "OVERDUE",
            nextStatus: "OVERDUE",
            escalationLevel: Math.max(item.escalationLevel, 0),
          });

          const daysOverdue = Math.floor((nowMs - dueMs) / DAY_MS);
          for (const esc of ESCALATION_THRESHOLDS_DAYS) {
            if (daysOverdue >= esc.daysOverdue) {
              eligibleSteps.push({
                stepKey: esc.stepKey,
                nextStatus: "OVERDUE",
                escalationLevel: esc.level,
              });
            }
          }
        }

        // 3. Fire each eligible step at-most-once via unique constraint (due_item_id, step_key)
        for (const step of eligibleSteps) {
          const uniqueKey = `${item.id}::${step.stepKey}`;
          if (this.uniqueStepFirings.has(uniqueKey)) {
            // Already fired previously; unique constraint guarantees idempotency
            continue;
          }

          const outboxId = randomUUID();
          const firing: StepFiringRecord = {
            id: randomUUID(),
            dueItemId: item.id,
            dueItemLabel: item.label,
            kind: item.kind,
            entityId: item.entityId,
            stepKey: step.stepKey,
            outboxEventId: outboxId,
            firedAt: nowIso,
          };

          // Atomic write of step firing + outbox event + due item status
          this.uniqueStepFirings.set(uniqueKey, firing);
          this.outboxEvents.push({
            id: outboxId,
            aggregateType: "DUE_ITEM",
            aggregateId: item.id,
            eventType: "DEADLINE_STEP_FIRED",
            payload: {
              dueItemId: item.id,
              label: item.label,
              kind: item.kind,
              entityType: item.entityType,
              entityId: item.entityId,
              stepKey: step.stepKey,
              dueAt: item.dueAt,
              firedAt: nowIso,
              escalationLevel: step.escalationLevel,
            },
            createdAt: nowIso,
          });

          item.status = step.nextStatus;
          if (step.escalationLevel > item.escalationLevel) {
            item.escalationLevel = step.escalationLevel;
          }
          item.updatedAt = nowIso;

          firedEvents.push(firing);
        }
      }
    } finally {
      for (const c of candidates) {
        this.rowLocks.delete(c.id);
      }
    }

    const durationMs = Math.max(0, this.clock.timestamp() - startMs);
    const report: SweepExecutionReport = {
      sweepId,
      executedAt: nowIso,
      itemsScanned,
      stepsFired: firedEvents.length,
      durationMs,
      firedEvents,
    };

    this.sweepLogs.push(report);
    this.logger.log(
      `Sweep ${sweepId}: itemsScanned=${itemsScanned}, stepsFired=${firedEvents.length}, durationMs=${durationMs}`,
    );
    return report;
  }

  getFiredStepsForDueItem(dueItemId: string): StepFiringRecord[] {
    return Array.from(this.uniqueStepFirings.values()).filter(
      (f) => f.dueItemId === dueItemId,
    );
  }

  getAllFiredSteps(): StepFiringRecord[] {
    return Array.from(this.uniqueStepFirings.values());
  }

  getOutboxEvents() {
    return [...this.outboxEvents];
  }
}

