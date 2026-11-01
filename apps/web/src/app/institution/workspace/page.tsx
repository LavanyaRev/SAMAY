"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import {
  regulatoryStore,
  type RegulatoryApplication,
} from "@/lib/regulatory-store";
import { ReScrutinyAuditTrail } from "@/components/deficiencies/rescrutiny-audit-trail";
import { TerPaymentTracker } from "@/components/payments/ter-payment-tracker";
import { ApplicationProgressTimeline } from "@/components/workflow/application-progress-timeline";
import type { GranularDeficiencyItem } from "@samay/shared";

export default function InstitutionWorkspacePage() {
  const [app, setApp] = useState<RegulatoryApplication | null>(null);
  const [deficiency, setDeficiency] = useState<GranularDeficiencyItem | null>(
    null,
  );

  useEffect(() => {
    const load = () => {
      const liveApp = regulatoryStore.getApplicationByRef("EOA-2027-1042");
      if (liveApp) setApp(liveApp);
      const defs = regulatoryStore.getDeficiencies();
      const targetDef =
        defs.find((d) => d.deficiencyId === "DEF-2027-WRO-1042-01") || defs[0];
      if (targetDef) setDeficiency(targetDef);
    };
    load();
    const unsubscribe = regulatoryStore.subscribe(load);
    return unsubscribe;
  }, []);

  const currentStage = app?.stage || "SCRUTINY";
  const hasDeficiency = app?.hasDeficiency ?? true;
  const isRectifiedPending =
    app?.status === "Deficiency rectified · Pending Scrutiny";
  const isEvc = currentStage === "EVC";
  const isBureau = currentStage === "BUREAU_REVIEW";
  const isApproved = currentStage === "APPROVAL";

  return (
    <RoleGuard allowedRoles={["INSTITUTION"]}>
      <AppShell>
        <div className="space-y-8">
          {/* Top Breadcrumb & Timestamp Bar */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>INSTITUTION PORTAL / Role Workspace</span>
            <span>Statutory Cycle AY 2027–28 • IST Standard</span>
          </div>

          {/* Page Main Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Welcome back, Sahyadri Institute.
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Your 2027–28 approval journey, with the next step made clear.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-block rounded px-2.5 py-0.5 text-xs font-semibold bg-[#FFF7F0] text-[#EC642A] border border-[#F3C39E]/50">
                  {app?.routeLabel ||
                    "Route 5: Conditional Processing (Scrutiny + EVC + Hearing)"}
                </span>
                <span className="text-[11px] text-[#8A7D75]">
                  Statutory APH 2024-27 Routing Architecture
                </span>
              </div>
            </div>
            <Link
              href="/institution/applications"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <span>View application →</span>
            </Link>
          </div>

          {/* Action Required / Status Banner */}
          {hasDeficiency ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#F3C39E] bg-[#FFFBF7] p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full p-1 text-[#EC642A]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Action required · Your application was returned for
                    deficiency
                  </h2>
                  <p className="text-xs text-[#736357] mt-0.5">
                    EOA-2027-1042 · Replace the Fire NOC and submit the faculty
                    undertaking by{" "}
                    {app?.deficiencyDeadline || "06 Nov 2026, 17:00 IST"}.
                  </p>
                </div>
              </div>
              <Link
                href="/institution/undertakings"
                className="inline-flex items-center justify-center rounded-md border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-semibold text-[#2A1810] hover:bg-neutral-50 transition-colors shadow-2xs self-start sm:self-auto whitespace-nowrap cursor-pointer"
              >
                <span>Resolve deficiencies →</span>
              </Link>
            </div>
          ) : isRectifiedPending ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#FAAA21] bg-[#FFFDF5] p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#8C6D1F]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Deficiencies Rectified · Scrutiny Officer Verification in
                    Progress
                  </h2>
                  <p className="text-xs text-[#736357] mt-0.5">
                    EOA-2027-1042 · Replacement evidence uploaded to immutable
                    audit ledger. Scrutiny desk (WRO) has been notified.
                  </p>
                </div>
              </div>
              <Link
                href="/institution/undertakings"
                className="inline-flex items-center justify-center rounded-md border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-semibold text-[#2A1810] hover:bg-neutral-50 transition-colors shadow-2xs self-start sm:self-auto whitespace-nowrap cursor-pointer"
              >
                <span>View evidence status →</span>
              </Link>
            </div>
          ) : isEvc ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#C8E6C9] bg-[#E8F5E9] p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#2E7D32]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1B5E20]">
                    Scrutiny Completed · EVC Panel Inspection Scheduled
                  </h2>
                  <p className="text-xs text-[#2E7D32] mt-0.5">
                    EOA-2027-1042 · Conflict-free Expert Visit Committee
                    allocated for {app?.evcDate || "05 Nov 2026"}. Lead:{" "}
                    {app?.evcPanelLead || "Dr. K. Verma"}.
                  </p>
                </div>
              </div>
              <Link
                href="/institution/applications"
                className="inline-flex items-center justify-center rounded-md border border-[#C8E6C9] bg-white px-4 py-2 text-xs font-semibold text-[#1B5E20] hover:bg-neutral-50 transition-colors shadow-2xs self-start sm:self-auto whitespace-nowrap cursor-pointer"
              >
                <span>View inspection details →</span>
              </Link>
            </div>
          ) : isBureau ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#FFE082] bg-[#FFFDE7] p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#F57F17]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#F57F17]">
                    EVC Inspection Dossier Submitted · Under Bureau Review
                  </h2>
                  <p className="text-xs text-[#736357] mt-0.5">
                    EOA-2027-1042 · On-site inspection report signed by
                    committee panel. Final approval docket pending Competent
                    Authority sign-off.
                  </p>
                </div>
              </div>
            </div>
          ) : isApproved ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#C8E6C9] bg-[#E8F5E9] p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#2E7D32]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1B5E20]">
                    Approval Granted · Extension of Approval (EoA) Issued
                  </h2>
                  <p className="text-xs text-[#2E7D32] mt-0.5">
                    EOA-2027-1042 · Statutory Approval Order is active and
                    available for download.
                  </p>
                </div>
              </div>
              <Link
                href="/institution/applications"
                className="inline-flex items-center justify-center rounded-md bg-[#2E7D32] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1B5E20] transition-colors shadow-2xs self-start sm:self-auto whitespace-nowrap cursor-pointer"
              >
                <span>Download order ↓</span>
              </Link>
            </div>
          ) : null}

          {/* Active Application Progress Graphical Timeline */}
          <div className="rounded-xl bg-white p-6 sm:p-7 shadow-xs">
            <ApplicationProgressTimeline application={app} />
          </div>

          {/* Two-Column Grid: Left (Glance + Activity + Audit Trail), Right (TER + Checklist + Help) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left 2 Columns */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              {/* Application at a glance */}
              <div className="rounded-xl bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Application at a glance
                  </h2>
                  <span className="text-xs text-[#736357]">
                    Submitted 20 Oct 2026
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Col 1 */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                      INSTITUTION / REFERENCE
                    </div>
                    <div className="mt-2 text-xs font-bold text-[#2A1810]">
                      Sahyadri Institute of Technology, Pune
                    </div>
                    <div className="text-xs font-bold text-[#EC642A] mt-0.5">
                      AICTE Demo ID: 1-DEMO-4102
                    </div>
                    <div className="mt-5 text-[11px] text-[#736357]">
                      Registered office
                    </div>
                    <div className="text-xs font-medium text-[#2A1810] mt-0.5">
                      Haveli, Pune · Maharashtra
                    </div>
                  </div>

                  {/* Col 2 */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                      PROGRAMME SCOPE
                    </div>
                    <div className="mt-2 text-xs font-medium text-[#2A1810]">
                      EoA · 2027–28
                    </div>
                    <div className="text-xs text-[#736357] mt-0.5">
                      UG Engineering · Intake 480
                    </div>
                    <div className="mt-5 text-[11px] text-[#736357]">
                      Affiliating university
                    </div>
                    <div className="text-xs font-medium text-[#2A1810] mt-0.5">
                      Savitribai Phule Pune University
                    </div>
                  </div>

                  {/* Col 3 */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                      CURRENT STATUS
                    </div>
                    <div
                      className={`mt-2 text-xs font-bold ${app?.hasDeficiency ? "text-[#EC642A]" : "text-[#2E7D32]"}`}
                    >
                      {app?.status || "Deficiency returned"}
                    </div>
                    <div className="mt-8 text-[11px] text-[#736357]">
                      Regional desk
                    </div>
                    <div className="text-xs font-medium text-[#2A1810] mt-0.5">
                      WRO · R. Kulkarni
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="rounded-xl bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Recent activity
                  </h2>
                  <span className="text-xs text-[#736357]">All times IST</span>
                </div>

                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                        <th className="py-2.5 font-bold">WHEN</th>
                        <th className="py-2.5 font-bold">ACTIVITY</th>
                        <th className="py-2.5 font-bold">BY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0ECE6]">
                      {/* Highlighted Row 1 */}
                      <tr className="bg-[#FFF7F0]">
                        <td className="py-3 px-2 font-medium text-[#2A1810]">
                          02 Nov · 09:20
                        </td>
                        <td className="py-3 px-2 font-medium text-[#EC642A]">
                          Deficiency memo WRO/1042/D1 issued
                        </td>
                        <td className="py-3 px-2 text-[#736357]">
                          WRO scrutiny desk
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-medium text-[#2A1810]">
                          29 Oct · 16:40
                        </td>
                        <td className="py-3 px-2 text-[#2A1810]">
                          Land and building records verified
                        </td>
                        <td className="py-3 px-2 text-[#736357]">
                          R. Kulkarni
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-medium text-[#2A1810]">
                          20 Oct · 11:32
                        </td>
                        <td className="py-3 px-2 text-[#2A1810]">
                          Application and ₹1,00,000 fee received
                        </td>
                        <td className="py-3 px-2 text-[#736357]">
                          Institution nodal officer
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MODULE 2: Re-Scrutiny Audit Trail */}
              {deficiency && (
                <div className="rounded-xl bg-white shadow-xs overflow-hidden">
                  <ReScrutinyAuditTrail deficiency={deficiency} />
                </div>
              )}
            </div>

            {/* Right 1 Column */}
            <div className="space-y-6 sm:space-y-8">
              {/* MODULE 5: Bound TER Payment Tracker */}
              <div className="rounded-xl bg-white p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    TER Fee Settlement
                  </h2>
                  <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#C8E6C9]">
                    Verified
                  </span>
                </div>
                <TerPaymentTracker payment={app?.payment} />
              </div>

              {/* Your response checklist Card */}
              <div className="rounded-xl bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Your response checklist
                  </h2>
                  <span className="text-xs text-[#736357] font-semibold">
                    2 pending
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="inline-block rounded bg-[#FFF3E0] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9A5B18] border border-[#FFE0B2]">
                    DUE IN 4 CALENDAR DAYS
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[#2A1810]">
                      01 · Replace expired Fire NOC
                    </div>
                    <p className="mt-0.5 text-xs text-[#736357]">
                      Upload the renewed certificate issued by the competent
                      local authority.
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[#2A1810]">
                      02 · Faculty availability undertaking
                    </div>
                    <p className="mt-0.5 text-xs text-[#736357]">
                      Use the signed 2027–28 format and include the principal's
                      seal.
                    </p>
                  </div>

                  <Link
                    href="/institution/undertakings"
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>Open evidence workspace →</span>
                  </Link>
                </div>
              </div>

              {/* Help desk callout */}
              <div className="rounded-xl bg-[#FAF8F5] p-5 text-xs text-[#736357] leading-relaxed border border-[#F0ECE6]">
                Need clarity on the memo? Contact the WRO help desk with{" "}
                <strong className="text-[#2A1810]">EOA-2027-1042</strong>.
                Support hours: 09:30–17:30, working days.
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
