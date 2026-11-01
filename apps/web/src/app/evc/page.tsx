"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarClock,
  Table2,
  Kanban,
  CalendarDays,
  ShieldAlert,
  CheckCircle2,
  UserCheck,
  FileUp,
  RotateCcw,
  Sparkles,
  X,
  Scale,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { AdvisoryBanner } from "@/components/ui/advisory-banner";
import { SlaBadge } from "@/components/ui/sla-badge";
import { useApp } from "@/lib/app-context";
import {
  getEvcSnapshot,
  subscribeEvcStore,
  proposePanelsForEvcCase,
  confirmEvcPanelAndDate,
  rescheduleEvcCase,
  markEvcVisitDone,
  submitEvcVisitReportAndAdvanceStage,
  STATUTORY_EVC_COMMITTEE_NOTICE_EN,
  STATUTORY_EVC_COMMITTEE_NOTICE_HI,
  type EvcCaseStatus,
} from "@/lib/evc-client";

const KANBAN_COLUMNS: EvcCaseStatus[] = [
  "QUEUED",
  "PANEL_PROPOSED",
  "SCHEDULED",
  "VISIT_DONE",
  "REPORT_ACCEPTED",
  "DEFERRED",
];

const MAY_2026_DAYS = Array.from({ length: 31 }, (_, i) => {
  const dayNum = i + 1;
  const iso = `2026-05-${dayNum.toString().padStart(2, "0")}`;
  return { dayNum, iso };
});

