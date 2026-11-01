"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { AlertCircle, Download, CheckCircle2, ShieldAlert } from "lucide-react";
import { downloadCsv, downloadTextReport } from "@/lib/download-utils";
import { regulatoryStore } from "@/lib/regulatory-store";
import { type ShowCauseNoticeRecord, ScnOutcomeStatus } from "@samay/shared";

export default function BureauScnPage() {
  const [notices, setNotices] = useState<ShowCauseNoticeRecord[]>([]);
  const [selectedScn, setSelectedScn] = useState<ShowCauseNoticeRecord | null>(
    null,
  );
  const [adjudicationOutcome, setAdjudicationOutcome] =
    useState<ScnOutcomeStatus>(ScnOutcomeStatus.PENALTY_IMPOSED);
  const [formalNotes, setFormalNotes] = useState(
    "Competent Authority reviewed institution representation and SHC report. Ordered 25% intake reduction in civil engineering.",
  );
  const [isAdjudicateModalOpen, setIsAdjudicateModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    setNotices(regulatoryStore.getShowCauseNotices());
    const unsubscribe = regulatoryStore.subscribe(() => {
      setNotices(regulatoryStore.getShowCauseNotices());
    });
    return unsubscribe;
  }, []);

  const handleOpenAdjudicate = (scn: ShowCauseNoticeRecord) => {
    setSelectedScn(scn);
    setIsAdjudicateModalOpen(true);
  };

  const handleConfirmAdjudication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScn) return;

    regulatoryStore.recordScnOutcome(
      selectedScn.scnId,
      adjudicationOutcome,
      formalNotes,
    );
    setIsAdjudicateModalOpen(false);
    setSuccessNotice(
      `SCN ${selectedScn.scnId} formal outcome recorded as ${adjudicationOutcome.replace(/_/g, " ")}.`,
    );

    const orderContent = `================================================================================
ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
APPROVAL BUREAU - FORMAL SCN ADJUDICATION ORDER
================================================================================
Notice Reference:        ${selectedScn.scnId}
Application:             ${selectedScn.applicationRef}
Institution:             ${selectedScn.institutionName} (${selectedScn.institutionId})
Final Outcome:           ${adjudicationOutcome.replace(/_/g, " ")}
Formal Notes:            "${formalNotes}"
Adjudicated By:          Member Secretary / Competent Authority, AICTE
Timestamp:               2026-10-31 IST Standard
================================================================================`;
    downloadTextReport(
      `SCN-Adjudication-${selectedScn.scnId.replace(/\//g, "-")}.txt`,
      orderContent,
    );
  };

  const handleExportCsv = () => {
    const headers = [
      "SCN Ref",
      "Application",
      "Institution",
      "Issuance Date",
      "Reason",
      "Hearing",
      "Outcome",
    ];
    const rows = notices.map((n) => [
      n.scnId,
      n.applicationRef,
      n.institutionName,
      n.issuanceDate,
      n.reasonForNotice,
      n.hearingStatus,
      n.outcomeStatus,
    ]);
    downloadCsv("pan-india-scn-register.csv", headers, rows);
  };

  return (
    <RoleGuard allowedRoles={["BUREAU_OFFICER", "ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>BUREAU PORTAL / SCN Register</span>
            <span>
              Statutory Cycle AY 2027–28 • Pan-India Enforcement Register
            </span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Pan-India SCN Enforcement Register
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Oversee statutory Show Cause Notices issued across regional
                offices, adjudicate replies, and issue final orders.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 rounded-md border border-[#E5E0D8] bg-white px-3.5 py-2 text-xs font-semibold text-[#2A1810] hover:bg-neutral-50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <span>Export Full Register CSV</span>
              <Download className="h-3.5 w-3.5 text-[#EC642A]" />
            </button>
          </div>

          {successNotice && (
            <div className="flex items-center gap-2 rounded-md border border-[#C8E6C9] bg-[#E8F5E9] p-3 text-xs text-[#2E7D32]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* SCN Table Card */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
              <h2 className="text-sm font-bold text-[#2A1810]">
                All Pan-India Enforced Notices ({notices.length} cases)
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#EC642A] font-semibold">
                <ShieldAlert className="h-4 w-4" />
                <span>Statutory High-Priority</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">NOTICE REF / INSTITUTION</th>
                    <th className="py-3 px-2">ISSUED ON</th>
                    <th className="py-3 px-2">REASON</th>
                    <th className="py-3 px-2">HEARING STATUS</th>
                    <th className="py-3 px-2">CURRENT OUTCOME</th>
                    <th className="py-3 px-2">ADJUDICATION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {notices.map((n) => (
                    <tr
                      key={n.scnId}
                      className="hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="font-bold text-[#2A1810]">
                          {n.scnId}
                        </div>
                        <div className="text-[11px] text-[#736357]">
                          {n.institutionName} ({n.applicationRef})
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[#2A1810] whitespace-nowrap">
                        {n.issuanceDate}
                      </td>
                      <td className="py-3 px-2 text-[#736357] max-w-xs">
                        {n.reasonForNotice}
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-block rounded bg-[#FFF9E6] px-2 py-0.5 text-[10px] font-bold text-[#8C6D1F]">
                          {n.hearingStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            n.outcomeStatus ===
                            ScnOutcomeStatus.DROPPED_SATISFACTORY
                              ? "bg-[#E8F5E9] text-[#2E7D32]"
                              : n.outcomeStatus ===
                                  ScnOutcomeStatus.UNDER_REVIEW
                                ? "bg-[#FFF9E6] text-[#8C6D1F]"
                                : "bg-[#FFEBE5] text-[#C23B17]"
                          }`}
                        >
                          {n.outcomeStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjudicate(n)}
                          className="font-semibold text-[#EC642A] hover:underline cursor-pointer"
                        >
                          Adjudicate Outcome →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Adjudication Modal */}
        {isAdjudicateModalOpen && selectedScn && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
          >
            <div className="flex min-h-full items-center justify-center py-6 sm:py-10">
              <div
                className="relative w-full max-w-lg rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xl space-y-4"
                style={{ backgroundColor: "#ffffff" }}
              >
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-[#EC642A]" />
                    <h2 className="text-base font-bold text-[#2A1810]">
                      Adjudicate Show Cause Notice · {selectedScn.scnId}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAdjudicateModalOpen(false)}
                    className="rounded p-1 text-[#736357] hover:bg-neutral-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="rounded bg-[#FAFAFA] border border-[#E5E0D8] p-3 text-xs space-y-1">
                  <div className="font-bold text-[#2A1810]">
                    {selectedScn.institutionName}
                  </div>
                  <div className="text-[#736357]">
                    {selectedScn.reasonForNotice}
                  </div>
                  {selectedScn.institutionReply && (
                    <div className="mt-2 pt-2 border-t border-[#E5E0D8] text-[11px] text-[#1565C0]">
                      <span className="font-bold">
                        Institution Written Reply:
                      </span>{" "}
                      {selectedScn.institutionReply}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleConfirmAdjudication}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Formal Adjudication Determination *
                    </label>
                    <select
                      value={adjudicationOutcome}
                      onChange={(e) =>
                        setAdjudicationOutcome(
                          e.target.value as ScnOutcomeStatus,
                        )
                      }
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs font-semibold text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    >
                      <option value={ScnOutcomeStatus.DROPPED_SATISFACTORY}>
                        Drop Notice (Compliance Satisfactorily Verified)
                      </option>
                      <option value={ScnOutcomeStatus.PENALTY_IMPOSED}>
                        Impose Regulatory Penalty (Intake Reduction / Fine)
                      </option>
                      <option value={ScnOutcomeStatus.WITHDRAWAL_RECOMMENDED}>
                        Recommend Withdrawal of Approval (APH Chapter 8)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Reasoned Order Notes &amp; Disposition *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formalNotes}
                      onChange={(e) => setFormalNotes(e.target.value)}
                      placeholder="Enter formal reasons and statutory clauses invoked..."
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2.5 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-[#F0ECE6] pt-4">
                    <button
                      type="button"
                      onClick={() => setIsAdjudicateModalOpen(false)}
                      className="rounded border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-medium text-[#2A1810] hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-[#EC642A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs"
                    >
                      Confirm &amp; Issue Final Order →
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </RoleGuard>
  );
}
