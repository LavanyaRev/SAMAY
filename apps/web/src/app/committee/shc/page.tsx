"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import {
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Video,
  AlertCircle,
} from "lucide-react";
import { downloadTextReport } from "@/lib/download-utils";
import { regulatoryStore } from "@/lib/regulatory-store";
import { type ShcHearingCase } from "@samay/shared";

export default function CommitteeShcPage() {
  const [hearings, setHearings] = useState<ShcHearingCase[]>([]);
  const [selectedHearingId, setSelectedHearingId] = useState<string>("");
  const [recommendationOutcome, setRecommendationOutcome] = useState<
    "SATISFACTORY_CLOSURE" | "ISSUE_SHOW_CAUSE" | "PENALTY_INTAKE_REDUCTION"
  >("SATISFACTORY_CLOSURE");
  const [notes, setNotes] = useState<string>(
    "Institution appeared before SHC panel with verified municipal compliance certificates and geotagged barrier-free ramps. Hearing concluded satisfactorily.",
  );
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    const list = regulatoryStore.getShcHearings();
    setHearings(list);
    if (list.length > 0 && !selectedHearingId) {
      setSelectedHearingId(list[0].id);
    }
    const unsubscribe = regulatoryStore.subscribe(() => {
      const updated = regulatoryStore.getShcHearings();
      setHearings(updated);
    });
    return unsubscribe;
  }, [selectedHearingId]);

  const activeHearing =
    hearings.find((h) => h.id === selectedHearingId) || hearings[0];

  const handleDownloadDispositionDocket = () => {
    if (!activeHearing) return;
    const reportContent = `================================================================================
ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
STANDING HEARING COMMITTEE (SHC) - FORMAL HEARING DISPOSITION RECORD
================================================================================

1. HEARING DETAILS:
   Hearing Reference:       ${activeHearing.hearingRef}
   Application Reference:   ${activeHearing.applicationRef}
   Institution Name:        ${activeHearing.institutionName} (${activeHearing.institutionId})
   Scheduled Date:          ${activeHearing.scheduledHearingDate}
   Mode of Appearance:      ${activeHearing.hearingMode}

2. DEFICIENCIES SCRUTINIZED:
   "${activeHearing.evcDeficiencySummary}"

3. INSTITUTIONAL COMPLIANCE SUBMISSION:
   "${activeHearing.complianceReportSummary}"

4. SHC HEARING PANEL FINDINGS & DISPOSITION:
   DISPOSITION:             ${recommendationOutcome.replace(/_/g, " ")}
   PANEL NOTES:             "${notes}"

5. STATUTORY CERTIFICATION:
   Issued Under Mandate:    AICTE Approval Process Handbook (APH 2024-27 Chapter 2)
   Timestamp:               2026-10-31 IST Standard
================================================================================`;

    downloadTextReport(
      `SHC-Disposition-${activeHearing.hearingRef.replace(/\//g, "-")}.txt`,
      reportContent,
    );
  };

  const handleRecordRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHearing) return;

    // Mutate state and append immutable audit entry (without auto-triggering download)
    regulatoryStore.recordShcRecommendation(
      activeHearing.id,
      recommendationOutcome,
      notes,
      "Hearing Committee (SHC)",
    );

    setSuccessNotice(
      `SHC Hearing Disposition for ${activeHearing.hearingRef} recorded in immutable audit ledger and submitted for Bureau review.`,
    );
  };

  return (
    <RoleGuard allowedRoles={["COMMITTEE_MEMBER", "ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>COMMITTEE PORTAL / SHC - Standing Hearing Committee</span>
            <span>
              Statutory Cycle AY 2027–28 • Chapter 2 Deficiency Hearings
            </span>
          </div>

          {/* Header Title */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Standing Hearing Committee (SHC)
              </h1>
              <span className="rounded bg-[#EC642A]/10 px-2 py-0.5 text-xs font-bold text-[#EC642A] border border-[#EC642A]/30">
                APH Clause 3.1 Compliance Bench
              </span>
            </div>
            <p className="text-sm text-[#736357] mt-1">
              Verify compliance on unrectified scrutiny/EVC shortcomings and
              Show Cause Notices (SCN). Bench recommendations are formally
              placed before the Executive Committee.
            </p>
          </div>

          {/* Statutory Separation & Authority Boundary Notice */}
          <div className="rounded-lg border border-[#FFE082] bg-[#FFF8E1] p-3.5 text-xs text-[#7A5B00] space-y-1 shadow-2xs leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-[#5D4200]">
              <AlertCircle className="h-4 w-4 text-[#EC642A]" />
              <span>
                STATUTORY HEARING JURISDICTION &amp; EXECUTIVE COMMITTEE
                REPORTING
              </span>
            </div>
            <p>
              Under APH 2024–27 Chapter III, the Standing Hearing Committee is
              strictly convened to evaluate institutional responses to Show
              Cause Notices and unrectified inspection deficits.{" "}
              <strong>
                All findings recorded here are advisory hearing recommendations
              </strong>{" "}
              formally submitted to the{" "}
              <strong>Executive Committee of AICTE</strong> for authorized
              determination and penalty orders.
            </p>
          </div>

          {successNotice && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#C8E6C9] bg-[#E8F5E9] p-3.5 text-xs text-[#2E7D32] shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2E7D32]" />
                <span className="font-medium">{successNotice}</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadDispositionDocket}
                className="inline-flex items-center gap-1.5 rounded border border-[#81C784] bg-white px-2.5 py-1 text-xs font-semibold text-[#2E7D32] hover:bg-[#F1F8E9] shadow-2xs self-start sm:self-auto cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Download Disposition (Optional)</span>
              </button>
            </div>
          )}

          {/* Target Hearing Case Selector */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EC642A]/10 text-[#EC642A]">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#8A7D75]">
                    Select Listed Hearing Docket
                  </div>
                  <div className="text-sm font-bold text-[#2A1810]">
                    {activeHearing?.hearingRef} ·{" "}
                    {activeHearing?.institutionName}
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-80">
                <select
                  value={selectedHearingId}
                  onChange={(e) => setSelectedHearingId(e.target.value)}
                  className="w-full rounded-md border border-[#E5E0D8] bg-[#FAFAFA] p-2 text-xs font-semibold text-[#2A1810] focus:border-[#EC642A] focus:outline-none cursor-pointer"
                >
                  {hearings.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.hearingRef} ({h.institutionName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {activeHearing && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Hearing Docket Details */}
              <div className="lg:col-span-7 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#2A1810]">
                      Hearing Record &amp; Schedule
                    </h2>
                    <span className="text-xs text-[#736357]">
                      Reference: {activeHearing.applicationRef}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#1565C0] bg-[#E3F2FD] px-2 py-0.5 rounded">
                      <Video className="h-3 w-3" />
                      <span>{activeHearing.hearingMode} Mode</span>
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#FFF9E6] text-[#8C6D1F]">
                      {activeHearing.hearingStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* EVC Deficiency Summary */}
                <div className="rounded-md border border-[#F3C39E] bg-[#FFFBF7] p-3 text-xs space-y-1">
                  <div className="font-bold text-[#2A1810]">
                    Reported EVC Deficiency / Violation:
                  </div>
                  <p className="text-[#736357]">
                    {activeHearing.evcDeficiencySummary}
                  </p>
                </div>

                {/* Institution's Compliance Submission */}
                <div className="rounded-md border border-[#E5E0D8] bg-[#FAFAFA] p-3 text-xs space-y-1">
                  <div className="font-bold text-[#2A1810]">
                    Institution Rectification Evidence:
                  </div>
                  <p className="text-[#736357]">
                    {activeHearing.complianceReportSummary}
                  </p>
                </div>

                {/* Hearing Session Schedule */}
                <div className="rounded-md border border-[#C8E6C9] bg-[#E8F5E9] p-3 text-xs text-[#1B5E20] space-y-1">
                  <div className="font-bold">Scheduled Hearing Session:</div>
                  <div className="font-mono">
                    {activeHearing.scheduledHearingDate}
                  </div>
                  <div className="text-[11px] text-[#2E7D32]">
                    Committee Quorum: AICTE Regional Officer, 2 External
                    Academic Experts, Legal Nominee.
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Record Hearing Disposition */}
              <form
                onSubmit={handleRecordRecommendation}
                className="lg:col-span-5 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4"
              >
                <div className="border-b border-[#F0ECE6] pb-3">
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Record Hearing Disposition
                  </h2>
                  <p className="text-xs text-[#736357] mt-0.5">
                    Record formal committee recommendation for Approval Bureau
                    review.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                    Committee Finding &amp; Recommendation *
                  </label>
                  <select
                    value={recommendationOutcome}
                    onChange={(e) =>
                      setRecommendationOutcome(
                        e.target.value as
                          | "SATISFACTORY_CLOSURE"
                          | "ISSUE_SHOW_CAUSE"
                          | "PENALTY_INTAKE_REDUCTION",
                      )
                    }
                    className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs font-semibold text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                  >
                    <option value="SATISFACTORY_CLOSURE">
                      Satisfactory Compliance Verified (Recommend Approval)
                    </option>
                    <option value="ISSUE_SHOW_CAUSE">
                      Issue Statutory Show Cause Notice (SCN)
                    </option>
                    <option value="PENALTY_INTAKE_REDUCTION">
                      Recommend 25% Intake Reduction Penalty
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                    Hearing Notes &amp; Observations *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter summary of discussion, evidence examined, and reason for committee disposition..."
                    className="w-full rounded border border-[#E5E0D8] bg-white p-2.5 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] py-2.5 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  <span>Submit Hearing Disposition →</span>
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8A7D75]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#2E7D32]" />
                  <span>
                    Mutates state &amp; records immutable SHA-256 hearing record
                  </span>
                </div>
              </form>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  );
}
