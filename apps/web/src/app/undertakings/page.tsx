"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  Upload,
  ShieldCheck,
  History,
  Plus,
  CheckCircle2,
  XCircle,
  Scale,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { AdvisoryBanner } from "@/components/ui/advisory-banner";
import { SlaBadge } from "@/components/ui/sla-badge";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";
import { useApp } from "@/lib/app-context";
import {
  getUndertakingsDocumentsSnapshot,
  subscribeUndertakingsDocumentsStore,
  recordOfficerConditionInStore,
  submitEvidenceForConditionInStore,
  reviewConditionInStore,
  waiveConditionInStore,
} from "@/lib/undertakings-documents-client";

export default function UndertakingsPage() {
  const { locale, user } = useApp();
  const [store, setStore] = useState(() => getUndertakingsDocumentsSnapshot());
  const [activeTab, setActiveTab] = useState<
    "INSTITUTION_PORTAL" | "OFFICER_QUEUE" | "COMPLIANCE_PROFILE"
  >("INSTITUTION_PORTAL");
  const [selectedCondId, setSelectedCondId] = useState<string>("cond-001");
  const [remarksInput, setRemarksInput] = useState<string>(
    "Uploaded Form-16 PAN proof along with appointment and joining letters.",
  );
  const [officerReason, setOfficerReason] = useState<string>(
    "Verified documentary evidence against statutory undertaking requirements.",
  );
  const [newCondType, setNewCondType] = useState<string>(
    "LIBRARY_JOURNAL_SUBSCRIPTION",
  );
  const [newCondEvidence, setNewCondEvidence] = useState<string>(
    "INVOICE_RECEIPT,SUBSCRIPTION_CERTIFICATE",
  );
  const [newCondDueDate, setNewCondDueDate] = useState<string>("2026-07-01");
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    return subscribeUndertakingsDocumentsStore(() => {
      setStore({ ...getUndertakingsDocumentsSnapshot() });
    });
  }, []);

  const selectedCondition =
    store.conditions.find((c) => c.id === selectedCondId) ||
    store.conditions[0];

  const handleSubmitEvidence = () => {
    if (!selectedCondition) return;
    setErrorNotice(null);
    submitEvidenceForConditionInStore(selectedCondition.id, {
      providedEvidenceTypes: selectedCondition.requiredEvidenceTypes,
      remarks: remarksInput,
    });
    setStatusNotice(
      `Submitted evidence for ${selectedCondition.conditionType} (Attempt #${selectedCondition.submissions.length}). Advisory check complete — awaiting human officer verification.`,
    );
  };

  const handleOfficerReview = (
    decision: "ACCEPT" | "REJECT" | "REQUEST_MORE",
  ) => {
    if (!selectedCondition) return;
    setErrorNotice(null);
    try {
      reviewConditionInStore(selectedCondition.id, {
        decision,
        actorRole: user?.role || "REGIONAL_OFFICER",
        reason: officerReason,
      });
      setStatusNotice(
        `Officer decision ${decision} recorded for condition ${selectedCondition.conditionType}.`,
      );
    } catch (err: unknown) {
      setErrorNotice(err instanceof Error ? err.message : "Action forbidden");
    }
  };

  const handleCompetentAuthorityWaiver = () => {
    if (!selectedCondition) return;
    setErrorNotice(null);
    try {
      waiveConditionInStore(selectedCondition.id, {
        actorRole: user?.role || "BUREAU_OFFICER",
        waiverReason: officerReason,
      });
      setStatusNotice(
        `Competent Authority waived condition ${selectedCondition.conditionType} (WAIVED_BY_AUTHORITY) with audited reason.`,
      );
    } catch (err: unknown) {
      setErrorNotice(err instanceof Error ? err.message : "Waiver forbidden");
    }
  };

  const handleRecordNewCondition = () => {
    const created = recordOfficerConditionInStore({
      applicationRef: "APP-2026-WRO-00104",
      institutionName: "Walchand College of Engineering, Sangli",
      region: "WRO",
      conditionType: newCondType,
      description: `Officer recorded undertaking condition: ${newCondType}`,
      requiredEvidenceTypes: newCondEvidence
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      dueDate: newCondDueDate,
    });
    setSelectedCondId(created.id);
    setStatusNotice(
      `Recorded new Condition ${created.conditionType} and created UNDERTAKING DueItem.`,
    );
  };

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xs border border-brand bg-brand px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-brand-on">
                PART A • TIME-BOUND UNDERTAKINGS & CONDITIONS
              </span>
              <span className="rounded-xs border border-border bg-surface-sunken px-2 py-0.5 font-mono text-[10px] font-semibold text-text-muted">
                ADVISORY MISSING-EVIDENCE CHECK • NO AUTO-ACCEPT
              </span>
            </div>
            <h1 className="mt-1.5 font-serif text-xl font-bold text-text-primary">
              {locale === "hi"
                ? "समयबद्ध वचनबद्धता (Undertakings), शर्तें और अधिकारी सत्यापन कतार"
                : "Time-Bound Undertakings, Conditions & Officer Verification Queue"}
            </h1>
            <p className="mt-0.5 text-xs text-text-muted">
              Each Condition creates an UNDERTAKING DueItem, preserves full
              resubmission history, and escalates via the Phase 6 ladder when
              overdue. Waiving is restricted to the Competent Authority.
            </p>
          </div>

          <div className="flex items-center gap-1.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "INSTITUTION_PORTAL"}
              onClick={() => setActiveTab("INSTITUTION_PORTAL")}
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                activeTab === "INSTITUTION_PORTAL"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>1. My Undertakings & Submit Evidence</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "OFFICER_QUEUE"}
              onClick={() => setActiveTab("OFFICER_QUEUE")}
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                activeTab === "OFFICER_QUEUE"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>2. Officer Verification Queue</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "COMPLIANCE_PROFILE"}
              onClick={() => setActiveTab("COMPLIANCE_PROFILE")}
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                activeTab === "COMPLIANCE_PROFILE"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>3. Institution Compliance Profile & Timeline</span>
            </button>
          </div>
        </div>

        {statusNotice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xs border border-sla-ontrack bg-surface-raised px-3 py-2 text-xs font-semibold text-sla-ontrack"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{statusNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="text-[11px] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {errorNotice && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-xs border border-sla-overdue bg-surface-raised px-3 py-2 text-xs font-semibold text-sla-overdue"
          >
            <span className="flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{errorNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setErrorNotice(null)}
              className="text-[11px] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: Institution My Undertakings & Submit Evidence */}
        {activeTab === "INSTITUTION_PORTAL" && selectedCondition && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-2.5 lg:col-span-1">
              <h2 className="font-serif text-sm font-bold text-text-primary">
                Assigned Undertaking Conditions ({store.conditions.length})
              </h2>
              {store.conditions.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCondId(c.id)}
                  className={`cursor-pointer rounded-sm border p-3 text-xs transition-colors ${
                    selectedCondition.id === c.id
                      ? "border-brand bg-surface-sunken"
                      : "border-border bg-surface-raised hover:border-brand"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-brand">
                      {c.conditionType}
                    </span>
                    <SlaBadge state={c.slaState} />
                  </div>
                  <div className="mt-1 font-semibold text-text-primary">
                    {c.institutionName} ({c.applicationRef})
                  </div>
                  <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-text-muted">
                    <span>Status: {c.status}</span>
                    <span>Due: {c.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 rounded-sm border border-border bg-surface-raised p-4 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-brand">
                    {selectedCondition.applicationRef} •{" "}
                    {selectedCondition.conditionType}
                  </span>
                  <h3 className="mt-0.5 font-serif text-base font-bold text-text-primary">
                    {selectedCondition.description}
                  </h3>
                </div>
                <ConfidenceBadge
                  extractionResult={selectedCondition.extractionResult}
                />
              </div>

              <AdvisoryBanner
                title="ADVISORY EVIDENCE COMPLETENESS CHECK — NEVER AUTO-ACCEPTS"
                ruleId="RULE-UNDERTAKING-EVIDENCE-01"
                rationale={`Required evidence types: ${selectedCondition.requiredEvidenceTypes.join(", ")}. Even when 100% of required evidence types are uploaded, an authorised AICTE officer must verify and accept the submission.`}
              />

              <div className="space-y-2 rounded-xs border border-border bg-surface p-3 text-xs">
                <div className="font-serif font-bold text-text-primary">
                  Submit / Resubmit Documentary Evidence (Preserves History)
                </div>
                <div>
                  <label className="block text-[11px] text-text-muted">
                    Institution Compliance Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={remarksInput}
                    onChange={(e) => setRemarksInput(e.target.value)}
                    className="mt-1 w-full rounded-xs border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSubmitEvidence}
                  data-testid="submit-undertaking-evidence-btn"
                  className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-3 py-1.5 text-xs font-semibold text-brand-on hover:bg-brand-hover"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  <span>
                    Submit Evidence Package (Attempt #
                    {selectedCondition.submissions.length + 1})
                  </span>
                </button>
              </div>

              {/* Submission History */}
              <div className="space-y-2">
                <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-text-muted">
                  Evidence Submission History ({selectedCondition.submissions.length})
                </h4>
                {selectedCondition.submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-xs border border-border bg-surface p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-text-primary">
                        Attempt #{sub.attemptNumber} ({sub.status})
                      </span>
                      <span className="text-text-muted">{sub.submittedAt}</span>
                    </div>
                    <p className="text-text-primary">{sub.remarks}</p>
                    <div className="font-mono text-[10px] text-text-muted">
                      Provided: {sub.providedEvidenceTypes.join(", ")}
                      {sub.missingEvidenceTypes.length > 0 && (
                        <span className="ml-2 font-bold text-sla-overdue">
                          • ADVISORY Missing:{" "}
                          {sub.missingEvidenceTypes.join(", ")}
                        </span>
                      )}
                    </div>
                    {sub.reviewReason && (
                      <div className="rounded-xs border border-border bg-surface-sunken px-2 py-1 text-[11px] font-medium text-brand">
                        Officer Review Note: {sub.reviewReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Officer Verification Queue & Record Condition Form */}
        {activeTab === "OFFICER_QUEUE" && (
          <div className="space-y-4">
            {/* Officer Record Condition Form */}
            <div className="rounded-sm border border-border bg-surface-raised p-4 text-xs">
              <div className="mb-2 font-serif text-sm font-bold text-text-primary">
                Record New Undertaking Condition (Creates UNDERTAKING DueItem)
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input
                  type="text"
                  value={newCondType}
                  onChange={(e) => setNewCondType(e.target.value)}
                  placeholder="Condition Type"
                  className="rounded-xs border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-text-primary"
                />
                <input
                  type="text"
                  value={newCondEvidence}
                  onChange={(e) => setNewCondEvidence(e.target.value)}
                  placeholder="Required Evidence Types (comma-separated)"
                  className="rounded-xs border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-text-primary"
                />
                <input
                  type="date"
                  value={newCondDueDate}
                  onChange={(e) => setNewCondDueDate(e.target.value)}
                  className="rounded-xs border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-text-primary"
                />
                <button
                  type="button"
                  onClick={handleRecordNewCondition}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xs border border-brand bg-brand px-3 py-1.5 font-semibold text-brand-on"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Condition</span>
                </button>
              </div>
            </div>

            {/* Officer Verification Table */}
            <div className="overflow-x-auto rounded-sm border border-border bg-surface-raised">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-2.5">Dossier & Institution</th>
                    <th className="px-3 py-2.5">Condition & Evidence Types</th>
                    <th className="px-3 py-2.5">SLA & Escalation</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">
                      Officer Verification & Competent Authority Waiver
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {store.conditions.map((c) => (
                    <tr key={c.id} className="bg-surface-raised">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-text-primary">
                          {c.institutionName}
                        </div>
                        <div className="font-mono text-[10px] text-text-muted">
                          {c.applicationRef} • {c.region}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono text-[11px] font-bold text-brand">
                          {c.conditionType}
                        </div>
                        <div className="font-mono text-[10px] text-text-muted">
                          Req: {c.requiredEvidenceTypes.join(", ")}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 space-y-1">
                        <SlaBadge state={c.slaState} />
                        <div className="font-mono text-[10px] text-text-muted">
                          Due: {c.dueDate} • L{c.escalationLevel}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-text-primary">
                        {c.status}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCondId(c.id);
                              handleOfficerReview("ACCEPT");
                            }}
                            className="rounded-xs border border-sla-ontrack bg-sla-ontrack px-2 py-1 text-[11px] font-bold text-brand-on"
                          >
                            Verify (Accept)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCondId(c.id);
                              handleOfficerReview("REJECT");
                            }}
                            className="rounded-xs border border-sla-overdue bg-sla-overdue px-2 py-1 text-[11px] font-bold text-brand-on"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCondId(c.id);
                              handleCompetentAuthorityWaiver();
                            }}
                            className="inline-flex items-center gap-1 rounded-xs border border-brand bg-surface px-2 py-1 text-[11px] font-semibold text-brand hover:bg-surface-sunken"
                          >
                            <Scale className="h-3 w-3" />
                            <span>Waive (Authority)</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xs border border-border bg-surface-raised p-3 text-xs">
              <label className="block font-semibold text-text-primary">
                Mandatory Officer Reason (Used for Reject, Request More, or
                Competent Authority Waiver)
              </label>
              <input
                type="text"
                value={officerReason}
                onChange={(e) => setOfficerReason(e.target.value)}
                className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
              />
            </div>
          </div>
        )}

        {/* TAB 3: Institution Compliance Profile with Timeline */}
        {activeTab === "COMPLIANCE_PROFILE" && (
          <div className="space-y-3 rounded-sm border border-border bg-surface-raised p-4">
            <h2 className="font-serif text-base font-bold text-text-primary">
              Institution Compliance Profile & Chronological Undertaking Timeline
            </h2>
            <div className="space-y-2.5 border-l-2 border-brand pl-4">
              {store.conditions.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xs border border-border bg-surface p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-brand">
                      {c.applicationRef} • {c.conditionType}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-text-muted">
                      Status: {c.status} (Escalation L{c.escalationLevel})
                    </span>
                  </div>
                  <p className="text-text-primary">{c.description}</p>
                  {c.waiverReason && (
                    <p className="font-mono text-[11px] text-brand">
                      Waived by {c.waivedByRole}: {c.waiverReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

