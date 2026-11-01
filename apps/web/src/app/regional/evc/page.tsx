"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Plus,
  X,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { StatusChip } from "@/components/ui/status-chip";
import { downloadTextReport } from "@/lib/download-utils";
import { webClock } from "@/lib/clock";
import { regulatoryStore } from "@/lib/regulatory-store";

interface EvcInspectionCase {
  id: string;
  ref: string;
  institution: string;
  inspectionDate: string;
  panelChair: string;
  panelMember2: string;
  status: "EVC_SCHEDULED" | "EVC_IN_PROGRESS" | "EVC_COMPLETED";
  conflictFreeVerified: boolean;
}

const INITIAL_EVC_CASES: EvcInspectionCase[] = [
  {
    id: "evc-01",
    ref: "EOA-2027-1042",
    institution: "Sahyadri Institute of Technology, Pune",
    inspectionDate: "12 Nov 2026",
    panelChair: "Dr. K. G. Narayanan (IIT Bombay)",
    panelMember2: "Prof. Sunita Rao (COEP Technological Univ)",
    status: "EVC_SCHEDULED",
    conflictFreeVerified: true,
  },
  {
    id: "evc-02",
    ref: "EOA-2027-1086",
    institution: "Konkan Technical College, Ratnagiri",
    inspectionDate: "05 Nov 2026",
    panelChair: "Dr. R. K. Shevgaonkar (IIT Delhi)",
    panelMember2: "Prof. Nitin Deshmukh (VNIT Nagpur)",
    status: "EVC_SCHEDULED",
    conflictFreeVerified: true,
  },
  {
    id: "evc-03",
    ref: "LOA-2027-1128",
    institution: "Narmada Polytechnic, Bharuch",
    inspectionDate: "18 Nov 2026",
    panelChair: "Prof. Arvind Mehta (VJTI Mumbai)",
    panelMember2: "Dr. P. S. Grover (Univ of Delhi)",
    status: "EVC_IN_PROGRESS",
    conflictFreeVerified: true,
  },
  {
    id: "evc-04",
    ref: "EOA-2026-0824",
    institution: "Walchand College of Engineering, Sangli",
    inspectionDate: "28 Oct 2026",
    panelChair: "Prof. M. S. Ananth (IIT Madras)",
    panelMember2: "Dr. S. K. Joshi (IISc Bangalore)",
    status: "EVC_COMPLETED",
    conflictFreeVerified: true,
  },
];

