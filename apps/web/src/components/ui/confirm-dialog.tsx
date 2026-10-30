'use client';

import React, { useEffect, useState } from 'react';
import { Scale, X } from 'lucide-react';
import { useApp } from '@/lib/app-context';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  targetEntityLabel: string;
  actionDescription: string;
  onConfirm: (mandatoryRationale: string) => void;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  targetEntityLabel,
  actionDescription,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useApp();
  const [reason, setReason] = useState('');
  const minChars = 15;
  const isReasonValid = reason.trim().length >= minChars;

  useEffect(() => {
    if (!open) {
      setReason('');
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/45 p-4"
    >
      <div className="w-full max-w-lg rounded-sm border border-border bg-surface-raised shadow-overlay">
        <div className="flex items-center justify-between border-b border-border bg-surface-sunken px-4 py-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-brand" aria-hidden="true" />
            <h2
              id="confirm-dialog-title"
              className="font-serif text-base font-bold text-text-primary"
            >
              {title || t.confirmActionTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancel}
            className="rounded-xs border border-transparent p-1 text-text-muted hover:border-border hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isReasonValid) return;
            onConfirm(reason.trim());
            onClose();
          }}
          className="p-4 space-y-4"
        >
          <div className="rounded-xs border border-border bg-surface p-3 text-xs">
            <div className="tabular-nums-data font-semibold text-text-primary">
              Target Dossier: {targetEntityLabel}
            </div>
            <p className="mt-1 text-text-muted">{actionDescription}</p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="statutory-rationale-input"
              className="block text-xs font-semibold text-text-primary"
            >
              {t.mandatoryReasonLabel} <span className="text-sla-overdue">*</span>
            </label>
            <textarea
              id="statutory-rationale-input"
              rows={4}
              required
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.mandatoryReasonPlaceholder}
              className="w-full rounded-xs border border-border bg-surface p-2.5 text-xs text-text-primary placeholder:text-text-muted"
            />
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span>{t.mandatoryReasonHelper}</span>
              <span className="tabular-nums-data font-medium">
                {reason.trim().length}/{minChars} min
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xs border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-sunken"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={!isReasonValid}
              className="rounded-xs border border-brand bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-on transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t.confirmSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

