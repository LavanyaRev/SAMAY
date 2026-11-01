"use client";

import React, { useMemo } from "react";
import {
  analyzeDocumentAgainstAph,
  type AphClauseIntelligenceResult,
} from "@samay/shared";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Clock,
  UserCheck,
  FileText,
  Hash,
} from "lucide-react";

interface AphClauseIntelligenceProps {
  documentName: string;
  documentTypeHint?: string;
  sha256Hash?: string;
  compact?: boolean;
}

export function AphClauseIntelligence({
  documentName,
  documentTypeHint,
  sha256Hash,
  compact = false,
}: AphClauseIntelligenceProps) {
  const analysis: AphClauseIntelligenceResult = useMemo(() => {
    return analyzeDocumentAgainstAph({
      documentName,
      documentTypeHint,
      sha256Hash,
    });
  }, [documentName, documentTypeHint, sha256Hash]);

  return (
    <div
      className="rounded-lg border border-[#E5E0D8] bg-white p-4 shadow-2xs space-y-3 text-xs"
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0ECE6] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#EC642A]/10 text-[#EC642A]">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-bold text-[#2A1810] flex items-center gap-2">
              <span>APH Clause Intelligence</span>
              <span className="rounded bg-[#EC642A]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#EC642A]">
                APH 2024–27
              </span>
            </div>
            <div className="text-[11px] text-[#736357]">
              {analysis.aphChapter}
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded bg-[#F5F2EB] px-2 py-0.5 text-[10px] font-mono text-[#642D0A]">
          <FileText className="h-3 w-3 text-[#EC642A]" />
          <span className="font-bold">{analysis.aphClause}</span>
        </div>
      </div>

      {/* Requirement Addressed */}
      <div className="space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
          Statutory Requirement Addressed
        </div>
        <div className="font-medium text-[#2A1810]">
          {analysis.regulatoryRequirement}
        </div>
      </div>

      {/* Structural Completeness Checklist */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
          Completeness &amp; Structural Validity Check
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {analysis.completenessChecks.map((check, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded bg-[#FAF8F5] p-2 border border-[#F0ECE6]"
            >
              {check.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
              )}
              <div className="min-w-0 flex-1 leading-tight">
                <div className="font-semibold text-[#2A1810]">
                  {check.check}
                </div>
                <div className="text-[10px] text-[#736357] mt-0.5">
                  {check.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata: Verifying Official & Statutory Policy Deadline */}
      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#F0ECE6]">
          <div className="flex items-center gap-2 text-[11px] text-[#736357]">
            <UserCheck className="h-3.5 w-3.5 text-[#EC642A] shrink-0" />
            <div>
              <span className="font-semibold text-[#2A1810]">Verifier: </span>
              <span>{analysis.responsibleVerifyingOfficial}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#736357]">
            <Clock className="h-3.5 w-3.5 text-[#EC642A] shrink-0" />
            <div>
              <span className="font-semibold text-[#2A1810]">Policy SLA: </span>
              <span>{analysis.governingPolicyDeadline}</span>
            </div>
          </div>
        </div>
      )}

      {/* Cryptographic & Simulation Honesty Disclaimers */}
      <div className="pt-2 border-t border-[#F0ECE6] space-y-1 text-[10px] text-[#8A7D75] leading-normal">
        <div className="flex items-center gap-1.5 text-emerald-700">
          <ShieldCheck className="h-3 w-3 shrink-0" />
          <span>
            <strong>Simulated Government-Scan Demonstration:</strong> ClamAV API
            sandbox mock; production deployment requires air-gapped gateway.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[#736357]">
          <Hash className="h-3 w-3 shrink-0 text-[#EC642A]" />
          <span>
            <strong>Cryptographic Honesty:</strong> Client-side file
            fingerprinting and sequential integrity simulation (append-only
            ledger design). Non-repudiation requires signed PKI timestamping.
          </span>
        </div>
        <div className="rounded bg-[#FFF8E1] p-1.5 text-[#7A5B00] border border-[#FFE082] text-[10px]">
          <strong>ADVISORY:</strong> This automated mapping assists
          institutional compliance under APH 2024–27. Final statutory
          verification rests solely with the Authorized Officer / Executive
          Committee.
        </div>
      </div>
    </div>
  );
}
