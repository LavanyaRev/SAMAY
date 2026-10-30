'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { LifecycleApplication } from '@/lib/api-client';
import { StatusChip } from './status-chip';

interface ConflictDialogProps {
  open: boolean;
  message: string;
  latestApplication: LifecycleApplication | null;
  onReloadLatest: (latest: LifecycleApplication) => void;
  onClose: () => void;
}

export function ConflictDialog({
  open,
  message,
  latestApplication,
  onReloadLatest,
  onClose,
}: ConflictDialogProps) {
  if (!open || !latestApplication) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
      data-testid="optimistic-conflict-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-sm border border-accent bg-surface-raised p-5 shadow-raised">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border border-accent bg-surface-sunken text-accent">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
              HTTP 409 • OPTIMISTIC LOCKING CONFLICT DETECTED
            </div>
            <h2
              id="conflict-dialog-title"
              className="mt-0.5 font-serif text-base font-bold text-text-primary"
            >
              Another Officer Acted First on {latestApplication.applicationRef}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
              {message} Your action was safely aborted so no statutory audit record
              was overwritten.
            </p>
          </div>
        </div>

        {/* Latest Committed State Snapshot */}
        <div className="mt-4 rounded-xs border border-border bg-surface p-3.5 text-xs">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Latest Committed Application State
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-2.5">
            <div>
              <dt className="text-[11px] text-text-muted">Current Stage</dt>
              <dd
                className="mt-0.5 font-mono font-bold text-brand"
                data-testid="conflict-latest-stage"
              >
                {latestApplication.stage}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-text-muted">Current Status</dt>
              <dd className="mt-0.5">
                <StatusChip status={latestApplication.status} />
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-text-muted">Pinned Version</dt>
              <dd
                className="mt-0.5 font-mono font-bold text-text-primary"
                data-testid="conflict-latest-version"
              >
                v{latestApplication.version}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-text-muted">Updated By</dt>
              <dd className="mt-0.5 font-medium text-text-primary">
                {latestApplication.lastActorName}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xs border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-sunken"
          >
            Dismiss
          </button>
          <button
            type="button"
            data-testid="conflict-reload-btn"
            onClick={() => onReloadLatest(latestApplication)}
            className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-on hover:bg-brand-hover"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Load Latest State (v{latestApplication.version})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

