'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FilePlus2,
  CheckCircle2,
  ShieldCheck,
  Users,
  Filter,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { useApp, type StatutoryRole } from '@/lib/app-context';
import { DEMO_ROLE_ACCOUNTS } from '@/lib/mock-data';
import {
  samayApiClient,
  scanUploadedFileMock,
  type LifecycleApplication,
  type LifecycleDocumentFile,
} from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { StatusChip } from '@/components/ui/status-chip';
import { SlaBadge } from '@/components/ui/sla-badge';
import { FileDropzone } from '@/components/ui/file-dropzone';

const CHECKLIST_DEFINITIONS = [
  {
    id: 'chk-affidavit',
    title: 'Notarized Statutory Format-1 Affidavit (Rs. 100 Stamp)',
    defaultFilename: 'Format1_Notarized_Affidavit_AY2026_27.pdf',
    mime: 'application/pdf' as const,
  },
  {
    id: 'chk-faculty',
    title: 'Faculty Cadre Ratio (1:2:6) & Form-16 TDS Roster',
    defaultFilename: 'Faculty_Cadre_Form16_Roster_Verified.pdf',
    mime: 'application/pdf' as const,
  },
  {
    id: 'chk-geotag',
    title: 'Geo-Tagged Campus & Computing Lab Photograph',
    defaultFilename: 'Campus_Computing_Lab_GeoTagged.png',
    mime: 'image/png' as const,
  },
];

const ASSIGNABLE_OFFICERS = [
  'Dr. Suresh Patil (RO Western)',
  'Prof. Vikram Rao (Scrutiny & EVC Expert)',
  'Dr. Anita Deshmukh (Bureau Head)',
  'Dr. Rajesh Sharma (RO Northern)',
];

