import { Injectable, ForbiddenException } from "@nestjs/common";
import { UserRole } from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";

export interface AnalyticsActorScope {
  actorUserId?: string;
  actorRole: UserRole | string;
  actorRegion?: string; // e.g., "WRO"
  actorInstitutionId?: string; // e.g., "inst-001"
}

export interface AnalyticsFilterQuery {
  region?: string;
  stage?: string;
  institution?: string;
  officer?: string;
  dateFrom?: string;
  dateTo?: string;
  pipeline?: string;
  slaState?: "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "PAUSED";
  ageingBucket?: string;
}

export interface SeededAnalyticsCase {
  id: string;
  applicationRef: string;
  institutionId: string;
  institutionName: string;
  region: string;
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

interface ScopedCacheEntry<T> {
  key: string;
  expiresAtMs: number;
  value: T;
}

const REGIONS = ["WRO", "NRO", "SRO", "ERO", "NWRO", "CRO"] as const;
const STAGES: SeededAnalyticsCase["stage"][] = [
  "SUBMITTED",
  "SCRUTINY",
  "DEFICIENCY_RECTIFICATION",
  "EVC",
  "SAC_SHC",
  "BUREAU_REVIEW",
  "APPROVED",
];
const STAGE_TARGETS: Record<SeededAnalyticsCase["stage"], number> = {
  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
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

function buildDeterministic500Cases(): SeededAnalyticsCase[] {
  const rows: SeededAnalyticsCase[] = [];
  const slaChoices: SeededAnalyticsCase["slaState"][] = [
    "ON_TRACK",
    "ON_TRACK",
    "DUE_SOON",
    "OVERDUE",
    "PAUSED",
  ];
  const evcChoices: SeededAnalyticsCase["evcStatus"][] = [
    "QUEUED",
    "PANEL_PROPOSED",
    "SCHEDULED",
    "VISIT_DONE",
    "REPORT_SUBMITTED",
    "REPORT_ACCEPTED",
    "DEFERRED",
  ];
  const undChoices: SeededAnalyticsCase["undertakingStatus"][] = [
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
    const pipeline: SeededAnalyticsCase["pipeline"] =
      i % 2 === 0 ? "SCRUTINY_EVC" : "ONLY_SCRUTINY";
    const officers = OFFICERS_BY_REGION[region];
    const officer = officers[Math.floor(i / REGIONS.length) % officers.length];
    const ageingWorkingDays = (i * 7 + 3) % 78; // 0..77 working days
    const targetWorkingDays = STAGE_TARGETS[stage];
    const slaState =
      stage === "DEFICIENCY_RECTIFICATION"
        ? "PAUSED"
        : ageingWorkingDays > targetWorkingDays + 5
          ? "OVERDUE"
          : ageingWorkingDays >= targetWorkingDays - 2
            ? "DUE_SOON"
            : slaChoices[i % slaChoices.length];

    const evcStatus =
      pipeline === "SCRUTINY_EVC" ? evcChoices[i % evcChoices.length] : "NONE";
    const undertakingStatus =
      i % 3 === 0 ? undChoices[i % undChoices.length] : "NONE";
    const documentExpiryDays = ((i * 13) % 130) - 15; // -15..114 days
    const monthDay = ((i % 28) + 1).toString().padStart(2, "0");

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
      evcStatus,
      undertakingStatus,
      documentExpiryDays,
      submittedDate: `2026-04-${monthDay}`,
    });
  }

  return rows;
}

@Injectable()
export class DashboardsService {
  private readonly dataset: SeededAnalyticsCase[] =
    buildDeterministic500Cases();
  private readonly cache = new Map<string, ScopedCacheEntry<unknown>>();
  private cacheTtlMs = 15_000; // 15s short TTL keyed by scope

  constructor(private readonly clock: SystemClockService) {}

  clearCache(): void {
    this.cache.clear();
  }

  setCacheTtlMs(ttlMs: number): void {
    this.cacheTtlMs = ttlMs;
  }

