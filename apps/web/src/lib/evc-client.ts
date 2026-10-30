/**
 * Phase 7: Expert Visit Committee (EVC) Module Client & Deterministic State Store (`apps/web`)
 */

export type EvcCaseStatus =
  | "QUEUED"
  | "PANEL_PROPOSED"
  | "SCHEDULED"
  | "VISIT_DONE"
  | "REPORT_SUBMITTED"
  | "REPORT_ACCEPTED"
  | "DEFERRED"
  | "CANCELLED";

export const STATUTORY_EVC_COMMITTEE_NOTICE_EN =
  "Inspection findings are decided by the committee";
export const STATUTORY_EVC_COMMITTEE_NOTICE_HI =
  "निरीक्षण के निष्कर्ष समिति द्वारा तय किए जाते हैं";

export interface EvcExpertMemberItem {
  expertUserId: string;
  fullName: string;
  role: "CHAIRPERSON" | "MEMBER" | "CONVENER";
  designation: string;
  region: string;
  parentInstitutionName: string;
  trustOrSociety: string;
  expertiseTags: string[];
  availableDates: string[];
  activeWorkloadCount: number;
  maxWorkloadCap: number;
}

export interface CoiRejectionItem {
  expertUserId: string;
  fullName: string;
  parentInstitutionName: string;
  trustOrSociety: string;
  conflictType:
    | "SAME_INSTITUTION"
    | "SAME_TRUST_OR_SOCIETY"
    | "PRIOR_ASSOCIATION_LIST";
  reason: string;
  ruleCited: string;
}

export interface EvcPanelItem {
  id: string;
  panelCode: string;
  region: string;
  members: EvcExpertMemberItem[];
  expertiseTags: string[];
  availability: string[];
  totalWorkloadScore: number;
  expertiseMatchScore: number;
  compositeRankScore: number;
  classification: "ADVISORY";
  rationaleSummary: string;
  coiClearanceSummary: string;
}

export interface EvcAlertLogItem {
  id: string;
  caseId: string;
  applicationRef: string;
  institutionName: string;
  alertKind:
    | "EVC_APPROACHING"
    | "EVC_UNSCHEDULED_BEYOND_THRESHOLD"
    | "EVC_VISIT_DONE_REPORT_OVERDUE";
  escalationLevel: 0 | 1 | 2 | 3;
  eventKey: string;
  description: string;
  firedAt: string;
}

export interface EvcCaseItem {
  id: string;
  caseNumber: string;
  applicationId: string;
  applicationRef: string;
  institutionId: string;
  institutionName: string;
  trustOrSociety: string;
  region: string;
  programStream: string;
  isNewInstitution: boolean;
  requiredExpertiseTags: string[];
  status: EvcCaseStatus;
  workflowStage: "EVC" | "SAC_SHC";
  schedulingDueAt: string;
  completionDueAt: string;
  schedulingDueStatus: "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "CLOSED";
  completionDueStatus: "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "CLOSED";
  proposedPanels: EvcPanelItem[];
  rejectedExperts: CoiRejectionItem[];
  confirmedPanel: EvcPanelItem | null;
  confirmedByRole: string | null;
  confirmedAt: string | null;
  scheduledDate: string | null;
  rescheduleHistory: Array<{
    previousDate: string;
    newDate: string;
    reason: string;
    actorRole: string;
    rescheduledAt: string;
  }>;
  visitDoneAt: string | null;
  reportGraceDueAt: string | null;
  visitReport: {
    reportFileId: string;
    summary: string;
    observations: string[];
    infrastructureVerified: boolean;
    facultyVerified: boolean;
    submittedAt: string;
    statutoryNotice: string;
  } | null;
}

