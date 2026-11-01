"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  ShieldCheck,
  AlertTriangle,
  Send,
  X,
  Check,
  Building,
  Users,
  FileText,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { SlaBadge } from "@/components/ui/sla-badge";
import { downloadCsv } from "@/lib/download-utils";
import { regulatoryStore } from "@/lib/regulatory-store";
import { AphClauseIntelligence } from "@/components/intelligence/aph-clause-intelligence";

interface ScrutinyCase {
  id: string;
  ref: string;
  institution: string;
  city: string;
  program: string;
  intake: number;
  ageingWorkingDays: number;
  slaState: "ON_TRACK" | "DUE_SOON" | "OVERDUE";
  deficiencyCount: number;
  aiAdvisoryScore: number;
  currentStatus?: string;
  statusPillClass?: string;
  stage?: string;
  currentQueue?: string;
  ballWith?: string;
  routeLabel?: string;
}

const WRO_SCRUTINY_CASES: ScrutinyCase[] = [
  {
    id: "sc-01",
    ref: "EOA-2027-1042",
    institution: "Sahyadri Institute of Technology",
    city: "Pune, MH",
    program: "UG Engineering",
    intake: 480,
    ageingWorkingDays: 8,
    slaState: "DUE_SOON",
    deficiencyCount: 1,
    aiAdvisoryScore: 92,
  },
  {
    id: "sc-02",
    ref: "EOA-2027-1086",
    institution: "Konkan Technical College",
    city: "Ratnagiri, MH",
    program: "Engineering & Technology",
    intake: 360,
    ageingWorkingDays: 13,
    slaState: "DUE_SOON",
    deficiencyCount: 0,
    aiAdvisoryScore: 98,
  },
  {
    id: "sc-03",
    ref: "LOA-2027-1128",
    institution: "Narmada Polytechnic",
    city: "Bharuch, GJ",
    program: "Diploma Engineering",
    intake: 300,
    ageingWorkingDays: 14,
    slaState: "DUE_SOON",
    deficiencyCount: 2,
    aiAdvisoryScore: 84,
  },
  {
    id: "sc-04",
    ref: "EOA-2027-1017",
    institution: "Vidarbha Engineering College",
    city: "Nagpur, MH",
    program: "UG Engineering",
    intake: 420,
    ageingWorkingDays: 32,
    slaState: "OVERDUE",
    deficiencyCount: 3,
    aiAdvisoryScore: 61,
  },
  {
    id: "sc-05",
    ref: "EOA-2027-1104",
    institution: "Coastal Institute of Technology",
    city: "Panaji, GA",
    program: "Engineering & Architecture",
    intake: 240,
    ageingWorkingDays: 24,
    slaState: "OVERDUE",
    deficiencyCount: 1,
    aiAdvisoryScore: 78,
  },
  {
    id: "sc-06",
    ref: "LOA-2027-1183",
    institution: "Deccan School of Design",
    city: "Kolhapur, MH",
    program: "Applied Arts & Design",
    intake: 120,
    ageingWorkingDays: 5,
    slaState: "ON_TRACK",
    deficiencyCount: 0,
    aiAdvisoryScore: 95,
  },
];

