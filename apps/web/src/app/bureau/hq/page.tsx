"use client";

import React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/download-utils";
import {
  regulatoryStore,
  type RegulatoryApplication,
} from "@/lib/regulatory-store";
import { CheckCircle2, Check, FileCheck2 } from "lucide-react";

const REGIONAL_SUMMARY_ROWS = [
  {
    region: "Western Region (WRO)",
    stateCount: "MH, GA, GJ",
    total: 486,
    scrutiny: 128,
    evc: 116,
    l3Breaches: 6,
    adherence: "84.2%",
  },
  {
    region: "Northern Region (NRO)",
    stateCount: "UP, UK",
    total: 540,
    scrutiny: 142,
    evc: 124,
    l3Breaches: 8,
    adherence: "79.1%",
  },
  {
    region: "Southern Region (SRO)",
    stateCount: "TN, AP, TS",
    total: 612,
    scrutiny: 130,
    evc: 148,
    l3Breaches: 4,
    adherence: "88.6%",
  },
  {
    region: "Eastern Region (ERO)",
    stateCount: "WB, OR, NE",
    total: 320,
    scrutiny: 82,
    evc: 68,
    l3Breaches: 3,
    adherence: "81.0%",
  },
  {
    region: "North-West Region (NWRO)",
    stateCount: "DL, PB, HR",
    total: 498,
    scrutiny: 104,
    evc: 98,
    l3Breaches: 5,
    adherence: "83.5%",
  },
  {
    region: "Central Region (CRO)",
    stateCount: "MP, CG",
    total: 390,
    scrutiny: 57,
    evc: 46,
    l3Breaches: 2,
    adherence: "86.4%",
  },
];

