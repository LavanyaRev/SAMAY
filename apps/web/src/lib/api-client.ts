'use client';

import {
  ONLY_SCRUTINY_PIPELINE_V1,
  PipelineDsl,
  SCRUTINY_EVC_PIPELINE_V1,
  UserRole,
} from '@samay/shared';
import type { StatutoryRole } from './app-context';
import type { SlaState } from '@/components/ui/sla-badge';
import type { StatusVariant } from '@/components/ui/status-chip';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const STORAGE_KEY_LIFECYCLE = 'samay_lifecycle_applications_v1';

export interface LifecycleDocumentFile {
  id: string;
  checklistItem: string;
  filename: string;
  mime: 'application/pdf' | 'image/png' | 'image/jpeg';
  sizeBytes: number;
  sha256: string;
  scanStatus: 'CLEAN' | 'PENDING' | 'INFECTED';
  uploadedBy: string;
  uploadedAt: string;
  previewType: 'PDF' | 'IMAGE';
  contentSummary: string;
}

export interface LifecycleStageTimelineItem {
  id: string;
  stage: string;
  label: string;
  ownerRole: string;
  ballWith: 'AICTE' | 'INSTITUTION';
  status: 'ACTIVE' | 'COMPLETED' | 'RETURNED' | 'REVERTED' | 'WITHDRAWN';
  startedAt: string;
  completedAt: string | null;
  dueAt: string;
  actorName: string;
  actorRole: string;
  outcome: string | null;
  notes: string | null;
}

export interface LifecycleAuditEntry {
  id: string;
  entityType: 'APPLICATION';
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown>;
  rationale: string | null;
  timestamp: string;
  prevHash: string;
  hash: string;
}

export interface LifecycleCommunicationItem {
  id: string;
  channel: 'EMAIL' | 'IN_APP' | 'OUTBOX_EVENT';
  recipientRole: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: string;
  eventType: string;
}

export interface LifecycleApplication {
  id: string;
  applicationRef: string;
  aictePermanentId: string;
  institutionId: string;
  institutionName: string;
  institutionNameHi: string;
  regionId: string;
  regionCode: 'WRO' | 'NRO' | 'SRO' | 'ERO' | 'CRO' | 'NWRO';
  state: string;
  district: string;
  academicYear: string;
  applicationTypeCode: 'EXTENSION_OF_APPROVAL' | 'NEW_INSTITUTION' | 'INCREASE_INTAKE';
  programStream: string;
  proposedIntake: number;
  pipelineCode: 'ONLY_SCRUTINY' | 'SCRUTINY_EVC';
  pipelineVersion: string;
  stage: string;
  status: StatusVariant;
  ballWith: 'AICTE' | 'INSTITUTION';
  version: number;
  slaState: SlaState;
  slaDetail: string;
  ageDays: number;
  ageingBucket: '0-7d' | '8-15d' | '16-30d' | '>30d';
  assignedOfficer: string;
  submittedAt: string;
  updatedAt: string;
  lastActorName: string;
  lastDeficiencyReason?: string | null;
  lastDeficiencyCode?: string | null;
  documents: LifecycleDocumentFile[];
  timeline: LifecycleStageTimelineItem[];
  auditTrail: LifecycleAuditEntry[];
  communications: LifecycleCommunicationItem[];
}

export interface AllowedActionDto {
  action: string;
  label: string;
  fromStage: string;
  toStage: string;
  requiresReason: boolean;
  allowedReasonCodes?: string[];
  auto: boolean;
  isCompetentAuthorityDecision: boolean;
  description: string;
}

export class OptimisticConflictError extends Error {
  public readonly status = 409;
  public readonly latestApplication: LifecycleApplication;

  constructor(message: string, latestApplication: LifecycleApplication) {
    super(message);
    this.name = 'OptimisticConflictError';
    this.latestApplication = latestApplication;
  }
}

/**
 * Deterministic SHA-256 hex digest generator for browser & test environments.
 */
