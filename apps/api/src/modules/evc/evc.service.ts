import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { STATUTORY_ADVISORY_LABEL, UserRole } from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";
import { AuditService } from "../audit/audit.service";
import { DueItemService, DueItemRecord } from "../deadlines/due-item.service";
import {
  WorkingDayCalendarService,
  DAY_MS,
} from "../deadlines/working-day-calendar.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  PanelProposalService,
  EvcPanel,
  ConflictOfInterestRejection,
} from "./panel-proposal.service";

export type EvcCaseStatus =
  | "QUEUED"
  | "PANEL_PROPOSED"
  | "SCHEDULED"
  | "VISIT_DONE"
  | "REPORT_SUBMITTED"
  | "REPORT_ACCEPTED"
  | "DEFERRED"
  | "CANCELLED";

export const STATUTORY_EVC_COMMITTEE_NOTICE =
  "Inspection findings are decided by the committee";

export interface EvcTimelineConfig {
  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
  newInstitution: {
    schedulingWorkingDays: number;
    completionWorkingDays: number;
    reportGraceWorkingDays: number;
    approachingWarningDays: number[];
  };
  existingInstitution: {
    schedulingWorkingDays: number;
    completionWorkingDays: number;
    reportGraceWorkingDays: number;
    approachingWarningDays: number[];
  };
}

export interface EvcVisitReport {
  reportFileId: string;
  fileSha256: string;
  summary: string;
  observations: string[];
  infrastructureVerified: boolean;
  facultyVerified: boolean;
  submittedByUserId: string;
  submittedByRole: string;
  submittedAt: string;
  statutoryNotice: typeof STATUTORY_EVC_COMMITTEE_NOTICE;
  classification: typeof STATUTORY_ADVISORY_LABEL;
}

export interface EvcCaseRecord {
  id: string;
  caseNumber: string;
  applicationId: string;
  applicationRef: string;
  institutionId: string;
  institutionName: string;
  trustOrSociety: string;
  region: string;
  programStream: string;
  isNewInstitution: boolean;
  requiredExpertiseTags: string[];
  status: EvcCaseStatus;
  workflowStage: string;
  schedulingDueItemId: string;
  completionDueItemId: string;
  schedulingDueAt: string;
  completionDueAt: string;
  proposedPanels: EvcPanel[];
  rejectedExperts: ConflictOfInterestRejection[];
  confirmedPanel: EvcPanel | null;
  confirmedByUserId: string | null;
  confirmedByRole: string | null;
  confirmedAt: string | null;
  scheduledDate: string | null;
  rescheduleHistory: Array<{
    previousDate: string;
    newDate: string;
    reason: string;
    actorUserId: string;
    actorRole: string;
    rescheduledAt: string;
  }>;
  visitDoneAt: string | null;
  reportGraceDueAt: string | null;
  visitReport: EvcVisitReport | null;
  statutoryCommitteeNotice: typeof STATUTORY_EVC_COMMITTEE_NOTICE;
  createdAt: string;
  updatedAt: string;
}

export type EvcAlertKind =
  | "EVC_APPROACHING"
  | "EVC_UNSCHEDULED_BEYOND_THRESHOLD"
  | "EVC_VISIT_DONE_REPORT_OVERDUE";

export interface EvcAlertRecord {
  id: string;
  caseId: string;
  applicationRef: string;
  institutionName: string;
  alertKind: EvcAlertKind;
  escalationLevel: 0 | 1 | 2 | 3;
  eventKey: string;
  description: string;
  firedAt: string;
}

@Injectable()
export class EvcService {
  private readonly cases = new Map<string, EvcCaseRecord>();
  private readonly firedAlertKeys = new Set<string>();
  private readonly alertHistory: EvcAlertRecord[] = [];

  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
  private timelineConfig: EvcTimelineConfig = {
    newInstitution: {
      schedulingWorkingDays: 5,
      completionWorkingDays: 12,
      reportGraceWorkingDays: 2,
      approachingWarningDays: [3, 1],
    },
    existingInstitution: {
      schedulingWorkingDays: 10,
      completionWorkingDays: 21,
      reportGraceWorkingDays: 4,
      approachingWarningDays: [3, 1],
    },
  };

  constructor(
    private readonly clock: SystemClockService,
    private readonly calendar: WorkingDayCalendarService,
    private readonly dueItems: DueItemService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly panelProposal: PanelProposalService,
  ) {}

  resetAll(): void {
    this.cases.clear();
    this.firedAlertKeys.clear();
    this.alertHistory.length = 0;
    this.panelProposal.resetExpertPool();
  }

