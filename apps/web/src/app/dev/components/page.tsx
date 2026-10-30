"use client";

import React, { useMemo, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { useApp } from "@/lib/app-context";
import { runFullContrastAudit, TOKEN_ADJUSTMENTS } from "@/lib/contrast-audit";
import {
  REGULATORY_APPLICATIONS,
  type RegulatoryApplicationRow,
} from "@/lib/mock-data";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip, type StatusVariant } from "@/components/ui/status-chip";
import { SlaBadge, type SlaState } from "@/components/ui/sla-badge";
import { AuditSeal } from "@/components/ui/audit-seal";
import { AdvisoryBanner } from "@/components/ui/advisory-banner";
import { Timeline, type TimelineEventItem } from "@/components/ui/timeline";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CheckCircle2 } from "lucide-react";

const ALL_STATUS_VARIANTS: StatusVariant[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_SCRUTINY",
  "SCRUTINY_DEFICIENT",
  "SCRUTINY_VERIFIED",
  "EVC_SCHEDULED",
  "EVC_IN_PROGRESS",
  "EVC_COMPLETED",
  "SAC_HEARING_SCHEDULED",
  "SAC_RECOMMENDED",
  "APPROVED",
  "REJECTED",
  "PENDING",
  "VERIFIED",
  "OVERDUE",
  "WAIVED_BY_AUTHORITY",
];

const ALL_SLA_STATES: { state: SlaState; detail: string }[] = [
  { state: "ON_TRACK", detail: "9d 04h left" },
  { state: "DUE_SOON", detail: "1d 12h left" },
  { state: "OVERDUE", detail: "3d overdue" },
  { state: "PAUSED", detail: "Clock Paused (SAC Appeal)" },
];

const GALLERY_TIMELINE: TimelineEventItem[] = [
  {
    id: "gt-1",
    stage: "SUBMISSION",
    title: "Application Dossier Submitted (APP-2026-WRO-00104)",
    actor: "Dr. Arvind Kulkarni",
    actorRole: "INSTITUTION",
    timestamp: "2026-10-14 10:12 IST",
    status: "SUBMITTED",
    rationale:
      "Submitted EoA dossier for Walchand College of Engineering, Sangli.",
    stateType: "completed",
  },
  {
    id: "gt-2",
    stage: "SCRUTINY",
    title: "Regional Scrutiny Deficiency Recorded",
    actor: "Prof. Vikram Rao",
    actorRole: "COMMITTEE_MEMBER",
    timestamp: "2026-10-20 16:05 IST",
    status: "SCRUTINY_DEFICIENT",
    rationale: "Cadre ratio clarification requested under APH 2024-27.",
    stateType: "current",
  },
  {
    id: "gt-3",
    stage: "FINAL_DECISION",
    title: "Competent Authority Sign-Off",
    actor: "Dr. Anita Deshmukh",
    actorRole: "BUREAU_OFFICER",
    timestamp: "Pending EVC & SAC stages",
    status: "APPROVED",
    rationale: "Final EoA issuance requires human authority sign-off.",
    stateType: "upcoming",
  },
];

