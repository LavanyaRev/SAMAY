"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { SlaBadge, type SlaState } from "./sla-badge";

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  subtext?: string;
  trend?: "positive" | "warning" | "neutral";
  slaState?: SlaState;
  slaDetail?: string;
  codeTag?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  sublabel,
  subtext,
  slaState,
  slaDetail,
  codeTag,
  className,
}: KpiCardProps) {
  const effectiveSub = sublabel || subtext;
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-sm border border-border bg-surface-raised p-3.5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        {codeTag && (
          <span className="tabular-nums-data rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-muted">
            {codeTag}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="tabular-nums-data font-serif text-2xl font-bold tracking-tight text-text-primary">
          {value}
        </span>
        {slaState && <SlaBadge state={slaState} detail={slaDetail} />}
      </div>

      {effectiveSub && (
        <p className="mt-1.5 border-t border-border pt-1.5 text-[11px] text-text-muted">
          {effectiveSub}
        </p>
      )}
    </div>
  );
}