const SAMPLE_PROPOSED_PANELS: EvcPanelItem[] = [
  {
    id: "pnl-wro-01",
    panelCode: "EVC-PNL-WRO-01",
    region: "WRO",
    members: [
      {
        expertUserId: "exp-wro-clean-1",
        fullName: "Prof. Raghunath Kashyap",
        role: "CHAIRPERSON",
        designation: "Senior Professor, IIT Bombay",
        region: "WRO",
        parentInstitutionName: "Indian Institute of Technology Bombay",
        trustOrSociety: "Ministry of Education Autonomous IIT",
        expertiseTags: ["ENGINEERING_TECHNOLOGY", "AI_DS", "INFRASTRUCTURE"],
        availableDates: ["2026-05-12", "2026-05-14", "2026-05-18"],
        activeWorkloadCount: 1,
        maxWorkloadCap: 4,
      },
      {
        expertUserId: "exp-wro-clean-2",
        fullName: "Dr. Meenakshi Nadkarni",
        role: "MEMBER",
        designation: "Head of AI & Data Science, VNIT Nagpur",
        region: "WRO",
        parentInstitutionName: "Visvesvaraya National Institute of Technology",
        trustOrSociety: "NIT Council India",
        expertiseTags: ["ENGINEERING_TECHNOLOGY", "AI_DS", "COMPUTING_LABS"],
        availableDates: ["2026-05-12", "2026-05-14", "2026-05-18"],
        activeWorkloadCount: 0,
        maxWorkloadCap: 4,
      },
      {
        expertUserId: "exp-wro-clean-3",
        fullName: "Prof. Harishchandra Sawant",
        role: "CONVENER",
        designation: "Professor of Civil & Infrastructure, Sardar Patel CE",
        region: "WRO",
        parentInstitutionName: "Sardar Patel College of Engineering, Mumbai",
        trustOrSociety: "Bharatiya Vidya Bhavan",
        expertiseTags: ["ENGINEERING_TECHNOLOGY", "INFRASTRUCTURE"],
        availableDates: ["2026-05-12", "2026-05-14", "2026-05-18"],
        activeWorkloadCount: 1,
        maxWorkloadCap: 4,
      },
    ],
    expertiseTags: [
      "ENGINEERING_TECHNOLOGY",
      "AI_DS",
      "INFRASTRUCTURE",
      "COMPUTING_LABS",
    ],
    availability: ["2026-05-12", "2026-05-14", "2026-05-18"],
    totalWorkloadScore: 85,
    expertiseMatchScore: 100,
    compositeRankScore: 93,
    classification: "ADVISORY",
    rationaleSummary:
      "ADVISORY Proposal #1: Lowest combined active workload (2/12 cases) and 100% expertise tag coverage for AI & DS and Infrastructure.",
    coiClearanceSummary:
      "Zero Conflicts of Interest: Independent of applicant institution, parent trust, and prior-association registry (3 conflicting experts excluded).",
  },
  {
    id: "pnl-wro-02",
    panelCode: "EVC-PNL-WRO-02",
    region: "WRO",
    members: [
      {
        expertUserId: "exp-wro-clean-4",
        fullName: "Prof. Devendra Chitale",
        role: "CHAIRPERSON",
        designation: "Professor Emeritus, SVNIT Surat",
        region: "WRO",
        parentInstitutionName: "SVNIT Surat",
        trustOrSociety: "NIT Council India",
        expertiseTags: ["ENGINEERING_TECHNOLOGY", "AI_DS"],
        availableDates: ["2026-05-14", "2026-05-20"],
        activeWorkloadCount: 3,
        maxWorkloadCap: 4,
      },
      {
        expertUserId: "exp-wro-clean-5",
        fullName: "Dr. Sunita Borgaonkar",
        role: "MEMBER",
        designation: "Associate Professor, GEC Goa",
        region: "WRO",
        parentInstitutionName: "Goa College of Engineering",
        trustOrSociety: "Directorate of Technical Education Goa",
        expertiseTags: ["ENGINEERING_TECHNOLOGY", "COMPUTING_LABS"],
        availableDates: ["2026-05-14", "2026-05-20"],
        activeWorkloadCount: 2,
        maxWorkloadCap: 4,
      },
      {
        expertUserId: "exp-wro-clean-6",
        fullName: "Dr. Nilesh Kadam",
        role: "CONVENER",
        designation: "Professor, KJSCE Mumbai",
        region: "WRO",
        parentInstitutionName: "KJ Somaiya College of Engineering",
        trustOrSociety: "Somaiya Vidyavihar Trust",
        expertiseTags: ["ENGINEERING_TECHNOLOGY", "INFRASTRUCTURE"],
        availableDates: ["2026-05-14", "2026-05-20"],
        activeWorkloadCount: 2,
        maxWorkloadCap: 4,
      },
    ],
    expertiseTags: [
      "ENGINEERING_TECHNOLOGY",
      "AI_DS",
      "COMPUTING_LABS",
      "INFRASTRUCTURE",
    ],
    availability: ["2026-05-14", "2026-05-20"],
    totalWorkloadScore: 55,
    expertiseMatchScore: 100,
    compositeRankScore: 78,
    classification: "ADVISORY",
    rationaleSummary:
      "ADVISORY Proposal #2: Secondary regional backup panel (higher active workload: 7/12 cases across members).",
    coiClearanceSummary:
      "Zero Conflicts of Interest: Independent of applicant institution, parent trust, and prior-association registry.",
  },
];

