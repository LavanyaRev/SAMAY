import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { UserRole } from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";
import {
  AuditChainVerificationReport,
  AuditLogRow,
  AuditService,
} from "../audit/audit.service";
import { DueItemKind, DueItemService } from "../deadlines/due-item.service";
import { NotificationsService } from "../notifications/notifications.service";

export const TAMPER_DEMO_APP_ID = "APP-2026-TAMPER-DEMO";
export const SCENARIO_DEMO_APP_ID = "APP-2026-WRO-HERO-01";
export const SIMULATOR_POLICY_ENTITY_ID =
  "00000000-0000-4000-8000-000000000099";

export interface LiveFeedAlertItem {
  id: string;
  firedAt: string;
  applicationId: string;
  kind: DueItemKind | string;
  escalationLevel: number;
  recipientRole: string;
  channel: string;
  summary: string;
}

export interface ScenarioStepDefinition {
  stepIndex: number;
  code:
    | "SUBMIT"
    | "RETURN"
    | "RESPOND"
    | "EVC_DELAY"
    | "UNDERTAKING_MISS"
    | "LEASE_EXPIRY";
  titleEn: string;
  titleHi: string;
  daysJump: number;
  stageAfter: string;
  slaStatusAfter: "ON_TRACK" | "PAUSED" | "DUE_SOON" | "OVERDUE";
  descriptionEn: string;
  descriptionHi: string;
}

export const SCENARIO_DEFINITION_JSON: ScenarioStepDefinition[] = [
  {
    stepIndex: 0,
    code: "SUBMIT",
    titleEn: "1. Submit Application (SLA Starts)",
    titleHi: "1. आवेदन प्रस्तुत करें (एसएलए प्रारंभ)",
    daysJump: 0,
    stageAfter: "SCRUTINY",
    slaStatusAfter: "ON_TRACK",
    descriptionEn:
      "Institution submits APP-2026-WRO-HERO-01. Processing stage SLA clock starts (15 working days target).",
    descriptionHi:
      "संस्थान APP-2026-WRO-HERO-01 प्रस्तुत करता है। जांच चरण एसएलए घड़ी शुरू होती है।",
  },
  {
    stepIndex: 1,
    code: "RETURN",
    titleEn: "2. Officer Returns for Deficiency (SLA Paused)",
    titleHi: "2. कमी के लिए वापसी (एसएलए विराम)",
    daysJump: 2,
    stageAfter: "DEFICIENCY_RECTIFICATION",
    slaStatusAfter: "PAUSED",
    descriptionEn:
      "Scrutiny officer flags missing fire safety annexure. SLA clock pauses while ball is with INSTITUTION.",
    descriptionHi:
      "जांच अधिकारी अग्नि सुरक्षा अनुलग्नक की कमी चिह्नित करता है। एसएलए घड़ी रुक जाती है।",
  },
  {
    stepIndex: 2,
    code: "RESPOND",
    titleEn: "3. Institution Responds & Advances to EVC",
    titleHi: "3. संस्थान का उत्तर और ईवीसी चरण",
    daysJump: 3,
    stageAfter: "EVC",
    slaStatusAfter: "ON_TRACK",
    descriptionEn:
      "Institution uploads clarification. SLA clock resumes with extended due_at and creates EVC_SCHEDULING due item.",
    descriptionHi:
      "संस्थान स्पष्टीकरण अपलोड करता है। एसएलए घड़ी पुनः शुरू होती है और ईवीसी शेड्यूलिंग देय आइटम बनाती है।",
  },
  {
    stepIndex: 3,
    code: "EVC_DELAY",
    titleEn: "4. EVC Unscheduled Beyond Threshold (+10d Jump)",
    titleHi: "4. ईवीसी अनुसूचित नहीं (+10 दिन छलांग)",
    daysJump: 10,
    stageAfter: "EVC",
    slaStatusAfter: "OVERDUE",
    descriptionEn:
      "Clock jumps +10 days. EVC_SCHEDULING breaches threshold; sweep fires Level 1 escalation to Regional Officer.",
    descriptionHi:
      "घड़ी +10 दिन आगे बढ़ती है। क्षेत्रीय अधिकारी को स्तर 1 की चेतावनी भेजी जाती है।",
  },
  {
    stepIndex: 4,
    code: "UNDERTAKING_MISS",
    titleEn: "5. Conditional Undertaking Missed (+21d Jump)",
    titleHi: "5. सशर्त वचनबंध चूक (+21 दिन छलांग)",
    daysJump: 21,
    stageAfter: "SAC_SHC",
    slaStatusAfter: "OVERDUE",
    descriptionEn:
      "Clock jumps +21 days. Undertaking condition FIRE_NOC_AFFIDAVIT misses due_date; Level 2 escalation fires to Bureau Officer.",
    descriptionHi:
      "घड़ी +21 दिन आगे बढ़ती है। वचनबंध की समय-सीमा समाप्त होने पर ब्यूरो अधिकारी को स्तर 2 अलर्ट जाता है।",
  },
  {
    stepIndex: 5,
    code: "LEASE_EXPIRY",
    titleEn: "6. Statutory Lease Deed Expires (+30d Jump)",
    titleHi: "6. वैधानिक पट्टा विलेख समाप्त (+30 दिन छलांग)",
    daysJump: 30,
    stageAfter: "BUREAU_REVIEW",
    slaStatusAfter: "OVERDUE",
    descriptionEn:
      "Clock jumps +30 days. Tracked Lease Deed LEASE-WRO-2026-09 crosses expiry; Level 3 critical alert fires to Designated Head.",
    descriptionHi:
      "घड़ी +30 दिन आगे बढ़ती है। पट्टा विलेख समाप्त होने पर नामित प्रमुख को स्तर 3 अलर्ट भेजा जाता है।",
  },
];