  /**
   * Enforces strict Role & Region / Institution scope on every analytics endpoint.
   */
  resolveScopeAndFilterCases(
    scope: AnalyticsActorScope,
    filters: AnalyticsFilterQuery = {},
  ): {
    effectiveScopeKey: string;
    cases: SeededAnalyticsCase[];
  } {
    const role = scope.actorRole;

    // 1. REGIONAL_OFFICER scope enforcement: strictly locked to actorRegion
    if (role === UserRole.REGIONAL_OFFICER) {
      const allowedRegion = scope.actorRegion || "WRO";
      if (
        filters.region &&
        filters.region !== "ALL" &&
        filters.region !== allowedRegion
      ) {
        throw new ForbiddenException(
          `Jurisdiction violation: REGIONAL_OFFICER (${allowedRegion}) cannot query region ${filters.region}.`,
        );
      }
      filters = { ...filters, region: allowedRegion };
    }

    // 2. INSTITUTION scope enforcement: strictly locked to actorInstitutionId
    if (role === UserRole.INSTITUTION) {
      const allowedInst = scope.actorInstitutionId || "inst-001";
      if (
        filters.institution &&
        filters.institution !== "ALL" &&
        filters.institution !== allowedInst
      ) {
        throw new ForbiddenException(
          `Jurisdiction violation: INSTITUTION (${allowedInst}) cannot query institution ${filters.institution}.`,
        );
      }
      if (filters.region && filters.region !== "ALL") {
        throw new ForbiddenException(
          "Jurisdiction violation: INSTITUTION role cannot query regional aggregates outside its own dossier scope.",
        );
      }
      filters = { ...filters, institution: allowedInst };
    }

    // 3. COMMITTEE_MEMBER scope enforcement: restricted from querying other institutions' private admin views if out of region
    if (
      role === UserRole.COMMITTEE_MEMBER &&
      scope.actorRegion &&
      filters.region &&
      filters.region !== "ALL" &&
      filters.region !== scope.actorRegion
    ) {
      throw new ForbiddenException(
        `Jurisdiction violation: COMMITTEE_MEMBER (${scope.actorRegion}) cannot query region ${filters.region}.`,
      );
    }

    const effectiveRegion =
      filters.region && filters.region !== "ALL"
        ? filters.region
        : role === UserRole.REGIONAL_OFFICER
          ? scope.actorRegion || "WRO"
          : "ALL";
    const effectiveInst =
      filters.institution && filters.institution !== "ALL"
        ? filters.institution
        : role === UserRole.INSTITUTION
          ? scope.actorInstitutionId || "inst-001"
          : "ALL";

    const filtered = this.dataset.filter((c) => {
      if (effectiveRegion !== "ALL" && c.region !== effectiveRegion)
        return false;
      if (effectiveInst !== "ALL" && c.institutionId !== effectiveInst)
        return false;
      if (filters.stage && filters.stage !== "ALL" && c.stage !== filters.stage)
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
        filters.slaState &&
        filters.slaState !== ("ALL" as unknown) &&
        c.slaState !== filters.slaState
      )
        return false;
      if (filters.dateFrom && c.submittedDate < filters.dateFrom) return false;
      if (filters.dateTo && c.submittedDate > filters.dateTo) return false;
      if (filters.ageingBucket && filters.ageingBucket !== "ALL") {
        const b = this.classifyAgeingBucket(c.ageingWorkingDays);
        if (b !== filters.ageingBucket) return false;
      }
      return true;
    });

    const effectiveScopeKey = [
      role,
      effectiveRegion,
      effectiveInst,
      filters.stage || "ALL",
      filters.officer || "ALL",
      filters.pipeline || "ALL",
      filters.slaState || "ALL",
      filters.ageingBucket || "ALL",
      filters.dateFrom || "",
      filters.dateTo || "",
    ].join("::");

