import type { StatusVariant } from '@/components/ui/status-chip';
import type { SlaState } from '@/components/ui/sla-badge';

export interface RegulatoryApplicationRow {
  id: string;
  applicationRef: string;
  aictePermanentId: string;
  institutionName: string;
  institutionNameHi: string;
  regionCode: 'WRO' | 'NRO' | 'SRO' | 'ERO' | 'NWRO' | 'CRO';
  state: string;
  district: string;
  programType: string;
  academicYear: string;
  stage: 'SUBMISSION' | 'SCRUTINY' | 'EVC' | 'SAC_SHC' | 'FINAL_DECISION';
  status: StatusVariant;
  slaState: SlaState;
  slaDetail: string;
  submittedDate: string;
  intakeRequested: number;
}

export interface UndertakingConditionRow {
  id: string;
  undertakingRef: string;
  applicationRef: string;
  institutionName: string;
  conditionType: string;
  conditionTypeHi: string;
  requiredEvidenceTypes: string[];
  dueDate: string;
  status: StatusVariant;
  slaState: SlaState;
  slaDetail: string;
}

export interface TrackedDocumentRow {
  id: string;
  documentType: string;
  documentTypeHi: string;
  documentNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  status: StatusVariant;
  slaState: SlaState;
  slaDetail: string;
}

export interface AuditLedgerRow {
  id: string;
  timestamp: string;
  entityRef: string;
  actorName: string;
  actorRole: string;
  action: string;
  previousStatus: StatusVariant;
  newStatus: StatusVariant;
  rationale: string;
  sha256Excerpt: string;
}

export interface RegionalPendencyRow {
  regionCode: string;
  regionName: string;
  statesCovered: string;
  totalApplications: number;
  underScrutiny: number;
  evcPending: number;
  sacHearing: number;
  slaOverdueCount: number;
  slaDueSoonCount: number;
  slaStatus: SlaState;
}

export const DEMO_ROLE_ACCOUNTS = [
  {
    role: 'INSTITUTION' as const,
    label: 'Institution',
    labelHi: 'संस्थान',
    email: 'institution@aicte.gov.in',
    password: 'Password123!',
    personName: 'Dr. Arvind Kulkarni (Walchand College, Sangli)',
    regionBadge: 'WRO • Maharashtra',
  },
  {
    role: 'REGIONAL_OFFICER' as const,
    label: 'Regional Officer',
    labelHi: 'क्षेत्रीय अधिकारी',
    email: 'ro.western@aicte.gov.in',
    password: 'Password123!',
    personName: 'Dr. Suresh Patil (RO Western)',
    regionBadge: 'WRO • Western Region',
  },
  {
    role: 'BUREAU_OFFICER' as const,
    label: 'Bureau Officer',
    labelHi: 'ब्यूरो अधिकारी',
    email: 'bureau.officer@aicte.gov.in',
    password: 'Password123!',
    personName: 'Dr. Anita Deshmukh (Bureau Head)',
    regionBadge: 'HQ • Pan-India',
  },
  {
    role: 'COMMITTEE_MEMBER' as const,
    label: 'Committee Member',
    labelHi: 'समिति सदस्य',
    email: 'committee.member@aicte.gov.in',
    password: 'Password123!',
    personName: 'Prof. Vikram Rao (Scrutiny & EVC)',
    regionBadge: 'Expert Panel',
  },
  {
    role: 'ADMIN' as const,
    label: 'Admin',
    labelHi: 'प्रशासक',
    email: 'admin@aicte.gov.in',
    password: 'Password123!',
    personName: 'Dr. Rameshwar Prasad (Admin)',
    regionBadge: 'System Governance',
  },
];

