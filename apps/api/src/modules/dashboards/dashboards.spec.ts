import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@samay/shared";
import { ClockModule } from "../../common/clock/clock.module";
import { SystemClockService } from "../../common/clock/clock.service";
import { DashboardsModule } from "./dashboards.module";
import { DashboardsService } from "./dashboards.service";
import { DashboardsController } from "./dashboards.controller";
import { AuthenticatedUser } from "../auth/current-user.decorator";

describe("Phase 9: Analytics API, Scope Enforcement, Short-TTL Scoped Cache & Seeded Aggregate Snapshots", () => {
  let moduleRef: TestingModule;
  let clock: SystemClockService;
  let dashboardsService: DashboardsService;
  let dashboardsController: DashboardsController;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ClockModule, DashboardsModule],
    }).compile();

    clock = moduleRef.get(SystemClockService);
    dashboardsService = moduleRef.get(DashboardsService);
    dashboardsController = moduleRef.get(DashboardsController);

    clock.setSimulatedTime(
      clock.parseIso("2026-05-01T03:30:00.000Z").getTime(),
    );
    dashboardsService.clearCache();
  });

  it("1. Enforces strict Role and Region/Institution scope on every analytics endpoint", () => {
    const wroOfficerScope = {
      actorRole: UserRole.REGIONAL_OFFICER,
      actorRegion: "WRO",
    };

    // REGIONAL_OFFICER querying own region succeeds and returns only WRO applications
    const wroStage =
      dashboardsService.getApplicationsByStageAndRegion(wroOfficerScope);
    expect(Object.keys(wroStage.data.byRegion)).toEqual(["WRO"]);
    expect(wroStage.data.totalApplications).toBe(84); // 500 / 6 regions = 84 in WRO

    // REGIONAL_OFFICER attempting to query NRO throws ForbiddenException across every endpoint
    expect(() =>
      dashboardsService.getApplicationsByStageAndRegion(wroOfficerScope, {
        region: "NRO",
      }),
    ).toThrow(ForbiddenException);
    expect(() =>
      dashboardsService.getAgeingBuckets(wroOfficerScope, { region: "NRO" }),
    ).toThrow(ForbiddenException);
    expect(() =>
      dashboardsService.getSlaStateCounts(wroOfficerScope, { region: "NRO" }),
    ).toThrow(ForbiddenException);
    expect(() =>
      dashboardsService.getPendingPerOfficer(wroOfficerScope, {
        region: "NRO",
      }),
    ).toThrow(ForbiddenException);
    expect(() =>
      dashboardsService.getEvcStatusCounts(wroOfficerScope, { region: "NRO" }),
    ).toThrow(ForbiddenException);
    expect(() =>
      dashboardsService.getUndertakingComplianceCounts(wroOfficerScope, {
        region: "NRO",
      }),
    ).toThrow(ForbiddenException);
    expect(() =>
      dashboardsService.getDocumentExpiryBuckets(wroOfficerScope, {
        region: "NRO",
      }),
    ).toThrow(ForbiddenException);
    expect(() =>
      dashboardsService.getOverdueListsAndBottlenecks(wroOfficerScope, {
        region: "NRO",
      }),
    ).toThrow(ForbiddenException);

    // INSTITUTION scope enforcement: locked to own institutionId (inst-001)
    const instScope = {
      actorRole: UserRole.INSTITUTION,
      actorInstitutionId: "inst-001",
    };
    const instDrill = dashboardsService.getDrilldownCases(instScope);
    expect(instDrill.data.totalMatching).toBe(13); // 500 / 40 institutions = 13 for inst-001
    expect(
      instDrill.data.items.every((i) => i.institutionId === "inst-001"),
    ).toBe(true);

    // INSTITUTION attempting to query inst-002 or regional aggregate throws ForbiddenException
    expect(() =>
      dashboardsService.getDrilldownCases(instScope, {
        institution: "inst-002",
      }),
    ).toThrow(ForbiddenException);
    expect(() =>
      dashboardsService.getSlaStateCounts(instScope, { region: "WRO" }),
    ).toThrow(ForbiddenException);
  });

  it("2. Caches responses in-memory with a short TTL keyed by scope and expires deterministically via SystemClockService (< 300ms target)", () => {
    const bureauScope = { actorRole: UserRole.BUREAU_OFFICER };

    // First call -> cache miss (cached: false)
    const call1 = dashboardsService.getSlaStateCounts(bureauScope, {
      region: "WRO",
    });
    expect(call1.cached).toBe(false);
    expect(call1.queryLatencyMs).toBeLessThan(300);

    // Second call within 15s TTL -> cache hit (cached: true)
    const call2 = dashboardsService.getSlaStateCounts(bureauScope, {
      region: "WRO",
    });
    expect(call2.cached).toBe(true);
    expect(call2.cacheKey).toBe(call1.cacheKey);

    // Different scope (REGIONAL_OFFICER) -> separate cache key, cache miss
    const roCall = dashboardsService.getSlaStateCounts({
      actorRole: UserRole.REGIONAL_OFFICER,
      actorRegion: "WRO",
    });
    expect(roCall.cached).toBe(false);
    expect(roCall.cacheKey).not.toBe(call1.cacheKey);

    // Advance Clock by +16 seconds (past 15s TTL) -> cache expires (cached: false)
    clock.setSimulatedTime(clock.timestamp() + 16_000);
    const callAfterExpiry = dashboardsService.getSlaStateCounts(bureauScope, {
      region: "WRO",
    });
    expect(callAfterExpiry.cached).toBe(false);
  });

  it("3. Verifies deterministic snapshots of the 500 seeded applications aggregates and drill-down filters", () => {
    const panIndiaScope = { actorRole: UserRole.ADMIN };

    const stageRegion =
      dashboardsService.getApplicationsByStageAndRegion(panIndiaScope);
    expect(stageRegion.data.totalApplications).toBe(500);
    expect(stageRegion.data.byStage).toEqual({
      SUBMITTED: 72,
      SCRUTINY: 72,
      DEFICIENCY_RECTIFICATION: 72,
      EVC: 71,
      SAC_SHC: 71,
      BUREAU_REVIEW: 71,
      APPROVED: 71,
    });

    const ageingDefault = dashboardsService.getAgeingBuckets(panIndiaScope);
    expect(ageingDefault.data.total).toBe(500);
    expect(Object.keys(ageingDefault.data.buckets)).toEqual([
      "0-7",
      "8-15",
      "16-30",
      "31-60",
      "60+",
    ]);

    const slaCounts = dashboardsService.getSlaStateCounts(panIndiaScope);
    expect(
      slaCounts.data.ON_TRACK +
        slaCounts.data.DUE_SOON +
        slaCounts.data.OVERDUE +
        slaCounts.data.PAUSED,
    ).toBe(500);

    const officerWorkload =
      dashboardsService.getPendingPerOfficer(panIndiaScope);
    expect(officerWorkload.data.length).toBe(12); // 2 officers per region * 6 regions

    const evcCounts = dashboardsService.getEvcStatusCounts(panIndiaScope);
    const totalEvc = Object.values(evcCounts.data).reduce((a, b) => a + b, 0);
    expect(totalEvc).toBe(250); // 50% of 500 cases use SCRUTINY_EVC pipeline

    const docExpiry = dashboardsService.getDocumentExpiryBuckets(panIndiaScope);
    expect(
      docExpiry.data.EXPIRED +
        docExpiry.data.WITHIN_30_DAYS +
        docExpiry.data.WITHIN_60_DAYS +
        docExpiry.data.WITHIN_90_DAYS +
        docExpiry.data.BEYOND_90_DAYS,
    ).toBe(500);

    // Drill-down test: clicking WRO + SCRUTINY chart bar returns exact matching case list
    const drilldown = dashboardsService.getDrilldownCases(panIndiaScope, {
      region: "WRO",
      stage: "SCRUTINY",
    });
    expect(drilldown.data.totalMatching).toBe(
      stageRegion.data.byRegion.WRO.SCRUTINY,
    );
    expect(
      drilldown.data.items.every(
        (c) => c.region === "WRO" && c.stage === "SCRUTINY",
      ),
    ).toBe(true);
  });

  it("5. Verifies strict RBAC isolation on DashboardsController (Regional Officer cannot access Pan-India Macro or other regions)", () => {
    const regionalOfficerUser: AuthenticatedUser = {
      id: "usr-ro-wro",
      keycloakId: "kc-ro-wro",
      fullName: "Dr. Suresh Patil",
      email: "ro.wro@aicte.gov.in",
      role: UserRole.REGIONAL_OFFICER,
      roles: [UserRole.REGIONAL_OFFICER],
      regionCode: "WRO",
    };

    const bureauOfficerUser: AuthenticatedUser = {
      id: "usr-bureau",
      keycloakId: "kc-bureau",
      fullName: "Dr. Arvind Kulkarni",
      email: "bureau.approval@aicte.gov.in",
      role: UserRole.BUREAU_OFFICER,
      roles: [UserRole.BUREAU_OFFICER],
    };

    // Regional Officer accessing summary throws ForbiddenException
    expect(() => dashboardsController.getSummary(regionalOfficerUser)).toThrow(
      ForbiddenException,
    );

    // Regional Officer querying another region (NRO) throws ForbiddenException
    expect(() =>
      dashboardsController.getApplicationsByStage(regionalOfficerUser, {
        region: "NRO",
      }),
    ).toThrow(ForbiddenException);

    // Regional Officer querying own region succeeds
    const roResult = dashboardsController.getApplicationsByStage(
      regionalOfficerUser,
      { region: "WRO" },
    );
    expect(roResult.data.totalApplications).toBe(84);

    // Bureau Officer calling summary succeeds
    const bureauSummary = dashboardsController.getSummary(bureauOfficerUser);
    expect(bureauSummary.activeApplications).toBe(500);
  });
});