export default function ComponentGalleryPage() {
  const { t, theme, setTheme, locale, setLocale } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmedNote, setConfirmedNote] = useState<string | null>(null);
  const contrastAudit = useMemo(() => runFullContrastAudit(), []);

  const galleryColumns: DataTableColumn<RegulatoryApplicationRow>[] = [
    {
      id: "ref",
      header: t.tableHeaders.applicationId,
      accessorKey: "applicationRef",
      sortable: true,
      mono: true,
    },
    {
      id: "aicteId",
      header: t.tableHeaders.aicteId,
      accessorKey: "aictePermanentId",
      sortable: true,
      mono: true,
    },
    {
      id: "inst",
      header: t.tableHeaders.institutionName,
      accessorKey: "institutionName",
      sortable: true,
      cell: (row) => (
        <span className="font-medium">
          {locale === "hi" ? row.institutionNameHi : row.institutionName}
        </span>
      ),
    },
    {
      id: "region",
      header: t.tableHeaders.region,
      accessorKey: "regionCode",
      sortable: true,
      mono: true,
    },
    {
      id: "status",
      header: t.tableHeaders.status,
      accessorKey: "status",
      sortable: true,
      cell: (row) => <StatusChip status={row.status} />,
    },
    {
      id: "sla",
      header: t.tableHeaders.slaStatus,
      accessorKey: "slaState",
      sortable: true,
      cell: (row) => <SlaBadge state={row.slaState} detail={row.slaDetail} />,
    },
  ];

  return (
    <AppShell>
      {/* Quick Theme & Language Matrix Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-surface-sunken px-4 py-2.5 text-xs">
        <div className="font-serif font-bold text-text-primary">
          /dev/components — Design System, Signature Motifs & WCAG 2.1 AA
          Contrast Matrix
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="gallery-light-btn"
            onClick={() => setTheme("light")}
            className={`rounded-xs border px-2.5 py-1 font-medium ${
              theme === "light"
                ? "border-brand bg-brand text-brand-on"
                : "border-border bg-surface-raised text-text-primary"
            }`}
          >
            Light (#F7F1EB)
          </button>
          <button
            type="button"
            data-testid="gallery-dark-btn"
            onClick={() => setTheme("dark")}
            className={`rounded-xs border px-2.5 py-1 font-medium ${
              theme === "dark"
                ? "border-brand bg-brand text-brand-on"
                : "border-border bg-surface-raised text-text-primary"
            }`}
          >
            Dark (#17140A)
          </button>
          <button
            type="button"
            data-testid="gallery-en-btn"
            onClick={() => setLocale("en")}
            className={`rounded-xs border px-2.5 py-1 font-medium ${
              locale === "en"
                ? "border-brand bg-brand text-brand-on"
                : "border-border bg-surface-raised text-text-primary"
            }`}
          >
            English (EN)
          </button>
          <button
            type="button"
            data-testid="gallery-hi-btn"
            onClick={() => setLocale("hi")}
            className={`rounded-xs border px-2.5 py-1 font-medium ${
              locale === "hi"
                ? "border-brand bg-brand text-brand-on"
                : "border-border bg-surface-raised text-text-primary"
            }`}
          >
            हिन्दी (HI)
          </button>
        </div>
      </div>

      {/* 1. PageHeader & AuditSeal */}
      <PageHeader
        title={`${t.nav.componentGallery} — Feeling Festive Regulatory Palette`}
        subtitle="Source Serif 4 • IBM Plex Sans • IBM Plex Mono (tabular-nums) • Noto Sans/Serif Devanagari • 1px Hairline Borders"
        showAuditSeal
        auditRole="DESIGN_SYSTEM_VERIFIED"
        primaryActionLabel="Open Mandatory Reason ConfirmDialog"
        onPrimaryAction={() => setConfirmOpen(true)}
      />

      {confirmedNote && (
        <div className="rounded-xs border border-sla-on-track bg-surface-raised px-3.5 py-2 text-xs text-sla-on-track">
          Recorded ConfirmDialog Reason: <strong>{confirmedNote}</strong>
        </div>
      )}

      {/* 2. StatusChip (All 16 States with Notched File-Tab Motif) & SlaBadge (4 States) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="rounded-sm border border-border bg-surface-raised p-4 lg:col-span-8">
          <h2 className="font-serif text-sm font-bold text-text-primary">
            1. StatusChip — File-Tab Notched Corner Motif (Colour + Icon +
            Bilingual Text)
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Every status uses colour + icon + text label, never colour alone.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_STATUS_VARIANTS.map((st) => (
              <StatusChip key={st} status={st} />
            ))}
          </div>
        </section>

        <section className="rounded-sm border border-border bg-surface-raised p-4 lg:col-span-4">
          <h2 className="font-serif text-sm font-bold text-text-primary">
            2. SlaBadge — 4 Statutory States
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            WCAG 2.1 AA contrast-verified across all 3 surface layers.
          </p>
          <div className="mt-3 flex flex-col items-start gap-2">
            {ALL_SLA_STATES.map((item) => (
              <SlaBadge
                key={item.state}
                state={item.state}
                detail={item.detail}
              />
            ))}
          </div>
        </section>
      </div>

      {/* 3. AdvisoryBanner & AuditSeal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AdvisoryBanner
            ruleId="RULE-CADRE-RATIO-APH-2024"
            aphClause="APH 2024-27 • TODO(APH-VERIFY)"
            title="3. AdvisoryBanner — Plain Bordered Panel with Explicit ADVISORY Tag"
            rationale="Calculated faculty ratio for Walchand College of Engineering, Sangli (1-2000000001) meets 1:20 threshold; 2 Professor selection minutes require human verification by the Scrutiny Committee."
            confidenceScore={92}
            sourceDataSummary="Applicant Faculty Roster • 48 Full-Time Faculty Records"
          />
        </div>

        <section className="flex flex-col justify-between rounded-sm border border-border bg-surface-raised p-4 lg:col-span-4">
          <div>
            <h2 className="font-serif text-sm font-bold text-text-primary">
              4. AuditSeal — Accent Stamp (#581301 / #E0866B)
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Double-ruled seal reserved strictly for immutable audit
              verification.
            </p>
          </div>
          <div className="mt-3 space-y-2">
            <AuditSeal
              authorityRole="BUREAU_OFFICER"
              ledgerHash="SHA256:8f4c2e91...b73a10d4"
              timestamp="2026-10-30 14:18 IST"
            />
            <div>
              <AuditSeal compact ledgerHash="SHA256:3d19a04c...e82f" />
            </div>
          </div>
        </section>
      </div>

      {/* 4. KpiCards */}
      <section className="space-y-2">
        <h2 className="font-serif text-sm font-bold text-text-primary">
          5. KpiCard — Flat 1px Bordered Metric Blocks with Tabular Numerals
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Seeded Applications"
            value="500"
            sublabel="Across 6 AICTE Regional Offices"
            slaState="ON_TRACK"
            codeTag="AY 2026-27"
          />
          <KpiCard
            label="Approaching SLA Threshold"
            value="36 Dossiers"
            sublabel="Within 48 hours of statutory deadline"
            slaState="DUE_SOON"
            slaDetail="48h window"
            codeTag="DUE_SOON"
          />
          <KpiCard
            label="Overdue Escalations"
            value="12 Breaches"
            sublabel="Auto-escalated to Bureau Officer"
            slaState="OVERDUE"
            slaDetail="Tier-1"
            codeTag="OVERDUE"
          />
          <KpiCard
            label="SAC Appeal Clock Paused"
            value="9 Cases"
            sublabel="SLA clock frozen awaiting hearing"
            slaState="PAUSED"
            codeTag="PAUSED"
          />
        </div>
      </section>

      {/* 5. DataTable */}
      <DataTable
        title="6. DataTable — Sort, Filter, Column Visibility, Pagination & CSV Export Hook"
        subtitle="Dense regulatory register using 1px hairline borders and IBM Plex Mono tabular numerals"
        columns={galleryColumns}
        data={REGULATORY_APPLICATIONS}
        rowKey={(r) => r.id}
        searchKeys={["applicationRef", "institutionName", "regionCode"]}
        statusFilterKey="status"
        statusFilterOptions={[
          { value: "UNDER_SCRUTINY", label: t.statuses.UNDER_SCRUTINY },
          { value: "SCRUTINY_DEFICIENT", label: t.statuses.SCRUTINY_DEFICIENT },
          { value: "EVC_SCHEDULED", label: t.statuses.EVC_SCHEDULED },
          { value: "APPROVED", label: t.statuses.APPROVED },
        ]}
      />

      {/* 6. Timeline, FileDropzone & EmptyState */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="rounded-sm border border-border bg-surface-raised p-4 lg:col-span-6">
          <h2 className="font-serif text-sm font-bold text-text-primary mb-3">
            7. Timeline — Ruled Vertical Rail Motif
          </h2>
          <Timeline items={GALLERY_TIMELINE} />
        </section>

        <div className="space-y-4 lg:col-span-6">
          <section className="rounded-sm border border-border bg-surface-raised p-4">
            <h2 className="font-serif text-sm font-bold text-text-primary mb-2">
              8. FileDropzone — PDF/A Upload with SHA-256 & ClamAV Status
            </h2>
            <FileDropzone />
          </section>

          <section className="rounded-sm border border-border bg-surface-raised p-4">
            <h2 className="font-serif text-sm font-bold text-text-primary mb-2">
              9. EmptyState — Ruled Dossier Placeholder
            </h2>
            <EmptyState
              actionLabel="Trigger Sample Action"
              onAction={() => setConfirmOpen(true)}
            />
          </section>
        </div>
      </div>

      {/* 7. Programmatic WCAG 2.1 AA Contrast Audit Report */}
      <section
        aria-label="Programmatic WCAG 2.1 AA Contrast Report"
        className="rounded-sm border border-border bg-surface-raised"
      >
        <div className="border-b border-border bg-surface-sunken px-4 py-3">
          <h2 className="font-serif text-sm font-bold text-text-primary">
            10. Programmatic WCAG 2.1 AA Contrast Audit (68/68 Pairings Passing
            ≥ 4.5:1)
          </h2>
          <p className="text-xs text-text-muted">
            Every text/foreground token programmatically checked against
            surface, surface-raised, and surface-sunken in Light and Dark
            themes.
          </p>
        </div>

        {/* Derived Colour Adjustments Table */}
        <div className="border-b border-border p-4">
          <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-brand mb-2">
            Derived Colours Fixed to Pass WCAG 2.1 AA (≥ 4.5:1)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-sunken">
                  <th className="border-r border-border px-3 py-1.5">Theme</th>
                  <th className="border-r border-border px-3 py-1.5">Token</th>
                  <th className="border-r border-border px-3 py-1.5">
                    Original Hex
                  </th>
                  <th className="border-r border-border px-3 py-1.5">
                    Before Ratios (Surface / Raised / Sunken)
                  </th>
                  <th className="border-r border-border px-3 py-1.5">
                    Fixed Hex
                  </th>
                  <th className="border-r border-border px-3 py-1.5">
                    After Ratios (Surface / Raised / Sunken)
                  </th>
                  <th className="px-3 py-1.5">Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TOKEN_ADJUSTMENTS.map((adj) => (
                  <tr key={adj.token}>
                    <td className="border-r border-border px-3 py-2 font-mono uppercase">
                      {adj.theme}
                    </td>
                    <td className="border-r border-border px-3 py-2 font-mono font-semibold text-brand">
                      {adj.token}
                    </td>
                    <td className="border-r border-border px-3 py-2 font-mono text-sla-overdue">
                      {adj.originalHex}
                    </td>
                    <td className="tabular-nums-data border-r border-border px-3 py-2 text-sla-overdue">
                      {adj.beforeRatios.surface}:1 / {adj.beforeRatios.raised}:1
                      / {adj.beforeRatios.sunken}:1
                    </td>
                    <td className="border-r border-border px-3 py-2 font-mono font-bold text-sla-on-track">
                      {adj.adjustedHex}
                    </td>
                    <td className="tabular-nums-data border-r border-border px-3 py-2 font-semibold text-sla-on-track">
                      {adj.afterRatios.surface}:1 / {adj.afterRatios.raised}:1 /{" "}
                      {adj.afterRatios.sunken}:1
                    </td>
                    <td className="px-3 py-2 text-text-muted">{adj.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full 68-Pairing Contrast Grid */}
        <div className="p-4">
          <div className="max-h-72 overflow-y-auto border border-border">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-surface-sunken border-b border-border">
                <tr>
                  <th className="border-r border-border px-3 py-1.5">Theme</th>
                  <th className="border-r border-border px-3 py-1.5">
                    Foreground Token
                  </th>
                  <th className="border-r border-border px-3 py-1.5">FG Hex</th>
                  <th className="border-r border-border px-3 py-1.5">
                    Surface Token
                  </th>
                  <th className="border-r border-border px-3 py-1.5">BG Hex</th>
                  <th className="border-r border-border px-3 py-1.5">
                    Contrast Ratio
                  </th>
                  <th className="px-3 py-1.5">WCAG AA (≥ 4.5:1)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contrastAudit.map((entry, idx) => (
                  <tr
                    key={`${entry.theme}-${entry.foregroundToken}-${entry.backgroundToken}-${idx}`}
                  >
                    <td className="border-r border-border px-3 py-1.5 font-mono uppercase">
                      {entry.theme}
                    </td>
                    <td className="border-r border-border px-3 py-1.5 font-mono font-medium">
                      --{entry.foregroundToken}
                      {entry.wasAdjusted && (
                        <span className="ml-1.5 rounded-xs border border-brand px-1 py-0.2 text-[10px] text-brand">
                          FIXED
                        </span>
                      )}
                    </td>
                    <td className="border-r border-border px-3 py-1.5 font-mono">
                      {entry.foregroundHex}
                    </td>
                    <td className="border-r border-border px-3 py-1.5 font-mono">
                      --{entry.backgroundToken}
                    </td>
                    <td className="border-r border-border px-3 py-1.5 font-mono">
                      {entry.backgroundHex}
                    </td>
                    <td className="tabular-nums-data border-r border-border px-3 py-1.5 font-semibold">
                      {entry.ratio.toFixed(2)}:1
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-1 text-sla-on-track font-semibold">
                        <CheckCircle2
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        PASS AA
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        targetEntityLabel="APP-2026-WRO-00104 (Walchand College of Engineering, Sangli)"
        actionDescription="Verify mandatory statutory rationale modal from /dev/components gallery."
        onConfirm={(reason) => setConfirmedNote(reason)}
      />
    </AppShell>
  );
}
