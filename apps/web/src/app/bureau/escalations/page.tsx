"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { Download, AlertCircle, Check } from "lucide-react";
import { downloadCsv, downloadTextReport } from "@/lib/download-utils";

interface EscalationItem {
  ref: string;
  institution: string;
  region: string;
  daysOverdue: number;
  stage: string;
  reason: string;
}

const L3_ESCALATIONS: EscalationItem[] = [
  {
    ref: "EOA-2027-1017",
    institution: "Vidarbha Engineering College",
    region: "WRO",
    daysOverdue: 32,
    stage: "Scrutiny",
    reason: "Faculty CADRE ratio deficiency unresolved",
  },
  {
    ref: "LOA-2027-1104",
    institution: "Coastal Institute of Technology",
    region: "WRO",
    daysOverdue: 24,
    stage: "EVC Inspection",
    reason: "Land title verification clarification delayed",
  },
  {
    ref: "EOA-2027-2089",
    institution: "Awadh Technical Campus, Lucknow",
    region: "NRO",
    daysOverdue: 28,
    stage: "Scrutiny",
    reason: "Municipal fire NOC renewal unacknowledged",
  },
  {
    ref: "EOA-2027-3102",
    institution: "Rayalaseema Institute, Tirupati",
    region: "SRO",
    daysOverdue: 19,
    stage: "EVC Inspection",
    reason: "Panel expert quorum reschedule required",
  },
];

export default function BureauEscalationsPage() {
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleExportBreachDocket = () => {
    const headers = [
      "Application Ref",
      "Institution",
      "Region",
      "Days Overdue",
      "Stage",
      "Breach Reason",
    ];
    const rows = L3_ESCALATIONS.map((e) => [
      e.ref,
      e.institution,
      e.region,
      `+${e.daysOverdue} days`,
      e.stage,
      e.reason,
    ]);
    downloadCsv("l3-breach-register-national.csv", headers, rows);
  };

  const handleIssueNotice = (e: EscalationItem) => {
    setSuccessNotice(
      `Official Bureau Notice dispatched to ${e.institution} (${e.ref}). Regulatory clock frozen.`,
    );
    downloadTextReport(
      `Bureau-Notice-${e.ref}.txt`,
      `ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)\nHEADQUARTERS APPROVAL BUREAU - STATUTORY SHOW CAUSE NOTICE\n\nReference: ${e.ref}\nTarget Institution: ${e.institution} (${e.region})\nSLA Violation: Overdue by ${e.daysOverdue} days at stage "${e.stage}".\nReason: ${e.reason}\n\nMANDATE:\nYou are directed to submit rectifications within 7 calendar days before the Standing Hearing Committee (SHC).\nTimestamp: 2026-10-31 IST`,
    );
  };

  return (
    <RoleGuard allowedRoles={["BUREAU_OFFICER", "ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>BUREAU PORTAL / Escalation L3 Register</span>
            <span>Statutory Cycle AY 2027–28 • National Headquarters</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Escalation L3 register
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Statutory breach ledger for applications exceeding regional
                scrutiny and inspection SLA targets.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBreachDocket}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <span>Export breach docket</span>
              <Download className="h-3.5 w-3.5" />
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

          {/* Table Card */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
              <h2 className="text-sm font-bold text-[#2A1810]">
                Applications in active Level-3 regulatory breach (
                {L3_ESCALATIONS.length})
              </h2>
              <span className="text-xs text-[#EC642A] font-semibold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Overdue &gt; 15 working days</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">APPLICATION / INSTITUTION</th>
                    <th className="py-3 px-2">REGION</th>
                    <th className="py-3 px-2">DAYS OVERDUE</th>
                    <th className="py-3 px-2">STAGE</th>
                    <th className="py-3 px-2">BREACH REASON</th>
                    <th className="py-3 px-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {L3_ESCALATIONS.map((row) => (
                    <tr
                      key={row.ref}
                      className="bg-[#FFF9F4] hover:bg-[#FFF3E8] transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="font-bold text-[#2A1810]">
                          {row.ref}
                        </div>
                        <div className="text-[11px] text-[#736357]">
                          {row.institution}
                        </div>
                      </td>
                      <td className="py-3 px-2 font-mono text-[#2A1810]">
                        {row.region}
                      </td>
                      <td className="py-3 px-2 font-bold text-[#EC642A]">
                        +{row.daysOverdue} days
                      </td>
                      <td className="py-3 px-2 text-[#2A1810]">{row.stage}</td>
                      <td className="py-3 px-2 text-[#736357]">{row.reason}</td>
                      <td className="py-3 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleIssueNotice(row)}
                          className="rounded bg-[#EC642A] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#D5531B] shadow-2xs cursor-pointer"
                        >
                          Issue Bureau Notice →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