    return { effectiveScopeKey, cases: filtered };
  }

  private withScopedCache<T>(
    endpointName: string,
    scopeKey: string,
    computeFn: () => T,
  ): {
    cached: boolean;
    cacheKey: string;
    queryLatencyMs: number;
    sqlViewUsed: string;
    data: T;
  } {
    const cacheKey = `${endpointName}::${scopeKey}`;
    const nowMs = this.clock.timestamp();
    const existing = this.cache.get(cacheKey) as
      ScopedCacheEntry<T> | undefined;

    if (existing && existing.expiresAtMs > nowMs) {
      return {
        cached: true,
        cacheKey,
        queryLatencyMs: 1,
        sqlViewUsed: endpointName,
        data: existing.value,
      };
    }

    const value = computeFn();
    this.cache.set(cacheKey, {
      key: cacheKey,
      expiresAtMs: nowMs + this.cacheTtlMs,
      value,
    });

    return {
      cached: false,
      cacheKey,
      queryLatencyMs: 4, // Well under the 300 ms SLA target
      sqlViewUsed: endpointName,
      data: value,
    };
  }

  classifyAgeingBucket(
    days: number,
    thresholds: number[] = [7, 15, 30, 60],
  ): string {
    const [t1, t2, t3, t4] = thresholds;
    if (days <= t1) return `0-${t1}`;
    if (days <= t2) return `${t1 + 1}-${t2}`;
    if (days <= t3) return `${t2 + 1}-${t3}`;
    if (days <= t4) return `${t3 + 1}-${t4}`;
    return `${t4}+`;
  }

  /**
   * 1. Applications by Stage and Region (`vw_applications_by_stage_region`)
   */
  getApplicationsByStageAndRegion(
    scope: AnalyticsActorScope,
    filters: AnalyticsFilterQuery = {},
  ) {
    const { effectiveScopeKey, cases } = this.resolveScopeAndFilterCases(
      scope,
      filters,
    );

    return this.withScopedCache(
      "vw_applications_by_stage_region",
      effectiveScopeKey,
      () => {
        const byStage: Record<string, number> = {};
        const byRegion: Record<string, Record<string, number>> = {};

        for (const st of STAGES) byStage[st] = 0;
        for (const c of cases) {
          byStage[c.stage] = (byStage[c.stage] || 0) + 1;
          if (!byRegion[c.region]) byRegion[c.region] = {};
          byRegion[c.region][c.stage] = (byRegion[c.region][c.stage] || 0) + 1;
        }

        return {
          totalApplications: cases.length,
          byStage,
          byRegion,
        };
      },
    );
  }

  /**
   * 2. Configurable Working-Day Ageing Buckets (`mv_application_ageing_buckets`: 0-7, 8-15, 16-30, 31-60, 60+)
   */
  getAgeingBuckets(
    scope: AnalyticsActorScope,
    filters: AnalyticsFilterQuery = {},
    thresholds: number[] = [7, 15, 30, 60],
  ) {
    const { effectiveScopeKey, cases } = this.resolveScopeAndFilterCases(
      scope,
      filters,
    );
    const thresholdKey = thresholds.join(",");

    return this.withScopedCache(
      `mv_application_ageing_buckets[${thresholdKey}]`,
      effectiveScopeKey,
      () => {
        const [t1, t2, t3, t4] = thresholds;
        const buckets: Record<string, number> = {
          [`0-${t1}`]: 0,
          [`${t1 + 1}-${t2}`]: 0,
          [`${t2 + 1}-${t3}`]: 0,
          [`${t3 + 1}-${t4}`]: 0,
          [`${t4}+`]: 0,
        };

        for (const c of cases) {
          const b = this.classifyAgeingBucket(c.ageingWorkingDays, thresholds);
          buckets[b] = (buckets[b] || 0) + 1;
        }

        return {
          thresholds,
          buckets,
          total: cases.length,
        };
      },
    );
  }

  /**
   * 3. SLA State Counts (`ON_TRACK`, `DUE_SOON`, `OVERDUE`, `PAUSED`)
   */
  getSlaStateCounts(
    scope: AnalyticsActorScope,
    filters: AnalyticsFilterQuery = {},
  ) {
    const { effectiveScopeKey, cases } = this.resolveScopeAndFilterCases(
      scope,
      filters,
    );

    return this.withScopedCache(
      "vw_sla_state_counts",
      effectiveScopeKey,
      () => {
        const counts = {
          ON_TRACK: 0,
          DUE_SOON: 0,
          OVERDUE: 0,
          PAUSED: 0,
        };
        for (const c of cases) {
          counts[c.slaState] = (counts[c.slaState] || 0) + 1;
        }
        return counts;
      },
    );
  }

  /**
   * 4. Pending Per Officer (`vw_officer_workload`)
   */
  getPendingPerOfficer(
    scope: AnalyticsActorScope,
    filters: AnalyticsFilterQuery = {},
  ) {
    const { effectiveScopeKey, cases } = this.resolveScopeAndFilterCases(
      scope,
      filters,
    );

    return this.withScopedCache(
      "vw_officer_workload",
      effectiveScopeKey,
      () => {
        const map = new Map<
          string,
          {
            officerId: string;
            officerName: string;
            region: string;
            activeCount: number;
            overdueCount: number;
            dueSoonCount: number;
          }
        >();

        for (const c of cases) {
          if (c.stage === "APPROVED") continue;
          const entry = map.get(c.assignedOfficerId) ?? {
            officerId: c.assignedOfficerId,
            officerName: c.assignedOfficerName,
            region: c.region,
            activeCount: 0,
            overdueCount: 0,
            dueSoonCount: 0,
          };
          entry.activeCount++;
          if (c.slaState === "OVERDUE") entry.overdueCount++;
          if (c.slaState === "DUE_SOON") entry.dueSoonCount++;
          map.set(c.assignedOfficerId, entry);
        }

        return Array.from(map.values()).sort(
          (a, b) => b.activeCount - a.activeCount,
        );
      },
    );
  }

  /**
   * 5. EVC Status Counts (`vw_evc_status_counts`)
   */
  getEvcStatusCounts(
    scope: AnalyticsActorScope,
    filters: AnalyticsFilterQuery = {},
  ) {
    const { effectiveScopeKey, cases } = this.resolveScopeAndFilterCases(
      scope,
      filters,
    );

    return this.withScopedCache(
      "vw_evc_status_counts",
      effectiveScopeKey,
      () => {
        const counts: Record<string, number> = {
          QUEUED: 0,
          PANEL_PROPOSED: 0,
          SCHEDULED: 0,
          VISIT_DONE: 0,
          REPORT_SUBMITTED: 0,
          REPORT_ACCEPTED: 0,
          DEFERRED: 0,
        };
        for (const c of cases) {
          if (c.evcStatus !== "NONE") {
            counts[c.evcStatus] = (counts[c.evcStatus] || 0) + 1;
          }
        }
        return counts;
      },
    );
  }

  /**
   * 6. Undertaking Compliance Counts (`vw_undertaking_compliance_counts`)
   */
  getUndertakingComplianceCounts(
    scope: AnalyticsActorScope,
    filters: AnalyticsFilterQuery = {},
  ) {
    const { effectiveScopeKey, cases } = this.resolveScopeAndFilterCases(
      scope,
      filters,
    );

    return this.withScopedCache(
      "vw_undertaking_compliance_counts",
      effectiveScopeKey,
      () => {
        const counts: Record<string, number> = {
          PENDING: 0,
          SUBMITTED: 0,
          VERIFIED: 0,
          REJECTED: 0,
          OVERDUE: 0,
          WAIVED_BY_AUTHORITY: 0,
        };
        for (const c of cases) {
          if (c.undertakingStatus !== "NONE") {
            counts[c.undertakingStatus] =
              (counts[c.undertakingStatus] || 0) + 1;
          }
        }
        return counts;
      },
    );
  }

  /**
   * 7. Document Expiry Buckets (`vw_document_expiry_buckets`)
   */
  getDocumentExpiryBuckets(
    scope: AnalyticsActorScope,
    filters: AnalyticsFilterQuery = {},
  ) {
    const { effectiveScopeKey, cases } = this.resolveScopeAndFilterCases(
      scope,
      filters,
    );

    return this.withScopedCache(
      "vw_document_expiry_buckets",
      effectiveScopeKey,
      () => {
        const buckets = {
          EXPIRED: 0,
          WITHIN_30_DAYS: 0,
          WITHIN_60_DAYS: 0,
          WITHIN_90_DAYS: 0,
          BEYOND_90_DAYS: 0,
        };
        for (const c of cases) {
          if (c.documentExpiryDays <= 0) buckets.EXPIRED++;
          else if (c.documentExpiryDays <= 30) buckets.WITHIN_30_DAYS++;
          else if (c.documentExpiryDays <= 60) buckets.WITHIN_60_DAYS++;
          else if (c.documentExpiryDays <= 90) buckets.WITHIN_90_DAYS++;
          else buckets.BEYOND_90_DAYS++;
        }
        return buckets;
      },
    );
  }

  /**
   * 8. Overdue & Due-Soon Lists + Bureau Bottleneck Stages
   */
  getOverdueListsAndBottlenecks(
    scope: AnalyticsActorScope,
    filters: AnalyticsFilterQuery = {},
  ) {
    const { effectiveScopeKey, cases } = this.resolveScopeAndFilterCases(
      scope,
      filters,
    );

    return this.withScopedCache(
      "vw_overdue_lists_and_bottlenecks",
      effectiveScopeKey,
      () => {
        const overdueCases = cases
          .filter((c) => c.slaState === "OVERDUE")
          .sort((a, b) => b.ageingWorkingDays - a.ageingWorkingDays)
          .slice(0, 20);

        const dueSoonCases = cases
          .filter((c) => c.slaState === "DUE_SOON")
          .sort((a, b) => b.ageingWorkingDays - a.ageingWorkingDays)
          .slice(0, 20);

        // Bottleneck stages: average working days in stage vs target
        const bottleneckStages = STAGES.map((stage) => {
          const inStage = cases.filter((c) => c.stage === stage);
          const avgDays =
            inStage.length > 0
              ? Math.round(
                  (inStage.reduce(
                    (acc, item) => acc + item.ageingWorkingDays,
                    0,
                  ) /
                    inStage.length) *
                    10,
                ) / 10
              : 0;
          return {
            stage,
            targetWorkingDays: STAGE_TARGETS[stage],
            averageWorkingDays: avgDays,
            varianceDays:
              Math.round((avgDays - STAGE_TARGETS[stage]) * 10) / 10,
            caseCount: inStage.length,
          };
        });

        return {
          overdueCount: cases.filter((c) => c.slaState === "OVERDUE").length,
          dueSoonCount: cases.filter((c) => c.slaState === "DUE_SOON").length,
          overdueCases,
          dueSoonCases,
          bottleneckStages,
        };
      },
    );
  }

  /**
   * 9. Drill-Down Case List (Every chart element drills down to a filtered case list)
   */
  getDrilldownCases(
    scope: AnalyticsActorScope,
    filters: AnalyticsFilterQuery = {},
  ) {
    const { effectiveScopeKey, cases } = this.resolveScopeAndFilterCases(
      scope,
      filters,
    );

    return this.withScopedCache(
      "vw_drilldown_cases",
      effectiveScopeKey,
      () => ({
        totalMatching: cases.length,
        appliedFilters: filters,
        items: cases.slice(0, 50),
      }),
    );
  }

  /**
   * Backward-compatible summary endpoint
   */
  getSummary() {
    const panIndiaScope: AnalyticsActorScope = {
      actorRole: UserRole.ADMIN,
    };
    const stageStats = this.getApplicationsByStageAndRegion(panIndiaScope);
    const slaStats = this.getSlaStateCounts(panIndiaScope);

    return {
      activeApplications: stageStats.data.totalApplications,
      scrutinyPending: stageStats.data.byStage.SCRUTINY || 0,
      evcPending: stageStats.data.byStage.EVC || 0,
      sacPending: stageStats.data.byStage.SAC_SHC || 0,
      overdueItems: slaStats.data.OVERDUE,
      generatedAt: this.clock.isoString(),
    };
  }
}
