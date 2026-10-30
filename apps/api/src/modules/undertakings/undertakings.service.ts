import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { STATUTORY_ADVISORY_LABEL, UserRole } from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";
import { AuditService } from "../audit/audit.service";
import { DueItemService } from "../deadlines/due-item.service";
import { DAY_MS } from "../deadlines/working-day-calendar.service";
import { NotificationsService } from "../notifications/notifications.service";

export type ConditionStatusType =
  | "PENDING"
  | "SUBMITTED"
  | "UNDER_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "OVERDUE"
  | "WAIVED_BY_AUTHORITY";

export interface ConditionEvidenceFile {
  fileId: string;
  filename: string;
  evidenceType: string;
  sha256?: string;
}

export interface ConditionAdvisoryAssessment {
  classification: typeof STATUTORY_ADVISORY_LABEL;
  autoAccepted: false; // Advisory panel NEVER auto-accepts
  requiredEvidenceTypes: string[];
  providedEvidenceTypes: string[];
  missingEvidenceTypes: string[];
  isComplete: boolean;
  summary: string;
  evaluatedAt: string;
}

export interface ConditionEvidenceSubmission {
  id: string;
  undertakingId: string;
  conditionId: string;
  attemptNumber: number;
  submittedByUserId: string;
  submittedByRole: string;
  evidenceFiles: ConditionEvidenceFile[];
  providedEvidenceTypes: string[];
  remarks: string;
  status: "SUBMITTED" | "VERIFIED" | "REJECTED" | "MORE_INFO_REQUESTED";
  advisoryAssessment: ConditionAdvisoryAssessment;
  reviewedByUserId: string | null;
  reviewedByRole: string | null;
  reviewReason: string | null;
  reviewedAt: string | null;
  submittedAt: string;
}