const SAMPLE_REJECTED_COI_EXPERTS: CoiRejectionItem[] = [
  {
    expertUserId: "exp-wro-coi-inst",
    fullName: "Prof. Milind Joshi",
    parentInstitutionName: "Walchand College of Engineering, Sangli",
    trustOrSociety: "Maharashtra Technical Education Society",
    conflictType: "SAME_INSTITUTION",
    reason:
      "Disqualified: Expert belongs to applicant institution (Walchand College of Engineering, Sangli).",
    ruleCited: "RULE-EVC-COI-SAME-INSTITUTION (TODO(APH-VERIFY))",
  },
  {
    expertUserId: "exp-wro-coi-trust",
    fullName: "Dr. Vandana Gokhale",
    parentInstitutionName: "SPM Institute of Information Technology, Pune",
    trustOrSociety: "Shikshan Prasarak Mandal, Pune",
    conflictType: "SAME_TRUST_OR_SOCIETY",
    reason:
      "Disqualified: Expert's parent body shares the same Trust/Society (Shikshan Prasarak Mandal, Pune).",
    ruleCited: "RULE-EVC-COI-SAME-TRUST-SOCIETY (TODO(APH-VERIFY))",
  },
  {
    expertUserId: "exp-wro-coi-prior",
    fullName: "Prof. Shrikant Bapat",
    parentInstitutionName: "VJTI Mumbai",
    trustOrSociety: "VJTI Autonomous Board",
    conflictType: "PRIOR_ASSOCIATION_LIST",
    reason:
      "Disqualified: Expert appears on the configurable prior-association registry (Former Visiting Faculty & BoG Nominee 2023-25).",
    ruleCited: "RULE-EVC-COI-PRIOR-ASSOCIATION (TODO(APH-VERIFY))",
  },
];