export default function RegionalEvcPage() {
  React.useEffect(() => {
    const syncWithStore = () => {
      const storeApps = regulatoryStore.getApplications();
      const evcApps = storeApps.filter(
        (a) =>
          a.stage === "EVC" ||
          a.currentQueue === "REGIONAL_EVC_QUEUE" ||
          a.status === "EVC_SCHEDULED" ||
          a.status.includes("EVC"),
      );

      const dynamicCases: EvcInspectionCase[] = evcApps.map((a) => ({
        id: `evc-${a.ref.toLowerCase()}`,
        ref: a.ref,
        institution: `${a.instName}, ${a.location}`,
        inspectionDate: a.evcDate || "12 Nov 2026",
        panelChair:
          a.evcPanelLead || "Prof. Vikram Rao (IIT Bombay - Mechanical)",
        panelMember2: "Prof. Sunita Rao (COEP Technological Univ)",
        status: (a.status === "EVC_COMPLETED"
          ? "EVC_COMPLETED"
          : a.status === "EVC_IN_PROGRESS"
            ? "EVC_IN_PROGRESS"
            : "EVC_SCHEDULED") as any,
        conflictFreeVerified: true,
      }));

      const dynamicRefs = new Set(dynamicCases.map((c) => c.ref));
      const remainingInitial = INITIAL_EVC_CASES.filter(
        (c) => !dynamicRefs.has(c.ref),
      );
      setCases([...dynamicCases, ...remainingInitial]);
    };

    syncWithStore();
    return regulatoryStore.subscribe(syncWithStore);
  }, []);

  const [cases, setCases] = useState<EvcInspectionCase[]>(INITIAL_EVC_CASES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Scheduling Form Fields
  const [selectedInst, setSelectedInst] = useState(
    "Sahyadri Institute of Technology, Pune",
  );
  const [selectedRef, setSelectedRef] = useState("EOA-2027-1042");
  const [inspectionDate, setInspectionDate] = useState("2026-11-20");
  const [panelChair, setPanelChair] = useState(
    "Dr. K. G. Narayanan (IIT Bombay)",
  );
  const [panelMember2, setPanelMember2] = useState(
    "Prof. Sunita Rao (COEP Technological Univ)",
  );
  const [conflictAffirmed, setConflictAffirmed] = useState(true);

  const handleScheduleVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCase: EvcInspectionCase = {
      id: `evc-${webClock.timestamp()}`,
      ref: selectedRef,
      institution: selectedInst,
      inspectionDate: inspectionDate,
      panelChair: panelChair,
      panelMember2: panelMember2,
      status: "EVC_SCHEDULED",
      conflictFreeVerified: conflictAffirmed,
    };

    setCases((prev) => [newCase, ...prev]);
    // Synchronize to global regulatory store
    regulatoryStore.verifyScrutinyAndForward(selectedRef, inspectionDate);

    setIsModalOpen(false);
    setSuccessNotice(
      `Inspection visit for ${selectedInst} successfully scheduled for ${inspectionDate}.`,
    );

    // Download EVC Inspection Order
    downloadTextReport(
      `EVC-Order-${selectedRef}.txt`,
      `ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)\nWESTERN REGIONAL OFFICE - EVC ALLOCATION ORDER\nApplication: ${selectedRef}\nInstitution: ${selectedInst}\nScheduled Date: ${inspectionDate}\nPanel Chair: ${panelChair}\nPanel Member: ${panelMember2}\nConflict Free Status: AFFIRMED & CERTIFIED\nTimestamp: 2026-10-31 IST`,
    );
  };

  return (
    <RoleGuard allowedRoles={["REGIONAL_OFFICER"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>REGIONAL PORTAL / EVC Inspections</span>
            <span>Statutory Cycle AY 2027–28 • Western Region (WRO)</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                EVC inspections &amp; panel allocation
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Schedule and monitor expert inspection panels across western
                region colleges.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule EVC visit +</span>
            </button>
          </div>

          {successNotice && (
            <div className="flex items-center justify-between rounded-md border border-[#C8E6C9] bg-[#E8F5E9] p-3 text-xs text-[#2E7D32]">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>{successNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessNotice(null)}
                className="text-xs font-semibold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                Scheduled visits
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">
                0{cases.filter((c) => c.status === "EVC_SCHEDULED").length}
              </div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Ready for deployment
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                Panels deployed
              </div>
              <div className="text-3xl font-bold text-[#EC642A] mt-2">04</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Active on-site inspections
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                Reports pending
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">02</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Due within 48 hours
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                Completed visits
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">08</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Sent to Bureau Review
              </div>
            </div>
          </div>

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Table */}
            <div className="lg:col-span-2 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Inspection schedules &amp; active panels ({cases.length})
                </h2>
                <span className="text-xs text-[#2E7D32] font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Conflict-free verified</span>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                      <th className="py-3 px-2">APPLICATION / INSTITUTION</th>
                      <th className="py-3 px-2">DATE</th>
                      <th className="py-3 px-2">PANEL EXPERTS</th>
                      <th className="py-3 px-2">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE6]">
                    {cases.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-[#FAFAFA] transition-colors"
                      >
                        <td className="py-3 px-2">
                          <div className="font-bold text-[#2A1810]">
                            {c.ref}
                          </div>
                          <div className="text-[11px] text-[#736357]">
                            {c.institution}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1.5 text-[#2A1810]">
                            <Calendar className="h-3.5 w-3.5 text-[#EC642A]" />
                            <span>{c.inspectionDate}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-[#2A1810] font-medium">
                            {c.panelChair}
                          </div>
                          <div className="text-[11px] text-[#736357]">
                            {c.panelMember2}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <StatusChip status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Panel Allocation & Conflict Check */}
            <div className="space-y-6">
              <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Panel conflict checker
                  </h2>
                  <ShieldCheck className="h-4 w-4 text-[#2E7D32]" />
                </div>

                <div className="text-xs text-[#736357] leading-relaxed">
                  Screening verifies zero employment or consultancy ties within
                  5 years for candidate institutions.
                </div>

                <div className="rounded-md bg-[#FFFBF7] border border-[#F3C39E] p-3 text-xs space-y-1">
                  <div className="font-bold text-[#2A1810]">
                    Screening status: Clean
                  </div>
                  <div className="text-[#736357]">
                    4 candidate experts available in WRO registry with
                    affirmative affidavit sign-off.
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#2E7D32]" />
                    <span>Geo-proximity check passed (&gt;150 km)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#2E7D32]" />
                    <span>No prior affiliation with applicant trust</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#2E7D32]" />
                    <span>CADRE and qualification norms verified</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="w-full rounded-md bg-[#EC642A] py-2 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs cursor-pointer"
                >
                  Schedule candidate panel visit →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* EVC Visit Scheduling Modal */}
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
                    Schedule Expert Visit Committee (EVC) Inspection
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded p-1 text-[#736357] hover:bg-neutral-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleScheduleVisit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Select Target Institution
                    </label>
                    <select
                      value={selectedInst}
                      onChange={(e) => {
                        setSelectedInst(e.target.value);
                        if (e.target.value.includes("Sahyadri"))
                          setSelectedRef("EOA-2027-1042");
                        else if (e.target.value.includes("Konkan"))
                          setSelectedRef("EOA-2027-1086");
                        else setSelectedRef("LOA-2027-1128");
                      }}
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    >
                      <option value="Sahyadri Institute of Technology, Pune">
                        Sahyadri Institute of Technology, Pune (EOA-2027-1042)
                      </option>
                      <option value="Konkan Technical College, Ratnagiri">
                        Konkan Technical College, Ratnagiri (EOA-2027-1086)
                      </option>
                      <option value="Narmada Polytechnic, Bharuch">
                        Narmada Polytechnic, Bharuch (LOA-2027-1128)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Inspection Date (Slot Selection)
                    </label>
                    <input
                      type="date"
                      required
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                        Panel Chair (Senior Academician)
                      </label>
                      <select
                        value={panelChair}
                        onChange={(e) => setPanelChair(e.target.value)}
                        className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                      >
                        <option value="Dr. K. G. Narayanan (IIT Bombay)">
                          Dr. K. G. Narayanan (IIT Bombay)
                        </option>
                        <option value="Dr. R. K. Shevgaonkar (IIT Delhi)">
                          Dr. R. K. Shevgaonkar (IIT Delhi)
                        </option>
                        <option value="Prof. Arvind Mehta (VJTI Mumbai)">
                          Prof. Arvind Mehta (VJTI Mumbai)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                        Panel Member 2 (Subject Expert)
                      </label>
                      <select
                        value={panelMember2}
                        onChange={(e) => setPanelMember2(e.target.value)}
                        className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                      >
                        <option value="Prof. Sunita Rao (COEP Technological Univ)">
                          Prof. Sunita Rao (COEP Tech Univ)
                        </option>
                        <option value="Prof. Nitin Deshmukh (VNIT Nagpur)">
                          Prof. Nitin Deshmukh (VNIT Nagpur)
                        </option>
                        <option value="Dr. P. S. Grover (Univ of Delhi)">
                          Dr. P. S. Grover (Univ of Delhi)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded bg-[#FFFBF7] border border-[#F3C39E] text-xs">
                    <input
                      type="checkbox"
                      id="conflictCheck"
                      checked={conflictAffirmed}
                      onChange={(e) => setConflictAffirmed(e.target.checked)}
                      className="rounded text-[#EC642A] focus:ring-[#EC642A]"
                    />
                    <label
                      htmlFor="conflictCheck"
                      className="text-[#2A1810] font-medium cursor-pointer"
                    >
                      Affirm conflict-free panel verification under APH Chapter
                      2 norms.
                    </label>
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
                      Confirm &amp; Deploy Panel →
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
