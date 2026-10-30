/**
 * Phase 9: Dashboards & Analytics Client (`apps/web`)
 * Deterministic 500-application analytics engine with strict Role/Region scope enforcement,
 * configurable working-day ageing buckets, and chart drill-down filtering.
 */

import type { StatutoryRole } from "./app-context";

export interface DashboardCaseItem {
  id: string;
  applicationRef: string;
  institutionId: string;
  institutionName: string;
  region: "WRO" | "NRO" | "SRO" | "ERO" | "NWRO" | "CRO";
  stage:
    | "SUBMITTED"
    | "SCRUTINY"
    | "DEFICIENCY_RECTIFICATION"
    | "EVC"
    | "SAC_SHC"
    | "BUREAU_REVIEW"
    | "APPROVED";
  pipeline: "ONLY_SCRUTINY" | "SCRUTINY_EVC";
  assignedOfficerId: string;
  assignedOfficerName: string;
  ageingWorkingDays: number;
  targetWorkingDays: number;
  slaState: "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "PAUSED";
  evcStatus:
    | "NONE"
    | "QUEUED"
    | "PANEL_PROPOSED"
    | "SCHEDULED"
    | "VISIT_DONE"
    | "REPORT_SUBMITTED"
    | "REPORT_ACCEPTED"
    | "DEFERRED";
  undertakingStatus:
    | "NONE"
    | "PENDING"
    | "SUBMITTED"
    | "VERIFIED"
    | "REJECTED"
    | "OVERDUE"
    | "WAIVED_BY_AUTHORITY";
  documentExpiryDays: number;
  submittedDate: string;
}

export interface DashboardUrlFilters {
  region?: string;
  stage?: string;
  slaState?: string;
  ageingBucket?: string;
  officer?: string;
  pipeline?: string;
  institution?: string;
}

const REGIONS: DashboardCaseItem["region"][] = [
  "WRO",
  "NRO",
  "SRO",
  "ERO",
  "NWRO",
  "CRO",
];
const STAGES: DashboardCaseItem["stage"][] = [
  "SUBMITTED",
  "SCRUTINY",
  "DEFICIENCY_RECTIFICATION",
  "EVC",
  "SAC_SHC",
  "BUREAU_REVIEW",
  "APPROVED",
];
const STAGE_TARGETS: Record<DashboardCaseItem["stage"], number> = {
  SUBMITTED: 3,
  SCRUTINY: 15,
  DEFICIENCY_RECTIFICATION: 10,
  EVC: 12,
  SAC_SHC: 10,
  BUREAU_REVIEW: 7,
  APPROVED: 5,
};

const OFFICERS_BY_REGION: Record<
  string,
  Array<{ id: string; name: string }>
> = {
  WRO: [
    { id: "off-wro-1", name: "Dr. Suresh Patil (RO WRO)" },
    { id: "off-wro-2", name: "Prof. Vikram Rao (Scrutiny WRO)" },
  ],
  NRO: [
    { id: "off-nro-1", name: "Dr. Rajesh Sharma (RO NRO)" },
    { id: "off-nro-2", name: "Prof. Kavita Verma (Scrutiny NRO)" },
  ],
  SRO: [
    { id: "off-sro-1", name: "Dr. S. Venkatesh (RO SRO)" },
    { id: "off-sro-2", name: "Prof. Meenakshi Iyer (Scrutiny SRO)" },
  ],
  ERO: [
    { id: "off-ero-1", name: "Dr. Subir Chatterjee (RO ERO)" },
    { id: "off-ero-2", name: "Prof. Ananya Sen (Scrutiny ERO)" },
  ],
  NWRO: [
    { id: "off-nwro-1", name: "Dr. Harpreet Singh (RO NWRO)" },
    { id: "off-nwro-2", name: "Prof. Deepak Gill (Scrutiny NWRO)" },
  ],
  CRO: [
    { id: "off-cro-1", name: "Dr. Mahendra Tiwari (RO CRO)" },
    { id: "off-cro-2", name: "Prof. Pooja Joshi (Scrutiny CRO)" },
  ],
};

const INSTITUTION_NAMES = [
  "Walchand College of Engineering, Sangli",
  "COEP Technological University, Pune",
  "VJTI Matunga, Mumbai",
  "Harcourt Butler Technical University, Kanpur",
  "PSG College of Technology, Coimbatore",
  "Jadavpur University Faculty of Engg, Kolkata",
  "PEC University of Technology, Chandigarh",
  "SGSITS Indore, Madhya Pradesh",
  "RV College of Engineering, Bengaluru",
  "LD College of Engineering, Ahmedabad",
];

