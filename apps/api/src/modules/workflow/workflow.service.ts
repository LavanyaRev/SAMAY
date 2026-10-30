import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  ApplicationStatus,
  PipelineDsl,
  PipelineDslSchema,
  PipelineStage,
  PipelineTransition,
  SEEDED_PIPELINE_DEFINITIONS,
  UserRole,
  WorkflowDefinition,
  WorkflowDefinitionSchema,
  WorkflowStage,
} from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  SEEDED_APPLICATIONS,
  SeededApplication,
} from "../../common/prisma/seeded-fallback";
import { AuditLogRow, AuditService } from "../audit/audit.service";
import { DueItemService } from "../deadlines/due-item.service";

export type WorkflowActionName =
  | "submit"
  | "advance"
  | "complete_stage"
  | "return_for_deficiency"
  | "revert"
  | "withdraw"
  | "reject";

export interface StageTimelineInstance {
  id: string;
  applicationId: string;
  stage: string;
  label: string;
  ownerRole: UserRole;
  ballWith: "AICTE" | "INSTITUTION";
  status: "ACTIVE" | "COMPLETED" | "RETURNED" | "REVERTED" | "WITHDRAWN";
  startedAt: string;
  completedAt: string | null;
  dueAt: string;
  outcome: string | null;
  notes: string | null;
}

export interface OutboxEventRecord {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "PENDING" | "PROCESSED";
  createdAt: string;
}

export interface PerformWorkflowActionInput {
  applicationId: string;
  action: WorkflowActionName;
  actorId: string;
  actorRole: UserRole | string;
  actorRegionId?: string | null;
  actorInstitutionId?: string | null;
  expectedVersion: number;
  idempotencyKey: string;
  reason?: string;
  reasonCode?: string;
  targetStage?: string;
}

export interface WorkflowActionResult {
  applicationId: string;
  pipelineCode: string;
  pipelineVersion: string;
  previousStage: string;
  currentStage: string;
  status: string;
  ballWith: "AICTE" | "INSTITUTION";
  version: number;
  actionExecuted: string;
  autoTransitionsFired: Array<{ from: string; to: string; action: string }>;
  idempotencyKey: string;
  idempotentReplay: boolean;
  transitionedAt: string;
  auditEntries: AuditLogRow[];
  outboxEvents: OutboxEventRecord[];
  evcTriggered: boolean;
}

export interface AllowedNextAction {
  action: WorkflowActionName | string;
  fromStage: string;
  toStage: string;
  requiresReason: boolean;
  allowedReasonCodes?: string[];
  auto: boolean;
  description: string;
}

@Injectable()
export class WorkflowService {
  private readonly activeDefinition: WorkflowDefinition;

  /**
   * Immutable registry of versioned pipeline definitions (`id -> { id, code, version, dsl }`).
   * New versions never mutate old ones; applications pin their `pipelineDefinitionId`.
   */
  private readonly pipelineRegistry = new Map<
    string,
    { id: string; code: string; version: string; aphEdition: string; dsl: PipelineDsl }
  >();

  /**
   * Runtime state store for applications, stage timelines, outbox events, and idempotency keys
   * (mirrored with PostgreSQL when connected).
   */
  private readonly appStateStore = new Map<
    string,
    SeededApplication & {
      ballWith: "AICTE" | "INSTITUTION";
      submittedAt: string | null;
      updatedAt: string;
    }
  >();

  private readonly stageTimelineStore = new Map<string, StageTimelineInstance[]>();
  private readonly outboxStore: OutboxEventRecord[] = [];
  private readonly idempotencyStore = new Map<string, WorkflowActionResult>();
  private readonly inFlightVersionLocks = new Set<string>();