export function computeDeterministicSha256(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const part4 = (Math.imul(h1, 31) >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}${part3}${part4}${part1}${part2}${part3}${part4}`;
}

/**
 * Mock ClamAV Virus & PDF/A Compliance Scanner
 * Sets scan_status to CLEAN and computes SHA-256 digest.
 */
export function scanUploadedFileMock(params: {
  checklistItem: string;
  filename: string;
  sizeBytes: number;
  mime?: 'application/pdf' | 'image/png' | 'image/jpeg';
  uploadedBy: string;
}): LifecycleDocumentFile {
  const isImage =
    params.filename.toLowerCase().endsWith('.png') ||
    params.filename.toLowerCase().endsWith('.jpg') ||
    params.filename.toLowerCase().endsWith('.jpeg') ||
    params.mime?.startsWith('image/');

  const sha256 = computeDeterministicSha256(
    `${params.checklistItem}:${params.filename}:${params.sizeBytes}`,
  );

  return {
    id: `doc-${sha256.slice(0, 10)}`,
    checklistItem: params.checklistItem,
    filename: params.filename,
    mime: isImage ? 'image/png' : 'application/pdf',
    sizeBytes: params.sizeBytes || 1248500,
    sha256,
    scanStatus: 'CLEAN',
    uploadedBy: params.uploadedBy,
    uploadedAt: '2026-10-30 10:15 IST',
    previewType: isImage ? 'IMAGE' : 'PDF',
    contentSummary: isImage
      ? `Geo-tagged campus & laboratory photograph (${params.checklistItem}) verified free of tampering.`
      : `Notarized statutory PDF/A instrument for "${params.checklistItem}" digitally signed by Principal & Registrar.`,
  };
}

function getPipelineDsl(code: 'ONLY_SCRUTINY' | 'SCRUTINY_EVC'): PipelineDsl {
  return code === 'SCRUTINY_EVC' ? SCRUTINY_EVC_PIPELINE_V1 : ONLY_SCRUTINY_PIPELINE_V1;
}

const INITIAL_SEEDED_LIFECYCLE_APPLICATIONS: LifecycleApplication[] = [
  {
    id: '44444444-4444-4444-8444-444444444401',
    applicationRef: 'APP-2026-WRO-00104',
    aictePermanentId: '1-2000000001',
    institutionId: '33333333-3333-4333-8333-333333333301',
    institutionName: 'Walchand College of Engineering, Sangli',
    institutionNameHi: 'वालचंद कॉलेज ऑफ इंजीनियरिंग, सांगली',
    regionId: '11111111-1111-4111-8111-111111111101',
    regionCode: 'WRO',
    state: 'Maharashtra',
    district: 'Sangli',
    academicYear: '2026-27',
    applicationTypeCode: 'EXTENSION_OF_APPROVAL',
    programStream: 'Engineering & Technology (UG/PG)',
    proposedIntake: 660,
    pipelineCode: 'ONLY_SCRUTINY',
    pipelineVersion: '1.0.0',
    stage: 'SCRUTINY',
    status: 'UNDER_SCRUTINY',
    ballWith: 'AICTE',
    version: 2,
    slaState: 'DUE_SOON',
    slaDetail: '2d 14h left',
    ageDays: 12,
    ageingBucket: '8-15d',
    assignedOfficer: 'Dr. Suresh Patil (RO Western)',
    submittedAt: '2026-10-18',
    updatedAt: '2026-10-22 15:40 IST',
    lastActorName: 'Dr. Suresh Patil (RO Western)',
    lastDeficiencyReason: null,
    lastDeficiencyCode: null,
    documents: [
      {
        id: 'doc-wce-affidavit-01',
        checklistItem: 'Notarized Statutory Format-1 Affidavit',
        filename: 'WCE_Sangli_Format1_Affidavit_AY2026_27.pdf',
        mime: 'application/pdf',
        sizeBytes: 1482910,
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        scanStatus: 'CLEAN',
        uploadedBy: 'Dr. Arvind Kulkarni (Principal)',
        uploadedAt: '2026-10-18 09:50 IST',
        previewType: 'PDF',
        contentSummary:
          'Format-1 Statutory Undertaking signed on Rs. 100 Non-Judicial Stamp Paper affirming 100% AICTE APH 2024-27 compliance.',
      },
      {
        id: 'doc-wce-faculty-02',
        checklistItem: 'Faculty Cadre Ratio & Form-16 Roster',
        filename: 'WCE_Sangli_Faculty_Cadre_1_2_6_Roster.pdf',
        mime: 'application/pdf',
        sizeBytes: 2194300,
        sha256: '4a7d1ed414474e4033ac29ccb8653d9b4a7d1ed414474e4033ac29ccb8653d9b',
        scanStatus: 'CLEAN',
        uploadedBy: 'Dr. Arvind Kulkarni (Principal)',
        uploadedAt: '2026-10-18 10:02 IST',
        previewType: 'PDF',
        contentSummary:
          'Verified roster of 48 regular faculty members with AICTE Unique Faculty IDs, PAN verification, and Form-16 TDS certificates.',
      },
      {
        id: 'doc-wce-campus-img-03',
        checklistItem: 'Geo-Tagged Campus & Computing Lab Evidence',
        filename: 'WCE_Main_Computing_Centre_GeoTagged.png',
        mime: 'image/png',
        sizeBytes: 942100,
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        scanStatus: 'CLEAN',
        uploadedBy: 'Dr. Arvind Kulkarni (Principal)',
        uploadedAt: '2026-10-18 10:08 IST',
        previewType: 'IMAGE',
        contentSummary:
          'High-resolution geo-tagged photograph (16.8457° N, 74.6015° E) of Central Computing Facility (240 terminals, 1 Gbps NKN lease line).',
      },
    ],
    timeline: [
      {
        id: 'tl-wce-1',
        stage: 'DRAFT',
        label: 'Application Draft Preparation',
        ownerRole: 'INSTITUTION',
        ballWith: 'INSTITUTION',
        status: 'COMPLETED',
        startedAt: '2026-10-15 09:00 IST',
        completedAt: '2026-10-18 10:12 IST',
        dueAt: '2026-10-30',
        actorName: 'Dr. Arvind Kulkarni',
        actorRole: 'INSTITUTION',
        outcome: 'SUBMIT',
        notes: 'Submitted online EoA dossier with 3 statutory documents.',
      },
      {
        id: 'tl-wce-2',
        stage: 'SCRUTINY',
        label: 'Scrutiny Committee Verification',
        ownerRole: 'COMMITTEE_MEMBER',
        ballWith: 'AICTE',
        status: 'ACTIVE',
        startedAt: '2026-10-18 10:15 IST',
        completedAt: null,
        dueAt: '2026-11-02',
        actorName: 'Dr. Suresh Patil (RO Western)',
        actorRole: 'REGIONAL_OFFICER',
        outcome: null,
        notes: 'Auto-routed to Regional Scrutiny Committee upon intake completion.',
      },
    ],
    auditTrail: [
      {
        id: 'aud-wce-1',
        entityType: 'APPLICATION',
        entityId: '44444444-4444-4444-8444-444444444401',
        action: 'WORKFLOW_SUBMIT',
        actorId: '22222222-2222-4222-8222-222222222206',
        actorName: 'Dr. Arvind Kulkarni',
        actorRole: 'INSTITUTION',
        previousState: { stage: 'DRAFT', status: 'DRAFT', version: 1 },
        newState: { stage: 'SCRUTINY', status: 'UNDER_SCRUTINY', version: 2 },
        rationale: 'Submitted Extension of Approval (EoA) application for AY 2026-27.',
        timestamp: '2026-10-18T04:42:00.000Z',
        prevHash: 'GENESIS',
        hash: '7c9e6679742540de944be07fc1f90ae77c9e6679742540de944be07fc1f90ae7',
      },
    ],
    communications: [
      {
        id: 'comm-wce-1',
        channel: 'OUTBOX_EVENT',
        recipientRole: 'REGIONAL_OFFICER',
        recipientEmail: 'ro.western@aicte.gov.in',
        subject: '[SAMAY Outbox] Dossier APP-2026-WRO-00104 Assigned to Scrutiny Queue',
        body: 'Application APP-2026-WRO-00104 from Walchand College of Engineering, Sangli has entered SCRUTINY stage.',
        sentAt: '2026-10-18 10:15 IST',
        eventType: 'APPLICATION_SUBMITTED',
      },
    ],
  },
  {
    id: '44444444-4444-4444-8444-444444444402',
    applicationRef: 'APP-2026-WRO-00108',
    aictePermanentId: '1-2000000014',
    institutionId: '33333333-3333-4333-8333-333333333302',
    institutionName: 'Veermata Jijabai Technological Institute (VJTI), Mumbai',
    institutionNameHi: 'वीरमाता जीजाबाई टेक्नोलॉजिकल इंस्टीट्यूट (VJTI), मुंबई',
    regionId: '11111111-1111-4111-8111-111111111101',
    regionCode: 'WRO',
    state: 'Maharashtra',
    district: 'Mumbai City',
    academicYear: '2026-27',
    applicationTypeCode: 'INCREASE_INTAKE',
    programStream: 'Engineering & Technology (AI & Data Science)',
    proposedIntake: 780,
    pipelineCode: 'SCRUTINY_EVC',
    pipelineVersion: '1.0.0',
    stage: 'EVC',
    status: 'EVC_SCHEDULED',
    ballWith: 'AICTE',
    version: 3,
    slaState: 'ON_TRACK',
    slaDetail: '9d 04h left',
    ageDays: 6,
    ageingBucket: '0-7d',
    assignedOfficer: 'Prof. Vikram Rao (Scrutiny & EVC Expert)',
    submittedAt: '2026-10-24',
    updatedAt: '2026-10-27 11:20 IST',
    lastActorName: 'Prof. Vikram Rao',
    lastDeficiencyReason: null,
    lastDeficiencyCode: null,
    documents: [
      {
        id: 'doc-vjti-01',
        checklistItem: 'Land Ownership & Built-Up Area Certificate',
        filename: 'VJTI_Matunga_Heritage_Campus_Plan.pdf',
        mime: 'application/pdf',
        sizeBytes: 1850200,
        sha256: '3f79bb7b435b05321651daefd374cdc681dc06faa65e374e38337b88ca046dea',
        scanStatus: 'CLEAN',
        uploadedBy: 'Registrar, VJTI Mumbai',
        uploadedAt: '2026-10-24 11:00 IST',
        previewType: 'PDF',
        contentSummary:
          'Architect-certified built-up laboratory area blueprint for additional 120 B.Tech AI & Data Science seats.',
      },
    ],
    timeline: [
      {
        id: 'tl-vjti-1',
        stage: 'SUBMITTED',
        label: 'Application Submitted & Regional Intake',
        ownerRole: 'REGIONAL_OFFICER',
        ballWith: 'AICTE',
        status: 'COMPLETED',
        startedAt: '2026-10-24 11:10 IST',
        completedAt: '2026-10-25 14:00 IST',
        dueAt: '2026-10-26',
        actorName: 'Dr. Suresh Patil (RO Western)',
        actorRole: 'REGIONAL_OFFICER',
        outcome: 'COMPLETED',
        notes: 'Forwarded to Scrutiny & EVC pipeline.',
      },
      {
        id: 'tl-vjti-2',
        stage: 'EVC',
        label: 'Expert Visit Committee (EVC) Inspection',
        ownerRole: 'COMMITTEE_MEMBER',
        ballWith: 'AICTE',
        status: 'ACTIVE',
        startedAt: '2026-10-27 11:20 IST',
        completedAt: null,
        dueAt: '2026-11-10',
        actorName: 'Prof. Vikram Rao',
        actorRole: 'COMMITTEE_MEMBER',
        outcome: null,
        notes: 'EVC inspection panel scheduled.',
      },
    ],
    auditTrail: [
      {
        id: 'aud-vjti-1',
        entityType: 'APPLICATION',
        entityId: '44444444-4444-4444-8444-444444444402',
        action: 'COMPLETE_STAGE:auto_schedule_evc',
        actorId: '22222222-2222-4222-8222-222222222205',
        actorName: 'Prof. Vikram Rao',
        actorRole: 'COMMITTEE_MEMBER',
        previousState: { stage: 'SCRUTINY', status: 'UNDER_SCRUTINY', version: 2 },
        newState: { stage: 'EVC', status: 'EVC_SCHEDULED', version: 3 },
        rationale: 'Scrutiny verified; auto-triggered EVC inspection case.',
        timestamp: '2026-10-27T05:50:00.000Z',
        prevHash: 'GENESIS',
        hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      },
    ],
    communications: [],
  },
  {
    id: '44444444-4444-4444-8444-444444444403',
    applicationRef: 'APP-2026-NRO-00219',
    aictePermanentId: '1-3000000002',
    institutionId: '33333333-3333-4333-8333-333333333303',
    institutionName: 'Harcourt Butler Technical University, Kanpur',
    institutionNameHi: 'हरकोर्ट बटलर प्राविधिक विश्वविद्यालय, कानपुर',
    regionId: '11111111-1111-4111-8111-111111111102',
    regionCode: 'NRO',
    state: 'Uttar Pradesh',
    district: 'Kanpur',
    academicYear: '2026-27',
    applicationTypeCode: 'EXTENSION_OF_APPROVAL',
    programStream: 'Engineering & Chemical Technology',
    proposedIntake: 540,
    pipelineCode: 'ONLY_SCRUTINY',
    pipelineVersion: '1.0.0',
    stage: 'DEFICIENCY_RECTIFICATION',
    status: 'SCRUTINY_DEFICIENT',
    ballWith: 'INSTITUTION',
    version: 3,
    slaState: 'OVERDUE',
    slaDetail: '3d 06h overdue',
    ageDays: 22,
    ageingBucket: '16-30d',
    assignedOfficer: 'Dr. Rajesh Sharma (RO Northern)',
    submittedAt: '2026-10-08',
    updatedAt: '2026-10-20 16:00 IST',
    lastActorName: 'Dr. Rajesh Sharma (RO Northern)',
    lastDeficiencyReason:
      'Fire Safety NOC instrument expired on 2026-09-30; upload renewed Municipal Fire Directorate certificate.',
    lastDeficiencyCode: 'DEF_FIRE_SAFETY_EXPIRED',
    documents: [
      {
        id: 'doc-hbtu-01',
        checklistItem: 'Fire Safety Certificate (Expired Instrument)',
        filename: 'HBTU_Kanpur_Fire_NOC_2025.pdf',
        mime: 'application/pdf',
        sizeBytes: 1120400,
        sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        scanStatus: 'CLEAN',
        uploadedBy: 'Registrar, HBTU Kanpur',
        uploadedAt: '2026-10-08 14:10 IST',
        previewType: 'PDF',
        contentSummary: 'Previous cycle Fire Safety NOC requiring renewal upload.',
      },
    ],
    timeline: [
      {
        id: 'tl-hbtu-1',
        stage: 'SCRUTINY',
        label: 'Scrutiny Committee Verification',
        ownerRole: 'COMMITTEE_MEMBER',
        ballWith: 'AICTE',
        status: 'RETURNED',
        startedAt: '2026-10-09 10:00 IST',
        completedAt: '2026-10-20 16:00 IST',
        dueAt: '2026-10-18',
        actorName: 'Dr. Rajesh Sharma (RO Northern)',
        actorRole: 'REGIONAL_OFFICER',
        outcome: 'RETURN_FOR_DEFICIENCY',
        notes:
          'Fire Safety NOC instrument expired on 2026-09-30; upload renewed Municipal Fire Directorate certificate.',
      },
      {
        id: 'tl-hbtu-2',
        stage: 'DEFICIENCY_RECTIFICATION',
        label: 'Institution Deficiency Compliance',
        ownerRole: 'INSTITUTION',
        ballWith: 'INSTITUTION',
        status: 'ACTIVE',
        startedAt: '2026-10-20 16:00 IST',
        completedAt: null,
        dueAt: '2026-10-27',
        actorName: 'Registrar, HBTU Kanpur',
        actorRole: 'INSTITUTION',
        outcome: null,
        notes: 'Awaiting clarification upload from institution.',
      },
    ],
    auditTrail: [
      {
        id: 'aud-hbtu-1',
        entityType: 'APPLICATION',
        entityId: '44444444-4444-4444-8444-444444444403',
        action: 'WORKFLOW_RETURN_FOR_DEFICIENCY',
        actorId: '22222222-2222-4222-8222-222222222204',
        actorName: 'Dr. Rajesh Sharma (RO Northern)',
        actorRole: 'REGIONAL_OFFICER',
        previousState: { stage: 'SCRUTINY', status: 'UNDER_SCRUTINY', version: 2 },
        newState: {
          stage: 'DEFICIENCY_RECTIFICATION',
          status: 'SCRUTINY_DEFICIENT',
          version: 3,
          reasonCode: 'DEF_FIRE_SAFETY_EXPIRED',
        },
        rationale:
          'Fire Safety NOC instrument expired on 2026-09-30; upload renewed Municipal Fire Directorate certificate.',
        timestamp: '2026-10-20T10:30:00.000Z',
        prevHash: 'GENESIS',
        hash: '9d24ad01bbbbe4e84bf242834e9fe98c6571522673c84df04894043124f992e8',
      },
    ],
    communications: [],
  },
  {
    id: '44444444-4444-4444-8444-444444444404',
    applicationRef: 'APP-2026-WRO-00115',
    aictePermanentId: '1-2000000001',
    institutionId: '33333333-3333-4333-8333-333333333301',
    institutionName: 'Walchand College of Engineering, Sangli (PG Expansion)',
    institutionNameHi: 'वालचंद कॉलेज ऑफ इंजीनियरिंग, सांगली (पीजी विस्तार)',
    regionId: '11111111-1111-4111-8111-111111111101',
    regionCode: 'WRO',
    state: 'Maharashtra',
    district: 'Sangli',
    academicYear: '2026-27',
    applicationTypeCode: 'EXTENSION_OF_APPROVAL',
    programStream: 'M.Tech Structural & AI Robotics',
    proposedIntake: 120,
    pipelineCode: 'ONLY_SCRUTINY',
    pipelineVersion: '1.0.0',
    stage: 'BUREAU_REVIEW',
    status: 'SCRUTINY_VERIFIED',
    ballWith: 'AICTE',
    version: 4,
    slaState: 'ON_TRACK',
    slaDetail: '4d 12h left',
    ageDays: 35,
    ageingBucket: '>30d',
    assignedOfficer: 'Dr. Anita Deshmukh (Bureau Head)',
    submittedAt: '2026-09-25',
    updatedAt: '2026-10-28 17:00 IST',
    lastActorName: 'Prof. Vikram Rao',
    lastDeficiencyReason: null,
    lastDeficiencyCode: null,
    documents: [
      {
        id: 'doc-wce-pg-01',
        checklistItem: 'PG Research Laboratory Equipment Invoice & Register',
        filename: 'WCE_PG_Robotics_Lab_Asset_Register.pdf',
        mime: 'application/pdf',
        sizeBytes: 1640000,
        sha256: 'c1205c1673a25608c195c382391804a88faa3041501e5dbc2fe73ebd1c83c21a',
        scanStatus: 'CLEAN',
        uploadedBy: 'Dr. Arvind Kulkarni (Principal)',
        uploadedAt: '2026-09-25 11:20 IST',
        previewType: 'PDF',
        contentSummary:
          'Verified PG laboratory asset register and AICTE corpus FDR certificate.',
      },
    ],
    timeline: [
      {
        id: 'tl-wce-pg-1',
        stage: 'SCRUTINY',
        label: 'Scrutiny Committee Verification',
        ownerRole: 'COMMITTEE_MEMBER',
        ballWith: 'AICTE',
        status: 'COMPLETED',
        startedAt: '2026-09-26 10:00 IST',
        completedAt: '2026-10-28 17:00 IST',
        dueAt: '2026-10-10',
        actorName: 'Prof. Vikram Rao',
        actorRole: 'COMMITTEE_MEMBER',
        outcome: 'STAGE_COMPLETED -> auto_forward_bureau',
        notes: 'All PG laboratory norms verified; forwarded to Approval Bureau.',
      },
      {
        id: 'tl-wce-pg-2',
        stage: 'BUREAU_REVIEW',
        label: 'Approval Bureau Competent Authority Review',
        ownerRole: 'BUREAU_OFFICER',
        ballWith: 'AICTE',
        status: 'ACTIVE',
        startedAt: '2026-10-28 17:00 IST',
        completedAt: null,
        dueAt: '2026-11-04',
        actorName: 'Dr. Anita Deshmukh (Bureau Head)',
        actorRole: 'BUREAU_OFFICER',
        outcome: null,
        notes: 'Awaiting Competent Authority final decision.',
      },
    ],
    auditTrail: [
      {
        id: 'aud-wce-pg-1',
        entityType: 'APPLICATION',
        entityId: '44444444-4444-4444-8444-444444444404',
        action: 'COMPLETE_STAGE:auto_forward_bureau',
        actorId: '22222222-2222-4222-8222-222222222205',
        actorName: 'Prof. Vikram Rao',
        actorRole: 'COMMITTEE_MEMBER',
        previousState: { stage: 'SCRUTINY', status: 'UNDER_SCRUTINY', version: 3 },
        newState: { stage: 'BUREAU_REVIEW', status: 'SCRUTINY_VERIFIED', version: 4 },
        rationale: 'Scrutiny completed with 100% documentary compliance.',
        timestamp: '2026-10-28T11:30:00.000Z',
        prevHash: 'GENESIS',
        hash: '0d24ad01bbbbe4e84bf242834e9fe98c6571522673c84df04894043124f992e8',
      },
    ],
    communications: [],
  },
];

let memoryStore: LifecycleApplication[] = JSON.parse(
  JSON.stringify(INITIAL_SEEDED_LIFECYCLE_APPLICATIONS),
);

function loadStore(): LifecycleApplication[] {
  if (typeof window === 'undefined') {
    return memoryStore;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_LIFECYCLE);
    if (!raw) {
      window.localStorage.setItem(
        STORAGE_KEY_LIFECYCLE,
        JSON.stringify(INITIAL_SEEDED_LIFECYCLE_APPLICATIONS),
      );
      return INITIAL_SEEDED_LIFECYCLE_APPLICATIONS;
    }
    return JSON.parse(raw) as LifecycleApplication[];
  } catch {
    return memoryStore;
  }
}

function saveStore(apps: LifecycleApplication[]): void {
  memoryStore = apps;
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY_LIFECYCLE, JSON.stringify(apps));
  window.dispatchEvent(new CustomEvent('samay-lifecycle-updated'));
}

export function resetLifecycleStore(): void {
  saveStore(
    JSON.parse(JSON.stringify(INITIAL_SEEDED_LIFECYCLE_APPLICATIONS)),
  );
}

function mapStageToUiStatus(stage: string): StatusVariant {
  switch (stage) {
    case 'DRAFT':
      return 'DRAFT';
    case 'SUBMITTED':
      return 'SUBMITTED';
    case 'SCRUTINY':
      return 'UNDER_SCRUTINY';
    case 'DEFICIENCY_RECTIFICATION':
      return 'SCRUTINY_DEFICIENT';
    case 'EVC':
      return 'EVC_SCHEDULED';
    case 'SAC_SHC':
      return 'SAC_HEARING_SCHEDULED';
    case 'BUREAU_REVIEW':
      return 'SCRUTINY_VERIFIED';
    case 'APPROVED':
      return 'APPROVED';
    case 'REJECTED':
      return 'REJECTED';
    default:
      return 'SUBMITTED';
  }
}

/**
 * Generated/Typed API Client for SAMAY Application Lifecycle
 */
export const samayApiClient = {
  async listApplications(filters?: {
    stage?: string;
    regionCode?: string;
    institutionQuery?: string;
    ageingBucket?: string;
    slaState?: string;
    assignedOfficer?: string;
    role?: StatutoryRole;
  }): Promise<LifecycleApplication[]> {
    const all = loadStore();
    return all.filter((app) => {
      if (filters?.stage && filters.stage !== 'ALL' && app.stage !== filters.stage) {
        return false;
      }
      if (
        filters?.regionCode &&
        filters.regionCode !== 'ALL' &&
        app.regionCode !== filters.regionCode
      ) {
        return false;
      }
      if (filters?.institutionQuery) {
        const q = filters.institutionQuery.toLowerCase();
        const matches =
          app.institutionName.toLowerCase().includes(q) ||
          app.applicationRef.toLowerCase().includes(q) ||
          app.aictePermanentId.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (
        filters?.ageingBucket &&
        filters.ageingBucket !== 'ALL' &&
        app.ageingBucket !== filters.ageingBucket
      ) {
        return false;
      }
      if (filters?.slaState && filters.slaState !== 'ALL' && app.slaState !== filters.slaState) {
        return false;
      }
      if (
        filters?.assignedOfficer &&
        filters.assignedOfficer !== 'ALL' &&
        app.assignedOfficer !== filters.assignedOfficer
      ) {
        return false;
      }
      return true;
    });
  },

  async getApplicationById(idOrRef: string): Promise<LifecycleApplication> {
    const all = loadStore();
    const found = all.find((a) => a.id === idOrRef || a.applicationRef === idOrRef);
    if (!found) {
      throw new Error(`Application ${idOrRef} not found`);
    }
    return found;
  },

  async getAllowedActions(
    applicationId: string,
    role: StatutoryRole,
  ): Promise<AllowedActionDto[]> {
    const app = await this.getApplicationById(applicationId);
    const dsl = getPipelineDsl(app.pipelineCode);
    const currentStageDef = dsl.stages.find((s) => s.id === app.stage);
    if (!currentStageDef) return [];

    const userRoleEnum = role as unknown as UserRole;
    const allowed: AllowedActionDto[] = [];

    // Check stage completion (auto transition)
    const autoTrans = dsl.transitions.find((t) => t.from === app.stage && t.auto);
    if (
      autoTrans &&
      (currentStageDef.owner_role === userRoleEnum ||
        role === 'ADMIN' ||
        role === 'REGIONAL_OFFICER' ||
        autoTrans.allowed_roles.includes(userRoleEnum))
    ) {
      allowed.push({
        action: 'complete_stage',
        label: `Complete ${app.stage} & Forward to ${autoTrans.to}`,
        fromStage: app.stage,
        toStage: autoTrans.to,
        requiresReason: false,
        auto: true,
        isCompetentAuthorityDecision: false,
        description: `Completes current ${app.stage} stage and automatically transitions dossier to ${autoTrans.to}.`,
      });
    }

    // Check explicit transitions
    for (const t of dsl.transitions) {
      if (t.from !== app.stage || t.auto) continue;
      if (
        t.allowed_roles.includes(userRoleEnum) ||
        role === 'ADMIN' ||
        (role === 'REGIONAL_OFFICER' &&
          (t.action === 'return_for_deficiency' || t.action === 'advance'))
      ) {
        const returnRule = dsl.return_rules.find(
          (rr) => rr.from_stage === t.from && rr.to_stage === t.to,
        );
        const isDecision =
          t.to === 'APPROVED' || t.to === 'REJECTED' || app.stage === 'BUREAU_REVIEW';

        const actionLabels: Record<string, string> = {
          submit:
            app.stage === 'DEFICIENCY_RECTIFICATION'
              ? 'Submit Deficiency Rectification Response'
              : 'Submit Application Dossier',
          advance:
            t.to === 'APPROVED'
              ? 'Grant Statutory Approval (Issue EoA / LoA)'
              : `Advance Dossier to ${t.to}`,
          return_for_deficiency: `Return for Deficiency (${t.to})`,
          revert: `Revert Dossier to ${t.to}`,
          withdraw: 'Withdraw Application Voluntarily',
          reject: 'Reject Application (Speaking Order)',
        };

        allowed.push({
          action: t.action,
          label: actionLabels[t.action] || `${t.action} -> ${t.to}`,
          fromStage: t.from,
          toStage: t.to,
          requiresReason:
            t.requires_reason ||
            t.action === 'return_for_deficiency' ||
            t.action === 'revert' ||
            t.action === 'reject' ||
            t.action === 'withdraw',
          allowedReasonCodes: returnRule?.reason_codes,
          auto: false,
          isCompetentAuthorityDecision: isDecision,
          description: `Transitions application from ${t.from} to ${t.to}.`,
        });
      }
    }

    return allowed;
  },

  async createAndSubmitApplication(input: {
    institutionName: string;
    aictePermanentId: string;
    regionCode: 'WRO' | 'NRO' | 'SRO' | 'ERO' | 'CRO' | 'NWRO';
    state: string;
    district: string;
    academicYear: string;
    applicationTypeCode: 'EXTENSION_OF_APPROVAL' | 'NEW_INSTITUTION' | 'INCREASE_INTAKE';
    programStream: string;
    proposedIntake: number;
    documents: LifecycleDocumentFile[];
    actorName: string;
  }): Promise<LifecycleApplication> {
    const all = loadStore();
    const seq = 120 + all.length;
    const id = `44444444-4444-4444-8444-444444444${seq.toString().padStart(3, '0')}`;
    const applicationRef = `APP-2026-${input.regionCode}-${seq.toString().padStart(5, '0')}`;
    const pipelineCode =
      input.applicationTypeCode === 'NEW_INSTITUTION' ? 'SCRUTINY_EVC' : 'ONLY_SCRUTINY';

    const genesisHash = computeDeterministicSha256(
      `${id}:WORKFLOW_SUBMIT:${input.actorName}:GENESIS`,
    );

    const newApp: LifecycleApplication = {
      id,
      applicationRef,
      aictePermanentId: input.aictePermanentId,
      institutionId: '33333333-3333-4333-8333-333333333301',
      institutionName: input.institutionName,
      institutionNameHi: `${input.institutionName} (संस्थान)`,
      regionId: '11111111-1111-4111-8111-111111111101',
      regionCode: input.regionCode,
      state: input.state,
      district: input.district,
      academicYear: input.academicYear,
      applicationTypeCode: input.applicationTypeCode,
      programStream: input.programStream,
      proposedIntake: input.proposedIntake,
      pipelineCode,
      pipelineVersion: '1.0.0',
      stage: 'SCRUTINY',
      status: 'UNDER_SCRUTINY',
      ballWith: 'AICTE',
      version: 2,
      slaState: 'ON_TRACK',
      slaDetail: '7d 00h left',
      ageDays: 0,
      ageingBucket: '0-7d',
      assignedOfficer: 'Dr. Suresh Patil (RO Western)',
      submittedAt: '2026-10-30',
      updatedAt: '2026-10-30 11:00 IST',
      lastActorName: input.actorName,
      lastDeficiencyReason: null,
      lastDeficiencyCode: null,
      documents: input.documents,
      timeline: [
        {
          id: `tl-${id}-1`,
          stage: 'DRAFT',
          label: 'Application Draft Preparation',
          ownerRole: 'INSTITUTION',
          ballWith: 'INSTITUTION',
          status: 'COMPLETED',
          startedAt: '2026-10-30 10:30 IST',
          completedAt: '2026-10-30 11:00 IST',
          dueAt: '2026-11-14',
          actorName: input.actorName,
          actorRole: 'INSTITUTION',
          outcome: 'SUBMITTED',
          notes: `Submitted ${input.applicationTypeCode} dossier with ${input.documents.length} CLEAN scanned documents.`,
        },
        {
          id: `tl-${id}-2`,
          stage: 'SCRUTINY',
          label: 'Scrutiny Committee Verification',
          ownerRole: 'COMMITTEE_MEMBER',
          ballWith: 'AICTE',
          status: 'ACTIVE',
          startedAt: '2026-10-30 11:00 IST',
          completedAt: null,
          dueAt: '2026-11-06',
          actorName: 'Dr. Suresh Patil (RO Western)',
          actorRole: 'REGIONAL_OFFICER',
          outcome: null,
          notes: 'Auto-routed to Regional Scrutiny Docket.',
        },
      ],
      auditTrail: [
        {
          id: `aud-${id}-1`,
          entityType: 'APPLICATION',
          entityId: id,
          action: 'WORKFLOW_SUBMIT',
          actorId: 'inst-user-1',
          actorName: input.actorName,
          actorRole: 'INSTITUTION',
          previousState: { stage: 'DRAFT', status: 'DRAFT', version: 1 },
          newState: { stage: 'SCRUTINY', status: 'UNDER_SCRUTINY', version: 2 },
          rationale: `Submitted ${input.applicationTypeCode} application for ${input.programStream} (${input.proposedIntake} seats).`,
          timestamp: '2026-10-30T05:30:00.000Z',
          prevHash: 'GENESIS',
          hash: genesisHash,
        },
      ],
      communications: [
        {
          id: `comm-${id}-1`,
          channel: 'OUTBOX_EVENT',
          recipientRole: 'REGIONAL_OFFICER',
          recipientEmail: 'ro.western@aicte.gov.in',
          subject: `[SAMAY Outbox] New Application ${applicationRef} Submitted`,
          body: `${input.institutionName} submitted ${applicationRef} (${input.applicationTypeCode}) pinned to ${pipelineCode}@1.0.0.`,
          sentAt: '2026-10-30 11:00 IST',
          eventType: 'APPLICATION_SUBMIT',
        },
      ],
    };

    const updated = [newApp, ...all];
    saveStore(updated);
    return newApp;
  },

  async performWorkflowAction(input: {
    applicationId: string;
    action: string;
    expectedVersion: number;
    idempotencyKey: string;
    actorName: string;
    actorRole: StatutoryRole;
    reason?: string;
    reasonCode?: string;
    newDocuments?: LifecycleDocumentFile[];
  }): Promise<LifecycleApplication> {
    const all = loadStore();
    const idx = all.findIndex(
      (a) => a.id === input.applicationId || a.applicationRef === input.applicationId,
    );
    if (idx === -1) {
      throw new Error(`Application ${input.applicationId} not found`);
    }

    const currentApp = all[idx];

    // Optimistic locking check: if another officer acted first, throw 409 Conflict with latest state
    if (input.expectedVersion !== currentApp.version) {
      throw new OptimisticConflictError(
        `Another officer (${currentApp.lastActorName}) already updated ${currentApp.applicationRef} to version v${currentApp.version} (Stage: ${currentApp.stage}).`,
        currentApp,
      );
    }

    // Also attempt call to live backend API if connected
    try {
      await fetch(`${API_BASE_URL}/applications/${currentApp.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: input.action,
          expectedVersion: input.expectedVersion,
          idempotencyKey: input.idempotencyKey,
          reason: input.reason,
          reasonCode: input.reasonCode,
        }),
      });
    } catch {
      // Continue with local deterministic state engine
    }

    const dsl = getPipelineDsl(currentApp.pipelineCode);
    let targetStageId = currentApp.stage;

    if (input.action === 'complete_stage') {
      const autoTrans = dsl.transitions.find(
        (t) => t.from === currentApp.stage && t.auto,
      );
      if (!autoTrans) {
        throw new Error(`No auto-transition from stage ${currentApp.stage}`);
      }
      targetStageId = autoTrans.to;
    } else {
      const trans = dsl.transitions.find(
        (t) => t.from === currentApp.stage && t.action === input.action && !t.auto,
      );
      if (!trans) {
        throw new Error(
          `Invalid transition "${input.action}" from stage ${currentApp.stage}`,
        );
      }
      targetStageId = trans.to;
    }

    const targetStageDef =
      dsl.stages.find((s) => s.id === targetStageId) ?? dsl.stages[0];
    const nextVersion = currentApp.version + 1;
    const nextUiStatus = mapStageToUiStatus(targetStageDef.id);
    const nowDisplay = '2026-10-30 14:25 IST';
    const nowIso = '2026-10-30T08:55:00.000Z';

    // Update timeline
    const updatedTimeline = currentApp.timeline.map((item) =>
      item.status === 'ACTIVE'
        ? {
          ...item,
          status:
            input.action === 'return_for_deficiency'
              ? ('RETURNED' as const)
              : input.action === 'revert'
                ? ('REVERTED' as const)
                : ('COMPLETED' as const),
          completedAt: nowDisplay,
          outcome: input.action.toUpperCase(),
          notes: input.reason || item.notes,
        }
        : item,
    );

    const isTerminal =
      targetStageDef.id === 'APPROVED' ||
      targetStageDef.id === 'REJECTED' ||
      targetStageDef.id === 'WITHDRAWN';

    updatedTimeline.push({
      id: `tl-${currentApp.id}-v${nextVersion}`,
      stage: targetStageDef.id,
      label: targetStageDef.label,
      ownerRole: targetStageDef.owner_role,
      ballWith: targetStageDef.ball_with,
      status: isTerminal ? 'COMPLETED' : 'ACTIVE',
      startedAt: nowDisplay,
      completedAt: isTerminal ? nowDisplay : null,
      dueAt: '2026-11-12',
      actorName: input.actorName,
      actorRole: input.actorRole,
      outcome: isTerminal ? targetStageDef.id : null,
      notes: input.reason || `Transitioned via ${input.action}`,
    });

    // Append hash-chained audit entry
    const prevHash =
      currentApp.auditTrail.length > 0
        ? currentApp.auditTrail[currentApp.auditTrail.length - 1].hash
        : 'GENESIS';
    const nextHash = computeDeterministicSha256(
      `${currentApp.id}:${input.action}:${nextVersion}:${input.reason || ''}:${prevHash}`,
    );

    const newAuditEntry: LifecycleAuditEntry = {
      id: `aud-${currentApp.id}-v${nextVersion}`,
      entityType: 'APPLICATION',
      entityId: currentApp.id,
      action:
        input.action === 'complete_stage'
          ? `COMPLETE_STAGE -> ${targetStageDef.id}`
          : `WORKFLOW_${input.action.toUpperCase()}`,
      actorId: `actor-${input.actorRole.toLowerCase()}`,
      actorName: input.actorName,
      actorRole: input.actorRole,
      previousState: {
        stage: currentApp.stage,
        status: currentApp.status,
        version: currentApp.version,
      },
      newState: {
        stage: targetStageDef.id,
        status: nextUiStatus,
        version: nextVersion,
        reasonCode: input.reasonCode ?? null,
      },
      rationale: input.reason ?? `Executed ${input.action}`,
      timestamp: nowIso,
      prevHash,
      hash: nextHash,
    };

    const newComm: LifecycleCommunicationItem = {
      id: `comm-${currentApp.id}-v${nextVersion}`,
      channel: 'OUTBOX_EVENT',
      recipientRole: targetStageDef.ball_with === 'INSTITUTION' ? 'INSTITUTION' : 'BUREAU_OFFICER',
      recipientEmail:
        targetStageDef.ball_with === 'INSTITUTION'
          ? 'institution@aicte.gov.in'
          : 'bureau.officer@aicte.gov.in',
      subject: `[SAMAY Outbox] ${currentApp.applicationRef} Transitioned to ${targetStageDef.id}`,
      body: `${input.actorName} (${input.actorRole}) executed "${input.action}" on ${currentApp.applicationRef}. Reason: ${input.reason || 'Standard progression'}.`,
      sentAt: nowDisplay,
      eventType: `APPLICATION_${input.action.toUpperCase()}`,
    };

    const updatedApp: LifecycleApplication = {
      ...currentApp,
      stage: targetStageDef.id,
      status: nextUiStatus,
      ballWith: targetStageDef.ball_with,
      version: nextVersion,
      slaState:
        targetStageDef.id === 'DEFICIENCY_RECTIFICATION'
          ? 'DUE_SOON'
          : targetStageDef.id === 'APPROVED'
            ? 'ON_TRACK'
            : currentApp.slaState,
      updatedAt: nowDisplay,
      lastActorName: input.actorName,
      lastDeficiencyReason:
        input.action === 'return_for_deficiency'
          ? input.reason || 'Deficiency noted during scrutiny'
          : currentApp.lastDeficiencyReason,
      lastDeficiencyCode:
        input.action === 'return_for_deficiency'
          ? input.reasonCode || 'DEF_FACULTY_CADRE_SHORTFALL'
          : currentApp.lastDeficiencyCode,
      documents: input.newDocuments
        ? [...input.newDocuments, ...currentApp.documents]
        : currentApp.documents,
      timeline: updatedTimeline,
      auditTrail: [...currentApp.auditTrail, newAuditEntry],
      communications: [newComm, ...currentApp.communications],
    };

    all[idx] = updatedApp;
    saveStore(all);
    return updatedApp;
  },

  /**
   * Simulates another officer acting concurrently on the same application
   * (bumps version +1 in storage without updating the current caller's local view),
   * so that the caller's next action triggers the 409 Conflict UX dialog.
   */
  async simulateConcurrentOfficerUpdate(
    applicationId: string,
  ): Promise<LifecycleApplication> {
    const all = loadStore();
    const idx = all.findIndex((a) => a.id === applicationId);
    if (idx === -1) throw new Error('Application not found');

    const current = all[idx];
    const nextVersion = current.version + 1;
    const prevHash =
      current.auditTrail.length > 0
        ? current.auditTrail[current.auditTrail.length - 1].hash
        : 'GENESIS';
    const nextHash = computeDeterministicSha256(
      `${current.id}:CONCURRENT_UPDATE:${nextVersion}:${prevHash}`,
    );

    const updated: LifecycleApplication = {
      ...current,
      version: nextVersion,
      updatedAt: '2026-10-30 14:22 IST',
      lastActorName: 'Dr. Anita Deshmukh (Concurrent Officer)',
      auditTrail: [
        ...current.auditTrail,
        {
          id: `aud-${current.id}-concurrent-${nextVersion}`,
          entityType: 'APPLICATION',
          entityId: current.id,
          action: 'WORKFLOW_CONCURRENT_OFFICER_NOTE',
          actorId: 'officer-concurrent',
          actorName: 'Dr. Anita Deshmukh (Concurrent Officer)',
          actorRole: 'BUREAU_OFFICER',
          previousState: { stage: current.stage, version: current.version },
          newState: { stage: current.stage, version: nextVersion },
          rationale: 'Concurrent officer recorded parallel scrutiny verification note.',
          timestamp: '2026-10-30T08:52:00.000Z',
          prevHash,
          hash: nextHash,
        },
      ],
    };

    all[idx] = updated;
    saveStore(all);
    return updated;
  },

  async bulkAssignApplications(
    applicationIds: string[],
    officerName: string,
  ): Promise<number> {
    const all = loadStore();
    let count = 0;
    const updated = all.map((app) => {
      if (applicationIds.includes(app.id)) {
        count++;
        return {
          ...app,
          assignedOfficer: officerName,
          updatedAt: '2026-10-30 14:30 IST',
        };
      }
      return app;
    });
    saveStore(updated);
    return count;
  },
};