export interface ComplianceScoreWeights {
  overdueUndertakingPenalty: number;
  expiredDocumentPenalty: number;
  expiringSoonDocumentPenalty: number;
  slowReturnResponsePenaltyPerDay: number;
  missedDeadlinePenalty: number;
}

export interface ComplianceDeductionItem {
  id: string;
  category:
    | "OVERDUE_UNDERTAKING"
    | "EXPIRED_DOCUMENT"
    | "EXPIRING_DOCUMENT"
    | "SLOW_RETURN_RESPONSE"
    | "MISSED_DEADLINE";
  itemRef: string;
  title: string;
  reason: string;
  pointsDeducted: number;
  weightApplied: number;
  aphClause: string;
}

export interface InstitutionComplianceInput {
  institutionId: string;
  institutionName: string;
  region: string;
  overdueUndertakings: Array<{ ref: string; title: string; daysOverdue: number }>;
  expiredDocuments: Array<{ ref: string; docType: string; daysExpired: number }>;
  expiringSoonDocuments: Array<{
    ref: string;
    docType: string;
    daysRemaining: number;
  }>;
  returnResponses: Array<{
    applicationRef: string;
    responseWorkingDays: number;
    targetWorkingDays: number;
  }>;
  missedDeadlines: Array<{
    dueItemRef: string;
    kind: string;
    daysOverdue: number;
  }>;
}

export interface ComplianceHealthScoreReport {
  institutionId: string;
  institutionName: string;
  region: string;
  advisory: true;
  advisoryLabel: "ADVISORY";
  advisoryNotice: string;
  baseScore: 100;
  finalScore: number;
  riskBand: "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK";
  totalPointsDeducted: number;
  weightsUsed: ComplianceScoreWeights;
  deductionBreakdown: ComplianceDeductionItem[];
  computedAt: string;
}

export interface DraftSimulationConfig {
  pipelineCode?: "SCRUTINY_EVC" | "ONLY_SCRUTINY";
  stageTimelinesWorkingDays: Record<string, number>;
  escalationDelaysWorkingDays: {
    level1DelayDays: number;
    level2DelayDays: number;
    level3DelayDays: number;
  };
}

export interface OpenCaseSnapshot {
  caseId: string;
  applicationRef: string;
  institutionId: string;
  institutionName: string;
  region: string;
  stage: string;
  assignedOfficerId: string;
  assignedOfficerName: string;
  elapsedWorkingDays: number;
}

@Injectable()
export class HeroFeaturesService {
  private readonly liveFeed: LiveFeedAlertItem[] = [];
  private currentScenarioCursor = -1;
  private scenarioDueItemIds: string[] = [];

  private cleanTamperBackup: AuditLogRow[] = [];
  private isDemoRowTampered = false;

  private scoreWeights: ComplianceScoreWeights = {
    // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
    overdueUndertakingPenalty: 15,
    expiredDocumentPenalty: 20,
    expiringSoonDocumentPenalty: 8,
    slowReturnResponsePenaltyPerDay: 3,
    missedDeadlinePenalty: 10,
  };

  private readonly activeStageTimelines: Record<string, number> = {
    // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
    SUBMITTED: 3,
    SCRUTINY: 15,
    DEFICIENCY_RECTIFICATION: 10,
    EVC: 12,
    SAC_SHC: 10,
    BUREAU_REVIEW: 7,
  };

  private readonly activeEscalationDelays = {
    level1DelayDays: 1,
    level2DelayDays: 3,
    level3DelayDays: 7,
  };

  private readonly publishedPolicyVersions: Array<{
    versionId: string;
    versionName: string;
    reason: string;
    publishedBy: string;
    publishedAt: string;
    config: DraftSimulationConfig;
  }> = [];

  private readonly liveOpenCases: OpenCaseSnapshot[] =
    this.buildInitialOpenCases();

  constructor(
    private readonly clock: SystemClockService,
    private readonly auditService: AuditService,
    private readonly dueItems: DueItemService,
    private readonly notifications: NotificationsService,
  ) {}

