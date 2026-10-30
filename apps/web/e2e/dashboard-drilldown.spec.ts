import { test, expect } from "@playwright/test";

test.describe("Phase 9: Statutory Analytics & ECharts Drill-Down E2E", () => {
  test("drills down from EChart stage funnel and ageing bucket into filtered case list & persists filters in URL", async ({
    page,
  }) => {
    await page.goto("/dashboards");

    // 1. Verify page header & auto-refresh indicator render
    await expect(page.getByTestId("auto-refresh-indicator")).toBeVisible();
    await expect(page.getByTestId("echart-panel-stage-funnel")).toBeVisible();
    await expect(page.getByTestId("echart-panel-ageing-buckets")).toBeVisible();

    // 2. Click a stage element in the ECharts funnel (e.g., EVC) and verify URL + drill-down filter update
    await page.getByTestId("chart-elem-stage-funnel-EVC").click();
    await expect(page).toHaveURL(/stage=EVC/);
    await expect(page.getByTestId("active-url-filters-badge")).toContainText(
      "Stage: EVC",
    );

    // 3. Click an ageing bucket bar (e.g., 16-30 working days) and verify both URL params persist
    await page.getByTestId("chart-elem-ageing-buckets-16-30").click();
    await expect(page).toHaveURL(/stage=EVC/);
    await expect(page).toHaveURL(/ageingBucket=16-30/);

    // 4. Toggle accessible WCAG 2.1 AA HTML <table> fallback on the Stage Funnel chart
    await page.getByTestId("table-fallback-toggle-stage-funnel").click();
    await expect(
      page.getByTestId("echart-fallback-table-stage-funnel"),
    ).toBeVisible();

    // 5. Reset drill-down filters and confirm URL returns to /dashboards
    await page.getByTestId("clear-dashboard-filters").click();
    await expect(page).toHaveURL(/\/dashboards$/);
  });
});

