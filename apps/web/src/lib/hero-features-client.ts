/**
 * Phase 10: Hero Features Client & Deterministic Store (`apps/web`)
 * 1. Time-Travel Console & JSON Scenario Runner (syncs persistent Demo Clock banner on all pages)
 * 2. Tamper Demo (Tamper one row, Verify SHA-256 chain pinpointing broken link, Repair state)
 * 3. Compliance Health Score (Transparent weighted rule-based score per institution, ADVISORY)
 * 4. Rule-Change Impact Simulator (Built last: read-only replay of open cases vs draft config, never mutates live data)
 */

import { syncDemoClockBannerInStore } from "./notifications-client";
import { addDaysToIsoString } from "./clock";

export interface HeroLiveAlertItem {
  id: string;
  firedAt: string;
  applicationId: string;
  kind: string;
  escalationLevel: 0 | 1 | 2 | 3;
  recipientRole: string;
  summaryEn: string;
  summaryHi: string;
}

export interface ScenarioStepItem {
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

export const HERO_SCENARIO_STEPS: ScenarioStepItem[] = [
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

export interface TamperDemoAuditRow {
  id: string;
  index: number;
  entityId: string;
  action: string;
  actorId: string;
  actorRole: string;
  rationale: string;
  timestamp: string;
  prevHash: string;
  hash: string;
  expectedHash: string;
}

export interface BrokenLinkVerification {
  valid: boolean;
  verifiedAt: string;
  totalEntries: number;
  firstBrokenLink: {
    index: number;
    entryId: string;
    action: string;
    failureType: "ROW_HASH_MISMATCH" | "PREV_HASH_MISMATCH";
    expectedHash: string;
    actualHash: string;
    description: string;
  } | null;
}

export interface ComplianceWeightsConfig {
  overdueUndertakingPenalty: number;
  expiredDocumentPenalty: number;
  expiringSoonDocumentPenalty: number;
  slowReturnResponsePenaltyPerDay: number;
  missedDeadlinePenalty: number;
}

export interface ComplianceDeductionBreakdownItem {
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

export interface InstitutionComplianceProfileData {
  institutionId: string;
  institutionName: string;
  region: string;
  overdueUndertakings: Array<{
    ref: string;
    title: string;
    daysOverdue: number;
  }>;
  expiredDocuments: Array<{
    ref: string;
    docType: string;
    daysExpired: number;
  }>;
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

export interface SimulatorDraftConfig {
  stageTimelinesWorkingDays: Record<string, number>;
  escalationDelaysWorkingDays: {
    level1DelayDays: number;
    level2DelayDays: number;
    level3DelayDays: number;
  };
}

export interface SimulatorOpenCase {
  caseId: string;
  applicationRef: string;
  institutionName: string;
  region: string;
  stage: string;
  assignedOfficerId: string;
  assignedOfficerName: string;
  elapsedWorkingDays: number;
}

const CLEAN_TAMPER_ROWS: TamperDemoAuditRow[] = [
  {
    id: "audit-row-001",
    index: 0,
    entityId: "APP-2026-TAMPER-DEMO",
    action: "APPLICATION_SUBMITTED",
    actorId: "inst-walchand-001",
    actorRole: "INSTITUTION",
    rationale:
      "Initial application dossier submitted with 7 mandatory annexures",
    timestamp: "2026-04-10T09:00:00.000Z",
    prevHash: "GENESIS",
    hash: "8f3c91a4d2b7e6051c4829a0f1e3b5d7c9a2e4f60183a5c7d9e1f3a5b7c9d1e3",
    expectedHash:
      "8f3c91a4d2b7e6051c4829a0f1e3b5d7c9a2e4f60183a5c7d9e1f3a5b7c9d1e3",
  },
  {
    id: "audit-row-002",
    index: 1,
    entityId: "APP-2026-TAMPER-DEMO",
    action: "SCRUTINY_VERIFIED",
    actorId: "scrutiny-officer-wro-1",
    actorRole: "COMMITTEE_MEMBER",
    rationale:
      "All faculty norms and lab area requirements verified by Scrutiny Committee",
    timestamp: "2026-04-18T11:30:00.000Z",
    prevHash:
      "8f3c91a4d2b7e6051c4829a0f1e3b5d7c9a2e4f60183a5c7d9e1f3a5b7c9d1e3",
    hash: "4b7e20c1a9f8d3e65210c4a8b9d2e7f1c3a5b8d0e2f4a6c8e0b2d4f6a8c0e2f4",
    expectedHash:
      "4b7e20c1a9f8d3e65210c4a8b9d2e7f1c3a5b8d0e2f4a6c8e0b2d4f6a8c0e2f4",
  },
  {
    id: "audit-row-003",
    index: 2,
    entityId: "APP-2026-TAMPER-DEMO",
    action: "EVC_REPORT_SUBMITTED",
    actorId: "evc-chair-009",
    actorRole: "COMMITTEE_MEMBER",
    rationale: "Expert Visit Committee physical verification completed",
    timestamp: "2026-04-26T16:15:00.000Z",
    prevHash:
      "4b7e20c1a9f8d3e65210c4a8b9d2e7f1c3a5b8d0e2f4a6c8e0b2d4f6a8c0e2f4",
    hash: "9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1f",
    expectedHash:
      "9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1f",
  },
];

export const INSTITUTION_COMPLIANCE_PROFILES: Record<
  string,
  InstitutionComplianceProfileData
> = {
  "inst-001": {
    institutionId: "inst-001",
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
  },
  "inst-002": {
    institutionId: "inst-002",
    institutionName: "COEP Technological University, Pune",
    region: "WRO",
    overdueUndertakings: [],
    expiredDocuments: [],
    expiringSoonDocuments: [
      {
        ref: "FDR-CORPUS-2026-11",
        docType: "CORPUS_FDR",
        daysRemaining: 25,
      },
    ],
    returnResponses: [
      {
        applicationRef: "APP-2026-WRO-00019",
        responseWorkingDays: 4,
        targetWorkingDays: 5,
      },
    ],
    missedDeadlines: [],
  },
  "inst-clean": {
    institutionId: "inst-clean",
    institutionName: "VJTI Matunga, Mumbai",
    region: "WRO",
    overdueUndertakings: [],
    expiredDocuments: [],
    expiringSoonDocuments: [],
    returnResponses: [
      {
        applicationRef: "APP-2026-WRO-00003",
        responseWorkingDays: 2,
        targetWorkingDays: 5,
      },
    ],
    missedDeadlines: [],
  },
};

function buildSimulatorOpenCases(): SimulatorOpenCase[] {
  const regions = ["WRO", "NRO", "SRO", "ERO", "NWRO", "CRO"];
  const stages = [
    "SUBMITTED",
    "SCRUTINY",
    "DEFICIENCY_RECTIFICATION",
    "EVC",
    "SAC_SHC",
    "BUREAU_REVIEW",
  ];
  const rows: SimulatorOpenCase[] = [];
  for (let i = 0; i < 60; i++) {
    const region = regions[i % regions.length];
    const stage = stages[i % stages.length];
    const elapsedWorkingDays = (i * 3 + 4) % 24;
    rows.push({
      caseId: `sim-case-${(i + 1).toString().padStart(3, "0")}`,
      applicationRef: `APP-2026-${region}-${(i + 101).toString().padStart(4, "0")}`,
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

interface HeroFeaturesStoreState {
  realBaseDateIso: string;
  demoDateIso: string;
  offsetDays: number;
  isDemoClockDifferent: boolean;
  scenarioCursor: number;
  liveFeed: HeroLiveAlertItem[];
  tamperRows: TamperDemoAuditRow[];
  isTampered: boolean;
  lastVerification: BrokenLinkVerification;
  complianceWeights: ComplianceWeightsConfig;
  activeStageTimelines: Record<string, number>;
  activeEscalationDelays: {
    level1DelayDays: number;
    level2DelayDays: number;
    level3DelayDays: number;
  };
  openCases: SimulatorOpenCase[];
  publishedVersions: Array<{
    versionId: string;
    versionName: string;
    reason: string;
    publishedAt: string;
  }>;
}

function addDaysToIso(baseIso: string, days: number): string {
  return addDaysToIsoString(baseIso, days);
}

const INITIAL_BASE_ISO = "2026-05-01T09:00:00.000Z";

const heroStore: HeroFeaturesStoreState = {
  realBaseDateIso: INITIAL_BASE_ISO,
  demoDateIso: "2026-05-15T09:00:00.000Z",
  offsetDays: 14,
  isDemoClockDifferent: true,
  scenarioCursor: -1,
  liveFeed: [
    {
      id: "init-feed-1",
      firedAt: "2026-05-15T09:00:00.000Z",
      applicationId: "APP-2026-WRO-00104",
      kind: "PROCESSING_STAGE",
      escalationLevel: 1,
      recipientRole: "REGIONAL_OFFICER",
      summaryEn:
        "[ESCALATION_L1] Scrutiny Stage SLA overdue by +2d -> Dispatched to Regional Officer (WRO)",
      summaryHi:
        "[ESCALATION_L1] जांच चरण एसएलए +2 दिन अतिदेय -> क्षेत्रीय अधिकारी (WRO) को भेजा गया",
    },
  ],
  tamperRows: JSON.parse(JSON.stringify(CLEAN_TAMPER_ROWS)),
  isTampered: false,
  lastVerification: {
    valid: true,
    verifiedAt: INITIAL_BASE_ISO,
    totalEntries: 3,
    firstBrokenLink: null,
  },
  complianceWeights: {
    overdueUndertakingPenalty: 15,
    expiredDocumentPenalty: 20,
    expiringSoonDocumentPenalty: 8,
    slowReturnResponsePenaltyPerDay: 3,
    missedDeadlinePenalty: 10,
  },
  activeStageTimelines: {
    SUBMITTED: 3,
    SCRUTINY: 15,
    DEFICIENCY_RECTIFICATION: 10,
    EVC: 12,
    SAC_SHC: 10,
    BUREAU_REVIEW: 7,
  },
  activeEscalationDelays: {
    level1DelayDays: 1,
    level2DelayDays: 3,
    level3DelayDays: 7,
  },
  openCases: buildSimulatorOpenCases(),
  publishedVersions: [
    {
      versionId: "ver-1.0",
      versionName: "APH 2024-27 Baseline Statutory Pipeline",
      reason: "Initial statutory cycle activation",
      publishedAt: "2026-04-01T00:00:00.000Z",
    },
  ],
};

const listeners = new Set<() => void>();

function emitHeroChange() {
  for (const fn of listeners) {
    fn();
  }
}

export function subscribeHeroFeaturesStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getHeroFeaturesSnapshot(): HeroFeaturesStoreState {
  return heroStore;
}

/* ========================================================================
 * 1. TIME-TRAVEL CONSOLE & JSON SCENARIO RUNNER
 * ======================================================================== */

export function jumpDemoClockInStore(params: {
  days?: number;
  targetDateStr?: string;
  customSummaryEn?: string;
  customSummaryHi?: string;
  escalationLevel?: 0 | 1 | 2 | 3;
  kind?: string;
}) {
  let nextOffset = heroStore.offsetDays;
  if (params.targetDateStr) {
    const targetMs = Date.parse(`${params.targetDateStr}T09:00:00.000Z`);
    const baseMs = Date.parse(heroStore.realBaseDateIso);
    if (!Number.isNaN(targetMs)) {
      nextOffset = Math.round((targetMs - baseMs) / (24 * 60 * 60 * 1000));
    }
  } else {
    nextOffset += params.days ?? 0;
  }

  heroStore.offsetDays = nextOffset;
  heroStore.demoDateIso = addDaysToIso(heroStore.realBaseDateIso, nextOffset);
  heroStore.isDemoClockDifferent = nextOffset !== 0;

  const dateLabel = heroStore.demoDateIso.slice(0, 10);
  const sign = nextOffset >= 0 ? `+${nextOffset}d` : `${nextOffset}d`;

  syncDemoClockBannerInStore({
    isActive: heroStore.isDemoClockDifferent,
    offsetDays: nextOffset,
    simulatedDateIso: heroStore.demoDateIso,
    bannerTextEn: `DEMO CLOCK ACTIVE (${sign} offset • ${dateLabel}) — Sweep & Notification Workers Active`,
    bannerTextHi: `डेमो घड़ी सक्रिय (${sign} ऑफ़सेट • ${dateLabel}) — स्वीप और नोटिफिकेशन वर्कर सक्रिय`,
  });

  const level: 0 | 1 | 2 | 3 =
    params.escalationLevel ??
    (nextOffset >= 30 ? 3 : nextOffset >= 15 ? 2 : nextOffset >= 7 ? 1 : 0);
  const roleMap: Record<number, string> = {
    0: "INSTITUTION & SCRUTINY_OFFICER",
    1: "REGIONAL_OFFICER",
    2: "BUREAU_OFFICER",
    3: "ADMIN (Designated Head)",
  };

  const alertItem: HeroLiveAlertItem = {
    id: `tt-alert-${heroStore.liveFeed.length + 1}-${nextOffset}`,
    firedAt: heroStore.demoDateIso,
    applicationId: "APP-2026-WRO-HERO-01",
    kind: params.kind ?? "PROCESSING_STAGE",
    escalationLevel: level,
    recipientRole: roleMap[level],
    summaryEn:
      params.customSummaryEn ??
      `Clock jumped to ${dateLabel} (${sign}): Sweep & Outbox Worker fired L${level} alert to ${roleMap[level]}`,
    summaryHi:
      params.customSummaryHi ??
      `घड़ी ${dateLabel} (${sign}) पर पहुंची: स्वीप और आउटबॉक्स वर्कर ने L${level} अलर्ट भेजा`,
  };

  heroStore.liveFeed = [alertItem, ...heroStore.liveFeed].slice(0, 25);
  emitHeroChange();
  return heroStore;
}

export function stepScenarioRunnerInStore() {
  const nextIdx =
    heroStore.scenarioCursor + 1 < HERO_SCENARIO_STEPS.length
      ? heroStore.scenarioCursor + 1
      : 0;
  heroStore.scenarioCursor = nextIdx;
  const step = HERO_SCENARIO_STEPS[nextIdx];

  const level: 0 | 1 | 2 | 3 =
    step.code === "LEASE_EXPIRY"
      ? 3
      : step.code === "UNDERTAKING_MISS"
        ? 2
        : step.code === "EVC_DELAY"
          ? 1
          : 0;

  const kind =
    step.code === "LEASE_EXPIRY"
      ? "DOCUMENT_EXPIRY"
      : step.code === "UNDERTAKING_MISS"
        ? "UNDERTAKING"
        : step.code === "EVC_DELAY"
          ? "EVC_SCHEDULING"
          : "PROCESSING_STAGE";

  return jumpDemoClockInStore({
    days: step.daysJump,
    escalationLevel: level,
    kind,
    customSummaryEn: `${step.titleEn} — ${step.descriptionEn}`,
    customSummaryHi: `${step.titleHi} — ${step.descriptionHi}`,
  });
}

export function resetDemoClockToRealTimeInStore() {
  heroStore.offsetDays = 0;
  heroStore.demoDateIso = heroStore.realBaseDateIso;
  heroStore.isDemoClockDifferent = false;
  heroStore.scenarioCursor = -1;

  syncDemoClockBannerInStore({
    isActive: false,
    offsetDays: 0,
    simulatedDateIso: heroStore.realBaseDateIso,
    bannerTextEn: "",
    bannerTextHi: "",
  });

  emitHeroChange();
  return heroStore;
}

/* ========================================================================
 * 2. TAMPER DEMO (DISABLED IN PRODUCTION BUILDS)
 * ======================================================================== */

export function tamperOneAuditRowInStore(
  rowIndex = 1,
  isProductionEnv = process.env.NODE_ENV === "production",
) {
  if (isProductionEnv) {
    throw new Error(
      "Tamper demo is disabled in production builds (NODE_ENV === 'production').",
    );
  }
  const target = heroStore.tamperRows[rowIndex];
  if (!target) return heroStore;

  target.rationale =
    "TAMPERED_ON_DISK: Unauthorised SQL modification bypassing scrutiny committee";
  // Recomputed hash of tampered row differs from stored hash
  target.expectedHash =
    "e09999deadbeef00112233445566778899aabbccddeeff001122334455667788";
  heroStore.isTampered = true;
  emitHeroChange();
  return heroStore;
}

export function verifyAuditChainInStore(): BrokenLinkVerification {
  for (let i = 0; i < heroStore.tamperRows.length; i++) {
    const r = heroStore.tamperRows[i];
    if (r.hash !== r.expectedHash) {
      heroStore.lastVerification = {
        valid: false,
        verifiedAt: heroStore.demoDateIso,
        totalEntries: heroStore.tamperRows.length,
        firstBrokenLink: {
          index: i,
          entryId: r.id,
          action: r.action,
          failureType: "ROW_HASH_MISMATCH",
          expectedHash: r.expectedHash,
          actualHash: r.hash,
          description: `Row payload tampering detected at index #${i} (${r.id} • ${r.action}): recomputed canonical SHA-256 does not match stored ledger hash.`,
        },
      };
      emitHeroChange();
      return heroStore.lastVerification;
    }
  }

  heroStore.lastVerification = {
    valid: true,
    verifiedAt: heroStore.demoDateIso,
    totalEntries: heroStore.tamperRows.length,
    firstBrokenLink: null,
  };
  emitHeroChange();
  return heroStore.lastVerification;
}

export function repairTamperDemoStateInStore() {
  heroStore.tamperRows = JSON.parse(JSON.stringify(CLEAN_TAMPER_ROWS));
  heroStore.isTampered = false;
  verifyAuditChainInStore();
  emitHeroChange();
  return heroStore;
}

/* ========================================================================
 * 3. COMPLIANCE HEALTH SCORE (WEIGHTED RULE-BASED, ADVISORY)
 * ======================================================================== */

export function updateComplianceWeightsInStore(
  next: Partial<ComplianceWeightsConfig>,
) {
  heroStore.complianceWeights = {
    ...heroStore.complianceWeights,
    ...next,
  };
  emitHeroChange();
  return heroStore.complianceWeights;
}

export function calculateComplianceHealthScore(
  institutionId: string,
  weightsOverride?: Partial<ComplianceWeightsConfig>,
) {
  const profile =
    INSTITUTION_COMPLIANCE_PROFILES[institutionId] ??
    INSTITUTION_COMPLIANCE_PROFILES["inst-001"];
  const weights: ComplianceWeightsConfig = {
    ...heroStore.complianceWeights,
    ...weightsOverride,
  };

  const breakdown: ComplianceDeductionBreakdownItem[] = [];

  for (const und of profile.overdueUndertakings) {
    breakdown.push({
      id: `ded-und-${und.ref}`,
      category: "OVERDUE_UNDERTAKING",
      itemRef: und.ref,
      title: `Overdue Undertaking: ${und.title}`,
      reason: `Overdue by ${und.daysOverdue} working days past statutory due_date.`,
      pointsDeducted: weights.overdueUndertakingPenalty,
      weightApplied: weights.overdueUndertakingPenalty,
      aphClause:
        "APH 2024-27 Conditional Approval Undertakings - TODO(APH-VERIFY)",
    });
  }

  for (const doc of profile.expiredDocuments) {
    breakdown.push({
      id: `ded-exp-${doc.ref}`,
      category: "EXPIRED_DOCUMENT",
      itemRef: doc.ref,
      title: `Expired Statutory Document (${doc.docType})`,
      reason: `Expired ${doc.daysExpired} days ago without verified renewal.`,
      pointsDeducted: weights.expiredDocumentPenalty,
      weightApplied: weights.expiredDocumentPenalty,
      aphClause: "APH 2024-27 Document Validity - TODO(APH-VERIFY)",
    });
  }

  for (const doc of profile.expiringSoonDocuments) {
    breakdown.push({
      id: `ded-soon-${doc.ref}`,
      category: "EXPIRING_DOCUMENT",
      itemRef: doc.ref,
      title: `Expiring Document Within 30 Days (${doc.docType})`,
      reason: `Expires in ${doc.daysRemaining} days.`,
      pointsDeducted: weights.expiringSoonDocumentPenalty,
      weightApplied: weights.expiringSoonDocumentPenalty,
      aphClause: "APH 2024-27 Lease Continuity - TODO(APH-VERIFY)",
    });
  }

  for (const ret of profile.returnResponses) {
    const excessDays = Math.max(
      0,
      ret.responseWorkingDays - ret.targetWorkingDays,
    );
    if (excessDays > 0) {
      const pts = excessDays * weights.slowReturnResponsePenaltyPerDay;
      breakdown.push({
        id: `ded-ret-${ret.applicationRef}`,
        category: "SLOW_RETURN_RESPONSE",
        itemRef: ret.applicationRef,
        title: `Slow Response to Scrutiny Return (${ret.applicationRef})`,
        reason: `Responded in ${ret.responseWorkingDays} working days vs ${ret.targetWorkingDays}d target (+${excessDays} excess days).`,
        pointsDeducted: pts,
        weightApplied: weights.slowReturnResponsePenaltyPerDay,
        aphClause: "APH 2024-27 Deficiency Window - TODO(APH-VERIFY)",
      });
    }
  }

  for (const dl of profile.missedDeadlines) {
    breakdown.push({
      id: `ded-dl-${dl.dueItemRef}`,
      category: "MISSED_DEADLINE",
      itemRef: dl.dueItemRef,
      title: `Missed Statutory Deadline (${dl.kind})`,
      reason: `Missed by ${dl.daysOverdue} working days.`,
      pointsDeducted: weights.missedDeadlinePenalty,
      weightApplied: weights.missedDeadlinePenalty,
      aphClause: "APH 2024-27 Processing Calendar - TODO(APH-VERIFY)",
    });
  }

  const totalPointsDeducted = breakdown.reduce(
    (acc, item) => acc + item.pointsDeducted,
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
    advisory: true as const,
    advisoryLabel: "ADVISORY" as const,
    baseScore: 100,
    finalScore,
    riskBand,
    totalPointsDeducted,
    weightsUsed: weights,
    deductionBreakdown: breakdown,
  };
}

/* ========================================================================
 * 4. RULE-CHANGE IMPACT SIMULATOR (BUILT LAST, READ-ONLY COMPARISON)
 * ======================================================================== */

export function simulateRuleChangeImpactInStore(draft: SimulatorDraftConfig) {
  // Deep copy open cases so live store data is never mutated
  const openCasesCopy: SimulatorOpenCase[] = JSON.parse(
    JSON.stringify(heroStore.openCases),
  );
  const activeTimelines = { ...heroStore.activeStageTimelines };
  const draftTimelines = {
    ...activeTimelines,
    ...draft.stageTimelinesWorkingDays,
  };
  const activeDelays = { ...heroStore.activeEscalationDelays };
  const draftDelays = {
    ...activeDelays,
    ...draft.escalationDelaysWorkingDays,
  };

  const calcNotifs = (
    overdueDays: number,
    delays: {
      level1DelayDays: number;
      level2DelayDays: number;
      level3DelayDays: number;
    },
  ) => {
    if (overdueDays <= 0) return 0;
    let c = 1;
    if (overdueDays >= delays.level1DelayDays) c++;
    if (overdueDays >= delays.level2DelayDays) c++;
    if (overdueDays >= delays.level3DelayDays) c++;
    return c;
  };

  let activeBreachCount = 0;
  let draftBreachCount = 0;
  let activeNotifications = 0;
  let draftNotifications = 0;

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

  const regionImpact = new Map<
    string,
    {
      region: string;
      activeBreaches: number;
      draftBreaches: number;
      newlyBreached: number;
    }
  >();
  const stageImpact = new Map<
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
  const officerDelta = new Map<
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

  for (const c of openCasesCopy) {
    const activeTarget = activeTimelines[c.stage] ?? 15;
    const draftTarget = draftTimelines[c.stage] ?? activeTarget;

    const activeOverdue = Math.max(0, c.elapsedWorkingDays - activeTarget);
    const draftOverdue = Math.max(0, c.elapsedWorkingDays - draftTarget);

    const isActiveBreach = activeOverdue > 0;
    const isDraftBreach = draftOverdue > 0;

    if (isActiveBreach) activeBreachCount++;
    if (isDraftBreach) draftBreachCount++;

    activeNotifications += calcNotifs(activeOverdue, activeDelays);
    draftNotifications += calcNotifs(draftOverdue, draftDelays);

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

    const rItem = regionImpact.get(c.region) ?? {
      region: c.region,
      activeBreaches: 0,
      draftBreaches: 0,
      newlyBreached: 0,
    };
    if (isActiveBreach) rItem.activeBreaches++;
    if (isDraftBreach) rItem.draftBreaches++;
    if (!isActiveBreach && isDraftBreach) rItem.newlyBreached++;
    regionImpact.set(c.region, rItem);

    const sItem = stageImpact.get(c.stage) ?? {
      stage: c.stage,
      activeTargetDays: activeTarget,
      draftTargetDays: draftTarget,
      activeBreaches: 0,
      draftBreaches: 0,
      newlyBreached: 0,
    };
    if (isActiveBreach) sItem.activeBreaches++;
    if (isDraftBreach) sItem.draftBreaches++;
    if (!isActiveBreach && isDraftBreach) sItem.newlyBreached++;
    stageImpact.set(c.stage, sItem);

    const oItem = officerDelta.get(c.assignedOfficerId) ?? {
      officerId: c.assignedOfficerId,
      officerName: c.assignedOfficerName,
      region: c.region,
      activeOverdueCount: 0,
      draftOverdueCount: 0,
      workloadDelta: 0,
    };
    if (isActiveBreach) oItem.activeOverdueCount++;
    if (isDraftBreach) oItem.draftOverdueCount++;
    oItem.workloadDelta = oItem.draftOverdueCount - oItem.activeOverdueCount;
    officerDelta.set(c.assignedOfficerId, oItem);
  }

  return {
    readOnlyComparison: true as const,
    liveDataMutated: false as const,
    advisory: true as const,
    totalOpenCasesEvaluated: openCasesCopy.length,
    activeBreachCount,
    draftBreachCount,
    newlyBreachedCount: newlyBreachedCases.length,
    newlyBreachedCases,
    extraNotificationsCount: draftNotifications - activeNotifications,
    affectedByRegion: Array.from(regionImpact.values()).sort(
      (a, b) => b.newlyBreached - a.newlyBreached,
    ),
    affectedByStage: Array.from(stageImpact.values()).sort(
      (a, b) => b.newlyBreached - a.newlyBreached,
    ),
    workloadDeltaByOfficer: Array.from(officerDelta.values()).sort(
      (a, b) => b.workloadDelta - a.workloadDelta,
    ),
  };
}

export function publishDraftVersionInStore(input: {
  versionName: string;
  reason: string;
}) {
  if (!input.reason || input.reason.trim().length < 5) {
    throw new Error(
      "A statutory reason (minimum 5 characters) is required to publish a new version.",
    );
  }
  const created = {
    versionId: `ver-${heroStore.publishedVersions.length + 1}.0`,
    versionName: input.versionName || "APH 2024-27 Draft Amendment",
    reason: input.reason.trim(),
    publishedAt: heroStore.demoDateIso,
  };
  heroStore.publishedVersions = [created, ...heroStore.publishedVersions];
  emitHeroChange();
  return created;
}