export function classifyWorkingDayAgeing(days: number): string {
  if (days <= 7) return "0-7";
  if (days <= 15) return "8-15";
  if (days <= 30) return "16-30";
  if (days <= 60) return "31-60";
  return "60+";
}

function buildSeeded500Cases(): DashboardCaseItem[] {
  const rows: DashboardCaseItem[] = [];
  const slaChoices: DashboardCaseItem["slaState"][] = [
    "ON_TRACK",
    "ON_TRACK",
    "DUE_SOON",
    "OVERDUE",
    "PAUSED",
  ];
  const evcChoices: DashboardCaseItem["evcStatus"][] = [
    "QUEUED",
    "PANEL_PROPOSED",
    "SCHEDULED",
    "VISIT_DONE",
    "REPORT_SUBMITTED",
    "REPORT_ACCEPTED",
    "DEFERRED",
  ];
  const undChoices: DashboardCaseItem["undertakingStatus"][] = [
    "PENDING",
    "SUBMITTED",
    "VERIFIED",
    "REJECTED",
    "OVERDUE",
    "WAIVED_BY_AUTHORITY",
  ];

  for (let i = 0; i < 500; i++) {
    const region = REGIONS[i % REGIONS.length];
    const instIdx = i % 40;
    const institutionId = `inst-${(instIdx + 1).toString().padStart(3, "0")}`;
    const institutionName = `${INSTITUTION_NAMES[instIdx % INSTITUTION_NAMES.length]} (#${instIdx + 1})`;
    const stage = STAGES[i % STAGES.length];
    const pipeline: DashboardCaseItem["pipeline"] =
      i % 2 === 0 ? "SCRUTINY_EVC" : "ONLY_SCRUTINY";
    const officers = OFFICERS_BY_REGION[region];
    const officer = officers[Math.floor(i / REGIONS.length) % officers.length];
    const ageingWorkingDays = (i * 7 + 3) % 78;
    const targetWorkingDays = STAGE_TARGETS[stage];
    const slaState =
      stage === "DEFICIENCY_RECTIFICATION"
        ? "PAUSED"
        : ageingWorkingDays > targetWorkingDays + 5
          ? "OVERDUE"
          : ageingWorkingDays >= targetWorkingDays - 2
            ? "DUE_SOON"
            : slaChoices[i % slaChoices.length];

    rows.push({
      id: `case-${(i + 1).toString().padStart(4, "0")}`,
      applicationRef: `APP-2026-${region}-${(i + 1).toString().padStart(4, "0")}`,
      institutionId,
      institutionName,
      region,
      stage,
      pipeline,
      assignedOfficerId: officer.id,
      assignedOfficerName: officer.name,
      ageingWorkingDays,
      targetWorkingDays,
      slaState,
      evcStatus:
        pipeline === "SCRUTINY_EVC"
          ? evcChoices[i % evcChoices.length]
          : "NONE",
      undertakingStatus:
        i % 3 === 0 ? undChoices[i % undChoices.length] : "NONE",
      documentExpiryDays: ((i * 13) % 130) - 15,
      submittedDate: `2026-04-${((i % 28) + 1).toString().padStart(2, "0")}`,
    });
  }
  return rows;
}

const ALL_SEEDED_500_CASES = buildSeeded500Cases();

/**
 * Computes role-scoped and URL-filtered analytics aggregates & drill-down cases.
 */