export const REGULATORY_APPLICATIONS: RegulatoryApplicationRow[] = [
  {
    id: 'a104-wro-2026',
    applicationRef: 'APP-2026-WRO-00104',
    aictePermanentId: '1-2000000001',
    institutionName: 'Walchand College of Engineering, Sangli',
    institutionNameHi: 'वालचंद कॉलेज ऑफ इंजीनियरिंग, सांगली',
    regionCode: 'WRO',
    state: 'Maharashtra',
    district: 'Sangli',
    programType: 'Engineering & Technology (EoA + Intake)',
    academicYear: '2026-27',
    stage: 'SCRUTINY',
    status: 'UNDER_SCRUTINY',
    slaState: 'DUE_SOON',
    slaDetail: '2d 14h left',
    submittedDate: '2026-10-14',
    intakeRequested: 660,
  },
  {
    id: 'a108-wro-2026',
    applicationRef: 'APP-2026-WRO-00108',
    aictePermanentId: '1-2000000014',
    institutionName: 'Veermata Jijabai Technological Institute (VJTI), Mumbai',
    institutionNameHi: 'वीरमाता जीजाबाई टेक्नोलॉजिकल इंस्टीट्यूट, मुंबई',
    regionCode: 'WRO',
    state: 'Maharashtra',
    district: 'Mumbai City',
    programType: 'Engineering & Technology (EoA)',
    academicYear: '2026-27',
    stage: 'EVC',
    status: 'EVC_SCHEDULED',
    slaState: 'ON_TRACK',
    slaDetail: '9d left',
    submittedDate: '2026-10-08',
    intakeRequested: 840,
  },
  {
    id: 'a115-wro-2026',
    applicationRef: 'APP-2026-WRO-00115',
    aictePermanentId: '1-2000000029',
    institutionName: 'L.D. College of Engineering, Ahmedabad',
    institutionNameHi: 'एल.डी. कॉलेज ऑफ इंजीनियरिंग, अहमदाबाद',
    regionCode: 'WRO',
    state: 'Gujarat',
    district: 'Ahmedabad',
    programType: 'Engineering & Technology (New Course)',
    academicYear: '2026-27',
    stage: 'SCRUTINY',
    status: 'SCRUTINY_DEFICIENT',
    slaState: 'OVERDUE',
    slaDetail: '3d overdue',
    submittedDate: '2026-09-29',
    intakeRequested: 720,
  },
  {
    id: 'a121-wro-2026',
    applicationRef: 'APP-2026-WRO-00121',
    aictePermanentId: '1-2000000042',
    institutionName: 'College of Engineering Pune (COEP Technological University)',
    institutionNameHi: 'कॉलेज ऑफ इंजीनियरिंग पुणे (सीओईपी)',
    regionCode: 'WRO',
    state: 'Maharashtra',
    district: 'Pune',
    programType: 'Engineering & Technology (EoA)',
    academicYear: '2026-27',
    stage: 'FINAL_DECISION',
    status: 'APPROVED',
    slaState: 'ON_TRACK',
    slaDetail: 'Closed in 11d',
    submittedDate: '2026-09-18',
    intakeRequested: 960,
  },
  {
    id: 'a204-nro-2026',
    applicationRef: 'APP-2026-NRO-00204',
    aictePermanentId: '1-3000000002',
    institutionName: 'Harcourt Butler Technical University, Kanpur',
    institutionNameHi: 'हरकोर्ट बटलर प्राविधिक विश्वविद्यालय, कानपुर',
    regionCode: 'NRO',
    state: 'Uttar Pradesh',
    district: 'Kanpur Nagar',
    programType: 'Engineering & Technology (Increase Intake)',
    academicYear: '2026-27',
    stage: 'SAC_SHC',
    status: 'SAC_HEARING_SCHEDULED',
    slaState: 'PAUSED',
    slaDetail: 'Clock Paused (Appeal)',
    submittedDate: '2026-10-01',
    intakeRequested: 540,
  },
  {
    id: 'a309-sro-2026',
    applicationRef: 'APP-2026-SRO-00309',
    aictePermanentId: '1-4000000019',
    institutionName: 'PSG College of Technology, Coimbatore',
    institutionNameHi: 'पीएसजी कॉलेज ऑफ टेक्नोलॉजी, कोयंबटूर',
    regionCode: 'SRO',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    programType: 'Engineering & Management (EoA)',
    academicYear: '2026-27',
    stage: 'EVC',
    status: 'EVC_COMPLETED',
    slaState: 'ON_TRACK',
    slaDetail: '6d left',
    submittedDate: '2026-10-05',
    intakeRequested: 1020,
  },
  {
    id: 'a412-ero-2026',
    applicationRef: 'APP-2026-ERO-00412',
    aictePermanentId: '1-5000000008',
    institutionName: 'Jadavpur University Faculty of Engineering & Technology, Kolkata',
    institutionNameHi: 'जादवपुर विश्वविद्यालय अभियांत्रिकी संकाय, कोलकाता',
    regionCode: 'ERO',
    state: 'West Bengal',
    district: 'Kolkata',
    programType: 'Pharmacy & Engineering (EoA)',
    academicYear: '2026-27',
    stage: 'SCRUTINY',
    status: 'SCRUTINY_VERIFIED',
    slaState: 'ON_TRACK',
    slaDetail: '5d left',
    submittedDate: '2026-10-11',
    intakeRequested: 780,
  },
  {
    id: 'a518-cro-2026',
    applicationRef: 'APP-2026-CRO-00518',
    aictePermanentId: '1-6000000033',
    institutionName: 'Shri Govindram Seksaria Institute of Technology and Science, Indore',
    institutionNameHi: 'श्री गोविंदराम सेकसरिया प्रौद्योगिकी संस्थान, इंदौर',
    regionCode: 'CRO',
    state: 'Madhya Pradesh',
    district: 'Indore',
    programType: 'Engineering & Pharmacy (EoA)',
    academicYear: '2026-27',
    stage: 'SAC_SHC',
    status: 'SAC_RECOMMENDED',
    slaState: 'DUE_SOON',
    slaDetail: '1d 08h left',
    submittedDate: '2026-09-25',
    intakeRequested: 600,
  },
];

