'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app-context';
import { AuditSeal } from './audit-seal';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  cycleLabel?: string;
  showAuditSeal?: boolean;
  auditRole?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondarySlot?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  cycleLabel,
  showAuditSeal = false,
  auditRole = 'STATUTORY_AUTHORITY',
  primaryActionLabel,
  onPrimaryAction,
  secondarySlot,
  className,
}: PageHeaderProps) {
  const { t } = useApp();

  return (
    <header
      className={cn(
        'flex flex-col justify-between gap-4 border-b border-border bg-surface-raised p-4 lg:flex-row lg:items-center',
        className,
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular-nums-data rounded-xs border border-border bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {cycleLabel || t.academicCycle}
          </span>
          <span className="text-xs font-medium text-text-muted">{t.aicteCouncil}</span>
        </div>
        <h1 className="font-serif text-xl font-bold tracking-tight text-text-primary lg:text-2xl">
          {title}
        </h1>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        {showAuditSeal && <AuditSeal authorityRole={auditRole} />}
        {secondarySlot}
        {primaryActionLabel && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-2 rounded-sm border border-brand bg-brand px-3.5 py-2 text-xs font-semibold text-brand-on transition-colors hover:bg-brand-hover"
          >
            {primaryActionLabel}
          </button>
        )}
      </div>
    </header>
  );
}