  private buildInitialOpenCases(): OpenCaseSnapshot[] {
    const regions = ["WRO", "NRO", "SRO", "ERO", "NWRO", "CRO"];
    const stages = [
      "SUBMITTED",
      "SCRUTINY",
      "DEFICIENCY_RECTIFICATION",
      "EVC",
      "SAC_SHC",
      "BUREAU_REVIEW",
    ];
    const rows: OpenCaseSnapshot[] = [];
    for (let i = 0; i < 60; i++) {
      const region = regions[i % regions.length];
      const stage = stages[i % stages.length];
      const elapsedWorkingDays = (i * 3 + 4) % 24;
      rows.push({
        caseId: `sim-case-${(i + 1).toString().padStart(3, "0")}`,
        applicationRef: `APP-2026-${region}-${(i + 101).toString().padStart(4, "0")}`,
        institutionId: `inst-${((i % 15) + 1).toString().padStart(3, "0")}`,
        institutionName: `AICTE Technical Institution #${(i % 15) + 1} (${region})`,
        region,
        stage,
        assignedOfficerId: `off-${region.toLowerCase()}-${(i % 2) + 1}`,
        assignedOfficerName: `Officer ${(i % 2) + 1} (${region})`,
        elapsedWorkingDays,
      });
    }
    return rows;
  }

  /* ========================================================================
   * 1. TIME-TRAVEL CONSOLE & JSON SCENARIO RUNNER
   * ======================================================================== */

  async jumpClockAndRunWorkers(params: {
    days?: number;
    hours?: number;
    targetIso?: string;
    actorId?: string;
    reason?: string;
  }) {
    const actorId = params.actorId ?? "admin-time-travel";
    const before = this.clock.getDemoClockState();

    if (params.targetIso) {
      const targetMs = this.clock.parseIso(params.targetIso).getTime();
      const realNowMs = this.clock.now().getTime() - before.offsetMs;
      const nextOffset = targetMs - realNowMs;
      this.clock.setOffsetMs(nextOffset);
    } else {
      this.clock.advanceBy({
        days: params.days ?? 0,
        hours: params.hours ?? 0,
      });
    }

    const after = this.clock.getDemoClockState();
    await this.auditService.appendEntry({
      entityType: "SYSTEM_CLOCK",
      entityId: "00000000-0000-4000-8000-000000000001",
      action: "TIME_TRAVEL_JUMP",
      actorId,
      actorRole: UserRole.ADMIN,
      previousState: {
        offsetMs: before.offsetMs,
        currentIso: before.currentIso,
      },
      newState: {
        offsetMs: after.offsetMs,
        currentIso: after.currentIso,
      },
      rationale:
        params.reason ??
        `Time-travel console jump (${params.days ?? 0}d ${params.hours ?? 0}h)`,
    });

    // Run deadline sweep and outbox notification worker immediately
    const sweepReport = await this.dueItems.runSweep();
    const outboxReport = await this.notifications.processOutboxEvents();

    const newFeedItems: LiveFeedAlertItem[] = sweepReport.firedEvents.map(
      (ev) => {
        const level =
          ev.stepKey === "ESCALATION_L3"
            ? 3
            : ev.stepKey === "ESCALATION_L2"
              ? 2
              : ev.stepKey === "ESCALATION_L1"
                ? 1
                : 0;
        const recipientRole =
          level === 3
            ? "ADMIN (Designated Head)"
            : level === 2
              ? "BUREAU_OFFICER"
              : level === 1
                ? "REGIONAL_OFFICER"
                : "INSTITUTION & SCRUTINY_OFFICER";
        return {
          id: ev.id,
          firedAt: ev.firedAt,
          applicationId: ev.entityId,
          kind: ev.kind,
          escalationLevel: level,
          recipientRole,
          channel: "IN_APP + EMAIL + SMS",
          summary: `[${ev.stepKey}] ${ev.dueItemLabel} (${ev.kind}) -> Escalation L${level} dispatched to ${recipientRole}`,
        };
      },
    );

    this.liveFeed.unshift(...newFeedItems);

    return {
      clockState: after,
      sweepReport,
      outboxReport,
      newlyFiredAlerts: newFeedItems,
      liveFeed: this.liveFeed.slice(0, 30),
    };
  }

  getScenarioState() {
    return {
      scenarioApplicationId: SCENARIO_DEMO_APP_ID,
      currentStepIndex: this.currentScenarioCursor,
      totalSteps: SCENARIO_DEFINITION_JSON.length,
      isCompleted:
        this.currentScenarioCursor >= SCENARIO_DEFINITION_JSON.length - 1,
      steps: SCENARIO_DEFINITION_JSON,
      currentStep:
        this.currentScenarioCursor >= 0
          ? SCENARIO_DEFINITION_JSON[this.currentScenarioCursor]
          : null,
      nextStep:
        this.currentScenarioCursor + 1 < SCENARIO_DEFINITION_JSON.length
          ? SCENARIO_DEFINITION_JSON[this.currentScenarioCursor + 1]
          : null,
      clockState: this.clock.getDemoClockState(),
      liveFeed: this.liveFeed.slice(0, 30),
    };
  }