function buildInitialEvcCases(): EvcCaseItem[] {
  const baseCases: EvcCaseItem[] = [
    {
      id: "evc-case-001",
      caseNumber: "EVC-2026-001",
      applicationId: "44444444-4444-4444-8444-444444444501",
      applicationRef: "APP-2026-WRO-EVC-001",
      institutionId: "inst-new-pune-ai",
      institutionName:
        "Pune Institute of AI & Emerging Tech (New Institution)",
      trustOrSociety: "Shikshan Prasarak Mandal, Pune",
      region: "WRO",
      programStream: "B.Tech Artificial Intelligence & Data Science",
      isNewInstitution: true,
      requiredExpertiseTags: [
        "ENGINEERING_TECHNOLOGY",
        "AI_DS",
        "INFRASTRUCTURE",
      ],
      status: "PANEL_PROPOSED",
      workflowStage: "EVC",
      schedulingDueAt: "2026-05-11",
      completionDueAt: "2026-05-20",
      schedulingDueStatus: "OVERDUE",
      completionDueStatus: "DUE_SOON",
      proposedPanels: JSON.parse(JSON.stringify(SAMPLE_PROPOSED_PANELS)),
      rejectedExperts: JSON.parse(JSON.stringify(SAMPLE_REJECTED_COI_EXPERTS)),
      confirmedPanel: null,
      confirmedByRole: null,
      confirmedAt: null,
      scheduledDate: null,
      rescheduleHistory: [],
      visitDoneAt: null,
      reportGraceDueAt: null,
      visitReport: null,
    },
    {
      id: "evc-case-002",
      caseNumber: "EVC-2026-002",
      applicationId: "44444444-4444-4444-8444-444444444502",
      applicationRef: "APP-2026-WRO-EVC-002",
      institutionId: "inst-wce-sangli",
      institutionName: "Walchand College of Engineering, Sangli",
      trustOrSociety: "Maharashtra Technical Education Society",
      region: "WRO",
      programStream: "M.Tech High Voltage & Power Systems",
      isNewInstitution: false,
      requiredExpertiseTags: [
        "ENGINEERING_TECHNOLOGY",
        "HIGH_VOLTAGE_LAB",
        "INFRASTRUCTURE",
      ],
      status: "SCHEDULED",
      workflowStage: "EVC",
      schedulingDueAt: "2026-05-18",
      completionDueAt: "2026-06-02",
      schedulingDueStatus: "CLOSED",
      completionDueStatus: "ON_TRACK",
      proposedPanels: JSON.parse(JSON.stringify(SAMPLE_PROPOSED_PANELS)),
      rejectedExperts: JSON.parse(JSON.stringify(SAMPLE_REJECTED_COI_EXPERTS)),
      confirmedPanel: SAMPLE_PROPOSED_PANELS[0],
      confirmedByRole: "REGIONAL_OFFICER",
      confirmedAt: "2026-05-08T10:30:00+05:30",
      scheduledDate: "2026-05-14",
      rescheduleHistory: [],
      visitDoneAt: null,
      reportGraceDueAt: null,
      visitReport: null,
    },
    {
      id: "evc-case-003",
      caseNumber: "EVC-2026-003",
      applicationId: "44444444-4444-4444-8444-444444444503",
      applicationRef: "APP-2026-NRO-EVC-003",
      institutionId: "inst-hbtu-kanpur",
      institutionName: "Harcourt Butler Technical University, Kanpur",
      trustOrSociety: "UP State Technical University Board",
      region: "NRO",
      programStream: "B.Tech Robotics & Cyber-Physical Systems",
      isNewInstitution: true,
      requiredExpertiseTags: [
        "ENGINEERING_TECHNOLOGY",
        "AI_DS",
        "COMPUTING_LABS",
      ],
      status: "VISIT_DONE",
      workflowStage: "EVC",
      schedulingDueAt: "2026-05-08",
      completionDueAt: "2026-05-19",
      schedulingDueStatus: "CLOSED",
      completionDueStatus: "OVERDUE",
      proposedPanels: JSON.parse(JSON.stringify(SAMPLE_PROPOSED_PANELS)),
      rejectedExperts: JSON.parse(JSON.stringify(SAMPLE_REJECTED_COI_EXPERTS)),
      confirmedPanel: SAMPLE_PROPOSED_PANELS[0],
      confirmedByRole: "REGIONAL_OFFICER",
      confirmedAt: "2026-05-06T11:00:00+05:30",
      scheduledDate: "2026-05-12",
      rescheduleHistory: [],
      visitDoneAt: "2026-05-12T17:00:00+05:30",
      reportGraceDueAt: "2026-05-14",
      visitReport: null,
    },
    {
      id: "evc-case-004",
      caseNumber: "EVC-2026-004",
      applicationId: "44444444-4444-4444-8444-444444444504",
      applicationRef: "APP-2026-SRO-EVC-004",
      institutionId: "inst-psg-coimbatore",
      institutionName: "PSG College of Technology, Coimbatore",
      trustOrSociety: "PSG & Sons Charities Trust",
      region: "SRO",
      programStream: "B.Tech Semiconductor & VLSI Design",
      isNewInstitution: false,
      requiredExpertiseTags: ["ENGINEERING_TECHNOLOGY", "INFRASTRUCTURE"],
      status: "REPORT_ACCEPTED",
      workflowStage: "SAC_SHC",
      schedulingDueAt: "2026-05-07",
      completionDueAt: "2026-05-18",
      schedulingDueStatus: "CLOSED",
      completionDueStatus: "CLOSED",
      proposedPanels: JSON.parse(JSON.stringify(SAMPLE_PROPOSED_PANELS)),
      rejectedExperts: JSON.parse(JSON.stringify(SAMPLE_REJECTED_COI_EXPERTS)),
      confirmedPanel: SAMPLE_PROPOSED_PANELS[0],
      confirmedByRole: "REGIONAL_OFFICER",
      confirmedAt: "2026-05-05T14:00:00+05:30",
      scheduledDate: "2026-05-09",
      rescheduleHistory: [],
      visitDoneAt: "2026-05-09T16:30:00+05:30",
      reportGraceDueAt: "2026-05-13",
      visitReport: {
        reportFileId: "DOC-EVC-REPORT-PSG-004.pdf",
        summary:
          "Cleanroom fabrication lab and faculty qualifications verified.",
        observations: [
          "Class-1000 cleanroom operational",
          "18 PhD faculty verified",
        ],
        infrastructureVerified: true,
        facultyVerified: true,
        submittedAt: "2026-05-10T11:20:00+05:30",
        statutoryNotice: STATUTORY_EVC_COMMITTEE_NOTICE_EN,
      },
    },
    {
      id: "evc-case-005",
      caseNumber: "EVC-2026-005",
      applicationId: "44444444-4444-4444-8444-444444444505",
      applicationRef: "APP-2026-ERO-EVC-005",
      institutionId: "inst-ju-kolkata",
      institutionName: "Jadavpur University Faculty of Engg, Kolkata",
      trustOrSociety: "West Bengal Higher Education Council",
      region: "ERO",
      programStream: "M.Tech Renewable Energy Grids",
      isNewInstitution: false,
      requiredExpertiseTags: ["ENGINEERING_TECHNOLOGY", "INFRASTRUCTURE"],
      status: "QUEUED",
      workflowStage: "EVC",
      schedulingDueAt: "2026-05-18",
      completionDueAt: "2026-06-02",
      schedulingDueStatus: "ON_TRACK",
      completionDueStatus: "ON_TRACK",
      proposedPanels: [],
      rejectedExperts: [],
      confirmedPanel: null,
      confirmedByRole: null,
      confirmedAt: null,
      scheduledDate: null,
      rescheduleHistory: [],
      visitDoneAt: null,
      reportGraceDueAt: null,
      visitReport: null,
    },
    {
      id: "evc-case-006",
      caseNumber: "EVC-2026-006",
      applicationId: "44444444-4444-4444-8444-444444444506",
      applicationRef: "APP-2026-CRO-EVC-006",
      institutionId: "inst-sgsits-indore",
      institutionName: "SGSITS Indore, Madhya Pradesh",
      trustOrSociety: "SGSITS Autonomous Trust",
      region: "CRO",
      programStream: "B.Tech Industrial Internet of Things",
      isNewInstitution: true,
      requiredExpertiseTags: ["ENGINEERING_TECHNOLOGY", "AI_DS"],
      status: "DEFERRED",
      workflowStage: "EVC",
      schedulingDueAt: "2026-05-15",
      completionDueAt: "2026-05-25",
      schedulingDueStatus: "DUE_SOON",
      completionDueStatus: "ON_TRACK",
      proposedPanels: JSON.parse(JSON.stringify(SAMPLE_PROPOSED_PANELS)),
      rejectedExperts: JSON.parse(JSON.stringify(SAMPLE_REJECTED_COI_EXPERTS)),
      confirmedPanel: null,
      confirmedByRole: null,
      confirmedAt: null,
      scheduledDate: "2026-05-22",
      rescheduleHistory: [],
      visitDoneAt: null,
      reportGraceDueAt: null,
      visitReport: null,
    },
  ];

  return baseCases;
}

