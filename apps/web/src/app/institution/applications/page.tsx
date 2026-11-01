"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import {
  Download,
  Check,
  X,
  FilePlus,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { downloadCsv, downloadTextReport } from "@/lib/download-utils";
import {
  FileDropzone,
  type UploadedRegulatoryFile,
} from "@/components/ui/file-dropzone";
import {
  regulatoryStore,
  type RegulatoryApplication,
} from "@/lib/regulatory-store";
import { TerPaymentTracker } from "@/components/payments/ter-payment-tracker";
import { AphClauseIntelligence } from "@/components/intelligence/aph-clause-intelligence";
import type { AphWorkflowRoute, TerPaymentRecord } from "@samay/shared";

interface ApplicationRecord {
  ref: string;
  type: string;
  year: string;
  submitted: string;
  program: string;
  intakeText: string;
  status: string;
  statusDetail?: string;
  isDeficiency?: boolean;
  actionText: string;
  actionHref?: string;
  isDownload?: boolean;
  route?: AphWorkflowRoute;
  routeLabel?: string;
  payment?: TerPaymentRecord;
}

function mapToRecord(a: RegulatoryApplication): ApplicationRecord {
  const isApproved =
    a.stage === "APPROVAL" || a.status.toLowerCase().includes("approved");
  return {
    ref: a.ref,
    type: a.type,
    year: a.academicYear,
    submitted: a.submittedOn,
    program: a.program,
    intakeText: `${a.intake} seats`,
    status: a.status,
    statusDetail: a.deficiencyMemo ? `Memo ${a.deficiencyMemo}` : undefined,
    isDeficiency: a.hasDeficiency,
    actionText: a.nextAction,
    actionHref: a.nextActionHref,
    isDownload: isApproved,
    route: a.route,
    routeLabel: a.routeLabel,
    payment: a.payment,
  };
}