  async stepScenarioNext(actorId = "admin-scenario-runner") {
    if (this.currentScenarioCursor + 1 >= SCENARIO_DEFINITION_JSON.length) {
      return this.getScenarioState();
    }

    this.currentScenarioCursor += 1;
    const step = SCENARIO_DEFINITION_JSON[this.currentScenarioCursor];

    if (step.code === "SUBMIT") {
      const dueAt = this.clock.plusDays(15).toISOString();
      const created = await this.dueItems.createDueItem({
        label: "Scrutiny Stage SLA (APP-2026-WRO-HERO-01)",
        kind: "PROCESSING_STAGE",
        entityType: "APPLICATION",
        entityId: SCENARIO_DEMO_APP_ID,
        regionId: "WRO",
        dueAt,
      });
      this.scenarioDueItemIds.push(created.id);
    } else if (step.code === "RETURN") {
      if (this.scenarioDueItemIds[0]) {
        await this.dueItems.pauseDueItem(
          this.scenarioDueItemIds[0],
          "Returned to institution for fire safety annexure deficiency",
        );
      }
    } else if (step.code === "RESPOND") {
      if (this.scenarioDueItemIds[0]) {
        await this.dueItems.resumeDueItem(this.scenarioDueItemIds[0]);
      }
      // Create EVC_SCHEDULING, UNDERTAKING, and DOCUMENT_EXPIRY due items for the upcoming scenario steps
      const evcDue = await this.dueItems.createDueItem({
        label: "EVC Panel Scheduling (APP-2026-WRO-HERO-01)",
        kind: "EVC_SCHEDULING",
        entityType: "APPLICATION",
        entityId: SCENARIO_DEMO_APP_ID,
        regionId: "WRO",
        dueAt: this.clock.plusDays(7).toISOString(),
      });
      const undDue = await this.dueItems.createDueItem({
        label: "Conditional Undertaking FIRE_NOC_AFFIDAVIT",
        kind: "UNDERTAKING",
        entityType: "APPLICATION",
        entityId: SCENARIO_DEMO_APP_ID,
        regionId: "WRO",
        dueAt: this.clock.plusDays(24).toISOString(),
      });
      const leaseDue = await this.dueItems.createDueItem({
        label: "Statutory Lease Deed LEASE-WRO-2026-09 Expiry",
        kind: "DOCUMENT_EXPIRY",
        entityType: "APPLICATION",
        entityId: SCENARIO_DEMO_APP_ID,
        regionId: "WRO",
        dueAt: this.clock.plusDays(50).toISOString(),
      });
      this.scenarioDueItemIds.push(evcDue.id, undDue.id, leaseDue.id);
    }

    const jumpResult = await this.jumpClockAndRunWorkers({
      days: step.daysJump,
      actorId,
      reason: `Scenario Runner Step ${step.stepIndex + 1}: ${step.code}`,
    });

    // Guarantee a deterministic step alert entry in the live feed for each story step
    const storyFeedItem: LiveFeedAlertItem = {
      id: `scenario-step-${step.code}-${this.clock.timestamp()}`,
      firedAt: this.clock.isoString(),
      applicationId: SCENARIO_DEMO_APP_ID,
      kind:
        step.code === "EVC_DELAY"
          ? "EVC_SCHEDULING"
          : step.code === "UNDERTAKING_MISS"
            ? "UNDERTAKING"
            : step.code === "LEASE_EXPIRY"
              ? "DOCUMENT_EXPIRY"
              : "PROCESSING_STAGE",
      escalationLevel:
        step.code === "LEASE_EXPIRY"
          ? 3
          : step.code === "UNDERTAKING_MISS"
            ? 2
            : step.code === "EVC_DELAY"
              ? 1
              : 0,
      recipientRole:
        step.code === "LEASE_EXPIRY"
          ? "ADMIN (Designated Head)"
          : step.code === "UNDERTAKING_MISS"
            ? "BUREAU_OFFICER"
            : step.code === "EVC_DELAY"
              ? "REGIONAL_OFFICER"
              : "INSTITUTION & SCRUTINY_OFFICER",
      channel: "IN_APP + EMAIL + SMS",
      summary: `${step.titleEn} — ${step.descriptionEn}`,
    };
    this.liveFeed.unshift(storyFeedItem);

    return {
      ...this.getScenarioState(),
      lastJumpResult: jumpResult,
    };
  }

  async resetScenario(actorId = "admin-scenario-runner") {
    this.currentScenarioCursor = -1;
    this.scenarioDueItemIds = [];
    this.liveFeed.length = 0;
    this.clock.resetOffset();
    await this.auditService.appendEntry({
      entityType: "SYSTEM_CLOCK",
      entityId: "00000000-0000-4000-8000-000000000001",
      action: "SCENARIO_RUNNER_RESET",
      actorId,
      actorRole: UserRole.ADMIN,
      previousState: null,
      newState: { reset: true },
      rationale: "Reset demo clock and scenario story runner",
    });
    return this.getScenarioState();
  }

  /* ========================================================================
   * 2. TAMPER DEMO (ADMIN DEV TOOLS)
   * ======================================================================== */

