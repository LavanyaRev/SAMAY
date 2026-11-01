"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { AlertTriangle, Download } from "lucide-react";
import { downloadTextReport } from "@/lib/download-utils";
import {
  regulatoryStore,
  type RegulatoryApplication,
} from "@/lib/regulatory-store";

export default function RegionalWorkbenchPage() {
  const [applications, setApplications] = useState<RegulatoryApplication[]>([]);

  useEffect(() => {
    const load = () => {
      setApplications(regulatoryStore.getApplications());
    };
    load();
    const unsubscribe = regulatoryStore.subscribe(load);
    return unsubscribe;
  }, []);
  const handleDownloadDailyBrief = () => {
    const briefContent = `================================================================================
ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
WESTERN REGIONAL OFFICE (WRO), MUMBAI
DAILY REGULATORY TRIAGE & BREACH BRIEF
DATE: MONDAY, 02 NOVEMBER 2026
================================================================================

1. EXECUTIVE SUMMARY:
   - Total Active Caseload:     486 Applications (412 EoA, 74 LoA)
   - In Documentary Scrutiny:   128 Applications
   - Awaiting EVC Slot:         116 Applications
   - Pending L3 HQ Escalation:  18 Breaches (6 at L3, 12 at L2)
   - Working Appeals Paused:    07 Cases

2. PRIORITY ACTION ITEMS FOR TODAY:
   - 10:30 Scrutiny Review:     12 verified dossiers ready for panel allocation
   - 14:00 EVC Panel Quorum:    3 expert panels awaiting conflict declaration
   - 16:00 L3 Escalation Memo:  EOA-2027-1017 (Vidarbha Engg) update to Bureau HQ

3. CASE ALLOCATION BALANCE:
   - R. Kulkarni:               38 open cases (Within normal capacity)
   - N. Shah:                   44 open cases (+4 case overload detected)
   - P. Joshi:                  46 open cases (+6 case overload detected)
   * System recommendation: Rebalance 4 cases from N. Shah to R. Kulkarni.

AICTE WRO DESK • TIME-STAMP: 2026-11-02 08:30 IST
================================================================================`;
    downloadTextReport(
      "WRO-Daily-Statutory-Brief-2026-11-02.txt",
      briefContent,
    );
  };

  return (
    <RoleGuard allowedRoles={["REGIONAL_OFFICER"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>REGIONAL PORTAL / WRO Workbench</span>
            <span>Statutory Cycle AY 2027–28 • Western Region (WRO)</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Western region, ready for review.
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Maharashtra · Goa · Gujarat · Your prioritised statutory desk
                for Monday, 02 November.
              </p>
            </div>
            <Link
              href="/regional/scrutiny"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <span>Open scrutiny queue →</span>
            </Link>
          </div>

          {/* 4 KPI Stat Cards with Visual Progress Rings (Requirement 7) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#736357]">
                  Total regional applications
                </span>
                <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-1.5 py-0.5 rounded">
                  94% Target
                </span>
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">486</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                412 EoA · 74 LoA
              </div>
              {/* Responsive Progress Bar */}
              <div className="mt-3 h-1.5 w-full bg-[#FAFAFA] rounded-full overflow-hidden border border-[#E5E0D8]">
                <div
                  className="h-full bg-[#EC642A] rounded-full"
                  style={{ width: "85%" }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#736357]">
                  Scrutiny pendency
                </span>
                <span className="text-[10px] font-bold text-[#FAAA21] bg-[#FFF9E6] px-1.5 py-0.5 rounded">
                  In Triage
                </span>
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">128</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                26 due within 2 working days
              </div>
              <div className="mt-3 h-1.5 w-full bg-[#FAFAFA] rounded-full overflow-hidden border border-[#E5E0D8]">
                <div
                  className="h-full bg-[#FAAA21] rounded-full"
                  style={{ width: "62%" }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#736357]">
                  Overdue breaches
                </span>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                  Breached
                </span>
              </div>
              <div className="text-3xl font-bold text-[#EC642A] mt-2">18</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                6 at L3 · 12 at L2
              </div>
              <div className="mt-3 h-1.5 w-full bg-[#FAFAFA] rounded-full overflow-hidden border border-[#E5E0D8]">
                <div
                  className="h-full bg-red-600 rounded-full"
                  style={{ width: "24%" }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#736357]">
                  Paused appeals
                </span>
                <span className="text-[10px] font-bold text-[#736357] bg-[#F0EDE8] px-1.5 py-0.5 rounded">
                  Paused
                </span>
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">07</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Clock paused under review
              </div>
              <div className="mt-3 h-1.5 w-full bg-[#FAFAFA] rounded-full overflow-hidden border border-[#E5E0D8]">
                <div
                  className="h-full bg-[#8A7D75] rounded-full"
                  style={{ width: "14%" }}
                />
              </div>
            </div>
          </div>

          {/* Alert Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-[#F3C39E] bg-[#FFFBF7] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-[#EC642A]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Advisory · Screen EVC panels for conflicts before assignment
                </h2>
                <p className="text-xs text-[#736357] mt-0.5">
                  2 proposed experts have proximity or employment flags. A clean
                  screening result is advisory, not a substitute for the signed
                  conflict declaration.
                </p>
              </div>
            </div>
            <Link
              href="/regional/evc"
              className="inline-flex items-center justify-center rounded-md border border-[#E5E0D8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2A1810] hover:bg-neutral-50 transition-colors shadow-2xs self-start sm:self-auto whitespace-nowrap cursor-pointer"
            >
              <span>Review panels →</span>
            </Link>
          </div>

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Priority Case Desk */}
            <div className="lg:col-span-2 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Priority case desk
                </h2>
                <span className="text-xs text-[#736357]">
                  {applications.length} cases in active queue
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                      <th className="py-2.5 px-2">APPLICATION / INSTITUTION</th>
                      <th className="py-2.5 px-2">QUEUE REASON</th>
                      <th className="py-2.5 px-2">OWNER</th>
                      <th className="py-2.5 px-2">NEXT STEP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE6]">
                    {applications.map((app) => {
                      const isHighlighted =
                        app.hasDeficiency ||
                        app.status?.toLowerCase().includes("deficiency") ||
                        app.status?.toLowerCase().includes("pending");
                      const queueReasonSubtitle =
                        app.stage === "EVC"
                          ? "EVC panel assigned · Inspection scheduled"
                          : app.hasDeficiency
                            ? "Deficiency response due 06 Nov"
                            : app.status?.includes("rectified")
                              ? "Ready for scrutiny verification"
                              : "New submission · Ready for scrutiny";

                      const nextStepText =
                        app.stage === "EVC"
                          ? "View EVC docket →"
                          : app.hasDeficiency
                            ? "Track response →"
                            : "Verify dossier →";

                      return (
                        <tr
                          key={app.id || app.ref}
                          className={
                            isHighlighted
                              ? "bg-[#FFF7F0] hover:bg-[#FFF2E5] transition-colors"
                              : "hover:bg-[#FAFAFA] transition-colors"
                          }
                        >
                          <td className="py-3 px-2">
                            <div className="font-bold text-[#2A1810]">
                              {app.ref}
                            </div>
                            <div className="text-[11px] text-[#736357]">
                              {app.instName} ·{" "}
                              {app.location?.split(",")[0] || "Pune, MH"}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div
                              className={`font-semibold ${
                                app.stage === "EVC"
                                  ? "text-[#2E7D32]"
                                  : app.hasDeficiency
                                    ? "text-[#D32F2F]"
                                    : "text-[#EC642A]"
                              }`}
                            >
                              {app.status || "Scrutiny pending"}
                            </div>
                            <div className="text-[11px] text-[#736357]">
                              {queueReasonSubtitle}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-[#2A1810]">
                            {app.assignedOfficer || "R. Kulkarni"}
                          </td>
                          <td className="py-3 px-2">
                            <Link
                              href="/regional/scrutiny"
                              className="font-medium text-[#EC642A] hover:underline"
                            >
                              {nextStepText}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer Note */}
              <div className="text-[11px] text-[#8A7D75] pt-2">
                Queue order uses SLA age, breach level and response deadlines.
                Paused appeal days are excluded from the working-day clock.
              </div>
            </div>

            {/* Right Column: Desk Plan + Team Capacity */}
            <div className="space-y-6">
              {/* Today's Desk Plan */}
              <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Today's desk plan
                  </h2>
                  <span className="text-xs font-bold text-[#736357]">WRO</span>
                </div>

                <div className="inline-block rounded bg-[#FFF3E0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9A5B18]">
                  26 CASES DUE SOON
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <div className="text-xs font-bold text-[#2A1810]">
                      10:30 · Scrutiny review
                    </div>
                    <p className="text-[11px] text-[#736357]">
                      12 complete submissions ready for verification.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2A1810]">
                      14:00 · Panel allocation
                    </div>
                    <p className="text-[11px] text-[#736357]">
                      3 EVC panels await conflict clearance.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2A1810]">
                      16:00 · Breach review
                    </div>
                    <p className="text-[11px] text-[#736357]">
                      6 L3 records require a reasoned update to HQ.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadDailyBrief}
                  className="w-full flex items-center justify-center gap-1.5 rounded-md border border-[#E5E0D8] bg-white py-2 text-xs font-semibold text-[#2A1810] hover:bg-neutral-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <span>Download daily brief</span>
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Team Capacity */}
              <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs space-y-3">
                <h2 className="text-sm font-bold text-[#2A1810] border-b border-[#F0ECE6] pb-3">
                  Team capacity
                </h2>
                <div className="space-y-2 text-xs text-[#2A1810]">
                  <div className="flex justify-between items-center">
                    <span>R. Kulkarni</span>
                    <span className="font-semibold">38 open cases</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>N. Shah</span>
                    <span className="font-semibold">44 open cases</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>P. Joshi</span>
                    <span className="font-semibold">46 open cases</span>
                  </div>
                </div>
                <div className="border-t border-[#F0ECE6] pt-3 text-[11px] text-[#736357]">
                  Rebalancing recommended: transfer 4 cases to R. Kulkarni.
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
