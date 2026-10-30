'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app-context';

export type SlaState = 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE' | 'PAUSED';

interface SlaBadgeProps {
  state: SlaState;
  detail?: string;
  className?: string;
}

const SLA_CONFIG: Record<
  SlaState,
  {
    icon: React.ComponentType<{ className?: string }>;
    styleClass: string;
    dotClass: string;
  }
> = {
  ON_TRACK: {
    icon: CheckCircle2,
    styleClass: 'text-sla-on-track border-sla-on-track/45 bg-surface-raised',
    dotClass: 'bg-sla-on-track',
  },
  DUE_SOON: {
    icon: Clock,
    styleClass: 'text-sla-due-soon border-sla-due-soon/45 bg-surface-raised',
    dotClass: 'bg-sla-due-soon',
  },
  OVERDUE: {
    icon: AlertTriangle,
    styleClass: 'text-sla-overdue border-sla-overdue/55 bg-surface-raised font-semibold',
    dotClass: 'bg-sla-overdue',
  },
  PAUSED: {
    icon: PauseCircle,
    styleClass: 'text-sla-paused border-sla-paused/45 bg-surface-sunken',
    dotClass: 'bg-sla-paused',
  },
};

export function SlaBadge({ state, detail, className }: SlaBadgeProps) {
  const { t } = useApp();
  const cfg = SLA_CONFIG[state];
  const Icon = cfg.icon;
  const label = t.sla[state];

  return (
    <span
      role="status"
      aria-label={`SLA ${label}${detail ? ` (${detail})` : ''}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-xs leading-snug whitespace-nowrap',
        cfg.styleClass,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
      {detail && (
        <span className="tabular-nums-data border-l border-current/25 pl-1.5 text-[11px] opacity-95">
          {detail}
        </span>
      )}
    </span>
  );
}