  private async ensureTamperDemoChainSeeded(): Promise<void> {
    const existing = await this.auditService.getChainEntries(TAMPER_DEMO_APP_ID);
    if (existing.length > 0) {
      if (this.cleanTamperBackup.length === 0) {
        this.cleanTamperBackup = JSON.parse(
          JSON.stringify(existing),
        ) as AuditLogRow[];
      }
      return;
    }

    const step1 = await this.auditService.appendEntry({
      entityType: "APPLICATION",
      entityId: TAMPER_DEMO_APP_ID,
      action: "APPLICATION_SUBMITTED",
      actorId: "inst-walchand-001",
      actorRole: UserRole.INSTITUTION,
      previousState: { status: "DRAFT" },
      newState: { status: "SUBMITTED", stage: "SCRUTINY" },
      rationale: "Initial application dossier submitted with 7 mandatory annexures",
    });

    const step2 = await this.auditService.appendEntry({
      entityType: "APPLICATION",
      entityId: TAMPER_DEMO_APP_ID,
      action: "SCRUTINY_VERIFIED",
      actorId: "scrutiny-officer-wro-1",
      actorRole: UserRole.COMMITTEE_MEMBER,
      previousState: { status: "SUBMITTED", stage: "SCRUTINY" },
      newState: { status: "SCRUTINY_CLEARED", stage: "EVC" },
      rationale: "All faculty norms and lab area requirements verified by Scrutiny Committee",
    });

    const step3 = await this.auditService.appendEntry({
      entityType: "APPLICATION",
      entityId: TAMPER_DEMO_APP_ID,
      action: "EVC_REPORT_SUBMITTED",
      actorId: "evc-chair-009",
      actorRole: UserRole.COMMITTEE_MEMBER,
      previousState: { status: "SCRUTINY_CLEARED", stage: "EVC" },
      newState: { status: "EVC_COMPLETED", stage: "BUREAU_REVIEW" },
      rationale: "Expert Visit Committee physical verification completed",
    });

    this.cleanTamperBackup = JSON.parse(
      JSON.stringify([step1, step2, step3]),
    ) as AuditLogRow[];
    this.isDemoRowTampered = false;
  }

  async getTamperDemoState() {
    await this.ensureTamperDemoChainSeeded();
    const entries = await this.auditService.getChainEntries(TAMPER_DEMO_APP_ID);
    const verification = await this.auditService.verifyChain(TAMPER_DEMO_APP_ID);
    return {
      applicationId: TAMPER_DEMO_APP_ID,
      isProductionDisabled: process.env.NODE_ENV === "production",
      isTampered: this.isDemoRowTampered || !verification.valid,
      entries,
      verification,
    };
  }

  async tamperOneAuditRow(params?: {
    entryIndex?: number;
    tamperedRationale?: string;
  }) {
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenException(
        "Tamper demo is strictly disabled in production builds (NODE_ENV === 'production').",
      );
    }

    await this.ensureTamperDemoChainSeeded();
    const targetIndex = params?.entryIndex ?? 1;
    const mutatedRow = await this.auditService.simulateSqlTamperForVerification(
      TAMPER_DEMO_APP_ID,
      targetIndex,
      {
        rationale:
          params?.tamperedRationale ??
          "TAMPERED_PAYLOAD: Unauthorised backdoor modification of scrutiny remarks",
        newState: {
          status: "AUTONOMOUS_BYPASS_INJECTED",
          stage: "APPROVED",
          tamperedOnDisk: true,
        },
      },
    );
    this.isDemoRowTampered = true;
    const verification = await this.auditService.verifyChain(TAMPER_DEMO_APP_ID);

