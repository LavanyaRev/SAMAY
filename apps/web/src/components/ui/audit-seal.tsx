"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";

interface AuditSealProps {
  ledgerHash?: string;
  timestamp?: string;
  authorityRole?: string;
  compact?: boolean;
  className?: string;
}

export function AuditSeal({
  ledgerHash = "SHA256:8f4c2e91...b73a10d4",
  timestamp = "2026-10-30 14:18 IST",
  authorityRole = "COMPETENT_AUTHORITY",
  compact = false,
  className,
}: AuditSealProps) {
  const { t } = useApp();

  return (
    <div
      role="region"
      aria-label={`${t.auditVerifiedSeal} ${ledgerHash}`}
      className={cn(
        "motif-audit-seal inline-flex items-center gap-2.5 bg-surface-raised px-3 py-1.5 text-accent",
        className,
      )}
    >
      <ShieldCheck
        className="h-4 w-4 shrink-0 text-accent"
        aria-hidden="true"
      />
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-2">
          <span className="font-serif text-xs font-bold uppercase tracking-wider text-accent">
            {t.auditVerifiedSeal}
          </span>
          {!compact && (
            <span className="tabular-nums-data border-l border-accent/35 pl-2 text-[11px] font-medium text-text-muted">
              {authorityRole}
            </span>
          )}
        </div>
        {!compact && (
          <div className="tabular-nums-data mt-0.5 flex items-center gap-2 text-[11px] text-text-muted">
            <span>{ledgerHash}</span>
            <span>•</span>
            <span>{timestamp}</span>
          </div>
        )}
      </div>
    </div>
  );
}
