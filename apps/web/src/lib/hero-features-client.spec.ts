import { describe, expect, it } from "vitest";
import {
  calculateComplianceHealthScore,
  getHeroFeaturesSnapshot,
  publishDraftVersionInStore,
  repairTamperDemoStateInStore,
  resetDemoClockToRealTimeInStore,
  simulateRuleChangeImpactInStore,
  stepScenarioRunnerInStore,
  tamperOneAuditRowInStore,
  updateComplianceWeightsInStore,
  verifyAuditChainInStore,
} from "./hero-features-client";
import { getNotificationsSnapshot } from "./notifications-client";

describe("Phase 10: Frontend Hero Features Client (`hero-features-client.ts`)", () => {
  it("1. Rule-change impact simulator is strictly read-only, never mutates live data, and requires a reason to publish", () => {
    const beforeOpenCases = JSON.parse(
      JSON.stringify(getHeroFeaturesSnapshot().openCases),
    );
    const beforeActiveTimelines = JSON.parse(
      JSON.stringify(getHeroFeaturesSnapshot().activeStageTimelines),
    );

    const sim = simulateRuleChangeImpactInStore({
      stageTimelinesWorkingDays: {
        SCRUTINY: 6,
        EVC: 5,
      },
      escalationDelaysWorkingDays: {
        level1DelayDays: 1,
        level2DelayDays: 2,
        level3DelayDays: 4,
      },
    });

    expect(sim.readOnlyComparison).toBe(true);
    expect(sim.liveDataMutated).toBe(false);
    expect(sim.newlyBreachedCount).toBeGreaterThan(0);
    expect(sim.extraNotificationsCount).toBeGreaterThan(0);

    // Live data must remain 100% untouched
    expect(getHeroFeaturesSnapshot().openCases).toEqual(beforeOpenCases);
    expect(getHeroFeaturesSnapshot().activeStageTimelines).toEqual(
      beforeActiveTimelines,
    );

    // Publishing without a reason throws
    expect(() =>
      publishDraftVersionInStore({ versionName: "v2.0", reason: "  " }),
    ).toThrow(/reason/i);

    const pub = publishDraftVersionInStore({
      versionName: "APH 2024-27 Draft Amendment v2.0",
      reason: "Tightened scrutiny SLA per Council resolution",
    });
    expect(pub.versionId).toBe("ver-2.0");
  });

  it("2. Compliance Health Score computes transparent weighted rule-based score and breakdown with ADVISORY tag", () => {
    const clean = calculateComplianceHealthScore("inst-clean");
    expect(clean.finalScore).toBe(100);
    expect(clean.advisory).toBe(true);
    expect(clean.advisoryLabel).toBe("ADVISORY");
    expect(clean.deductionBreakdown).toHaveLength(0);

    const sangli = calculateComplianceHealthScore("inst-001");
    expect(sangli.advisory).toBe(true);
    expect(sangli.totalPointsDeducted).toBe(65);
    expect(sangli.finalScore).toBe(35);
    expect(sangli.deductionBreakdown).toHaveLength(5);

    updateComplianceWeightsInStore({ overdueUndertakingPenalty: 5 });
    const recalculated = calculateComplianceHealthScore("inst-001");
    expect(recalculated.finalScore).toBe(45);
  });

  it("3. Tamper Demo pinpoints broken link on verify, repairs demo state, and blocks tampering in production builds", () => {
    repairTamperDemoStateInStore();
    expect(verifyAuditChainInStore().valid).toBe(true);

    // Block in production build
    expect(() => tamperOneAuditRowInStore(1, true)).toThrow(/production/i);

    // Tamper row #1 in non-production
    tamperOneAuditRowInStore(1, false);
    const verifiedBroken = verifyAuditChainInStore();
    expect(verifiedBroken.valid).toBe(false);
    expect(verifiedBroken.firstBrokenLink?.index).toBe(1);
    expect(verifiedBroken.firstBrokenLink?.failureType).toBe(
      "ROW_HASH_MISMATCH",
    );

    // Repair demo state
    repairTamperDemoStateInStore();
    expect(verifyAuditChainInStore().valid).toBe(true);
  });

  it("4. Time-Travel Console & JSON Scenario Runner step through all 6 stages and sync persistent Demo Clock banner", () => {
    resetDemoClockToRealTimeInStore();
    expect(getNotificationsSnapshot().demoClock.isActive).toBe(false);

    for (let i = 0; i < 6; i++) {
      const state = stepScenarioRunnerInStore();
      expect(state.scenarioCursor).toBe(i);
    }

    expect(getHeroFeaturesSnapshot().offsetDays).toBe(66);
    expect(getNotificationsSnapshot().demoClock.isActive).toBe(true);
    expect(getNotificationsSnapshot().demoClock.offsetDays).toBe(66);
  });
});