    return {
      mutatedRow,
      verification,
      entries: await this.auditService.getChainEntries(TAMPER_DEMO_APP_ID),
    };
  }

  async verifyTamperDemoChain(): Promise<AuditChainVerificationReport> {
    await this.ensureTamperDemoChainSeeded();
    return this.auditService.verifyChain(TAMPER_DEMO_APP_ID);
  }

  async repairTamperDemoState() {
    await this.ensureTamperDemoChainSeeded();
    const entries = await this.auditService.getChainEntries(TAMPER_DEMO_APP_ID);

    for (let i = 0; i < this.cleanTamperBackup.length; i++) {
      const clean = this.cleanTamperBackup[i];
      if (entries[i]) {
        await this.auditService.simulateSqlTamperForVerification(
          TAMPER_DEMO_APP_ID,
          i,
          {
            rationale: clean.rationale ?? undefined,
            newState: JSON.parse(JSON.stringify(clean.newState)) as Record<
              string,
              unknown
            >,
            actorId: clean.actorId,
          },
        );
      }
    }

    this.isDemoRowTampered = false;
    const verification = await this.auditService.verifyChain(TAMPER_DEMO_APP_ID);
    return {
      repaired: true,
      verification,
      entries: await this.auditService.getChainEntries(TAMPER_DEMO_APP_ID),
    };
  }

  /* ========================================================================
   * 3. COMPLIANCE HEALTH SCORE (WEIGHTED RULE-BASED, ADVISORY)
   * ======================================================================== */

  getComplianceScoreWeights(): ComplianceScoreWeights {
    return { ...this.scoreWeights };
  }

  async updateComplianceScoreWeights(
    nextWeights: Partial<ComplianceScoreWeights>,
    actorId = "admin-user",
  ): Promise<ComplianceScoreWeights> {
    const before = { ...this.scoreWeights };
    this.scoreWeights = {
      ...this.scoreWeights,
      ...nextWeights,
    };

    await this.auditService.appendEntry({
      entityType: "COMPLIANCE_SCORE_WEIGHTS",
      entityId: "00000000-0000-4000-8000-000000000055",
      action: "COMPLIANCE_WEIGHTS_UPDATED",
      actorId,
      actorRole: UserRole.ADMIN,
      previousState: before as unknown as Record<string, unknown>,
      newState: this.scoreWeights as unknown as Record<string, unknown>,
      rationale: "Updated configurable weights for advisory Compliance Health Score",
    });

    return { ...this.scoreWeights };
  }

  private getDefaultInstitutionInput(
    institutionId: string,
  ): InstitutionComplianceInput {
    if (institutionId === "inst-clean") {
      return {
        institutionId: "inst-clean",
        institutionName: "COEP Technological University, Pune",
        region: "WRO",
        overdueUndertakings: [],
        expiredDocuments: [],
        expiringSoonDocuments: [],
        returnResponses: [
          {
            applicationRef: "APP-2026-WRO-0002",
            responseWorkingDays: 3,
            targetWorkingDays: 5,
          },
        ],
        missedDeadlines: [],
      };
    }

    return {
      institutionId,
      institutionName: "Walchand College of Engineering, Sangli",
      region: "WRO",
      overdueUndertakings: [
        {
          ref: "UND-2026-WRO-014",
          title: "Faculty Cadre Ratio Rectification Affidavit",
          daysOverdue: 12,
        },
      ],
      expiredDocuments: [
        {
          ref: "DOC-FIRE-2023-88",
          docType: "FIRE_SAFETY_CERTIFICATE",
          daysExpired: 9,
        },
      ],
      expiringSoonDocuments: [
        {
          ref: "LEASE-WRO-2026-09",
          docType: "LEASE_DEED",
          daysRemaining: 22,
        },
      ],
      returnResponses: [
        {
          applicationRef: "APP-2026-WRO-00104",
          responseWorkingDays: 9,
          targetWorkingDays: 5,
        },
      ],
      missedDeadlines: [
        {
          dueItemRef: "DUE-EVC-0081",
          kind: "EVC_READINESS_CONFIRMATION",
          daysOverdue: 4,
        },
      ],
    };
  }

  calculateInstitutionComplianceScore(
    institutionId: string,
    customInput?: InstitutionComplianceInput,
    weightsOverride?: Partial<ComplianceScoreWeights>,
  ): ComplianceHealthScoreReport {
    const profile = customInput ?? this.getDefaultInstitutionInput(institutionId);
    const weights: ComplianceScoreWeights = {
      ...this.scoreWeights,
      ...weightsOverride,
    };

    const deductions: ComplianceDeductionItem[] = [];

    // Rule 1: Overdue Undertakings
    for (const und of profile.overdueUndertakings) {
      deductions.push({
        id: `ded-und-${und.ref}`,
        category: "OVERDUE_UNDERTAKING",
        itemRef: und.ref,
        title: `Overdue Undertaking: ${und.title}`,
        reason: `Condition remains unverified ${und.daysOverdue} working days past statutory due_date.`,
        pointsDeducted: weights.overdueUndertakingPenalty,
        weightApplied: weights.overdueUndertakingPenalty,
        // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
        aphClause: "APH 2024-27 Chapter VII (Time-Bound Undertakings) - TODO(APH-VERIFY)",
      });
    }

    // Rule 2: Expired Documents
    for (const doc of profile.expiredDocuments) {
      deductions.push({
        id: `ded-exp-${doc.ref}`,
        category: "EXPIRED_DOCUMENT",
        itemRef: doc.ref,
        title: `Expired Statutory Document (${doc.docType})`,
        reason: `Document ${doc.ref} expired ${doc.daysExpired} days ago without verified renewal.`,
        pointsDeducted: weights.expiredDocumentPenalty,
        weightApplied: weights.expiredDocumentPenalty,
        aphClause: "APH 2024-27 Annexure-2 Document Validity - TODO(APH-VERIFY)",
      });
    }

    // Rule 3: Expiring Soon Documents
    for (const doc of profile.expiringSoonDocuments) {
      deductions.push({
        id: `ded-soon-${doc.ref}`,
        category: "EXPIRING_DOCUMENT",
        itemRef: doc.ref,
        title: `Expiring Document Within 30 Days (${doc.docType})`,
        reason: `Document ${doc.ref} expires in ${doc.daysRemaining} days; renewal under review.`,
        pointsDeducted: weights.expiringSoonDocumentPenalty,
        weightApplied: weights.expiringSoonDocumentPenalty,
        aphClause: "APH 2024-27 Lease & Land Title Continuity - TODO(APH-VERIFY)",
      });
    }

    // Rule 4: Response Time to Deficiency Returns
    for (const ret of profile.returnResponses) {
      const excessDays = Math.max(
        0,
        ret.responseWorkingDays - ret.targetWorkingDays,
      );
      if (excessDays > 0) {
        const pts = excessDays * weights.slowReturnResponsePenaltyPerDay;
        deductions.push({
          id: `ded-ret-${ret.applicationRef}`,
          category: "SLOW_RETURN_RESPONSE",
          itemRef: ret.applicationRef,
          title: `Delayed Deficiency Response (${ret.applicationRef})`,
          reason: `Institution took ${ret.responseWorkingDays} working days to respond to scrutiny return (target ${ret.targetWorkingDays} days; +${excessDays} excess days).`,
          pointsDeducted: pts,
          weightApplied: weights.slowReturnResponsePenaltyPerDay,
          aphClause: "APH 2024-27 Scrutiny Rectification Window - TODO(APH-VERIFY)",
        });
      }
    }

    // Rule 5: Missed Deadlines
    for (const dl of profile.missedDeadlines) {
      deductions.push({
        id: `ded-dl-${dl.dueItemRef}`,
        category: "MISSED_DEADLINE",
        itemRef: dl.dueItemRef,
        title: `Missed Statutory Deadline (${dl.kind})`,
        reason: `Deadline ${dl.dueItemRef} missed by ${dl.daysOverdue} working days.`,
        pointsDeducted: weights.missedDeadlinePenalty,
        weightApplied: weights.missedDeadlinePenalty,
        aphClause: "APH 2024-27 Processing Calendar - TODO(APH-VERIFY)",
      });
    }

    const totalPointsDeducted = deductions.reduce(
      (sum, d) => sum + d.pointsDeducted,
      0,
    );
    const finalScore = Math.max(0, Math.min(100, 100 - totalPointsDeducted));
    const riskBand =
      finalScore >= 80
        ? "LOW_RISK"
        : finalScore >= 55
          ? "MODERATE_RISK"
          : "HIGH_RISK";

    return {
      institutionId: profile.institutionId,
      institutionName: profile.institutionName,
      region: profile.region,
      advisory: true,
      advisoryLabel: "ADVISORY",
      advisoryNotice:
        "ADVISORY ONLY: This weighted compliance health score is an explainable decision-support indicator. It never triggers autonomous approvals, rejections, or penalties.",
      baseScore: 100,
      finalScore,
      riskBand,
      totalPointsDeducted,
      weightsUsed: weights,
      deductionBreakdown: deductions,
      computedAt: this.clock.isoString(),
    };
  }

  /* ========================================================================
   * 4. RULE-CHANGE IMPACT SIMULATOR (BUILT LAST, READ-ONLY COMPARISON)
   * ======================================================================== */

  getLiveSimulatorBaseline() {
    return {
      activeStageTimelines: { ...this.activeStageTimelines },
      activeEscalationDelays: { ...this.activeEscalationDelays },
      openCasesCount: this.liveOpenCases.length,
      openCasesSnapshot: JSON.parse(
        JSON.stringify(this.liveOpenCases),
      ) as OpenCaseSnapshot[],
      publishedVersions: [...this.publishedPolicyVersions],
    };
  }

  /**
   * Pure read-only simulation of draft timeline and escalation delay changes
   * against open cases. Never mutates `this.liveOpenCases`, `this.activeStageTimelines`,
   * due items, or audit logs.
   */
  simulateRuleChangeImpact(draft: DraftSimulationConfig) {
    // Deep-clone open cases to guarantee zero mutation of live state
    const casesCopy: OpenCaseSnapshot[] = JSON.parse(
      JSON.stringify(this.liveOpenCases),
    );

    const draftTimelines = {
      ...this.activeStageTimelines,
      ...(draft.stageTimelinesWorkingDays ?? {}),
    };
    const draftDelays = {
      ...this.activeEscalationDelays,
      ...(draft.escalationDelaysWorkingDays ?? {}),
    };

    const countEscalations = (
      overdueDays: number,
      delays: {
        level1DelayDays: number;
        level2DelayDays: number;
        level3DelayDays: number;
      },
    ) => {
      if (overdueDays <= 0) return 0;
      let count = 1; // Level 0 breach alert
      if (overdueDays >= delays.level1DelayDays) count++;
      if (overdueDays >= delays.level2DelayDays) count++;
      if (overdueDays >= delays.level3DelayDays) count++;
      return count;
    };

    let activeBreachCount = 0;
    let draftBreachCount = 0;
    let activeNotificationsTotal = 0;
    let draftNotificationsTotal = 0;

    const newlyBreachedCases: Array<{
      caseId: string;
      applicationRef: string;
      institutionName: string;
      region: string;
      stage: string;
      elapsedWorkingDays: number;
      activeTargetDays: number;
      draftTargetDays: number;
    }> = [];

    const regionMap = new Map<
      string,
      {
        region: string;
        activeBreaches: number;
        draftBreaches: number;
        newlyBreached: number;
      }
    >();
    const stageMap = new Map<
      string,
      {
        stage: string;
        activeTargetDays: number;
        draftTargetDays: number;
        activeBreaches: number;
        draftBreaches: number;
        newlyBreached: number;
      }
    >();
    const officerWorkloadMap = new Map<
      string,
      {
        officerId: string;
        officerName: string;
        region: string;
        activeOverdueCount: number;
        draftOverdueCount: number;
        workloadDelta: number;
      }
    >();

    for (const c of casesCopy) {
      const activeTarget = this.activeStageTimelines[c.stage] ?? 15;
      const draftTarget = draftTimelines[c.stage] ?? activeTarget;

      const activeOverdueDays = Math.max(0, c.elapsedWorkingDays - activeTarget);
      const draftOverdueDays = Math.max(0, c.elapsedWorkingDays - draftTarget);

      const isActiveBreach = activeOverdueDays > 0;
      const isDraftBreach = draftOverdueDays > 0;

      if (isActiveBreach) activeBreachCount++;
      if (isDraftBreach) draftBreachCount++;

      activeNotificationsTotal += countEscalations(
        activeOverdueDays,
        this.activeEscalationDelays,
      );
      draftNotificationsTotal += countEscalations(draftOverdueDays, draftDelays);

      if (!isActiveBreach && isDraftBreach) {
        newlyBreachedCases.push({
          caseId: c.caseId,
          applicationRef: c.applicationRef,
          institutionName: c.institutionName,
          region: c.region,
          stage: c.stage,
          elapsedWorkingDays: c.elapsedWorkingDays,
          activeTargetDays: activeTarget,
          draftTargetDays: draftTarget,
        });
      }

      const regEntry = regionMap.get(c.region) ?? {
        region: c.region,
        activeBreaches: 0,
        draftBreaches: 0,
        newlyBreached: 0,
      };
      if (isActiveBreach) regEntry.activeBreaches++;
      if (isDraftBreach) regEntry.draftBreaches++;
      if (!isActiveBreach && isDraftBreach) regEntry.newlyBreached++;
      regionMap.set(c.region, regEntry);

      const stEntry = stageMap.get(c.stage) ?? {
        stage: c.stage,
        activeTargetDays: activeTarget,
        draftTargetDays: draftTarget,
        activeBreaches: 0,
        draftBreaches: 0,
        newlyBreached: 0,
      };
      if (isActiveBreach) stEntry.activeBreaches++;
      if (isDraftBreach) stEntry.draftBreaches++;
      if (!isActiveBreach && isDraftBreach) stEntry.newlyBreached++;
      stageMap.set(c.stage, stEntry);

      const offEntry = officerWorkloadMap.get(c.assignedOfficerId) ?? {
        officerId: c.assignedOfficerId,
        officerName: c.assignedOfficerName,
        region: c.region,
        activeOverdueCount: 0,
        draftOverdueCount: 0,
        workloadDelta: 0,
      };
      if (isActiveBreach) offEntry.activeOverdueCount++;
      if (isDraftBreach) offEntry.draftOverdueCount++;
      offEntry.workloadDelta =
        offEntry.draftOverdueCount - offEntry.activeOverdueCount;
      officerWorkloadMap.set(c.assignedOfficerId, offEntry);
    }

    return {
      readOnlyComparison: true as const,
      liveDataMutated: false as const,
      advisory: true as const,
      simulatedAt: this.clock.isoString(),
      totalOpenCasesEvaluated: casesCopy.length,
      activeBreachCount,
      draftBreachCount,
      newlyBreachedCount: newlyBreachedCases.length,
      newlyBreachedCases,
      extraNotificationsCount:
        draftNotificationsTotal - activeNotificationsTotal,
      activeNotificationsTotal,
      draftNotificationsTotal,
      affectedByRegion: Array.from(regionMap.values()).sort(
        (a, b) => b.newlyBreached - a.newlyBreached,
      ),
      affectedByStage: Array.from(stageMap.values()).sort(
        (a, b) => b.newlyBreached - a.newlyBreached,
      ),
      workloadDeltaByOfficer: Array.from(officerWorkloadMap.values()).sort(
        (a, b) => b.workloadDelta - a.workloadDelta,
      ),
    };
  }

  async publishDraftVersion(input: {
    versionName: string;
    reason: string;
    draftConfig: DraftSimulationConfig;
    actorId?: string;
  }) {
    if (!input.reason || input.reason.trim().length < 5) {
      throw new BadRequestException(
        "Publishing a new pipeline or escalation policy version requires a statutory reason (minimum 5 characters).",
      );
    }

    const actorId = input.actorId ?? "admin-policy-publisher";
    const publishedAt = this.clock.isoString();
    const versionRecord = {
      versionId: `ver-${this.publishedPolicyVersions.length + 2}.0`,
      versionName: input.versionName || "APH 2024-27 Draft Amendment",
      reason: input.reason.trim(),
      publishedBy: actorId,
      publishedAt,
      config: JSON.parse(
        JSON.stringify(input.draftConfig),
      ) as DraftSimulationConfig,
    };

    this.publishedPolicyVersions.push(versionRecord);

    const auditEntry = await this.auditService.appendEntry({
      entityType: "PIPELINE_POLICY_VERSION",
      entityId: SIMULATOR_POLICY_ENTITY_ID,
      action: "PIPELINE_POLICY_VERSION_PUBLISHED",
      actorId,
      actorRole: UserRole.ADMIN,
      previousState: {
        stageTimelines: this.activeStageTimelines,
        escalationDelays: this.activeEscalationDelays,
      },
      newState: {
        versionId: versionRecord.versionId,
        versionName: versionRecord.versionName,
        draftConfig: versionRecord.config,
      },
      rationale: versionRecord.reason,
    });

    return {
      publishedVersion: versionRecord,
      auditEntry,
    };
  }
}
