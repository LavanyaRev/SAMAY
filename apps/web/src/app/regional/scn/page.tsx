"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { AlertCircle, Plus, X, CheckCircle2, Download } from "lucide-react";
import { downloadCsv, downloadTextReport } from "@/lib/download-utils";
import { regulatoryStore } from "@/lib/regulatory-store";
import { type ShowCauseNoticeRecord, ScnOutcomeStatus } from "@samay/shared";

export default function RegionalScnPage() {
  const [notices, setNotices] = useState<ShowCauseNoticeRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form states for issuing new SCN
  const [targetAppRef, setTargetAppRef] = useState("EOA-2027-1042");
  const [instName, setInstName] = useState("Sahyadri Institute of Technology");
  const [instId, setInstId] = useState("1-DEMO-4102");
  const [reason, setReason] = useState(
    "Failure to submit valid Fire Safety NOC before statutory expiry date under APH 2024-27 Clause 2.9.",
  );
  const [deadlineDays, setDeadlineDays] = useState("15");

  useEffect(() => {
    setNotices(regulatoryStore.getShowCauseNotices());
    const unsubscribe = regulatoryStore.subscribe(() => {
      setNotices(regulatoryStore.getShowCauseNotices());
    });
    return unsubscribe;
  }, []);

  const handleIssueNotice = (e: React.FormEvent) => {
    e.preventDefault();
    const created = regulatoryStore.issueShowCauseNotice({
      applicationRef: targetAppRef,
      institutionId: instId,
      institutionName: instName,
      reasonForNotice: reason,
      responseDeadline: `${deadlineDays} Calendar Days`,
      issuedByOfficer: "R. Kulkarni (WRO Regional Desk)",
    });

    setIsModalOpen(false);
    setReason(
      "Failure to submit valid Fire Safety NOC before statutory expiry date under APH 2024-27 Clause 2.9.",
    );
    setSuccessNotice(
      `Statutory Show Cause Notice ${created.scnId} issued to ${created.institutionName}.`,
    );

    // Download copy of notice
    const content = `================================================================================
ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
WESTERN REGIONAL OFFICE - STATUTORY SHOW CAUSE NOTICE (SCN)
================================================================================
Notice Reference:        ${created.scnId}
Application Reference:   ${created.applicationRef}
Recipient Institution:   ${created.institutionName} (AICTE Permanent ID: ${created.institutionId})
Date of Issuance:        ${created.issuanceDate}
Response Cutoff:         ${created.responseDeadline}
================================================================================
GROUNDS AND ALLEGATIONS:
"${created.reasonForNotice}"

MANDATE TO INSTITUTION:
You are hereby required to show cause within ${created.responseDeadline} from receipt
of this notice as to why appropriate regulatory action, including reduction of intake
or non-extension of approval, should not be initiated against your institution.
================================================================================
Authorized Signatory: ${created.issuedByOfficer}
================================================================================`;
    downloadTextReport(`SCN-${created.scnId.replace(/\//g, "-")}.txt`, content);
  };

  const handleExportCsv = () => {
    const headers = [
      "SCN Ref",
      "Application",
      "Institution",
      "Issuance Date",
      "Reason",
      "Deadline",
      "Status",
      "Outcome",
    ];
    const rows = notices.map((n) => [
      n.scnId,
      n.applicationRef,
      n.institutionName,
      n.issuanceDate,
      n.reasonForNotice,
      n.responseDeadline,
      n.hearingStatus,
      n.outcomeStatus,
    ]);
    downloadCsv("wro-show-cause-notices.csv", headers, rows);
  };

  return (
    <RoleGuard allowedRoles={["REGIONAL_OFFICER", "ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>REGIONAL PORTAL / SCN Management</span>
            <span>
              Statutory Cycle AY 2027–28 • Western Region Enforcement Desk
            </span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Show Cause Notice (SCN) Management
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Track formal statutory notices, response deadlines, and
                institutional compliance hearings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1 rounded-md border border-[#E5E0D8] bg-white px-3.5 py-2 text-xs font-semibold text-[#2A1810] hover:bg-neutral-50 transition-colors shadow-2xs cursor-pointer"
              >
                <span>Export SCN CSV</span>
                <Download className="h-3.5 w-3.5 text-[#EC642A]" />
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Issue Show Cause Notice +</span>
              </button>
            </div>
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
                Active Regional Show Cause Notices ({notices.length} cases)
              </h2>
              <span className="text-xs text-[#736357]">
                Enforced under APH 2024-27
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">NOTICE REF / INSTITUTION</th>
                    <th className="py-3 px-2">ISSUED ON</th>
                    <th className="py-3 px-2">REASON FOR NOTICE</th>
                    <th className="py-3 px-2">RESPONSE CUTOFF</th>
                    <th className="py-3 px-2">HEARING STATUS</th>
                    <th className="py-3 px-2">FORMAL OUTCOME</th>
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
                      <td className="py-3 px-2 font-semibold text-[#EC642A] whitespace-nowrap">
                        {n.responseDeadline}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Issue SCN Modal */}
        {isModalOpen && (
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
                      Issue Statutory Show Cause Notice
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded p-1 text-[#736357] hover:bg-neutral-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleIssueNotice} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Select Target Application
                    </label>
                    <select
                      value={targetAppRef}
                      onChange={(e) => {
                        setTargetAppRef(e.target.value);
                        if (e.target.value.includes("1042")) {
                          setInstName("Sahyadri Institute of Technology");
                          setInstId("1-DEMO-4102");
                        } else if (e.target.value.includes("1017")) {
                          setInstName("Vidarbha Engineering");
                          setInstId("1-DEMO-4011");
                        } else {
                          setInstName("Coastal Institute");
                          setInstId("1-DEMO-4120");
                        }
                      }}
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs font-semibold text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    >
                      <option value="EOA-2027-1042">
                        EOA-2027-1042 · Sahyadri Institute of Technology
                      </option>
                      <option value="EOA-2027-1017">
                        EOA-2027-1017 · Vidarbha Engineering (Nagpur)
                      </option>
                      <option value="EOA-2027-1104">
                        EOA-2027-1104 · Coastal Institute (Panaji)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Reason for Notice (Statutory Charge) *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="State the non-compliance violation citing APH regulations..."
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Response Window (Calendar Days)
                    </label>
                    <select
                      value={deadlineDays}
                      onChange={(e) => setDeadlineDays(e.target.value)}
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs font-semibold text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    >
                      <option value="7">
                        7 Calendar Days (Urgent life-safety)
                      </option>
                      <option value="15">
                        15 Calendar Days (Standard statutory)
                      </option>
                      <option value="21">
                        21 Calendar Days (Infrastructure deficit)
                      </option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-[#F0ECE6] pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-medium text-[#2A1810] hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-[#EC642A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs"
                    >
                      Sign &amp; Dispatch SCN →
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
