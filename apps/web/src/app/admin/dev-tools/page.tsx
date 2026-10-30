"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Wrench,
  Sliders,
  Activity,
  CheckCircle2,
  AlertOctagon,
  FileSpreadsheet,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { AdvisoryBanner } from "@/components/ui/advisory-banner";
import { useApp } from "@/lib/app-context";
import {
  getHeroFeaturesSnapshot,
  subscribeHeroFeaturesStore,
  tamperOneAuditRowInStore,
  verifyAuditChainInStore,
  repairTamperDemoStateInStore,
  calculateComplianceHealthScore,
  updateComplianceWeightsInStore,
  simulateRuleChangeImpactInStore,
  publishDraftVersionInStore,
} from "@/lib/hero-features-client";

export default function AdminDevToolsPage() {
  const { locale } = useApp();
  const [store, setStore] = useState(() => getHeroFeaturesSnapshot());
  const [activeTab, setActiveTab] = useState<
    "TAMPER_DEMO" | "COMPLIANCE_SCORE" | "IMPACT_SIMULATOR"
  >("TAMPER_DEMO");

  // Compliance Score state
  const [selectedInstitutionId, setSelectedInstitutionId] =
    useState<string>("inst-001");

  // Rule-Change Impact Simulator Draft state
  const [draftScrutinyDays, setDraftScrutinyDays] = useState<number>(10);
  const [draftEvcDays, setDraftEvcDays] = useState<number>(8);
  const [draftSacDays, setDraftSacDays] = useState<number>(8);
  const [draftL2Delay, setDraftL2Delay] = useState<number>(2);
  const [versionNameInput, setVersionNameInput] = useState<string>(
    "APH 2024-27 Draft Cycle v2.0",
  );
  const [publishReasonInput, setPublishReasonInput] = useState<string>("");
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeHeroFeaturesStore(() => {
      setStore({ ...getHeroFeaturesSnapshot() });
    });
  }, []);

  const isProductionBuild = process.env.NODE_ENV === "production";

  const complianceReport = calculateComplianceHealthScore(
    selectedInstitutionId,
  );

  const simulationResult = simulateRuleChangeImpactInStore({
    stageTimelinesWorkingDays: {
      SCRUTINY: draftScrutinyDays,
      EVC: draftEvcDays,
      SAC_SHC: draftSacDays,
    },
    escalationDelaysWorkingDays: {
      level1DelayDays: 1,
      level2DelayDays: draftL2Delay,
      level3DelayDays: 4,
    },
  });

  const handlePublishDraft = () => {
    try {
      setPublishError(null);
      publishDraftVersionInStore({
        versionName: versionNameInput,
        reason: publishReasonInput,
      });
      setPublishReasonInput("");
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : "Reason is required",
      );
    }
  };

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-surface-raised px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-brand" />
              <h1 className="font-serif text-lg font-bold text-text-primary">
                {locale === "hi"
                  ? "वैधानिक डेव टूल्स, छेड़छाड़ डेमो और प्रभाव सिम्युलेटर"
                  : "Statutory Dev Tools, Audit Tamper Demo & Impact Simulator"}
              </h1>
              <span
                data-testid="compliance-score-advisory-badge"
                className="rounded-xs border border-brand bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-brand"
              >
                ADVISORY
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              SHA-256 Hash-Chain Forensic Verifier • Transparent Institutional
              Compliance Health Score • Read-Only Rule-Change Impact Simulator
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                {
                  id: "TAMPER_DEMO",
                  labelEn: "1. Audit Tamper Demo",
                  labelHi: "1. ऑडिट छेड़छाड़ डेमो",
                },
                {
                  id: "COMPLIANCE_SCORE",
                  labelEn: "2. Compliance Health Score",
                  labelHi: "2. अनुपालन स्वास्थ्य स्कोर",
                },
                {
                  id: "IMPACT_SIMULATOR",
                  labelEn: "3. Rule-Change Impact Simulator",
                  labelHi: "3. नियम-परिवर्तन सिम्युलेटर",
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                data-testid={`hero-tab-${tab.id}`}
                className={`rounded-xs border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-brand bg-brand text-brand-on"
                    : "border-border bg-surface text-text-primary hover:border-brand"
                }`}
              >
                {locale === "hi" ? tab.labelHi : tab.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* ================================================================
         * TAB 1: TAMPER DEMO (DISABLED IN PRODUCTION BUILDS)
         * ================================================================ */}
        {activeTab === "TAMPER_DEMO" && (
          <section
            aria-label="Audit Ledger Tamper Demo"
            data-testid="tamper-demo-section"
            className="space-y-4 rounded-sm border border-border bg-surface-raised p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="font-serif text-sm font-bold text-text-primary">
                  SHA-256 Hash-Chained Audit Ledger (APP-2026-TAMPER-DEMO)
                </h2>
                <p className="text-xs text-text-muted">
                  Simulate an unauthorised disk/SQL mutation on one audit row,
                  then run Verify Chain to pinpoint the exact broken link.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isProductionBuild}
                  onClick={() => tamperOneAuditRowInStore(1)}
                  data-testid="tamper-one-row-btn"
                  className="inline-flex items-center gap-1.5 rounded-xs border border-sla-overdue bg-sla-overdue px-3 py-1.5 text-xs font-bold text-brand-on disabled:opacity-50"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Tamper One Audit Row (#1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => verifyAuditChainInStore()}
                  data-testid="verify-chain-btn"
                  className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-3 py-1.5 text-xs font-bold text-brand-on"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verify Chain</span>
                </button>

                <button
                  type="button"
                  onClick={() => repairTamperDemoStateInStore()}
                  data-testid="repair-demo-state-btn"
                  className="inline-flex items-center gap-1.5 rounded-xs border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-brand"
                >
                  <Wrench className="h-3.5 w-3.5 text-brand" />
                  <span>Repair Demo State</span>
                </button>
              </div>
            </div>

            {/* Verification Status Banner */}
            {store.lastVerification.valid ? (
              <div
                data-testid="chain-valid-banner"
                className="flex items-center gap-2 rounded-xs border border-sla-ontrack bg-surface p-3 text-xs font-semibold text-sla-ontrack"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  HASH CHAIN VERIFIED INTACT ({store.lastVerification.totalEntries}{" "}
                  entries from GENESIS). Zero tampering detected.
                </span>
              </div>
            ) : (
              <div
                data-testid="broken-link-report"
                className="space-y-1.5 rounded-xs border-2 border-sla-overdue bg-surface p-3 text-xs"
              >
                <div className="flex items-center gap-2 font-bold text-sla-overdue">
                  <AlertOctagon className="h-4 w-4 shrink-0" />
                  <span>
                    CRITICAL: BROKEN HASH CHAIN DETECTED AT LINK #
                    {store.lastVerification.firstBrokenLink?.index} (
                    {store.lastVerification.firstBrokenLink?.entryId})
                  </span>
                </div>
                <p className="text-text-primary">
                  {store.lastVerification.firstBrokenLink?.description}
                </p>
                <div className="grid grid-cols-1 gap-2 pt-1 font-mono text-[11px] sm:grid-cols-2">
                  <div className="rounded-xs bg-surface-sunken p-2">
                    <span className="text-text-muted">Stored Row Hash: </span>
                    <span className="break-all font-bold text-text-primary">
                      {store.lastVerification.firstBrokenLink?.actualHash}
                    </span>
                  </div>
                  <div className="rounded-xs bg-surface-sunken p-2">
                    <span className="text-text-muted">
                      Recomputed SHA-256:{" "}
                    </span>
                    <span className="break-all font-bold text-sla-overdue">
                      {store.lastVerification.firstBrokenLink?.expectedHash}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Chain Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-[10px] font-semibold uppercase text-text-muted">
                    <th className="px-3 py-2">Index</th>
                    <th className="px-3 py-2">Action & Actor</th>
                    <th className="px-3 py-2">Rationale / Payload</th>
                    <th className="px-3 py-2">Prev Hash</th>
                    <th className="px-3 py-2">Row SHA-256 Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {store.tamperRows.map((row) => {
                    const isRowBroken = row.hash !== row.expectedHash;
                    return (
                      <tr
                        key={row.id}
                        data-testid={`tamper-row-${row.index}`}
                        className={
                          isRowBroken
                            ? "bg-sla-overdue/10 font-semibold"
                            : "bg-surface"
                        }
                      >
                        <td className="px-3 py-2 font-mono">#{row.index}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-text-primary">
                            {row.action}
                          </div>
                          <div className="font-mono text-[10px] text-text-muted">
                            {row.actorId} ({row.actorRole})
                          </div>
                        </td>
                        <td className="px-3 py-2 text-text-primary">
                          {row.rationale}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-text-muted">
                          {row.prevHash.slice(0, 14)}...
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px]">
                          <span
                            className={
                              isRowBroken
                                ? "font-bold text-sla-overdue"
                                : "text-sla-ontrack"
                            }
                          >
                            {row.hash.slice(0, 18)}...
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ================================================================
         * TAB 2: COMPLIANCE HEALTH SCORE (WEIGHTED RULE-BASED, ADVISORY)
         * ================================================================ */}
        {activeTab === "COMPLIANCE_SCORE" && (
          <section
            aria-label="Institutional Compliance Health Score"
            data-testid="compliance-score-section"
            className="space-y-4"
          >
            <AdvisoryBanner
              ruleId="RULE-COMP-HEALTH-2026"
              title="ADVISORY COMPLIANCE HEALTH SCORE"
              rationale="This transparent weighted rule-based score assists statutory scrutiny committees by highlighting overdue undertakings, expired documents, slow deficiency responses, and missed deadlines. It never triggers autonomous approvals or rejections."
              confidenceScore={complianceReport.finalScore}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Score Summary & Institution Selector */}
              <div className="space-y-3 rounded-sm border border-border bg-surface-raised p-4">
                <div>
                  <label
                    htmlFor="inst-score-select"
                    className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted"
                  >
                    Select Institution Dossier
                  </label>
                  <select
                    id="inst-score-select"
                    data-testid="compliance-inst-select"
                    value={selectedInstitutionId}
                    onChange={(e) => setSelectedInstitutionId(e.target.value)}
                    className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                  >
                    <option value="inst-001">
                      Walchand College of Engineering, Sangli (inst-001)
                    </option>
                    <option value="inst-002">
                      COEP Technological University, Pune (inst-002)
                    </option>
                    <option value="inst-clean">
                      VJTI Matunga, Mumbai (inst-clean • 100/100)
                    </option>
                  </select>
                </div>

                <div className="rounded-xs border border-border bg-surface p-4 text-center">
                  <div className="font-mono text-[10px] font-bold uppercase text-brand">
                    {complianceReport.advisoryLabel} HEALTH SCORE
                  </div>
                  <div
                    data-testid="compliance-final-score"
                    className="tabular-nums-data my-1 font-mono text-4xl font-bold text-text-primary"
                  >
                    {complianceReport.finalScore} / 100
                  </div>
                  <div className="font-mono text-xs font-semibold text-text-secondary">
                    Band: {complianceReport.riskBand} (-
                    {complianceReport.totalPointsDeducted} pts deducted)
                  </div>
                </div>

                {/* Configurable Weights Editor */}
                <div className="space-y-2 border-t border-border pt-3 text-xs">
                  <div className="flex items-center gap-1.5 font-serif font-bold text-text-primary">
                    <Sliders className="h-3.5 w-3.5 text-brand" />
                    <span>Configurable Deduction Weights</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Overdue Undertaking Penalty</span>
                    <input
                      type="number"
                      aria-label="Overdue Undertaking Penalty Weight"
                      data-testid="weight-overdue-undertaking"
                      value={store.complianceWeights.overdueUndertakingPenalty}
                      onChange={(e) =>
                        updateComplianceWeightsInStore({
                          overdueUndertakingPenalty: Number(e.target.value),
                        })
                      }
                      className="w-16 rounded-xs border border-border bg-surface px-2 py-0.5 text-right font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Expired Document Penalty</span>
                    <input
                      type="number"
                      aria-label="Expired Document Penalty Weight"
                      data-testid="weight-expired-doc"
                      value={store.complianceWeights.expiredDocumentPenalty}
                      onChange={(e) =>
                        updateComplianceWeightsInStore({
                          expiredDocumentPenalty: Number(e.target.value),
                        })
                      }
                      className="w-16 rounded-xs border border-border bg-surface px-2 py-0.5 text-right font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Transparent Deduction Breakdown */}
              <div className="rounded-sm border border-border bg-surface-raised p-4 lg:col-span-2">
                <h3 className="mb-3 border-b border-border pb-2 font-serif text-sm font-bold text-text-primary">
                  Transparent Item-by-Item Deduction Breakdown (
                  {complianceReport.deductionBreakdown.length} Items)
                </h3>

                {complianceReport.deductionBreakdown.length === 0 ? (
                  <div className="rounded-xs border border-dashed border-border bg-surface p-6 text-center text-xs text-sla-ontrack">
                    100 / 100 — No overdue undertakings, expired documents, slow
                    return responses, or missed deadlines.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {complianceReport.deductionBreakdown.map((item) => (
                      <div
                        key={item.id}
                        data-testid={`deduction-item-${item.itemRef}`}
                        className="flex items-start justify-between gap-3 rounded-xs border border-border bg-surface p-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-xs bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">
                              {item.category}
                            </span>
                            <span className="font-semibold text-text-primary">
                              {item.title}
                            </span>
                          </div>
                          <p className="mt-1 text-text-secondary">
                            {item.reason}
                          </p>
                          <div className="mt-1 font-mono text-[10px] text-text-muted">
                            Ref: {item.itemRef} • {item.aphClause}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-xs bg-sla-overdue/10 px-2.5 py-1 font-mono text-sm font-bold text-sla-overdue">
                          -{item.pointsDeducted} pts
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ================================================================
         * TAB 3: RULE-CHANGE IMPACT SIMULATOR (READ-ONLY COMPARISON)
         * ================================================================ */}
        {activeTab === "IMPACT_SIMULATOR" && (
          <section
            aria-label="Rule-Change Impact Simulator"
            data-testid="impact-simulator-section"
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Draft Pipeline & Escalation Policy Controls */}
              <div className="space-y-3 rounded-sm border border-border bg-surface-raised p-4">
                <div className="border-b border-border pb-2">
                  <div className="flex items-center gap-1.5 font-serif text-sm font-bold text-text-primary">
                    <Activity className="h-4 w-4 text-brand" />
                    <span>Draft Pipeline & Policy Editor</span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Read-only simulation against {simulationResult.totalOpenCasesEvaluated}{" "}
                    open cases. Live data is never mutated.
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span>SCRUTINY Target (Active: 15d)</span>
                    <input
                      type="number"
                      aria-label="Draft Scrutiny Working Days"
                      data-testid="sim-input-scrutiny-days"
                      value={draftScrutinyDays}
                      onChange={(e) =>
                        setDraftScrutinyDays(Number(e.target.value))
                      }
                      className="w-16 rounded-xs border border-border bg-surface px-2 py-1 text-right font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>EVC Target (Active: 12d)</span>
                    <input
                      type="number"
                      aria-label="Draft EVC Working Days"
                      data-testid="sim-input-evc-days"
                      value={draftEvcDays}
                      onChange={(e) => setDraftEvcDays(Number(e.target.value))}
                      className="w-16 rounded-xs border border-border bg-surface px-2 py-1 text-right font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>SAC/SHC Target (Active: 10d)</span>
                    <input
                      type="number"
                      aria-label="Draft SAC Working Days"
                      data-testid="sim-input-sac-days"
                      value={draftSacDays}
                      onChange={(e) => setDraftSacDays(Number(e.target.value))}
                      className="w-16 rounded-xs border border-border bg-surface px-2 py-1 text-right font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span>L2 Bureau Escalation Delay (Active: 3d)</span>
                    <input
                      type="number"
                      aria-label="Draft Level 2 Escalation Delay"
                      value={draftL2Delay}
                      onChange={(e) => setDraftL2Delay(Number(e.target.value))}
                      className="w-16 rounded-xs border border-border bg-surface px-2 py-1 text-right font-mono"
                    />
                  </div>
                </div>

                {/* Publish New Version Form (Requires Reason & Audited) */}
                <div className="space-y-2 border-t border-border pt-3 text-xs">
                  <div className="font-serif font-bold text-text-primary">
                    Publish New Pipeline Version (Audited)
                  </div>
                  <input
                    type="text"
                    aria-label="Draft Version Name"
                    value={versionNameInput}
                    onChange={(e) => setVersionNameInput(e.target.value)}
                    className="w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs"
                  />
                  <textarea
                    rows={2}
                    placeholder="Mandatory statutory reason for publishing new version..."
                    aria-label="Statutory Reason for Publishing Version"
                    data-testid="publish-version-reason-input"
                    value={publishReasonInput}
                    onChange={(e) => setPublishReasonInput(e.target.value)}
                    className="w-full rounded-xs border border-border bg-surface p-2 text-xs"
                  />
                  {publishError && (
                    <div
                      data-testid="publish-version-error"
                      className="text-[11px] font-semibold text-sla-overdue"
                    >
                      {publishError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handlePublishDraft}
                    data-testid="publish-version-btn"
                    className="w-full rounded-xs border border-brand bg-brand px-3 py-1.5 text-xs font-bold text-brand-on"
                  >
                    Publish Draft Version (Append Audit Entry)
                  </button>
                </div>
              </div>

              {/* Read-Only Comparison Results */}
              <div className="space-y-4 rounded-sm border border-border bg-surface-raised p-4 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                  <div>
                    <h3 className="font-serif text-sm font-bold text-text-primary">
                      Read-Only Replay Comparison (Active vs Draft)
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      READ_ONLY_COMPARISON: true • LIVE_DATA_MUTATED: false
                    </p>
                  </div>
                  <span className="rounded-xs border border-sla-ontrack bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-sla-ontrack">
                    ZERO LIVE MUTATION
                  </span>
                </div>

                {/* Impact KPIs */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xs border border-border bg-surface p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-text-muted">
                      Active Breaches
                    </div>
                    <div className="mt-1 font-mono text-xl font-bold text-text-primary">
                      {simulationResult.activeBreachCount}
                    </div>
                  </div>
                  <div className="rounded-xs border border-border bg-surface p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-text-muted">
                      Draft Breaches
                    </div>
                    <div
                      data-testid="sim-draft-breaches"
                      className="mt-1 font-mono text-xl font-bold text-sla-overdue"
                    >
                      {simulationResult.draftBreachCount}
                    </div>
                  </div>
                  <div className="rounded-xs border border-border bg-surface p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-text-muted">
                      Newly Breaching Cases
                    </div>
                    <div
                      data-testid="sim-newly-breached-count"
                      className="mt-1 font-mono text-xl font-bold text-sla-overdue"
                    >
                      +{simulationResult.newlyBreachedCount}
                    </div>
                  </div>
                  <div className="rounded-xs border border-border bg-surface p-2.5">
                    <div className="text-[10px] font-semibold uppercase text-text-muted">
                      Extra Notifications
                    </div>
                    <div
                      data-testid="sim-extra-notifications"
                      className="mt-1 font-mono text-xl font-bold text-brand"
                    >
                      +{simulationResult.extraNotificationsCount}
                    </div>
                  </div>
                </div>

                {/* Most Affected Regions & Stages */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xs border border-border bg-surface p-3">
                    <div className="mb-2 font-serif text-xs font-bold text-text-primary">
                      Impact by Region
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {simulationResult.affectedByRegion.map((r) => (
                        <div
                          key={r.region}
                          className="flex items-center justify-between font-mono"
                        >
                          <span>{r.region}</span>
                          <span>
                            {r.activeBreaches} → {r.draftBreaches} (+
                            {r.newlyBreached} new)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xs border border-border bg-surface p-3">
                    <div className="mb-2 font-serif text-xs font-bold text-text-primary">
                      Impact by Stage
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {simulationResult.affectedByStage.map((s) => (
                        <div
                          key={s.stage}
                          className="flex items-center justify-between font-mono"
                        >
                          <span>{s.stage}</span>
                          <span>
                            +{s.newlyBreached} new ({s.activeTargetDays}d →{" "}
                            {s.draftTargetDays}d)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Published Versions Audit List */}
                <div className="border-t border-border pt-3">
                  <div className="mb-2 flex items-center gap-1.5 font-serif text-xs font-bold text-text-primary">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-brand" />
                    <span>
                      Published Pipeline Versions (
                      {store.publishedVersions.length})
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {store.publishedVersions.map((ver) => (
                      <div
                        key={ver.versionId}
                        data-testid={`published-version-${ver.versionId}`}
                        className="flex items-center justify-between rounded-xs border border-border bg-surface px-3 py-1.5"
                      >
                        <div>
                          <span className="font-mono font-bold text-brand">
                            {ver.versionId}
                          </span>{" "}
                          <span className="font-semibold">
                            {ver.versionName}
                          </span>
                          <span className="ml-2 text-text-muted">
                            — {ver.reason}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-text-muted">
                          {ver.publishedAt.slice(0, 10)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