export interface UndertakingConditionRecord {
  id: string;
  undertakingId: string;
  applicationId: string;
  applicationRef: string;
  institutionId: string;
  institutionName: string;
  region: string;
  conditionType: string;
  description: string;
  requiredEvidenceTypes: string[];
  dueDate: string;
  dueItemId: string;
  warningOffsets: number[];
  status: ConditionStatusType;
  escalationLevel: 0 | 1 | 2 | 3;
  waivedBy: string | null;
  waivedByRole: string | null;
  waivedAt: string | null;
  waiverReason: string | null;
  submissions: ConditionEvidenceSubmission[];
  latestAdvisory: ConditionAdvisoryAssessment | null;
  extractionResult?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface UndertakingRecord {
  id: string;
  applicationId: string;
  applicationRef: string;
  institutionId: string;
  institutionName: string;
  region: string;
  category: string;
  description: string;
  affidavitUrl: string;
  complianceDeadlineDays: number;
  deadlineDate: string;
  status: "PENDING" | "COMPLIED" | "OVERDUE" | "WAIVED";
  conditions: UndertakingConditionRecord[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UndertakingsService {
  private readonly undertakings = new Map<string, UndertakingRecord>();
  private readonly conditions = new Map<string, UndertakingConditionRecord>();
  private readonly firedEscalationKeys = new Set<string>();

  constructor(
    private readonly clock: SystemClockService,
    private readonly dueItems: DueItemService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  resetAll(): void {
    this.undertakings.clear();
    this.conditions.clear();
    this.firedEscalationKeys.clear();
  }

  /**
   * Creates an Undertaking (optionally with initial conditions) from either an officer form
   * or the workflow engine API.
   */
  async createUndertakingWithConditions(input: {
    id?: string;
    applicationId: string;
    applicationRef?: string;
    institutionId?: string;
    institutionName?: string;
    region?: string;
    category: string;
    description: string;
    affidavitUrl?: string;
    complianceDeadlineDays?: number;
    actorUserId?: string;
    actorRole?: string;
    conditions?: Array<{
      id?: string;
      conditionType: string;
      description?: string;
      requiredEvidenceTypes: string[];
      dueDate?: string;
      warningOffsets?: number[];
    }>;
  }): Promise<UndertakingRecord> {
    const now = this.clock.now();
    const nowIso = now.toISOString();
    // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
    const defaultDays = input.complianceDeadlineDays ?? 90;
    const deadline = this.clock.fromEpochMs(now.getTime() + defaultDays * DAY_MS);

    const undertakingId = input.id ?? randomUUID();
    const applicationRef =
      input.applicationRef ?? `APP-2026-WRO-${undertakingId.slice(0, 4).toUpperCase()}`;
    const institutionId = input.institutionId ?? "inst-wce-sangli";
    const institutionName =
      input.institutionName ?? "Walchand College of Engineering, Sangli";
    const region = input.region ?? "WRO";

    const record: UndertakingRecord = {
      id: undertakingId,
      applicationId: input.applicationId,
      applicationRef,
      institutionId,
      institutionName,
      region,
      category: input.category,
      description: input.description,
      affidavitUrl:
        input.affidavitUrl ?? `/files/affidavit-${undertakingId.slice(0, 8)}.pdf`,
      complianceDeadlineDays: defaultDays,
      deadlineDate: deadline.toISOString(),
      status: "PENDING",
      conditions: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.undertakings.set(undertakingId, record);

    if (input.conditions && input.conditions.length > 0) {
      for (const condInput of input.conditions) {
        await this.addConditionToUndertaking(undertakingId, {
          ...condInput,
          actorUserId: input.actorUserId ?? "ro-wro-01",
          actorRole: input.actorRole ?? UserRole.REGIONAL_OFFICER,
        });
      }
    }

    return record;
  }

  /**
   * Adds a Condition to an Undertaking and creates an `UNDERTAKING` DueItem with configurable warnings.
   */
  async addConditionToUndertaking(
    undertakingId: string,
    input: {
      id?: string;
      conditionType: string;
      description?: string;
      requiredEvidenceTypes: string[];
      dueDate?: string;
      warningOffsets?: number[];
      actorUserId?: string;
      actorRole?: string;
    },
  ): Promise<UndertakingConditionRecord> {
    const undertaking = this.getUndertakingById(undertakingId);
    const nowIso = this.clock.isoString();
    const conditionId = input.id ?? randomUUID();
    const dueDateIso = input.dueDate ?? undertaking.deadlineDate;
    const warningOffsets = input.warningOffsets ?? [-30, -15, -7, -1];

    const dueItem = await this.dueItems.createDueItem({
      label: `UNDERTAKING_CONDITION:${undertaking.applicationRef}:${input.conditionType}`,
      kind: "UNDERTAKING",
      entityType: "CONDITION",
      entityId: conditionId,
      dueAt: this.clock.parseIso(dueDateIso),
      warningOffsets,
    });

    const condition: UndertakingConditionRecord = {
      id: conditionId,
      undertakingId: undertaking.id,
      applicationId: undertaking.applicationId,
      applicationRef: undertaking.applicationRef,
      institutionId: undertaking.institutionId,
      institutionName: undertaking.institutionName,
      region: undertaking.region,
      conditionType: input.conditionType,
      description:
        input.description ??
        `Rectify ${input.conditionType} deficiency with required statutory documentary evidence.`,
      requiredEvidenceTypes: input.requiredEvidenceTypes,
      dueDate: dueDateIso,
      dueItemId: dueItem.id,
      warningOffsets,
      status: "PENDING",
      escalationLevel: 0,
      waivedBy: null,
      waivedByRole: null,
      waivedAt: null,
      waiverReason: null,
      submissions: [],
      latestAdvisory: null,
      extractionResult: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    undertaking.conditions.push(condition);
    this.conditions.set(conditionId, condition);

    await this.audit.appendEntry({
      entityType: "APPLICATION",
      entityId: undertaking.applicationId,
      action: "UNDERTAKING_CONDITION_CREATED",
      actorId: input.actorUserId ?? "ro-wro-01",
      actorRole: input.actorRole ?? UserRole.REGIONAL_OFFICER,
      previousState: null,
      newState: {
        undertakingId: undertaking.id,
        conditionId: condition.id,
        conditionType: condition.conditionType,
        requiredEvidenceTypes: condition.requiredEvidenceTypes,
        dueDate: condition.dueDate,
        dueItemId: condition.dueItemId,
      },
      rationale: `Recorded undertaking condition ${condition.conditionType} due on ${condition.dueDate.slice(0, 10)}.`,
    });

    return condition;
  }

  /**
   * Institution submits evidence per condition with remarks; resubmissions keep full history.
   * Advisory panel flags missing evidence types (`ADVISORY`), but NEVER auto-accepts.
   */
  async submitConditionEvidence(
    conditionId: string,
    input: {
      submittedByUserId: string;
      submittedByRole: string;
      evidenceFiles: ConditionEvidenceFile[];
      providedEvidenceTypes?: string[];
      remarks: string;
    },
  ): Promise<UndertakingConditionRecord> {
    const condition = this.getConditionById(conditionId);
    const nowIso = this.clock.isoString();
    const beforeStatus = condition.status;

    const providedTypes = Array.from(
      new Set(
        input.providedEvidenceTypes ??
          input.evidenceFiles.map((f) => f.evidenceType),
      ),
    );
    const missingTypes = condition.requiredEvidenceTypes.filter(
      (req) => !providedTypes.includes(req),
    );

    const advisoryAssessment: ConditionAdvisoryAssessment = {
      classification: STATUTORY_ADVISORY_LABEL,
      autoAccepted: false,
      requiredEvidenceTypes: [...condition.requiredEvidenceTypes],
      providedEvidenceTypes: providedTypes,
      missingEvidenceTypes: missingTypes,
      isComplete: missingTypes.length === 0,
      summary:
        missingTypes.length === 0
          ? `[ADVISORY] All ${condition.requiredEvidenceTypes.length} required evidence types uploaded. Awaiting human officer verification (never auto-accepted).`
          : `[ADVISORY] Missing ${missingTypes.length} required evidence type(s): ${missingTypes.join(", ")}. Officer verification required.`,
      evaluatedAt: nowIso,
    };

    const submission: ConditionEvidenceSubmission = {
      id: randomUUID(),
      undertakingId: condition.undertakingId,
      conditionId: condition.id,
      attemptNumber: condition.submissions.length + 1,
      submittedByUserId: input.submittedByUserId,
      submittedByRole: input.submittedByRole,
      evidenceFiles: input.evidenceFiles,
      providedEvidenceTypes: providedTypes,
      remarks: input.remarks,
      status: "SUBMITTED",
      advisoryAssessment,
      reviewedByUserId: null,
      reviewedByRole: null,
      reviewReason: null,
      reviewedAt: null,
      submittedAt: nowIso,
    };

    condition.submissions.push(submission);
    condition.latestAdvisory = advisoryAssessment;
    condition.status = "SUBMITTED";
    condition.updatedAt = nowIso;

    // Pause the UNDERTAKING DueItem SLA clock while awaiting AICTE officer verification
    await this.dueItems.pauseDueItem(condition.dueItemId);

    await this.audit.appendEntry({
      entityType: "APPLICATION",
      entityId: condition.applicationId,
      action: "UNDERTAKING_EVIDENCE_SUBMITTED",
      actorId: input.submittedByUserId,
      actorRole: input.submittedByRole,
      previousState: { status: beforeStatus },
      newState: {
        conditionId: condition.id,
        status: condition.status,
        attemptNumber: submission.attemptNumber,
        providedEvidenceTypes: providedTypes,
        missingEvidenceTypes: missingTypes,
        advisoryClassification: STATUTORY_ADVISORY_LABEL,
      },
      rationale: input.remarks,
    });

    return condition;
  }

  /**
   * Officer verification of submitted evidence:
   * - Strictly forbids `INSTITUTION` from verifying/reviewing its own evidence (`ForbiddenException`).
   * - Decisions: `ACCEPT` (-> `VERIFIED`), `REJECT` (reason mandatory -> `REJECTED`), or `REQUEST_MORE` (reason mandatory -> `PENDING`).
   */
  async reviewConditionEvidence(
    conditionId: string,
    input: {
      decision: "ACCEPT" | "REJECT" | "REQUEST_MORE";
      actorUserId: string;
      actorRole: string;
      reason?: string;
    },
  ): Promise<UndertakingConditionRecord> {
    if (input.actorRole === UserRole.INSTITUTION) {
      throw new ForbiddenException(
        "Statutory violation: Institutions cannot verify or review their own undertaking evidence.",
      );
    }

    if (
      (input.decision === "REJECT" || input.decision === "REQUEST_MORE") &&
      (!input.reason || input.reason.trim().length < 5)
    ) {
      throw new BadRequestException(
        `A mandatory reason (min 5 chars) is required when decision is ${input.decision}.`,
      );
    }

    const condition = this.getConditionById(conditionId);
    const latestSubmission =
      condition.submissions[condition.submissions.length - 1];
    if (!latestSubmission) {
      throw new BadRequestException(
        `Condition ${conditionId} has no evidence submissions to review.`,
      );
    }

    const nowIso = this.clock.isoString();
    const beforeStatus = condition.status;

    latestSubmission.reviewedByUserId = input.actorUserId;
    latestSubmission.reviewedByRole = input.actorRole;
    latestSubmission.reviewReason = input.reason?.trim() ?? "Verified compliant";
    latestSubmission.reviewedAt = nowIso;

    if (input.decision === "ACCEPT") {
      latestSubmission.status = "VERIFIED";
      condition.status = "VERIFIED";
      await this.dueItems.closeDueItem(condition.dueItemId);
    } else if (input.decision === "REJECT") {
      latestSubmission.status = "REJECTED";
      condition.status = "REJECTED";
      await this.dueItems.resumeDueItem(condition.dueItemId);
    } else {
      latestSubmission.status = "MORE_INFO_REQUESTED";
      condition.status = "PENDING";
      await this.dueItems.resumeDueItem(condition.dueItemId);
    }

    condition.updatedAt = nowIso;
    this.recomputeUndertakingStatus(condition.undertakingId);

    await this.audit.appendEntry({
      entityType: "APPLICATION",
      entityId: condition.applicationId,
      action: `UNDERTAKING_EVIDENCE_${input.decision}`,
      actorId: input.actorUserId,
      actorRole: input.actorRole,
      previousState: { status: beforeStatus },
      newState: {
        conditionId: condition.id,
        status: condition.status,
        submissionAttempt: latestSubmission.attemptNumber,
      },
      rationale:
        input.reason?.trim() ??
        `Officer verified evidence for condition ${condition.conditionType}.`,
    });

    return condition;
  }

  /**
   * Waiving a Condition (`WAIVED_BY_AUTHORITY`):
   * Competent Authority action only (`BUREAU_OFFICER` or `ADMIN`), requires mandatory reason, and is audited.
   */
  async waiveConditionByAuthority(
    conditionId: string,
    input: {
      actorUserId: string;
      actorRole: string;
      waiverReason: string;
    },
  ): Promise<UndertakingConditionRecord> {
    if (
      input.actorRole !== UserRole.BUREAU_OFFICER &&
      input.actorRole !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Waiving an undertaking condition is reserved strictly for the Competent Authority (BUREAU_OFFICER / ADMIN).",
      );
    }

    if (!input.waiverReason || input.waiverReason.trim().length < 5) {
      throw new BadRequestException(
        "A mandatory statutory waiver reason is required to waive a condition.",
      );
    }

    const condition = this.getConditionById(conditionId);
    const beforeStatus = condition.status;
    const nowIso = this.clock.isoString();

    condition.status = "WAIVED_BY_AUTHORITY";
    condition.waivedBy = input.actorUserId;
    condition.waivedByRole = input.actorRole;
    condition.waivedAt = nowIso;
    condition.waiverReason = input.waiverReason.trim();
    condition.updatedAt = nowIso;

    await this.dueItems.closeDueItem(condition.dueItemId);
    this.recomputeUndertakingStatus(condition.undertakingId);

    await this.audit.appendEntry({
      entityType: "APPLICATION",
      entityId: condition.applicationId,
      action: "UNDERTAKING_CONDITION_WAIVED_BY_AUTHORITY",
      actorId: input.actorUserId,
      actorRole: input.actorRole,
      previousState: { status: beforeStatus },
      newState: {
        conditionId: condition.id,
        status: condition.status,
        waivedBy: condition.waivedBy,
        waiverReason: condition.waiverReason,
      },
      rationale: condition.waiverReason,
    });

    return condition;
  }

  /**
   * Evaluates all active Conditions against the Demo Clock via DueItemService sweep
   * and escalates overdue unverified conditions through the Phase 6 ladder (L0 -> L1 -> L2 -> L3).
   */
  async evaluateUndertakingEscalations(): Promise<{
    overdueConditions: number;
    maxEscalationLevelReached: number;
  }> {
    await this.dueItems.runSweep();
    const nowMs = this.clock.timestamp();
    let overdueConditions = 0;
    let maxEscalationLevelReached = 0;

    for (const cond of this.conditions.values()) {
      if (
        cond.status === "VERIFIED" ||
        cond.status === "WAIVED_BY_AUTHORITY" ||
        cond.status === "SUBMITTED"
      ) {
        continue;
      }

      const dueItem = this.dueItems.getDueItem(cond.dueItemId);
      const dueMs = this.clock.parseIso(cond.dueDate).getTime();
      const daysPastDue = Math.floor((nowMs - dueMs) / DAY_MS);

      if (daysPastDue >= 0 || dueItem.status === "OVERDUE") {
        cond.status = "OVERDUE";
        cond.escalationLevel = dueItem.escalationLevel as 0 | 1 | 2 | 3;
        overdueConditions++;
        if (cond.escalationLevel > maxEscalationLevelReached) {
          maxEscalationLevelReached = cond.escalationLevel;
        }

        const levelsToFire: Array<0 | 1 | 2 | 3> = [0];
        if (cond.escalationLevel >= 1) levelsToFire.push(1);
        if (cond.escalationLevel >= 2) levelsToFire.push(2);
        if (cond.escalationLevel >= 3) levelsToFire.push(3);

        for (const lvl of levelsToFire) {
          const eventKey = `UNDERTAKING_COND:${cond.id}:OVERDUE_L${lvl}`;
          if (this.firedEscalationKeys.has(eventKey)) continue;
          this.firedEscalationKeys.add(eventKey);

          this.notifications.enqueueOutboxEvent({
            eventKey,
            dueItemId: cond.dueItemId,
            kind: "UNDERTAKING",
            escalationLevel: lvl,
            applicationId: cond.applicationRef,
            institution: cond.institutionName,
            dueDate: cond.dueDate.slice(0, 10),
            daysRemaining: -Math.max(0, daysPastDue),
            actionLink: `/undertakings?conditionId=${cond.id}`,
          });
        }

        this.recomputeUndertakingStatus(cond.undertakingId);
      }
    }

    await this.notifications.processOutboxEvents();
    return { overdueConditions, maxEscalationLevelReached };
  }

  private recomputeUndertakingStatus(undertakingId: string): void {
    const u = this.undertakings.get(undertakingId);
    if (!u || u.conditions.length === 0) return;

    const allDone = u.conditions.every(
      (c) => c.status === "VERIFIED" || c.status === "WAIVED_BY_AUTHORITY",
    );
    const anyOverdue = u.conditions.some((c) => c.status === "OVERDUE");

    if (allDone) {
      u.status = "COMPLIED";
    } else if (anyOverdue) {
      u.status = "OVERDUE";
    } else {
      u.status = "PENDING";
    }
    u.updatedAt = this.clock.isoString();
  }

  listUndertakings(): UndertakingRecord[] {
    return Array.from(this.undertakings.values());
  }

  listConditions(): UndertakingConditionRecord[] {
    return Array.from(this.conditions.values());
  }

  getUndertakingById(id: string): UndertakingRecord {
    const found = this.undertakings.get(id);
    if (!found) {
      throw new NotFoundException(`Undertaking ${id} not found`);
    }
    return found;
  }

  getConditionById(id: string): UndertakingConditionRecord {
    const found = this.conditions.get(id);
    if (!found) {
      throw new NotFoundException(`Condition ${id} not found`);
    }
    return found;
  }

  /**
   * Backward-compatible methods
   */
  getByApplication(applicationId: string) {
    const list = this.listUndertakings().filter(
      (u) => u.applicationId === applicationId,
    );
    return {
      applicationId,
      undertakings: list,
      evaluatedAt: this.clock.isoString(),
    };
  }

  async create(payload: {
    applicationId: string;
    category: string;
    description: string;
    affidavitUrl: string;
  }) {
    return this.createUndertakingWithConditions(payload);
  }
}
