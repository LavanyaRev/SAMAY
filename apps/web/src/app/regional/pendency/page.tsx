"use client";

import React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/download-utils";

export default function RegionalPendencyPage() {
  const handleExportPendency = () => {
    const headers = [
      "District / Cluster",
      "Total Applications",
      "Scrutiny Pending",
      "EVC Pending",
      "Overdue SLA",
    ];
    const rows = [
      ["Pune & Haveli", 142, 38, 32, "4 cases"],
      ["Mumbai Metropolitan (MMR)", 128, 34, 28, "3 cases"],
      ["Ahmedabad & Gandhinagar", 96, 24, 22, "2 cases"],
      ["Goa & South Konkan", 42, 12, 10, "2 cases"],
    ];
    downloadCsv("regional-pendency-breakdown.csv", headers, rows);
  };
  return (
    <RoleGuard allowedRoles={["REGIONAL_OFFICER"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>REGIONAL PORTAL / Regional Pendency</span>
            <span>DEMO DATA · 02 Nov 2026 · 10:00 IST</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Regional pendency, made actionable.
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                SLA tracking across scrutiny, EVC, and SAC/SHC stages in western
                region.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportPendency}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <span>Export pendency report</span>
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 4 KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                Under scrutiny
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">128</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                26 due in 48 hours
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                EVC pending
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">116</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Awaiting inspection slots
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                Overdue breaches
              </div>
              <div className="text-3xl font-bold text-[#EC642A] mt-2">18</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                6 at L3 · 12 at L2
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs">
              <div className="text-xs font-medium text-[#736357]">
                Paused appeals
              </div>
              <div className="text-3xl font-bold text-[#2A1810] mt-2">07</div>
              <div className="text-[11px] text-[#8A7D75] mt-1">
                Under judicial review
              </div>
            </div>
          </div>

          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Pendency by Stage */}
            <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
              <div className="border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Pendency by Stage
                </h2>
                <p className="text-xs text-[#736357]">
                  Working applications distributed by statutory stage
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                    <span className="font-medium">Scrutiny Verification</span>
                    <span className="font-bold">128 cases</span>
                  </div>
                  <div className="h-5 w-full bg-[#FAFAFA] rounded border border-[#E5E0D8] overflow-hidden">
                    <div
                      className="h-full bg-[#EC642A] rounded-sm"
                      style={{ width: "65%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                    <span className="font-medium">EVC Inspection</span>
                    <span className="font-bold">116 cases</span>
                  </div>
                  <div className="h-5 w-full bg-[#FAFAFA] rounded border border-[#E5E0D8] overflow-hidden">
                    <div
                      className="h-full bg-[#FAAA21] rounded-sm"
                      style={{ width: "58%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                    <span className="font-medium">SAC / SHC Hearing</span>
                    <span className="font-bold">24 cases</span>
                  </div>
                  <div className="h-5 w-full bg-[#FAFAFA] rounded border border-[#E5E0D8] overflow-hidden">
                    <div
                      className="h-full bg-[#D5531B] rounded-sm"
                      style={{ width: "18%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                    <span className="font-medium">Final Bureau Decision</span>
                    <span className="font-bold">18 cases</span>
                  </div>
                  <div className="h-5 w-full bg-[#FAFAFA] rounded border border-[#E5E0D8] overflow-hidden">
                    <div
                      className="h-full bg-[#8A7D75] rounded-sm"
                      style={{ width: "12%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 2: Breaches by SLA Tier */}
            <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
              <div className="border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Breaches by SLA Tier
                </h2>
                <p className="text-xs text-[#736357]">
                  Escalation severity breakdown across western region
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                    <span className="font-medium">
                      Level 1 Escalation (&gt;15 days)
                    </span>
                    <span className="font-bold text-[#EC642A]">18 cases</span>
                  </div>
                  <div className="h-5 w-full bg-[#FAFAFA] rounded border border-[#E5E0D8] overflow-hidden">
                    <div
                      className="h-full bg-[#FAAA21] rounded-sm"
                      style={{ width: "50%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                    <span className="font-medium">
                      Level 2 Regional Alert (&gt;22 days)
                    </span>
                    <span className="font-bold text-[#D5531B]">12 cases</span>
                  </div>
                  <div className="h-5 w-full bg-[#FAFAFA] rounded border border-[#E5E0D8] overflow-hidden">
                    <div
                      className="h-full bg-[#EC642A] rounded-sm"
                      style={{ width: "35%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#2A1810] mb-1">
                    <span className="font-medium">
                      Level 3 Bureau HQ Escalation (&gt;30 days)
                    </span>
                    <span className="font-bold text-red-600">6 cases</span>
                  </div>
                  <div className="h-5 w-full bg-[#FAFAFA] rounded border border-[#E5E0D8] overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-sm"
                      style={{ width: "20%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Regional Table */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-[#2A1810] border-b border-[#F0ECE6] pb-3">
              District-wise pendency distribution (Maharashtra, Goa, Gujarat)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-2 px-2">DISTRICT / CLUSTER</th>
                    <th className="py-2 px-2">TOTAL APPLICATIONS</th>
                    <th className="py-2 px-2">SCRUTINY PENDING</th>
                    <th className="py-2 px-2">EVC PENDING</th>
                    <th className="py-2 px-2">OVERDUE SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  <tr>
                    <td className="py-3 px-2 font-bold text-[#2A1810]">
                      Pune & Haveli
                    </td>
                    <td className="py-3 px-2 text-[#2A1810]">142</td>
                    <td className="py-3 px-2 text-[#2A1810]">38</td>
                    <td className="py-3 px-2 text-[#2A1810]">32</td>
                    <td className="py-3 px-2 text-[#EC642A] font-medium">
                      4 cases
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-[#2A1810]">
                      Mumbai Metropolitan (MMR)
                    </td>
                    <td className="py-3 px-2 text-[#2A1810]">128</td>
                    <td className="py-3 px-2 text-[#2A1810]">34</td>
                    <td className="py-3 px-2 text-[#2A1810]">28</td>
                    <td className="py-3 px-2 text-[#EC642A] font-medium">
                      3 cases
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-[#2A1810]">
                      Ahmedabad & Gandhinagar
                    </td>
                    <td className="py-3 px-2 text-[#2A1810]">96</td>
                    <td className="py-3 px-2 text-[#2A1810]">24</td>
                    <td className="py-3 px-2 text-[#2A1810]">22</td>
                    <td className="py-3 px-2 text-[#EC642A] font-medium">
                      2 cases
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 font-bold text-[#2A1810]">
                      Goa & South Konkan
                    </td>
                    <td className="py-3 px-2 text-[#2A1810]">42</td>
                    <td className="py-3 px-2 text-[#2A1810]">12</td>
                    <td className="py-3 px-2 text-[#2A1810]">10</td>
                    <td className="py-3 px-2 text-red-600 font-medium">
                      2 cases
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