const INITIAL_ALERTS: EvcAlertLogItem[] = [
  {
    id: "evc-al-1",
    caseId: "evc-case-001",
    applicationRef: "APP-2026-WRO-EVC-001",
    institutionName: "Pune Institute of AI & Emerging Tech (New Institution)",
    alertKind: "EVC_UNSCHEDULED_BEYOND_THRESHOLD",
    escalationLevel: 1,
    eventKey: "EVC_CASE:evc-case-001:UNSCHEDULED_L1",
    description:
      "Unscheduled beyond NEW_INSTITUTION 5-working-day threshold -> Escalated to Level 1 (Regional Officer)",
    firedAt: "2026-05-12T09:00:00+05:30",
  },
  {
    id: "evc-al-2",
    caseId: "evc-case-002",
    applicationRef: "APP-2026-WRO-EVC-002",
    institutionName: "Walchand College of Engineering, Sangli",
    alertKind: "EVC_APPROACHING",
    escalationLevel: 0,
    eventKey: "EVC_CASE:evc-case-002:APPROACHING_T_MINUS_1",
    description:
      "EVC visit approaching on 2026-05-14 (1d remaining). Reminder dispatched to Panel & Institution.",
    firedAt: "2026-05-13T09:00:00+05:30",
  },
  {
    id: "evc-al-3",
    caseId: "evc-case-003",
    applicationRef: "APP-2026-NRO-EVC-003",
    institutionName: "Harcourt Butler Technical University, Kanpur",
    alertKind: "EVC_VISIT_DONE_REPORT_OVERDUE",
    escalationLevel: 2,
    eventKey: "EVC_CASE:evc-case-003:REPORT_OVERDUE_L2",
    description:
      "Visit completed on 2026-05-12 but report not submitted (+3d past grace deadline) -> Escalated to Level 2 (Approval Bureau)",
    firedAt: "2026-05-15T09:00:00+05:30",
  },
];

