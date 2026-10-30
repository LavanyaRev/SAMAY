"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { useApp, type StatutoryRole } from "@/lib/app-context";
import {
  AUDIT_LEDGER_ENTRIES,
  DEMO_ROLE_ACCOUNTS,
  REGIONAL_PENDENCY_SUMMARY,
  REGULATORY_APPLICATIONS,
  TRACKED_DOCUMENTS,
  UNDERTAKING_CONDITIONS,
  type AuditLedgerRow,
  type RegionalPendencyRow,
  type RegulatoryApplicationRow,
  type TrackedDocumentRow,
  type UndertakingConditionRow,
} from "@/lib/mock-data";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import { SlaBadge } from "@/components/ui/sla-badge";
import { Timeline, type TimelineEventItem } from "@/components/ui/timeline";
import { AdvisoryBanner } from "@/components/ui/advisory-banner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { AuditSeal } from "@/components/ui/audit-seal";

const SAMPLE_TIMELINE: TimelineEventItem[] = [
  {
    id: "tl-1",
    stage: "SUBMISSION",
    title: "Extension of Approval (EoA) Dossier Submitted & Fee Verified",
    actor: "Dr. Arvind Kulkarni",
    actorRole: "INSTITUTION",
    timestamp: "2026-10-14 10:12 IST",
    status: "SUBMITTED",
    rationale:
      "Submitted online application APP-2026-WRO-00104 with notarized land lease deed and faculty roster for 660 intake.",
    stateType: "completed",
  },
  {
    id: "tl-2",
    stage: "SCRUTINY",
    title: "Regional Scrutiny Committee Documentary Verification",
    actor: "Prof. Vikram Rao",
    actorRole: "COMMITTEE_MEMBER",
    timestamp: "2026-10-22 15:40 IST",
    status: "UNDER_SCRUTINY",
    rationale:
      "Verifying cadre ratio (1:2:6) and AICTE faculty IDs against PAN/Form-16 filings under APH 2024-27.",
    stateType: "current",
  },
  {
    id: "tl-3",
    stage: "EVC",
    title: "Expert Visit Committee (EVC) Physical / Virtual Lab Inspection",
    actor: "WRO Allocation Cell",
    actorRole: "REGIONAL_OFFICER",
    timestamp: "Scheduled post-scrutiny",
    status: "EVC_SCHEDULED",
    rationale:
      "Conflict-free 3-member expert panel allocation awaits completion of regional scrutiny sign-off.",
    stateType: "upcoming",
  },
];

