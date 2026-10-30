'use client';

import React from 'react';
import {
  FileEdit,
  Send,
  SearchCheck,
  AlertOctagon,
  CheckCircle2,
  CalendarClock,
  ClipboardCheck,
  Scale,
  BadgeCheck,
  XCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app-context';

export type StatusVariant =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_SCRUTINY'
  | 'SCRUTINY_DEFICIENT'
  | 'SCRUTINY_VERIFIED'
  | 'EVC_SCHEDULED'
  | 'EVC_IN_PROGRESS'
  | 'EVC_COMPLETED'
  | 'SAC_HEARING_SCHEDULED'
  | 'SAC_RECOMMENDED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING'
  | 'VERIFIED'
  | 'OVERDUE'
  | 'WAIVED_BY_AUTHORITY';

interface StatusChipProps {
  status: StatusVariant;
  customLabel?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    bgClass: string;
  }
> = {
  DRAFT: {
    icon: FileEdit,
    colorClass: 'text-text-muted border-border',
    bgClass: 'bg-surface-sunken',
  },
  SUBMITTED: {
    icon: Send,
    colorClass: 'text-info border-info/40',
    bgClass: 'bg-surface-raised',
  },
  UNDER_SCRUTINY: {
    icon: SearchCheck,
    colorClass: 'text-highlight border-highlight/45',
    bgClass: 'bg-surface-raised',
  },
  SCRUTINY_DEFICIENT: {
    icon: AlertOctagon,
    colorClass: 'text-sla-overdue border-sla-overdue/45',
    bgClass: 'bg-surface-raised',
  },
  SCRUTINY_VERIFIED: {
    icon: CheckCircle2,
    colorClass: 'text-sla-on-track border-sla-on-track/45',
    bgClass: 'bg-surface-raised',
  },
  EVC_SCHEDULED: {
    icon: CalendarClock,
    colorClass: 'text-info border-info/45',
    bgClass: 'bg-surface-raised',
  },
  EVC_IN_PROGRESS: {
    icon: Clock,
    colorClass: 'text-sla-due-soon border-sla-due-soon/45',
    bgClass: 'bg-surface-raised',
  },
  EVC_COMPLETED: {
    icon: ClipboardCheck,
    colorClass: 'text-sla-on-track border-sla-on-track/45',
    bgClass: 'bg-surface-raised',
  },
  SAC_HEARING_SCHEDULED: {
    icon: Scale,
    colorClass: 'text-highlight border-highlight/45',
    bgClass: 'bg-surface-raised',
  },
  SAC_RECOMMENDED: {
    icon: CheckCircle2,
    colorClass: 'text-brand border-brand/45',
    bgClass: 'bg-surface-raised',
  },
  APPROVED: {
    icon: BadgeCheck,
    colorClass: 'text-sla-on-track border-sla-on-track/50',
    bgClass: 'bg-surface-raised',
  },
  REJECTED: {
    icon: XCircle,
    colorClass: 'text-sla-overdue border-sla-overdue/50',
    bgClass: 'bg-surface-raised',
  },
  PENDING: {
    icon: Clock,
    colorClass: 'text-sla-due-soon border-sla-due-soon/45',
    bgClass: 'bg-surface-raised',
  },
  VERIFIED: {
    icon: BadgeCheck,
    colorClass: 'text-sla-on-track border-sla-on-track/45',
    bgClass: 'bg-surface-raised',
  },
  OVERDUE: {
    icon: ShieldAlert,
    colorClass: 'text-sla-overdue border-sla-overdue/50',
    bgClass: 'bg-surface-raised',
  },
  WAIVED_BY_AUTHORITY: {
    icon: Scale,
    colorClass: 'text-sla-paused border-sla-paused/45',
    bgClass: 'bg-surface-sunken',
  },
};

export function StatusChip({ status, customLabel, className }: StatusChipProps) {
  const { t } = useApp();
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = cfg.icon;
  const label = customLabel || t.statuses[status] || status;

  return (
    <span
      role="status"
      aria-label={`Status: ${label}`}
      className={cn(
        'motif-file-tab inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-xs font-medium leading-snug tracking-tight whitespace-nowrap',
        cfg.bgClass,
        cfg.colorClass,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