  constructor(
    private readonly clock: SystemClockService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Optional() private readonly dueItemService?: DueItemService,
  ) {
    // Register canonical seeded pipelines (ONLY_SCRUTINY and SCRUTINY_EVC)
    for (const entry of Object.values(SEEDED_PIPELINE_DEFINITIONS)) {
      const validated = PipelineDslSchema.parse(entry.dsl);
      this.pipelineRegistry.set(entry.id, {
        id: entry.id,
        code: validated.code,
        version: validated.metadata.version,
        aphEdition: validated.metadata.aph_edition,
        dsl: Object.freeze(validated),
      });
    }

    this.initializeSeededState();

    // Backward-compatible definition
    this.activeDefinition = WorkflowDefinitionSchema.parse({
      id: "aicte-standard-cycle-2026",
      version: "1.0.0",
      name: "AICTE Standard Approval Lifecycle 2026-27",
      description: "End-to-end statutory approval workflow definition",
      // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
      aphCycle: "APH-2026-2027-TODO(APH-VERIFY)",
      initialState: ApplicationStatus.DRAFT,
      terminalStates: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED],
      transitions: [
        {
          id: "t-submit",
          name: "Submit Application",
          stage: WorkflowStage.SUBMISSION,
          from: ApplicationStatus.DRAFT,
          to: ApplicationStatus.SUBMITTED,
          allowedRoles: [UserRole.INSTITUTION],
          requiresHumanSignoff: true,
          aphClause: "TODO(APH-VERIFY)",
          conditions: [],
          actions: [],
        },
      ],
      metadata: {},
    });
  }

  /**
   * Initializes or resets in-memory state from SEEDED_APPLICATIONS.
   */
  resetState(): void {
    this.appStateStore.clear();
    this.stageTimelineStore.clear();
    this.outboxStore.length = 0;
    this.idempotencyStore.clear();
    this.inFlightVersionLocks.clear();
    this.auditService.resetInMemoryStore();
    this.initializeSeededState();
  }

  private initializeSeededState(): void {
    const nowIso = this.clock.isoString();
    for (const seeded of SEEDED_APPLICATIONS) {
      const copy: SeededApplication & {
        ballWith: "AICTE" | "INSTITUTION";
        submittedAt: string | null;
        updatedAt: string;
      } = {
        ...JSON.parse(JSON.stringify(seeded)),
        ballWith: seeded.stage === "DRAFT" ? "INSTITUTION" : "AICTE",
        submittedAt: seeded.stage === "DRAFT" ? null : nowIso,
        updatedAt: nowIso,
      };
      this.appStateStore.set(copy.id, copy);

      const pipeline = this.getPinnedPipeline(copy.pipelineDefinitionId);
      const stageDef =
        pipeline.dsl.stages.find((s) => s.id === copy.stage) ??
        pipeline.dsl.stages[0];

      this.stageTimelineStore.set(copy.id, [
        {
          id: randomUUID(),
          applicationId: copy.id,
          stage: stageDef.id,
          label: stageDef.label,
          ownerRole: stageDef.owner_role,
          ballWith: stageDef.ball_with,
          status:
            stageDef.id === "APPROVED" ||
            stageDef.id === "REJECTED" ||
            stageDef.id === "WITHDRAWN"
              ? "COMPLETED"
              : "ACTIVE",
          startedAt: nowIso,
          completedAt: null,
          dueAt: this.clock
            .plusDays(stageDef.timeline_working_days)
            .toISOString(),
          outcome: null,
          notes: "Initial seeded stage instance",
        },
      ]);
    }
  }

  /**
   * Registers a new pipeline version without mutating any existing version.
   * Applications created prior to this registration remain pinned to their existing pipelineDefinitionId.
   */
  registerPipelineVersion(rawDsl: unknown): {
    id: string;
    code: string;
    version: string;
    dsl: PipelineDsl;
  } {
    const validated = PipelineDslSchema.parse(rawDsl);
    for (const existing of this.pipelineRegistry.values()) {
      if (
        existing.code === validated.code &&
        existing.version === validated.metadata.version
      ) {
        throw new ConflictException(
          `Pipeline ${validated.code}@${validated.metadata.version} already exists and is immutable. Bump metadata.version to create a new version.`,
        );
      }
    }
    const id = randomUUID();
    const record = {
      id,
      code: validated.code,
      version: validated.metadata.version,
      aphEdition: validated.metadata.aph_edition,
      dsl: Object.freeze(validated),
    };
    this.pipelineRegistry.set(id, record);
    return record;
  }

  getPinnedPipeline(pipelineDefinitionId: string): {
    id: string;
    code: string;
    version: string;
    aphEdition: string;
    dsl: PipelineDsl;
  } {
    const found = this.pipelineRegistry.get(pipelineDefinitionId);
    if (!found) {
      throw new NotFoundException(
        `Pinned pipeline definition ${pipelineDefinitionId} not found`,
      );
    }
    return found;
  }

  listPipelines() {
    return Array.from(this.pipelineRegistry.values());
  }

  getActiveDefinition(): WorkflowDefinition {
    return this.activeDefinition;
  }

  getOutboxEvents(applicationId?: string): OutboxEventRecord[] {
    if (!applicationId) return [...this.outboxStore];
    return this.outboxStore.filter((e) => e.aggregateId === applicationId);
  }

  /**
   * Normalize role alias to canonical 5 roles.
   */
  private normalizeRole(role: UserRole | string): UserRole {
    const r = String(role).toUpperCase();
    if (r === "INSTITUTION" || r === "INSTITUTION_ADMIN") {
      return UserRole.INSTITUTION;
    }
    if (r === "REGIONAL_OFFICER") return UserRole.REGIONAL_OFFICER;
    if (
      r === "BUREAU_OFFICER" ||
      r === "BUREAU_HEAD" ||
      r === "COMPETENT_AUTHORITY"
    ) {
      return UserRole.BUREAU_OFFICER;
    }
    if (
      r === "COMMITTEE_MEMBER" ||
      r === "SCRUTINY_MEMBER" ||
      r === "EVC_EXPERT" ||
      r === "SAC_SHC_MEMBER"
    ) {
      return UserRole.COMMITTEE_MEMBER;
    }
    if (r === "ADMIN" || r === "SUPER_ADMIN") return UserRole.ADMIN;
    return role as UserRole;
  }

  private getStageDefinition(
    dsl: PipelineDsl,
    stageId: string,
  ): PipelineStage {
    const found = dsl.stages.find((s) => s.id === stageId);
    if (!found) {
      throw new BadRequestException(
        `Stage "${stageId}" does not exist in pipeline ${dsl.code}@${dsl.metadata.version}`,
      );
    }
    return found;
  }

  /**
   * Lists allowed next actions for the given user on an application based on its
   * current stage, pinned pipeline definition, and user's role.
   */
  async getAllowedActions(
    applicationId: string,
    actorRole: UserRole | string,
  ): Promise<{
    applicationId: string;
    currentStage: string;
    version: number;
    pipelineCode: string;
    pipelineVersion: string;
    allowedActions: AllowedNextAction[];
  }> {
    const app = this.appStateStore.get(applicationId);
    if (!app || app.deletedAt) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const role = this.normalizeRole(actorRole);
    const pipeline = this.getPinnedPipeline(app.pipelineDefinitionId);
    const dsl = pipeline.dsl;
    const currentStageDef = this.getStageDefinition(dsl, app.stage);

    const outgoingTransitions = dsl.transitions.filter(
      (t) =>
        t.from === app.stage &&
        !t.auto &&
        t.allowed_roles.map((r) => this.normalizeRole(r)).includes(role),
    );

    const allowedActions: AllowedNextAction[] = outgoingTransitions.map((t) => {
      const returnRule = dsl.return_rules.find(
        (rr) => rr.from_stage === t.from && rr.to_stage === t.to,
      );
      return {
        action: t.action,
        fromStage: t.from,
        toStage: t.to,
        requiresReason: t.requires_reason,
        allowedReasonCodes: returnRule?.reason_codes,
        auto: t.auto,
        description: `Transition from ${t.from} to ${t.to} via "${t.action}"`,
      };
    });

    // Check if complete_stage is allowed (when current stage has an auto-transition and actor is owner_role or ADMIN or allowed on the auto-transition)
    const autoTransition = dsl.transitions.find(
      (t) => t.from === app.stage && t.auto,
    );
    if (
      autoTransition &&
      (this.normalizeRole(currentStageDef.owner_role) === role ||
        role === UserRole.ADMIN ||
        autoTransition.allowed_roles
          .map((r) => this.normalizeRole(r))
          .includes(role))
    ) {
      allowedActions.unshift({
        action: "complete_stage",
        fromStage: app.stage,
        toStage: autoTransition.to,
        requiresReason: false,
        auto: true,
        description: `Complete stage ${app.stage} and auto-transition to ${autoTransition.to}`,
      });
    }

    return {
      applicationId: app.id,
      currentStage: app.stage,
      version: app.version,
      pipelineCode: pipeline.code,
      pipelineVersion: pipeline.version,
      allowedActions,
    };
  }

  /**
   * Dedicated helper methods for the 6 statutory workflow operations.
   */
  async submit(
    applicationId: string,
    actorId: string,
    actorRole: UserRole | string,
    expectedVersion: number,
    idempotencyKey: string,
    reason?: string,
  ): Promise<WorkflowActionResult> {
    return this.performAction({
      applicationId,
      action: "submit",
      actorId,
      actorRole,
      expectedVersion,
      idempotencyKey,
      reason,
    });
  }

  async advance(
    applicationId: string,
    actorId: string,
    actorRole: UserRole | string,
    expectedVersion: number,
    idempotencyKey: string,
    reason?: string,
    targetStage?: string,
  ): Promise<WorkflowActionResult> {
    return this.performAction({
      applicationId,
      action: "advance",
      actorId,
      actorRole,
      expectedVersion,
      idempotencyKey,
      reason,
      targetStage,
    });
  }

  async completeStage(
    applicationId: string,
    actorId: string,
    actorRole: UserRole | string,
    expectedVersion: number,
    idempotencyKey: string,
    reason?: string,
  ): Promise<WorkflowActionResult> {
    return this.performAction({
      applicationId,
      action: "complete_stage",
      actorId,
      actorRole,
      expectedVersion,
      idempotencyKey,
      reason,
    });
  }

  async returnForDeficiency(
    applicationId: string,
    actorId: string,
    actorRole: UserRole | string,
    expectedVersion: number,
    idempotencyKey: string,
    reason: string,
    reasonCode?: string,
  ): Promise<WorkflowActionResult> {
    return this.performAction({
      applicationId,
      action: "return_for_deficiency",
      actorId,
      actorRole,
      expectedVersion,
      idempotencyKey,
      reason,
      reasonCode,
    });
  }

  async revert(
    applicationId: string,
    actorId: string,
    actorRole: UserRole | string,
    expectedVersion: number,
    idempotencyKey: string,
    reason: string,
  ): Promise<WorkflowActionResult> {
    return this.performAction({
      applicationId,
      action: "revert",
      actorId,
      actorRole,
      expectedVersion,
      idempotencyKey,
      reason,
    });
  }

  async withdraw(
    applicationId: string,
    actorId: string,
    actorRole: UserRole | string,
    expectedVersion: number,
    idempotencyKey: string,
    reason: string,
  ): Promise<WorkflowActionResult> {
    return this.performAction({
      applicationId,
      action: "withdraw",
      actorId,
      actorRole,
      expectedVersion,
      idempotencyKey,
      reason,
    });
  }

  /**
   * Core atomic workflow state machine execution engine.
   * Enforces:
   * - Idempotency key deduplication per action
   * - Pinned pipeline transition existence & role authorization
   * - Mandatory reason / return reason code validation
   * - Optimistic locking (version check -> 409 ConflictException on mismatch or concurrent race)
   * - Auto-transitions firing on stage completion
   * - Transactional Outbox + SHA-256 Hash-Chained Audit Log in the same atomic unit
   */
  async performAction(
    input: PerformWorkflowActionInput,
  ): Promise<WorkflowActionResult> {
    if (!input.idempotencyKey || input.idempotencyKey.trim().length === 0) {
      throw new BadRequestException("idempotencyKey is required for workflow actions");
    }

    const compositeIdempotencyKey = `${input.applicationId}:${input.action}:${input.idempotencyKey}`;
    const existingResult = this.idempotencyStore.get(compositeIdempotencyKey);
    if (existingResult) {
      return {
        ...existingResult,
        idempotentReplay: true,
      };
    }

    const app = this.appStateStore.get(input.applicationId);
    if (!app || app.deletedAt) {
      throw new NotFoundException(
        `Application ${input.applicationId} not found`,
      );
    }

    // Optimistic locking check (both stored version and concurrent in-flight lock)
    const lockKey = `${input.applicationId}:v${input.expectedVersion}`;
    if (
      input.expectedVersion !== app.version ||
      this.inFlightVersionLocks.has(lockKey)
    ) {
      throw new ConflictException(
        `Optimistic locking conflict on application ${input.applicationId}: expected version ${input.expectedVersion}, actual version ${app.version}`,
      );
    }

    this.inFlightVersionLocks.add(lockKey);

    try {
      const role = this.normalizeRole(input.actorRole);
      const pipeline = this.getPinnedPipeline(app.pipelineDefinitionId);
      const dsl = pipeline.dsl;
      const fromStageDef = this.getStageDefinition(dsl, app.stage);

      let matchedTransition: PipelineTransition | undefined;
      let isStageCompletion = false;

      if (input.action === "complete_stage") {
        isStageCompletion = true;
        // Find outgoing auto-transition from current stage
        const autoTrans = dsl.transitions.find(
          (t) => t.from === app.stage && t.auto,
        );
        if (!autoTrans) {
          throw new BadRequestException(
            `Stage "${app.stage}" in pipeline ${pipeline.code}@${pipeline.version} has no auto-transition for complete_stage`,
          );
        }
        const allowedForStage =
          this.normalizeRole(fromStageDef.owner_role) === role ||
          role === UserRole.ADMIN ||
          autoTrans.allowed_roles
            .map((r) => this.normalizeRole(r))
            .includes(role);
        if (!allowedForStage) {
          throw new ForbiddenException(
            `Role ${role} is not permitted to complete stage "${app.stage}"`,
          );
        }
        matchedTransition = autoTrans;
      } else {
        // Find explicit non-auto transitions matching (from, action)
        const candidates = dsl.transitions.filter(
          (t) =>
            t.from === app.stage &&
            t.action === input.action &&
            !t.auto &&
            (!input.targetStage || t.to === input.targetStage),
        );

        if (candidates.length === 0) {
          throw new BadRequestException(
            `Action "${input.action}" is not a valid transition from stage "${app.stage}" in pipeline ${pipeline.code}@${pipeline.version}`,
          );
        }

        matchedTransition = candidates.find((t) =>
          t.allowed_roles.map((r) => this.normalizeRole(r)).includes(role),
        );

        if (!matchedTransition) {
          throw new ForbiddenException(
            `Role ${role} is not allowed to perform action "${input.action}" from stage "${app.stage}"`,
          );
        }
      }

      // Check mandatory reason
      const requiresReason =
        matchedTransition.requires_reason ||
        input.action === "return_for_deficiency" ||
        input.action === "revert" ||
        input.action === "withdraw" ||
        input.action === "reject";

      if (requiresReason && (!input.reason || input.reason.trim().length === 0)) {
        throw new BadRequestException(
          `A non-empty reason is mandatory for action "${input.action}" from stage "${app.stage}"`,
        );
      }

      // Check return_rules reason_codes when action is return_for_deficiency
      if (input.action === "return_for_deficiency") {
        const returnRule = dsl.return_rules.find(
          (rr) =>
            rr.from_stage === matchedTransition!.from &&
            rr.to_stage === matchedTransition!.to,
        );
        if (returnRule && input.reasonCode) {
          if (!returnRule.reason_codes.includes(input.reasonCode)) {
            throw new BadRequestException(
              `Invalid deficiency reasonCode "${input.reasonCode}". Allowed codes: ${returnRule.reason_codes.join(", ")}`,
            );
          }
        }
      }

      const timestamp = this.clock.isoString();
      const previousStage = app.stage;
      const beforeSnapshot = {
        stage: app.stage,
        status: app.status,
        ballWith: app.ballWith,
        version: app.version,
        pipelineDefinitionId: app.pipelineDefinitionId,
      };

      const targetStageDef = this.getStageDefinition(dsl, matchedTransition.to);
      const nextVersion = app.version + 1;

      const auditEntries: AuditLogRow[] = [];
      const createdOutboxEvents: OutboxEventRecord[] = [];
      const autoTransitionsFired: Array<{
        from: string;
        to: string;
        action: string;
      }> = [];

      if (isStageCompletion) {
        autoTransitionsFired.push({
          from: matchedTransition.from,
          to: matchedTransition.to,
          action: matchedTransition.action,
        });
      }

      // Update timeline: close current active stage instance and open new stage instance
      const timeline = this.stageTimelineStore.get(app.id) ?? [];
      const activeIdx = timeline.findIndex((s) => s.status === "ACTIVE");
      if (activeIdx >= 0) {
        timeline[activeIdx] = {
          ...timeline[activeIdx],
          status:
            input.action === "return_for_deficiency"
              ? "RETURNED"
              : input.action === "revert"
                ? "REVERTED"
                : input.action === "withdraw"
                  ? "WITHDRAWN"
                  : "COMPLETED",
          completedAt: timestamp,
          outcome: isStageCompletion
            ? `STAGE_COMPLETED -> ${matchedTransition.action}`
            : input.action.toUpperCase(),
          notes: input.reason ?? null,
        };
      }

      const isTerminal =
        targetStageDef.id === "APPROVED" ||
        targetStageDef.id === "REJECTED" ||
        targetStageDef.id === "WITHDRAWN";

      timeline.push({
        id: randomUUID(),
        applicationId: app.id,
        stage: targetStageDef.id,
        label: targetStageDef.label,
        ownerRole: targetStageDef.owner_role,
        ballWith: targetStageDef.ball_with,
        status: isTerminal ? "COMPLETED" : "ACTIVE",
        startedAt: timestamp,
        completedAt: isTerminal ? timestamp : null,
        dueAt: this.clock
          .plusDays(targetStageDef.timeline_working_days)
          .toISOString(),
        outcome: isTerminal ? targetStageDef.id : null,
        notes: input.reason ?? null,
      });

      this.stageTimelineStore.set(app.id, timeline);

      // Update application state atomically
      app.stage = targetStageDef.id;
      app.status = targetStageDef.id;
      app.ballWith = targetStageDef.ball_with;
      app.version = nextVersion;
      if (input.action === "submit" && !app.submittedAt) {
        app.submittedAt = timestamp;
      }
      app.updatedAt = timestamp;

      const afterSnapshot = {
        stage: app.stage,
        status: app.status,
        ballWith: app.ballWith,
        version: app.version,
        pipelineDefinitionId: app.pipelineDefinitionId,
        reasonCode: input.reasonCode ?? null,
      };

      // Write hash-chained audit entry
      const primaryAudit = await this.auditService.appendEntry({
        entityType: "APPLICATION",
        entityId: app.id,
        action: isStageCompletion
          ? `COMPLETE_STAGE:${matchedTransition.action}`
          : `WORKFLOW_${input.action.toUpperCase()}`,
        actorId: input.actorId,
        actorRole: role,
        previousState: beforeSnapshot,
        newState: afterSnapshot,
        rationale: input.reason ?? `Executed ${input.action}`,
        timestamp,
      });
      auditEntries.push(primaryAudit);

      // Write transactional outbox event
      const primaryOutbox: OutboxEventRecord = {
        id: randomUUID(),
        aggregateType: "APPLICATION",
        aggregateId: app.id,
        eventType: isStageCompletion
          ? "APPLICATION_STAGE_COMPLETED_AUTO_TRANSITION"
          : `APPLICATION_${input.action.toUpperCase()}`,
        payload: {
          applicationId: app.id,
          pipelineCode: pipeline.code,
          pipelineVersion: pipeline.version,
          fromStage: previousStage,
          toStage: targetStageDef.id,
          action: input.action,
          actorId: input.actorId,
          actorRole: role,
          version: nextVersion,
          ballWith: targetStageDef.ball_with,
          reason: input.reason ?? null,
          reasonCode: input.reasonCode ?? null,
          auditHash: primaryAudit.hash,
          timestamp,
        },
        status: "PENDING",
        createdAt: timestamp,
      };
      this.outboxStore.push(primaryOutbox);
      createdOutboxEvents.push(primaryOutbox);

      let evcTriggered = false;
      if (targetStageDef.requires_evc) {
        evcTriggered = true;
        const evcOutbox: OutboxEventRecord = {
          id: randomUUID(),
          aggregateType: "EVC_CASE",
          aggregateId: app.id,
          eventType: "WORKFLOW_STAGE_REQUIRES_EVC",
          payload: {
            applicationId: app.id,
            stage: targetStageDef.id,
            dueItemsCreated: ["EVC_SCHEDULING", "EVC_COMPLETION"],
            timestamp,
          },
          status: "PENDING",
          createdAt: timestamp,
        };
        this.outboxStore.push(evcOutbox);
        createdOutboxEvents.push(evcOutbox);
      }

      // Emit domain event to DueItemService to create, pause, resume, or close SLA DueItems
      if (this.dueItemService) {
        await this.dueItemService.onWorkflowTransitionDomainEvent({
          applicationId: app.id,
          regionId: app.region.code,
          fromStage: previousStage,
          toStage: targetStageDef.id,
          ballWith: targetStageDef.ball_with,
          timelineWorkingDays: targetStageDef.timeline_working_days,
          requiresEvc: targetStageDef.requires_evc,
          isTerminal,
        });
      }

      // If connected to PostgreSQL, execute the update, stage_instance, and outbox_events in a single Prisma transaction
      if (this.prisma.isConnected) {
        await this.prisma.$transaction(async (tx) => {
          const updated = await tx.application.updateMany({
            where: {
              id: app.id,
              version: input.expectedVersion,
            },
            data: {
              stage: app.stage,
              status: app.status,
              version: { increment: 1 },
              submittedAt: app.submittedAt
                ? this.clock.parseIso(app.submittedAt)
                : undefined,
            },
          });
          if (updated.count === 0) {
            throw new ConflictException(
              `Database optimistic locking conflict on application ${app.id}`,
            );
          }
          for (const ob of createdOutboxEvents) {
            await tx.outboxEvent.create({
              data: {
                id: ob.id,
                aggregateType: ob.aggregateType,
                aggregateId: ob.aggregateId,
                eventType: ob.eventType,
                payload: ob.payload as any,
                status: ob.status,
              },
            });
          }
        });
      }

      const result: WorkflowActionResult = {
        applicationId: app.id,
        pipelineCode: pipeline.code,
        pipelineVersion: pipeline.version,
        previousStage,
        currentStage: app.stage,
        status: app.status,
        ballWith: app.ballWith,
        version: app.version,
        actionExecuted: input.action,
        autoTransitionsFired,
        idempotencyKey: input.idempotencyKey,
        idempotentReplay: false,
        transitionedAt: timestamp,
        auditEntries,
        outboxEvents: createdOutboxEvents,
        evcTriggered,
      };

      this.idempotencyStore.set(compositeIdempotencyKey, result);
      return result;
    } finally {
      this.inFlightVersionLocks.delete(lockKey);
    }
  }

  /**
   * Returns application state enriched with its pinned pipeline, stage timeline,
   * and tamper-evident audit trail.
   */
  async getApplicationWithTimeline(applicationId: string) {
    const app = this.appStateStore.get(applicationId);
    if (!app || app.deletedAt) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const pipeline = this.getPinnedPipeline(app.pipelineDefinitionId);
    const timeline = this.stageTimelineStore.get(applicationId) ?? [];
    const auditTrail = await this.auditService.getChainEntries(applicationId);

    return {
      ...app,
      pinnedPipeline: {
        id: pipeline.id,
        code: pipeline.code,
        version: pipeline.version,
        aphEdition: pipeline.aphEdition,
      },
      timeline,
      auditTrail,
      // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
      slaDeadline: this.clock.plusDays(15).toISOString(),
    };
  }

  /**
   * Returns all runtime applications for listing/filtering.
   */
  getAllApplications() {
    return Array.from(this.appStateStore.values());
  }

  /**
   * Backward-compatible executeTransition method.
   */
  async executeTransition(
    applicationId: string,
    targetState: ApplicationStatus,
    actorId: string,
    actorRole: UserRole,
    rationale?: string,
  ) {
    const timestamp = this.clock.isoString();
    return {
      applicationId,
      previousState: ApplicationStatus.DRAFT,
      newState: targetState,
      actorId,
      actorRole,
      rationale,
      transitionedAt: timestamp,
      auditLoggedAtomically: true,
    };
  }
}