export default function RoleLandingPage() {
  const { user, isAuthReady, locale, t, loginWithApi } = useApp();
  const router = useRouter();
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    targetLabel: string;
    description: string;
  }>({
    open: false,
    targetLabel: "APP-2026-WRO-00104",
    description:
      "Record statutory transition decision in immutable audit ledger.",
  });
  const [lastRecordedAction, setLastRecordedAction] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace("/login");
    }
  }, [isAuthReady, user, router]);

  if (!isAuthReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-xs text-text-muted">
        Verifying statutory session...
      </div>
    );
  }

  const role: StatutoryRole = user.role;
  const landingCopy = t.landing[role];

  const applicationColumns: DataTableColumn<RegulatoryApplicationRow>[] = [
    {
      id: "ref",
      header: t.tableHeaders.applicationId,
      accessorKey: "applicationRef",
      sortable: true,
      mono: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-brand">
          {row.applicationRef}
        </span>
      ),
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
        <div className="min-w-[200px]">
          <div className="font-medium text-text-primary">
            {locale === "hi" ? row.institutionNameHi : row.institutionName}
          </div>
          <div className="text-[11px] text-text-muted">{row.programType}</div>
        </div>
      ),
    },
    {
      id: "region",
      header: t.tableHeaders.region,
      accessorKey: "regionCode",
      sortable: true,
      mono: true,
      cell: (row) => (
        <span className="rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] font-semibold">
          {row.regionCode}
        </span>
      ),
    },
    {
      id: "state",
      header: t.tableHeaders.stateCity,
      accessorKey: "state",
      sortable: true,
      cell: (row) => (
        <span>
          {row.state} • {row.district}
        </span>
      ),
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
    {
      id: "submittedDate",
      header: t.tableHeaders.submittedOn,
      accessorKey: "submittedDate",
      sortable: true,
      mono: true,
    },
    {
      id: "actions",
      header: t.tableHeaders.actions,
      cell: (row) => (
        <button
          type="button"
          onClick={() =>
            setDialogState({
              open: true,
              targetLabel: `${row.applicationRef} (${row.institutionName})`,
              description: `Record formal statutory action for ${row.stage} stage under ${role} authority.`,
            })
          }
          className="rounded-xs border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-brand hover:border-brand hover:bg-surface-sunken"
        >
          Review / Sign
        </button>
      ),
    },
  ];

  const conditionColumns: DataTableColumn<UndertakingConditionRow>[] = [
    {
      id: "undertakingRef",
      header: t.tableHeaders.applicationId,
      accessorKey: "undertakingRef",
      mono: true,
      sortable: true,
    },
    {
      id: "conditionType",
      header: t.tableHeaders.conditionType,
      accessorKey: "conditionType",
      sortable: true,
      cell: (row) => (
        <span className="font-medium">
          {locale === "hi" ? row.conditionTypeHi : row.conditionType}
        </span>
      ),
    },
    {
      id: "evidence",
      header: t.tableHeaders.evidenceType,
      cell: (row) => (
        <span className="text-[11px] text-text-muted">
          {row.requiredEvidenceTypes.join(" • ")}
        </span>
      ),
    },
    {
      id: "dueDate",
      header: t.tableHeaders.dueDate,
      accessorKey: "dueDate",
      mono: true,
      sortable: true,
    },
    {
      id: "status",
      header: t.tableHeaders.status,
      accessorKey: "status",
      cell: (row) => <StatusChip status={row.status} />,
    },
    {
      id: "sla",
      header: t.tableHeaders.slaStatus,
      accessorKey: "slaState",
      cell: (row) => <SlaBadge state={row.slaState} detail={row.slaDetail} />,
    },
  ];

  const documentColumns: DataTableColumn<TrackedDocumentRow>[] = [
    {
      id: "docType",
      header: t.tableHeaders.documentType,
      accessorKey: "documentType",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium text-text-primary">
            {locale === "hi" ? row.documentTypeHi : row.documentType}
          </div>
          <div className="text-[11px] text-text-muted">
            {row.issuingAuthority}
          </div>
        </div>
      ),
    },
    {
      id: "docNo",
      header: t.tableHeaders.documentNo,
      accessorKey: "documentNumber",
      mono: true,
      sortable: true,
    },
    {
      id: "expiry",
      header: t.tableHeaders.expiryDate,
      accessorKey: "expiryDate",
      mono: true,
      sortable: true,
    },
    {
      id: "status",
      header: t.tableHeaders.status,
      accessorKey: "status",
      cell: (row) => <StatusChip status={row.status} />,
    },
    {
      id: "sla",
      header: t.tableHeaders.slaStatus,
      accessorKey: "slaState",
      cell: (row) => <SlaBadge state={row.slaState} detail={row.slaDetail} />,
    },
  ];

  const regionalMatrixColumns: DataTableColumn<RegionalPendencyRow>[] = [
    {
      id: "code",
      header: t.tableHeaders.region,
      accessorKey: "regionCode",
      mono: true,
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-brand">{row.regionCode}</span>
      ),
    },
    {
      id: "name",
      header: "Regional Directorate",
      accessorKey: "regionName",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.regionName}</div>
          <div className="text-[11px] text-text-muted">{row.statesCovered}</div>
        </div>
      ),
    },
    {
      id: "total",
      header: "Total Dossiers",
      accessorKey: "totalApplications",
      mono: true,
      sortable: true,
    },
    {
      id: "scrutiny",
      header: "Under Scrutiny",
      accessorKey: "underScrutiny",
      mono: true,
      sortable: true,
    },
    {
      id: "evc",
      header: "EVC Stage",
      accessorKey: "evcPending",
      mono: true,
      sortable: true,
    },
    {
      id: "sac",
      header: "SAC/SHC Appeal",
      accessorKey: "sacHearing",
      mono: true,
      sortable: true,
    },
    {
      id: "sla",
      header: t.tableHeaders.slaStatus,
      accessorKey: "slaStatus",
      cell: (row) => (
        <SlaBadge
          state={row.slaStatus}
          detail={`${row.slaOverdueCount} overdue / ${row.slaDueSoonCount} due soon`}
        />
      ),
    },
  ];

  const auditColumns: DataTableColumn<AuditLedgerRow>[] = [
    {
      id: "ts",
      header: "Timestamp (ClockService)",
      accessorKey: "timestamp",
      mono: true,
      sortable: true,
    },
    {
      id: "entity",
      header: t.tableHeaders.applicationId,
      accessorKey: "entityRef",
      mono: true,
      sortable: true,
    },
    {
      id: "actor",
      header: "Statutory Actor",
      accessorKey: "actorName",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.actorName}</div>
          <div className="font-mono text-[10px] text-text-muted">
            {row.actorRole}
          </div>
        </div>
      ),
    },
    {
      id: "transition",
      header: "State Transition",
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusChip status={row.previousStatus} />
          <span className="text-text-muted">→</span>
          <StatusChip status={row.newStatus} />
        </div>
      ),
    },
    {
      id: "rationale",
      header: "Speaking Order Rationale",
      accessorKey: "rationale",
      cell: (row) => (
        <span className="line-clamp-2 max-w-xs text-xs">{row.rationale}</span>
      ),
    },
    {
      id: "hash",
      header: "Ledger Hash",
      accessorKey: "sha256Excerpt",
      mono: true,
      cell: (row) => (
        <AuditSeal compact ledgerHash={`SHA256:${row.sha256Excerpt}`} />
      ),
    },
  ];

  const wroApplications = REGULATORY_APPLICATIONS.filter(
    (a) => a.regionCode === "WRO",
  );
  const instApplications = REGULATORY_APPLICATIONS.slice(0, 2);

  return (
    <AppShell>
      {/* Role Switcher Ribbon for Rapid Verification across all 5 Statutory Roles */}
      <div
        aria-label="Statutory Role Verification Bar"
        className="flex flex-wrap items-center justify-between gap-2 rounded-xs border border-border bg-surface-sunken px-3 py-2 text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold uppercase text-brand">
            ACTIVE ROLE VIEW: {role}
          </span>
          <span className="text-text-muted">•</span>
          <span className="text-text-muted">{user.fullName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {DEMO_ROLE_ACCOUNTS.map((acct) => (
            <button
              key={acct.role}
              type="button"
              data-testid={`switch-role-${acct.role}`}
              onClick={() => loginWithApi(acct.email, acct.password)}
              className={`rounded-xs border px-2 py-1 text-[11px] font-medium transition-colors ${
                role === acct.role
                  ? "border-brand bg-brand text-brand-on font-semibold"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              {locale === "hi" ? acct.labelHi : acct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page Header */}
      <PageHeader
        title={landingCopy.title}
        subtitle={landingCopy.subtitle}
        showAuditSeal={role === "BUREAU_OFFICER" || role === "ADMIN"}
        auditRole={role}
        primaryActionLabel={landingCopy.primaryAction}
        onPrimaryAction={() =>
          setDialogState({
            open: true,
            targetLabel:
              "APP-2026-WRO-00104 (Walchand College of Engineering, Sangli)",
            description: `${landingCopy.primaryAction} under ${role} authority.`,
          })
        }
      />

      {lastRecordedAction && (
        <div
          role="status"
          className="rounded-xs border border-sla-on-track bg-surface-raised px-3.5 py-2 text-xs text-sla-on-track"
        >
          <strong>Audit Ledger Committed:</strong> {lastRecordedAction}
        </div>
      )}

      {/* 1. INSTITUTION LANDING PAGE */}
      {role === "INSTITUTION" && (
        <div className="space-y-5" data-testid="landing-view-INSTITUTION">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Active EoA Application"
              value="APP-2026-WRO-00104"
              sublabel="Stage: Regional Scrutiny Verification"
              slaState="DUE_SOON"
              slaDetail="2d 14h"
              codeTag="AY 2026-27"
            />
            <KpiCard
              label="Approved Intake Capacity"
              value="660 Seats"
              sublabel="UG Engineering & PG M.Tech Programs"
              slaState="ON_TRACK"
              codeTag="AICTE: 1-2000000001"
            />
            <KpiCard
              label="Open Undertaking Conditions"
              value="2 Active"
              sublabel="1 condition overdue by 5 days"
              slaState="OVERDUE"
              slaDetail="5d overdue"
              codeTag="UND-2026"
            />
            <KpiCard
              label="Tracked Statutory Documents"
              value="3 Instruments"
              sublabel="Fire NOC expiring in 10 days"
              slaState="DUE_SOON"
              slaDetail="10d left"
              codeTag="VALIDITY"
            />
          </div>

          <AdvisoryBanner
            ruleId="RULE-CADRE-RATIO-APH-2024"
            aphClause="APH 2024-27 • TODO(APH-VERIFY)"
            title="Pre-Scrutiny Documentary Completeness Check (Walchand College of Engineering, Sangli)"
            rationale="Uploaded faculty roster shows 34 Assistant Professors, 11 Associate Professors, and 3 Professors. Two Professor appointments under Condition UND-2026-WRO-019 require Selection Committee Minutes upload before EVC scheduling."
            confidenceScore={88}
            sourceDataSummary="Form-16 & Biometric Attendance Extract (Oct 2026)"
          />

          <DataTable
            title={landingCopy.tableTitle}
            subtitle="Institutional approval applications pinned to Pipeline v1.0.0"
            columns={applicationColumns}
            data={instApplications}
            rowKey={(r) => r.id}
            searchKeys={["applicationRef", "institutionName", "programType"]}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <DataTable
                title={t.landing.INSTITUTION.undertakingsTitle}
                columns={conditionColumns}
                data={UNDERTAKING_CONDITIONS.slice(0, 2)}
                rowKey={(r) => r.id}
              />
              <DataTable
                title={t.landing.INSTITUTION.documentsTitle}
                columns={documentColumns}
                data={TRACKED_DOCUMENTS}
                rowKey={(r) => r.id}
              />
            </div>

            <div className="space-y-4 lg:col-span-5">
              <div className="rounded-sm border border-border bg-surface-raised p-4">
                <h2 className="font-serif text-sm font-bold text-text-primary mb-3">
                  {t.landing.INSTITUTION.timelineTitle}
                </h2>
                <Timeline items={SAMPLE_TIMELINE} />
              </div>

              <div className="rounded-sm border border-border bg-surface-raised p-4">
                <FileDropzone label={t.landing.INSTITUTION.primaryAction} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. REGIONAL OFFICER LANDING PAGE */}
      {role === "REGIONAL_OFFICER" && (
        <div className="space-y-5" data-testid="landing-view-REGIONAL_OFFICER">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="WRO Regional Applications"
              value="112"
              sublabel="Strict RLS Scope: Western Region (WRO) Only"
              slaState="ON_TRACK"
              codeTag="RLS: WRO"
            />
            <KpiCard
              label="Scrutiny Pendency"
              value="38 Dossiers"
              sublabel="11 approaching statutory SLA threshold"
              slaState="DUE_SOON"
              slaDetail="11 due soon"
              codeTag="SCRUTINY"
            />
            <KpiCard
              label="Overdue Deficiencies"
              value="4 Breaches"
              sublabel="Tier-1 escalation alerts dispatched"
              slaState="OVERDUE"
              slaDetail="4 overdue"
              codeTag="ESCALATED"
            />
            <KpiCard
              label="Appeal Clock Paused"
              value="3 Cases"
              sublabel="Awaiting SAC/SHC hearing slot"
              slaState="PAUSED"
              codeTag="PAUSED"
            />
          </div>

          <AdvisoryBanner
            ruleId="RULE-EVC-CONFLICT-CHECK-04"
            aphClause="APH 2024-27 • TODO(APH-VERIFY)"
            title="Regional EVC Panel Conflict-of-Interest & Proximity Advisory (WRO)"
            rationale="For APP-2026-WRO-00108 (VJTI Mumbai), 3 shortlisted experts from Pune & Nagpur have zero prior employment or affiliation conflicts with the applicant institution."
            confidenceScore={96}
            sourceDataSummary="Expert Registry Conflict Matrix • WRO Jurisdiction"
          />

          <DataTable
            title={landingCopy.tableTitle}
            subtitle="Enforced by RegionScopeGuard & PostgreSQL Row-Level Security (WRO rows only)"
            columns={applicationColumns}
            data={wroApplications}
            rowKey={(r) => r.id}
            searchKeys={[
              "applicationRef",
              "institutionName",
              "aictePermanentId",
              "district",
            ]}
            statusFilterKey="status"
            statusFilterOptions={[
              { value: "UNDER_SCRUTINY", label: t.statuses.UNDER_SCRUTINY },
              {
                value: "SCRUTINY_DEFICIENT",
                label: t.statuses.SCRUTINY_DEFICIENT,
              },
              { value: "EVC_SCHEDULED", label: t.statuses.EVC_SCHEDULED },
              { value: "APPROVED", label: t.statuses.APPROVED },
            ]}
          />

          <DataTable
            title="WRO Regional Undertakings & Condition Rectification Tracker"
            columns={conditionColumns}
            data={UNDERTAKING_CONDITIONS}
            rowKey={(r) => r.id}
          />
        </div>
      )}

      {/* 3. BUREAU OFFICER LANDING PAGE */}
      {role === "BUREAU_OFFICER" && (
        <div className="space-y-5" data-testid="landing-view-BUREAU_OFFICER">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Pan-India Applications"
              value="500"
              sublabel="Across 6 AICTE Regional Directorates"
              slaState="ON_TRACK"
              codeTag="HQ PAN-INDIA"
            />
            <KpiCard
              label="Awaiting Competent Authority Sign-Off"
              value="28 Dossiers"
              sublabel="Scrutiny + EVC + SAC recommendations complete"
              slaState="DUE_SOON"
              slaDetail="6 due in 48h"
              codeTag="SIGN-OFF"
            />
            <KpiCard
              label="National SLA Breaches"
              value="12 Overdue"
              sublabel="Highest in NRO (7) and WRO (4)"
              slaState="OVERDUE"
              slaDetail="12 breaches"
              codeTag="SLA ALERT"
            />
            <KpiCard
              label="SAC/SHC Appellate Docket"
              value="40 Cases"
              sublabel="SLA timers paused during appellate hearing"
              slaState="PAUSED"
              codeTag="SAC/SHC"
            />
          </div>

          <AdvisoryBanner
            ruleId="RULE-BUREAU-SYNTHESIS-09"
            aphClause="APH 2024-27 • TODO(APH-VERIFY)"
            title="Competent Authority Pre-Decision Synthesis (APP-2026-CRO-00518 — SGSITS Indore)"
            rationale="Scrutiny Committee and SAC Hearing Panel both recorded 100% documentary compliance after fire safety NOC renewal verification. Human digital signature required to issue EoA."
            confidenceScore={94}
            sourceDataSummary="StageInstances: SUBMISSION -> SCRUTINY -> EVC -> SAC_SHC"
          />

          <DataTable
            title={t.landing.BUREAU_OFFICER.regionalMatrixTitle}
            subtitle="Real-time pendency aggregation across all 6 AICTE Regional Offices"
            columns={regionalMatrixColumns}
            data={REGIONAL_PENDENCY_SUMMARY}
            rowKey={(r) => r.regionCode}
            defaultPageSize={10}
          />

          <DataTable
            title={landingCopy.tableTitle}
            subtitle="Pan-India jurisdiction access across WRO, NRO, SRO, ERO, NWRO, CRO"
            columns={applicationColumns}
            data={REGULATORY_APPLICATIONS}
            rowKey={(r) => r.id}
            searchKeys={[
              "applicationRef",
              "institutionName",
              "regionCode",
              "state",
            ]}
            statusFilterKey="status"
            statusFilterOptions={[
              { value: "UNDER_SCRUTINY", label: t.statuses.UNDER_SCRUTINY },
              { value: "EVC_COMPLETED", label: t.statuses.EVC_COMPLETED },
              { value: "SAC_RECOMMENDED", label: t.statuses.SAC_RECOMMENDED },
              { value: "APPROVED", label: t.statuses.APPROVED },
            ]}
            defaultPageSize={10}
          />
        </div>
      )}

      {/* 4. COMMITTEE MEMBER LANDING PAGE */}
      {role === "COMMITTEE_MEMBER" && (
        <div className="space-y-5" data-testid="landing-view-COMMITTEE_MEMBER">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Assigned Scrutiny / EVC Cases"
              value="8 Dossiers"
              sublabel="Conflict-of-interest declarations signed"
              slaState="ON_TRACK"
              codeTag="PANEL MEMBER"
            />
            <KpiCard
              label="Reports Due Within 48 Hours"
              value="2 Cases"
              sublabel="Walchand College & SGSITS Indore"
              slaState="DUE_SOON"
              slaDetail="48h window"
              codeTag="SLA"
            />
            <KpiCard
              label="Deficiencies Flagged"
              value="3 Notices"
              sublabel="Speaking order rationale attached"
              slaState="OVERDUE"
              slaDetail="Action req"
              codeTag="DEFICIENCY"
            />
            <KpiCard
              label="Completed Evaluations"
              value="19 Signed"
              sublabel="Audit-sealed in AY 2026-27 cycle"
              slaState="ON_TRACK"
              codeTag="VERIFIED"
            />
          </div>

          <AdvisoryBanner
            ruleId="RULE-DOC-EXTRACTION-02"
            aphClause="APH 2024-27 • TODO(APH-VERIFY)"
            title="Documentary Checklist Pre-Fill for Scrutiny Panel (APP-2026-WRO-00104)"
            rationale="Automated OCR pre-check matched Land Lease Deed registration number MH-SNG-LEASE-1998-4412 (30-year validity through 2028) and AICTE Corpus FDR. Committee members must manually inspect original stamps before marking verified."
            confidenceScore={91}
            sourceDataSummary="3 TrackedDocuments • SHA-256 Verified"
          />

          <DataTable
            title={landingCopy.tableTitle}
            columns={applicationColumns}
            data={REGULATORY_APPLICATIONS.slice(0, 5)}
            rowKey={(r) => r.id}
            searchKeys={["applicationRef", "institutionName"]}
          />

          <DataTable
            title={t.landing.COMMITTEE_MEMBER.checklistTitle}
            columns={documentColumns}
            data={TRACKED_DOCUMENTS}
            rowKey={(r) => r.id}
          />
        </div>
      )}

      {/* 5. ADMIN LANDING PAGE */}
      {role === "ADMIN" && (
        <div className="space-y-5" data-testid="landing-view-ADMIN">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Active Pipeline Definition"
              value="v1.0.0"
              sublabel="AICTE_STANDARD_CYCLE (Pinned JSON Schema)"
              slaState="ON_TRACK"
              codeTag="WORKFLOW-DATA"
            />
            <KpiCard
              label="Immutable Audit Ledger"
              value="1,428 Tx"
              sublabel="100% atomic state transition parity"
              slaState="ON_TRACK"
              codeTag="AUDIT_LOG"
            />
            <KpiCard
              label="PostgreSQL RLS Policies"
              value="ENFORCED"
              sublabel="FORCE ROW LEVEL SECURITY on applications & institutions"
              slaState="ON_TRACK"
              codeTag="PG 16 RLS"
            />
            <KpiCard
              label="Transactional Outbox Queue"
              value="0 Failed"
              sublabel="Idempotent delivery workers healthy"
              slaState="ON_TRACK"
              codeTag="OUTBOX"
            />
          </div>

          <DataTable
            title={landingCopy.tableTitle}
            subtitle="Every state transition and rationale written in the same database transaction"
            columns={auditColumns}
            data={AUDIT_LEDGER_ENTRIES}
            rowKey={(r) => r.id}
            searchKeys={["entityRef", "actorName", "action", "rationale"]}
          />

          <DataTable
            title="National Applications Register (System Governance View)"
            columns={applicationColumns}
            data={REGULATORY_APPLICATIONS}
            rowKey={(r) => r.id}
            searchKeys={["applicationRef", "institutionName", "regionCode"]}
          />
        </div>
      )}

      {/* Confirm Dialog with Mandatory Statutory Rationale */}
      <ConfirmDialog
        open={dialogState.open}
        onClose={() => setDialogState((prev) => ({ ...prev, open: false }))}
        targetEntityLabel={dialogState.targetLabel}
        actionDescription={dialogState.description}
        onConfirm={(rationale) => {
          setLastRecordedAction(
            `${dialogState.targetLabel} — Signed by ${user.fullName} (${role}) with rationale: "${rationale}"`,
          );
        }}
      />
    </AppShell>
  );
}