  getTimelineConfig(): EvcTimelineConfig {
    return this.timelineConfig;
  }

  updateTimelineConfig(partial: Partial<EvcTimelineConfig>): EvcTimelineConfig {
    this.timelineConfig = {
      ...this.timelineConfig,
      ...partial,
    };
    return this.timelineConfig;
  }

  /**
   * 1. Workflow Event Handler:
   * When a pipeline reaches a stage with `requires_evc: true`, the workflow emits an event
   * and the EVC module creates the EvcCase and DueItems `EVC_SCHEDULING` and `EVC_COMPLETION`.
   * New institutions receive stricter configurable timelines flagged `TODO(APH-VERIFY)`.
   */
  async handleWorkflowRequiresEvcEvent(input: {
    id?: string;
    applicationId: string;
    applicationRef?: string;
    institutionId: string;
    institutionName: string;
    trustOrSociety?: string;
    region?: string;
    programStream?: string;
    isNewInstitution: boolean;
    requiredExpertiseTags?: string[];
    actorUserId?: string;
    actorRole?: string;
  }): Promise<{
    evcCase: EvcCaseRecord;
    schedulingDueItem: DueItemRecord;
    completionDueItem: DueItemRecord;
  }> {
    const now = this.clock.now();
    const nowIso = now.toISOString();
    const rules = input.isNewInstitution
      ? this.timelineConfig.newInstitution
      : this.timelineConfig.existingInstitution;

    const schedulingDueDate = await this.calendar.addWorkingDays(
      now,
      rules.schedulingWorkingDays,
    );
    const completionDueDate = await this.calendar.addWorkingDays(
      now,
      rules.completionWorkingDays,
    );

    const caseId = input.id ?? randomUUID();
    const applicationRef =
      input.applicationRef ??
      `APP-2026-${input.region || "WRO"}-${caseId.slice(0, 5).toUpperCase()}`;

    const schedulingDueItem = await this.dueItems.createDueItem({
      label: `EVC_SCHEDULING:${applicationRef}`,
      kind: "EVC_SCHEDULING",
      entityType: "EVC_CASE",
      entityId: caseId,
      dueAt: schedulingDueDate,
      warningOffsets: input.isNewInstitution ? [-3, -1] : [-7, -3, -1],
    });

    const completionDueItem = await this.dueItems.createDueItem({
      label: `EVC_COMPLETION:${applicationRef}`,
      kind: "EVC_COMPLETION",
      entityType: "EVC_CASE",
      entityId: caseId,
      dueAt: completionDueDate,
      warningOffsets: input.isNewInstitution ? [-7, -3, -1] : [-15, -7, -3, -1],
    });

    const evcCase: EvcCaseRecord = {
      id: caseId,
      caseNumber: `EVC-2026-${(this.cases.size + 1).toString().padStart(3, "0")}`,
      applicationId: input.applicationId,
      applicationRef,
      institutionId: input.institutionId,
      institutionName: input.institutionName,
      trustOrSociety:
        input.trustOrSociety ?? "Shikshan Prasarak Mandal, Pune",
      region: input.region ?? "WRO",
      programStream:
        input.programStream ?? "B.Tech Artificial Intelligence & Data Science",
      isNewInstitution: input.isNewInstitution,
      requiredExpertiseTags: input.requiredExpertiseTags ?? [
        "ENGINEERING_TECHNOLOGY",
        "AI_DS",
        "INFRASTRUCTURE",
      ],
      status: "QUEUED",
      workflowStage: "EVC",
      schedulingDueItemId: schedulingDueItem.id,
      completionDueItemId: completionDueItem.id,
      schedulingDueAt: schedulingDueDate.toISOString(),
      completionDueAt: completionDueDate.toISOString(),
      proposedPanels: [],
      rejectedExperts: [],
      confirmedPanel: null,
      confirmedByUserId: null,
      confirmedByRole: null,
      confirmedAt: null,
      scheduledDate: null,
      rescheduleHistory: [],
      visitDoneAt: null,
      reportGraceDueAt: null,
      visitReport: null,
      statutoryCommitteeNotice: STATUTORY_EVC_COMMITTEE_NOTICE,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.cases.set(caseId, evcCase);

    await this.recordEvcAudit({
      applicationId: input.applicationId,
      actorId: input.actorUserId ?? "system-workflow-evc-listener",
      actorRole: input.actorRole ?? UserRole.REGIONAL_OFFICER,
      action: "EVC_CASE_CREATED_FROM_WORKFLOW",
      evcCaseId: caseId,
      previousState: null,
      newState: {
        status: evcCase.status,
        isNewInstitution: evcCase.isNewInstitution,
        schedulingDueAt: evcCase.schedulingDueAt,
        completionDueAt: evcCase.completionDueAt,
      },
      rationale: `Pipeline entered stage with requires_evc=true (${input.isNewInstitution ? "NEW_INSTITUTION stricter timeline" : "standard timeline"}).`,
    });

    return {
      evcCase,
      schedulingDueItem,
      completionDueItem,
    };
  }

  /**
   * 2. Propose Advisory Panels:
   * Invokes PanelProposalService to propose panels by region, expertise, workload,
   * and availability while rejecting experts with a conflict of interest.
   * Transitions status `QUEUED -> PANEL_PROPOSED`.
   */
  async proposePanels(
    caseId: string,
    actor?: { userId?: string; role?: string },
  ): Promise<EvcCaseRecord> {
    const evcCase = this.getCaseById(caseId);
    const beforeStatus = evcCase.status;

    const proposalResult = this.panelProposal.proposePanelsForCase({
      applicationId: evcCase.applicationId,
      institutionId: evcCase.institutionId,
      institutionName: evcCase.institutionName,
      trustOrSociety: evcCase.trustOrSociety,
      region: evcCase.region,
      requiredExpertiseTags: evcCase.requiredExpertiseTags,
    });

    evcCase.proposedPanels = proposalResult.proposedPanels;
    evcCase.rejectedExperts = proposalResult.rejectedExperts;
    evcCase.status = "PANEL_PROPOSED";
    evcCase.updatedAt = this.clock.isoString();

    await this.recordEvcAudit({
      applicationId: evcCase.applicationId,
      actorId: actor?.userId ?? "ro-user-wro",
      actorRole: actor?.role ?? UserRole.REGIONAL_OFFICER,
      action: "EVC_PANEL_PROPOSED_ADVISORY",
      evcCaseId: evcCase.id,
      previousState: { status: beforeStatus },
      newState: {
        status: evcCase.status,
        classification: STATUTORY_ADVISORY_LABEL,
        proposedPanelCount: evcCase.proposedPanels.length,
        rejectedCoiCount: evcCase.rejectedExperts.length,
      },
      rationale:
        "Generated ADVISORY EVC panel proposals with Conflict-of-Interest screening.",
    });

    return evcCase;
  }

  /**
   * 3. Confirm Panel & Date (Human Supremacy):
   * A human officer confirms a proposed conflict-free panel and inspection date.
   * Confirmation is audited, `EVC_SCHEDULING` DueItem is closed, and expert workloads increment.
   */
  async confirmPanelAndSchedule(
    caseId: string,
    input: {
      panelId: string;
      scheduledDate: string;
      actorUserId: string;
      actorRole: string;
      confirmationNote?: string;
    },
  ): Promise<EvcCaseRecord> {
    const evcCase = this.getCaseById(caseId);
    const selectedPanel =
      evcCase.proposedPanels.find((p) => p.id === input.panelId) ??
      evcCase.proposedPanels[0];

    if (!selectedPanel) {
      throw new BadRequestException(
        `No proposed panel found for case ${caseId}. Call proposePanels first.`,
      );
    }

    const beforeState = {
      status: evcCase.status,
      scheduledDate: evcCase.scheduledDate,
    };

    evcCase.confirmedPanel = selectedPanel;
    evcCase.confirmedByUserId = input.actorUserId;
    evcCase.confirmedByRole = input.actorRole;
    evcCase.confirmedAt = this.clock.isoString();
    evcCase.scheduledDate = input.scheduledDate;
    evcCase.status = "SCHEDULED";
    evcCase.updatedAt = this.clock.isoString();

    // Increment workload on confirmed panel members
    this.panelProposal.incrementExpertWorkload(
      selectedPanel.members.map((m) => m.expertUserId),
    );

    // Close the EVC_SCHEDULING DueItem since human scheduling is complete
    await this.dueItems.closeDueItem(evcCase.schedulingDueItemId);

    await this.recordEvcAudit({
      applicationId: evcCase.applicationId,
      actorId: input.actorUserId,
      actorRole: input.actorRole,
      action: "EVC_PANEL_AND_DATE_CONFIRMED_BY_HUMAN",
      evcCaseId: evcCase.id,
      previousState: beforeState,
      newState: {
        status: evcCase.status,
        confirmedPanelCode: selectedPanel.panelCode,
        scheduledDate: evcCase.scheduledDate,
        expertIds: selectedPanel.members.map((m) => m.expertUserId),
      },
      rationale:
        input.confirmationNote ??
        `Human officer confirmed ${selectedPanel.panelCode} for visit on ${input.scheduledDate}.`,
    });

    return evcCase;
  }

  /**
   * 4. Reschedule Visit with Mandatory Reason (Updates DueItems):
   */
  async rescheduleVisit(
    caseId: string,
    input: {
      newDate: string;
      reason: string;
      actorUserId: string;
      actorRole: string;
    },
  ): Promise<EvcCaseRecord> {
    if (!input.reason || input.reason.trim().length < 5) {
      throw new BadRequestException(
        "A mandatory statutory reason (min 5 chars) is required to reschedule an EVC inspection.",
      );
    }

    const evcCase = this.getCaseById(caseId);
    const previousDate = evcCase.scheduledDate ?? evcCase.schedulingDueAt.slice(0, 10);
    const nowIso = this.clock.isoString();

    evcCase.rescheduleHistory.push({
      previousDate,
      newDate: input.newDate,
      reason: input.reason.trim(),
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      rescheduledAt: nowIso,
    });
    evcCase.scheduledDate = input.newDate;
    evcCase.status = "SCHEDULED";
    evcCase.updatedAt = nowIso;

    // Recalculate and update EVC_COMPLETION DueItem based on new scheduled visit date
    const rules = evcCase.isNewInstitution
      ? this.timelineConfig.newInstitution
      : this.timelineConfig.existingInstitution;
    const newVisitDateObj = this.clock.parseIso(
      `${input.newDate.slice(0, 10)}T09:00:00.000Z`,
    );
    const updatedCompletionDueDate = await this.calendar.addWorkingDays(
      newVisitDateObj,
      rules.reportGraceWorkingDays + 2,
    );

    const completionItem = this.dueItems.getDueItem(
      evcCase.completionDueItemId,
    );
    completionItem.dueAt = updatedCompletionDueDate.toISOString();
    evcCase.completionDueAt = updatedCompletionDueDate.toISOString();

    await this.recordEvcAudit({
      applicationId: evcCase.applicationId,
      actorId: input.actorUserId,
      actorRole: input.actorRole,
      action: "EVC_VISIT_RESCHEDULED",
      evcCaseId: evcCase.id,
      previousState: { scheduledDate: previousDate },
      newState: {
        scheduledDate: evcCase.scheduledDate,
        completionDueAt: evcCase.completionDueAt,
      },
      rationale: input.reason.trim(),
    });

    return evcCase;
  }

  /**
   * 5. Mark Visit Done:
   * Transitions `SCHEDULED -> VISIT_DONE` and sets `reportGraceDueAt`.
   */
  async markVisitDone(
    caseId: string,
    actor: { userId: string; role: string; note?: string },
  ): Promise<EvcCaseRecord> {
    const evcCase = this.getCaseById(caseId);
    const now = this.clock.now();
    const rules = evcCase.isNewInstitution
      ? this.timelineConfig.newInstitution
      : this.timelineConfig.existingInstitution;

    const reportGraceDue = await this.calendar.addWorkingDays(
      now,
      rules.reportGraceWorkingDays,
    );

    const beforeStatus = evcCase.status;
    evcCase.status = "VISIT_DONE";
    evcCase.visitDoneAt = now.toISOString();
    evcCase.reportGraceDueAt = reportGraceDue.toISOString();
    evcCase.updatedAt = now.toISOString();

    await this.recordEvcAudit({
      applicationId: evcCase.applicationId,
      actorId: actor.userId,
      actorRole: actor.role,
      action: "EVC_VISIT_COMPLETED",
      evcCaseId: evcCase.id,
      previousState: { status: beforeStatus },
      newState: {
        status: evcCase.status,
        visitDoneAt: evcCase.visitDoneAt,
        reportGraceDueAt: evcCase.reportGraceDueAt,
      },
      rationale:
        actor.note ??
        "Physical/virtual EVC inspection completed; awaiting report submission.",
    });

    return evcCase;
  }

  /**
   * 6. Upload Visit Report & Automatically Continue Committee Stage:
   * Transitions `VISIT_DONE -> REPORT_SUBMITTED -> REPORT_ACCEPTED`,
   * closes `DueItem(EVC_COMPLETION)`, and automatically advances `workflowStage`
   * from `EVC` to `SAC_SHC` (Standing Hearing / Appeal Committee stage) with
   * the statutory notice `"Inspection findings are decided by the committee"`.
   */
  async submitVisitReport(
    caseId: string,
    input: {
      reportFileId: string;
      fileSha256?: string;
      summary: string;
      observations: string[];
      infrastructureVerified: boolean;
      facultyVerified: boolean;
      actorUserId: string;
      actorRole: string;
    },
  ): Promise<EvcCaseRecord> {
    const evcCase = this.getCaseById(caseId);
    const nowIso = this.clock.isoString();
    const beforeStage = evcCase.workflowStage;

    const report: EvcVisitReport = {
      reportFileId: input.reportFileId,
      fileSha256:
        input.fileSha256 ??
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      summary: input.summary,
      observations: input.observations,
      infrastructureVerified: input.infrastructureVerified,
      facultyVerified: input.facultyVerified,
      submittedByUserId: input.actorUserId,
      submittedByRole: input.actorRole,
      submittedAt: nowIso,
      statutoryNotice: STATUTORY_EVC_COMMITTEE_NOTICE,
      classification: STATUTORY_ADVISORY_LABEL,
    };

    evcCase.visitReport = report;
    evcCase.status = "REPORT_SUBMITTED";
    // Automatically accept valid report format and continue to Committee stage (`SAC_SHC`)
    evcCase.status = "REPORT_ACCEPTED";
    evcCase.workflowStage = "SAC_SHC";
    evcCase.updatedAt = nowIso;

    // Close the EVC_COMPLETION DueItem
    await this.dueItems.closeDueItem(evcCase.completionDueItemId);

    await this.recordEvcAudit({
      applicationId: evcCase.applicationId,
      actorId: input.actorUserId,
      actorRole: input.actorRole,
      action: "EVC_REPORT_SUBMITTED_AND_COMMITTEE_STAGE_CONTINUED",
      evcCaseId: evcCase.id,
      previousState: { status: "VISIT_DONE", workflowStage: beforeStage },
      newState: {
        status: evcCase.status,
        workflowStage: evcCase.workflowStage,
        reportFileId: report.reportFileId,
        statutoryNotice: STATUTORY_EVC_COMMITTEE_NOTICE,
      },
      rationale: `EVC report uploaded (${report.reportFileId}). Committee stage (SAC_SHC) continued automatically. ${STATUTORY_EVC_COMMITTEE_NOTICE}.`,
    });

    return evcCase;
  }

  private async recordEvcAudit(input: {
    applicationId: string;
    evcCaseId: string;
    action: string;
    actorId: string;
    actorRole: string;
    previousState: Record<string, unknown> | null;
    newState: Record<string, unknown>;
    rationale: string;
  }) {
    return this.audit.appendEntry({
      entityType: "APPLICATION",
      entityId: input.applicationId,
      action: input.action,
      actorId: input.actorId,
      actorRole: input.actorRole,
      previousState: input.previousState,
      newState: { ...input.newState, evcCaseId: input.evcCaseId },
      rationale: input.rationale,
    });
  }

  /**
   * 7. Phase 6 Escalation Ladder Alerts Evaluator:
   * Evaluates all active EVC cases against the current clock and dispatches
   * notifications through the Phase 6 Outbox & Escalation Policy engine:
   * - `EVC_APPROACHING`: Scheduled visit within 3 days or 1 day.
   * - `EVC_UNSCHEDULED_BEYOND_THRESHOLD`: Case in `QUEUED` or `PANEL_PROPOSED` past `schedulingDueAt` (L0 -> L1 -> L2 -> L3).
   * - `EVC_VISIT_DONE_REPORT_OVERDUE`: Case in `VISIT_DONE` without report past `reportGraceDueAt` (L0 -> L1 -> L2 -> L3).
   */
  async evaluateEvcAlerts(): Promise<EvcAlertRecord[]> {
    const nowMs = this.clock.timestamp();
    const nowIso = this.clock.isoString();
    const newlyFired: EvcAlertRecord[] = [];

    for (const evcCase of this.cases.values()) {
      // A. EVC_UNSCHEDULED_BEYOND_THRESHOLD
      if (
        evcCase.status === "QUEUED" ||
        evcCase.status === "PANEL_PROPOSED"
      ) {
        const schedDueMs = this.clock
          .parseIso(evcCase.schedulingDueAt)
          .getTime();
        const daysPastDue = Math.floor((nowMs - schedDueMs) / DAY_MS);

        if (daysPastDue >= 0) {
          const levelsToFire: Array<0 | 1 | 2 | 3> = [0];
          if (daysPastDue >= 1) levelsToFire.push(1);
          if (daysPastDue >= 3) levelsToFire.push(2);
          if (daysPastDue >= 7) levelsToFire.push(3);

          for (const lvl of levelsToFire) {
            const eventKey = `EVC_CASE:${evcCase.id}:UNSCHEDULED_L${lvl}`;
            if (this.firedAlertKeys.has(eventKey)) continue;
            this.firedAlertKeys.add(eventKey);

            const alert: EvcAlertRecord = {
              id: randomUUID(),
              caseId: evcCase.id,
              applicationRef: evcCase.applicationRef,
              institutionName: evcCase.institutionName,
              alertKind: "EVC_UNSCHEDULED_BEYOND_THRESHOLD",
              escalationLevel: lvl,
              eventKey,
              description: `Unscheduled beyond ${evcCase.isNewInstitution ? "NEW_INSTITUTION 5-day" : "standard 10-day"} threshold (+${daysPastDue}d overdue) -> Escalated to Level ${lvl}`,
              firedAt: nowIso,
            };
            this.alertHistory.push(alert);
            newlyFired.push(alert);

            this.notifications.enqueueOutboxEvent({
              eventKey,
              dueItemId: evcCase.schedulingDueItemId,
              kind: "EVC_SCHEDULING",
              escalationLevel: lvl,
              applicationId: evcCase.applicationRef,
              institution: evcCase.institutionName,
              dueDate: evcCase.schedulingDueAt.slice(0, 10),
              daysRemaining: -daysPastDue,
              actionLink: `/evc?caseId=${evcCase.id}`,
            });
          }
        }
      }

      // B. EVC_APPROACHING
      if (evcCase.status === "SCHEDULED" && evcCase.scheduledDate) {
        const visitMs = this.clock
          .parseIso(`${evcCase.scheduledDate.slice(0, 10)}T09:00:00.000Z`)
          .getTime();
        const daysUntilVisit = Math.ceil((visitMs - nowMs) / DAY_MS);

        if (daysUntilVisit <= 3 && daysUntilVisit >= 0) {
          const stepTag = daysUntilVisit <= 1 ? "T_MINUS_1" : "T_MINUS_3";
          const eventKey = `EVC_CASE:${evcCase.id}:APPROACHING_${stepTag}`;
          if (!this.firedAlertKeys.has(eventKey)) {
            this.firedAlertKeys.add(eventKey);
            const alert: EvcAlertRecord = {
              id: randomUUID(),
              caseId: evcCase.id,
              applicationRef: evcCase.applicationRef,
              institutionName: evcCase.institutionName,
              alertKind: "EVC_APPROACHING",
              escalationLevel: 0,
              eventKey,
              description: `EVC visit approaching on ${evcCase.scheduledDate} (${daysUntilVisit}d remaining). Reminder dispatched to Panel & Institution.`,
              firedAt: nowIso,
            };
            this.alertHistory.push(alert);
            newlyFired.push(alert);

            this.notifications.enqueueOutboxEvent({
              eventKey,
              dueItemId: evcCase.completionDueItemId,
              kind: "EVC_COMPLETION",
              escalationLevel: 0,
              applicationId: evcCase.applicationRef,
              institution: evcCase.institutionName,
              dueDate: evcCase.scheduledDate.slice(0, 10),
              daysRemaining: daysUntilVisit,
              actionLink: `/evc?caseId=${evcCase.id}`,
            });
          }
        }
      }

      // C. EVC_VISIT_DONE_REPORT_OVERDUE
      if (
        evcCase.status === "VISIT_DONE" &&
        !evcCase.visitReport &&
        evcCase.reportGraceDueAt
      ) {
        const graceDueMs = this.clock
          .parseIso(evcCase.reportGraceDueAt)
          .getTime();
        const daysOverdue = Math.floor((nowMs - graceDueMs) / DAY_MS);

        if (daysOverdue >= 0) {
          const levelsToFire: Array<0 | 1 | 2 | 3> = [0];
          if (daysOverdue >= 1) levelsToFire.push(1);
          if (daysOverdue >= 3) levelsToFire.push(2);
          if (daysOverdue >= 7) levelsToFire.push(3);

          for (const lvl of levelsToFire) {
            const eventKey = `EVC_CASE:${evcCase.id}:REPORT_OVERDUE_L${lvl}`;
            if (this.firedAlertKeys.has(eventKey)) continue;
            this.firedAlertKeys.add(eventKey);

            const alert: EvcAlertRecord = {
              id: randomUUID(),
              caseId: evcCase.id,
              applicationRef: evcCase.applicationRef,
              institutionName: evcCase.institutionName,
              alertKind: "EVC_VISIT_DONE_REPORT_OVERDUE",
              escalationLevel: lvl,
              eventKey,
              description: `Visit completed on ${evcCase.visitDoneAt?.slice(0, 10)} but report not submitted (+${daysOverdue}d past grace deadline) -> Escalated to Level ${lvl}`,
              firedAt: nowIso,
            };
            this.alertHistory.push(alert);
            newlyFired.push(alert);

            this.notifications.enqueueOutboxEvent({
              eventKey,
              dueItemId: evcCase.completionDueItemId,
              kind: "EVC_COMPLETION",
              escalationLevel: lvl,
              applicationId: evcCase.applicationRef,
              institution: evcCase.institutionName,
              dueDate: evcCase.reportGraceDueAt.slice(0, 10),
              daysRemaining: -daysOverdue,
              actionLink: `/evc?caseId=${evcCase.id}`,
            });
          }
        }
      }
    }

    if (newlyFired.length > 0) {
      await this.notifications.processOutboxEvents();
    }

    return newlyFired;
  }

  /**
   * Seeds 30 EVC-eligible applications across all 6 regions (`WRO`, `NRO`, `SRO`, `ERO`, `NWRO`, `CRO`)
   * with realistic Indian institution names and statuses.
   */
  async seedThirtyEvcEligibleCases(): Promise<EvcCaseRecord[]> {
    const regions = ["WRO", "NRO", "SRO", "ERO", "NWRO", "CRO"];
    const institutions = [
      "Pune Institute of AI & Emerging Tech (New Institution)",
      "Walchand College of Engineering, Sangli",
      "COEP Technological University, Pune",
      "VJTI Matunga, Mumbai",
      "Harcourt Butler Technical University, Kanpur",
      "PSG College of Technology, Coimbatore",
      "Jadavpur University Faculty of Engg, Kolkata",
      "PEC University of Technology, Chandigarh",
      "SGSITS Indore, Madhya Pradesh",
      "RV College of Engineering, Bengaluru",
    ];

    const created: EvcCaseRecord[] = [];
    for (let i = 0; i < 30; i++) {
      const region = regions[i % regions.length];
      const instName = `${institutions[i % institutions.length]} (Campus #${i + 1})`;
      const isNew = i % 3 === 0;
      const res = await this.handleWorkflowRequiresEvcEvent({
        applicationId: `44444444-4444-4444-8444-4444444445${(i + 1).toString().padStart(2, "0")}`,
        applicationRef: `APP-2026-${region}-EVC-${(i + 1).toString().padStart(3, "0")}`,
        institutionId: i === 0 ? "inst-new-pune-ai" : `inst-seed-${i + 1}`,
        institutionName: instName,
        trustOrSociety:
          i === 0
            ? "Shikshan Prasarak Mandal, Pune"
            : `Regional Technical Education Trust #${(i % 5) + 1}`,
        region,
        isNewInstitution: isNew,
      });
      created.push(res.evcCase);
    }
    return created;
  }

  /**
   * 8. Full Lifecycle Simulation on the Demo Clock for a Delayed New-Institution EVC:
   * Simulates:
   * - Workflow enters `requires_evc` -> creates `QUEUED` case & stricter `NEW_INSTITUTION` DueItems (5d scheduling, 12d completion)
   * - Proposes `ADVISORY` panels (filtering out Same Institution, Same Trust/Society, Prior Association)
   * - Advances Demo Clock past 5d scheduling threshold (+10 days) without confirmation -> triggers `EVC_UNSCHEDULED_BEYOND_THRESHOLD` across L0 -> L1 -> L2
   * - Human officer confirms panel & date (`SCHEDULED`), then reschedules with reason -> updates `DueItems`
   * - Advances Demo Clock to T-2 days before visit -> triggers `EVC_APPROACHING` reminder
   * - Marks visit done (`VISIT_DONE`), then advances Demo Clock +5 days past grace window -> triggers `EVC_VISIT_DONE_REPORT_OVERDUE` escalation
   * - Uploads visit report (`REPORT_SUBMITTED` -> `REPORT_ACCEPTED`) -> automatically continues committee stage (`SAC_SHC`)
   */
  async runDelayedNewInstitutionEvcSimulation() {
    this.resetAll();
    this.notifications.resetAll();

    const startMs = this.clock.parseIso("2026-05-04T03:30:00.000Z").getTime();
    this.clock.setSimulatedTime(startMs);

    // Seed 30 EVC-eligible cases (Case #1 is the delayed New Institution case)
    const seededCases = await this.seedThirtyEvcEligibleCases();
    const targetCase = seededCases[0];

    // Step 1: Propose ADVISORY panels
    await this.proposePanels(targetCase.id, {
      userId: "ro-wro-01",
      role: UserRole.REGIONAL_OFFICER,
    });

    // Step 2: Advance Demo Clock by 11 calendar days (past the stricter 5-working-day NEW_INSTITUTION scheduling deadline)
    this.clock.advanceDays(11);
    await this.dueItems.runSweep();
    await this.evaluateEvcAlerts();

    // Step 3: Human confirms panel & schedules visit 6 days ahead
    const futureVisitDate = this.clock
      .fromEpochMs(this.clock.timestamp() + 6 * DAY_MS)
      .toISOString()
      .slice(0, 10);

    await this.confirmPanelAndSchedule(targetCase.id, {
      panelId: targetCase.proposedPanels[0].id,
      scheduledDate: futureVisitDate,
      actorUserId: "ro-wro-01",
      actorRole: UserRole.REGIONAL_OFFICER,
      confirmationNote:
        "Confirmed top-ranked WRO panel after resolving scheduling delay.",
    });

    // Step 4: Reschedule visit by +2 days with mandatory reason (updates DueItems)
    const rescheduledDate = this.clock
      .fromEpochMs(this.clock.timestamp() + 8 * DAY_MS)
      .toISOString()
      .slice(0, 10);

    await this.rescheduleVisit(targetCase.id, {
      newDate: rescheduledDate,
      reason:
        "Rescheduled by +2 days due to State University examination centre allocation at campus.",
      actorUserId: "ro-wro-01",
      actorRole: UserRole.REGIONAL_OFFICER,
    });

    // Step 5: Advance Demo Clock by 6 days so visit is 2 days away -> fires EVC_APPROACHING
    this.clock.advanceDays(6);
    await this.evaluateEvcAlerts();

    // Step 6: Advance Demo Clock by 2 days (Visit Day) and mark visit done
    this.clock.advanceDays(2);
    await this.markVisitDone(targetCase.id, {
      userId: targetCase.confirmedPanel!.members[0].expertUserId,
      role: UserRole.COMMITTEE_MEMBER,
      note: "Physical inspection of AI & Computing labs completed.",
    });

    // Step 7: Delay report submission by advancing Demo Clock +6 days past the 2-working-day grace period -> fires EVC_VISIT_DONE_REPORT_OVERDUE
    this.clock.advanceDays(6);
    await this.evaluateEvcAlerts();

    // Step 8: Upload visit report -> transitions to REPORT_ACCEPTED and auto-advances application to SAC_SHC committee stage
    const finalCase = await this.submitVisitReport(targetCase.id, {
      reportFileId: "DOC-EVC-REPORT-2026-001.pdf",
      summary:
        "Infrastructure, AI GPU cluster, and faculty cadre verified on-site.",
      observations: [
        "120 workstation terminals verified in AI & Data Science Lab",
        "High-tension safety certificate and barrier-free ramps verified",
      ],
      infrastructureVerified: true,
      facultyVerified: true,
      actorUserId: targetCase.confirmedPanel!.members[0].expertUserId,
      actorRole: UserRole.COMMITTEE_MEMBER,
    });

    return {
      seededCaseCount: this.cases.size,
      finalCase,
      rejectedCoiExperts: finalCase.rejectedExperts,
      alertsFired: this.getAlertsForCase(finalCase.id),
      phase6Deliveries: this.notifications.getDeliveryLog(),
      demoClockState: this.clock.getDemoClockState(),
    };
  }

  listCases(): EvcCaseRecord[] {
    return Array.from(this.cases.values());
  }

  getCaseById(caseId: string): EvcCaseRecord {
    const found = this.cases.get(caseId);
    if (!found) {
      throw new NotFoundException(`EVC Case ${caseId} not found`);
    }
    return found;
  }

  getAlertsForCase(caseId?: string): EvcAlertRecord[] {
    if (!caseId) return [...this.alertHistory];
    return this.alertHistory.filter((a) => a.caseId === caseId);
  }

  /**
   * Backward-compatible methods
   */
  listSchedules() {
    const all = this.listCases();
    return {
      total: all.length,
      schedules: all,
      statutoryNotice: STATUTORY_EVC_COMMITTEE_NOTICE,
      timestamp: this.clock.isoString(),
    };
  }

  scheduleInspection(
    applicationId: string,
    payload: { proposedDate: string; panelExpertIds: string[] },
  ) {
    return {
      inspectionId: "evc-inspection-uuid",
      applicationId,
      proposedDate: payload.proposedDate,
      panelExpertIds: payload.panelExpertIds,
      scheduledAt: this.clock.isoString(),
      recommendationType: STATUTORY_ADVISORY_LABEL,
      statutoryNotice: STATUTORY_EVC_COMMITTEE_NOTICE,
    };
  }
}