export default function EvcWorkspacePage() {
  const { locale, user } = useApp();
  const [store, setStore] = useState(() => getEvcSnapshot());
  const [viewMode, setViewMode] = useState<"TABLE" | "KANBAN" | "CALENDAR">(
    "TABLE",
  );
  const [selectedCaseId, setSelectedCaseId] = useState<string>("evc-case-001");
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedDateInput, setSelectedDateInput] =
    useState<string>("2026-05-14");
  const [rescheduleReason, setRescheduleReason] = useState<string>(
    "Rescheduled by +2 days due to State University examination centre allocation.",
  );
  const [reportSummary, setReportSummary] = useState<string>(
    "Infrastructure, AI GPU compute cluster, and faculty cadre verified on-site.",
  );
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  useEffect(() => {
    return subscribeEvcStore(() => {
      setStore({ ...getEvcSnapshot() });
    });
  }, []);

  const selectedCase =
    store.cases.find((c) => c.id === selectedCaseId) || store.cases[0];

  const handleOpenSchedulingDrawer = (caseId: string) => {
    setSelectedCaseId(caseId);
    setDrawerOpen(true);
  };

  const handleConfirmPanel = (panelId: string) => {
    if (!selectedCase) return;
    confirmEvcPanelAndDate(
      selectedCase.id,
      panelId,
      selectedDateInput,
      user?.role || "REGIONAL_OFFICER",
    );
    setFeedbackBanner(
      `Confirmed conflict-free panel for ${selectedCase.applicationRef} on ${selectedDateInput} (audited, EVC_SCHEDULING closed).`,
    );
  };

  const handleReschedule = () => {
    if (!selectedCase || !rescheduleReason.trim()) return;
    rescheduleEvcCase(
      selectedCase.id,
      selectedDateInput,
      rescheduleReason,
      user?.role || "REGIONAL_OFFICER",
    );
    setFeedbackBanner(
      `Rescheduled ${selectedCase.applicationRef} to ${selectedDateInput} with reason and updated DueItem(EVC_COMPLETION).`,
    );
  };

  const handleMarkVisitDone = () => {
    if (!selectedCase) return;
    markEvcVisitDone(selectedCase.id);
    setFeedbackBanner(
      `Marked visit done for ${selectedCase.applicationRef}; report grace deadline started.`,
    );
  };

  const handleUploadReport = () => {
    if (!selectedCase) return;
    submitEvcVisitReportAndAdvanceStage(selectedCase.id, {
      reportFileId: `DOC-EVC-REPORT-${selectedCase.caseNumber}.pdf`,
      summary: reportSummary,
      observations: [
        "All laboratory equipment and computing nodes verified",
        "Faculty appointments and biometric attendance verified",
      ],
    });
    setFeedbackBanner(
      `Uploaded EVC visit report for ${selectedCase.applicationRef}. Committee stage (SAC_SHC) continued automatically.`,
    );
  };

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Statutory Notice Banner: "Inspection findings are decided by the committee" */}
        <div
          role="region"
          aria-label="Statutory Committee Supremacy Notice"
          data-testid="evc-committee-notice"
          className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-brand bg-surface-raised px-4 py-2.5"
        >
          <div className="flex items-center gap-2.5">
            <Scale className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <span className="font-serif text-xs font-bold uppercase tracking-wider text-brand">
                STATUTORY MANDATE:{" "}
              </span>
              <span className="font-serif text-sm font-bold text-text-primary">
                {locale === "hi"
                  ? STATUTORY_EVC_COMMITTEE_NOTICE_HI
                  : STATUTORY_EVC_COMMITTEE_NOTICE_EN}
              </span>
            </div>
          </div>
          <span className="rounded-xs border border-border bg-surface-sunken px-2 py-0.5 font-mono text-[10px] font-semibold text-text-muted">
            ADVISORY PANEL PROPOSALS • HUMAN CONFIRMATION REQUIRED
          </span>
        </div>

        {feedbackBanner && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xs border border-sla-ontrack bg-surface-raised px-3 py-2 text-xs font-semibold text-sla-ontrack"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{feedbackBanner}</span>
            </span>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-[11px] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header & View Mode Switcher (Table / Kanban / Month Calendar) */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-text-primary">
              {locale === "hi"
                ? "विशेषज्ञ दौरा समिति (EVC) कतार, पैनल आवंटन और कैलेंडर"
                : "Expert Visit Committee (EVC) Queue, Panel Allocation & Month Calendar"}
            </h1>
            <p className="mt-0.5 text-xs text-text-muted">
              Stricter configurable timelines for New Institutions (5d
              scheduling / 12d completion — TODO(APH-VERIFY)),
              Conflict-of-Interest disqualification, and Phase 6 escalation
              alerts.
            </p>
          </div>

          <div className="flex items-center gap-1.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "TABLE"}
              onClick={() => setViewMode("TABLE")}
              data-testid="evc-view-table-btn"
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                viewMode === "TABLE"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              <span>Queue Table</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "KANBAN"}
              onClick={() => setViewMode("KANBAN")}
              data-testid="evc-view-kanban-btn"
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                viewMode === "KANBAN"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban Board</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "CALENDAR"}
              onClick={() => setViewMode("CALENDAR")}
              data-testid="evc-view-calendar-btn"
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                viewMode === "CALENDAR"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Month Calendar (May 2026)</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: EVC Queue Table */}
        {viewMode === "TABLE" && (
          <div className="overflow-x-auto rounded-sm border border-border bg-surface-raised">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2.5">Case & Dossier ID</th>
                  <th className="px-3 py-2.5">Institution & Category</th>
                  <th className="px-3 py-2.5">Region</th>
                  <th className="px-3 py-2.5">EVC Status & Stage</th>
                  <th className="px-3 py-2.5">
                    DueItems (Scheduling / Completion)
                  </th>
                  <th className="px-3 py-2.5">Scheduled Visit Date</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {store.cases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedCase?.id === c.id
                        ? "bg-surface-sunken"
                        : "bg-surface-raised hover:bg-surface"
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-text-primary">
                      <div>{c.caseNumber}</div>
                      <div className="text-[10px] text-text-muted">
                        {c.applicationRef}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-text-primary">
                        {c.institutionName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-text-muted">
                        {c.isNewInstitution ? (
                          <span className="rounded-xs border border-sla-duesoon bg-surface px-1.5 py-0.5 font-mono font-bold text-sla-duesoon">
                            NEW INSTITUTION (5d/12d SLA)
                          </span>
                        ) : (
                          <span className="rounded-xs border border-border bg-surface px-1.5 py-0.5 font-mono">
                            EXISTING (10d/21d SLA)
                          </span>
                        )}
                        <span>• {c.programStream}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs font-bold text-brand">
                      {c.region}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-xs border border-brand bg-brand px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-on">
                        {c.status}
                      </span>
                      <div className="mt-0.5 font-mono text-[10px] text-text-muted">
                        Stage: {c.workflowStage}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-mono text-[10px] text-text-muted">
                          SCHED ({c.schedulingDueAt}):
                        </span>
                        {c.schedulingDueStatus === "CLOSED" ? (
                          <span className="font-mono text-[10px] font-bold text-sla-ontrack">
                            CLOSED
                          </span>
                        ) : (
                          <SlaBadge state={c.schedulingDueStatus} />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-mono text-[10px] text-text-muted">
                          COMPL ({c.completionDueAt}):
                        </span>
                        {c.completionDueStatus === "CLOSED" ? (
                          <span className="font-mono text-[10px] font-bold text-sla-ontrack">
                            CLOSED
                          </span>
                        ) : (
                          <SlaBadge state={c.completionDueStatus} />
                        )}
                      </div>
                    </td>
                    <td className="tabular-nums-data px-3 py-2.5 font-mono text-xs text-text-primary">
                      {c.scheduledDate || "Unscheduled"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSchedulingDrawer(c.id);
                        }}
                        data-testid={`open-scheduling-drawer-${c.id}`}
                        className="inline-flex items-center gap-1 rounded-xs border border-brand bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-on hover:bg-brand-hover"
                      >
                        <CalendarClock className="h-3 w-3" />
                        <span>Schedule / Panels</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: EVC Kanban Board */}
        {viewMode === "KANBAN" && (
          <div
            data-testid="evc-kanban-board"
            className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6"
          >
            {KANBAN_COLUMNS.map((colStatus) => {
              const items = store.cases.filter((c) => c.status === colStatus);
              return (
                <div
                  key={colStatus}
                  className="flex flex-col rounded-sm border border-border bg-surface-sunken p-2.5"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-border pb-1.5">
                    <span className="font-mono text-[11px] font-bold text-text-primary">
                      {colStatus}
                    </span>
                    <span className="tabular-nums-data rounded-xs border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedCaseId(item.id)}
                        className="cursor-pointer rounded-xs border border-border bg-surface-raised p-2.5 text-xs shadow-xs hover:border-brand"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] text-text-muted">
                          <span>{item.caseNumber}</span>
                          <span className="font-bold text-brand">
                            {item.region}
                          </span>
                        </div>
                        <div className="mt-1 font-semibold text-text-primary leading-snug">
                          {item.institutionName}
                        </div>
                        {item.isNewInstitution && (
                          <div className="mt-1 inline-block rounded-xs border border-sla-duesoon px-1 py-0.5 font-mono text-[9px] font-bold text-sla-duesoon">
                            NEW INSTITUTION
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between border-t border-border pt-1.5 text-[10px]">
                          <span className="font-mono text-text-muted">
                            {item.scheduledDate ||
                              `Due: ${item.schedulingDueAt}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSchedulingDrawer(item.id);
                            }}
                            className="font-semibold text-brand hover:underline"
                          >
                            Panels →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 3: Month Calendar (May 2026) */}
        {viewMode === "CALENDAR" && (
          <div
            data-testid="evc-month-calendar"
            className="rounded-sm border border-border bg-surface-raised p-4"
          >
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
              <h2 className="font-serif text-sm font-bold text-text-primary">
                May 2026 — EVC Inspection & Deadline Calendar (Asia/Kolkata)
              </h2>
              <span className="font-mono text-xs text-text-muted">
                Click any scheduled case chip to inspect dossier
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div
                  key={d}
                  className="border-b border-border py-1 text-center font-mono text-[11px] font-bold uppercase text-text-muted"
                >
                  {d}
                </div>
              ))}
              {MAY_2026_DAYS.map(({ dayNum, iso }) => {
                const visitsOnDay = store.cases.filter(
                  (c) => c.scheduledDate === iso || c.schedulingDueAt === iso,
                );
                return (
                  <div
                    key={iso}
                    className="min-h-[84px] rounded-xs border border-border bg-surface p-1.5 text-xs"
                  >
                    <div className="tabular-nums-data font-mono text-[10px] font-semibold text-text-muted">
                      {dayNum} May
                    </div>
                    <div className="mt-1 space-y-1">
                      {visitsOnDay.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedCaseId(v.id);
                            setDrawerOpen(true);
                          }}
                          className="block w-full truncate rounded-xs border border-brand bg-brand px-1.5 py-0.5 text-left font-mono text-[10px] font-semibold text-brand-on"
                        >
                          {v.caseNumber} ({v.region})
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Case Detail & Phase 6 Escalation Alerts Panel */}
        {selectedCase && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Case Detail Dossier (2 cols) */}
            <section className="space-y-4 rounded-sm border border-border bg-surface-raised p-4 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand">
                      {selectedCase.caseNumber} • {selectedCase.applicationRef}
                    </span>
                    <span className="rounded-xs border border-brand bg-brand px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-on">
                      {selectedCase.status}
                    </span>
                    <span className="rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] font-semibold text-text-primary">
                      Workflow Stage: {selectedCase.workflowStage}
                    </span>
                  </div>
                  <h2 className="mt-1 font-serif text-base font-bold text-text-primary">
                    {selectedCase.institutionName}
                  </h2>
                  <p className="text-xs text-text-muted">
                    Parent Trust/Society: {selectedCase.trustOrSociety} •
                    Program: {selectedCase.programStream}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenSchedulingDrawer(selectedCase.id)}
                  className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-3 py-1.5 text-xs font-semibold text-brand-on hover:bg-brand-hover"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Open Scheduling & CoI Drawer</span>
                </button>
              </div>

              {/* Lifecycle Controls: Reschedule with Reason, Mark Visit Done, Upload Report */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2 rounded-xs border border-border bg-surface p-3 text-xs">
                  <div className="font-serif font-bold text-text-primary">
                    Reschedule Inspection (Updates DueItems)
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-muted">
                      New Inspection Date
                    </label>
                    <input
                      type="date"
                      value={selectedDateInput}
                      onChange={(e) => setSelectedDateInput(e.target.value)}
                      className="mt-0.5 w-full rounded-xs border border-border bg-surface-raised px-2 py-1 font-mono text-xs text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-muted">
                      Mandatory Statutory Reason
                    </label>
                    <input
                      type="text"
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      className="mt-0.5 w-full rounded-xs border border-border bg-surface-raised px-2 py-1 text-xs text-text-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleReschedule}
                    className="inline-flex items-center gap-1.5 rounded-xs border border-border bg-surface-raised px-2.5 py-1 text-xs font-semibold text-text-primary hover:border-brand"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-brand" />
                    <span>Reschedule & Recalculate DueItems</span>
                  </button>
                </div>

                <div className="space-y-2 rounded-xs border border-border bg-surface p-3 text-xs">
                  <div className="font-serif font-bold text-text-primary">
                    Visit Completion & Report Upload (Auto-Advances Committee
                    Stage)
                  </div>
                  <p className="text-[11px] text-text-muted">
                    {STATUTORY_EVC_COMMITTEE_NOTICE_EN}. Uploading the visit
                    report transitions the application to{" "}
                    <span className="font-mono font-semibold text-brand">
                      SAC_SHC
                    </span>
                    .
                  </p>
                  <input
                    type="text"
                    value={reportSummary}
                    onChange={(e) => setReportSummary(e.target.value)}
                    className="w-full rounded-xs border border-border bg-surface-raised px-2 py-1 text-xs text-text-primary"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleMarkVisitDone}
                      className="inline-flex items-center gap-1 rounded-xs border border-border bg-surface-raised px-2.5 py-1 text-xs font-semibold text-text-primary hover:border-brand"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-brand" />
                      <span>1. Mark Visit Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadReport}
                      data-testid="upload-evc-report-btn"
                      className="inline-flex items-center gap-1 rounded-xs border border-brand bg-brand px-2.5 py-1 text-xs font-semibold text-brand-on hover:bg-brand-hover"
                    >
                      <FileUp className="h-3.5 w-3.5" />
                      <span>2. Upload Report & Continue Committee Stage</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Phase 6 Escalation Alerts Log (1 col) */}
            <section className="space-y-3 rounded-sm border border-border bg-surface-raised p-4">
              <div className="border-b border-border pb-2">
                <h2 className="font-serif text-sm font-bold text-text-primary">
                  Phase 6 EVC Escalation Ladder Alerts
                </h2>
                <p className="text-[11px] text-text-muted">
                  EVC Approaching • Unscheduled Beyond Threshold • Visit Done
                  Report Overdue
                </p>
              </div>
              <div className="space-y-2">
                {store.alerts.map((al) => (
                  <div
                    key={al.id}
                    className="rounded-xs border border-border bg-surface p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-xs border border-brand bg-brand px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-on">
                        L{al.escalationLevel} • {al.alertKind}
                      </span>
                      <span className="font-mono text-[10px] text-text-muted">
                        {al.firedAt.slice(0, 10)}
                      </span>
                    </div>
                    <div className="font-semibold text-text-primary">
                      {al.applicationRef} — {al.institutionName}
                    </div>
                    <p className="text-[11px] text-text-muted">
                      {al.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Slide-Over Scheduling Drawer with Proposed Panels & CoI Disqualification Reasons */}
        {drawerOpen && selectedCase && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="EVC Panel Proposal & Conflict-of-Interest Drawer"
            data-testid="evc-scheduling-drawer"
            className="fixed inset-0 z-50 flex justify-end bg-black/65"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
          >
            <div
              className="flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-border bg-white p-5 shadow-overlay"
              style={{ backgroundColor: "#ffffff" }}
            >
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-brand">
                    {selectedCase.caseNumber} • {selectedCase.region}
                  </span>
                  <h2 className="font-serif text-lg font-bold text-text-primary">
                    EVC Panel Proposal & Conflict-of-Interest Screening
                  </h2>
                  <p className="text-xs text-text-muted">
                    {selectedCase.institutionName} (
                    {selectedCase.trustOrSociety})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xs border border-border p-1 text-text-muted hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <AdvisoryBanner
                  title="ADVISORY PANEL ALLOCATION — HUMAN CONFIRMATION REQUIRED"
                  ruleId="RULE-EVC-PANEL-ALLOC-01"
                  rationale={`Proposals ranked by region (${selectedCase.region}), expertise (${selectedCase.requiredExpertiseTags.join(", ")}), lowest active workload, and availability. ${STATUTORY_EVC_COMMITTEE_NOTICE_EN}.`}
                />

                {selectedCase.proposedPanels.length === 0 && (
                  <button
                    type="button"
                    onClick={() => proposePanelsForEvcCase(selectedCase.id)}
                    className="rounded-xs border border-brand bg-brand px-3 py-1.5 text-xs font-semibold text-brand-on"
                  >
                    Generate ADVISORY Panel Proposals
                  </button>
                )}

                {/* Proposed Conflict-Free Panels */}
                <div className="space-y-3">
                  <h3 className="font-serif text-sm font-bold text-text-primary">
                    1. Proposed Conflict-Free 3-Member Panels (ADVISORY)
                  </h3>
                  {selectedCase.proposedPanels.map((pnl) => (
                    <div
                      key={pnl.id}
                      className="rounded-xs border border-border bg-surface p-3 text-xs space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-brand">
                            {pnl.panelCode}
                          </span>
                          <span className="ml-2 rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                            Composite Score: {pnl.compositeRankScore}/100
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleConfirmPanel(pnl.id)}
                          data-testid={`confirm-panel-btn-${pnl.id}`}
                          className="rounded-xs border border-brand bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-on hover:bg-brand-hover"
                        >
                          Confirm Panel & Schedule ({selectedDateInput})
                        </button>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        {pnl.rationaleSummary}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {pnl.members.map((m) => (
                          <div
                            key={m.expertUserId}
                            className="rounded-xs border border-border bg-surface-raised p-2"
                          >
                            <div className="font-mono text-[10px] font-bold text-brand">
                              {m.role}
                            </div>
                            <div className="font-semibold text-text-primary">
                              {m.fullName}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              {m.parentInstitutionName}
                            </div>
                            <div className="mt-1 font-mono text-[10px] text-text-muted">
                              Workload: {m.activeWorkloadCount}/
                              {m.maxWorkloadCap} active
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rejected Experts (Conflict of Interest Screening) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-sla-overdue" />
                    <h3 className="font-serif text-sm font-bold text-text-primary">
                      2. Rejected Candidates — Conflict of Interest (CoI)
                      Disqualifications ({selectedCase.rejectedExperts.length})
                    </h3>
                  </div>
                  {selectedCase.rejectedExperts.map((rej) => (
                    <div
                      key={rej.expertUserId}
                      className="rounded-xs border border-sla-overdue/40 bg-surface p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary">
                          {rej.fullName} ({rej.parentInstitutionName})
                        </span>
                        <span className="rounded-xs border border-sla-overdue bg-sla-overdue px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-on">
                          {rej.conflictType}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        {rej.reason}
                      </p>
                      <div className="font-mono text-[10px] text-text-muted">
                        Rule: {rej.ruleCited}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