export default function ApplicationsLifecyclePage() {
  const { user, isAuthReady, locale, loginWithApi } = useApp();
  const router = useRouter();

  const [applications, setApplications] = useState<LifecycleApplication[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Wizard Step 1 state
  const [instName, setInstName] = useState(
    'Walchand College of Engineering, Sangli',
  );
  const [aicteId, setAicteId] = useState('1-2000000001');
  const [appType, setAppType] = useState<
    'EXTENSION_OF_APPROVAL' | 'NEW_INSTITUTION' | 'INCREASE_INTAKE'
  >('EXTENSION_OF_APPROVAL');
  const [programStream, setProgramStream] = useState(
    'B.Tech Computer Science & AI Engineering',
  );
  const [proposedIntake, setProposedIntake] = useState(180);

  // Wizard Step 2 uploaded documents (with scan_status = CLEAN)
  const [wizardDocs, setWizardDocs] = useState<
    Record<string, LifecycleDocumentFile>
  >(() => {
    const initial: Record<string, LifecycleDocumentFile> = {};
    for (const item of CHECKLIST_DEFINITIONS) {
      initial[item.id] = scanUploadedFileMock({
        checklistItem: item.title,
        filename: item.defaultFilename,
        sizeBytes: 1384200,
        mime: item.mime,
        uploadedBy: 'Dr. Arvind Kulkarni (Principal)',
      });
    }
    return initial;
  });

  // Officer Queue Filters
  const [stageFilter, setStageFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [instQuery, setInstQuery] = useState('');
  const [ageingFilter, setAgeingFilter] = useState('ALL');
  const [slaFilter, setSlaFilter] = useState('ALL');
  const [officerFilter, setOfficerFilter] = useState('ALL');

  // Bulk assignment state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetOfficer, setTargetOfficer] = useState(ASSIGNABLE_OFFICERS[0]);
  const [bulkStatusBanner, setBulkStatusBanner] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    const list = await samayApiClient.listApplications({
      stage: stageFilter,
      regionCode: regionFilter,
      institutionQuery: instQuery,
      ageingBucket: ageingFilter,
      slaState: slaFilter,
      assignedOfficer: officerFilter,
      role: user?.role,
    });
    setApplications(list);
  }, [
    stageFilter,
    regionFilter,
    instQuery,
    ageingFilter,
    slaFilter,
    officerFilter,
    user?.role,
  ]);

  useEffect(() => {
    loadApplications();
    const handler = () => loadApplications();
    window.addEventListener('samay-lifecycle-updated', handler);
    return () => window.removeEventListener('samay-lifecycle-updated', handler);
  }, [loadApplications]);

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/login');
    }
  }, [isAuthReady, user, router]);

  if (!isAuthReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-xs text-text-muted">
        Loading statutory workspace...
      </div>
    );
  }

  const role: StatutoryRole = user.role;
  const isInstitution = role === 'INSTITUTION';

  const handleChecklistUpload = (
    checklistId: string,
    checklistTitle: string,
    fileName: string,
    sizeBytes: number,
  ) => {
    const scanned = scanUploadedFileMock({
      checklistItem: checklistTitle,
      filename: fileName,
      sizeBytes,
      uploadedBy: user.fullName,
    });
    setWizardDocs((prev) => ({
      ...prev,
      [checklistId]: scanned,
    }));
  };

  const handleWizardSubmit = async () => {
    const docsList = Object.values(wizardDocs);
    const created = await samayApiClient.createAndSubmitApplication({
      institutionName: instName,
      aictePermanentId: aicteId,
      regionCode: 'WRO',
      state: 'Maharashtra',
      district: 'Sangli',
      academicYear: '2026-27',
      applicationTypeCode: appType,
      programStream,
      proposedIntake,
      documents: docsList,
      actorName: user.fullName,
    });
    setWizardOpen(false);
    setWizardStep(1);
    router.push(`/applications/${created.id}`);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map((a) => a.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) return;
    const count = await samayApiClient.bulkAssignApplications(
      selectedIds,
      targetOfficer,
    );
    setBulkStatusBanner(
      `Assigned ${count} dossier(s) to ${targetOfficer} and recorded assignment in audit log.`,
    );
    setSelectedIds([]);
    await loadApplications();
  };

  return (
    <AppShell>
      {/* Statutory Role Switcher Bar for Seamless E2E Verification */}
      <div
        aria-label="Statutory Role Verification Bar"
        className="flex flex-wrap items-center justify-between gap-2 rounded-xs border border-border bg-surface-sunken px-3 py-2 text-xs"
      >
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[11px] font-bold uppercase text-brand"
            data-testid="active-role-indicator"
          >
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
                  ? 'border-brand bg-brand text-brand-on font-semibold'
                  : 'border-border bg-surface-raised text-text-primary hover:border-brand'
              }`}
            >
              {locale === 'hi' ? acct.labelHi : acct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page Header */}
      <PageHeader
        title={
          isInstitution
            ? locale === 'hi'
              ? 'संस्थागत अनुमोदन आवेदन पोर्टल'
              : 'Institution Approval Applications Portal'
            : locale === 'hi'
              ? 'अधिकारी स्क्रूटनी एवं अनुमोदन कार्यपटल'
              : 'Officer Application Queue & Scrutiny Workbench'
        }
        subtitle={
          isInstitution
            ? 'Submit new approval dossiers with ClamAV-scanned statutory checklists, track real-time SLA clocks, and respond to scrutiny deficiency notices.'
            : 'Filter applications by statutory stage, region, institution, ageing bucket, SLA state, and assigned officer; perform bulk assignment and stage evaluations.'
        }
        showAuditSeal={!isInstitution}
        auditRole={role}
        primaryActionLabel={
          isInstitution
            ? wizardOpen
              ? 'Close Application Wizard'
              : 'New Application Wizard'
            : undefined
        }
        onPrimaryAction={
          isInstitution ? () => setWizardOpen((prev) => !prev) : undefined
        }
      />

      {/* =====================================================================
          1. INSTITUTION PORTAL: 3-STEP APPLICATION WIZARD + MY APPLICATIONS
         ===================================================================== */}
      {isInstitution && (
        <div className="space-y-5" data-testid="institution-portal-view">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-surface-raised p-4">
            <div>
              <h2 className="font-serif text-sm font-bold text-text-primary">
                AY 2026-27 Statutory Application Submission Wizard
              </h2>
              <p className="text-xs text-text-muted">
                Create a new Extension of Approval (EoA) or New Institution dossier
                with automated ClamAV virus scanning (`scan_status: CLEAN`) and
                SHA-256 document sealing.
              </p>
            </div>
            <button
              type="button"
              data-testid="toggle-application-wizard-btn"
              onClick={() => setWizardOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-3.5 py-2 text-xs font-semibold text-brand-on hover:bg-brand-hover"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              <span>
                {wizardOpen ? 'Hide Wizard' : 'Start New Application Wizard'}
              </span>
            </button>
          </div>

          {wizardOpen && (
            <section
              aria-label="Application Submission Wizard"
              data-testid="application-wizard"
              className="rounded-sm border border-brand bg-surface-raised p-5 shadow-raised"
            >
              {/* Stepper Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  {[
                    { step: 1, title: '1. Details & Application Type' },
                    { step: 2, title: '2. Document Checklist (ClamAV Scan)' },
                    { step: 3, title: '3. Review & Statutory Submit' },
                  ].map((s) => (
                    <button
                      key={s.step}
                      type="button"
                      data-testid={`wizard-step-tab-${s.step}`}
                      onClick={() => setWizardStep(s.step as 1 | 2 | 3)}
                      className={`rounded-xs border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        wizardStep === s.step
                          ? 'border-brand bg-brand text-brand-on'
                          : 'border-border bg-surface text-text-primary hover:border-brand'
                      }`}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[11px] font-semibold text-brand">
                  Pinned Pipeline:{' '}
                  {appType === 'NEW_INSTITUTION' ? 'SCRUTINY_EVC' : 'ONLY_SCRUTINY'}{' '}
                  @ v1.0.0
                </span>
              </div>

              {/* STEP 1: DETAILS & TYPE */}
              {wizardStep === 1 && (
                <div
                  className="mt-4 space-y-4"
                  data-testid="wizard-step-1-content"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="wiz-inst-name"
                        className="block text-xs font-semibold text-text-primary"
                      >
                        Institution Name
                      </label>
                      <input
                        id="wiz-inst-name"
                        data-testid="wizard-inst-name-input"
                        type="text"
                        value={instName}
                        onChange={(e) => setInstName(e.target.value)}
                        className="mt-1 w-full rounded-xs border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="wiz-aicte-id"
                        className="block text-xs font-semibold text-text-primary"
                      >
                        AICTE Permanent ID
                      </label>
                      <input
                        id="wiz-aicte-id"
                        data-testid="wizard-aicte-id-input"
                        type="text"
                        value={aicteId}
                        onChange={(e) => setAicteId(e.target.value)}
                        className="mt-1 w-full rounded-xs border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="wiz-app-type"
                        className="block text-xs font-semibold text-text-primary"
                      >
                        Statutory Application Type
                      </label>
                      <select
                        id="wiz-app-type"
                        data-testid="wizard-app-type-select"
                        value={appType}
                        onChange={(e) =>
                          setAppType(
                            e.target.value as
                              | 'EXTENSION_OF_APPROVAL'
                              | 'NEW_INSTITUTION'
                              | 'INCREASE_INTAKE',
                          )
                        }
                        className="mt-1 w-full rounded-xs border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
                      >
                        <option value="EXTENSION_OF_APPROVAL">
                          Extension of Approval (EoA) — Pinned to ONLY_SCRUTINY
                        </option>
                        <option value="NEW_INSTITUTION">
                          Setting up New Technical Institution — Pinned to SCRUTINY_EVC
                        </option>
                        <option value="INCREASE_INTAKE">
                          Increase in Intake / Additional Course — Pinned to ONLY_SCRUTINY
                        </option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="wiz-program-stream"
                        className="block text-xs font-semibold text-text-primary"
                      >
                        Program & Course Stream
                      </label>
                      <input
                        id="wiz-program-stream"
                        data-testid="wizard-program-input"
                        type="text"
                        value={programStream}
                        onChange={(e) => setProgramStream(e.target.value)}
                        className="mt-1 w-full rounded-xs border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="wiz-intake"
                        className="block text-xs font-semibold text-text-primary"
                      >
                        Proposed Intake (Seats)
                      </label>
                      <input
                        id="wiz-intake"
                        data-testid="wizard-intake-input"
                        type="number"
                        value={proposedIntake}
                        onChange={(e) =>
                          setProposedIntake(Number(e.target.value) || 60)
                        }
                        className="mt-1 w-full rounded-xs border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary focus:border-brand focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      data-testid="wizard-next-to-step-2"
                      onClick={() => setWizardStep(2)}
                      className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-4 py-2 text-xs font-semibold text-brand-on hover:bg-brand-hover"
                    >
                      <span>Continue to Document Checklist</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: DOCUMENT CHECKLIST WITH FILEDROPZONE & MOCK SCANNER */}
              {wizardStep === 2 && (
                <div
                  className="mt-4 space-y-4"
                  data-testid="wizard-step-2-content"
                >
                  <div className="rounded-xs border border-border bg-surface-sunken p-3 text-xs text-text-muted">
                    Upload mandatory statutory instruments below. Every uploaded
                    file is stored locally and verified by the mock ClamAV virus
                    scanner (<code className="font-mono">scan_status: CLEAN</code>)
                    with a cryptographic SHA-256 digest.
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {CHECKLIST_DEFINITIONS.map((chk) => {
                      const currentDoc = wizardDocs[chk.id];
                      return (
                        <div
                          key={chk.id}
                          className="rounded-sm border border-border bg-surface p-3.5"
                          data-testid={`checklist-card-${chk.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-text-primary">
                              {chk.title}
                            </span>
                            <span
                              data-testid={`scan-badge-${chk.id}`}
                              className="shrink-0 inline-flex items-center gap-1 rounded-xs border border-sla-on-track bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] font-bold text-sla-on-track"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              scan_status: {currentDoc?.scanStatus || 'CLEAN'}
                            </span>
                          </div>

                          <div className="mt-2">
                            <FileDropzone
                              defaultFiles={
                                currentDoc
                                  ? [
                                      {
                                        name: currentDoc.filename,
                                        sizeBytes: currentDoc.sizeBytes,
                                        sha256Preview: currentDoc.sha256,
                                        scanStatus: 'CLEAN',
                                      },
                                    ]
                                  : []
                              }
                              onFileSelected={(uploaded) =>
                                handleChecklistUpload(
                                  chk.id,
                                  chk.title,
                                  uploaded.name,
                                  uploaded.sizeBytes,
                                )
                              }
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
                            <span className="font-mono truncate">
                              SHA-256: {currentDoc?.sha256.slice(0, 14)}…
                            </span>
                            <button
                              type="button"
                              data-testid={`mock-upload-btn-${chk.id}`}
                              onClick={() =>
                                handleChecklistUpload(
                                  chk.id,
                                  chk.title,
                                  `Updated_${chk.defaultFilename}`,
                                  1542900,
                                )
                              }
                              className="rounded-xs border border-border bg-surface-raised px-2 py-0.5 text-[10px] font-semibold text-brand hover:border-brand"
                            >
                              Re-scan / Attach Signed File
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="rounded-xs border border-border bg-surface px-3.5 py-2 text-xs font-medium text-text-primary"
                    >
                      Back to Details
                    </button>
                    <button
                      type="button"
                      data-testid="wizard-next-to-step-3"
                      onClick={() => setWizardStep(3)}
                      className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-4 py-2 text-xs font-semibold text-brand-on hover:bg-brand-hover"
                    >
                      <span>Review Dossier Before Submission</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW & SUBMIT */}
              {wizardStep === 3 && (
                <div
                  className="mt-4 space-y-4"
                  data-testid="wizard-step-3-content"
                >
                  <div className="grid grid-cols-1 gap-4 rounded-sm border border-border bg-surface p-4 sm:grid-cols-3">
                    <div>
                      <div className="text-[11px] text-text-muted">
                        Institution & AICTE ID
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-text-primary">
                        {instName} ({aicteId})
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-muted">
                        Application Type & Pinned Pipeline
                      </div>
                      <div className="mt-0.5 font-mono text-xs font-bold text-brand">
                        {appType} •{' '}
                        {appType === 'NEW_INSTITUTION'
                          ? 'SCRUTINY_EVC@1.0.0'
                          : 'ONLY_SCRUTINY@1.0.0'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-muted">
                        Program Stream & Intake
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-text-primary">
                        {programStream} ({proposedIntake} Seats)
                      </div>
                    </div>
                  </div>

                  <div className="rounded-sm border border-border bg-surface p-4">
                    <div className="text-xs font-bold text-text-primary">
                      Verified Statutory Document Checklist (
                      {Object.values(wizardDocs).length} Instruments)
                    </div>
                    <ul className="mt-2 divide-y divide-border text-xs">
                      {Object.values(wizardDocs).map((doc) => (
                        <li
                          key={doc.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2"
                        >
                          <div>
                            <span className="font-semibold text-text-primary">
                              {doc.checklistItem}
                            </span>
                            <span className="ml-2 font-mono text-[11px] text-text-muted">
                              ({doc.filename})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-text-muted">
                              SHA-256: {doc.sha256.slice(0, 16)}…
                            </span>
                            <span className="rounded-xs border border-sla-on-track px-2 py-0.5 font-mono text-[10px] font-bold text-sla-on-track">
                              scan_status: {doc.scanStatus}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="rounded-xs border border-border bg-surface px-3.5 py-2 text-xs font-medium text-text-primary"
                    >
                      Back to Document Checklist
                    </button>
                    <button
                      type="button"
                      data-testid="wizard-submit-application-btn"
                      onClick={handleWizardSubmit}
                      className="inline-flex items-center gap-2 rounded-xs border border-brand bg-brand px-5 py-2 text-xs font-semibold text-brand-on hover:bg-brand-hover"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>Sign & Submit Statutory Application</span>
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* My Applications List with SlaBadge and StatusChip */}
          <section
            aria-label="My Institutional Applications"
            className="rounded-sm border border-border bg-surface-raised"
          >
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-serif text-sm font-bold text-text-primary">
                My Submitted & Draft Applications ({applications.length})
              </h2>
              <p className="text-xs text-text-muted">
                Click any application to inspect its statutory timeline, view
                ClamAV-scanned documents, or respond to scrutiny deficiency returns.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-4 py-2.5">Application Ref</th>
                    <th className="px-4 py-2.5">Institution & Program</th>
                    <th className="px-4 py-2.5">Pipeline</th>
                    <th className="px-4 py-2.5">Current Stage</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">SLA Clock</th>
                    <th className="px-4 py-2.5">Ball With</th>
                    <th className="px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      data-testid={`inst-app-row-${app.applicationRef}`}
                      className="hover:bg-surface"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-brand">
                        {app.applicationRef}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text-primary">
                          {locale === 'hi'
                            ? app.institutionNameHi
                            : app.institutionName}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {app.programStream} ({app.proposedIntake} seats)
                        </div>
                        {app.stage === 'DEFICIENCY_RECTIFICATION' &&
                          app.lastDeficiencyReason && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded-xs border border-sla-overdue/50 bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-sla-overdue">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              <span>
                                Returned: {app.lastDeficiencyReason.slice(0, 65)}…
                              </span>
                            </div>
                          )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {app.pipelineCode}@v{app.pipelineVersion}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">
                        {app.stage}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={app.status} />
                      </td>
                      <td className="px-4 py-3">
                        <SlaBadge state={app.slaState} detail={app.slaDetail} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-xs border px-2 py-0.5 font-mono text-[10px] font-bold ${
                            app.ballWith === 'INSTITUTION'
                              ? 'border-sla-overdue bg-surface text-sla-overdue'
                              : 'border-border bg-surface-sunken text-text-muted'
                          }`}
                        >
                          {app.ballWith}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/applications/${app.id}`}
                          data-testid={`open-app-${app.applicationRef}`}
                          className="inline-flex items-center gap-1 rounded-xs border border-brand bg-surface px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-brand hover:text-brand-on"
                        >
                          <span>
                            {app.stage === 'DEFICIENCY_RECTIFICATION'
                              ? 'Respond to Return'
                              : 'View Timeline & Dossier'}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          2. OFFICER WORKSPACE: QUEUE WITH 6 FILTERS & BULK ASSIGNMENT
         ===================================================================== */}
      {!isInstitution && (
        <div className="space-y-4" data-testid="officer-workspace-queue">
          {/* 6-Filter Bar */}
          <section
            aria-label="Officer Queue Filters"
            className="rounded-sm border border-border bg-surface-raised p-4"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
              <Filter className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              <span>Statutory Queue Filters</span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div>
                <label
                  htmlFor="filter-stage"
                  className="block text-[11px] font-semibold text-text-muted"
                >
                  1. Stage
                </label>
                <select
                  id="filter-stage"
                  data-testid="queue-filter-stage"
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                >
                  <option value="ALL">All Stages</option>
                  <option value="SCRUTINY">SCRUTINY</option>
                  <option value="DEFICIENCY_RECTIFICATION">
                    DEFICIENCY_RECTIFICATION
                  </option>
                  <option value="EVC">EVC</option>
                  <option value="SAC_SHC">SAC_SHC</option>
                  <option value="BUREAU_REVIEW">BUREAU_REVIEW</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-region"
                  className="block text-[11px] font-semibold text-text-muted"
                >
                  2. Region
                </label>
                <select
                  id="filter-region"
                  data-testid="queue-filter-region"
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                >
                  <option value="ALL">All Regions</option>
                  <option value="WRO">WRO (Western)</option>
                  <option value="NRO">NRO (Northern)</option>
                  <option value="SRO">SRO (Southern)</option>
                  <option value="ERO">ERO (Eastern)</option>
                  <option value="CRO">CRO (Central)</option>
                  <option value="NWRO">NWRO (North-West)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-inst"
                  className="block text-[11px] font-semibold text-text-muted"
                >
                  3. Institution / Ref
                </label>
                <input
                  id="filter-inst"
                  data-testid="queue-filter-institution"
                  type="search"
                  placeholder="Search name or APP-..."
                  value={instQuery}
                  onChange={(e) => setInstQuery(e.target.value)}
                  className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="filter-ageing"
                  className="block text-[11px] font-semibold text-text-muted"
                >
                  4. Ageing Bucket
                </label>
                <select
                  id="filter-ageing"
                  data-testid="queue-filter-ageing"
                  value={ageingFilter}
                  onChange={(e) => setAgeingFilter(e.target.value)}
                  className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                >
                  <option value="ALL">All Buckets</option>
                  <option value="0-7d">0–7 Days</option>
                  <option value="8-15d">8–15 Days</option>
                  <option value="16-30d">16–30 Days</option>
                  <option value=">30d">&gt;30 Days</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-sla"
                  className="block text-[11px] font-semibold text-text-muted"
                >
                  5. SLA State
                </label>
                <select
                  id="filter-sla"
                  data-testid="queue-filter-sla"
                  value={slaFilter}
                  onChange={(e) => setSlaFilter(e.target.value)}
                  className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                >
                  <option value="ALL">All SLA States</option>
                  <option value="ON_TRACK">ON_TRACK</option>
                  <option value="DUE_SOON">DUE_SOON</option>
                  <option value="OVERDUE">OVERDUE</option>
                  <option value="PAUSED">PAUSED</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-officer"
                  className="block text-[11px] font-semibold text-text-muted"
                >
                  6. Assigned Officer
                </label>
                <select
                  id="filter-officer"
                  data-testid="queue-filter-officer"
                  value={officerFilter}
                  onChange={(e) => setOfficerFilter(e.target.value)}
                  className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                >
                  <option value="ALL">All Officers</option>
                  {ASSIGNABLE_OFFICERS.map((off) => (
                    <option key={off} value={off}>
                      {off}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Bulk Assignment Toolbar */}
          <section
            aria-label="Bulk Officer Assignment"
            className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-surface-sunken px-4 py-2.5 text-xs"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" aria-hidden="true" />
              <span className="font-semibold text-text-primary">
                Bulk Assignment ({selectedIds.length} selected)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="bulk-officer-select" className="sr-only">
                Assign to Officer
              </label>
              <select
                id="bulk-officer-select"
                data-testid="bulk-assign-select"
                value={targetOfficer}
                onChange={(e) => setTargetOfficer(e.target.value)}
                className="rounded-xs border border-border bg-surface-raised px-2.5 py-1 text-xs text-text-primary"
              >
                {ASSIGNABLE_OFFICERS.map((off) => (
                  <option key={off} value={off}>
                    {off}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="bulk-assign-btn"
                disabled={selectedIds.length === 0}
                onClick={handleBulkAssign}
                className="rounded-xs border border-brand bg-brand px-3 py-1 text-xs font-semibold text-brand-on disabled:opacity-40"
              >
                Assign Selected Dossiers
              </button>
            </div>
          </section>

          {bulkStatusBanner && (
            <div
              role="status"
              data-testid="bulk-assign-banner"
              className="rounded-xs border border-sla-on-track bg-surface-raised px-3.5 py-2 text-xs font-medium text-sla-on-track"
            >
              {bulkStatusBanner}
            </div>
          )}

          {/* Officer Queue Table */}
          <div className="overflow-x-auto rounded-sm border border-border bg-surface-raised">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all applications"
                      data-testid="select-all-checkbox"
                      checked={
                        applications.length > 0 &&
                        selectedIds.length === applications.length
                      }
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2.5">Application Ref</th>
                  <th className="px-3 py-2.5">Institution</th>
                  <th className="px-3 py-2.5">Region</th>
                  <th className="px-3 py-2.5">Stage</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Ageing</th>
                  <th className="px-3 py-2.5">SLA State</th>
                  <th className="px-3 py-2.5">Assigned Officer</th>
                  <th className="px-3 py-2.5">Version</th>
                  <th className="px-3 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    data-testid={`officer-queue-row-${app.applicationRef}`}
                    className="hover:bg-surface"
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={`Select ${app.applicationRef}`}
                        data-testid={`select-row-${app.applicationRef}`}
                        checked={selectedIds.includes(app.id)}
                        onChange={() => handleToggleRow(app.id)}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-brand">
                      {app.applicationRef}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-text-primary">
                        {locale === 'hi'
                          ? app.institutionNameHi
                          : app.institutionName}
                      </div>
                      <div className="font-mono text-[11px] text-text-muted">
                        {app.aictePermanentId} • {app.programStream}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold">
                      {app.regionCode}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold">
                      {app.stage}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusChip status={app.status} />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      {app.ageingBucket} ({app.ageDays}d)
                    </td>
                    <td className="px-3 py-2.5">
                      <SlaBadge state={app.slaState} detail={app.slaDetail} />
                    </td>
                    <td className="px-3 py-2.5 text-[11px]">
                      {app.assignedOfficer}
                    </td>
                    <td className="px-3 py-2.5 font-mono">v{app.version}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/applications/${app.id}`}
                        data-testid={`open-app-${app.applicationRef}`}
                        className="inline-flex items-center gap-1 rounded-xs border border-brand bg-surface px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-brand hover:text-brand-on"
                      >
                        <span>Evaluate / Act</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}

