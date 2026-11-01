"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { Shield, Plus, X, CheckCircle2, BookOpen } from "lucide-react";
import { regulatoryStore, type RegulatoryPolicy } from "@/lib/regulatory-store";
import type { StatutoryPolicyRecord } from "@samay/shared";

export default function BureauPolicyMatrixPage() {
  const [policies, setPolicies] = useState<RegulatoryPolicy[]>([]);
  const [statutoryPolicies, setStatutoryPolicies] = useState<
    StatutoryPolicyRecord[]
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form inputs
  const [stage, setStage] = useState("");
  const [slaDays, setSlaDays] = useState("15 Working Days");
  const [roles, setRoles] = useState("Regional Officer + Bureau Nominee");
  const [fee, setFee] = useState("₹50,000");
  const [escalation, setEscalation] = useState("L1: 15d · L2: 22d · L3: 30d");
  const [referenceClause, setReferenceClause] = useState(
    "APH 2024-27 Clause 4.8",
  );

  useEffect(() => {
    setPolicies(regulatoryStore.getPolicies());
    setStatutoryPolicies(regulatoryStore.getStatutoryPolicies());
    const unsubscribe = regulatoryStore.subscribe(() => {
      setPolicies(regulatoryStore.getPolicies());
      setStatutoryPolicies(regulatoryStore.getStatutoryPolicies());
    });
    return unsubscribe;
  }, []);

  const handlePublishPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    const created = regulatoryStore.addPolicy({
      stage,
      slaDays,
      roles,
      fee,
      escalation,
      referenceClause,
    });

    // Clean reset of form inputs to avoid ghosted values
    setStage("");
    setSlaDays("15 Working Days");
    setRoles("Regional Officer + Bureau Nominee");
    setFee("₹50,000");
    setEscalation("L1: 15d · L2: 22d · L3: 30d");
    setReferenceClause("APH 2024-27 Clause 4.8");
    setIsModalOpen(false);

    setSuccessNotice(
      `Policy update for "${created.stage}" published and committed to versioned APH matrix.`,
    );
  };

  return (
    <RoleGuard allowedRoles={["BUREAU_OFFICER", "ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>BUREAU PORTAL / Global Policy Matrix</span>
            <span>Statutory Cycle AY 2027–28 • APH Handbook Matrix</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Global policy matrix
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Statutory parameters, fee schedules, and stage SLA constraints
                for Approval Cycle 2027–28.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSuccessNotice(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Publish policy update +</span>
            </button>
          </div>

          {successNotice && (
            <div className="flex items-center gap-2 rounded-md border border-[#C8E6C9] bg-[#E8F5E9] p-3 text-xs text-[#2E7D32]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Policy Table Card */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
              <h2 className="text-sm font-bold text-[#2A1810]">
                Active Approval Process Handbook (APH 2024-27) parameters
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-[#2E7D32] font-medium">
                <Shield className="h-3.5 w-3.5" />
                <span>Versioned JSON Data ({policies.length} rules)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">STATUTORY GATE / STAGE</th>
                    <th className="py-3 px-2">SLA TARGET</th>
                    <th className="py-3 px-2">REQUIRED ROLES</th>
                    <th className="py-3 px-2">FEE SCHEDULE</th>
                    <th className="py-3 px-2">ESCALATION THRESHOLD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {policies.map((pol) => (
                    <tr
                      key={pol.id}
                      className="hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="font-bold text-[#2A1810]">
                          {pol.stage}
                        </div>
                        <div className="text-[11px] text-[#8A7D75]">
                          {pol.referenceClause}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[#2A1810]">
                        {pol.slaDays}
                      </td>
                      <td className="py-3 px-2 text-[#736357]">{pol.roles}</td>
                      <td className="py-3 px-2 text-[#2A1810]">{pol.fee}</td>
                      <td className="py-3 px-2 font-medium text-[#EC642A]">
                        {pol.escalation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Centralized Statutory Policy Engine Card (APH 2024–27 Rules & Timelines) */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0ECE6] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#2A1810] flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#EC642A]" />
                  <span>
                    Centralized Statutory Policies &amp; Rule Engine
                    (statutory_policies)
                  </span>
                </h2>
                <p className="text-xs text-[#736357]">
                  Externalized statutory timelines, escalation thresholds, and
                  ratios driven by APH 2024–2027 clauses.
                </p>
              </div>
              <span className="rounded bg-[#EC642A]/10 px-2 py-0.5 text-xs font-bold text-[#EC642A] border border-[#EC642A]/30">
                {statutoryPolicies.length} Statutory Rules Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">POLICY PARAMETER / NAME</th>
                    <th className="py-3 px-2">APH GOVERNING CLAUSE</th>
                    <th className="py-3 px-2">APPLICATION TYPE</th>
                    <th className="py-3 px-2">DEADLINE / THRESHOLD</th>
                    <th className="py-3 px-2">APPROVED BY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {statutoryPolicies.map((sp) => (
                    <tr
                      key={sp.id}
                      className="hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="font-bold text-[#2A1810]">
                          {sp.parameterName}
                        </div>
                        <div className="font-mono text-[10px] text-[#8A7D75]">
                          {sp.parameterKey}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="rounded bg-[#F5F2EB] px-1.5 py-0.5 text-[10px] font-mono text-[#642D0A]">
                          {sp.sourceClause}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-[#736357]">
                        {sp.applicationType}
                      </td>
                      <td className="py-3 px-2 font-bold text-[#EC642A]">
                        {sp.deadlineDays > 0
                          ? `${sp.deadlineDays} Days`
                          : String(sp.thresholdValue || "N/A")}
                      </td>
                      <td className="py-3 px-2 text-[11px] text-[#736357]">
                        {sp.approvedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Publish Policy Update Modal */}
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
                    Publish Statutory Policy Parameter
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded p-1 text-[#736357] hover:bg-neutral-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handlePublishPolicy} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Statutory Gate / Stage Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stage 5: Autonomous Affiliation Inspection"
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                        SLA Target
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 10 Working Days"
                        value={slaDays}
                        onChange={(e) => setSlaDays(e.target.value)}
                        className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                        Statutory Fee
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ₹50,000"
                        value={fee}
                        onChange={(e) => setFee(e.target.value)}
                        className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Mandatory Authorized Roles
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bureau Head + University Nominee"
                      value={roles}
                      onChange={(e) => setRoles(e.target.value)}
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Escalation Thresholds
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. L1: 10d · L2: 15d · L3: 20d"
                      value={escalation}
                      onChange={(e) => setEscalation(e.target.value)}
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      APH Handbook Clause Reference
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. APH 2024-27 Clause 4.8(b)"
                      value={referenceClause}
                      onChange={(e) => setReferenceClause(e.target.value)}
                      className="w-full rounded border border-[#E5E0D8] bg-white p-2 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                    />
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
                      Publish to APH Matrix →
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