export default function InstitutionApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState("All years");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedRegulatoryFile[]>(
    [],
  );
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // View submission dossier state
  const [selectedSubmissionForView, setSelectedSubmissionForView] =
    useState<ApplicationRecord | null>(null);
  const [isViewSubmissionModalOpen, setIsViewSubmissionModalOpen] =
    useState(false);

  // Draft continuation state
  const [editingDraftRef, setEditingDraftRef] = useState<string | null>(null);

  // Form states for new application (Clean initial states without ghost text)
  const [newType, setNewType] = useState("Extension of Approval");
  const [newProgram, setNewProgram] = useState("");
  const [newIntake, setNewIntake] = useState("");
  const [newYear] = useState("2027–28");

  useEffect(() => {
    const loadApps = () => {
      const stored = regulatoryStore.getApplications();
      const instApps = stored.filter(
        (a) => a.instId === "1-DEMO-4102" || a.instName.includes("Sahyadri"),
      );
      setApplications(instApps.map(mapToRecord));
    };
    loadApps();
    const unsubscribe = regulatoryStore.subscribe(loadApps);
    return unsubscribe;
  }, []);

  // Export CSV handler
  const handleExportCsv = () => {
    const headers = [
      "Application Ref",
      "Type",
      "Academic Year",
      "Submitted Date",
      "Program",
      "Intake",
      "Status",
      "Status Detail",
    ];
    const rows = applications.map((a) => [
      a.ref,
      a.type,
      a.year,
      a.submitted,
      a.program,
      a.intakeText,
      a.status,
      a.statusDetail || "",
    ]);
    downloadCsv("applications-register-ay2027-28.csv", headers, rows);
  };

  // Download Order handler
  const handleDownloadOrder = (app: ApplicationRecord) => {
    const content = `================================================================================
ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
STATUTORY APPROVAL PROCESS HANDBOOK COMPLIANCE DIVISION
NEW DELHI - 110070
================================================================================

ORDER OF APPROVAL: EXTENSION OF APPROVAL (EoA) / LETTER OF APPROVAL (LoA)

Application Reference: ${app.ref}
Academic Year:         ${app.year}
Institution:           Sahyadri Institute of Technology, Pune (ID: 1-DEMO-4102)
Regional Office:       Western Regional Office (WRO), Mumbai

Programme Approved:    ${app.program}
Approved Intake:       ${app.intakeText}
Issuing Authority:     Member Secretary, AICTE New Delhi

Status:                ${app.status.toUpperCase()}
Order Reference:       AICTE/WRO/${app.ref}/ORDER-2026/FINAL

DIGITAL AUDIT VERIFICATION:
SHA-256 Digest: c9824f1182374e62938a7b0192837465e9102938475610293847561029384756
Timestamp:      2026-03-14 10:30:00 IST
================================================================================`;
    downloadTextReport(`Approval-Order-${app.ref}.txt`, content);
  };

  // Open "View submission" drawer/modal
  const handleOpenViewSubmission = (app: ApplicationRecord) => {
    setSelectedSubmissionForView(app);
    setIsViewSubmissionModalOpen(true);
  };

  // Open "Continue draft" modal with saved draft data pre-loaded
  const handleOpenContinueDraft = (app: ApplicationRecord) => {
    setEditingDraftRef(app.ref);
    setNewType(app.type || "Additional intake");
    setNewProgram(app.program || "Computer Engineering");
    setNewIntake(app.intakeText.replace(/[^0-9]/g, "") || "60");
    setIsModalOpen(true);
  };

  // Open fresh application modal (cleared inputs)
  const handleOpenCreateFresh = () => {
    setEditingDraftRef(null);
    setNewType("Extension of Approval");
    setNewProgram("");
    setNewIntake("");
    setUploadedFiles([]);
    setIsModalOpen(true);
  };

  // Submit New or Continued Application
  const handleCreateApplication = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedProgram =
      newProgram.trim() || "Artificial Intelligence & Data Science";
    const resolvedIntake = Number(newIntake) || 60;

    if (editingDraftRef) {
      // Finalize continuing draft
      regulatoryStore.updateApplication(editingDraftRef, {
        type: newType,
        program: resolvedProgram,
        intake: resolvedIntake,
        submittedOn: "Today, IST",
        stage: "SCRUTINY",
        stageLabel: "Scrutiny Queue",
        status: "SUBMITTED",
        currentQueue: "REGIONAL_SCRUTINY",
        ballWith: "REGIONAL_OFFICER",
        statusPillClass: "text-[#736357]",
        nextAction: "View submission →",
        hasDeficiency: false,
        undertakingsCompleted: 8,
        undertakingsTotal: 8,
      });

      setIsModalOpen(false);
      setEditingDraftRef(null);
      setSuccessNotice(
        `Draft application ${editingDraftRef} finalized and submitted to Regional Scrutiny Desk.`,
      );

      downloadTextReport(
        `Acknowledgement-${editingDraftRef}.txt`,
        `AICTE STATUTORY ACKNOWLEDGEMENT RECEIPT\nReference: ${editingDraftRef}\nInstitution: Sahyadri Institute of Technology\nProgram: ${resolvedProgram} (${resolvedIntake} seats)\nStatus: SUBMITTED (72% draft promoted to Scrutiny Queue)\nFee: ₹1,00,000 received\nAudit Timestamp: 2026-10-31 IST`,
      );
    } else {
      // New submission
      const created = regulatoryStore.addApplication({
        type: newType,
        academicYear: newYear,
        program: resolvedProgram,
        intake: resolvedIntake,
        instName: "Sahyadri Institute of Technology",
        instId: "1-DEMO-4102",
        stage: "SUBMISSION",
        stageLabel: "Scrutiny Pending",
        status: "Scrutiny pending · Fee acknowledged",
        statusPillClass: "text-[#736357]",
        nextAction: "View submission →",
        hasDeficiency: false,
        undertakingsCompleted: 8,
        undertakingsTotal: 8,
      });

      setNewProgram("");
      setNewIntake("");
      setUploadedFiles([]);
      setIsModalOpen(false);
      setSuccessNotice(
        `Application ${created.ref} registered successfully! Statutory acknowledgement generated.`,
      );

      downloadTextReport(
        `Acknowledgement-${created.ref}.txt`,
        `AICTE STATUTORY ACKNOWLEDGEMENT RECEIPT\nReference: ${created.ref}\nInstitution: Sahyadri Institute of Technology\nProgram: ${resolvedProgram} (${resolvedIntake} seats)\nFee: ₹1,00,000 received\nAudit Timestamp: 2026-10-31 IST`,
      );
    }
  };

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    if (selectedCycle !== "All years" && !app.year.includes(selectedCycle))
      return false;
    if (selectedStatus === "Approved" && !app.status.includes("Approved"))
      return false;
    if (selectedStatus === "Deficient" && !app.status.includes("Deficiency"))
      return false;
    return true;
  });

  return (
    <RoleGuard allowedRoles={["INSTITUTION"]}>
      <AppShell>
        <div className="space-y-8">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>INSTITUTION PORTAL / My Applications</span>
            <span>Statutory Cycle AY 2027–28 • IST Standard</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                My applications
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Track submissions, decisions and fee acknowledgements in one
                register.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateFresh}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <FilePlus className="h-4 w-4" />
              <span>Create application +</span>
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

          {/* 4 KPI Cards - Borderless & Fluid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-xl bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="text-xs font-medium text-[#736357]">
                Current cycle applications
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">
                0{applications.filter((a) => a.year === "2027–28").length}
              </div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                2027–28 · EoA and LoA
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="text-xs font-medium text-[#736357]">
                Action required
              </div>
              <div className="text-3xl font-bold text-[#EC642A] mt-2">01</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Response due 06 Nov
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="text-xs font-medium text-[#736357]">
                Submitted / in review
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">01</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                No action needed
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="text-xs font-medium text-[#736357]">
                Approved last cycle
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">02</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Orders available below
              </div>
            </div>
          </div>

          {/* Main Table Surface: Application register */}
          <div className="rounded-xl bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-4">
              <h2 className="text-sm font-bold text-[#2A1810]">
                Application register
              </h2>
              <span className="text-xs text-[#736357] font-medium">
                Sahyadri Institute of Technology, Pune
              </span>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-[#F0ECE6]">
              <div className="flex items-center gap-2">
                <select
                  value={selectedCycle}
                  onChange={(e) => setSelectedCycle(e.target.value)}
                  className="rounded border border-[#E5E0D8] bg-white px-3 py-1.5 text-xs font-medium text-[#2A1810] hover:bg-neutral-50 focus:outline-none"
                >
                  <option value="All years">Cycle: All years</option>
                  <option value="2027–28">Cycle: 2027–28</option>
                  <option value="2026–27">Cycle: 2026–27</option>
                  <option value="2025–26">Cycle: 2025–26</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded border border-[#E5E0D8] bg-white px-3 py-1.5 text-xs font-medium text-[#2A1810] hover:bg-neutral-50 focus:outline-none"
                >
                  <option value="All">Status: All</option>
                  <option value="Approved">Status: Approved</option>
                  <option value="Deficient">Status: Deficient</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#736357]">
                <span>{filteredApps.length} applications</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1 font-semibold text-[#EC642A] hover:underline cursor-pointer"
                >
                  <span>Export CSV</span>
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Applications Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">APPLICATION / TYPE</th>
                    <th className="py-3 px-2">ACADEMIC YEAR</th>
                    <th className="py-3 px-2">SUBMITTED</th>
                    <th className="py-3 px-2">PROGRAMMES / INTAKE</th>
                    <th className="py-3 px-2">STATUS</th>
                    <th className="py-3 px-2">NEXT ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {filteredApps.map((app) => (
                    <tr
                      key={app.ref}
                      className={
                        app.isDeficiency
                          ? "bg-[#FFF9F4]"
                          : "hover:bg-[#FAFAFA] transition-colors"
                      }
                    >
                      <td className="py-3 px-2">
                        <div className="font-bold text-[#2A1810]">
                          {app.ref}
                        </div>
                        <div className="text-[11px] text-[#736357]">
                          {app.type}
                        </div>
                        {app.routeLabel && (
                          <div className="mt-1">
                            <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#FFF7F0] text-[#EC642A] border border-[#F3C39E]/50">
                              {app.routeLabel}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-[#2A1810]">{app.year}</td>
                      <td className="py-3 px-2 text-[#2A1810]">
                        {app.submitted}
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-[#2A1810] font-medium">
                          {app.program}
                        </div>
                        <div className="text-[11px] text-[#736357]">
                          {app.intakeText}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div
                          className={
                            app.isDeficiency
                              ? "font-medium text-[#EC642A]"
                              : "text-[#2A1810]"
                          }
                        >
                          {app.status}
                        </div>
                        {app.statusDetail && (
                          <div
                            className={
                              app.isDeficiency
                                ? "text-[11px] text-[#EC642A]"
                                : "text-[11px] text-[#736357]"
                            }
                          >
                            {app.statusDetail}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {app.isDownload ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadOrder(app)}
                            className="font-semibold text-[#EC642A] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>Download order</span>
                            <Download className="h-3 w-3" />
                          </button>
                        ) : app.actionText.includes("View submission") ? (
                          <button
                            type="button"
                            onClick={() => handleOpenViewSubmission(app)}
                            className="font-semibold text-[#EC642A] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>View submission</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        ) : app.actionText.includes("Continue draft") ? (
                          <button
                            type="button"
                            onClick={() => handleOpenContinueDraft(app)}
                            className="font-semibold text-[#EC642A] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>Continue draft</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        ) : app.actionHref ? (
                          <Link
                            href={app.actionHref}
                            className="font-semibold text-[#EC642A] hover:underline"
                          >
                            {app.actionText}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenViewSubmission(app)}
                            className="font-semibold text-[#736357] hover:text-[#EC642A] cursor-pointer"
                          >
                            {app.actionText}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Row */}
            <div className="flex items-center justify-between border-t border-[#F0ECE6] pt-4 mt-2 text-xs text-[#736357]">
              <span>
                Showing all {filteredApps.length} applications ·
                Institution-scoped access
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[#A89D95]">‹ Previous</span>
                <span className="rounded bg-[#EC642A] px-2 py-0.5 text-white font-medium">
                  1
                </span>
                <span className="text-[#A89D95]">Next ›</span>
              </div>
            </div>
          </div>

          {/* Two Lower Cards: Fluid & Elevated */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Left Card: Before you submit */}
            <div className="rounded-xl bg-white p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-[#2A1810] border-b border-[#F0ECE6] pb-3">
                Before you submit
              </h2>
              <div className="space-y-3 text-xs text-[#2A1810]">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#2E7D32]" />
                  <span>Verify institute profile and approved intake</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#2E7D32]" />
                  <span>Refresh time-bound certificates and undertakings</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#2E7D32]" />
                  <span>Confirm fee payment before final submission</span>
                </div>
              </div>
            </div>

            {/* Right Card: Selected application */}
            <div className="rounded-xl bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Selected application · EOA-2027-1042
                </h2>
                <span className="text-[10px] font-bold text-[#EC642A] uppercase bg-[#FFF7F0] px-2 py-0.5 rounded border border-[#F3C39E]/50">
                  {applications.find((a) => a.ref === "EOA-2027-1042")
                    ?.routeLabel || "Route 5: Conditional"}
                </span>
              </div>
              <div className="space-y-3">
                <div className="inline-block rounded bg-[#FFF3E0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9A5B18]">
                  DEFICIENCY RESPONSE WINDOW OPEN
                </div>
                <div className="text-xs text-[#2A1810]">
                  Acknowledgement:{" "}
                  <span className="font-medium">ACK-2026-1042</span> · ₹1,00,000
                  received
                </div>
                <div className="text-xs text-[#736357]">
                  Submitted by: S. Patil, Institution nodal officer · 20 Oct,
                  11:32 IST
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      downloadTextReport(
                        "ACK-2026-1042-Receipt.txt",
                        "AICTE SUBMISSION ACKNOWLEDGEMENT\nACK-2026-1042\nFee Paid: ₹1,00,000\nDate: 2026-10-20\nSHA-256: 8f4c2e91b73a10d44d12c82098230598",
                      )
                    }
                    className="text-xs font-semibold text-[#EC642A] hover:underline cursor-pointer"
                  >
                    View immutable submission receipt →
                  </button>
                </div>
              </div>

              {/* MODULE 5: Bound TER Payment Tracker */}
              <div className="border-t border-[#F0ECE6] pt-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75] mb-2">
                  Technical Education Regulatory (TER) Fee Status
                </div>
                <TerPaymentTracker
                  payment={
                    applications.find((a) => a.ref === "EOA-2027-1042")?.payment
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* View Submission Dossier Modal */}
        {isViewSubmissionModalOpen && selectedSubmissionForView && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget)
                setIsViewSubmissionModalOpen(false);
            }}
          >
            <div
              className="relative w-full max-w-lg rounded-xl border border-[#E5E0D8] bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-auto"
              style={{ backgroundColor: "#ffffff" }}
            >
              <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#2A1810]">
                    Statutory Application Dossier
                  </h2>
                  <p className="text-xs text-[#736357] font-mono">
                    Reference: {selectedSubmissionForView.ref} · Academic Year{" "}
                    {selectedSubmissionForView.year}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsViewSubmissionModalOpen(false)}
                  className="rounded p-1 text-[#736357] hover:bg-neutral-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Status & Pinned Route */}
                <div className="flex items-center justify-between rounded-lg bg-[#FAF8F5] p-3 border border-[#F0ECE6]">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-[#8A7D75]">
                      Current Stage &amp; Status
                    </div>
                    <div className="font-bold text-[#2A1810] mt-0.5">
                      {selectedSubmissionForView.status}
                    </div>
                  </div>
                  <span className="rounded bg-[#FFF7F0] px-2 py-1 text-[10px] font-bold text-[#EC642A] border border-[#F3C39E]/60">
                    {selectedSubmissionForView.routeLabel ||
                      "Route 2: Scrutiny + EVC"}
                  </span>
                </div>

                {/* Scope */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[#736357]">Programme / Scope:</span>
                    <div className="font-semibold text-[#2A1810]">
                      {selectedSubmissionForView.program}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#736357]">
                      Approved / Applied Intake:
                    </span>
                    <div className="font-semibold text-[#2A1810]">
                      {selectedSubmissionForView.intakeText}
                    </div>
                  </div>
                </div>

                {/* Fee & Acknowledgement */}
                <div className="rounded-lg border border-[#C8E6C9] bg-[#E8F5E9] p-3 space-y-1 text-[#2E7D32]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      Statutory TER Processing Fee: ₹1,00,000 Verified
                    </span>
                  </div>
                  <div className="text-[11px] font-mono">
                    Receipt ACK-2026-
                    {selectedSubmissionForView.ref.split("-").pop()} · Treasury
                    Reconciliation Confirmed
                  </div>
                </div>

                {/* Submitted Documents Checklist */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase text-[#8A7D75]">
                    Submitted Statutory Evidence
                  </div>
                  <div className="space-y-1.5 text-xs text-[#2A1810]">
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#2E7D32]" />
                      <span>
                        AICTE Form 1 Institutional Profile &amp; Approved Intake
                        Roster
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#2E7D32]" />
                      <span>
                        Registered Campus Land Ownership Deed &amp; Building
                        Approval
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#2E7D32]" />
                      <span>
                        Faculty Cadre 1:15 Ratio Notarized Affidavit &amp; 7th
                        CPC Payroll
                      </span>
                    </div>
                  </div>
                </div>

                {/* Genesis Hash */}
                <div className="rounded bg-[#FAFAFA] p-2.5 font-mono text-[10px] text-[#736357] border border-[#E5E0D8] break-all">
                  SHA-256 Digest:
                  8f4c2e91b73a10d44d12c8209823059871ab9382176435019827635418276354
                  (Sequential integrity simulation)
                </div>

                {/* APH Clause Intelligence Analysis */}
                <AphClauseIntelligence
                  documentName="Registered_Land_Deed_Affidavit.pdf"
                  sha256Hash="8f4c2e91b73a10d44d12c8209823059871ab9382176435019827635418276354"
                  compact={true}
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#F0ECE6] pt-4">
                <button
                  type="button"
                  onClick={() => setIsViewSubmissionModalOpen(false)}
                  className="rounded border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-medium text-[#2A1810] hover:bg-neutral-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadTextReport(
                      `Submission-Dossier-${selectedSubmissionForView.ref}.txt`,
                      `AICTE STATUTORY SUBMISSION DOSSIER\nReference: ${selectedSubmissionForView.ref}\nAcademic Year: ${selectedSubmissionForView.year}\nProgram: ${selectedSubmissionForView.program}\nIntake: ${selectedSubmissionForView.intakeText}\nStatus: ${selectedSubmissionForView.status}\nSHA-256 Digest: 8f4c2e91b73a10d44d12c8209823059871ab9382176435019827635418276354\nTimestamp: 2026-10-31 IST`,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded bg-[#EC642A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Submission Dossier</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create / Continue Application Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsModalOpen(false);
                setEditingDraftRef(null);
              }
            }}
          >
            <div
              className="relative w-full max-w-lg rounded-xl border border-[#E5E0D8] bg-white p-6 sm:p-7 shadow-2xl space-y-4 my-auto"
              style={{ backgroundColor: "#ffffff" }}
            >
              <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#2A1810]">
                    {editingDraftRef
                      ? `Continue Application Draft · ${editingDraftRef}`
                      : "Create Statutory Application"}
                  </h2>
                  <p className="text-xs text-[#736357]">
                    {editingDraftRef
                      ? "72% complete · Complete remaining submissions and forward to Scrutiny Desk"
                      : "Academic Year 2027–28 AICTE Approval Cycle"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingDraftRef(null);
                  }}
                  className="rounded p-1 text-[#736357] hover:bg-neutral-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateApplication} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                    Application Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                  >
                    <option value="Extension of Approval">
                      Extension of Approval (EoA)
                    </option>
                    <option value="New programme">
                      New Programme / Faculty Addition (LoA)
                    </option>
                    <option value="Additional intake">
                      Additional Intake in Existing Course
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                    Programme / Branch
                  </label>
                  <input
                    type="text"
                    required
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="e.g. Artificial Intelligence & Data Science"
                    className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Proposed Intake Seats
                    </label>
                    <input
                      type="number"
                      required
                      value={newIntake}
                      onChange={(e) => setNewIntake(e.target.value)}
                      placeholder="e.g. 60"
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Statutory Fee (APH Norm)
                    </label>
                    <div className="rounded border border-[#E5E0D8] bg-[#FAFAFA] p-2 text-xs font-semibold text-[#2A1810]">
                      ₹1,00,000 (Govt Schedule)
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                    Upload Trust Resolution / NOC Document
                  </label>
                  <FileDropzone
                    label="Attach signed resolution PDF"
                    helperText="PDF format · Max 15MB · Auto SHA-256 calculation"
                    onFileSelected={(file) =>
                      setUploadedFiles((prev) => [file, ...prev])
                    }
                    onFileRemoved={(fileId) =>
                      setUploadedFiles((prev) =>
                        prev.filter((f) => f.id !== fileId),
                      )
                    }
                  />

                  {/* Dynamic APH Clause Intelligence Assistant - Only when a file is uploaded */}
                  {uploadedFiles.length > 0 && (
                    <AphClauseIntelligence
                      documentName={uploadedFiles[0].name}
                      sha256Hash={uploadedFiles[0].sha256Preview}
                      compact={true}
                    />
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-[#F0ECE6] pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingDraftRef(null);
                    }}
                    className="rounded border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-medium text-[#2A1810] hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded bg-[#EC642A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs cursor-pointer"
                  >
                    {editingDraftRef
                      ? "Complete Submission & Forward to Scrutiny Desk →"
                      : "Register Application & Generate Acknowledgment →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppShell>
    </RoleGuard>
  );
}
