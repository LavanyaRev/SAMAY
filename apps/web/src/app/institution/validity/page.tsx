"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { AlertTriangle, Plus, X, Check } from "lucide-react";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { downloadTextReport } from "@/lib/download-utils";
import {
  regulatoryStore,
  type RegulatoryValidityRecord,
} from "@/lib/regulatory-store";

export default function InstitutionValidityPage() {
  const [records, setRecords] = useState<RegulatoryValidityRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // New record form fields
  const [docName, setDocName] = useState("");
  const [docRef, setDocRef] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [owner, setOwner] = useState("S. Patil");

  useEffect(() => {
    setRecords(regulatoryStore.getValidityRecords());
    const unsubscribe = regulatoryStore.subscribe(() => {
      setRecords(regulatoryStore.getValidityRecords());
    });
    return unsubscribe;
  }, []);

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const created = regulatoryStore.addValidityRecord({
      docName,
      ref: `Ref: ${docRef}`,
      expiresOn,
      timeLeft: "Active · 365-day validity",
      owner,
      practicalStep: "Active · Annual verification",
      actionText: "Compliance verified",
    });
    setDocName("");
    setDocRef("");
    setExpiresOn("");
    setOwner("S. Patil");
    setIsModalOpen(false);
    setSuccessNotice(
      `Document "${created.docName}" successfully logged to statutory validity radar.`,
    );
  };

  const handleDownloadReceipt = (rec: RegulatoryValidityRecord) => {
    downloadTextReport(
      `Filing-Receipt-${rec.docName.replace(/\s+/g, "_")}.txt`,
      `MUNICIPAL / STATUTORY FILING RECEIPT\nDocument: ${rec.docName}\n${rec.ref}\nOfficer: ${rec.owner}\nStatus: APPLICATION ACKNOWLEDGED\nTimestamp: 2026-10-31 IST`,
    );
  };

  const hasExpiredRecord = records.some((r) => r.isExpired);

  return (
    <RoleGuard allowedRoles={["INSTITUTION"]}>
      <AppShell>
        <div className="space-y-8">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>INSTITUTION PORTAL / Document Validity</span>
            <span>Statutory Cycle AY 2027–28 • IST Standard</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Keep every certificate current.
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Document validity radar · Sahyadri Institute of Technology, Pune
                · As of 02 Nov 2026
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDocName("");
                setDocRef("");
                setExpiresOn("");
                setOwner("S. Patil");
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add validity record +</span>
            </button>
          </div>

          {successNotice && (
            <div className="flex items-center justify-between rounded-xl border border-[#C8E6C9] bg-[#E8F5E9] p-4 text-xs text-[#2E7D32] shadow-xs">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>{successNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessNotice(null)}
                className="text-xs font-semibold hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Alert Banner - Reactively updates when NOC is renewed */}
          {hasExpiredRecord ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#F3C39E] bg-[#FFFBF7] p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#EC642A]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Expired Fire NOC is blocking EoA scrutiny
                  </h2>
                  <p className="text-xs text-[#736357] mt-0.5">
                    Replace the certificate expired on 26 Oct 2026 in the
                    evidence workspace. Renewal records below do not replace
                    statutory evidence.
                  </p>
                </div>
              </div>
              <Link
                href="/institution/undertakings"
                className="inline-flex items-center justify-center rounded-md border border-[#E5E0D8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2A1810] hover:bg-neutral-50 transition-colors shadow-2xs self-start sm:self-auto whitespace-nowrap cursor-pointer"
              >
                <span>Upload renewed NOC →</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#C8E6C9] bg-[#E8F5E9] p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#2E7D32]">
                  <Check className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1B5E20]">
                    All Statutory Certificates Current &amp; Synchronized
                  </h2>
                  <p className="text-xs text-[#2E7D32] mt-0.5">
                    No blocking certificate expirations detected. Replacement
                    evidence registered with Regional Scrutiny Desk.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Expiry Radar Section - Fluid elevated panel */}
          <div className="rounded-xl bg-white p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
              <h2 className="text-sm font-bold text-[#2A1810]">Expiry radar</h2>
              <span className="text-xs text-[#736357]">
                Forward-looking calendar-day reminders
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
              {/* Card 1 */}
              <div className="rounded-xl border border-[#F0ECE6] bg-[#FAFAFA] p-4 relative border-b-2 border-b-[#FAAA21] shadow-2xs">
                <div className="inline-block rounded bg-[#FFF9E6] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8C6D1F]">
                  90-DAY WARNING
                </div>
                <div className="mt-3 text-base font-bold text-[#2A1810]">
                  1 lease deed
                </div>
                <div className="text-xs text-[#736357] mt-1">
                  By 31 Jan 2027
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-xl border border-[#F0ECE6] bg-[#FAFAFA] p-4 relative border-b-2 border-b-[#FAAA21] shadow-2xs">
                <div className="inline-block rounded bg-[#FFF9E6] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8C6D1F]">
                  60-DAY WARNING
                </div>
                <div className="mt-3 text-base font-bold text-[#2A1810]">
                  1 water certificate
                </div>
                <div className="text-xs text-[#736357] mt-1">
                  By 01 Jan 2027
                </div>
              </div>

              {/* Card 3 */}
              <div className="rounded-xl border border-[#F0ECE6] bg-[#FAFAFA] p-4 relative border-b-2 border-b-[#EC642A] shadow-2xs">
                <div className="inline-block rounded bg-[#FFF3E0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9A5B18]">
                  30-DAY WARNING
                </div>
                <div className="mt-3 text-base font-bold text-[#2A1810]">
                  1 Fire NOC
                </div>
                <div className="text-xs text-[#736357] mt-1">
                  By 02 Dec 2026
                </div>
              </div>

              {/* Card 4 */}
              <div className="rounded-xl border border-[#F0ECE6] bg-[#FAFAFA] p-4 relative border-b-2 border-b-[#EC642A] shadow-2xs">
                <div className="inline-block rounded bg-[#FFEBE5] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#C23B17]">
                  15-DAY WARNING
                </div>
                <div className="mt-3 text-base font-bold text-[#2A1810]">
                  1 safety report
                </div>
                <div className="text-xs text-[#736357] mt-1">
                  By 17 Nov 2026
                </div>
              </div>

              {/* Card 5 */}
              <div className="rounded-xl border border-[#F0ECE6] bg-[#FAFAFA] p-4 relative border-b-2 border-b-[#D32F2F] shadow-2xs">
                <div className="inline-block rounded bg-[#FFEBE5] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#C23B17]">
                  7-DAY WARNING
                </div>
                <div className="mt-3 text-base font-bold text-[#2A1810]">
                  1 lease addendum
                </div>
                <div className="text-xs text-[#736357] mt-1">
                  By 09 Nov 2026
                </div>
              </div>
            </div>
          </div>

          {/* Renewal Register Table */}
          <div className="rounded-xl bg-white p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
              <h2 className="text-sm font-bold text-[#2A1810]">
                Renewal register
              </h2>
              <span className="text-xs text-[#736357]">
                {records.length} monitored records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">DOCUMENT / CAMPUS</th>
                    <th className="py-3 px-2">EXPIRES ON</th>
                    <th className="py-3 px-2">TIME LEFT</th>
                    <th className="py-3 px-2">RENEWAL OWNER</th>
                    <th className="py-3 px-2">PRACTICAL NEXT STEP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {records.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="font-bold text-[#2A1810]">
                          {rec.docName}
                        </div>
                        <div className="text-[11px] text-[#736357]">
                          {rec.ref}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[#2A1810]">
                        {rec.expiresOn}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={
                            rec.isExpired
                              ? "text-[#D32F2F] font-bold"
                              : rec.isWarning
                                ? "text-[#EC642A] font-semibold"
                                : "text-[#736357]"
                          }
                        >
                          {rec.timeLeft}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-[#2A1810]">{rec.owner}</td>
                      <td className="py-3 px-2">
                        {rec.isReceiptDownload ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadReceipt(rec)}
                            className="font-medium text-[#EC642A] hover:underline cursor-pointer"
                          >
                            {rec.actionText}
                          </button>
                        ) : rec.actionHref ? (
                          <Link
                            href={rec.actionHref}
                            className="font-medium text-[#EC642A] hover:underline"
                          >
                            {rec.actionText}
                          </Link>
                        ) : (
                          <span className="text-[#736357]">
                            {rec.actionText}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Info Card (2 columns) */}
          <div className="rounded-lg border border-[#E5E0D8] bg-[#F8F7F5] p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#736357]">
              <div>
                Reminder ladder: 90 → 60 → 30 → 15 → 7 days before expiry.
                Notices go to the document owner and institution nodal officer.
              </div>
              <div className="md:text-right">
                Next digest: 03 Nov, 09:00 IST · 5 reminders queued. The
                authority's certificate date is the source of truth.
              </div>
            </div>
          </div>
        </div>

        {/* Add Validity Record Modal */}
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
                  <h2 className="text-base font-bold text-[#2A1810]">
                    Add Statutory Validity Record
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded p-1 text-[#736357] hover:bg-neutral-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleAddRecord} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Document Type / Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Environmental Clearance NOC / Occupancy Certificate"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Authority Reference Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PMC/ENV/2026/891"
                      value={docRef}
                      onChange={(e) => setDocRef(e.target.value)}
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        required
                        value={expiresOn}
                        onChange={(e) => setExpiresOn(e.target.value)}
                        className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                        Renewal Owner
                      </label>
                      <input
                        type="text"
                        required
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                        className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Certificate Document Upload
                    </label>
                    <FileDropzone
                      label="Attach certificate PDF"
                      helperText="PDF format · Instant SHA-256 fingerprint generation"
                    />
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
                      Register Validity Record →
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