export const UNDERTAKING_CONDITIONS: UndertakingConditionRow[] = [
  {
    id: 'cond-01',
    undertakingRef: 'UND-2026-WRO-019',
    applicationRef: 'APP-2026-WRO-00104',
    institutionName: 'Walchand College of Engineering, Sangli',
    conditionType: 'Senior Professor Cadre Ratio Rectification (2 Appointments)',
    conditionTypeHi: 'वरिष्ठ प्राध्यापक कैडर अनुपात सुधार (2 नियुक्तियां)',
    requiredEvidenceTypes: ['Selection Committee Minutes', 'Joining Report & PAN Verification'],
    dueDate: '2026-11-15',
    status: 'PENDING',
    slaState: 'DUE_SOON',
    slaDetail: '16d left',
  },
  {
    id: 'cond-02',
    undertakingRef: 'UND-2026-WRO-022',
    applicationRef: 'APP-2026-WRO-00104',
    institutionName: 'Walchand College of Engineering, Sangli',
    conditionType: 'High-Voltage Power Electronics Lab Equipment Invoice & Geotagged Photo',
    conditionTypeHi: 'उच्च-वोल्टेज पावर इलेक्ट्रॉनिक्स प्रयोगशाला उपकरण चालान',
    requiredEvidenceTypes: ['GST Invoice', 'Stock Register Entry', 'EVC Geotagged Annex'],
    dueDate: '2026-10-25',
    status: 'OVERDUE',
    slaState: 'OVERDUE',
    slaDetail: '5d overdue',
  },
  {
    id: 'cond-03',
    undertakingRef: 'UND-2026-WRO-011',
    applicationRef: 'APP-2026-WRO-00108',
    institutionName: 'Veermata Jijabai Technological Institute (VJTI), Mumbai',
    conditionType: 'Barrier-Free Lift & Ramp Accessibility Compliance Certificate',
    conditionTypeHi: 'बाधा-मुक्त लिफ्ट एवं रैंप सुगम्यता प्रमाण-पत्र',
    requiredEvidenceTypes: ['PWD Executive Engineer Certificate'],
    dueDate: '2026-12-01',
    status: 'VERIFIED',
    slaState: 'ON_TRACK',
    slaDetail: 'Verified',
  },
];

