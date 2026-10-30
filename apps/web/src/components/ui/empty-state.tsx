'use client';

import React from 'react';
import { FolderSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app-context';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const { t } = useApp();

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-surface-sunken px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xs border border-border bg-surface-raised text-text-muted">
        <FolderSearch className="h-4 w-4" aria-hidden="true" />
      </div>
      <h3 className="mt-3 font-serif text-sm font-semibold text-text-primary">
        {title || t.emptyStateDefaultTitle}
      </h3>
      <p className="mt-1 max-w-md text-xs text-text-muted">
        {description || t.emptyStateDefaultDesc}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center rounded-xs border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