export default function BureauHqPage() {
  const [executiveCases, setExecutiveCases] = React.useState<
    RegulatoryApplication[]
  >([]);
  const [decisionNotice, setDecisionNotice] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    const sync = () => {
      const apps = regulatoryStore.getApplications();
      const pendingApproval = apps.filter(
        (a) =>
          a.status === "EVC_REPORT_SUBMITTED" ||
          a.currentQueue === "EXECUTIVE_APPROVAL" ||
          a.ballWith === "EXECUTIVE_COMMITTEE",
      );
      setExecutiveCases(pendingApproval);
    };
    sync();
    return regulatoryStore.subscribe(sync);
  }, []);

  const handleIssueApproval = (appRef: string) => {
    const res = regulatoryStore.issueFinalDecision(
      appRef,
      "APPROVED",
      "Executive Committee affirmatively reviewed EVC on-site inspection findings and verified full compliance with APH 2024-27 norms.",
      "Dr. Ramesh Unnikrishnan (Advisor & Competent Authority)",
    );
    setDecisionNotice(
      `Statutory Extension of Approval (EoA) order ${res.orderNumber} successfully issued for ${appRef}! Application concluded.`,
    );
  };

  const handleIssueRejection = (appRef: string) => {
    const res = regulatoryStore.issueFinalDecision(
      appRef,
      "REJECTED",
      "Executive Committee determined irremediable statutory infrastructure deficiency based on EVC inspection findings.",
      "Dr. Ramesh Unnikrishnan (Advisor & Competent Authority)",
    );
    setDecisionNotice(
      `Statutory Rejection decree ${res.orderNumber} issued for ${appRef}. Case archived.`,
    );
  };

  const handleGenerateNationalSummary = () => {
    const headers = [
      "Regional Office",
      "Jurisdiction States",
      "Total Applications",
      "Under Scrutiny",
      "EVC Pending",
      "L3 Escalations",
      "SLA Compliance",
    ];
    const rows = REGIONAL_SUMMARY_ROWS.map((r) => [
      r.region,
      r.stateCount,
      r.total,
      r.scrutiny,
      r.evc,
      r.l3Breaches,
      r.adherence,
    ]);
    downloadCsv("pan-india-bureau-summary-ay2027-28.csv", headers, rows);
  };

  return (
    <RoleGuard allowedRoles={["BUREAU_OFFICER", "ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>BUREAU PORTAL / Pan-India HQ Dashboard</span>
            <span>Statutory Cycle AY 2027–28 • National Headquarters</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Pan-India approval oversight
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Macro throughput and statutory compliance health across all 8
                regional offices.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateNationalSummary}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <span>Generate national summary</span>
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 4 KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                Total applications
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">
                2,846
              </div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                AY 2027–28 national cycle
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                SLA adherence
              </div>
              <div className="text-3xl font-bold text-[#2E7D32] mt-2">
                82.4%
              </div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Within statutory targets
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                Under scrutiny
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">643</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Regional desks reviewing
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                L3 breaches
              </div>
              <div className="text-3xl font-bold text-[#EC642A] mt-2">28</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Pending Bureau intervention
              </div>
            </div>
          </div>

          {/* Requirement 7: Visual Responsive Progress Bars & Throughput Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
              <div className="border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Regional SLA Compliance Matrix
                </h2>
                <p className="text-xs text-[#736357]">
                  Percentage of applications verified within statutory timeline
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {REGIONAL_SUMMARY_ROWS.map((r) => (
                  <div key={r.region}>
                    <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                      <span className="font-medium">{r.region}</span>
                      <span className="font-bold text-[#2E7D32]">
                        {r.adherence}
                      </span>
                    </div>
                    <div className="h-3 w-full bg-[#FAFAFA] rounded-full border border-[#E5E0D8] overflow-hidden">
                      <div
                        className="h-full bg-[#EC642A] rounded-full"
                        style={{ width: r.adherence }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
              <div className="border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Workflow Bottleneck Analysis
                </h2>
                <p className="text-xs text-[#736357]">
                  Active national case distribution across statutory stages
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                    <span className="font-medium">
                      Documentary Scrutiny (Regional Offices)
                    </span>
                    <span className="font-bold">643 cases (22.6%)</span>
                  </div>
                  <div className="h-4 w-full bg-[#FAFAFA] rounded border border-[#E5E0D8] overflow-hidden">
                    <div
                      className="h-full bg-[#FAAA21] rounded-sm"
                      style={{ width: "22.6%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                    <span className="font-medium">
                      Expert Visit Committee Inspections
                    </span>
                    <span className="font-bold">598 cases (21.0%)</span>
                  </div>
                  <div className="h-4 w-full bg-[#FAFAFA] rounded border border-[#E5E0D8] overflow-hidden">
                    <div
                      className="h-full bg-[#EC642A] rounded-sm"
                      style={{ width: "21.0%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                    <span className="font-medium">
                      Standing Appeal / Hearing Committee (SAC/SHC)
                    </span>
                    <span className="font-bold">142 cases (5.0%)</span>
                  </div>
                  <div className="h-4 w-full bg-[#FAFAFA] rounded border border-[#E5E0D8] overflow-hidden">
                    <div
                      className="h-full bg-[#D5531B] rounded-sm"
                      style={{ width: "5.0%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                    <span className="font-medium">
                      Approved / Orders Issued
                    </span>
                    <span className="font-bold text-[#2E7D32]">
                      1,463 cases (51.4%)
                    </span>
                  </div>
                  <div className="h-4 w-full bg-[#FAFAFA] rounded border border-[#E5E0D8] overflow-hidden">
                    <div
                      className="h-full bg-[#2E7D32] rounded-sm"
                      style={{ width: "51.4%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decision Notice */}
          {decisionNotice && (
            <div className="flex items-center justify-between rounded-lg border border-[#C8E6C9] bg-[#E8F5E9] p-4 text-xs font-medium text-[#2E7D32] shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{decisionNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setDecisionNotice(null)}
                className="text-xs font-semibold hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* STAGE 5: Executive Committee Final Decision Desk */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-[#EC642A]" />
                <div>
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Executive Final Approval Desk ({executiveCases.length}{" "}
                    Awaiting Decision)
                  </h2>
                  <p className="text-xs text-[#736357]">
                    Stage 5: Review digitally submitted EVC inspection reports
                    and issue final statutory decree (EoA or Rejection).
                  </p>
                </div>
              </div>
              <span className="rounded bg-[#E8F5E9] px-2.5 py-1 text-xs font-bold text-[#2E7D32]">
                Competent Authority Ledger Active
              </span>
            </div>

            {executiveCases.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#736357]">
                <CheckCircle2 className="h-6 w-6 text-[#2E7D32] mx-auto mb-2" />
                All forwarded EVC reports have been adjudicated. No pending
                applications currently in Executive Approval queue.
              </div>
            ) : (
              <div className="divide-y divide-[#F0ECE6]">
                {executiveCases.map((app) => (
                  <div
                    key={app.ref}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#2A1810]">
                          {app.ref}
                        </span>
                        <span className="rounded bg-[#FFF7F0] px-2 py-0.5 text-[10px] font-bold text-[#EC642A] border border-[#F3C39E]">
                          EVC Report Submitted · Advisory 92%
                        </span>
                      </div>
                      <div className="text-xs font-medium text-[#2A1810]">
                        {app.instName} · {app.location}
                      </div>
                      <div className="text-[11px] text-[#736357]">
                        Scope: {app.program} · Approved Intake: {app.intake}{" "}
                        seats · EVC Lead:{" "}
                        {app.evcPanelLead || "Prof. Vikram Rao (IIT Bombay)"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleIssueApproval(app.ref)}
                        className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Issue Final Approval (EoA) →</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleIssueRejection(app.ref)}
                        className="inline-flex items-center gap-1 rounded border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 shadow-2xs transition-colors cursor-pointer"
                      >
                        <span>Issue Rejection Decree ✕</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Regional Table Card */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
              <h2 className="text-sm font-bold text-[#2A1810]">
                Regional jurisdiction throughput &amp; breach matrix
              </h2>
              <span className="text-xs text-[#736357]">
                All 8 AICTE regions active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">REGIONAL OFFICE</th>
                    <th className="py-3 px-2">JURISDICTION</th>
                    <th className="py-3 px-2">TOTAL APPS</th>
                    <th className="py-3 px-2">UNDER SCRUTINY</th>
                    <th className="py-3 px-2">EVC PENDING</th>
                    <th className="py-3 px-2">L3 ESCALATIONS</th>
                    <th className="py-3 px-2 text-right">SLA COMPLIANCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {REGIONAL_SUMMARY_ROWS.map((row) => (
                    <tr
                      key={row.region}
                      className="hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="py-3 px-2 font-bold text-[#2A1810]">
                        {row.region}
                      </td>
                      <td className="py-3 px-2 text-[#736357]">
                        {row.stateCount}
                      </td>
                      <td className="py-3 px-2 text-[#2A1810]">{row.total}</td>
                      <td className="py-3 px-2 text-[#2A1810]">
                        {row.scrutiny}
                      </td>
                      <td className="py-3 px-2 text-[#2A1810]">{row.evc}</td>
                      <td className="py-3 px-2 font-bold text-[#EC642A]">
                        {row.l3Breaches}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-[#2E7D32]">
                        {row.adherence}
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