export const TRACKED_DOCUMENTS: TrackedDocumentRow[] = [
  {
    id: 'doc-01',
    documentType: 'Registered Land Lease Deed (30-Year Statutory Minimum)',
    documentTypeHi: 'पंजीकृत भूमि पट्टा विलेख (30-वर्षीय वैधानिक न्यूनतम)',
    documentNumber: 'MH-SNG-LEASE-1998-4412',
    issuingAuthority: 'Sub-Registrar Office, Sangli District',
    issueDate: '1998-06-15',
    expiryDate: '2028-06-14',
    status: 'VERIFIED',
    slaState: 'ON_TRACK',
    slaDetail: 'Valid (19m left)',
  },
  {
    id: 'doc-02',
    documentType: 'Municipal Fire Safety & Hazard NOC',
    documentTypeHi: 'नगर निगम अग्नि सुरक्षा अनापत्ति प्रमाण-पत्र (NOC)',
    documentNumber: 'FIRE-NOC-SANGLI-2025-889',
    issuingAuthority: 'Chief Fire Officer, Sangli-Miraj-Kupwad Municipal Corp',
    issueDate: '2025-11-10',
    expiryDate: '2026-11-09',
    status: 'PENDING',
    slaState: 'DUE_SOON',
    slaDetail: 'Expires in 10d',
  },
  {
    id: 'doc-03',
    documentType: 'Joint Fixed Deposit Receipt (FDR) — Statutory Corpus',
    documentTypeHi: 'संयुक्त सावधि जमा रसीद (FDR) — वैधानिक कोष',
    documentNumber: 'SBI-FDR-00928174612',
    issuingAuthority: 'State Bank of India, Vishrambag Branch',
    issueDate: '2018-09-01',
    expiryDate: '2026-10-15',
    status: 'OVERDUE',
    slaState: 'OVERDUE',
    slaDetail: 'Expired 15d ago',
  },
];

export const REGIONAL_PENDENCY_SUMMARY: RegionalPendencyRow[] = [
  {
    regionCode: 'WRO',
    regionName: 'Western Region (Mumbai)',
    statesCovered: 'Maharashtra, Gujarat, Goa',
    totalApplications: 112,
    underScrutiny: 38,
    evcPending: 24,
    sacHearing: 9,
    slaOverdueCount: 4,
    slaDueSoonCount: 11,
    slaStatus: 'DUE_SOON',
  },
  {
    regionCode: 'NRO',
    regionName: 'Northern Region (Kanpur)',
    statesCovered: 'Uttar Pradesh, Uttarakhand',
    totalApplications: 98,
    underScrutiny: 31,
    evcPending: 19,
    sacHearing: 12,
    slaOverdueCount: 7,
    slaDueSoonCount: 9,
    slaStatus: 'OVERDUE',
  },
  {
    regionCode: 'SRO',
    regionName: 'Southern Region (Chennai)',
    statesCovered: 'Tamil Nadu, Puducherry',
    totalApplications: 104,
    underScrutiny: 29,
    evcPending: 21,
    sacHearing: 6,
    slaOverdueCount: 0,
    slaDueSoonCount: 5,
    slaStatus: 'ON_TRACK',
  },
  {
    regionCode: 'ERO',
    regionName: 'Eastern Region (Kolkata)',
    statesCovered: 'West Bengal, Bihar, Jharkhand, Odisha',
    totalApplications: 76,
    underScrutiny: 22,
    evcPending: 14,
    sacHearing: 5,
    slaOverdueCount: 1,
    slaDueSoonCount: 6,
    slaStatus: 'DUE_SOON',
  },
  {
    regionCode: 'NWRO',
    regionName: 'North-West Region (Chandigarh)',
    statesCovered: 'Delhi, Punjab, Haryana, HP, J&K',
    totalApplications: 64,
    underScrutiny: 18,
    evcPending: 12,
    sacHearing: 4,
    slaOverdueCount: 0,
    slaDueSoonCount: 3,
    slaStatus: 'ON_TRACK',
  },
  {
    regionCode: 'CRO',
    regionName: 'Central Region (Bhopal)',
    statesCovered: 'Madhya Pradesh, Chhattisgarh',
    totalApplications: 46,
    underScrutiny: 14,
    evcPending: 8,
    sacHearing: 4,
    slaOverdueCount: 0,
    slaDueSoonCount: 2,
    slaStatus: 'PAUSED',
  },
];

