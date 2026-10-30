import { describe, expect, it } from "vitest";
import {
  classifyWorkingDayAgeing,
  computeDashboardAnalytics,
} from "./dashboards-client";

describe("Phase 9: Frontend Dashboards Analytics Client (`dashboards-client.ts`)", () => {
  it("1. classifies working-day ageing into statutory buckets (0-7, 8-15, 16-30, 31-60, 60+)", () => {
    expect(classifyWorkingDayAgeing(0)).toBe("0-7");
    expect(classifyWorkingDayAgeing(7)).toBe("0-7");
    expect(classifyWorkingDayAgeing(8)).toBe("8-15");
    expect(classifyWorkingDayAgeing(15)).toBe("8-15");
    expect(classifyWorkingDayAgeing(16)).toBe("16-30");
    expect(classifyWorkingDayAgeing(30)).toBe("16-30");
    expect(classifyWorkingDayAgeing(31)).toBe("31-60");
    expect(classifyWorkingDayAgeing(60)).toBe("31-60");
    expect(classifyWorkingDayAgeing(61)).toBe("60+");
  });

  it("2. enforces role and regional jurisdiction scope on all aggregates", () => {
    const bureauRes = computeDashboardAnalytics("BUREAU_OFFICER", "WRO");
    expect(bureauRes.totalScopedCount).toBe(500);

    const roWroRes = computeDashboardAnalytics("REGIONAL_OFFICER", "WRO");
    expect(roWroRes.totalScopedCount).toBe(84);
    expect(
      roWroRes.drilldownCases.every((c) => c.region === "WRO"),
    ).toBe(true);

    const instRes = computeDashboardAnalytics(
      "INSTITUTION",
      "WRO",
      "inst-001",
    );
    expect(instRes.totalScopedCount).toBe(13);
    expect(
      instRes.drilldownCases.every((c) => c.institutionId === "inst-001"),
    ).toBe(true);
  });

  it("3. applies interactive chart drill-down URL filters (stage, ageingBucket, slaState)", () => {
    const drilled = computeDashboardAnalytics("BUREAU_OFFICER", "WRO", "inst-001", {
      stage: "EVC",
      ageingBucket: "16-30",
    });

    expect(drilled.totalFilteredCount).toBeGreaterThan(0);
    for (const c of drilled.drilldownCases) {
      expect(c.stage).toBe("EVC");
      expect(classifyWorkingDayAgeing(c.ageingWorkingDays)).toBe("16-30");
    }
  });
});