function isPendingScrutinyQueue(item: {
  status?: string;
  stage?: string;
  currentQueue?: string;
  ballWith?: string;
  hasDeficiency?: boolean;
  deficiencyCount?: number;
}): boolean {
  const status = (item.status || "").toUpperCase();
  const queue = (item.currentQueue || "").toUpperCase();
  const ballWith = (item.ballWith || "").toUpperCase();

  // 1. Deficiencies returned to applicant or any record where ball is with institution are ejected
  if (ballWith === "INSTITUTION") {
    return false;
  }
  if (
    status === "SCRUTINY_DEFICIENT" ||
    status.includes("DEFICIENCY RETURNED") ||
    item.hasDeficiency
  ) {
    return false;
  }

  // 2. Terminal, cleared, scheduled, or committee states are ejected
  if (
    status === "SCRUTINY_CLEARED" ||
    status === "APPROVED" ||
    status === "REJECTED" ||
    status.includes("CLEARED") ||
    status.includes("APPROVED") ||
    status.includes("REJECTED")
  ) {
    return false;
  }
  if (
    status === "EVC_SCHEDULED" ||
    status === "EVC_REPORT_SUBMITTED" ||
    status.includes("EVC") ||
    status.includes("FORWARDED") ||
    status.includes("COMMITTEE") ||
    status.includes("SCHEDULED") ||
    queue === "REGIONAL_EVC_QUEUE" ||
    queue === "COMMITTEE_BENCH" ||
    queue === "EXECUTIVE_APPROVAL" ||
    queue === "ARCHIVED" ||
    item.stage === "EVC" ||
    item.stage === "SAC_SHC" ||
    item.stage === "APPROVAL" ||
    item.stage === "FINAL_DECISION" ||
    item.stage === "BUREAU_REVIEW"
  ) {
    return false;
  }

  // 3. Exact 3-Part Affirmative Specification:
  // Part 1: status is 'SUBMITTED' where ballWith is 'REGIONAL_OFFICER' or 'AICTE'
  if (
    status === "SUBMITTED" &&
    (ballWith === "REGIONAL_OFFICER" || ballWith === "AICTE" || !ballWith)
  ) {
    return true;
  }

  // Part 2: status is 'DEFICIENCY_RESOLVED_RESUBMITTED' where ballWith is 'REGIONAL_OFFICER' or 'AICTE'
  if (
    (status === "DEFICIENCY_RESOLVED_RESUBMITTED" ||
      status.includes("DEFICIENCY_RESOLVED") ||
      status.includes("DEFICIENCY RECTIFIED")) &&
    (ballWith === "REGIONAL_OFFICER" || ballWith === "AICTE" || !ballWith)
  ) {
    return true;
  }

  // Part 3: currentQueue is 'REGIONAL_SCRUTINY' where status is NOT in terminal/cleared states
  if (
    (queue === "REGIONAL_SCRUTINY" ||
      item.stage === "SCRUTINY" ||
      status === "UNDER_SCRUTINY" ||
      status.includes("PENDING")) &&
    !["SCRUTINY_CLEARED", "APPROVED", "REJECTED"].includes(status)
  ) {
    return true;
  }

  return false;
}

