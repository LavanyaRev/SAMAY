'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileCheck2, ShieldCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app-context';

export interface UploadedRegulatoryFile {
  name: string;
  sizeBytes: number;
  sha256Preview: string;
  scanStatus: 'CLEAN' | 'PENDING';
}

interface FileDropzoneProps {
  label?: string;
  defaultFiles?: UploadedRegulatoryFile[];
  onFileSelected?: (file: UploadedRegulatoryFile) => void;
  className?: string;
}

export function FileDropzone({
  label,
  defaultFiles = [
    {
      name: 'Affidavit_Cadre_Compliance_AY2026_27_Signed.pdf',
      sizeBytes: 1482910,
      sha256Preview: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      scanStatus: 'CLEAN',
    },
  ],
  onFileSelected,
  className,
}: FileDropzoneProps) {
  const { t } = useApp();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedRegulatoryFile[]>(defaultFiles);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const f = fileList[0];
    const mockUploaded: UploadedRegulatoryFile = {
      name: f.name,
      sizeBytes: f.size || 842100,
      sha256Preview: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      scanStatus: 'CLEAN',
    };
    setFiles((prev) => [mockUploaded, ...prev]);
    onFileSelected?.(mockUploaded);
  };

  return (
    <div className={cn('space-y-2.5', className)}>
      {label && (
        <div className="text-xs font-semibold text-text-primary">{label}</div>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label={t.fileDropzonePrompt}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed px-4 py-5 text-center transition-colors',
          isDragging
            ? 'border-brand bg-surface-raised'
            : 'border-border bg-surface-sunken hover:border-brand/60 hover:bg-surface-raised',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload className="h-4 w-4 text-brand" aria-hidden="true" />
        <p className="mt-2 text-xs font-medium text-text-primary">
          {t.fileDropzonePrompt}
        </p>
        <p className="mt-0.5 text-[11px] text-text-muted">
          {t.fileDropzoneConstraints}
        </p>
      </div>

      {files.length > 0 && (
        <ul className="divide-y divide-border rounded-sm border border-border bg-surface-raised">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck2 className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-text-primary">{file.name}</p>
                  <p className="tabular-nums-data truncate text-[11px] text-text-muted">
                    {(file.sizeBytes / 1024).toFixed(1)} KB • SHA-256:{' '}
                    {file.sha256Preview.slice(0, 16)}…
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-[11px] font-medium',
                  file.scanStatus === 'CLEAN'
                    ? 'border-sla-on-track/45 text-sla-on-track bg-surface'
                    : 'border-sla-due-soon/45 text-sla-due-soon bg-surface',
                )}
              >
                {file.scanStatus === 'CLEAN' ? (
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Clock className="h-3 w-3" aria-hidden="true" />
                )}
                <span>ClamAV: {file.scanStatus}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

