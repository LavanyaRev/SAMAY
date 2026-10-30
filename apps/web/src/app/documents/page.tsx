"use client";

import React, { useState, useEffect } from "react";
import {
  FileClock,
  ShieldCheck,
  Radar,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";
import { useApp } from "@/lib/app-context";
import {
  getUndertakingsDocumentsSnapshot,
  subscribeUndertakingsDocumentsStore,
  submitRenewalInStore,
  verifyRenewalInStore,
  importCsvDocumentsInStore,
  type CsvImportPreviewReport,
} from "@/lib/undertakings-documents-client";

const SAMPLE_CSV = [
  "institution_id,institution_name,region,type,reference,valid_from,expiry_date",
  "inst-coep-pune,COEP Technological University Pune,WRO,LEASE,LEASE-COEP-2026-88,2022-01-01,2026-06-15",
  "inst-vjti-mumbai,VJTI Matunga Mumbai,WRO,LAND_DOCUMENT,LAND-VJTI-2026-99,2020-04-01,2026-07-10",
  "inst-bad-row,Broken Institute,NRO,INVALID_TYPE,REF-BAD-01,2026-09-01,2025-01-01",
].join("\n");

export default function TrackedDocumentsPage() {
  const { locale, user } = useApp();
  const [store, setStore] = useState(() => getUndertakingsDocumentsSnapshot());
  const [activeTab, setActiveTab] = useState<
    "REGISTER" | "VERIFICATION_QUEUE" | "EXPIRY_RADAR" | "CSV_IMPORT"
  >("REGISTER");
  const [csvText, setCsvText] = useState<string>(SAMPLE_CSV);
  const [csvReport, setCsvReport] = useState<CsvImportPreviewReport | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    return subscribeUndertakingsDocumentsStore(() => {
      setStore({ ...getUndertakingsDocumentsSnapshot() });
    });
  }, []);

  const handleSubmitRenewal = (docId: string, ref: string) => {
    submitRenewalInStore(docId, {
      newReference: `${ref}-REN-V2`,
      newValidFrom: "2026-05-15",
      newExpiryDate: "2031-05-15",
      remarks: "Uploaded registered renewal instrument for officer verification.",
    });
    setNotice(
      `Submitted renewal instrument ${ref}-REN-V2 (status: RENEWAL_SUBMITTED).`,
    );
  };

  const handleVerifyRenewal = (
    docId: string,
    decision: "ACCEPT" | "REJECT",
  ) => {
    setErrorMsg(null);
    try {
      const updated = verifyRenewalInStore(docId, {
        decision,
        actorRole: user?.role || "REGIONAL_OFFICER",
        reason: "Verified registered renewal deed.",
      });
      setNotice(
        `Officer decision ${decision} recorded for ${updated.reference} (Version v${updated.version}; DueItems recalculated).`,
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Action forbidden");
    }
  };

  const handleCsvRun = (dryRun: boolean) => {
    const res = importCsvDocumentsInStore(csvText, dryRun);
    setCsvReport(res);
    if (!dryRun) {
      setNotice(
        `CSV Commit Complete: Created ${res.createdCount} document(s), skipped ${res.skippedIdempotentCount} idempotent duplicate(s).`,
      );
    }
  };

  const regions = ["WRO", "NRO", "SRO", "ERO", "NWRO", "CRO"];

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xs border border-brand bg-brand px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-brand-on">
                PART B • TRACKED DOCUMENTS, LEASE REGISTER & EXPIRY RADAR
              </span>
              <span className="rounded-xs border border-border bg-surface-sunken px-2 py-0.5 font-mono text-[10px] font-semibold text-text-muted">
                ALERTS AT 90 / 60 / 30 / 15 / 7 DAYS
              </span>
            </div>
            <h1 className="mt-1.5 font-serif text-xl font-bold text-text-primary">
              {locale === "hi"
                ? "पट्टा और वैधानिक दस्तावेज़ रजिस्टर, समाप्ति रडार और CSV आयात"
                : "Tracked Documents Register, Expiry Radar (30/60/90d) & Idempotent CSV Import"}
            </h1>
            <p className="mt-0.5 text-xs text-text-muted">
              Tracks LEASE, LAND_DOCUMENT, and OTHER statutory instruments with
              version history, renewal verification, and the optional{" "}
              <code className="font-mono">extraction_result</code>{" "}
              ConfidenceBadge extension point.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "REGISTER"}
              onClick={() => setActiveTab("REGISTER")}
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                activeTab === "REGISTER"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <FileClock className="h-3.5 w-3.5" />
              <span>1. Institution Register & Countdown</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "VERIFICATION_QUEUE"}
              onClick={() => setActiveTab("VERIFICATION_QUEUE")}
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                activeTab === "VERIFICATION_QUEUE"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>2. Officer Renewal Queue</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "EXPIRY_RADAR"}
              onClick={() => setActiveTab("EXPIRY_RADAR")}
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                activeTab === "EXPIRY_RADAR"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <Radar className="h-3.5 w-3.5" />
              <span>3. Expiry Radar (30/60/90d)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "CSV_IMPORT"}
              onClick={() => setActiveTab("CSV_IMPORT")}
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                activeTab === "CSV_IMPORT"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>4. CSV Bulk Import (Dry-Run)</span>
            </button>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xs border border-sla-ontrack bg-surface-raised px-3 py-2 text-xs font-semibold text-sla-ontrack"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-[11px] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-xs border border-sla-overdue bg-surface-raised px-3 py-2 text-xs font-semibold text-sla-overdue"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-[11px] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: Institution Register with Expiry Countdown & ConfidenceBadge */}
        {activeTab === "REGISTER" && (
          <div className="overflow-x-auto rounded-sm border border-border bg-surface-raised">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2.5">Reference & Type</th>
                  <th className="px-3 py-2.5">Institution & Region</th>
                  <th className="px-3 py-2.5">Validity Window & Countdown</th>
                  <th className="px-3 py-2.5">Version History</th>
                  <th className="px-3 py-2.5">AI Extension Point</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Renewal Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {store.documents.map((doc) => (
                  <tr key={doc.id} className="bg-surface-raised">
                    <td className="px-3 py-2.5">
                      <div className="font-mono text-xs font-bold text-text-primary">
                        {doc.reference}
                      </div>
                      <div className="font-mono text-[10px] text-brand">
                        {doc.type}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-text-primary">
                        {doc.institutionName}
                      </div>
                      <div className="font-mono text-[10px] text-text-muted">
                        Region: {doc.region}
                      </div>
                    </td>
                    <td className="tabular-nums-data px-3 py-2.5 font-mono text-xs">
                      <div>
                        {doc.validFrom} → {doc.expiryDate}
                      </div>
                      <div
                        className={`text-[11px] font-bold ${
                          doc.daysRemaining <= 0
                            ? "text-sla-overdue"
                            : doc.daysRemaining <= 30
                              ? "text-sla-duesoon"
                              : "text-sla-ontrack"
                        }`}
                      >
                        {doc.daysRemaining <= 0
                          ? `EXPIRED (${Math.abs(doc.daysRemaining)}d ago)`
                          : `${doc.daysRemaining} days remaining`}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-text-muted">
                      <div>Current: v{doc.version}</div>
                      {doc.versionHistory.length > 0 && (
                        <div className="text-[10px]">
                          Archived:{" "}
                          {doc.versionHistory
                            .map((vh) => `v${vh.versionNumber} (${vh.reference})`)
                            .join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <ConfidenceBadge
                        extractionResult={doc.extractionResult}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-xs border border-brand bg-brand px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-on">
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          handleSubmitRenewal(doc.id, doc.reference)
                        }
                        className="inline-flex items-center gap-1 rounded-xs border border-brand bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-on hover:bg-brand-hover"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Upload Renewal</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Officer Verification Queue */}
        {activeTab === "VERIFICATION_QUEUE" && (
          <div className="overflow-x-auto rounded-sm border border-border bg-surface-raised">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2.5">Current Instrument</th>
                  <th className="px-3 py-2.5">Institution</th>
                  <th className="px-3 py-2.5">Pending Renewal Submission</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">
                    Officer Verification (Promotes Version & Resets DueItems)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {store.documents.map((doc) => (
                  <tr key={doc.id} className="bg-surface-raised">
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-text-primary">
                      {doc.reference} (v{doc.version})
                    </td>
                    <td className="px-3 py-2.5">{doc.institutionName}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      {doc.pendingRenewal ? (
                        <div>
                          <span className="font-bold text-brand">
                            {doc.pendingRenewal.newReference}
                          </span>{" "}
                          (New Expiry: {doc.pendingRenewal.newExpiryDate})
                        </div>
                      ) : (
                        <span className="text-text-muted">
                          No pending renewal
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] font-bold">
                      {doc.status}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {doc.pendingRenewal ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleVerifyRenewal(doc.id, "ACCEPT")}
                            className="rounded-xs border border-sla-ontrack bg-sla-ontrack px-2.5 py-1 text-[11px] font-bold text-brand-on"
                          >
                            Verify & Promote v{doc.version + 1}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyRenewal(doc.id, "REJECT")}
                            className="rounded-xs border border-sla-overdue bg-sla-overdue px-2.5 py-1 text-[11px] font-bold text-brand-on"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Expiry Radar (Next 30, 60, 90 Days by Region) */}
        {activeTab === "EXPIRY_RADAR" && (
          <div className="overflow-x-auto rounded-sm border border-border bg-surface-raised">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2.5">Regional Office</th>
                  <th className="px-3 py-2.5">Expired (&le; 0d)</th>
                  <th className="px-3 py-2.5">Expiring Next 30 Days</th>
                  <th className="px-3 py-2.5">Expiring 31–60 Days</th>
                  <th className="px-3 py-2.5">Expiring 61–90 Days</th>
                  <th className="px-3 py-2.5">Valid (&gt; 90 Days)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {regions.map((reg) => {
                  const docs = store.documents.filter((d) => d.region === reg);
                  const expired = docs.filter((d) => d.daysRemaining <= 0).length;
                  const d30 = docs.filter(
                    (d) => d.daysRemaining > 0 && d.daysRemaining <= 30,
                  ).length;
                  const d60 = docs.filter(
                    (d) => d.daysRemaining > 30 && d.daysRemaining <= 60,
                  ).length;
                  const d90 = docs.filter(
                    (d) => d.daysRemaining > 60 && d.daysRemaining <= 90,
                  ).length;
                  const valid = docs.filter((d) => d.daysRemaining > 90).length;
                  return (
                    <tr key={reg} className="bg-surface-raised">
                      <td className="px-3 py-2.5 font-bold text-brand">
                        {reg}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-sla-overdue">
                        {expired}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-sla-duesoon">
                        {d30}
                      </td>
                      <td className="px-3 py-2.5 text-text-primary">{d60}</td>
                      <td className="px-3 py-2.5 text-text-primary">{d90}</td>
                      <td className="px-3 py-2.5 font-bold text-sla-ontrack">
                        {valid}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: CSV Bulk Import with Dry-Run Preview & Row-Level Errors */}
        {activeTab === "CSV_IMPORT" && (
          <div className="space-y-4 rounded-sm border border-border bg-surface-raised p-4 text-xs">
            <div className="font-serif text-sm font-bold text-text-primary">
              CSV Bulk Import (Dry-Run Preview, Row-Level Errors & Idempotent
              Repeat)
            </div>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full rounded-xs border border-border bg-surface p-2.5 font-mono text-xs text-text-primary"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCsvRun(true)}
                data-testid="csv-dry-run-btn"
                className="rounded-xs border border-border bg-surface px-3 py-1.5 font-semibold text-text-primary hover:border-brand"
              >
                1. Dry-Run Preview
              </button>
              <button
                type="button"
                onClick={() => handleCsvRun(false)}
                data-testid="csv-commit-btn"
                className="rounded-xs border border-brand bg-brand px-3 py-1.5 font-semibold text-brand-on hover:bg-brand-hover"
              >
                2. Commit Valid Rows (Idempotent)
              </button>
            </div>

            {csvReport && (
              <div className="space-y-2 rounded-xs border border-border bg-surface p-3">
                <div className="font-mono text-xs font-bold text-text-primary">
                  Mode: {csvReport.dryRun ? "DRY-RUN PREVIEW" : "COMMITTED"} •
                  Total Rows: {csvReport.totalRows} • Valid:{" "}
                  {csvReport.validRowsCount} • Errors:{" "}
                  {csvReport.errorRowsCount} • Created:{" "}
                  {csvReport.createdCount} • Idempotent Skipped:{" "}
                  {csvReport.skippedIdempotentCount}
                </div>
                {csvReport.rowErrors.map((err) => (
                  <div
                    key={err.rowNumber}
                    className="rounded-xs border border-sla-overdue/40 bg-surface-raised p-2 font-mono text-[11px] text-sla-overdue"
                  >
                    Row #{err.rowNumber}: {err.errors.join(" | ")}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

