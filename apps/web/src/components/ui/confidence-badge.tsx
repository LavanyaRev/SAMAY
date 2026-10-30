"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export interface ExtractionResultPayload {
  confidenceScore?: number; // 0..1
  extractedFields?: Record<string, string | number | null>;
  advisoryLabel?: "ADVISORY";
}

export interface ConfidenceBadgeProps {
  extractionResult?: ExtractionResultPayload | null;
  className?: string;
}

/**
 * Extension point for the AI phase (`extraction_result` JSON field).
 * Displays an ADVISORY confidence badge when `extractionResult` metadata is present.
 * Contains no autonomous AI execution logic.
 */
export function ConfidenceBadge({
  extractionResult,
  className = "",
}: ConfidenceBadgeProps) {
  if (!extractionResult || extractionResult.confidenceScore === undefined) {
    return (
      <span
        data-testid="confidence-badge-empty"
        className={`inline-flex items-center gap-1 rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-muted ${className}`}
      >
        <span>EXTRACTION: N/A (MANUAL)</span>
      </span>
    );
  }

  const pct = Math.round(extractionResult.confidenceScore * 100);
  const toneClass =
    pct >= 85
      ? "border-sla-ontrack/40 bg-surface text-sla-ontrack"
      : pct >= 65
        ? "border-sla-duesoon/40 bg-surface text-sla-duesoon"
        : "border-sla-overdue/40 bg-surface text-sla-overdue";

  return (
    <span
      data-testid="confidence-badge"
      title="Extension point for AI extraction_result (ADVISORY only)"
      className={`inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 font-mono text-[10px] font-bold ${toneClass} ${className}`}
    >
      <Sparkles className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      <span>ADVISORY CONFIDENCE: {pct}%</span>
    </span>
  );
}

