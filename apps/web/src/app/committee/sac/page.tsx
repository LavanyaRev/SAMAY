"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import {
  Scale,
  ShieldCheck,
  Download,
  CheckCircle2,
  FileText,
  Users,
  Eye,
  X,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { downloadTextReport } from "@/lib/download-utils";
import { regulatoryStore } from "@/lib/regulatory-store";
import { type SacAppealCase, CommitteeHearingStatus } from "@samay/shared";
import { AphClauseIntelligence } from "@/components/intelligence/aph-clause-intelligence";

type DocViewerTab = "brief" | "asset" | "petition" | "rejection";

export default function CommitteeSacPage() {
  const [appeals, setAppeals] = useState<SacAppealCase[]>([]);
  const [selectedAppealId, setSelectedAppealId] = useState<string>("");
  const [recommendationOutcome, setRecommendationOutcome] = useState<
    "UPHOLD_REJECTION" | "GRANT_RELIEF_CONDITIONAL" | "DIRECT_FRESH_EVC"
  >("GRANT_RELIEF_CONDITIONAL");
  const [rationale, setRationale] = useState<string>(
    "Appellate bench reviewed fresh physical asset invoices and building registers. Found substantial compliance; recommended conditional approval subject to 90-day undertaking.",
  );
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Document Viewer Modal State
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<DocViewerTab>("brief");

  useEffect(() => {
    const list = regulatoryStore.getSacAppeals();
    setAppeals(list);
    if (list.length > 0 && !selectedAppealId) {
      setSelectedAppealId(list[0].id);
    }
    const unsubscribe = regulatoryStore.subscribe(() => {
      const updated = regulatoryStore.getSacAppeals();
      setAppeals(updated);
    });
    return unsubscribe;
  }, [selectedAppealId]);

  const activeAppeal =
    appeals.find((a) => a.id === selectedAppealId) || appeals[0];

  const handleOpenDocViewer = (tab: DocViewerTab) => {
    setActiveDocTab(tab);
    setIsDocViewerOpen(true);
  };

  const generateReportContent = () => {
    if (!activeAppeal) return "";
    return `================================================================================
ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
STANDING APPELLATE COMMITTEE (SAC) - STATUTORY APPEAL ORDER & DISPOSITION
================================================================================

1. APPEAL IDENTIFICATION:
   Appeal Docket Ref:       ${activeAppeal.appealRef}
   Application Reference:   ${activeAppeal.applicationRef}
   Institution Name:        ${activeAppeal.institutionName} (${activeAppeal.institutionId})
   Hearing Status:          ${CommitteeHearingStatus.RECOMMENDATION_ISSUED}

2. APPELLATE BENCH COMPOSITION:
   ${activeAppeal.benchMembers.map((m, idx) => `${idx + 1}. ${m}`).join("\n   ")}

3. ORIGINAL GROUNDS OF REJECTION / PENALTY:
   "${activeAppeal.originalRejectionGrounds}"

4. INSTITUTION'S APPELLATE PETITION:
   "${activeAppeal.appealPetitionSummary}"

5. STATUTORY SAC RECOMMENDATION:
   DISPOSITION:             ${recommendationOutcome.replace(/_/g, " ")}
   DETAILED RATIONALE:      "${rationale}"

6. DIGITAL AUDIT LEDGER CERTIFICATION:
   Docket SHA-256 Digest:   ${activeAppeal.docketSha256}
   Timestamp:               2026-10-31 IST Standard
   Issued Under Mandate:    AICTE Approval Process Handbook (APH 2024-27 Chapter 3)
================================================================================`;
  };

  const handleDownloadSacOrder = () => {
    if (!activeAppeal) return;
    downloadTextReport(
      `SAC-Order-${activeAppeal.appealRef.replace(/\//g, "-")}.txt`,
      generateReportContent(),
    );
  };

  const handleRecordRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppeal) return;

    // Mutate state and append immutable audit entry (without auto-triggering download)
    regulatoryStore.recordSacRecommendation(
      activeAppeal.id,
      recommendationOutcome,
      rationale,
      "Appellate Bench (SAC)",
    );

    setSuccessNotice(
      `SAC Recommendation for ${activeAppeal.appealRef} recorded in immutable audit ledger and submitted to Competent Authority for final approval.`,
    );
  };

  return (
    <RoleGuard allowedRoles={["COMMITTEE_MEMBER", "ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>COMMITTEE PORTAL / SAC - Standing Appellate Committee</span>
            <span>Statutory Cycle AY 2027–28 • Chapter 3 Appeals Bench</span>
          </div>

          {/* Header Title */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Standing Appellate Committee (SAC)
              </h1>
              <span className="rounded bg-[#EC642A]/10 px-2 py-0.5 text-xs font-bold text-[#EC642A] border border-[#EC642A]/30">
                APH Clause 3.2 Appellate Bench
              </span>
            </div>
            <p className="text-sm text-[#736357] mt-1">
              Statutory appellate review bench strictly scoped for contested
              rejections under APH 2024–27 Clause 3.2. Formulates
              recommendations for final determination by the Executive
              Committee.
            </p>
          </div>

          {/* Statutory Separation & Authority Boundary Notice */}
          <div className="rounded-lg border border-[#FFE082] bg-[#FFF8E1] p-3.5 text-xs text-[#7A5B00] space-y-1 shadow-2xs leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-[#5D4200]">
              <AlertCircle className="h-4 w-4 text-[#EC642A]" />
              <span>REGULATORY &amp; COMMITTEE SEPARATION MANDATE</span>
            </div>
            <p>
              The Standing Appellate Committee is an appellate tribunal limited
              to hearing institutional appeals against formal rejection orders.{" "}
              <strong>
                SAC does not issue final approval or rejection decrees
              </strong>
              ; all dispositions recorded by this bench are advisory
              recommendations formally transmitted to the{" "}
              <strong>Authorized Officer / Executive Committee</strong> for
              final Council orders.
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
                onClick={handleDownloadSacOrder}
                className="inline-flex items-center gap-1.5 rounded border border-[#81C784] bg-white px-2.5 py-1 text-xs font-semibold text-[#2E7D32] hover:bg-[#F1F8E9] shadow-2xs self-start sm:self-auto cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Download SAC Order (Optional)</span>
              </button>
            </div>
          )}

          {/* Target Appeal Case Selector */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EC642A]/10 text-[#EC642A]">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#8A7D75]">
                    Select Listed Appeal Docket
                  </div>
                  <div className="text-sm font-bold text-[#2A1810]">
                    {activeAppeal?.appealRef} · {activeAppeal?.institutionName}
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-80">
                <select
                  value={selectedAppealId}
                  onChange={(e) => setSelectedAppealId(e.target.value)}
                  className="w-full rounded-md border border-[#E5E0D8] bg-[#FAFAFA] p-2 text-xs font-semibold text-[#2A1810] focus:border-[#EC642A] focus:outline-none cursor-pointer"
                >
                  {appeals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.appealRef} ({a.institutionName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {activeAppeal && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Case Docket Details */}
              <div className="lg:col-span-7 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#2A1810]">
                      Statutory Appeal Record
                    </h2>
                    <span className="text-xs text-[#736357]">
                      Reference: {activeAppeal.applicationRef}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDocViewer("brief")}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E0D8] bg-[#FAFAFA] px-2.5 py-1 text-xs font-semibold text-[#EC642A] hover:bg-white shadow-2xs cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect Documents</span>
                    </button>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#FFF9E6] text-[#8C6D1F]">
                      {activeAppeal.hearingStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Original Rejection Grounds */}
                <div className="rounded-md border border-[#FFEBE5] bg-[#FFFBF7] p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#C23B17]">
                      Original Decision / Rejection Grounds:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenDocViewer("rejection")}
                      className="text-[11px] font-semibold text-[#C23B17] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      <span>View Rejection Order</span>
                    </button>
                  </div>
                  <p className="text-[#736357]">
                    {activeAppeal.originalRejectionGrounds}
                  </p>
                </div>

                {/* Institution's Appeal Submission */}
                <div className="rounded-md border border-[#E5E0D8] bg-[#FAFAFA] p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2A1810]">
                      Appellant Institution Representation:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenDocViewer("petition")}
                      className="text-[11px] font-semibold text-[#EC642A] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      <span>View Sworn Petition</span>
                    </button>
                  </div>
                  <p className="text-[#736357]">
                    {activeAppeal.appealPetitionSummary}
                  </p>
                </div>

                {/* Bench Members */}
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#2A1810]">
                    <Users className="h-4 w-4 text-[#EC642A]" />
                    <span>Constituted Appellate Bench:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[#736357] pl-1">
                    {activeAppeal.benchMembers.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>

                {/* Attached Evidence Documents with Interactive Viewer Buttons */}
                <div className="space-y-2.5 pt-2 border-t border-[#F0ECE6] text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[#2A1810]">
                      Submitted Counter-Evidence Documents:
                    </div>
                    <span className="text-[11px] text-[#8A7D75]">
                      {activeAppeal.submittedAppealDocuments.length} files
                      attached
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeAppeal.submittedAppealDocuments.map((doc, idx) => {
                      const tabTarget: DocViewerTab = doc.filename.includes(
                        "Asset",
                      )
                        ? "asset"
                        : "brief";
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-[#E5E0D8] bg-white hover:bg-[#FAFAFA] transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-[#EC642A] shrink-0" />
                            <div className="min-w-0">
                              <div className="font-mono text-[#2A1810] font-semibold truncate text-xs">
                                {doc.filename}
                              </div>
                              <div className="text-[10px] text-[#8A7D75]">
                                Uploaded on {doc.uploadedAt} · SHA-256 verified
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="hidden sm:flex items-center gap-1 text-[#2E7D32]">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span className="font-mono text-[10px]">
                                {doc.sha256.slice(0, 10)}...
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenDocViewer(tabTarget)}
                              className="inline-flex items-center gap-1 rounded border border-[#E5E0D8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2A1810] hover:bg-[#FAF8F5] shadow-2xs cursor-pointer"
                            >
                              <Eye className="h-3 w-3 text-[#EC642A]" />
                              <span>View Document</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Record Recommendation */}
              <form
                onSubmit={handleRecordRecommendation}
                className="lg:col-span-5 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4"
              >
                <div className="border-b border-[#F0ECE6] pb-3">
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Record SAC Recommendation
                  </h2>
                  <p className="text-xs text-[#736357] mt-0.5">
                    Adjudicate appeal and transmit order to Member Secretary.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                    Bench Recommendation Outcome *
                  </label>
                  <select
                    value={recommendationOutcome}
                    onChange={(e) =>
                      setRecommendationOutcome(
                        e.target.value as
                          | "UPHOLD_REJECTION"
                          | "GRANT_RELIEF_CONDITIONAL"
                          | "DIRECT_FRESH_EVC",
                      )
                    }
                    className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs font-semibold text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                  >
                    <option value="GRANT_RELIEF_CONDITIONAL">
                      Grant Relief Subject to 90-Day Conditional Undertaking
                    </option>
                    <option value="DIRECT_FRESH_EVC">
                      Direct Fresh Re-inspection by Independent EVC
                    </option>
                    <option value="UPHOLD_REJECTION">
                      Uphold Rejection Decision (No Relief Granted)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                    Statutory Rationale &amp; Grounds *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Enter detailed reasons citing relevant APH chapters and submitted evidence..."
                    className="w-full rounded border border-[#E5E0D8] bg-white p-2.5 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none resize-none"
                  />
                </div>

                <div className="rounded bg-[#FFFBF7] border border-[#F3C39E] p-3 text-[11px] text-[#736357]">
                  SAC recommendations are advisory to the Competent Authority.
                  Decision becomes final upon Member Secretary sign-off.
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] py-2.5 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  <span>Sign &amp; Issue SAC Recommendation →</span>
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8A7D75]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#2E7D32]" />
                  <span>
                    Mutates state &amp; writes immutable SHA-256 transaction
                    audit entry
                  </span>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* INTERACTIVE SAC DOCUMENT VIEWER MODAL */}
          {/* ========================================================================= */}
          {isDocViewerOpen && activeAppeal && (
            <div
              className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
            >
              <div className="flex min-h-full items-center justify-center py-6 sm:py-10">
                <div
                  className="w-full max-w-3xl flex flex-col rounded-xl border border-[#E5E0D8] bg-white shadow-2xl overflow-hidden"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-[#F0ECE6] px-6 py-4 bg-[#FAF8F5]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EC642A]/10 text-[#EC642A]">
                        <FileCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#2A1810]">
                          SAC Appellate Evidence Dossier Viewer
                        </h3>
                        <p className="text-[11px] text-[#736357]">
                          {activeAppeal.appealRef} ·{" "}
                          {activeAppeal.institutionName} (
                          {activeAppeal.institutionId})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#C8E6C9]">
                        <ShieldCheck className="h-3 w-3" />
                        SHA-256 Verified
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsDocViewerOpen(false)}
                        className="text-[#8A7D75] hover:text-[#2A1810] p-1 rounded cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Document Navigation Tabs */}
                  <div className="flex items-center border-b border-[#E5E0D8] bg-[#F5F2EB]/50 px-6 gap-2 overflow-x-auto text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveDocTab("brief")}
                      className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                        activeDocTab === "brief"
                          ? "border-[#EC642A] text-[#EC642A] bg-white"
                          : "border-transparent text-[#736357] hover:text-[#2A1810]"
                      }`}
                    >
                      Vidarbha_SAC_Appeal_Brief.pdf
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDocTab("asset")}
                      className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                        activeDocTab === "asset"
                          ? "border-[#EC642A] text-[#EC642A] bg-white"
                          : "border-transparent text-[#736357] hover:text-[#2A1810]"
                      }`}
                    >
                      Asset_Register_Affidavit.pdf
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDocTab("petition")}
                      className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                        activeDocTab === "petition"
                          ? "border-[#EC642A] text-[#EC642A] bg-white"
                          : "border-transparent text-[#736357] hover:text-[#2A1810]"
                      }`}
                    >
                      Appellant Sworn Petition
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDocTab("rejection")}
                      className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                        activeDocTab === "rejection"
                          ? "border-[#EC642A] text-[#EC642A] bg-white"
                          : "border-transparent text-[#736357] hover:text-[#2A1810]"
                      }`}
                    >
                      Original Rejection Grounds
                    </button>
                  </div>

                  {/* Embedded Document View Body */}
                  <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA] space-y-4">
                    {/* TAB 1: Vidarbha_SAC_Appeal_Brief.pdf */}
                    {activeDocTab === "brief" && (
                      <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-4 text-xs font-serif leading-relaxed text-[#2A1810]">
                        <div className="border-b border-[#E5E0D8] pb-3 text-center space-y-1 font-sans">
                          <div className="text-[10px] uppercase tracking-widest text-[#8A7D75] font-bold">
                            Statutory Appellate Submission · APH Chapter 3
                          </div>
                          <div className="font-bold text-sm text-[#2A1810]">
                            MEMORANDUM OF APPEAL UNDER CLAUSE 3.2 OF APH 2024–27
                          </div>
                          <div className="text-[11px] text-[#736357]">
                            BEFORE THE STANDING APPELLATE COMMITTEE (SAC), AICTE
                            NEW DELHI
                          </div>
                        </div>

                        <div className="space-y-3 font-sans">
                          <div className="rounded bg-[#FAF8F5] p-3 border border-[#F0ECE6] space-y-1 text-xs">
                            <div>
                              <span className="font-bold">Appellant:</span>{" "}
                              Vidarbha Engineering College, Nagpur (AICTE
                              Permanent ID: 1-DEMO-4011)
                            </div>
                            <div>
                              <span className="font-bold">Respondent:</span>{" "}
                              Regional Officer, Western Regional Office (WRO),
                              AICTE
                            </div>
                            <div>
                              <span className="font-bold">
                                Impugned Action:
                              </span>{" "}
                              Return of EoA Application Ref{" "}
                              {activeAppeal.applicationRef} dated 12 Oct 2026
                            </div>
                          </div>

                          <div className="font-serif space-y-2 text-xs text-[#2A1810]">
                            <p className="font-bold">
                              1. STATEMENT OF FACTS &amp; REBUTTAL:
                            </p>
                            <p>
                              The appellant respectfully submits that during the
                              Expert Visit Committee (EVC) inspection, the
                              delivery of 120 dedicated engineering workstations
                              was in transit under GeM Purchase Order
                              GEM/2026/B/894102. The core machinery and CAD/CAM
                              software licenses were duly procured and installed
                              on campus on 24 October 2026.
                            </p>

                            <p className="font-bold">
                              2. STATUTORY COMPLIANCE SUBSTANTIATION:
                            </p>
                            <p>
                              The physical laboratories—namely (i) Artificial
                              Intelligence &amp; Robotics Lab, (ii) Advanced
                              VLSI Design Lab, and (iii) Mechatronics Lab—are
                              fully commissioned with 1:1 student-to-workstation
                              allocation, 1 Gbps dedicated internet leased line,
                              and licensed MATLAB/AutoCAD software.
                            </p>

                            <p className="font-bold">
                              3. PRAYER &amp; RELIEF SOUGHT:
                            </p>
                            <p>
                              In view of the complete cure of the reported
                              deficit within the statutory reconsideration
                              window, the Appellant prays that the Hon'ble
                              Appellate Bench be pleased to set aside the
                              rejection memo and recommend unconditional
                              Extension of Approval (EoA) for Academic Year
                              2027–28.
                            </p>
                          </div>

                          <div className="border-t border-[#E5E0D8] pt-3 flex items-center justify-between text-[11px] text-[#736357]">
                            <span>
                              Digitally Attested: Principal, Vidarbha
                              Engineering
                            </span>
                            <span className="font-mono text-[10px] text-[#2E7D32]">
                              SHA-256: 9c824f1182374e62...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: Asset_Register_Affidavit.pdf */}
                    {activeDocTab === "asset" && (
                      <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-4 text-xs font-serif leading-relaxed text-[#2A1810]">
                        <div className="border-b border-[#E5E0D8] pb-3 text-center space-y-1 font-sans">
                          <div className="text-[10px] uppercase tracking-widest text-[#8A7D75] font-bold">
                            Statutory Notarized Affidavit
                          </div>
                          <div className="font-bold text-sm text-[#2A1810]">
                            CERTIFICATE OF LABORATORY READINESS &amp; ASSET
                            VERIFICATION
                          </div>
                          <div className="text-[11px] text-[#736357]">
                            Executed on ₹500 Non-Judicial Stamp Paper
                            (Maharashtra e-Stamp No. IN-MH198273645)
                          </div>
                        </div>

                        <div className="space-y-3 font-sans text-xs">
                          <p>
                            I, Dr. R. K. Deshmukh, Principal and Authorized
                            Representative of Vidarbha Engineering College, do
                            hereby solemnly swear and affirm as follows:
                          </p>

                          <div className="rounded border border-[#E5E0D8] overflow-hidden">
                            <table className="w-full text-left text-[11px]">
                              <thead className="bg-[#FAF8F5] border-b border-[#E5E0D8] text-[10px] font-bold uppercase text-[#8A7D75]">
                                <tr>
                                  <th className="p-2">LABORATORY</th>
                                  <th className="p-2">EQUIPMENT / MAKE</th>
                                  <th className="p-2">QTY</th>
                                  <th className="p-2">STOCK REG. FOLIO</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#F0ECE6]">
                                <tr>
                                  <td className="p-2 font-semibold">
                                    AI &amp; Robotics Lab
                                  </td>
                                  <td className="p-2">
                                    Dell Precision 3660 Workstations, RTX A4000
                                  </td>
                                  <td className="p-2">40 Units</td>
                                  <td className="p-2 font-mono">
                                    VOL-IV / P. 84
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2 font-semibold">
                                    VLSI Design Lab
                                  </td>
                                  <td className="p-2">
                                    Xilinx FPGA Kintex-7 Development Kits
                                  </td>
                                  <td className="p-2">40 Units</td>
                                  <td className="p-2 font-mono">
                                    VOL-IV / P. 92
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-2 font-semibold">
                                    Mechatronics Lab
                                  </td>
                                  <td className="p-2">
                                    Festo Modular Mechatronics Trainers
                                  </td>
                                  <td className="p-2">40 Units</td>
                                  <td className="p-2 font-mono">
                                    VOL-V / P. 12
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="rounded bg-[#E8F5E9] p-3 text-[#2E7D32] border border-[#C8E6C9] flex items-center justify-between">
                            <span>
                              Notary Public Registration: NOTARY/MAH/8941/2026
                            </span>
                            <span className="font-bold">
                              Notarized 28 Oct 2026
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: Appellant Sworn Petition */}
                    {activeDocTab === "petition" && (
                      <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-4 text-xs font-sans text-[#2A1810]">
                        <div className="border-b border-[#E5E0D8] pb-3 space-y-1">
                          <div className="text-sm font-bold text-[#2A1810]">
                            Institutional Appeal Petition &amp; Undertaking
                          </div>
                          <div className="text-xs text-[#736357]">
                            Filed by: Sahyadri Educational Trust for Vidarbha
                            Engineering College
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="rounded bg-[#FFFBF7] p-3 border border-[#F3C39E] text-xs text-[#736357]">
                            <span className="font-bold text-[#2A1810]">
                              Petition Summary:{" "}
                            </span>
                            {activeAppeal.appealPetitionSummary}
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="font-bold text-[#2A1810]">
                              Institutional Undertaking:
                            </div>
                            <p className="text-[#736357]">
                              The institution undertakes to maintain all 120
                              workstations and verified laboratory apparatus in
                              full operational readiness throughout Academic
                              Cycle 2027–28 and consents to unannounced surprise
                              physical audits by AICTE.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: Original Rejection Grounds */}
                    {activeDocTab === "rejection" && (
                      <div className="rounded-lg border border-[#FFEBE5] bg-[#FFFBF7] p-6 shadow-xs space-y-4 text-xs font-sans text-[#2A1810]">
                        <div className="border-b border-[#F3C39E] pb-3 space-y-1">
                          <div className="flex items-center gap-2 font-bold text-sm text-[#C23B17]">
                            <AlertCircle className="h-4 w-4" />
                            <span>
                              Original Scrutiny &amp; EVC Impugned Finding
                            </span>
                          </div>
                          <div className="text-xs text-[#736357]">
                            Issued under WRO Inspection Notice No.
                            WRO/EVC/2027/1017
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="rounded bg-white p-3 border border-[#FFEBE5] text-xs text-[#736357]">
                            <span className="font-bold text-[#C23B17]">
                              Recorded Finding:{" "}
                            </span>
                            {activeAppeal.originalRejectionGrounds}
                          </div>

                          <div className="text-xs text-[#736357] space-y-1">
                            <p>
                              <span className="font-semibold text-[#2A1810]">
                                Cited Clause:
                              </span>{" "}
                              APH 2024-27 Clause 2.5 (Norms for Laboratories
                              &amp; Technical Equipment)
                            </p>
                            <p>
                              <span className="font-semibold text-[#2A1810]">
                                Recommendation:
                              </span>{" "}
                              Rejection of Extension of Approval (EoA) due to
                              deficit during visit.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* APH Clause Intelligence Panel embedded in Document Viewer */}
                    <div className="pt-2">
                      <AphClauseIntelligence
                        documentName={
                          activeDocTab === "brief"
                            ? "Vidarbha_SAC_Appeal_Brief.pdf"
                            : activeDocTab === "asset"
                              ? "Asset_Register_Affidavit.pdf"
                              : activeDocTab === "petition"
                                ? "Appellant_Sworn_Petition.pdf"
                                : "EVC_Rejection_Grounds_Dossier.pdf"
                        }
                        sha256Hash={
                          activeDocTab === "brief"
                            ? "9c824f1182374e62938a7b0192837465e9102938475610293847561029384756"
                            : "1f8290ab48591029384756102938475610293847561029384756102938475610"
                        }
                        compact={true}
                      />
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between border-t border-[#F0ECE6] px-6 py-3 bg-white">
                    <div className="flex items-center gap-2 text-xs text-[#736357]">
                      <ShieldCheck className="h-4 w-4 text-[#2E7D32]" />
                      <span>
                        Cryptographic chain verified against AICTE Ledger
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDocViewerOpen(false)}
                        className="rounded border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-semibold text-[#2A1810] hover:bg-neutral-50 cursor-pointer"
                      >
                        Close Viewer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  );
}
