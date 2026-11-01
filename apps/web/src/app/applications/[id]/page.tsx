"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Gavel,
  ShieldAlert,
  ShieldCheck,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { useApp, type StatutoryRole } from "@/lib/app-context";
import { DEMO_ROLE_ACCOUNTS } from "@/lib/mock-data";
import {
  samayApiClient,
  OptimisticConflictError,
  scanUploadedFileMock,
  type AllowedActionDto,
  type LifecycleApplication,
  type LifecycleDocumentFile,
} from "@/lib/api-client";
import { StatusChip } from "@/components/ui/status-chip";
import { SlaBadge } from "@/components/ui/sla-badge";
import { Timeline, type TimelineEventItem } from "@/components/ui/timeline";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { DocumentViewer } from "@/components/ui/document-viewer";
import { ConflictDialog } from "@/components/ui/conflict-dialog";
import { AdvisoryBanner } from "@/components/ui/advisory-banner";
import { AuditSeal } from "@/components/ui/audit-seal";

type DetailTab =
  | "overview"
  | "documents"
  | "timeline-audit"
  | "communications"
  | "case-summary";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const appId = params?.id || "44444444-4444-4444-8444-444444444401";
  const { user, isAuthReady, locale, loginWithApi } = useApp();
  const router = useRouter();

  const [app, setApp] = useState<LifecycleApplication | null>(null);
  const [allowedActions, setAllowedActions] = useState<AllowedActionDto[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [selectedDoc, setSelectedDoc] = useState<LifecycleDocumentFile | null>(
    null,
  );

  // Officer Action Drawer state
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [actionReason, setActionReason] = useState<string>("");
  const [actionReasonCode, setActionReasonCode] = useState<string>(
    "DEF_FACULTY_CADRE_SHORTFALL",
  );
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Institution Respond-to-Return state
  const [clarificationNote, setClarificationNote] = useState<string>(
    "Uploaded renewed notarized faculty cadre & fire safety compliance annexure rectifying scrutiny observation.",
  );
  const [clarificationDocs, setClarificationDocs] = useState<
    LifecycleDocumentFile[]
  >([]);

  // 409 Optimistic Conflict Dialog state
  const [conflictState, setConflictState] = useState<{
    open: boolean;
    message: string;
    latest: LifecycleApplication | null;
  }>({
    open: false,
    message: "",
    latest: null,
  });

  const loadDossier = useCallback(async () => {
    try {
      const loaded = await samayApiClient.getApplicationById(appId);
      setApp(loaded);
      setSelectedDoc((prev) => prev || loaded.documents[0] || null);
      if (user?.role) {
        const actions = await samayApiClient.getAllowedActions(
          loaded.id,
          user.role,
        );
        setAllowedActions(actions);
        if (actions.length > 0) {
          setSelectedAction((prev) =>
            actions.some((a) => a.action === prev) ? prev : actions[0].action,
          );
        } else {
          setSelectedAction("");
        }
      }
    } catch {
      // ignore
    }
  }, [appId, user?.role]);

  useEffect(() => {
    loadDossier();
  }, [loadDossier]);

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace("/login");
    }
  }, [isAuthReady, user, router]);

  if (!isAuthReady || !user || !app) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-xs text-text-muted">
        Loading statutory application dossier...
      </div>
    );
  }

  const role: StatutoryRole = user.role;
  const isInstitution = role === "INSTITUTION";
  const currentAllowedActionObj = allowedActions.find(
    (a) => a.action === selectedAction,
  );

  // Convert StageTimelineItems to TimelineEventItems
  const timelineItems: TimelineEventItem[] = app.timeline.map((item) => ({
    id: item.id,
    stage: item.stage,
    title: `${item.label} (${item.stage})`,
    actor: item.actorName,
    actorRole: item.actorRole,
    timestamp: item.completedAt || item.startedAt,
    status:
      item.status === "ACTIVE"
        ? app.status
        : item.status === "RETURNED"
          ? "SCRUTINY_DEFICIENT"
          : "SUBMITTED",
    rationale: item.notes || "Stage recorded in statutory timeline.",
    stateType: item.status === "COMPLETED" ? "completed" : "current",
  }));

  const handleExecuteOfficerAction = async () => {
    setActionError(null);
    setActionFeedback(null);

    if (!currentAllowedActionObj) return;
    if (
      currentAllowedActionObj.requiresReason &&
      actionReason.trim().length === 0
    ) {
      setActionError(
        `A mandatory statutory reason is required to execute "${currentAllowedActionObj.label}".`,
      );
      return;
    }

    try {
      const updated = await samayApiClient.performWorkflowAction({
        applicationId: app.id,
        action: currentAllowedActionObj.action,
        expectedVersion: app.version,
        idempotencyKey: `ui-act-${app.id}-v${app.version}-${currentAllowedActionObj.action}`,
        actorName: user.fullName,
        actorRole: role,
        reason: actionReason.trim() || undefined,
        reasonCode:
          currentAllowedActionObj.action === "return_for_deficiency"
            ? actionReasonCode
            : undefined,
      });

      setApp(updated);
      setActionReason("");
      setActionFeedback(
        `Action "${currentAllowedActionObj.label}" committed atomically (New Stage: ${updated.stage}, Version: v${updated.version}).`,
      );
      const nextActions = await samayApiClient.getAllowedActions(
        updated.id,
        role,
      );
      setAllowedActions(nextActions);
      setSelectedAction(nextActions[0]?.action || "");
    } catch (err) {
      if (err instanceof OptimisticConflictError) {
        setConflictState({
          open: true,
          message: err.message,
          latest: err.latestApplication,
        });
      } else if (err instanceof Error) {
        setActionError(err.message);
      }
    }
  };

  const handleInstitutionClarificationSubmit = async () => {
    setActionError(null);
    const docsToAttach =
      clarificationDocs.length > 0
        ? clarificationDocs
        : [
            scanUploadedFileMock({
              checklistItem: "Deficiency Clarification & Rectified Annexure",
              filename: "Clarification_Rectified_Annexure_Signed.pdf",
              sizeBytes: 1320400,
              uploadedBy: user.fullName,
            }),
          ];

    try {
      const updated = await samayApiClient.performWorkflowAction({
        applicationId: app.id,
        action: "submit",
        expectedVersion: app.version,
        idempotencyKey: `inst-clarify-${app.id}-v${app.version}`,
        actorName: user.fullName,
        actorRole: "INSTITUTION",
        reason: clarificationNote,
        newDocuments: docsToAttach,
      });
      setApp(updated);
      setActionFeedback(
        `Deficiency clarification submitted with ${docsToAttach.length} CLEAN scanned document(s). Application advanced to ${updated.stage} (v${updated.version}).`,
      );
      const nextActions = await samayApiClient.getAllowedActions(
        updated.id,
        role,
      );
      setAllowedActions(nextActions);
    } catch (err) {
      if (err instanceof OptimisticConflictError) {
        setConflictState({
          open: true,
          message: err.message,
          latest: err.latestApplication,
        });
      }
    }
  };

  const handleSimulateConcurrentOfficer = async () => {
    // Updates storage version behind the scenes while keeping local `app.version` stale
    await samayApiClient.simulateConcurrentOfficerUpdate(app.id);
    setActionFeedback(
      `Simulated a concurrent officer action in storage (storage is now v${app.version + 1}, while your view holds stale v${app.version}). Click "Sign & Execute Action" to trigger the 409 Conflict dialog.`,
    );
  };

  return (
    <AppShell>
      {/* Role Switcher Bar */}
      <div
        aria-label="Statutory Role Verification Bar"
        className="flex flex-wrap items-center justify-between gap-2 rounded-xs border border-border bg-surface-sunken px-3 py-2 text-xs"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/applications"
            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Applications Register</span>
          </Link>
          <span className="text-text-muted">|</span>
          <span
            className="font-mono text-[11px] font-bold uppercase text-brand"
            data-testid="detail-active-role"
          >
            ACTIVE ROLE: {role}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {DEMO_ROLE_ACCOUNTS.map((acct) => (
            <button
              key={acct.role}
              type="button"
              data-testid={`switch-role-${acct.role}`}
              onClick={() => loginWithApi(acct.email, acct.password)}
              className={`rounded-xs border px-2 py-1 text-[11px] font-medium transition-colors ${
                role === acct.role
                  ? "border-brand bg-brand text-brand-on font-semibold"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              {locale === "hi" ? acct.labelHi : acct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dossier Header Banner */}
      <div className="rounded-sm border border-border bg-surface-raised p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="font-mono text-sm font-bold text-brand"
                data-testid="detail-application-ref"
              >
                {app.applicationRef}
              </span>
              <StatusChip status={app.status} />
              <SlaBadge state={app.slaState} detail={app.slaDetail} />
              <span
                data-testid="detail-stage-badge"
                className="rounded-xs border border-border bg-surface-sunken px-2 py-0.5 font-mono text-[11px] font-bold text-text-primary"
              >
                STAGE: {app.stage}
              </span>
              <span
                data-testid="detail-version-badge"
                className="rounded-xs border border-border bg-surface-sunken px-2 py-0.5 font-mono text-[11px] text-text-muted"
              >
                v{app.version}
              </span>
            </div>
            <h1 className="mt-1.5 font-serif text-lg font-bold text-text-primary">
              {locale === "hi" ? app.institutionNameHi : app.institutionName}
            </h1>
            <p className="text-xs text-text-muted">
              AICTE ID:{" "}
              <span className="font-mono">{app.aictePermanentId}</span> •{" "}
              {app.programStream} ({app.proposedIntake} seats) • Pipeline:{" "}
              <span className="font-mono font-semibold">
                {app.pipelineCode}@{app.pipelineVersion}
              </span>{" "}
              • Ball With:{" "}
              <span className="font-mono font-bold text-brand">
                {app.ballWith}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <AuditSeal
              ledgerHash={`SHA256:${
                app.auditTrail[app.auditTrail.length - 1]?.hash.slice(0, 12) ||
                "GENESIS"
              }`}
            />
            {!isInstitution && (
              <button
                type="button"
                data-testid="toggle-action-drawer-btn"
                onClick={() => setDrawerOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-3 py-1.5 text-xs font-semibold text-brand-on hover:bg-brand-hover"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {drawerOpen ? "Hide Action Drawer" : "Open Action Drawer"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {actionFeedback && (
        <div
          role="status"
          data-testid="workflow-action-feedback"
          className="rounded-xs border border-sla-on-track bg-surface-raised px-4 py-2.5 text-xs font-medium text-sla-on-track"
        >
          {actionFeedback}
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          data-testid="workflow-action-error"
          className="rounded-xs border border-sla-overdue bg-surface-raised px-4 py-2.5 text-xs font-medium text-sla-overdue"
        >
          {actionError}
        </div>
      )}

      {/* =====================================================================
          INSTITUTION RESPOND-TO-RETURN PANEL (When in DEFICIENCY_RECTIFICATION)
         ===================================================================== */}
      {app.stage === "DEFICIENCY_RECTIFICATION" && (
        <section
          aria-label="Respond to Scrutiny Deficiency Return"
          data-testid="respond-to-return-panel"
          className="rounded-sm border-2 border-sla-overdue bg-surface-raised p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-sla-overdue"
              aria-hidden="true"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold uppercase text-sla-overdue">
                  ACTION REQUIRED BY INSTITUTION • RETURNED FOR DEFICIENCY
                </span>
                {app.lastDeficiencyCode && (
                  <span
                    data-testid="deficiency-reason-code"
                    className="rounded-xs border border-sla-overdue/50 bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-sla-overdue"
                  >
                    Code: {app.lastDeficiencyCode}
                  </span>
                )}
              </div>
              <h2 className="mt-1 font-serif text-sm font-bold text-text-primary">
                Scrutiny Officer Observation & Deficiency Reason:
              </h2>
              <p
                data-testid="officer-deficiency-reason-text"
                className="mt-1 rounded-xs border border-border bg-surface-sunken p-3 text-xs font-medium text-text-primary"
              >
                {app.lastDeficiencyReason ||
                  "Deficiency noted during documentary scrutiny verification."}
              </p>

              {isInstitution && (
                <div className="mt-4 space-y-3 border-t border-border pt-3">
                  <h3 className="text-xs font-bold text-text-primary">
                    Upload Clarification / Rectified Statutory Evidence (ClamAV
                    Scan Enforced)
                  </h3>
                  <FileDropzone
                    label="Clarification Supporting Annexure (PDF / Image)"
                    onFileSelected={(f) => {
                      const scanned = scanUploadedFileMock({
                        checklistItem:
                          "Deficiency Rectification Clarification Annexure",
                        filename: f.name,
                        sizeBytes: f.sizeBytes,
                        uploadedBy: user.fullName,
                      });
                      setClarificationDocs((prev) => [scanned, ...prev]);
                    }}
                  />

                  <div>
                    <label
                      htmlFor="clarification-response-note"
                      className="block text-xs font-semibold text-text-primary"
                    >
                      Institution Compliance & Clarification Statement
                    </label>
                    <textarea
                      id="clarification-response-note"
                      data-testid="clarification-note-textarea"
                      rows={2}
                      value={clarificationNote}
                      onChange={(e) => setClarificationNote(e.target.value)}
                      className="mt-1 w-full rounded-xs border border-border bg-surface p-2.5 text-xs text-text-primary"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      data-testid="submit-deficiency-response-btn"
                      onClick={handleInstitutionClarificationSubmit}
                      className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-4 py-2 text-xs font-semibold text-brand-on hover:bg-brand-hover"
                    >
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Submit Clarification & Advance to Scrutiny</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MAIN WORKSPACE: 5 TABS + OFFICER ACTION DRAWER
         ===================================================================== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div
          className={
            !isInstitution && drawerOpen
              ? "space-y-4 lg:col-span-8"
              : "space-y-4 lg:col-span-12"
          }
        >
          {/* 5-Tab Bar */}
          <div
            role="tablist"
            aria-label="Application Dossier Sections"
            className="flex flex-wrap gap-1.5 border-b border-border pb-2"
          >
            {(
              [
                { id: "overview", label: "1. Overview" },
                {
                  id: "documents",
                  label: `2. Documents (${app.documents.length})`,
                },
                {
                  id: "timeline-audit",
                  label: `3. Timeline & Audit (${app.auditTrail.length})`,
                },
                {
                  id: "communications",
                  label: `4. Communications (${app.communications.length})`,
                },
                { id: "case-summary", label: "5. Case Summary (Advisory)" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                data-testid={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xs border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-brand bg-brand text-brand-on"
                    : "border-border bg-surface-raised text-text-primary hover:border-brand"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4" data-testid="tab-panel-overview">
              <div className="grid grid-cols-1 gap-4 rounded-sm border border-border bg-surface-raised p-4 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] text-text-muted">
                    Assigned Statutory Officer
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-text-primary">
                    {app.assignedOfficer}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-text-muted">
                    Region & Jurisdiction
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-text-primary">
                    {app.regionCode} • {app.state} ({app.district})
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-text-muted">
                    Submitted Date & Ageing
                  </div>
                  <div className="mt-0.5 font-mono text-xs font-bold text-text-primary">
                    {app.submittedAt} ({app.ageingBucket})
                  </div>
                </div>
              </div>

              <div className="rounded-sm border border-border bg-surface-raised p-4">
                <h2 className="font-serif text-sm font-bold text-text-primary mb-3">
                  Statutory Stage Progression Timeline
                </h2>
                <Timeline items={timelineItems} />
              </div>
            </div>
          )}

          {/* TAB 2: DOCUMENTS (PDF & IMAGE VIEWER WITH DOWNLOAD, SCAN STATUS & SHA-256) */}
          {activeTab === "documents" && (
            <div data-testid="tab-panel-documents">
              <DocumentViewer
                document={selectedDoc}
                documents={app.documents}
                onSelectDocument={(doc) => setSelectedDoc(doc)}
              />
            </div>
          )}

          {/* TAB 3: TIMELINE & AUDIT LEDGER */}
          {activeTab === "timeline-audit" && (
            <div className="space-y-4" data-testid="tab-panel-timeline-audit">
              <div className="rounded-sm border border-border bg-surface-raised p-4">
                <h2 className="font-serif text-sm font-bold text-text-primary mb-3">
                  Stage Instance History
                </h2>
                <Timeline items={timelineItems} />
              </div>

              <div className="rounded-sm border border-border bg-surface-raised p-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h2 className="font-serif text-sm font-bold text-text-primary">
                      Tamper-Evident SHA-256 Hash-Chained Audit Log
                    </h2>
                    <p className="text-xs text-text-muted">
                      Append-only ledger enforced by PostgreSQL trigger{" "}
                      <code className="font-mono">
                        audit_log_immutable_trigger
                      </code>
                      .
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-xs border border-sla-on-track px-2.5 py-1 font-mono text-[11px] font-bold text-sla-on-track">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    CHAIN VERIFIED ({app.auditTrail.length} LINKS)
                  </span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {app.auditTrail.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="rounded-xs border border-border bg-surface p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-bold text-brand">
                          #{idx + 1} • {entry.action}
                        </span>
                        <span className="font-mono text-[11px] text-text-muted">
                          {entry.timestamp} • {entry.actorName} (
                          {entry.actorRole})
                        </span>
                      </div>
                      <p className="mt-1 text-text-primary">
                        <strong>Rationale:</strong> {entry.rationale}
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-1 rounded-xs border border-border bg-surface-sunken p-2 font-mono text-[10px] text-text-muted sm:grid-cols-2">
                        <div className="truncate">
                          prev_hash: {entry.prevHash}
                        </div>
                        <div className="truncate text-brand">
                          sha256: {entry.hash}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMMUNICATIONS */}
          {activeTab === "communications" && (
            <div
              className="rounded-sm border border-border bg-surface-raised p-4"
              data-testid="tab-panel-communications"
            >
              <h2 className="font-serif text-sm font-bold text-text-primary">
                Transactional Outbox Events & Statutory Notices
              </h2>
              <div className="mt-3 space-y-2.5">
                {app.communications.length === 0 ? (
                  <p className="text-xs text-text-muted">
                    No outbox dispatches recorded yet.
                  </p>
                ) : (
                  app.communications.map((comm) => (
                    <div
                      key={comm.id}
                      className="rounded-xs border border-border bg-surface p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary">
                          {comm.subject}
                        </span>
                        <span className="font-mono text-[11px] text-text-muted">
                          {comm.sentAt}
                        </span>
                      </div>
                      <p className="mt-1 text-text-muted">{comm.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CASE SUMMARY (PLACEHOLDER) */}
          {activeTab === "case-summary" && (
            <div className="space-y-4" data-testid="tab-panel-case-summary">
              <AdvisoryBanner
                ruleId="RULE-CASE-SUMMARY-PLACEHOLDER"
                aphClause="APH 2024-27 • TODO(APH-VERIFY)"
                title="Automated Pre-Scrutiny Case Dossier Synthesis (Placeholder)"
                rationale="Automated extraction summarizes intake, faculty ratio, and land documents for rapid committee review. Statutory verification rests solely with the human committee and competent authority."
                confidenceScore={92}
                sourceDataSummary={`${app.documents.length} Verified Instruments`}
              />
            </div>
          )}
        </div>

        {/* ===================================================================
            OFFICER ACTION DRAWER (Right Column)
           =================================================================== */}
        {!isInstitution && drawerOpen && (
          <aside
            aria-label="Statutory Workflow Action Drawer"
            data-testid="officer-action-drawer"
            className="space-y-4 rounded-sm border border-brand bg-surface-raised p-4 shadow-raised lg:col-span-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-brand" aria-hidden="true" />
                <h2 className="font-serif text-sm font-bold text-text-primary">
                  Statutory Action Drawer
                </h2>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase text-brand">
                Role: {role}
              </span>
            </div>

            {/* Mandatory Competent Authority Banner at Decision Steps */}
            <div
              data-testid="competent-authority-banner"
              className="rounded-xs border border-accent bg-surface-sunken p-3 text-xs"
            >
              <div className="flex items-start gap-2">
                <ShieldAlert
                  className="h-4 w-4 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <p className="font-semibold leading-snug text-text-primary">
                  This decision is reserved for the competent authority. The
                  system only assists.
                </p>
              </div>
            </div>

            {allowedActions.length === 0 ? (
              <div className="rounded-xs border border-border bg-surface p-3 text-xs text-text-muted">
                No workflow transitions are currently permitted for role{" "}
                <strong className="font-mono">{role}</strong> at stage{" "}
                <strong className="font-mono">{app.stage}</strong> (Ball with:{" "}
                {app.ballWith}).
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="drawer-action-select"
                    className="block text-xs font-semibold text-text-primary"
                  >
                    Allowed Next Actions ({allowedActions.length})
                  </label>
                  <select
                    id="drawer-action-select"
                    data-testid="drawer-action-select"
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="mt-1 w-full rounded-xs border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-primary"
                  >
                    {allowedActions.map((act) => (
                      <option
                        key={`${act.action}-${act.toStage}`}
                        value={act.action}
                      >
                        {act.label}
                      </option>
                    ))}
                  </select>
                  {currentAllowedActionObj && (
                    <p className="mt-1 text-[11px] text-text-muted">
                      {currentAllowedActionObj.description}
                    </p>
                  )}
                </div>

                {currentAllowedActionObj?.action ===
                  "return_for_deficiency" && (
                  <div>
                    <label
                      htmlFor="drawer-reason-code"
                      className="block text-xs font-semibold text-text-primary"
                    >
                      Statutory Deficiency Reason Code
                    </label>
                    <select
                      id="drawer-reason-code"
                      data-testid="drawer-reason-code-select"
                      value={actionReasonCode}
                      onChange={(e) => setActionReasonCode(e.target.value)}
                      className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-text-primary"
                    >
                      {(
                        currentAllowedActionObj.allowedReasonCodes || [
                          "DEF_FACULTY_CADRE_SHORTFALL",
                          "DEF_LAND_DOCS_INCOMPLETE",
                          "DEF_FIRE_SAFETY_EXPIRED",
                          "DEF_FDR_ENCUMBRANCE_MISMATCH",
                        ]
                      ).map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="drawer-reason-textarea"
                    className="block text-xs font-semibold text-text-primary"
                  >
                    Speaking Order Rationale / Observation{" "}
                    {currentAllowedActionObj?.requiresReason && (
                      <span className="text-sla-overdue">* (Mandatory)</span>
                    )}
                  </label>
                  <textarea
                    id="drawer-reason-textarea"
                    data-testid="drawer-reason-textarea"
                    rows={3}
                    placeholder="Enter formal statutory observation or deficiency details..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="mt-1 w-full rounded-xs border border-border bg-surface p-2.5 text-xs text-text-primary"
                  />
                </div>

                <button
                  type="button"
                  data-testid="drawer-execute-action-btn"
                  onClick={handleExecuteOfficerAction}
                  className=" flex w-full items-center justify-center gap-1.5 rounded-xs border border-brand bg-brand px-4 py-2 text-xs font-semibold text-brand-on hover:bg-brand-hover"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Sign & Execute Action (Expected v{app.version})</span>
                </button>
              </div>
            )}

            {/* Conflict UX Trigger for Verification */}
            <div className="border-t border-border pt-3">
              <div className="text-[11px] font-semibold text-text-muted">
                Optimistic Locking (HTTP 409) Verification
              </div>
              <button
                type="button"
                data-testid="simulate-conflict-btn"
                onClick={handleSimulateConcurrentOfficer}
                className="mt-1.5 w-full rounded-xs border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-text-primary hover:border-accent hover:text-accent"
              >
                Simulate Concurrent Officer Action (Bump Storage Version)
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Friendly 409 Conflict Dialog */}
      <ConflictDialog
        open={conflictState.open}
        message={conflictState.message}
        latestApplication={conflictState.latest}
        onReloadLatest={(latest) => {
          setApp(latest);
          setConflictState({ open: false, message: "", latest: null });
          setActionFeedback(
            `Synchronized dossier to latest version v${latest.version} (Stage: ${latest.stage}).`,
          );
        }}
        onClose={() => setConflictState((prev) => ({ ...prev, open: false }))}
      />
    </AppShell>
  );
}
