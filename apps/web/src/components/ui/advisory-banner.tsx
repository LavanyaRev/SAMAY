"use client";

import React from "react";
import { FileText, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";

interface AdvisoryBannerProps {
  ruleId: string;
  aphClause?: string;
  title: string;
  rationale: string;
  confidenceScore?: number;
  sourceDataSummary?: string;
  className?: string;
}

/**
 * Regulatory Advisory Banner
 * Complies with AGENTS.md Section 2.1 (explicit ADVISORY tag + transparent rationale)
 * and anti-generic mandate: plain 1px bordered panel labelled "AI suggestion, verify before use",
 * zero sparkle or magic-wand styling.
 */
export function AdvisoryBanner({
  ruleId,
  aphClause = "APH 2024-27 • TODO(APH-VERIFY)",
  title,
  rationale,
  confidenceScore,
  sourceDataSummary,
  className,
}: AdvisoryBannerProps) {
  const { t } = useApp();

  return (
    <aside
      aria-label={`${t.advisoryLabel}: ${t.advisoryVerifyNotice}`}
      className={cn(
        "rounded-sm border border-border bg-surface-sunken p-3.5 text-text-primary",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-xs border border-highlight bg-surface-raised px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-highlight">
            <Scale className="h-3 w-3 shrink-0" aria-hidden="true" />
            {t.advisoryLabel}
          </span>
          <span className="text-xs font-semibold text-text-primary">
            {t.advisoryVerifyNotice}
          </span>
        </div>
        <div className="tabular-nums-data flex items-center gap-2 text-xs text-text-muted">
          <span>Rule: {ruleId}</span>
          <span>•</span>
          <span>{aphClause}</span>
          {typeof confidenceScore === "number" && (
            <>
              <span>•</span>
              <span>Compliance Score: {confidenceScore}/100</span>
            </>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-start gap-2.5">
        <FileText
          className="mt-0.5 h-4 w-4 shrink-0 text-text-muted"
          aria-hidden="true"
        />
        <div className="space-y-1 text-xs leading-relaxed">
          <p className="font-semibold text-text-primary">{title}</p>
          <p className="text-text-muted">{rationale}</p>
          {sourceDataSummary && (
            <p className="tabular-nums-data pt-0.5 text-[11px] text-text-muted">
              Evaluated Applicant Evidence: {sourceDataSummary}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