export default function ScrutinyQueuePage() {
  const [cases, setCases] = useState<ScrutinyCase[]>(() =>
    WRO_SCRUTINY_CASES.filter(
      (c) => c.ref === "LOA-2027-1128" || c.ref === "LOA-2027-1183",
    ),
  );
  const [selectedCase, setSelectedCase] = useState<ScrutinyCase | null>(null);
  const [recordedNotice, setRecordedNotice] = useState<string | null>(null);
  const [showBatchMenu, setShowBatchMenu] = useState(false);

  // Modal 1: Accept Application & Clear Scrutiny
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [acceptChecklist, setAcceptChecklist] = useState({
    landLease: false,
    buildingApproval: false,
    cadreRatio: false,
    feeReconciliation: false,
  });
  const [acceptRationale, setAcceptRationale] = useState("");

  // Modal 2: 8-Point Deficiency Logging Modal
  const [isDeficiencyModalOpen, setIsDeficiencyModalOpen] = useState(false);
  const [deficiencyDescription, setDeficiencyDescription] = useState("");
  const [deficiencyDeadline, setDeficiencyDeadline] = useState(
    "09 Nov 2026, 17:00 IST (7 Calendar Days)",
  );
  const [deficiencyEvidence, setDeficiencyEvidence] = useState("");
  const [deficiencyClause, setDeficiencyClause] = useState(
    "APH 2024-27 Clause 2.9 (Fire Safety & Building Norms)",
  );
  const [deficiencyRationale, setDeficiencyRationale] = useState("");

  // Modal 3: Forward to Committee Modal
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [committeeType, setCommitteeType] = useState<"EVC" | "SAC_SHC">("EVC");
  const [forwardScheduledDate, setForwardScheduledDate] = useState("");
  const [forwardPanelLead, setForwardPanelLead] = useState("");
  const [forwardRationale, setForwardRationale] = useState("");

  // Synchronize cases with live regulatory store (including newly submitted applications)
  const syncCasesWithStore = () => {
    const storeApps = regulatoryStore.getApplications();
    const mockMap = new Map<string, ScrutinyCase>(
      WRO_SCRUTINY_CASES.map((c) => [c.ref, c]),
    );

    // Map all store applications to ScrutinyCase records
    const liveCases: ScrutinyCase[] = storeApps.map((app) => {
      const mock = mockMap.get(app.ref);
      if (mock) {
        return {
          ...mock,
          institution: app.instName || mock.institution,
          city: app.location || mock.city,
          program: app.program || mock.program,
          intake: app.intake || mock.intake,
          currentStatus: app.status || mock.currentStatus,
          statusPillClass: app.statusPillClass || mock.statusPillClass,
          stage: app.stage || mock.stage,
          currentQueue: app.currentQueue || "REGIONAL_SCRUTINY",
          ballWith: app.ballWith || "REGIONAL_OFFICER",
          deficiencyCount: app.hasDeficiency
            ? Math.max(mock.deficiencyCount, 1)
            : 0,
          routeLabel: app.routeLabel || mock.routeLabel,
        };
      }

      // Dynamically created or submitted application from Institute Dashboard
      return {
        id: `sc-${app.ref.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        ref: app.ref,
        institution: app.instName || "Sahyadri Institute of Technology",
        city: app.location || "Pune, MH",
        program: app.program || "UG Engineering",
        intake: app.intake || 60,
        ageingWorkingDays: 1,
        slaState: "ON_TRACK" as const,
        deficiencyCount: app.hasDeficiency ? 1 : 0,
        aiAdvisoryScore: 95,
        currentStatus: app.status || "Scrutiny Pending · Fee Acknowledged",
        statusPillClass: app.statusPillClass || "text-[#EC642A] font-semibold",
        stage: app.stage || "SCRUTINY",
        currentQueue: app.currentQueue || "REGIONAL_SCRUTINY",
        ballWith: app.ballWith || "REGIONAL_OFFICER",
        routeLabel: app.routeLabel || "Route 1: Scrutiny Evaluation",
      };
    });

    // Also include any fallback mock cases if not in store
    const coveredRefs = new Set(storeApps.map((a) => a.ref));
    const extraMocks = WRO_SCRUTINY_CASES.filter(
      (c) => !coveredRefs.has(c.ref),
    );

    const allCandidates = [...liveCases, ...extraMocks];
    const pendingCases = allCandidates.filter((c) =>
      isPendingScrutinyQueue({
        status: c.currentStatus,
        stage: c.stage,
        currentQueue: c.currentQueue,
        ballWith: c.ballWith,
        deficiencyCount: c.deficiencyCount,
      }),
    );

    setCases(pendingCases);
  };

  useEffect(() => {
    syncCasesWithStore();
    const unsubscribe = regulatoryStore.subscribe(() => {
      syncCasesWithStore();
    });
    return () => unsubscribe();
  }, []);

  const handleExportDocket = () => {
    const headers = [
      "Ref",
      "Institution",
      "Program",
      "Intake",
      "Working Days",
      "SLA State",
      "Status",
      "Deficiencies",
      "Advisory Score",
    ];
    const rows = cases.map((c) => [
      c.ref,
      c.institution,
      c.program,
      c.intake,
      c.ageingWorkingDays,
      c.slaState,
      c.currentStatus || "Under Scrutiny",
      c.deficiencyCount,
      `${c.aiAdvisoryScore}%`,
    ]);
    downloadCsv("wro-scrutiny-triage-docket.csv", headers, rows);
    setShowBatchMenu(false);
  };

  const handleBatchForward = () => {
    setRecordedNotice(
      "Batch verification executed: 4 eligible applications affirmatively forwarded to EVC committee.",
    );
    setShowBatchMenu(false);
  };

  // ACTION 1 TRIGGER: Accept Application
  const openAcceptModal = (c: ScrutinyCase) => {
    setSelectedCase(c);
    setAcceptChecklist({
      landLease: false,
      buildingApproval: false,
      cadreRatio: false,
      feeReconciliation: false,
    });
    setAcceptRationale("");
    setIsAcceptModalOpen(true);
  };

  const handleConfirmAccept = () => {
    if (!selectedCase) return;
    const targetRef = selectedCase.ref;
    const targetInst = selectedCase.institution;
    regulatoryStore.acceptScrutinyApplication(
      targetRef,
      acceptRationale,
      "R. Kulkarni (Regional Officer - WRO Desk)",
    );
    // Eject from active scrutiny queue immediately
    setCases((prev) => prev.filter((c) => c.ref !== targetRef));
    setRecordedNotice(
      `Primary Success Action: Application ${targetRef} (${targetInst}) scrutiny stage cleared affirmatively and removed from active triage queue.`,
    );
    setIsAcceptModalOpen(false);
    setSelectedCase(null);
  };

  // ACTION 2 TRIGGER: Mark Deficiency (8-Point Schema)
  const openDeficiencyModal = (c: ScrutinyCase) => {
    setSelectedCase(c);
    setDeficiencyDescription("");
    setDeficiencyDeadline("09 Nov 2026, 17:00 IST (7 Calendar Days)");
    setDeficiencyEvidence("");
    setDeficiencyClause(
      "APH 2024-27 Clause 2.9 (Fire Safety & Building Norms)",
    );
    setDeficiencyRationale("");
    setIsDeficiencyModalOpen(true);
  };

  const handleConfirmDeficiency = () => {
    if (!selectedCase) return;
    if (!deficiencyDescription.trim()) {
      alert("Please provide the statutory observation description.");
      return;
    }
    const targetRef = selectedCase.ref;
    const loggedDeficiency = regulatoryStore.markGranularDeficiency({
      appRef: targetRef,
      description: deficiencyDescription.trim(),
      aphClause: deficiencyClause,
      responseDeadline: deficiencyDeadline,
      requiredEvidence: deficiencyEvidence,
      officerRationale: deficiencyRationale,
      officerName: "R. Kulkarni (Regional Officer - WRO Desk)",
    });
    // Eject from active scrutiny queue immediately
    setCases((prev) => prev.filter((c) => c.ref !== targetRef));
    setRecordedNotice(
      `Deficiency Memo Issued: 8-Point statutory record ${loggedDeficiency.deficiencyId} recorded for ${targetRef}. Case returned to institution and removed from active scrutiny queue.`,
    );
    setIsDeficiencyModalOpen(false);
    setSelectedCase(null);
  };

  // ACTION 3 TRIGGER: Forward to Committee
  const openForwardModal = (c: ScrutinyCase) => {
    setSelectedCase(c);
    setCommitteeType("EVC");
    setForwardScheduledDate("");
    setForwardPanelLead("");
    setForwardRationale("");
    setIsForwardModalOpen(true);
  };

  const handleConfirmForward = () => {
    if (!selectedCase) return;
    const targetRef = selectedCase.ref;
    regulatoryStore.forwardToCommittee({
      appRef: targetRef,
      committeeType,
      scheduledDate: forwardScheduledDate,
      panelLead: forwardPanelLead,
      rationale: forwardRationale,
      officerName: "R. Kulkarni (Regional Officer - WRO Desk)",
    });
    // Eject from active scrutiny queue immediately
    setCases((prev) => prev.filter((c) => c.ref !== targetRef));
    setRecordedNotice(
      `Primary Brand Action: Dossier ${targetRef} affirmatively dispatched to ${
        committeeType === "EVC"
          ? "Expert Visit Committee (EVC)"
          : "Standing Committee (SAC/SHC)"
      } and removed from active scrutiny queue.`,
    );
    setIsForwardModalOpen(false);
    setSelectedCase(null);
  };

  return (
    <RoleGuard allowedRoles={["REGIONAL_OFFICER"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>REGIONAL PORTAL / Scrutiny Queue</span>
            <span>Statutory Cycle AY 2027–28 • Western Region (WRO)</span>
          </div>

          {/* Header Title + Batch Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Scrutiny queue
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Triage pending applications across western region institutions
                with three-tier statutory actions.
              </p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBatchMenu((prev) => !prev)}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs cursor-pointer"
              >
                <span>Batch triage actions</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {showBatchMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-60 rounded-md border border-[#E5E0D8] bg-white p-2 shadow-lg z-30 space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={handleBatchForward}
                    className="w-full text-left p-2 rounded hover:bg-[#FFFBF7] text-[#2A1810] font-medium cursor-pointer"
                  >
                    Forward clean cases to EVC (4)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportDocket}
                    className="w-full text-left p-2 rounded hover:bg-[#FFFBF7] text-[#EC642A] font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>Export Scrutiny Docket</span>
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recorded notice banner */}
          {recordedNotice && (
            <div className="flex items-start gap-2.5 rounded-lg border border-[#C8E6C9] bg-[#E8F5E9] p-3.5 text-xs text-[#2E7D32] shadow-2xs animate-fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{recordedNotice}</div>
              <button
                type="button"
                onClick={() => setRecordedNotice(null)}
                className="text-[#2E7D32] hover:text-[#1B5E20] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Scrutiny Triage Table Card */}
          <div className="rounded-xl border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-[#EC642A]" />
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Active applications in triage ({cases.length})
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#736357]">
                <span>WRO · Maharashtra, Goa, Gujarat</span>
                <span className="hidden sm:inline-block h-3 w-px bg-[#E5E0D8]" />
                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] text-[#2E7D32]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Audit ledger active
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">APPLICATION / INSTITUTION</th>
                    <th className="py-3 px-2">PROGRAMME / INTAKE</th>
                    <th className="py-3 px-2">SLA AGE</th>
                    <th className="py-3 px-2">STATUS</th>
                    <th className="py-3 px-2">ADVISORY</th>
                    <th className="py-3 px-2 text-right">TRIAGE ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <CheckCircle2 className="h-8 w-8 text-[#2E7D32]" />
                          <div className="text-sm font-semibold text-[#2A1810]">
                            Scrutiny queue is clear
                          </div>
                          <p className="text-xs text-[#736357] max-w-sm">
                            All applications in Western Region have been
                            triaged. New submissions from institutions will
                            appear here automatically.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cases.map((c) => {
                      const isDeficiency = c.deficiencyCount > 0;
                      const isCleared = c.currentStatus?.includes("Cleared");

                      return (
                        <tr
                          key={c.id}
                          className={
                            isDeficiency
                              ? "bg-[#FFF9F4] transition-colors"
                              : isCleared
                                ? "bg-[#F4FBF7] transition-colors"
                                : "hover:bg-[#FAFAFA] transition-colors"
                          }
                        >
                          {/* Column 1: Application / Institution */}
                          <td className="py-3.5 px-2">
                            <div className="font-bold text-[#2A1810]">
                              {c.ref}
                            </div>
                            <div className="text-[11px] text-[#736357]">
                              {c.institution} · {c.city}
                            </div>
                            {c.routeLabel && (
                              <span className="inline-block mt-1 text-[9px] font-medium text-[#8A7D75] bg-[#F5F2EB] px-1.5 py-0.5 rounded">
                                {c.routeLabel.split(":")[0]}
                              </span>
                            )}
                          </td>

                          {/* Column 2: Programme / Intake */}
                          <td className="py-3.5 px-2">
                            <div className="text-[#2A1810] font-medium">
                              {c.program}
                            </div>
                            <div className="text-[11px] text-[#736357]">
                              Intake: {c.intake} seats
                            </div>
                          </td>

                          {/* Column 3: SLA Age */}
                          <td className="py-3.5 px-2 font-mono text-[#2A1810]">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-[#8A7D75]" />
                              <span>{c.ageingWorkingDays}d working</span>
                            </div>
                          </td>

                          {/* Column 4: Status */}
                          <td className="py-3.5 px-2">
                            {c.currentStatus ? (
                              <span
                                className={`text-[11px] ${
                                  c.statusPillClass ||
                                  "text-[#2A1810] font-medium"
                                }`}
                              >
                                {c.currentStatus}
                              </span>
                            ) : (
                              <SlaBadge state={c.slaState} />
                            )}
                          </td>

                          {/* Column 5: Advisory Score */}
                          <td className="py-3.5 px-2">
                            <span
                              title="Automated preliminary heuristic. Statutory scrutiny officer makes final determination."
                              className="inline-flex items-center gap-1 rounded bg-[#EFECE6] px-2 py-0.5 text-[10px] font-bold text-[#2A1810]"
                            >
                              <span className="text-[#8A7D75]">ADVISORY ·</span>
                              <span>{c.aiAdvisoryScore}% clean</span>
                            </span>
                          </td>

                          {/* Column 6: Three-Tier Action Suite */}
                          <td className="py-3.5 px-2 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap sm:flex-nowrap">
                              {/* ACTION 1: Accept Application (Primary Success Action) */}
                              <button
                                type="button"
                                onClick={() => openAcceptModal(c)}
                                title="Affirm complete documentary scrutiny clearance"
                                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-2xs transition-colors cursor-pointer"
                              >
                                <Check className="h-3 w-3" />
                                <span>Accept Application</span>
                              </button>

                              {/* ACTION 2: Mark Deficiency (Secondary Neutral Action) */}
                              <button
                                type="button"
                                onClick={() => openDeficiencyModal(c)}
                                title="Log 8-point deficiency and return case to institution"
                                className="inline-flex items-center gap-1 rounded border border-[#E5E0D8] bg-white px-2.5 py-1 text-[11px] font-medium text-[#2A1810] hover:bg-[#FAFAFA] shadow-2xs transition-colors cursor-pointer"
                              >
                                <AlertTriangle className="h-3 w-3 text-[#FAAA21]" />
                                <span>Mark Deficiency</span>
                              </button>

                              {/* ACTION 3: Forward to Committee (Primary Brand Action) */}
                              <button
                                type="button"
                                onClick={() => openForwardModal(c)}
                                title="Forward dossier to assigned Expert Visit Committee or Standing Committee"
                                className="inline-flex items-center gap-1 rounded bg-[#EC642A] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#D5531B] shadow-2xs transition-colors cursor-pointer"
                              >
                                <Send className="h-3 w-3" />
                                <span>Forward to Committee</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODAL 1: ACCEPT APPLICATION (Primary Success Action) */}
          {/* ========================================================================= */}
          {isAcceptModalOpen && selectedCase && (
            <div
              className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
            >
              <div className="flex min-h-full items-center justify-center py-6 sm:py-10">
                <div
                  className="w-full max-w-lg rounded-xl border border-[#E5E0D8] bg-white p-6 shadow-xl space-y-5"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#2A1810]">
                          Accept Application &amp; Clear Scrutiny
                        </h3>
                        <p className="text-xs text-[#736357]">
                          Statutory Scrutiny Clearance · {selectedCase.ref}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAcceptModalOpen(false)}
                      className="text-[#8A7D75] hover:text-[#2A1810] p-1 rounded cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Target details */}
                    <div className="rounded-lg bg-[#FAF8F5] p-3 border border-[#F0ECE6] space-y-1">
                      <div className="font-bold text-[#2A1810]">
                        {selectedCase.institution}
                      </div>
                      <div className="text-[11px] text-[#736357]">
                        {selectedCase.program} · Approved Intake:{" "}
                        {selectedCase.intake} seats · {selectedCase.city}
                      </div>
                    </div>

                    {/* APH Clause Intelligence Assistant Panel */}
                    <AphClauseIntelligence
                      documentName={`${selectedCase.institution.replace(/\s+/g, "_")}_Compliance_Dossier.pdf`}
                      sha256Hash="4d12c8209823059871ab93821764350198276354182763541827635418276354"
                      compact={true}
                    />

                    {/* Statutory Scrutiny Verification Checklist */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                        Statutory Scrutiny Checklist (Mandatory Attestation)
                      </div>
                      <div className="space-y-2 rounded-lg border border-[#E5E0D8] p-3 bg-white">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={acceptChecklist.landLease}
                            onChange={(e) =>
                              setAcceptChecklist((prev) => ({
                                ...prev,
                                landLease: e.target.checked,
                              }))
                            }
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-[#2A1810]">
                            Land ownership &amp; registered lease deed verified
                            (clear of encumbrance)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={acceptChecklist.buildingApproval}
                            onChange={(e) =>
                              setAcceptChecklist((prev) => ({
                                ...prev,
                                buildingApproval: e.target.checked,
                              }))
                            }
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-[#2A1810]">
                            Academic building plans &amp; municipal completion
                            approvals validated
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={acceptChecklist.cadreRatio}
                            onChange={(e) =>
                              setAcceptChecklist((prev) => ({
                                ...prev,
                                cadreRatio: e.target.checked,
                              }))
                            }
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-[#2A1810]">
                            Faculty cadre ratio (1:15/1:20) &amp; qualifications
                            meet AICTE norms
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={acceptChecklist.feeReconciliation}
                            onChange={(e) =>
                              setAcceptChecklist((prev) => ({
                                ...prev,
                                feeReconciliation: e.target.checked,
                              }))
                            }
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-[#2A1810]">
                            TER statutory processing fee acknowledged &amp;
                            reconciled in treasury ledger
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Scrutiny Clearance Rationale */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                        Statutory Clearance Rationale &amp; Explanatory Note *
                      </label>
                      <textarea
                        rows={3}
                        value={acceptRationale}
                        onChange={(e) => setAcceptRationale(e.target.value)}
                        placeholder="Enter clear rationale for scrutiny acceptance..."
                        className="w-full rounded-md border border-[#E5E0D8] p-2.5 text-xs text-[#2A1810] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Sign-off banner */}
                    <div className="rounded bg-[#E8F5E9] p-3 text-[11px] text-[#2E7D32] border border-[#C8E6C9] flex items-center justify-between">
                      <span className="font-semibold">
                        Signing Officer: R. Kulkarni (Regional Officer)
                      </span>
                      <span className="font-mono">
                        Audit Hash-Chain Enabled
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-[#F0ECE6] pt-4">
                    <button
                      type="button"
                      onClick={() => setIsAcceptModalOpen(false)}
                      className="rounded border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-medium text-[#2A1810] hover:bg-neutral-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAccept}
                      className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Accept &amp; Clear Scrutiny</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL 2: 8-POINT DEFICIENCY LOGGING (Secondary Neutral Action) */}
          {/* ========================================================================= */}
          {isDeficiencyModalOpen && selectedCase && (
            <div
              className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
            >
              <div className="flex min-h-full items-center justify-center py-6 sm:py-10">
                <div
                  className="w-full max-w-xl rounded-xl border border-[#E5E0D8] bg-white p-6 shadow-xl space-y-5"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF0E6] text-[#EC642A]">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#2A1810]">
                          Issue Statutory Deficiency Memo
                        </h3>
                        <p className="text-xs text-[#736357]">
                          8-Point Relational Deficiency Schema ·{" "}
                          {selectedCase.ref}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDeficiencyModalOpen(false)}
                      className="text-[#8A7D75] hover:text-[#2A1810] p-1 rounded cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Point 1, 3, 4: Meta Banner */}
                    <div className="grid grid-cols-2 gap-3 rounded-lg bg-[#FAF8F5] p-3 border border-[#F0ECE6]">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#8A7D75]">
                          1. Deficiency Tracking ID
                        </span>
                        <div className="font-mono font-bold text-[#EC642A] mt-0.5">
                          DEF-2027-WRO-{selectedCase.ref.split("-").pop()}-02
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#8A7D75]">
                          3. Date Identified
                        </span>
                        <div className="font-medium text-[#2A1810] mt-0.5">
                          02 Nov 2026, 10:00 IST
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] font-bold uppercase text-[#8A7D75]">
                          4. Responsible Institution
                        </span>
                        <div className="font-semibold text-[#2A1810] mt-0.5">
                          {selectedCase.institution} ({selectedCase.ref})
                        </div>
                      </div>
                    </div>

                    {/* Point 2: Description */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                        2. Statutory Non-Compliance / Observation Description *
                      </label>
                      <textarea
                        rows={3}
                        value={deficiencyDescription}
                        onChange={(e) =>
                          setDeficiencyDescription(e.target.value)
                        }
                        placeholder="e.g. Fire Safety NOC expired on 26 Oct 2026; requires valid renewal certificate covering Approval Cycle 2027–28."
                        className="w-full rounded-md border border-[#E5E0D8] p-2.5 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none focus:ring-1 focus:ring-[#EC642A]"
                      />
                    </div>

                    {/* APH Clause Reference & Point 5: Response Deadline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                          APH 2024–27 Clause Reference
                        </label>
                        <select
                          value={deficiencyClause}
                          onChange={(e) => setDeficiencyClause(e.target.value)}
                          className="w-full rounded-md border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                        >
                          <option>
                            APH 2024-27 Clause 2.9 (Fire Safety &amp; Building
                            Norms)
                          </option>
                          <option>
                            APH 2024-27 Clause 2.14 (Faculty-Student Ratio &amp;
                            Cadre Matrix)
                          </option>
                          <option>
                            APH 2024-27 Clause 2.4 (Land Ownership &amp; Lease
                            Title)
                          </option>
                          <option>
                            APH 2024-27 Clause 3.1 (TER Fee &amp; Financial
                            Affidavit)
                          </option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                          5. Statutory Response Deadline
                        </label>
                        <select
                          value={deficiencyDeadline}
                          onChange={(e) =>
                            setDeficiencyDeadline(e.target.value)
                          }
                          className="w-full rounded-md border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                        >
                          <option>
                            09 Nov 2026, 17:00 IST (7 Calendar Days)
                          </option>
                          <option>
                            16 Nov 2026, 17:00 IST (14 Calendar Days)
                          </option>
                          <option>
                            23 Nov 2026, 17:00 IST (21 Calendar Days)
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Point 6: Supporting Evidence Binding Requirement */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                        6. Required Supporting Evidence Binding
                      </label>
                      <select
                        value={deficiencyEvidence}
                        onChange={(e) => setDeficiencyEvidence(e.target.value)}
                        className="w-full rounded-md border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                      >
                        <option value="">
                          -- Select required evidence binding --
                        </option>
                        <option>
                          Replacement Fire Safety NOC from Municipal Authority
                        </option>
                        <option>
                          Faculty Cadre Attendance Register &amp; Notarized
                          Affidavit
                        </option>
                        <option>
                          Registered Land Lease Deed &amp; Non-Encumbrance
                          Certificate
                        </option>
                        <option>
                          Building Plan Approval &amp; Occupancy Certificate
                        </option>
                      </select>
                    </div>

                    {/* Point 7 & Point 8: Relational status displays */}
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="rounded border border-[#F3C39E] bg-[#FFFBF7] p-2.5">
                        <span className="text-[#8A7D75] font-bold">
                          7. Verification Status:
                        </span>
                        <div className="font-semibold text-[#EC642A] mt-0.5">
                          PENDING_SUBMISSION (Institution Action)
                        </div>
                      </div>
                      <div className="rounded border border-[#E5E0D8] bg-[#FAFAFA] p-2.5">
                        <span className="text-[#8A7D75] font-bold">
                          8. Closure Date:
                        </span>
                        <div className="font-semibold text-[#736357] mt-0.5">
                          null · Active Rectification
                        </div>
                      </div>
                    </div>

                    {/* Scrutiny Officer Observation & Rationale */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                        Scrutiny Officer Observation &amp; Memo Rationale
                      </label>
                      <textarea
                        rows={2}
                        value={deficiencyRationale}
                        onChange={(e) => setDeficiencyRationale(e.target.value)}
                        className="w-full rounded-md border border-[#E5E0D8] p-2.5 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-[#F0ECE6] pt-4">
                    <button
                      type="button"
                      onClick={() => setIsDeficiencyModalOpen(false)}
                      className="rounded border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-medium text-[#2A1810] hover:bg-neutral-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeficiency}
                      className="inline-flex items-center gap-1.5 rounded bg-[#EC642A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D5531B] shadow-2xs cursor-pointer"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Sign &amp; Issue Deficiency Memo</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL 3: FORWARD TO COMMITTEE (Primary Brand Action) */}
          {/* ========================================================================= */}
          {isForwardModalOpen && selectedCase && (
            <div
              className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
            >
              <div className="flex min-h-full items-center justify-center py-6 sm:py-10">
                <div
                  className="w-full max-w-lg rounded-xl border border-[#E5E0D8] bg-white p-6 shadow-xl space-y-5"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF0E6] text-[#EC642A]">
                        <Send className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#2A1810]">
                          Forward Dossier to Committee
                        </h3>
                        <p className="text-xs text-[#736357]">
                          Statutory Panel Allocation · {selectedCase.ref}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsForwardModalOpen(false)}
                      className="text-[#8A7D75] hover:text-[#2A1810] p-1 rounded cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Target Details */}
                    <div className="rounded-lg bg-[#FAF8F5] p-3 border border-[#F0ECE6] space-y-1">
                      <div className="font-bold text-[#2A1810]">
                        {selectedCase.institution}
                      </div>
                      <div className="text-[11px] text-[#736357]">
                        {selectedCase.program} · {selectedCase.city} · Approved
                        Intake: {selectedCase.intake}
                      </div>
                    </div>

                    {/* Target Committee Type */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                        Target Statutory Committee Panel
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setCommitteeType("EVC")}
                          className={`rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                            committeeType === "EVC"
                              ? "border-[#EC642A] bg-[#FFFBF7] text-[#EC642A] font-bold"
                              : "border-[#E5E0D8] bg-white text-[#2A1810]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            <span>Expert Visit (EVC)</span>
                          </div>
                          <div className="text-[10px] text-[#736357] font-normal mt-1">
                            On-site physical inspection panel
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCommitteeType("SAC_SHC")}
                          className={`rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                            committeeType === "SAC_SHC"
                              ? "border-[#EC642A] bg-[#FFFBF7] text-[#EC642A] font-bold"
                              : "border-[#E5E0D8] bg-white text-[#2A1810]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4" />
                            <span>Standing Committee</span>
                          </div>
                          <div className="text-[10px] text-[#736357] font-normal mt-1">
                            SAC/SHC quasi-judicial review
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Inspection Date & Expert Panelist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                          Inspection / Hearing Date
                        </label>
                        <input
                          type="text"
                          value={forwardScheduledDate}
                          onChange={(e) =>
                            setForwardScheduledDate(e.target.value)
                          }
                          placeholder="e.g. 12 Nov 2026"
                          className="w-full rounded-md border border-[#E5E0D8] p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                          Assigned Panel Lead
                        </label>
                        <select
                          value={forwardPanelLead}
                          onChange={(e) => setForwardPanelLead(e.target.value)}
                          className="w-full rounded-md border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                        >
                          <option value="">
                            -- Select panel lead expert --
                          </option>
                          <option>
                            Prof. Vikram Rao (IIT Bombay - Mechanical)
                          </option>
                          <option>
                            Dr. Anita Desai (COEP Technological University -
                            Civil)
                          </option>
                          <option>
                            Prof. S. K. Nair (VNIT Nagpur - Electrical)
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Referral Rationale */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                        Statutory Referral Rationale &amp; Scope *
                      </label>
                      <textarea
                        rows={3}
                        value={forwardRationale}
                        onChange={(e) => setForwardRationale(e.target.value)}
                        placeholder="Explain why the case is forwarded to this committee..."
                        className="w-full rounded-md border border-[#E5E0D8] p-2.5 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none focus:ring-1 focus:ring-[#EC642A]"
                      />
                    </div>

                    {/* Verification seal */}
                    <div className="rounded bg-[#FAF8F5] p-2.5 text-[11px] text-[#736357] border border-[#F0ECE6] flex items-center justify-between">
                      <span>
                        Forwarding Officer: R. Kulkarni (Regional Officer)
                      </span>
                      <span className="font-mono text-[#2E7D32]">
                        Ledger Hash Generated
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-[#F0ECE6] pt-4">
                    <button
                      type="button"
                      onClick={() => setIsForwardModalOpen(false)}
                      className="rounded border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-medium text-[#2A1810] hover:bg-neutral-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmForward}
                      className="inline-flex items-center gap-1.5 rounded bg-[#EC642A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D5531B] shadow-2xs cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Affirm &amp; Dispatch to Committee</span>
                    </button>
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
