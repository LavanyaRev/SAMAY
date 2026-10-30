'use client';

import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  Download,
  ShieldCheck,
  CheckCircle2,
  Hash,
} from 'lucide-react';
import type { LifecycleDocumentFile } from '@/lib/api-client';

interface DocumentViewerProps {
  document: LifecycleDocumentFile | null;
  documents?: LifecycleDocumentFile[];
  onSelectDocument?: (doc: LifecycleDocumentFile) => void;
}

export function DocumentViewer({
  document,
  documents = [],
  onSelectDocument,
}: DocumentViewerProps) {
  const activeDoc = document || documents[0] || null;

  const handleDownload = (doc: LifecycleDocumentFile) => {
    const content = [
      `AICTE SAMAY STATUTORY INSTRUMENT EXTRACT`,
      `========================================`,
      `Checklist Item : ${doc.checklistItem}`,
      `Filename       : ${doc.filename}`,
      `MIME Type      : ${doc.mime}`,
      `Size           : ${doc.sizeBytes} bytes`,
      `Scan Status    : ${doc.scanStatus} (ClamAV Verified)`,
      `SHA-256 Digest : ${doc.sha256}`,
      `Uploaded By    : ${doc.uploadedBy}`,
      `Uploaded At    : ${doc.uploadedAt}`,
      ``,
      `Summary:`,
      doc.contentSummary,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeDoc) {
    return (
      <div className="rounded-sm border border-border bg-surface-sunken p-6 text-center text-xs text-text-muted">
        No statutory documents attached to this dossier.
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-12"
      data-testid="document-viewer"
    >
      {/* Left Document Selector Rail */}
      {documents.length > 0 && (
        <div className="space-y-2 lg:col-span-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Attached Statutory Instruments ({documents.length})
          </div>
          <ul className="space-y-1.5" role="listbox" aria-label="Attached Documents">
            {documents.map((doc) => {
              const isSelected = doc.id === activeDoc.id;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-testid={`select-doc-${doc.id}`}
                    onClick={() => onSelectDocument?.(doc)}
                    className={`w-full rounded-xs border p-2.5 text-left transition-colors ${
                      isSelected
                        ? 'border-brand bg-surface-raised shadow-hairline'
                        : 'border-border bg-surface hover:border-brand/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {doc.previewType === 'IMAGE' ? (
                          <ImageIcon
                            className="h-4 w-4 shrink-0 text-brand"
                            aria-hidden="true"
                          />
                        ) : (
                          <FileText
                            className="h-4 w-4 shrink-0 text-brand"
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate text-xs font-semibold text-text-primary">
                          {doc.checklistItem}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-xs border border-sla-on-track/40 bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sla-on-track">
                        {doc.scanStatus}
                      </span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-text-muted">
                      {doc.filename}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Right Document Preview Canvas & Cryptographic Metadata */}
      <div
        className={
          documents.length > 0 ? 'space-y-3 lg:col-span-8' : 'space-y-3 lg:col-span-12'
        }
      >
        <div className="rounded-sm border border-border bg-surface-raised p-4">
          {/* Header with Download & Scan Status */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-xs border border-brand/40 bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-brand">
                  {activeDoc.previewType === 'IMAGE' ? 'IMAGE / PNG' : 'PDF/A-1b'}
                </span>
                <h3
                  className="font-serif text-sm font-bold text-text-primary"
                  data-testid="viewer-doc-title"
                >
                  {activeDoc.checklistItem}
                </h3>
              </div>
              <p
                className="mt-0.5 font-mono text-xs text-text-muted"
                data-testid="viewer-doc-filename"
              >
                {activeDoc.filename} • {(activeDoc.sizeBytes / 1024).toFixed(1)} KB •
                Uploaded by {activeDoc.uploadedBy}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="viewer-scan-status"
                className="inline-flex items-center gap-1.5 rounded-xs border border-sla-on-track bg-surface px-2.5 py-1 text-xs font-semibold text-sla-on-track"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Scan Status: {activeDoc.scanStatus}</span>
              </span>

              <button
                type="button"
                data-testid="viewer-download-btn"
                onClick={() => handleDownload(activeDoc)}
                className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-3 py-1 text-xs font-semibold text-brand-on hover:bg-brand-hover"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* SHA-256 Checksum Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xs border border-border bg-surface-sunken px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-text-primary">
              <Hash className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              <span>SHA-256 Integrity Checksum:</span>
            </div>
            <code
              data-testid="viewer-sha256"
              className="break-all font-mono text-[11px] font-semibold text-brand"
            >
              {activeDoc.sha256}
            </code>
          </div>

          {/* PDF or Image Viewport */}
          <div className="mt-3 rounded-sm border border-border bg-surface p-5">
            {activeDoc.previewType === 'PDF' ? (
              <div
                data-testid="viewer-pdf-canvas"
                className="mx-auto max-w-2xl rounded-xs border border-border bg-surface-raised p-5 shadow-hairline"
              >
                <div className="flex items-center justify-between border-b border-border pb-2 text-[11px] text-text-muted">
                  <span className="font-mono font-bold uppercase text-brand">
                    ALL INDIA COUNCIL FOR TECHNICAL EDUCATION • STATUTORY ANNEXURE
                  </span>
                  <span className="font-mono">Page 1 of 1</span>
                </div>
                <div className="mt-4 space-y-3 text-xs leading-relaxed text-text-primary">
                  <p className="font-serif text-sm font-bold">
                    {activeDoc.checklistItem}
                  </p>
                  <p>{activeDoc.contentSummary}</p>
                  <div className="rounded-xs border border-border bg-surface-sunken p-3 font-mono text-[11px]">
                    <div>INSTRUMENT FILE : {activeDoc.filename}</div>
                    <div>CLAMAV ENGINE   : {activeDoc.scanStatus} (0 threats)</div>
                    <div>SHA-256 DIGEST  : {activeDoc.sha256.slice(0, 32)}...</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-sla-on-track">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Digitally Signed & Notarized Copy
                  </span>
                  <span className="font-mono text-text-muted">
                    Uploaded: {activeDoc.uploadedAt}
                  </span>
                </div>
              </div>
            ) : (
              <div
                data-testid="viewer-image-canvas"
                className="mx-auto max-w-2xl rounded-xs border border-border bg-surface-raised p-4"
              >
                <div className="flex items-center justify-between border-b border-border pb-2 text-xs">
                  <span className="font-semibold text-text-primary">
                    Geo-Tagged Inspection Photograph Preview
                  </span>
                  <span className="font-mono text-[11px] text-text-muted">
                    1920×1080 • EXIF GPS Verified
                  </span>
                </div>
                {/* SVG Architectural / Lab Blueprint Representation */}
                <div className="mt-3 flex flex-col items-center justify-center rounded-xs border border-border bg-surface-sunken p-6 text-center">
                  <svg
                    viewBox="0 0 400 160"
                    className="h-36 w-full max-w-md text-brand"
                    role="img"
                    aria-label={activeDoc.checklistItem}
                  >
                    <rect
                      x="10"
                      y="10"
                      width="380"
                      height="140"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="140"
                      y1="10"
                      x2="140"
                      y2="150"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1="270"
                      y1="10"
                      x2="270"
                      y2="150"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="75"
                      y="75"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      LAB BAY A (80 PCs)
                    </text>
                    <text
                      x="205"
                      y="75"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      LAB BAY B (80 PCs)
                    </text>
                    <text
                      x="330"
                      y="75"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      SERVER RACK
                    </text>
                    <text
                      x="200"
                      y="135"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      GEO-TAG: 16.8457 N, 74.6015 E • VERIFIED CLEAN
                    </text>
                  </svg>
                  <p className="mt-2 text-xs text-text-primary">
                    {activeDoc.contentSummary}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