interface EvcStoreState {
  cases: EvcCaseItem[];
  alerts: EvcAlertLogItem[];
}

const memoryStore: EvcStoreState = {
  cases: buildInitialEvcCases(),
  alerts: [...INITIAL_ALERTS],
};

const listeners = new Set<() => void>();
function emitChange() {
  for (const fn of listeners) fn();
}

export function subscribeEvcStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getEvcSnapshot(): EvcStoreState {
  return memoryStore;
}

export function proposePanelsForEvcCase(caseId: string): EvcCaseItem | null {
  const c = memoryStore.cases.find((item) => item.id === caseId);
  if (!c) return null;
  c.proposedPanels = JSON.parse(JSON.stringify(SAMPLE_PROPOSED_PANELS));
  c.rejectedExperts = JSON.parse(JSON.stringify(SAMPLE_REJECTED_COI_EXPERTS));
  c.status = "PANEL_PROPOSED";
  emitChange();
  return c;
}

export function confirmEvcPanelAndDate(
  caseId: string,
  panelId: string,
  scheduledDate: string,
  actorRole: string,
): EvcCaseItem | null {
  const c = memoryStore.cases.find((item) => item.id === caseId);
  if (!c) return null;
  const pnl =
    c.proposedPanels.find((p) => p.id === panelId) ||
    c.proposedPanels[0] ||
    SAMPLE_PROPOSED_PANELS[0];
  c.confirmedPanel = pnl;
  c.confirmedByRole = actorRole;
  c.confirmedAt = "2026-05-15T10:00:00+05:30";
  c.scheduledDate = scheduledDate;
  c.status = "SCHEDULED";
  c.schedulingDueStatus = "CLOSED";
  emitChange();
  return c;
}

export function rescheduleEvcCase(
  caseId: string,
  newDate: string,
  reason: string,
  actorRole: string,
): EvcCaseItem | null {
  const c = memoryStore.cases.find((item) => item.id === caseId);
  if (!c || !reason.trim()) return null;
  const prev = c.scheduledDate || c.schedulingDueAt;
  c.rescheduleHistory.push({
    previousDate: prev,
    newDate,
    reason: reason.trim(),
    actorRole,
    rescheduledAt: "2026-05-15T11:00:00+05:30",
  });
  c.scheduledDate = newDate;
  c.completionDueAt = "2026-05-28";
  c.status = "SCHEDULED";
  emitChange();
  return c;
}

export function markEvcVisitDone(caseId: string): EvcCaseItem | null {
  const c = memoryStore.cases.find((item) => item.id === caseId);
  if (!c) return null;
  c.status = "VISIT_DONE";
  c.visitDoneAt = "2026-05-15T16:00:00+05:30";
  c.reportGraceDueAt = "2026-05-18";
  emitChange();
  return c;
}

export function submitEvcVisitReportAndAdvanceStage(
  caseId: string,
  input: {
    reportFileId: string;
    summary: string;
    observations: string[];
  },
): EvcCaseItem | null {
  const c = memoryStore.cases.find((item) => item.id === caseId);
  if (!c) return null;
  c.visitReport = {
    reportFileId: input.reportFileId,
    summary: input.summary,
    observations: input.observations,
    infrastructureVerified: true,
    facultyVerified: true,
    submittedAt: "2026-05-15T17:30:00+05:30",
    statutoryNotice: STATUTORY_EVC_COMMITTEE_NOTICE_EN,
  };
  c.status = "REPORT_ACCEPTED";
  c.workflowStage = "SAC_SHC";
  c.completionDueStatus = "CLOSED";
  emitChange();
  return c;
}

