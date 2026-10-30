import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ClockModule } from "../../common/clock/clock.module";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuditService } from "../audit/audit.service";
import { DeadlinesModule } from "../deadlines/deadlines.module";
import { DueItemService } from "../deadlines/due-item.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationsService } from "../notifications/notifications.service";
import { AdminModule } from "./admin.module";
import {
  HeroFeaturesService,
  SIMULATOR_POLICY_ENTITY_ID,
} from "./hero-features.service";

describe("Phase 10 Hero Features (`HeroFeaturesService`)", () => {
  let moduleRef: TestingModule;
  let clock: SystemClockService;
  let auditService: AuditService;
  let dueItems: DueItemService;
  let notifications: NotificationsService;
  let heroService: HeroFeaturesService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ClockModule,
        PrismaModule,
        AuditModule,
        DeadlinesModule,
        NotificationsModule,
        AdminModule,
      ],
    }).compile();

    clock = moduleRef.get(SystemClockService);
    auditService = moduleRef.get(AuditService);
    dueItems = moduleRef.get(DueItemService);
    notifications = moduleRef.get(NotificationsService);
    heroService = moduleRef.get(HeroFeaturesService);

    clock.setSimulatedTime("2026-05-01T09:00:00.000Z");
    notifications.resetAll();
  });

  it("1. Rule-change impact simulator is strictly read-only and NEVER mutates live data; publishing requires a reason and is audited", async () => {
    const baselineBefore = JSON.parse(
      JSON.stringify(heroService.getLiveSimulatorBaseline()),
    );
    const dueItemsBefore = JSON.parse(
      JSON.stringify(dueItems.listDueItems()),
    );
    const auditTrailBefore = await auditService.getChainEntries(
      SIMULATOR_POLICY_ENTITY_ID,
    );

    // Run simulation with stricter stage timelines and faster escalation delays
    const simResult = heroService.simulateRuleChangeImpact({
      stageTimelinesWorkingDays: {
        SCRUTINY: 6, // tightened from 15 -> 6 working days
        EVC: 5, // tightened from 12 -> 5 working days
      },
      escalationDelaysWorkingDays: {
        level1DelayDays: 1,
        level2DelayDays: 2,
        level3DelayDays: 4,
      },
    });

    expect(simResult.readOnlyComparison).toBe(true);
    expect(simResult.liveDataMutated).toBe(false);
    expect(simResult.advisory).toBe(true);
    expect(simResult.newlyBreachedCount).toBeGreaterThan(0);
    expect(simResult.draftBreachCount).toBeGreaterThan(
      simResult.activeBreachCount,
    );
    expect(simResult.extraNotificationsCount).toBeGreaterThan(0);
    expect(simResult.affectedByRegion.length).toBe(6);
    expect(simResult.affectedByStage.length).toBeGreaterThan(0);
    expect(simResult.workloadDeltaByOfficer.length).toBeGreaterThan(0);

    // Verify zero mutation of live baseline, open cases, due items, and audit trail
    const baselineAfter = heroService.getLiveSimulatorBaseline();
    const dueItemsAfter = dueItems.listDueItems();
    const auditTrailAfter = await auditService.getChainEntries(
      SIMULATOR_POLICY_ENTITY_ID,
    );

    expect(baselineAfter).toEqual(baselineBefore);
    expect(dueItemsAfter).toEqual(dueItemsBefore);
    expect(auditTrailAfter).toEqual(auditTrailBefore);

    // Publishing without a reason must fail with BadRequestException
    await expect(
      heroService.publishDraftVersion({
        versionName: "v2.0-Draft",
        reason: "   ",
        draftConfig: {
          stageTimelinesWorkingDays: { SCRUTINY: 10 },
          escalationDelaysWorkingDays: {
            level1DelayDays: 1,
            level2DelayDays: 3,
            level3DelayDays: 7,
          },
        },
      }),
    ).rejects.toThrow(BadRequestException);

    // Publishing with a valid statutory reason succeeds and writes a hash-chained audit entry
    const published = await heroService.publishDraftVersion({
      versionName: "APH 2024-27 Mid-Cycle Amendment v2.0",
      reason: "Tightened scrutiny SLA from 15d to 12d per Council Resolution #44",
      draftConfig: {
        stageTimelinesWorkingDays: { SCRUTINY: 12 },
        escalationDelaysWorkingDays: {
          level1DelayDays: 1,
          level2DelayDays: 3,
          level3DelayDays: 7,
        },
      },
    });

    expect(published.publishedVersion.versionId).toBe("ver-2.0");
    expect(published.auditEntry.action).toBe("PIPELINE_POLICY_VERSION_PUBLISHED");
    const verifyPolicyChain = await auditService.verifyChain(
      SIMULATOR_POLICY_ENTITY_ID,
    );
    expect(verifyPolicyChain.valid).toBe(true);
  });

  it("2. Compliance Health Score computes transparent weighted rule-based score with exact item breakdown and ADVISORY label", async () => {
    // Clean institution gets 100
    const cleanScore = heroService.calculateInstitutionComplianceScore("inst-clean");
    expect(cleanScore.finalScore).toBe(100);
    expect(cleanScore.totalPointsDeducted).toBe(0);
    expect(cleanScore.deductionBreakdown).toHaveLength(0);
    expect(cleanScore.advisory).toBe(true);
    expect(cleanScore.advisoryLabel).toBe("ADVISORY");
    expect(cleanScore.riskBand).toBe("LOW_RISK");

    // Institution with default deficiencies:
    // 1 overdue undertaking (-15), 1 expired doc (-20), 1 expiring-soon doc (-8),
    // 4 excess return response days (4 * 3 = -12), 1 missed deadline (-10) => total -65 => score 35
    const scoreReport = heroService.calculateInstitutionComplianceScore("inst-001");
    expect(scoreReport.advisory).toBe(true);
    expect(scoreReport.advisoryLabel).toBe("ADVISORY");
    expect(scoreReport.totalPointsDeducted).toBe(65);
    expect(scoreReport.finalScore).toBe(35);
    expect(scoreReport.riskBand).toBe("HIGH_RISK");
    expect(scoreReport.deductionBreakdown).toHaveLength(5);

    const categories = scoreReport.deductionBreakdown.map((d) => d.category);
    expect(categories).toEqual([
      "OVERDUE_UNDERTAKING",
      "EXPIRED_DOCUMENT",
      "EXPIRING_DOCUMENT",
      "SLOW_RETURN_RESPONSE",
      "MISSED_DEADLINE",
    ]);

    // Update configurable weights and verify recalculated score reflects new weights
    await heroService.updateComplianceScoreWeights({
      overdueUndertakingPenalty: 10,
      expiredDocumentPenalty: 10,
    });
    const updatedReport =
      heroService.calculateInstitutionComplianceScore("inst-001");
    expect(updatedReport.totalPointsDeducted).toBe(50);
    expect(updatedReport.finalScore).toBe(50);
  });

  it("3. Tamper Demo pinpoints the exact broken link on verify, repairs demo state, and blocks tampering in production builds", async () => {
    const initial = await heroService.getTamperDemoState();
    expect(initial.verification.valid).toBe(true);
    expect(initial.entries).toHaveLength(3);

    // Tamper row at index 1
    const tampered = await heroService.tamperOneAuditRow({
      entryIndex: 1,
      tamperedRationale: "ILLEGAL_SQL_MUTATION",
    });
    expect(tampered.verification.valid).toBe(false);
    expect(tampered.verification.firstBrokenLink).not.toBeNull();
    expect(tampered.verification.firstBrokenLink?.index).toBe(1);
    expect(tampered.verification.firstBrokenLink?.failureType).toBe(
      "ROW_HASH_MISMATCH",
    );

    // Repair demo state and verify chain is valid again
    const repaired = await heroService.repairTamperDemoState();
    expect(repaired.repaired).toBe(true);
    expect(repaired.verification.valid).toBe(true);
    expect(repaired.verification.firstBrokenLink).toBeNull();

    // Production guard check
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      await expect(
        heroService.tamperOneAuditRow({ entryIndex: 1 }),
      ).rejects.toThrow(ForbiddenException);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  it("4. Time-Travel Console & JSON Scenario Runner step through all 6 lifecycle stages and populate live alert feed", async () => {
    for (let i = 0; i < 6; i++) {
      const state = await heroService.stepScenarioNext();
      expect(state.currentStepIndex).toBe(i);
      expect(state.liveFeed.length).toBeGreaterThan(0);
    }

    const finalState = heroService.getScenarioState();
    expect(finalState.isCompleted).toBe(true);
    expect(finalState.clockState.isDemoClockActive).toBe(true);
    expect(finalState.clockState.offsetDays).toBe(66); // 0 + 2 + 3 + 10 + 21 + 30 = 66 days
  });
});
