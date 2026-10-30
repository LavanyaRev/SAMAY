'use client';

import React from 'react';
import { CheckCircle2, CircleDot, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusChip, type StatusVariant } from './status-chip';

export interface TimelineEventItem {
  id: string;
  stage: string;
  title: string;
  actor: string;
  actorRole: string;
  timestamp: string;
  status: StatusVariant;
  rationale: string;
  stateType: 'completed' | 'current' | 'upcoming';
}

interface TimelineProps {
  items: TimelineEventItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol
      aria-label="Statutory workflow timeline"
      className={cn('motif-timeline-rail ml-2 space-y-4 pl-5 py-1', className)}
    >
      {items.map((item) => {
        const NodeIcon =
          item.stateType === 'completed'
            ? CheckCircle2
            : item.stateType === 'current'
              ? CircleDot
              : Clock;

        const iconColor =
          item.stateType === 'completed'
            ? 'text-sla-on-track bg-surface-raised border-sla-on-track'
            : item.stateType === 'current'
              ? 'text-brand bg-surface-raised border-brand'
              : 'text-text-muted bg-surface-sunken border-border';

        return (
          <li key={item.id} className="relative">
            <span
              className={cn(
                'absolute -left-[29px] top-1 flex h-4 w-4 items-center justify-center rounded-xs border',
                iconColor,
              )}
              aria-hidden="true"
            >
              <NodeIcon className="h-3 w-3" />
            </span>

            <div className="rounded-sm border border-border bg-surface-raised p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums-data rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    {item.stage}
                  </span>
                  <h4 className="font-serif text-sm font-semibold text-text-primary">
                    {item.title}
                  </h4>
                </div>
                <StatusChip status={item.status} />
              </div>

              <p className="mt-2 text-xs leading-relaxed text-text-primary">{item.rationale}</p>

              <div className="tabular-nums-data mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted">
                <span>
                  Authority: <strong className="font-medium text-text-primary">{item.actor}</strong>{' '}
                  ({item.actorRole})
                </span>
                <time>{item.timestamp}</time>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