export function computeDashboardAnalytics(
  role: StatutoryRole,
  actorRegion: string = "WRO",
  actorInstitutionId: string = "inst-001",
  filters: DashboardUrlFilters = {},
) {
  // Enforce statutory role & region scope first
  const scopedCases = ALL_SEEDED_500_CASES.filter((c) => {
    if (role === "REGIONAL_OFFICER" && c.region !== actorRegion) return false;
    if (role === "INSTITUTION" && c.institutionId !== actorInstitutionId)
      return false;
    return true;
  });

  // Apply interactive drill-down / URL filters
  const filteredCases = scopedCases.filter((c) => {
    if (filters.region && filters.region !== "ALL" && c.region !== filters.region)
      return false;
    if (filters.stage && filters.stage !== "ALL" && c.stage !== filters.stage)
      return false;
    if (
      filters.slaState &&
      filters.slaState !== "ALL" &&
      c.slaState !== filters.slaState
    )
      return false;
    if (
      filters.ageingBucket &&
      filters.ageingBucket !== "ALL" &&
      classifyWorkingDayAgeing(c.ageingWorkingDays) !== filters.ageingBucket
    )
      return false;
    if (
      filters.officer &&
      filters.officer !== "ALL" &&
      c.assignedOfficerId !== filters.officer
    )
      return false;
    if (
      filters.pipeline &&
      filters.pipeline !== "ALL" &&
      c.pipeline !== filters.pipeline
    )
      return false;
    if (
      filters.institution &&
      filters.institution !== "ALL" &&
      c.institutionId !== filters.institution
    )
      return false;
    return true;
  });

  // 1. Stage Funnel counts
  const byStage = STAGES.map((st) => ({
    key: st,
    labelEn: st.replace(/_/g, " "),
    labelHi:
      st === "SUBMITTED"
        ? "प्रस्तुत (Submitted)"
        : st === "SCRUTINY"
          ? "जांच (Scrutiny)"
          : st === "DEFICIENCY_RECTIFICATION"
            ? "कमी सुधार (Deficiency)"
            : st === "EVC"
              ? "ईवीसी निरीक्षण (EVC)"
              : st === "SAC_SHC"
                ? "अपील समिति (SAC/SHC)"
                : st === "BUREAU_REVIEW"
                  ? "ब्यूरो समीक्षा (Bureau)"
                  : "स्वीकृत (Approved)",
    value: filteredCases.filter((c) => c.stage === st).length,
  }));

  // 2. Region Comparison counts
  const byRegion = REGIONS.map((reg) => ({
    key: reg,
    labelEn: `${reg} Region`,
    labelHi: `${reg} क्षेत्र`,
    value: filteredCases.filter((c) => c.region === reg).length,
    overdueCount: filteredCases.filter(
      (c) => c.region === reg && c.slaState === "OVERDUE",
    ).length,
  }));

  // 3. Working-Day Ageing Buckets (0-7, 8-15, 16-30, 31-60, 60+)
  const bucketKeys = ["0-7", "8-15", "16-30", "31-60", "60+"];
  const ageingBuckets = bucketKeys.map((bk) => ({
    key: bk,
    labelEn: `${bk} Working Days`,
    labelHi: `${bk} कार्य दिवस`,
    value: filteredCases.filter(
      (c) => classifyWorkingDayAgeing(c.ageingWorkingDays) === bk,
    ).length,
  }));

  // 4. SLA State Counts
  const slaCounts = {
    ON_TRACK: filteredCases.filter((c) => c.slaState === "ON_TRACK").length,
    DUE_SOON: filteredCases.filter((c) => c.slaState === "DUE_SOON").length,
    OVERDUE: filteredCases.filter((c) => c.slaState === "OVERDUE").length,
    PAUSED: filteredCases.filter((c) => c.slaState === "PAUSED").length,
  };

  // 5. Officer Workload
  const officerMap = new Map<
    string,
    {
      officerId: string;
      officerName: string;
      region: string;
      activeCount: number;
      overdueCount: number;
    }
  >();
  for (const c of filteredCases) {
    if (c.stage === "APPROVED") continue;
    const item = officerMap.get(c.assignedOfficerId) ?? {
      officerId: c.assignedOfficerId,
      officerName: c.assignedOfficerName,
      region: c.region,
      activeCount: 0,
      overdueCount: 0,
    };
    item.activeCount++;
    if (c.slaState === "OVERDUE") item.overdueCount++;
    officerMap.set(c.assignedOfficerId, item);
  }
  const officerWorkload = Array.from(officerMap.values()).sort(
    (a, b) => b.activeCount - a.activeCount,
  );

  // 6. Stage Bottlenecks (Average time in stage vs statutory target)
  const bottleneckStages = STAGES.map((st) => {
    const inStage = filteredCases.filter((c) => c.stage === st);
    const avg =
      inStage.length > 0
        ? Math.round(
            (inStage.reduce((acc, c) => acc + c.ageingWorkingDays, 0) /
              inStage.length) *
              10,
          ) / 10
        : 0;
    return {
      stage: st,
      targetDays: STAGE_TARGETS[st],
      avgDays: avg,
      caseCount: inStage.length,
    };
  });

  // 7. Overdue & Due-Soon Lists
  const overdueList = filteredCases
    .filter((c) => c.slaState === "OVERDUE")
    .sort((a, b) => b.ageingWorkingDays - a.ageingWorkingDays)
    .slice(0, 15);
  const dueSoonList = filteredCases
    .filter((c) => c.slaState === "DUE_SOON")
    .sort((a, b) => b.ageingWorkingDays - a.ageingWorkingDays)
    .slice(0, 15);

  return {
    totalScopedCount: scopedCases.length,
    totalFilteredCount: filteredCases.length,
    byStage,
    byRegion,
    ageingBuckets,
    slaCounts,
    officerWorkload,
    bottleneckStages,
    overdueList,
    dueSoonList,
    drilldownCases: filteredCases.slice(0, 30),
  };
}
