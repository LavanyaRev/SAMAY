"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  RefreshCw,
  RotateCcw,
  Users,
  CalendarClock,
  FileWarning,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { EChartPanel } from "@/components/ui/echart-panel";
import { SlaBadge } from "@/components/ui/sla-badge";
import { StatusChip } from "@/components/ui/status-chip";
import { useApp } from "@/lib/app-context";
import {
  computeDashboardAnalytics,
  type DashboardUrlFilters,
} from "@/lib/dashboards-client";

function DashboardsContent() {
  const { user, locale } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentRole = user?.role ?? "REGIONAL_OFFICER";
  const actorRegion = user?.regionCode ?? "WRO";
  const actorInstitutionId = "inst-001";

  // Read filters from URL search params
  const filters: DashboardUrlFilters = {
    region: searchParams?.get("region") ?? "ALL",
    stage: searchParams?.get("stage") ?? "ALL",
    slaState: searchParams?.get("slaState") ?? "ALL",
    ageingBucket: searchParams?.get("ageingBucket") ?? "ALL",
    pipeline: searchParams?.get("pipeline") ?? "ALL",
    officer: searchParams?.get("officer") ?? "ALL",
  };

  const [secondsToRefresh, setSecondsToRefresh] = useState(60);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isLoadingSim, setIsLoadingSim] = useState(false);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsToRefresh((prev) => {
        if (prev <= 1) {
          setRefreshCount((c) => c + 1);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to update URL query parameters when drilling down or changing filters
  const updateUrlFilter = (
    key: keyof DashboardUrlFilters,
    value: string | undefined,
  ) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const existing = params.get(key);
    if (!value || value === "ALL" || existing === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const queryStr = params.toString();
    router.push(queryStr ? `/dashboards?${queryStr}` : "/dashboards", {
      scroll: false,
    });
  };

  const clearAllFilters = () => {
    router.push("/dashboards", { scroll: false });
  };

  const analytics = computeDashboardAnalytics(
    currentRole,
    actorRegion,
    actorInstitutionId,
    filters,
  );

  const hasActiveFilter = Object.values(filters).some(
    (v) => v && v !== "ALL",
  );

  return (
    <div className="space-y-5">
      {/* Header & Auto-Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-surface-raised px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand" />
            <h1 className="font-serif text-lg font-bold text-text-primary">
              {locale === "hi"
                ? "वैधानिक विश्लेषण और लंबितता डैशबोर्ड (Analytics & Pendency)"
                : "Statutory Analytics & Pendency Dashboards"}
            </h1>
            <span className="rounded-xs border border-brand bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-brand">
              ADVISORY
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            {locale === "hi"
              ? `भूमिका-आधारित दृश्य (${currentRole}) • कुल दायरे में मामले: ${analytics.totalScopedCount} • फ़िल्टर किए गए: ${analytics.totalFilteredCount}`
              : `Role-Scoped View (${currentRole}) • Scoped Cases: ${analytics.totalScopedCount} • Filtered: ${analytics.totalFilteredCount}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            data-testid="auto-refresh-indicator"
            className="inline-flex items-center gap-1.5 rounded-xs border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-text-secondary"
          >
            <RefreshCw className="h-3 w-3 text-brand" />
            <span>
              {locale === "hi"
                ? `स्वतः रिफ्रेश: ${secondsToRefresh}s (#${refreshCount})`
                : `Auto-refresh: ${secondsToRefresh}s (#${refreshCount})`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsLoadingSim((prev) => !prev)}
            data-testid="toggle-skeleton-btn"
            className="rounded-xs border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-primary hover:border-brand"
          >
            {isLoadingSim
              ? locale === "hi"
                ? "डेटा दिखाएं"
                : "Show Live Data"
              : locale === "hi"
                ? "लोडिंग कंकाल (Skeleton)"
                : "Preview Skeleton"}
          </button>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              data-testid="clear-dashboard-filters"
              className="inline-flex items-center gap-1 rounded-xs border border-brand bg-brand px-2.5 py-1 text-xs font-semibold text-brand-on"
            >
              <RotateCcw className="h-3 w-3" />
              <span>
                {locale === "hi" ? "फ़िल्टर साफ़ करें" : "Reset Drill-Down"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* URL-Persisted Filter Bar */}
      <div
        aria-label="Analytics Scope and URL Filter Controls"
        data-testid="dashboard-filter-bar"
        className="grid grid-cols-1 gap-3 rounded-sm border border-border bg-surface-raised p-3 sm:grid-cols-5"
      >
        <div>
          <label
            htmlFor="filter-region"
            className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted"
          >
            {locale === "hi" ? "क्षेत्र (Region)" : "Region Scope"}
          </label>
          <select
            id="filter-region"
            data-testid="select-filter-region"
            disabled={currentRole === "REGIONAL_OFFICER"}
            value={
              currentRole === "REGIONAL_OFFICER"
                ? actorRegion
                : (filters.region ?? "ALL")
            }
            onChange={(e) => updateUrlFilter("region", e.target.value)}
            className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary disabled:opacity-60"
          >
            <option value="ALL">All Regions (Pan-India)</option>
            <option value="WRO">WRO (Western)</option>
            <option value="NRO">NRO (Northern)</option>
            <option value="SRO">SRO (Southern)</option>
            <option value="ERO">ERO (Eastern)</option>
            <option value="NWRO">NWRO (North-West)</option>
            <option value="CRO">CRO (Central)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-stage"
            className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted"
          >
            {locale === "hi" ? "चरण (Stage)" : "Workflow Stage"}
          </label>
          <select
            id="filter-stage"
            data-testid="select-filter-stage"
            value={filters.stage ?? "ALL"}
            onChange={(e) => updateUrlFilter("stage", e.target.value)}
            className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
          >
            <option value="ALL">All Stages</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="SCRUTINY">SCRUTINY</option>
            <option value="DEFICIENCY_RECTIFICATION">
              DEFICIENCY_RECTIFICATION
            </option>
            <option value="EVC">EVC</option>
            <option value="SAC_SHC">SAC_SHC</option>
            <option value="BUREAU_REVIEW">BUREAU_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-sla"
            className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted"
          >
            {locale === "hi" ? "एसएलए स्थिति (SLA)" : "SLA State"}
          </label>
          <select
            id="filter-sla"
            data-testid="select-filter-sla"
            value={filters.slaState ?? "ALL"}
            onChange={(e) => updateUrlFilter("slaState", e.target.value)}
            className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
          >
            <option value="ALL">All SLA States</option>
            <option value="ON_TRACK">ON_TRACK</option>
            <option value="DUE_SOON">DUE_SOON</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="PAUSED">PAUSED</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-ageing"
            className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted"
          >
            {locale === "hi" ? "कार्य दिवस आयु (Ageing)" : "Ageing Bucket"}
          </label>
          <select
            id="filter-ageing"
            data-testid="select-filter-ageing"
            value={filters.ageingBucket ?? "ALL"}
            onChange={(e) => updateUrlFilter("ageingBucket", e.target.value)}
            className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
          >
            <option value="ALL">All Buckets</option>
            <option value="0-7">0-7 Working Days</option>
            <option value="8-15">8-15 Working Days</option>
            <option value="16-30">16-30 Working Days</option>
            <option value="31-60">31-60 Working Days</option>
            <option value="60+">60+ Working Days</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-pipeline"
            className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted"
          >
            {locale === "hi" ? "पाइपलाइन (Pipeline)" : "Statutory Pipeline"}
          </label>
          <select
            id="filter-pipeline"
            data-testid="select-filter-pipeline"
            value={filters.pipeline ?? "ALL"}
            onChange={(e) => updateUrlFilter("pipeline", e.target.value)}
            className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
          >
            <option value="ALL">All Pipelines</option>
            <option value="SCRUTINY_EVC">SCRUTINY_EVC</option>
            <option value="ONLY_SCRUTINY">ONLY_SCRUTINY</option>
          </select>
        </div>
      </div>

      {/* KPI Summary Cards (Click to filter by SLA state) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            {
              key: "ON_TRACK",
              labelEn: "On Track (SLA)",
              labelHi: "समय पर (On Track)",
              count: analytics.slaCounts.ON_TRACK,
              border: "border-l-4 border-l-sla-ontrack",
            },
            {
              key: "DUE_SOON",
              labelEn: "Due Soon Warning",
              labelHi: "शीघ्र देय (Due Soon)",
              count: analytics.slaCounts.DUE_SOON,
              border: "border-l-4 border-l-sla-duesoon",
            },
            {
              key: "OVERDUE",
              labelEn: "Overdue Escalations",
              labelHi: "अतिदेय (Overdue)",
              count: analytics.slaCounts.OVERDUE,
              border: "border-l-4 border-l-sla-overdue",
            },
            {
              key: "PAUSED",
              labelEn: "Paused (With Institution)",
              labelHi: "रोका गया (Paused)",
              count: analytics.slaCounts.PAUSED,
              border: "border-l-4 border-l-sla-paused",
            },
          ] as const
        ).map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => updateUrlFilter("slaState", kpi.key)}
            data-testid={`kpi-sla-${kpi.key}`}
            className={`rounded-sm border border-border bg-surface-raised p-3 text-left transition-colors hover:border-brand ${kpi.border} ${
              filters.slaState === kpi.key ? "ring-1 ring-brand" : ""
            }`}
          >
            <div className="text-[11px] font-semibold uppercase text-text-muted">
              {locale === "hi" ? kpi.labelHi : kpi.labelEn}
            </div>
            <div className="tabular-nums-data mt-1 font-mono text-2xl font-bold text-text-primary">
              {kpi.count}
            </div>
          </button>
        ))}
      </div>

      {/* ECharts Interactive Grid: Stage Funnel, Working-Day Ageing, and Region Comparison / Bottlenecks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <EChartPanel
          id="stage-funnel"
          titleEn="Applications by Statutory Stage (Funnel)"
          titleHi="वैधानिक चरण के अनुसार आवेदन (फ़नल)"
          subtitleEn="Click a stage bar to drill down & update ?stage= in URL"
          subtitleHi="ड्रिल-डाउन के लिए किसी भी चरण पर क्लिक करें"
          locale={locale}
          chartType="funnel"
          isLoading={isLoadingSim}
          activeKey={filters.stage}
          data={analytics.byStage.map((s) => ({
            key: s.key,
            labelEn: s.labelEn,
            labelHi: s.labelHi,
            value: s.value,
            tone:
              s.key === "APPROVED"
                ? "ontrack"
                : s.key === "DEFICIENCY_RECTIFICATION"
                  ? "paused"
                  : "brand",
          }))}
          onElementClick={(stageKey) => updateUrlFilter("stage", stageKey)}
        />

        <EChartPanel
          id="ageing-buckets"
          titleEn="Working-Day Ageing Buckets"
          titleHi="कार्य दिवस आयु समूह (Ageing Buckets)"
          subtitleEn="0-7, 8-15, 16-30, 31-60, 60+ working days"
          subtitleHi="0-7, 8-15, 16-30, 31-60, 60+ कार्य दिवस"
          locale={locale}
          chartType="bar"
          isLoading={isLoadingSim}
          activeKey={filters.ageingBucket}
          data={analytics.ageingBuckets.map((b) => ({
            key: b.key,
            labelEn: b.labelEn,
            labelHi: b.labelHi,
            value: b.value,
            tone:
              b.key === "60+" || b.key === "31-60"
                ? "overdue"
                : b.key === "16-30"
                  ? "duesoon"
                  : "ontrack",
          }))}
          onElementClick={(bucketKey) =>
            updateUrlFilter("ageingBucket", bucketKey)
          }
        />

        <EChartPanel
          id="region-comparison"
          titleEn={
            currentRole === "REGIONAL_OFFICER"
              ? `${actorRegion} Regional Jurisdiction Breakdown`
              : "Pan-India Regional Comparison"
          }
          titleHi="क्षेत्रीय तुलना और अतिदेय मामले"
          subtitleEn="Total cases and overdue count by regional office"
          subtitleHi="क्षेत्रीय कार्यालय द्वारा कुल और अतिदेय मामले"
          locale={locale}
          chartType="bar"
          isLoading={isLoadingSim}
          activeKey={filters.region}
          data={analytics.byRegion
            .filter((r) =>
              currentRole === "REGIONAL_OFFICER"
                ? r.key === actorRegion
                : true,
            )
            .map((r) => ({
              key: r.key,
              labelEn: r.labelEn,
              labelHi: r.labelHi,
              value: r.value,
              secondaryLabel: "Overdue",
              secondaryValue: r.overdueCount,
              tone: r.overdueCount > 20 ? "overdue" : "brand",
            }))}
          onElementClick={(regKey) => {
            if (currentRole !== "REGIONAL_OFFICER") {
              updateUrlFilter("region", regKey);
            }
          }}
        />
      </div>

      {/* Role-Specific Panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Officer Workload & Bottleneck Comparison */}
        <div className="rounded-sm border border-border bg-surface-raised p-4">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" />
              <h3 className="font-serif text-sm font-bold text-text-primary">
                {currentRole === "BUREAU_OFFICER"
                  ? locale === "hi"
                    ? "चरण अवरोध (औसत बनाम लक्ष्य कार्य दिवस)"
                    : "Stage Bottlenecks (Avg Working Days vs Target)"
                  : locale === "hi"
                    ? "अधिकारी कार्यभार और लंबित मामले"
                    : "Pending Cases per Scrutinising / Regional Officer"}
              </h3>
            </div>
            <span className="font-mono text-[10px] text-text-muted">
              CLICK TO DRILL DOWN
            </span>
          </div>

          {currentRole === "BUREAU_OFFICER" ? (
            <div className="space-y-2">
              {analytics.bottleneckStages.map((st) => (
                <button
                  key={st.stage}
                  type="button"
                  onClick={() => updateUrlFilter("stage", st.stage)}
                  className="flex w-full items-center justify-between rounded-xs border border-border bg-surface px-3 py-2 text-left text-xs hover:border-brand"
                >
                  <div>
                    <div className="font-semibold text-text-primary">
                      {st.stage}
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Active Cases: {st.caseCount}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span
                      className={
                        st.avgDays > st.targetDays
                          ? "font-bold text-sla-overdue"
                          : "font-bold text-sla-ontrack"
                      }
                    >
                      Avg: {st.avgDays}d
                    </span>
                    <span className="ml-2 text-text-muted">
                      / Target: {st.targetDays}d
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.officerWorkload.slice(0, 6).map((off) => (
                <button
                  key={off.officerId}
                  type="button"
                  onClick={() => updateUrlFilter("officer", off.officerId)}
                  className="flex w-full items-center justify-between rounded-xs border border-border bg-surface px-3 py-2 text-left text-xs hover:border-brand"
                >
                  <div>
                    <div className="font-semibold text-text-primary">
                      {off.officerName}
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Jurisdiction: {off.region}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="rounded-xs bg-surface-sunken px-2 py-0.5 font-bold text-text-primary">
                      Active: {off.activeCount}
                    </span>
                    <span className="rounded-xs bg-sla-overdue-bg px-2 py-0.5 font-bold text-sla-overdue">
                      Overdue: {off.overdueCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* EVC Calendar Strip / Undertaking & Document Alerts / Admin Job Status */}
        <div className="rounded-sm border border-border bg-surface-raised p-4">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              {currentRole === "ADMIN" ? (
                <Activity className="h-4 w-4 text-brand" />
              ) : (
                <CalendarClock className="h-4 w-4 text-brand" />
              )}
              <h3 className="font-serif text-sm font-bold text-text-primary">
                {currentRole === "ADMIN"
                  ? "System Sweep Jobs, Delivery Rates & Demo Clock"
                  : currentRole === "INSTITUTION"
                    ? "My Statutory Deadlines, Undertakings & Lease Expiry"
                    : "EVC Calendar Strip & Undertaking / Document Alerts"}
              </h3>
            </div>
          </div>

          {currentRole === "ADMIN" ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded-xs border border-border bg-surface p-2.5">
                <span>Hourly DueItem SLA Sweep Worker</span>
                <span className="font-mono font-bold text-sla-ontrack">
                  HEALTHY (SKIP LOCKED • 142ms)
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xs border border-border bg-surface p-2.5">
                <span>Transactional Outbox Dispatcher</span>
                <span className="font-mono font-bold text-sla-ontrack">
                  99.4% Delivered (SSE + Mailpit + SMS)
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xs border border-border bg-surface p-2.5">
                <span>Analytics Short-TTL Scope Cache</span>
                <span className="font-mono font-bold text-brand">
                  TTL 15s • Avg Query 18ms (&lt;300ms SLA)
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              <div className="rounded-xs border border-border bg-surface p-2.5">
                <div className="font-semibold text-text-primary">
                  Upcoming EVC Inspections & Pending Reports
                </div>
                <div className="mt-1 flex flex-wrap gap-2 font-mono text-[11px]">
                  <span className="rounded-xs bg-surface-sunken px-2 py-0.5">
                    SCHEDULED:{" "}
                    {
                      analytics.drilldownCases.filter(
                        (c) => c.evcStatus === "SCHEDULED",
                      ).length
                    }
                  </span>
                  <span className="rounded-xs bg-sla-duesoon-bg px-2 py-0.5 text-sla-duesoon">
                    VISIT_DONE (Awaiting Report):{" "}
                    {
                      analytics.drilldownCases.filter(
                        (c) => c.evcStatus === "VISIT_DONE",
                      ).length
                    }
                  </span>
                </div>
              </div>

              <div className="rounded-xs border border-border bg-surface p-2.5">
                <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                  <FileWarning className="h-3.5 w-3.5 text-sla-overdue" />
                  <span>Undertaking & Tracked Document Expiry Alerts</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 font-mono text-[11px]">
                  <span className="rounded-xs bg-sla-overdue-bg px-2 py-0.5 text-sla-overdue">
                    Overdue Undertakings:{" "}
                    {
                      analytics.drilldownCases.filter(
                        (c) => c.undertakingStatus === "OVERDUE",
                      ).length
                    }
                  </span>
                  <span className="rounded-xs bg-sla-duesoon-bg px-2 py-0.5 text-sla-duesoon">
                    Expiring Leases (&lt;30d):{" "}
                    {
                      analytics.drilldownCases.filter(
                        (c) => c.documentExpiryDays <= 30,
                      ).length
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drill-Down Filtered Case List Table */}
      <section
        aria-label="Drill-Down Case List"
        data-testid="dashboard-drilldown-section"
        className="rounded-sm border border-border bg-surface-raised p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
          <div>
            <h2 className="font-serif text-sm font-bold text-text-primary">
              {locale === "hi"
                ? `ड्रिल-डाउन मामला सूची (${analytics.totalFilteredCount} मामले)`
                : `Drill-Down Filtered Case List (${analytics.totalFilteredCount} Matching Cases)`}
            </h2>
            <p className="text-[11px] text-text-muted">
              {locale === "hi"
                ? "किसी भी चार्ट तत्व पर क्लिक करने से यह सूची और URL तुरंत अपडेट हो जाते हैं।"
                : "Clicking any ECharts bar or funnel element filters this case table and persists parameters in the URL."}
            </p>
          </div>
          <div
            data-testid="active-url-filters-badge"
            className="font-mono text-[11px] text-brand"
          >
            Scope: {currentRole} • Stage: {filters.stage ?? "ALL"} • Ageing:{" "}
            {filters.ageingBucket ?? "ALL"} • SLA: {filters.slaState ?? "ALL"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table
            data-testid="dashboard-drilldown-table"
            className="w-full border-collapse text-left text-xs"
          >
            <thead>
              <tr className="border-b border-border bg-surface-sunken text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                <th className="px-3 py-2">Application Ref</th>
                <th className="px-3 py-2">Institution</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Assigned Officer</th>
                <th className="px-3 py-2 text-right">Working Days</th>
                <th className="px-3 py-2">SLA Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {analytics.drilldownCases.map((c) => (
                <tr
                  key={c.id}
                  data-testid={`drilldown-row-${c.applicationRef}`}
                  className="bg-surface hover:bg-surface-sunken"
                >
                  <td className="px-3 py-2 font-mono font-semibold text-brand">
                    {c.applicationRef}
                  </td>
                  <td className="px-3 py-2 font-medium text-text-primary">
                    {c.institutionName}
                  </td>
                  <td className="px-3 py-2 font-mono">{c.region}</td>
                  <td className="px-3 py-2">
                    <StatusChip
                      status={
                        c.stage === "APPROVED"
                          ? "APPROVED"
                          : c.stage === "SUBMITTED"
                            ? "SUBMITTED"
                            : "UNDER_SCRUTINY"
                      }
                      customLabel={c.stage}
                    />
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {c.assignedOfficerName}
                  </td>
                  <td className="tabular-nums-data px-3 py-2 text-right font-mono font-bold">
                    {c.ageingWorkingDays}d / {c.targetWorkingDays}d
                  </td>
                  <td className="px-3 py-2">
                    <SlaBadge
                      state={c.slaState}
                      detail={`${c.targetWorkingDays - c.ageingWorkingDays}d`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function DashboardsPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="p-6 text-xs text-text-muted">
            Loading Statutory Analytics Dashboards...
          </div>
        }
      >
        <DashboardsContent />
      </Suspense>
    </AppShell>
  );
}
