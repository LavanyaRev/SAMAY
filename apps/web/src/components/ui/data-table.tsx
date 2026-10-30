'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app-context';
import { EmptyState } from './empty-state';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  sortable?: boolean;
  mono?: boolean;
  defaultHidden?: boolean;
  cell?: (row: T) => React.ReactNode;
  csvValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  title?: string;
  subtitle?: string;
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchKeys?: (keyof T)[];
  statusFilterKey?: keyof T;
  statusFilterOptions?: { value: string; label: string }[];
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  exportFilename?: string;
  headerActions?: React.ReactNode;
  className?: string;
}

/**
 * Deterministic CSV export hook for regulatory registers
 */
export function useCsvExport<T>(
  columns: DataTableColumn<T>[],
  rows: T[],
  filename = 'samay-regulatory-export.csv',
) {
  return useCallback(() => {
    const headers = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
    const lines = rows.map((row) =>
      columns
        .map((col) => {
          const raw = col.csvValue
            ? col.csvValue(row)
            : col.accessorKey
              ? String(row[col.accessorKey] ?? '')
              : '';
          return `"${String(raw).replace(/"/g, '""')}"`;
        })
        .join(','),
    );
    const csvContent = [headers, ...lines].join('\n');
    if (typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    return csvContent;
  }, [columns, rows, filename]);
}

export function DataTable<T>({
  title,
  subtitle,
  columns,
  data,
  rowKey,
  searchKeys = [],
  statusFilterKey,
  statusFilterOptions = [],
  pageSizeOptions = [5, 10, 20],
  defaultPageSize = 5,
  exportFilename = 'samay-statutory-register.csv',
  headerActions,
  className,
}: DataTableProps<T>) {
  const { t } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortColId, setSortColId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hiddenColIds, setHiddenColIds] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)),
  );
  const [showColMenu, setShowColMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenColIds.has(c.id)),
    [columns, hiddenColIds],
  );

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (statusFilter !== 'ALL' && statusFilterKey) {
        if (String(row[statusFilterKey]) !== statusFilter) {
          return false;
        }
      }
      if (searchQuery.trim() !== '' && searchKeys.length > 0) {
        const q = searchQuery.toLowerCase();
        const matches = searchKeys.some((k) =>
          String(row[k] ?? '')
            .toLowerCase()
            .includes(q),
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [data, statusFilter, statusFilterKey, searchQuery, searchKeys]);

  const sortedData = useMemo(() => {
    if (!sortColId) return filteredData;
    const col = columns.find((c) => c.id === sortColId);
    if (!col || !col.accessorKey) return filteredData;
    const key = col.accessorKey;

    return [...filteredData].sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (va === vb) return 0;
      const cmp = String(va ?? '').localeCompare(String(vb ?? ''), undefined, {
        numeric: true,
      });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortColId, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  const triggerCsvExport = useCsvExport(visibleColumns, sortedData, exportFilename);

  const handleSort = (colId: string) => {
    if (sortColId === colId) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColId(colId);
      setSortDir('asc');
    }
  };

  const toggleColumnVisibility = (colId: string) => {
    setHiddenColIds((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) {
        next.delete(colId);
      } else if (visibleColumns.length > 2) {
        next.add(colId);
      }
      return next;
    });
  };

  return (
    <section
      aria-label={title || 'Regulatory Data Table'}
      className={cn('rounded-sm border border-border bg-surface-raised', className)}
    >
      {/* Toolbar Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-border bg-surface-sunken px-3.5 py-2.5 lg:flex-row lg:items-center">
        <div>
          {title && (
            <h2 className="font-serif text-sm font-bold text-text-primary">{title}</h2>
          )}
          {subtitle && <p className="text-[11px] text-text-muted">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {searchKeys.length > 0 && (
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label={t.filterPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t.filterPlaceholder}
                className="h-7 w-52 rounded-xs border border-border bg-surface pl-8 pr-2.5 text-xs text-text-primary placeholder:text-text-muted"
              />
            </div>
          )}

          {statusFilterKey && statusFilterOptions.length > 0 && (
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-7 rounded-xs border border-border bg-surface px-2 text-xs text-text-primary"
            >
              <option value="ALL">{t.allStatuses}</option>
              {statusFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Column visibility dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColMenu((prev) => !prev)}
              aria-expanded={showColMenu}
              aria-label={t.columnsToggle}
              className="inline-flex h-7 items-center gap-1.5 rounded-xs border border-border bg-surface px-2.5 text-xs font-medium text-text-primary hover:bg-surface-raised"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <span>{t.columnsToggle}</span>
            </button>

            {showColMenu && (
              <div
                role="menu"
                className="absolute right-0 z-30 mt-1 w-48 rounded-xs border border-border bg-surface-raised p-2 shadow-overlay"
              >
                <div className="mb-1 border-b border-border pb-1 text-[11px] font-semibold text-text-muted">
                  Toggle Table Columns
                </div>
                {columns.map((col) => {
                  const checked = !hiddenColIds.has(col.id);
                  return (
                    <label
                      key={col.id}
                      className="flex cursor-pointer items-center gap-2 rounded-xs px-1.5 py-1 text-xs text-text-primary hover:bg-surface-sunken"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleColumnVisibility(col.id)}
                        className="accent-brand"
                      />
                      <span className="truncate">{col.header}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* CSV Export button */}
          <button
            type="button"
            onClick={triggerCsvExport}
            className="inline-flex h-7 items-center gap-1.5 rounded-xs border border-border bg-surface px-2.5 text-xs font-medium text-text-primary hover:bg-surface-raised"
          >
            <Download className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <span>{t.exportCsv}</span>
          </button>

          {headerActions}
        </div>
      </div>

      {/* Table Body */}
      {paginatedRows.length === 0 ? (
        <div className="p-4">
          <EmptyState
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            actionLabel="Reset Filters"
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-sunken text-text-muted">
                {visibleColumns.map((col) => {
                  const isSorted = sortColId === col.id;
                  return (
                    <th
                      key={col.id}
                      scope="col"
                      className="border-r border-border last:border-r-0 px-3 py-2 font-semibold whitespace-nowrap"
                    >
                      {col.sortable && col.accessorKey ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.id)}
                          className="inline-flex items-center gap-1 text-left font-semibold text-text-primary hover:text-brand"
                        >
                          <span>{col.header}</span>
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-brand" aria-hidden="true" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-brand" aria-hidden="true" />
                            )
                          ) : (
                            <ArrowUpDown
                              className="h-3 w-3 text-text-muted opacity-70"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      ) : (
                        <span className="text-text-primary">{col.header}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="bg-surface-raised transition-colors hover:bg-surface"
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        'border-r border-border last:border-r-0 px-3 py-2 align-middle text-text-primary',
                        col.mono && 'tabular-nums-data',
                      )}
                    >
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                          ? String(row[col.accessorKey] ?? '—')
                          : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-sunken px-3.5 py-2 text-xs text-text-muted">
        <div className="tabular-nums-data flex items-center gap-2">
          <span>
            {t.showingRows}{' '}
            <strong className="font-semibold text-text-primary">
              {sortedData.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, sortedData.length)}
            </strong>{' '}
            of <strong className="font-semibold text-text-primary">{sortedData.length}</strong>
          </span>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-xs border border-border bg-surface px-1.5 py-0.5 text-[11px] text-text-primary"
          >
            {pageSizeOptions.map((sz) => (
              <option key={sz} value={sz}>
                {sz} / page
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-xs border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary hover:bg-surface-raised disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.previousPage}</span>
          </button>
          <span className="tabular-nums-data px-2 font-medium text-text-primary">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 rounded-xs border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary hover:bg-surface-raised disabled:opacity-40"
          >
            <span>{t.nextPage}</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