export const AUDIT_LEDGER_ENTRIES: AuditLedgerRow[] = [
  {
    id: 'aud-9921',
    timestamp: '2026-10-30 14:18:09 IST',
    entityRef: 'APP-2026-WRO-00121',
    actorName: 'Dr. Anita Deshmukh',
    actorRole: 'BUREAU_OFFICER',
    action: 'STATE_TRANSITION_APPROVED',
    previousStatus: 'SAC_RECOMMENDED',
    newStatus: 'APPROVED',
    rationale:
      'All EVC observations and faculty cadre ratio norms verified by SAC panel; EoA issued for AY 2026-27 with digital signature.',
    sha256Excerpt: '8f4c2e91...b73a10d4',
  },
  {
    id: 'aud-9920',
    timestamp: '2026-10-30 11:42:51 IST',
    entityRef: 'APP-2026-WRO-00115',
    actorName: 'Prof. Vikram Rao',
    actorRole: 'COMMITTEE_MEMBER',
    action: 'SCRUTINY_DEFICIENCY_RECORDED',
    previousStatus: 'UNDER_SCRUTINY',
    newStatus: 'SCRUTINY_DEFICIENT',
    rationale:
      'Occupancy Certificate for Block C (AI & Data Science wing) not attested by Municipal Competent Authority.',
    sha256Excerpt: '3d19a04c...e82f4419',
  },
  {
    id: 'aud-9919',
    timestamp: '2026-10-29 17:05:12 IST',
    entityRef: 'APP-2026-WRO-00108',
    actorName: 'Dr. Suresh Patil',
    actorRole: 'REGIONAL_OFFICER',
    action: 'EVC_INSPECTION_ALLOCATED',
    previousStatus: 'SCRUTINY_VERIFIED',
    newStatus: 'EVC_SCHEDULED',
    rationale:
      'Documentary scrutiny complete without deficiency; conflict-free 3-member EVC panel scheduled for physical visit.',
    sha256Excerpt: 'c71109fa...9012bc3e',
  },
];

export const SHELL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'SLA Breach Escalation (Level 1): APP-2026-WRO-00115',
    detail: 'L.D. College of Engineering scrutiny deficiency response overdue by 3 days.',
    time: '18 mins ago',
    sla: 'OVERDUE' as SlaState,
  },
  {
    id: 'notif-2',
    title: 'Fire Safety NOC Expiring in 10 Days',
    detail: 'Walchand College of Engineering, Sangli (FIRE-NOC-SANGLI-2025-889).',
    time: '2 hours ago',
    sla: 'DUE_SOON' as SlaState,
  },
  {
    id: 'notif-3',
    title: 'EVC Field Inspection Report Signed',
    detail: 'PSG College of Technology, Coimbatore (APP-2026-SRO-00309) ready for Bureau review.',
    time: '5 hours ago',
    sla: 'ON_TRACK' as SlaState,
  },
];

