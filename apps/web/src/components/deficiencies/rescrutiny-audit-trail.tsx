"use client";

import React from "react";
import { History, ShieldCheck } from "lucide-react";
import type { GranularDeficiencyItem } from "@samay/shared";

interface ReScrutinyAuditTrailProps {
  deficiency: GranularDeficiencyItem;
}

export function ReScrutinyAuditTrail({
  deficiency,
}: ReScrutinyAuditTrailProps) {
  const history = deficiency.historyTrail || [];

  return (
    <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F0ECE6] gap-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#EC642A]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#2A1810]">
            Re-Scrutiny Audit Trail · {deficiency.deficiencyId}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#8A7D75]">
            {deficiency.aphClause || "APH 2024-27 Clause 2.9"}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              deficiency.verificationStatus === "VERIFIED_ACCEPTED"
                ? "bg-[#E8F5E9] text-[#2E7D32]"
                : deficiency.verificationStatus === "SUBMITTED_UNDER_REVIEW"
                  ? "bg-[#FFF9E6] text-[#8C6D1F]"
                  : "bg-[#FFEBE5] text-[#C23B17]"
            }`}
          >
            {deficiency.verificationStatus.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="rounded bg-[#FAFAFA] p-3 border border-[#E5E0D8] text-xs">
        <div className="font-semibold text-[#2A1810]">
          Identified Statutory Non-Compliance:
        </div>
        <p className="text-[#736357] mt-0.5">{deficiency.description}</p>
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#8A7D75]">
          <span>Identified: {deficiency.dateIdentified}</span>
          <span className="font-semibold text-[#EC642A]">
            Response Deadline: {deficiency.responseDeadline}
          </span>
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="space-y-4 pt-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
          Revision &amp; Verification History Log
        </div>

        {history.map((cycle, idx) => (
          <div
            key={cycle.id || idx}
            className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-[#E5E0D8] last:before:hidden space-y-2.5 pb-3"
          >
            {/* Timeline bullet */}
            <div className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-[#EC642A] bg-white flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-[#EC642A]" />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#2A1810]">
                Cycle #{cycle.cycleNumber} Revision
              </span>
              <span className="text-[#8A7D75] font-mono">
                {cycle.timestamp}
              </span>
            </div>

            {/* Stage 1: Observations */}
            <div className="rounded border border-[#F3C39E] bg-[#FFFBF7] p-2.5 text-xs">
              <span className="font-bold text-[#2A1810]">
                1. Scrutiny Observation:
              </span>
              <p className="text-[#736357] mt-0.5">
                {cycle.originalObservations}
              </p>
            </div>

            {/* Stage 2: Institution Response */}
            <div className="rounded border border-[#E5E0D8] bg-white p-2.5 text-xs">
              <span className="font-bold text-[#2A1810]">
                2. Institution Submission &amp; Justification:
              </span>
              <p className="text-[#736357] mt-0.5">
                {cycle.institutionResponse}
              </p>

              {cycle.revisedDocumentName !== "None" && (
                <div className="mt-2 flex items-center justify-between rounded bg-[#FAFAFA] p-2 border border-[#E5E0D8] text-[11px]">
                  <span className="font-mono text-[#2A1810] font-semibold">
                    {cycle.revisedDocumentName}
                  </span>
                  <div className="flex items-center gap-1.5 text-[#2E7D32]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span className="font-mono text-[10px]">
                      SHA-256: {cycle.revisedDocumentSha256.slice(0, 16)}...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Stage 3: Re-Scrutiny Findings */}
            <div className="rounded border border-[#C8E6C9] bg-[#E8F5E9] p-2.5 text-xs text-[#1B5E20]">
              <div className="flex items-center justify-between font-bold">
                <span>3. Re-Scrutiny Verification:</span>
                <span className="text-[10px] font-normal">
                  {cycle.officerSignoff}
                </span>
              </div>
              <p className="mt-0.5">{cycle.reScrutinyObservations}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Closure info */}
      {deficiency.closureDate && (
        <div className="flex items-center gap-2 rounded bg-[#E8F5E9] p-3 text-xs text-[#2E7D32] border border-[#C8E6C9]">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>
            Statutorily Closed &amp; Verified on {deficiency.closureDate}.
            Recorded in immutable audit ledger.
          </span>
        </div>
      )}
    </div>
  );
}
