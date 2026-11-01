"use client";

import React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { CheckCircle2, ShieldCheck, Database, Server } from "lucide-react";
import { DEMO_ROLE_ACCOUNTS } from "@/lib/mock-data";

export default function AdminGovernancePage() {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>ADMIN PORTAL / System Governance</span>
            <span>Statutory Cycle AY 2027–28 • System Governance</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                System governance
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                AICTE statutory roles, database migration health, and APH cycle
                configuration.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-medium text-white hover:bg-[#D5531B] transition-colors shadow-2xs self-start sm:self-auto"
            >
              <span>Deploy cycle update +</span>
            </button>
          </div>

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Statutory Role Register */}
            <div className="lg:col-span-7 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Seeded Statutory Role Registry ({DEMO_ROLE_ACCOUNTS.length})
                </h2>
                <ShieldCheck className="h-4 w-4 text-[#2E7D32]" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                      <th className="py-3 px-2">ROLE / IDENTIFIER</th>
                      <th className="py-3 px-2">OFFICER / ENTITY</th>
                      <th className="py-3 px-2">JURISDICTION</th>
                      <th className="py-3 px-2 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE6]">
                    {DEMO_ROLE_ACCOUNTS.map((acct) => (
                      <tr key={acct.role} className="hover:bg-[#FAFAFA]">
                        <td className="py-3 px-2">
                          <span className="rounded bg-[#EFECE6] px-2 py-0.5 text-[10px] font-mono font-bold text-[#2A1810]">
                            {acct.role}
                          </span>
                          <div className="text-[11px] text-[#736357] mt-0.5">
                            {acct.email}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-[#2A1810] font-medium">
                          {acct.personName}
                        </td>
                        <td className="py-3 px-2 text-[#736357]">
                          {acct.regionBadge}
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-[#2E7D32]">
                          Active
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 5 cols: Telemetry */}
            <div className="lg:col-span-5 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
              <div className="border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Infrastructure &amp; ledger telemetry
                </h2>
                <p className="text-xs text-[#736357] mt-0.5">
                  Real-time database and outbox status
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-md bg-[#FAFAFA] border border-[#E5E0D8]">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-[#EC642A]" />
                    <span className="font-medium text-[#2A1810]">
                      PostgreSQL Schema Migrations
                    </span>
                  </div>
                  <span className="font-semibold text-[#2E7D32] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Up to Date</span>
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-[#FAFAFA] border border-[#E5E0D8]">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-[#EC642A]" />
                    <span className="font-medium text-[#2A1810]">
                      Transactional Outbox Dispatcher
                    </span>
                  </div>
                  <span className="font-semibold text-[#2E7D32] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>0 Pending</span>
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-[#FAFAFA] border border-[#E5E0D8]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#EC642A]" />
                    <span className="font-medium text-[#2A1810]">
                      SHA-256 Hash Chain Integrity
                    </span>
                  </div>
                  <span className="font-semibold text-[#2E7D32] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>

              <div className="rounded-md bg-[#F8F7F5] p-3 text-[11px] text-[#736357] leading-relaxed">
                Zero system date rule active. All statutory time calculations
                are driven deterministically by ClockService.
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
