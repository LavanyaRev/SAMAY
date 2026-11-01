"use client";

import {
  AphApplicationCategory,
  AphWorkflowRoute,
  type AphWorkflowPlan,
  type AphWorkflowEvaluationInput,
  evaluateAphWorkflow,
  type StatutoryPolicyRecord,
  STATUTORY_POLICIES_SEED,
  getStatutoryPolicy,
  analyzeDocumentAgainstAph,
  type AphClauseIntelligenceResult,
  CommitteeHearingStatus,
  DeficiencyVerificationStatus,
  type GranularDeficiencyItem,
  PaymentMode,
  type SacAppealCase,
  ScnHearingStatus,
  ScnOutcomeStatus,
  type ShcHearingCase,
  type ShowCauseNoticeRecord,
  type SupportingEvidenceBinding,
  type TerPaymentRecord,
  TerPaymentStatus,
  type UndertakingFulfillmentRecord,
  UndertakingStatusTag,
} from "@samay/shared";
import { webClock } from "./clock";

export type ApplicationStage =
  "SUBMISSION" | "SCRUTINY" | "EVC" | "SAC_SHC" | "BUREAU_REVIEW" | "APPROVAL";

export interface RegulatoryApplication {
  currentQueue?: string;
  ballWith?: string;
  id: string;
  ref: string;
  instName: string;
  instId: string;
  location: string;
  affiliatingUniv: string;
  regionalDesk: string;
  type: string;
  academicYear: string;
  program: string;
  intake: number;
  submittedOn: string;
  stage: ApplicationStage;
  stageLabel: string;
  status: string;
  statusPillClass: string;
  nextAction: string;
  nextActionHref?: string;
  hasDeficiency: boolean;
  deficiencyMemo?: string;
  deficiencyDeadline?: string;
  undertakingsCompleted: number;
  undertakingsTotal: number;
  evcDate?: string;
  evcPanelLead?: string;
  breachLevel?: "L1" | "L2" | "L3" | "NONE";
  breachDays?: number;
  assignedOfficer: string;
  feeReceived: string;
  orderIssuedDate?: string;
  // Module 1: Dynamic Configurable APH Workflow
  aphCategory: AphApplicationCategory;
  route: AphWorkflowRoute;
  routeLabel: string;
  // Module 5: Bound Payment
  payment?: TerPaymentRecord;
}

export interface RegulatoryUndertaking {
  id: string;
  appRef: string;
  condition: string;
  detail: string;
  evidence: string;
  signedDetail: string;
  isVerified: boolean;
  isPendingScrutiny: boolean;
  needsAttention: boolean;
  actionText?: string;
  validUntil?: string;
  uploadedAt?: string;
}

export interface RegulatoryValidityRecord {
  id: string;
  docName: string;
  ref: string;
  expiresOn: string;
  timeLeft: string;
  owner: string;
  practicalStep: string;
  isExpired?: boolean;
  isWarning?: boolean;
  actionText: string;
  actionHref?: string;
  isReceiptDownload?: boolean;
}

export interface RegulatoryPolicy {
  id: string;
  stage: string;
  slaDays: string;
  roles: string;
  fee: string;
  escalation: string;
  referenceClause: string;
  updatedAt: string;
}

export interface RegulatoryAuditRow {
  index: number;
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  targetRef?: string;
  rationale?: string;
  prevHash: string;
  hash: string;
}

const DEFAULT_APPLICATIONS: RegulatoryApplication[] = [
  {
    id: "app-1042",
    ref: "EOA-2027-1042",
    instName: "Sahyadri Institute of Technology",
    instId: "1-DEMO-4102",
    location: "Haveli, Pune, Maharashtra",
    affiliatingUniv: "Savitribai Phule Pune University",
    regionalDesk: "WRO · R. Kulkarni",
    type: "Extension of Approval",
    academicYear: "2027–28",
    program: "UG Engineering",
    intake: 480,
    submittedOn: "20 Oct 2026",
    stage: "SCRUTINY",
    stageLabel: "Scrutiny",
    status: "SCRUTINY_DEFICIENT",
    currentQueue: "INSTITUTION_ACTION",
    ballWith: "INSTITUTION",
    statusPillClass: "text-[#D32F2F] font-semibold",
    nextAction: "Resolve by 06 Nov →",
    nextActionHref: "/institution/undertakings",
    hasDeficiency: true,
    deficiencyMemo: "WRO/1042/D1",
    deficiencyDeadline: "06 Nov 2026, 17:00 IST",
    undertakingsCompleted: 6,
    undertakingsTotal: 8,
    assignedOfficer: "R. Kulkarni",
    feeReceived: "₹1,00,000",
    aphCategory: AphApplicationCategory.EOA_SELF_DISCLOSURE,
    route: AphWorkflowRoute.ROUTE_5_CONDITIONAL_PROCESSING,
    routeLabel: "Route 5: Conditional Processing (Deficiency Branch)",
    payment: {
      txnId: "TXN-2027-1042",
      gatewayTxnId: "TER-TXN-2027-9842103",
      applicationRef: "EOA-2027-1042",
      purpose: "Extension of Approval (EoA) Annual Fee",
      amountRupees: 100000,
      paymentMode: PaymentMode.BHIM_UPI,
      status: TerPaymentStatus.PAYMENT_VERIFIED,
      initiatedAt: "20 Oct 2026, 11:30 IST",
      verifiedAt: "20 Oct 2026, 11:32 IST",
      reconciliationReceiptUrl: "/receipts/TER-TXN-2027-9842103.pdf",
    },
  },
  {
    id: "app-1086",
    ref: "EOA-2027-1086",
    instName: "Konkan Technical College",
    instId: "1-DEMO-4109",
    location: "Ratnagiri, Maharashtra",
    affiliatingUniv: "Mumbai University",
    regionalDesk: "WRO · N. Shah",
    type: "Extension of Approval",
    academicYear: "2027–28",
    program: "UG Engineering",
    intake: 360,
    submittedOn: "22 Oct 2026",
    stage: "EVC",
    stageLabel: "EVC Inspection",
    status: "EVC allocation ready",
    currentQueue: "REGIONAL_EVC_QUEUE",
    ballWith: "REGIONAL_OFFICER",
    statusPillClass: "text-[#EC642A] font-semibold",
    nextAction: "Confirm panel →",
    nextActionHref: "/regional/evc",
    hasDeficiency: false,
    undertakingsCompleted: 8,
    undertakingsTotal: 8,
    evcDate: "05 Nov 2026",
    evcPanelLead: "Dr. K. Verma",
    assignedOfficer: "N. Shah",
    feeReceived: "₹1,00,000",
    aphCategory: AphApplicationCategory.COURSE_VARIATION_INTAKE,
    route: AphWorkflowRoute.ROUTE_2_SCRUTINY_EVC,
    routeLabel: "Route 2: Scrutiny + EVC Inspection",
    payment: {
      txnId: "TXN-2027-1086",
      gatewayTxnId: "TER-TXN-2027-9842109",
      applicationRef: "EOA-2027-1086",
      purpose: "EoA Processing + Inspection Fee",
      amountRupees: 175000,
      paymentMode: PaymentMode.NET_BANKING,
      status: TerPaymentStatus.PAYMENT_VERIFIED,
      initiatedAt: "22 Oct 2026, 14:10 IST",
      verifiedAt: "22 Oct 2026, 14:15 IST",
    },
  },
  {
    id: "app-1128",
    ref: "LOA-2027-1128",
    instName: "Narmada Polytechnic",
    instId: "1-DEMO-4182",
    location: "Bharuch, Gujarat",
    affiliatingUniv: "Gujarat Technological University",
    regionalDesk: "WRO · R. Kulkarni",
    type: "New Programme",
    academicYear: "2027–28",
    program: "Diploma Engineering",
    intake: 300,
    submittedOn: "24 Oct 2026",
    stage: "SCRUTINY",
    stageLabel: "Scrutiny",
    status: "SUBMITTED",
    currentQueue: "REGIONAL_SCRUTINY",
    ballWith: "REGIONAL_OFFICER",
    statusPillClass: "text-[#2E7D32] font-semibold",
    nextAction: "Assign EVC →",
    nextActionHref: "/regional/evc",
    hasDeficiency: false,
    undertakingsCompleted: 8,
    undertakingsTotal: 8,
    assignedOfficer: "R. Kulkarni",
    feeReceived: "₹1,50,000",
    aphCategory: AphApplicationCategory.NEW_INSTITUTION,
    route: AphWorkflowRoute.ROUTE_2_SCRUTINY_EVC,
    routeLabel: "Route 2: Scrutiny + EVC Inspection",
    payment: {
      txnId: "TXN-2027-1128",
      gatewayTxnId: "TER-TXN-2027-9842182",
      applicationRef: "LOA-2027-1128",
      purpose: "New Programme Processing Fee",
      amountRupees: 150000,
      paymentMode: PaymentMode.RTGS_NEFT,
      status: TerPaymentStatus.PAYMENT_VERIFIED,
      initiatedAt: "24 Oct 2026, 09:45 IST",
      verifiedAt: "24 Oct 2026, 10:00 IST",
    },
  },
  {
    id: "app-1017",
    ref: "EOA-2027-1017",
    instName: "Vidarbha Engineering",
    instId: "1-DEMO-4011",
    location: "Nagpur, Maharashtra",
    affiliatingUniv: "RTM Nagpur University",
    regionalDesk: "WRO · P. Joshi",
    type: "Extension of Approval",
    academicYear: "2027–28",
    program: "UG Engineering",
    intake: 420,
    submittedOn: "12 Oct 2026",
    stage: "SAC_SHC",
    stageLabel: "SAC Appeal Hearing",
    status: "UNDER_APPEAL",
    currentQueue: "COMMITTEE_BENCH",
    ballWith: "COMMITTEE",
    statusPillClass: "text-[#D32F2F] font-bold",
    nextAction: "Escalate to HQ →",
    nextActionHref: "/bureau/escalations",
    hasDeficiency: true,
    breachLevel: "L3",
    breachDays: 32,
    undertakingsCompleted: 6,
    undertakingsTotal: 8,
    assignedOfficer: "P. Joshi",
    feeReceived: "₹1,00,000",
    aphCategory: AphApplicationCategory.EOA_SELF_DISCLOSURE,
    route: AphWorkflowRoute.ROUTE_3_SCRUTINY_EVC_SAC_SHC,
    routeLabel: "Route 3: Scrutiny + EVC + SAC/SHC Full Ladder",
    payment: {
      txnId: "TXN-2027-1017",
      gatewayTxnId: "TER-TXN-2027-9840111",
      applicationRef: "EOA-2027-1017",
      purpose: "EoA Processing + SAC Appeal Fee",
      amountRupees: 150000,
      paymentMode: PaymentMode.BHIM_UPI,
      status: TerPaymentStatus.PAYMENT_VERIFIED,
      initiatedAt: "12 Oct 2026, 16:20 IST",
      verifiedAt: "12 Oct 2026, 16:22 IST",
    },
  },
  {
    id: "app-1104",
    ref: "EOA-2027-1104",
    instName: "Coastal Institute",
    instId: "1-DEMO-4120",
    location: "Panaji, Goa",
    affiliatingUniv: "Goa University",
    regionalDesk: "WRO · N. Shah",
    type: "Extension of Approval",
    academicYear: "2027–28",
    program: "UG Engineering & Architecture",
    intake: 240,
    submittedOn: "18 Oct 2026",
    stage: "SAC_SHC",
    stageLabel: "SHC Hearing Scheduled",
    status: "HEARING_SCHEDULED",
    currentQueue: "COMMITTEE_BENCH",
    ballWith: "COMMITTEE",
    statusPillClass: "text-[#FAAA21] font-semibold",
    nextAction: "Review hearing docket →",
    nextActionHref: "/committee/shc",
    hasDeficiency: true,
    breachLevel: "L2",
    breachDays: 24,
    undertakingsCompleted: 7,
    undertakingsTotal: 8,
    assignedOfficer: "N. Shah",
    feeReceived: "₹1,00,000",
    aphCategory: AphApplicationCategory.EOA_SELF_DISCLOSURE,
    route: AphWorkflowRoute.ROUTE_5_CONDITIONAL_PROCESSING,
    routeLabel: "Route 5: Conditional Processing & Hearing",
    payment: {
      txnId: "TXN-2027-1104",
      gatewayTxnId: "TER-TXN-2027-9841104",
      applicationRef: "EOA-2027-1104",
      purpose: "EoA Regulatory Processing Fee",
      amountRupees: 100000,
      paymentMode: PaymentMode.NET_BANKING,
      status: TerPaymentStatus.PAYMENT_COMPLETED,
      initiatedAt: "18 Oct 2026, 11:00 IST",
    },
  },
  {
    id: "app-1183",
    ref: "LOA-2027-1183",
    instName: "Deccan School of Design",
    instId: "1-DEMO-4299",
    location: "Kolhapur, Maharashtra",
    affiliatingUniv: "Shivaji University",
    regionalDesk: "WRO · P. Joshi",
    type: "New Programme",
    academicYear: "2027–28",
    program: "B.Des (Design)",
    intake: 120,
    submittedOn: "28 Oct 2026",
    stage: "SCRUTINY",
    stageLabel: "Scrutiny",
    status: "SUBMITTED",
    currentQueue: "REGIONAL_SCRUTINY",
    ballWith: "REGIONAL_OFFICER",
    statusPillClass: "text-[#EC642A] font-semibold",
    nextAction: "Verify records →",
    nextActionHref: "/regional/scrutiny",
    hasDeficiency: false,
    undertakingsCompleted: 8,
    undertakingsTotal: 8,
    assignedOfficer: "P. Joshi",
    feeReceived: "₹1,00,000",
    aphCategory: AphApplicationCategory.COURSE_VARIATION_INTAKE,
    route: AphWorkflowRoute.ROUTE_1_ONLY_SCRUTINY,
    routeLabel: "Route 1: Only Scrutiny Evaluation",
    payment: {
      txnId: "TXN-2027-1183",
      gatewayTxnId: "TER-TXN-2027-9844299",
      applicationRef: "LOA-2027-1183",
      purpose: "Design Faculty Expansion Fee",
      amountRupees: 100000,
      paymentMode: PaymentMode.BHIM_UPI,
      status: TerPaymentStatus.PAYMENT_VERIFIED,
      initiatedAt: "28 Oct 2026, 15:30 IST",
      verifiedAt: "28 Oct 2026, 15:35 IST",
    },
  },
  {
    id: "app-1401",
    ref: "LOA-2027-1401",
    instName: "Sahyadri Institute of Technology",
    instId: "1-DEMO-4102",
    location: "Haveli, Pune, Maharashtra",
    affiliatingUniv: "Savitribai Phule Pune University",
    regionalDesk: "WRO · R. Kulkarni",
    type: "New programme",
    academicYear: "2027–28",
    program: "MBA · 60 seats",
    intake: 60,
    submittedOn: "28 Oct 2026",
    stage: "SCRUTINY",
    stageLabel: "Scrutiny",
    status: "Scrutiny pending",
    statusPillClass: "text-[#736357]",
    nextAction: "View submission →",
    hasDeficiency: false,
    undertakingsCompleted: 8,
    undertakingsTotal: 8,
    assignedOfficer: "R. Kulkarni",
    feeReceived: "₹1,00,000",
    aphCategory: AphApplicationCategory.EOA_SELF_DISCLOSURE,
    route: AphWorkflowRoute.ROUTE_1_ONLY_SCRUTINY,
    routeLabel: "Route 1: Only Scrutiny Evaluation",
    payment: {
      txnId: "TXN-2027-1401",
      gatewayTxnId: "TER-TXN-2027-9841401",
      applicationRef: "LOA-2027-1401",
      purpose: "MBA Programme Addition Fee",
      amountRupees: 100000,
      paymentMode: PaymentMode.NET_BANKING,
      status: TerPaymentStatus.PAYMENT_VERIFIED,
      initiatedAt: "28 Oct 2026, 12:15 IST",
      verifiedAt: "28 Oct 2026, 12:18 IST",
    },
  },
  {
    id: "app-1488",
    ref: "EOA-2027-1488",
    instName: "Sahyadri Institute of Technology",
    instId: "1-DEMO-4102",
    location: "Haveli, Pune, Maharashtra",
    affiliatingUniv: "Savitribai Phule Pune University",
    regionalDesk: "WRO · R. Kulkarni",
    type: "Additional Intake",
    academicYear: "2027–28",
    program: "Computer Engineering · 60 additional seats",
    intake: 60,
    submittedOn: "Draft",
    stage: "SUBMISSION",
    stageLabel: "Draft",
    status: "Draft · 72% complete",
    statusPillClass: "text-[#736357]",
    nextAction: "Continue draft →",
    hasDeficiency: false,
    undertakingsCompleted: 5,
    undertakingsTotal: 8,
    assignedOfficer: "Unassigned",
    feeReceived: "Pending",
    aphCategory: AphApplicationCategory.COURSE_VARIATION_INTAKE,
    route: AphWorkflowRoute.ROUTE_2_SCRUTINY_EVC,
    routeLabel: "Route 2: Scrutiny + EVC Inspection",
    payment: {
      txnId: "TXN-2027-1488",
      gatewayTxnId: "TER-TXN-2027-PENDING",
      applicationRef: "EOA-2027-1488",
      purpose: "Additional Intake Processing Fee",
      amountRupees: 75000,
      paymentMode: PaymentMode.BHIM_UPI,
      status: TerPaymentStatus.PAYMENT_PENDING,
      initiatedAt: "Today",
    },
  },
  {
    id: "app-0824",
    ref: "EOA-2026-0824",
    instName: "Sahyadri Institute of Technology",
    instId: "1-DEMO-4102",
    location: "Haveli, Pune, Maharashtra",
    affiliatingUniv: "Savitribai Phule Pune University",
    regionalDesk: "WRO · R. Kulkarni",
    type: "Extension of Approval",
    academicYear: "2026–27",
    program: "UG Engineering · 8 courses · 480 seats",
    intake: 480,
    submittedOn: "18 Oct 2025",
    stage: "APPROVAL",
    stageLabel: "Approved",
    status: "Approved",
    statusPillClass: "text-[#2E7D32] font-semibold",
    nextAction: "Download order ↓",
    hasDeficiency: false,
    undertakingsCompleted: 8,
    undertakingsTotal: 8,
    assignedOfficer: "R. Kulkarni",
    feeReceived: "₹1,00,000",
    orderIssuedDate: "14 Mar 2026",
    aphCategory: AphApplicationCategory.EOA_SELF_DISCLOSURE,
    route: AphWorkflowRoute.ROUTE_1_ONLY_SCRUTINY,
    routeLabel: "Route 1: Scrutiny Cleared",
    payment: {
      txnId: "TXN-2026-0824",
      gatewayTxnId: "TER-TXN-2026-8810824",
      applicationRef: "EOA-2026-0824",
      purpose: "Extension of Approval Annual Fee",
      amountRupees: 100000,
      paymentMode: PaymentMode.RTGS_NEFT,
      status: TerPaymentStatus.PAYMENT_VERIFIED,
      initiatedAt: "18 Oct 2025",
      verifiedAt: "18 Oct 2025",
    },
  },
  {
    id: "app-0612",
    ref: "EOA-2025-0612",
    instName: "Sahyadri Institute of Technology",
    instId: "1-DEMO-4102",
    location: "Haveli, Pune, Maharashtra",
    affiliatingUniv: "Savitribai Phule Pune University",
    regionalDesk: "WRO · R. Kulkarni",
    type: "Extension of Approval",
    academicYear: "2025–26",
    program: "UG Engineering · 7 courses · 420 seats",
    intake: 420,
    submittedOn: "22 Oct 2024",
    stage: "APPROVAL",
    stageLabel: "Approved",
    status: "Approved",
    statusPillClass: "text-[#2E7D32] font-semibold",
    nextAction: "Download order ↓",
    hasDeficiency: false,
    undertakingsCompleted: 8,
    undertakingsTotal: 8,
    assignedOfficer: "R. Kulkarni",
    feeReceived: "₹1,00,000",
    orderIssuedDate: "12 Mar 2025",
    aphCategory: AphApplicationCategory.EOA_SELF_DISCLOSURE,
    route: AphWorkflowRoute.ROUTE_1_ONLY_SCRUTINY,
    routeLabel: "Route 1: Scrutiny Cleared",
    payment: {
      txnId: "TXN-2025-0612",
      gatewayTxnId: "TER-TXN-2025-7710612",
      applicationRef: "EOA-2025-0612",
      purpose: "Extension of Approval Annual Fee",
      amountRupees: 100000,
      paymentMode: PaymentMode.RTGS_NEFT,
      status: TerPaymentStatus.PAYMENT_VERIFIED,
      initiatedAt: "22 Oct 2024",
      verifiedAt: "22 Oct 2024",
    },
  },
];

// MODULE 2: Granular 8-Point Deficiencies Seed Data
const DEFAULT_GRANULAR_DEFICIENCIES: GranularDeficiencyItem[] = [
  {
    deficiencyId: "DEF-2027-WRO-1042-01",
    description:
      "Fire Safety NOC expired on 26 Oct 2026; requires valid renewal covering Approval Cycle 2027–28.",
    dateIdentified: "02 Nov 2026, 09:20 IST",
    responsibleInstitution: "Sahyadri Institute of Technology (1-DEMO-4102)",
    responseDeadline: "06 Nov 2026, 17:00 IST",
    aphClause: "APH 2024-27 Clause 2.9",
    verificationStatus: DeficiencyVerificationStatus.PENDING_SUBMISSION,
    closureDate: null,
    supportingEvidence: null,
    historyTrail: [
      {
        id: "trail-1",
        cycleNumber: 1,
        originalObservations:
          "Document verification indicates municipal Fire NOC (PMC/FIRE/2025/184) lapsed on 26 Oct 2026. Renewal certificate required.",
        institutionResponse:
          "Pending upload from local municipal fire authority.",
        revisedDocumentName: "None",
        revisedDocumentSha256: "Pending",
        reScrutinyObservations: "Awaiting replacement certificate.",
        officerSignoff: "R. Kulkarni (WRO Scrutiny Lead)",
        timestamp: "02 Nov 2026, 09:20 IST",
      },
    ],
  },
  {
    deficiencyId: "DEF-2027-WRO-1042-02",
    description:
      "Faculty Cadre availability undertaking for UG Engineering (1:15 ratio) missing authorized principal seal.",
    dateIdentified: "02 Nov 2026, 09:20 IST",
    responsibleInstitution: "Sahyadri Institute of Technology (1-DEMO-4102)",
    responseDeadline: "06 Nov 2026, 17:00 IST",
    aphClause: "APH 2024-27 Clause 2.4",
    verificationStatus: DeficiencyVerificationStatus.PENDING_SUBMISSION,
    closureDate: null,
    supportingEvidence: null,
    historyTrail: [
      {
        id: "trail-2",
        cycleNumber: 1,
        originalObservations:
          "Cadre ratio compliance statement submitted without principal signature and trustee stamp.",
        institutionResponse: "Signed copy being notarized for submission.",
        revisedDocumentName: "None",
        revisedDocumentSha256: "Pending",
        reScrutinyObservations: "Awaiting notarized affidavit.",
        officerSignoff: "R. Kulkarni (WRO Scrutiny Lead)",
        timestamp: "02 Nov 2026, 09:20 IST",
      },
    ],
  },
  {
    deficiencyId: "DEF-2027-WRO-1017-01",
    description:
      "Shortfall of 3 Computer Science laboratories and uncalibrated testing equipment as per EVC report.",
    dateIdentified: "15 Oct 2026, 14:00 IST",
    responsibleInstitution: "Vidarbha Engineering (1-DEMO-4011)",
    responseDeadline: "25 Oct 2026, 17:00 IST",
    aphClause: "APH 2024-27 Clause 2.5",
    verificationStatus: DeficiencyVerificationStatus.REJECTED_DEFICIENT,
    closureDate: null,
    supportingEvidence: {
      filename: "Vidarbha_Lab_Invoices.pdf",
      mimeType: "application/pdf",
      sha256:
        "4a2b91c8491028374619a8273645102938475610293847561029384756102938",
      uploadedAt: "24 Oct 2026",
    },
    historyTrail: [
      {
        id: "trail-3",
        cycleNumber: 1,
        originalObservations:
          "EVC expert panel reported 3 computing laboratories non-functional with unlicensed CAD packages.",
        institutionResponse:
          "Purchase orders and vendor delivery challans submitted.",
        revisedDocumentName: "Vidarbha_Lab_Invoices.pdf",
        revisedDocumentSha256:
          "4a2b91c8491028374619a8273645102938475610293847561029384756102938",
        reScrutinyObservations:
          "Re-scrutiny found vendor delivery challans unverified by physical asset registers; referred to SAC Appeal.",
        officerSignoff: "P. Joshi (Senior Scrutiny Officer)",
        timestamp: "28 Oct 2026, 16:30 IST",
      },
    ],
  },
];

// MODULE 3: SAC (Standing Appellate Committee) Seed Data
const DEFAULT_SAC_CASES: SacAppealCase[] = [
  {
    id: "sac-01",
    appealRef: "SAC/WRO/2027/0017",
    applicationRef: "EOA-2027-1017",
    institutionId: "1-DEMO-4011",
    institutionName: "Vidarbha Engineering",
    originalRejectionGrounds:
      "EVC reported failure to substantiate 3 mandatory engineering laboratories within statutory timeframe.",
    appealPetitionSummary:
      "Institution submits fresh capital asset receipts and affidavits affirming physical installation of 120 workstations with licensed software.",
    submittedAppealDocuments: [
      {
        filename: "Vidarbha_SAC_Appeal_Brief.pdf",
        mimeType: "application/pdf",
        sha256:
          "9c824f1182374e62938a7b0192837465e9102938475610293847561029384756",
        uploadedAt: "28 Oct 2026",
      },
      {
        filename: "Asset_Register_Affidavit.pdf",
        mimeType: "application/pdf",
        sha256:
          "1f8290ab48591029384756102938475610293847561029384756102938475610",
        uploadedAt: "28 Oct 2026",
      },
    ],
    hearingStatus: CommitteeHearingStatus.SCHEDULED,
    scheduledHearingDate: "05 Nov 2026, 11:00 IST",
    benchMembers: [
      "Hon'ble Justice (Retd.) M. K. Sharma (Appellate Chair)",
      "Prof. Arvind Mehta (Senior Academician, VJTI)",
      "Dr. S. K. Roy (Director, Legal Bureau AICTE)",
    ],
    docketSha256:
      "3f82910a48591029384756102938475610293847561029384756102938475610",
    createdAt: "28 Oct 2026",
  },
];

// MODULE 3: SHC (Standing Hearing Committee) Seed Data
const DEFAULT_SHC_CASES: ShcHearingCase[] = [
  {
    id: "shc-01",
    hearingRef: "SHC/WRO/2027/0042",
    applicationRef: "EOA-2027-1104",
    institutionId: "1-DEMO-4120",
    institutionName: "Coastal Institute",
    evcDeficiencySummary:
      "Discrepancy in barrier-free accessibility ramp gradient and missing fire sprinkler network in hostel block.",
    complianceReportSummary:
      "Institution submits structural engineering completion certificate and photo geotagged logs of rectified ramp.",
    scheduledHearingDate: "04 Nov 2026, 14:30 IST",
    hearingMode: "VIRTUAL",
    hearingStatus: CommitteeHearingStatus.SCHEDULED,
    issuedAt: "29 Oct 2026",
  },
];

// MODULE 4: Show Cause Notices (SCN) Seed Data
const DEFAULT_SCN_NOTICES: ShowCauseNoticeRecord[] = [
  {
    scnId: "SCN/WRO/2027/0017",
    applicationRef: "EOA-2027-1017",
    institutionId: "1-DEMO-4011",
    institutionName: "Vidarbha Engineering",
    issuanceDate: "15 Oct 2026, 10:00 IST",
    reasonForNotice:
      "Failure to cure critical computing infrastructure deficit within statutory 15-day rectification window (APH 2024-27 Clause 2.5).",
    responseDeadline: "30 Oct 2026, 17:00 IST",
    institutionReply:
      "Represented via formal appeal petition to the Standing Appellate Committee (SAC).",
    replySubmittedAt: "28 Oct 2026, 16:30 IST",
    supportingDocuments: [
      {
        filename: "SCN_Reply_Affidavit_Vidarbha.pdf",
        mimeType: "application/pdf",
        sha256:
          "b4920a9182374619283746510293847561029384756102938475610293847561",
        uploadedAt: "28 Oct 2026",
      },
    ],
    hearingStatus: ScnHearingStatus.HEARING_SCHEDULED,
    outcomeStatus: ScnOutcomeStatus.UNDER_REVIEW,
    formalOutcomeNotes: "Referred to SAC Hearing on 05 Nov 2026.",
    issuedByOfficer: "P. Joshi (Regional Scrutiny Desk WRO)",
  },
  {
    scnId: "SCN/WRO/2027/0042",
    applicationRef: "EOA-2027-1104",
    institutionId: "1-DEMO-4120",
    institutionName: "Coastal Institute",
    issuanceDate: "20 Oct 2026, 11:00 IST",
    reasonForNotice:
      "Unresolved life-safety deficiency in hostel block (lapsed municipal occupancy clearance).",
    responseDeadline: "04 Nov 2026, 17:00 IST",
    institutionReply:
      "Municipal inspection completed on 29 Oct; awaiting physical seal.",
    replySubmittedAt: "30 Oct 2026, 12:00 IST",
    supportingDocuments: [
      {
        filename: "Municipal_Inspection_Challan.pdf",
        mimeType: "application/pdf",
        sha256:
          "7c18290a18273645102938475610293847561029384756102938475610293847",
        uploadedAt: "30 Oct 2026",
      },
    ],
    hearingStatus: ScnHearingStatus.HEARING_SCHEDULED,
    outcomeStatus: ScnOutcomeStatus.ISSUED_PENDING_REPLY,
    formalOutcomeNotes:
      "Personal appearance before SHC panel scheduled for 04 Nov 2026.",
    issuedByOfficer: "N. Shah (WRO Regional Officer)",
  },
];

// MODULE 6: Undertaking Lifecycle Fulfillment Engine Seed Data
const DEFAULT_UNDERTAKING_FULFILLMENTS: UndertakingFulfillmentRecord[] = [
  {
    id: "ful-01",
    applicationRef: "EOA-2027-1042",
    institutionId: "1-DEMO-4102",
    promiseDescription:
      "Replace expired municipal Fire Safety NOC with fresh authority seal.",
    committedDate: "20 Oct 2026",
    fulfillmentDeadline: "06 Nov 2026, 17:00 IST",
    evidenceBindings: [],
    statusTag: UndertakingStatusTag.PENDING_EVIDENCE,
  },
  {
    id: "ful-02",
    applicationRef: "EOA-2027-1042",
    institutionId: "1-DEMO-4102",
    promiseDescription:
      "Notarized Faculty Cadre Availability Undertaking adhering to 1:15 ratio.",
    committedDate: "20 Oct 2026",
    fulfillmentDeadline: "06 Nov 2026, 17:00 IST",
    evidenceBindings: [],
    statusTag: UndertakingStatusTag.PENDING_EVIDENCE,
  },
  {
    id: "ful-03",
    applicationRef: "EOA-2027-1042",
    institutionId: "1-DEMO-4102",
    promiseDescription:
      "7th Central Pay Commission salary scale implementation affidavit for all regular teaching staff.",
    committedDate: "18 Oct 2026",
    fulfillmentDeadline: "18 Nov 2026",
    evidenceBindings: [
      {
        filename: "Fee_salary.pdf",
        mimeType: "application/pdf",
        sha256:
          "8f4c2e91b73a10d44d12c8209823059871ab9382176435019827635418276354",
        uploadedAt: "19 Oct 2026",
      },
    ],
    authorizedVerifier: "R. Kulkarni (WRO Desk)",
    verifiedTimestamp: "29 Oct 2026, 16:40 IST",
    statusTag: UndertakingStatusTag.FULFILLED,
  },
  {
    id: "ful-04",
    applicationRef: "EOA-2027-1017",
    institutionId: "1-DEMO-4011",
    promiseDescription:
      "Establishment of 3 additional engineering laboratories with stock registers.",
    committedDate: "12 Oct 2026",
    fulfillmentDeadline: "25 Oct 2026",
    evidenceBindings: [],
    statusTag: UndertakingStatusTag.OVERDUE_ESCALATED,
  },
];

const DEFAULT_UNDERTAKINGS: RegulatoryUndertaking[] = [
  {
    id: "chk-1",
    appRef: "EOA-2027-1042",
    condition: "Land ownership declaration",
    detail: "Required for all EoA applications",
    evidence: "Land_declaration.pdf",
    signedDetail: "Signed · 18 Oct",
    isVerified: true,
    isPendingScrutiny: false,
    needsAttention: false,
  },
  {
    id: "chk-2",
    appRef: "EOA-2027-1042",
    condition: "Building plan approval",
    detail: "Applicable to campus premises",
    evidence: "Building_plan.pdf",
    signedDetail: "Authority seal present",
    isVerified: true,
    isPendingScrutiny: false,
    needsAttention: false,
  },
  {
    id: "chk-3",
    appRef: "EOA-2027-1042",
    condition: "Fire safety NOC",
    detail: "Must cover the application period",
    evidence: "Fire_NOC_2025.pdf",
    signedDetail: "Expired 26 Oct 2026",
    isVerified: false,
    isPendingScrutiny: false,
    needsAttention: true,
    actionText: "Replace →",
  },
  {
    id: "chk-4",
    appRef: "EOA-2027-1042",
    condition: "Faculty availability undertaking",
    detail: "Required for UG Engineering",
    evidence: "Not yet attached",
    signedDetail: "Cadre ratio compliance",
    isVerified: false,
    isPendingScrutiny: false,
    needsAttention: true,
    actionText: "Upload →",
  },
  {
    id: "chk-5",
    appRef: "EOA-2027-1042",
    condition: "Anti-ragging undertaking",
    detail: "Institution and principal",
    evidence: "Anti_ragging.pdf",
    signedDetail: "Signed · 19 Oct",
    isVerified: true,
    isPendingScrutiny: false,
    needsAttention: false,
  },
  {
    id: "chk-6",
    appRef: "EOA-2027-1042",
    condition: "Accessibility compliance",
    detail: "All teaching blocks",
    evidence: "Access_statement.pdf",
    signedDetail: "Verified barrier-free ramps",
    isVerified: true,
    isPendingScrutiny: false,
    needsAttention: false,
  },
  {
    id: "chk-7",
    appRef: "EOA-2027-1042",
    condition: "Fee and salary declaration",
    detail: "Self-financed institution",
    evidence: "Fee_salary.pdf",
    signedDetail: "7th CPC scales attested",
    isVerified: true,
    isPendingScrutiny: false,
    needsAttention: false,
  },
  {
    id: "chk-8",
    appRef: "EOA-2027-1042",
    condition: "No litigation declaration",
    detail: "Legal status of institution",
    evidence: "Legal_declaration.pdf",
    signedDetail: "Competent authority certified",
    isVerified: true,
    isPendingScrutiny: false,
    needsAttention: false,
  },
];

const DEFAULT_VALIDITY_RECORDS: RegulatoryValidityRecord[] = [
  {
    id: "val-1",
    docName: "Fire NOC - Main campus",
    ref: "PMC/FIRE/2025/184",
    expiresOn: "26 Oct 2026",
    timeLeft: "Expired · 7d ago",
    owner: "S. Patil",
    practicalStep: "Renewed 01 Nov · Upload pending →",
    isExpired: true,
    actionText: "Upload renewed NOC →",
    actionHref: "/institution/undertakings",
  },
  {
    id: "val-2",
    docName: "Lease deed addendum - Workshop",
    ref: "LEASE/ANNEX/2021",
    expiresOn: "09 Nov 2026",
    timeLeft: "7-day warning",
    owner: "A. Deshmukh",
    practicalStep: "Registrar appointment · 05 Nov",
    isWarning: true,
    actionText: "Schedule Registrar →",
  },
  {
    id: "val-3",
    docName: "Structural safety - Block B",
    ref: "STR/2025/B2",
    expiresOn: "17 Nov 2026",
    timeLeft: "15-day warning",
    owner: "P. Jadhav",
    practicalStep: "Engineer inspection · 10 Nov",
    isWarning: true,
    actionText: "Track inspection →",
  },
  {
    id: "val-4",
    docName: "Fire NOC - Hostel premises",
    ref: "PMC/FIRE/H-251",
    expiresOn: "02 Dec 2026",
    timeLeft: "30-day warning",
    owner: "S. Patil",
    practicalStep: "Application filed · Track receipt →",
    actionText: "Download Receipt ↓",
    isReceiptDownload: true,
  },
  {
    id: "val-5",
    docName: "Potable water certificate",
    ref: "WATER/LAB/2026/08",
    expiresOn: "01 Jan 2027",
    timeLeft: "60-day warning",
    owner: "R. Shinde",
    practicalStep: "Sample collection · 10 Dec",
    actionText: "Assign Lab →",
  },
  {
    id: "val-6",
    docName: "Registered lease deed · Sports land",
    ref: "REG/HAVELI/2017/41",
    expiresOn: "31 Jan 2027",
    timeLeft: "90-day warning",
    owner: "A. Deshmukh",
    practicalStep: "Draft renewal under legal review",
    actionText: "Review Draft →",
  },
];

const DEFAULT_POLICIES: RegulatoryPolicy[] = [
  {
    id: "pol-1",
    stage: "Stage 1: Documentary Scrutiny",
    slaDays: "15 Working Days",
    roles: "Regional Officer + 2 Scrutiny Members",
    fee: "₹1,00,000 (EoA)",
    escalation: "L1: 15d · L2: 22d · L3: 30d",
    referenceClause: "APH 2024-27 Clause 2.4.1",
    updatedAt: "01 Oct 2026",
  },
  {
    id: "pol-2",
    stage: "Stage 2: Expert Visit Committee (EVC)",
    slaDays: "21 Calendar Days",
    roles: "3 Independent Conflict-Free Experts",
    fee: "₹75,000 inspection fee",
    escalation: "L1: 21d · L2: 28d · L3: 35d",
    referenceClause: "APH 2024-27 Clause 2.7.3",
    updatedAt: "01 Oct 2026",
  },
  {
    id: "pol-3",
    stage: "Stage 3: SAC / SHC Hearing",
    slaDays: "14 Working Days",
    roles: "Retired High Court Judge / Senior Academic",
    fee: "₹50,000 appeal fee",
    escalation: "L1: 14d · L2: 21d · L3: 28d",
    referenceClause: "APH 2024-27 Clause 3.2.1",
    updatedAt: "01 Oct 2026",
  },
  {
    id: "pol-4",
    stage: "Stage 4: Competent Authority Approval",
    slaDays: "7 Working Days",
    roles: "Member Secretary / Bureau Head",
    fee: "N/A",
    escalation: "L1: 7d · L2: 10d · L3: 14d",
    referenceClause: "APH 2024-27 Clause 4.1.2",
    updatedAt: "01 Oct 2026",
  },
];

const DEFAULT_AUDIT_LOGS: RegulatoryAuditRow[] = [
  {
    index: 0,
    id: "aud-001",
    timestamp: "2026-10-20 11:32:00",
    actor: "Institution nodal officer",
    action: "SUBMIT_APPLICATION",
    targetRef: "EOA-2027-1042",
    prevHash:
      "0000000000000000000000000000000000000000000000000000000000000000",
    hash: "9f83a218d6e1919869a19c5950e181827464a0e980a4534e6378e9b048590623",
  },
  {
    index: 1,
    id: "aud-002",
    timestamp: "2026-10-29 16:40:00",
    actor: "R. Kulkarni (WRO Desk)",
    action: "VERIFY_RECORDS",
    targetRef: "EOA-2027-1042",
    prevHash:
      "9f83a218d6e1919869a19c5950e181827464a0e980a4534e6378e9b048590623",
    hash: "4d12c8209823059871ab93821764350198276354182763541827635418276354",
  },
  {
    index: 2,
    id: "aud-003",
    timestamp: "2026-11-02 09:20:00",
    actor: "WRO scrutiny desk",
    action: "ISSUE_DEFICIENCY_MEMO",
    targetRef: "EOA-2027-1042",
    prevHash:
      "4d12c8209823059871ab93821764350198276354182763541827635418276354",
    hash: "7c33e82938472910293847562019283746501928374650192837465019283746",
  },
];

const STORAGE_KEY_APPLICATIONS = "samay_store_applications_v4";
const STORAGE_KEY_UNDERTAKINGS = "samay_store_undertakings_v4";
const STORAGE_KEY_VALIDITY = "samay_store_validity_v4";
const STORAGE_KEY_POLICIES = "samay_store_policies_v4";
const STORAGE_KEY_DEFICIENCIES = "samay_store_deficiencies_v4";
const STORAGE_KEY_SAC = "samay_store_sac_v4";
const STORAGE_KEY_SHC = "samay_store_shc_v4";
const STORAGE_KEY_SCN = "samay_store_scn_v4";
const STORAGE_KEY_FULFILLMENT = "samay_store_fulfillment_v4";
const STORAGE_KEY_AUDIT = "samay_store_audit_v4";
const SYNC_EVENT_NAME = "samay_regulatory_state_change";

class RegulatoryStoreService {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const data = window.localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(
        new CustomEvent(SYNC_EVENT_NAME, { detail: { key } }),
      );
    } catch {
      // storage fallback
    }
  }

  // Applications
  getApplications(): RegulatoryApplication[] {
    return this.getStorageItem<RegulatoryApplication[]>(
      STORAGE_KEY_APPLICATIONS,
      DEFAULT_APPLICATIONS,
    );
  }

  getApplicationByRef(ref: string): RegulatoryApplication | undefined {
    return this.getApplications().find((a) => a.ref === ref);
  }

  saveApplications(apps: RegulatoryApplication[]): void {
    this.setStorageItem(STORAGE_KEY_APPLICATIONS, apps);
  }

  addApplication(
    newApp: Partial<RegulatoryApplication>,
  ): RegulatoryApplication {
    const apps = this.getApplications();
    const resolvedRef =
      newApp.ref || `EOA-2027-${Math.floor(1000 + Math.random() * 9000)}`;
    const app: RegulatoryApplication = {
      id: `app-${webClock.timestamp()}`,
      ref: resolvedRef,
      instName: newApp.instName || "Sahyadri Institute of Technology",
      instId: newApp.instId || "1-DEMO-4102",
      location: newApp.location || "Haveli, Pune, Maharashtra",
      affiliatingUniv:
        newApp.affiliatingUniv || "Savitribai Phule Pune University",
      regionalDesk: newApp.regionalDesk || "WRO · R. Kulkarni",
      type: newApp.type || "Extension of Approval",
      academicYear: "2027–28",
      program: newApp.program || "UG Engineering",
      intake: newApp.intake || 480,
      submittedOn: newApp.submittedOn || "Today",
      stage: newApp.stage || "SUBMISSION",
      stageLabel: newApp.stageLabel || "Scrutiny Pending",
      status: newApp.status || "Scrutiny Pending · Fee Acknowledged",
      statusPillClass: "text-[#EC642A] font-semibold",
      nextAction: "View submission →",
      hasDeficiency: false,
      undertakingsCompleted: 8,
      undertakingsTotal: 8,
      assignedOfficer: "R. Kulkarni",
      feeReceived: "₹1,00,000",
      aphCategory:
        newApp.aphCategory || AphApplicationCategory.EOA_SELF_DISCLOSURE,
      route: newApp.route || AphWorkflowRoute.ROUTE_1_ONLY_SCRUTINY,
      routeLabel: newApp.routeLabel || "Route 1: Only Scrutiny Evaluation",
      payment: {
        txnId: `TXN-${webClock.timestamp()}`,
        gatewayTxnId: `TER-TXN-2027-${Math.floor(1000000 + Math.random() * 9000000)}`,
        applicationRef: resolvedRef,
        purpose: "Application Regulatory Processing Fee",
        amountRupees: 100000,
        paymentMode: PaymentMode.BHIM_UPI,
        status: TerPaymentStatus.PAYMENT_VERIFIED,
        initiatedAt: "Today, 10:00 IST",
        verifiedAt: "Today, 10:02 IST",
      },
      ...newApp,
    };
    this.saveApplications([app, ...apps]);

    // Non-blocking full-stack synchronization hook
    if (typeof window !== "undefined" && typeof fetch === "function") {
      fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: app.instId,
          academicYear: app.academicYear,
          applicationType: app.type,
          program: app.program,
          intake: app.intake,
          route: app.route,
        }),
      }).catch(() => {
        // Fallback to local regulatory store
      });
    }

    return app;
  }

  updateApplication(
    ref: string,
    patch: Partial<RegulatoryApplication>,
  ): RegulatoryApplication | undefined {
    const apps = this.getApplications();
    let updatedApp: RegulatoryApplication | undefined;
    const updated = apps.map((a) => {
      if (a.ref === ref) {
        updatedApp = { ...a, ...patch };
        return updatedApp;
      }
      return a;
    });
    this.saveApplications(updated);
    return updatedApp;
  }

  // MODULE 2: 8-Point Deficiencies
  getGranularDeficiencies(appRef?: string): GranularDeficiencyItem[] {
    const list = this.getStorageItem<GranularDeficiencyItem[]>(
      STORAGE_KEY_DEFICIENCIES,
      DEFAULT_GRANULAR_DEFICIENCIES,
    );
    if (!appRef) return list;
    return list.filter((d) =>
      d.deficiencyId.includes(appRef.split("-").pop() || ""),
    );
  }

  getDeficiencies(appRef?: string): GranularDeficiencyItem[] {
    return this.getGranularDeficiencies(appRef);
  }

  saveGranularDeficiencies(list: GranularDeficiencyItem[]): void {
    this.setStorageItem(STORAGE_KEY_DEFICIENCIES, list);
  }

  submitDeficiencyEvidence(
    deficiencyId: string,
    file: { filename: string; mimeType: string; sha256: string },
    institutionNotes: string,
  ): void {
    const list = this.getGranularDeficiencies();
    const updated = list.map((item) => {
      if (item.deficiencyId === deficiencyId) {
        const nextTrailItem = {
          id: `trail-${webClock.timestamp()}`,
          cycleNumber: item.historyTrail.length + 1,
          originalObservations: item.description,
          institutionResponse: institutionNotes,
          revisedDocumentName: file.filename,
          revisedDocumentSha256: file.sha256,
          reScrutinyObservations:
            "Evidence uploaded; queued for Regional Scrutiny verification.",
          officerSignoff: "Pending Re-Scrutiny verification",
          timestamp: "Just now",
        };
        return {
          ...item,
          supportingEvidence: {
            filename: file.filename,
            mimeType: file.mimeType,
            sha256: file.sha256,
            uploadedAt: "Today",
          },
          verificationStatus:
            DeficiencyVerificationStatus.SUBMITTED_UNDER_REVIEW,
          historyTrail: [...item.historyTrail, nextTrailItem],
        };
      }
      return item;
    });
    this.saveGranularDeficiencies(updated);
  }

  verifyDeficiencyAccepted(
    deficiencyId: string,
    officerNotes: string,
    officerName: string,
  ): void {
    const list = this.getGranularDeficiencies();
    const updated = list.map((item) => {
      if (item.deficiencyId === deficiencyId) {
        const updatedTrail = item.historyTrail.map((t, idx) => {
          if (idx === item.historyTrail.length - 1) {
            return {
              ...t,
              reScrutinyObservations: officerNotes,
              officerSignoff: `${officerName} · Verified & Closed`,
            };
          }
          return t;
        });
        return {
          ...item,
          verificationStatus: DeficiencyVerificationStatus.VERIFIED_ACCEPTED,
          closureDate: "Today",
          historyTrail: updatedTrail,
        };
      }
      return item;
    });
    this.saveGranularDeficiencies(updated);
  }

  // MODULE 3: SAC Appeals
  getSacAppeals(): SacAppealCase[] {
    return this.getStorageItem<SacAppealCase[]>(
      STORAGE_KEY_SAC,
      DEFAULT_SAC_CASES,
    );
  }

  saveSacAppeals(appeals: SacAppealCase[]): void {
    this.setStorageItem(STORAGE_KEY_SAC, appeals);
  }

  recordSacRecommendation(
    appealId: string,
    outcome:
      "UPHOLD_REJECTION" | "GRANT_RELIEF_CONDITIONAL" | "DIRECT_FRESH_EVC",
    rationale: string,
    officerName?: string,
  ): void {
    const list = this.getSacAppeals();
    let targetRef = "SAC-APPEAL";
    const updated = list.map((c) => {
      if (c.id === appealId) {
        targetRef = c.appealRef || c.applicationRef;
        return {
          ...c,
          hearingStatus: CommitteeHearingStatus.RECOMMENDATION_ISSUED,
          recommendationOutcome: outcome,
          recommendationRationale: rationale,
        };
      }
      return c;
    });
    this.saveSacAppeals(updated);

    this.appendAuditLog({
      actor: officerName || "Appellate Bench (SAC)",
      action: "RECORD_SAC_RECOMMENDATION",
      targetRef,
      rationale: `[ADVISORY - SAC Appellate Recommendation to Executive Committee]: ${outcome} · ${rationale}`,
    });
  }

  // MODULE 3: SHC Hearings
  getShcHearings(): ShcHearingCase[] {
    return this.getStorageItem<ShcHearingCase[]>(
      STORAGE_KEY_SHC,
      DEFAULT_SHC_CASES,
    );
  }

  saveShcHearings(cases: ShcHearingCase[]): void {
    this.setStorageItem(STORAGE_KEY_SHC, cases);
  }

  recordShcRecommendation(
    hearingId: string,
    outcome:
      "SATISFACTORY_CLOSURE" | "ISSUE_SHOW_CAUSE" | "PENALTY_INTAKE_REDUCTION",
    notes: string,
    officerName?: string,
  ): void {
    const list = this.getShcHearings();
    let targetRef = "SHC-HEARING";
    const updated = list.map((c) => {
      if (c.id === hearingId) {
        targetRef = c.hearingRef || c.applicationRef;
        return {
          ...c,
          hearingStatus: CommitteeHearingStatus.RECOMMENDATION_ISSUED,
          recommendationOutcome: outcome,
          recommendationNotes: notes,
        };
      }
      return c;
    });
    this.saveShcHearings(updated);

    this.appendAuditLog({
      actor: officerName || "Hearing Committee (SHC)",
      action: "RECORD_SHC_RECOMMENDATION",
      targetRef,
      rationale: `[ADVISORY - SHC Compliance Recommendation placed before Executive Committee]: ${outcome} · ${notes}`,
    });
  }

  // MODULE 4: Show Cause Notices (SCN)
  getShowCauseNotices(): ShowCauseNoticeRecord[] {
    return this.getStorageItem<ShowCauseNoticeRecord[]>(
      STORAGE_KEY_SCN,
      DEFAULT_SCN_NOTICES,
    );
  }

  saveShowCauseNotices(list: ShowCauseNoticeRecord[]): void {
    this.setStorageItem(STORAGE_KEY_SCN, list);
  }

  issueShowCauseNotice(
    notice: Partial<ShowCauseNoticeRecord>,
  ): ShowCauseNoticeRecord {
    const list = this.getShowCauseNotices();
    const newScn: ShowCauseNoticeRecord = {
      scnId:
        notice.scnId ||
        `SCN/WRO/2027/${Math.floor(1000 + Math.random() * 9000)}`,
      applicationRef: notice.applicationRef || "EOA-2027-1042",
      institutionId: notice.institutionId || "1-DEMO-4102",
      institutionName:
        notice.institutionName || "Sahyadri Institute of Technology",
      issuanceDate: "Today, IST",
      reasonForNotice:
        notice.reasonForNotice ||
        "Non-rectification of statutory safety observations within deadline.",
      responseDeadline: notice.responseDeadline || "15 Calendar Days",
      supportingDocuments: notice.supportingDocuments || [],
      hearingStatus: ScnHearingStatus.HEARING_SCHEDULED,
      outcomeStatus: ScnOutcomeStatus.ISSUED_PENDING_REPLY,
      issuedByOfficer: notice.issuedByOfficer || "Authorized Regional Officer",
      ...notice,
    };
    this.saveShowCauseNotices([newScn, ...list]);
    return newScn;
  }

  submitScnReply(
    scnId: string,
    replyText: string,
    documents: SupportingEvidenceBinding[],
  ): void {
    const list = this.getShowCauseNotices();
    const updated = list.map((s) => {
      if (s.scnId === scnId) {
        return {
          ...s,
          institutionReply: replyText,
          replySubmittedAt: "Today, IST",
          supportingDocuments: [...s.supportingDocuments, ...documents],
          outcomeStatus: ScnOutcomeStatus.UNDER_REVIEW,
        };
      }
      return s;
    });
    this.saveShowCauseNotices(updated);
  }

  recordScnOutcome(
    scnId: string,
    outcome: ScnOutcomeStatus,
    formalNotes: string,
  ): void {
    const list = this.getShowCauseNotices();
    const updated = list.map((s) => {
      if (s.scnId === scnId) {
        return {
          ...s,
          outcomeStatus: outcome,
          formalOutcomeNotes: formalNotes,
          closedAt: "Today, IST",
        };
      }
      return s;
    });
    this.saveShowCauseNotices(updated);
  }

  // MODULE 6: Undertaking Lifecycle Fulfillment Engine
  getUndertakingFulfillments(appRef?: string): UndertakingFulfillmentRecord[] {
    const list = this.getStorageItem<UndertakingFulfillmentRecord[]>(
      STORAGE_KEY_FULFILLMENT,
      DEFAULT_UNDERTAKING_FULFILLMENTS,
    );
    if (!appRef) return list;
    return list.filter((u) => u.applicationRef === appRef);
  }

  saveUndertakingFulfillments(list: UndertakingFulfillmentRecord[]): void {
    this.setStorageItem(STORAGE_KEY_FULFILLMENT, list);
  }

  submitFulfillmentEvidence(id: string, file: SupportingEvidenceBinding): void {
    const list = this.getUndertakingFulfillments();
    const updated = list.map((u) => {
      if (u.id === id) {
        return {
          ...u,
          evidenceBindings: [...u.evidenceBindings, file],
          statusTag: UndertakingStatusTag.PENDING_EVIDENCE,
        };
      }
      return u;
    });
    this.saveUndertakingFulfillments(updated);
  }

  verifyFulfillmentSignoff(id: string, verifierName: string): void {
    const list = this.getUndertakingFulfillments();
    const updated = list.map((u) => {
      if (u.id === id) {
        return {
          ...u,
          statusTag: UndertakingStatusTag.FULFILLED,
          authorizedVerifier: verifierName,
          verifiedTimestamp: "Today, IST",
        };
      }
      return u;
    });
    this.saveUndertakingFulfillments(updated);
  }

  // Undertakings & Evidence Submission
  getUndertakings(): RegulatoryUndertaking[] {
    return this.getStorageItem<RegulatoryUndertaking[]>(
      STORAGE_KEY_UNDERTAKINGS,
      DEFAULT_UNDERTAKINGS,
    );
  }

  saveUndertakings(items: RegulatoryUndertaking[]): void {
    this.setStorageItem(STORAGE_KEY_UNDERTAKINGS, items);
  }

  resetUndertakingsToDemoState(): RegulatoryUndertaking[] {
    const freshUndertakings: RegulatoryUndertaking[] = JSON.parse(
      JSON.stringify(DEFAULT_UNDERTAKINGS),
    );
    this.saveUndertakings(freshUndertakings);

    // Synchronize EOA-2027-1042 application status
    const apps = this.getApplications();
    const updatedApps = apps.map((app) => {
      if (app.ref === "EOA-2027-1042") {
        return {
          ...app,
          stage: "SCRUTINY" as ApplicationStage,
          stageLabel: "Scrutiny",
          status: "Deficiency returned",
          statusPillClass: "text-[#D32F2F] font-semibold",
          nextAction: "Resolve by 06 Nov →",
          nextActionHref: "/institution/undertakings",
          hasDeficiency: true,
          undertakingsCompleted: 6,
          undertakingsTotal: 8,
        };
      }
      return app;
    });
    this.saveApplications(updatedApps);

    // Synchronize validity records so Fire NOC reflects expired state
    const freshVal: RegulatoryValidityRecord[] = JSON.parse(
      JSON.stringify(DEFAULT_VALIDITY_RECORDS),
    );
    this.saveValidityRecords(freshVal);

    return freshUndertakings;
  }

  toggleUndertakingDeficiency(id: string): RegulatoryUndertaking | undefined {
    const list = this.getUndertakings();
    let updatedItem: RegulatoryUndertaking | undefined;
    const updated = list.map((item) => {
      if (item.id === id) {
        const willBeVerified = !item.isVerified;
        updatedItem = {
          ...item,
          isVerified: willBeVerified,
          isPendingScrutiny: false,
          needsAttention: !willBeVerified,
          actionText: willBeVerified
            ? "Verified"
            : item.id === "chk-3"
              ? "Replace →"
              : "Upload →",
        };
        return updatedItem;
      }
      return item;
    });
    this.saveUndertakings(updated);
    return updatedItem;
  }

  submitUndertakingEvidence(
    itemId: string,
    evidenceFileName: string,
    validUntil: string,
    _officerResponse?: string,
  ): void {
    const list = this.getUndertakings();
    const updated = list.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          evidence: evidenceFileName,
          validUntil,
          signedDetail: `Replacement evidence filed · Valid until ${validUntil}`,
          isVerified: false,
          isPendingScrutiny: true,
          needsAttention: false,
          actionText: "Under Review ⟳",
          uploadedAt: webClock.isoString(),
        };
      }
      return item;
    });
    this.saveUndertakings(updated);

    const targetItem = updated.find((u) => u.id === itemId);
    if (targetItem) {
      // REQUIREMENT 6: REACTIVE STATE SYNC TO DOCUMENT VALIDITY RADAR
      if (
        targetItem.condition.toLowerCase().includes("fire") ||
        itemId === "chk-3"
      ) {
        const valRecords = this.getValidityRecords();
        const updatedValRecords = valRecords.map((vr) => {
          if (vr.docName.toLowerCase().includes("fire") || vr.id === "val-1") {
            return {
              ...vr,
              expiresOn: validUntil || "01 Nov 2027",
              timeLeft: "Active · 365-day validity",
              isExpired: false,
              isWarning: false,
              practicalStep:
                "Renewed certificate submitted · Under Scrutiny review",
              actionText: "Compliance verified",
            };
          }
          return vr;
        });
        this.saveValidityRecords(updatedValRecords);

        // Also sync to Granular Deficiencies
        const defs = this.getGranularDeficiencies();
        const updatedDefs = defs.map((d) => {
          if (
            d.deficiencyId === "DEF-2027-WRO-1042-01" ||
            d.description.toLowerCase().includes("fire")
          ) {
            return {
              ...d,
              verificationStatus:
                DeficiencyVerificationStatus.SUBMITTED_UNDER_REVIEW,
              supportingEvidence: {
                filename: evidenceFileName,
                mimeType: "application/pdf",
                sha256:
                  "8f4c2e91b73a10d44d12c8209823059871ab9382176435019827635418276354",
                uploadedAt: "Today, IST",
              },
            };
          }
          return d;
        });
        this.saveGranularDeficiencies(updatedDefs);
      }

      if (
        targetItem.condition.toLowerCase().includes("faculty") ||
        itemId === "chk-4"
      ) {
        const defs = this.getGranularDeficiencies();
        const updatedDefs = defs.map((d) => {
          if (
            d.deficiencyId === "DEF-2027-WRO-1042-02" ||
            d.description.toLowerCase().includes("faculty")
          ) {
            return {
              ...d,
              verificationStatus:
                DeficiencyVerificationStatus.SUBMITTED_UNDER_REVIEW,
              supportingEvidence: {
                filename: evidenceFileName,
                mimeType: "application/pdf",
                sha256:
                  "3d91827a48291029384756102938475610293847561029384756102938475610",
                uploadedAt: "Today, IST",
              },
            };
          }
          return d;
        });
        this.saveGranularDeficiencies(updatedDefs);
      }

      const remainingDeficiencies = updated.filter(
        (u) => u.appRef === targetItem.appRef && u.needsAttention,
      );
      if (remainingDeficiencies.length === 0) {
        const apps = this.getApplications();
        const updatedApps = apps.map((app) => {
          if (app.ref === targetItem.appRef) {
            return {
              ...app,
              status: "Deficiency rectified · Pending Scrutiny",
              statusPillClass: "text-[#FAAA21] font-semibold",
              nextAction: "Awaiting scrutiny officer sign-off",
              hasDeficiency: false,
              undertakingsCompleted: 8,
            };
          }
          return app;
        });
        this.saveApplications(updatedApps);
      }
    }
  }

  // Audit Logs (Immutable Transaction Ledger)
  getAuditLogs(): RegulatoryAuditRow[] {
    return this.getStorageItem<RegulatoryAuditRow[]>(
      STORAGE_KEY_AUDIT,
      DEFAULT_AUDIT_LOGS,
    );
  }

  saveAuditLogs(entries: RegulatoryAuditRow[]): void {
    this.setStorageItem(STORAGE_KEY_AUDIT, entries);
  }

  appendAuditLog(entry: {
    actor: string;
    action: string;
    targetRef?: string;
    rationale?: string;
  }): RegulatoryAuditRow {
    const logs = this.getAuditLogs();
    const lastEntry = logs[logs.length - 1];
    const prevHash = lastEntry
      ? lastEntry.hash
      : "0000000000000000000000000000000000000000000000000000000000000000";
    const newIndex = logs.length;
    const now = webClock.now();
    const timestampStr = now.toISOString().replace("T", " ").substring(0, 19);

    // Deterministic cryptographic-shape digest
    const rawPayload = `${newIndex}:${prevHash}:${entry.actor}:${entry.action}:${entry.targetRef || ""}:${entry.rationale || ""}:${timestampStr}`;
    let hashVal = 0;
    for (let i = 0; i < rawPayload.length; i++) {
      hashVal = (hashVal << 5) - hashVal + rawPayload.charCodeAt(i);
      hashVal |= 0;
    }
    const hexPart = Math.abs(hashVal).toString(16).padStart(8, "0");
    const computedHash =
      `${hexPart}e82938472910293847562019283746501928374650192837465019283746`.slice(
        0,
        64,
      );

    const newLog: RegulatoryAuditRow = {
      index: newIndex,
      id: `aud-${String(newIndex + 1).padStart(3, "0")}`,
      timestamp: timestampStr,
      actor: entry.actor,
      action: entry.action,
      targetRef: entry.targetRef,
      rationale: entry.rationale,
      prevHash,
      hash: computedHash,
    };

    const updatedLogs = [...logs, newLog];
    this.saveAuditLogs(updatedLogs);
    return newLog;
  }

  // TRIAGE ACTION 1: Accept Application (Primary Success Action)
  acceptScrutinyApplication(
    ref: string,
    rationale: string,
    officerName?: string,
  ): void {
    const actor = officerName || "Regional Officer (WRO Desk)";
    this.appendAuditLog({
      actor,
      action: "ACCEPT_SCRUTINY_APPLICATION",
      targetRef: ref,
      rationale,
    });

    const undertakings = this.getUndertakings();
    const updatedUndertakings = undertakings.map((u) => {
      if (u.appRef === ref) {
        return {
          ...u,
          isVerified: true,
          isPendingScrutiny: false,
          needsAttention: false,
          actionText: undefined,
        };
      }
      return u;
    });
    this.saveUndertakings(updatedUndertakings);

    const apps = this.getApplications();
    const updatedApps = apps.map((app) => {
      if (app.ref === ref) {
        return {
          ...app,
          stage: "APPROVAL" as ApplicationStage,
          stageLabel: "Scrutiny Cleared",
          status: "SCRUTINY_CLEARED",
          currentQueue: "EXECUTIVE_APPROVAL",
          ballWith: "EXECUTIVE_COMMITTEE",
          statusPillClass: "text-[#2E7D32] font-semibold",
          nextAction: "Forward to Committee or Issue Approval →",
          hasDeficiency: false,
        };
      }
      return app;
    });
    this.saveApplications(updatedApps);

    // Live transactional pipeline dispatch
    if (typeof window !== "undefined") {
      fetch(`/api/v1/applications/${encodeURIComponent(ref)}/scrutiny/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rationale }),
      }).catch(() => {});
    }
  }

  // TRIAGE ACTION 2: Mark Deficiency (Secondary Neutral Action)
  markGranularDeficiency(params: {
    appRef: string;
    description: string;
    aphClause?: string;
    responseDeadline: string;
    requiredEvidence: string;
    officerRationale: string;
    officerName?: string;
  }): GranularDeficiencyItem {
    const actor = params.officerName || "Regional Officer (WRO Desk)";
    this.appendAuditLog({
      actor,
      action: "SCRUTINY_DEFICIENCY_ISSUED",
      targetRef: params.appRef,
      rationale: `${params.description} · ${params.officerRationale}`,
    });

    const refSuffix = params.appRef.split("-").pop() || "1042";
    const defId = `DEF-2027-WRO-${refSuffix}-${Math.floor(10 + Math.random() * 90)}`;
    const app = this.getApplicationByRef(params.appRef);
    const instLabel = app
      ? `${app.instName} (${app.instId})`
      : "Applicant Institution";

    const newDeficiency: GranularDeficiencyItem = {
      deficiencyId: defId,
      description: params.description,
      dateIdentified: "02 Nov 2026, 10:00 IST",
      responsibleInstitution: instLabel,
      responseDeadline: params.responseDeadline,
      supportingEvidence: null,
      verificationStatus: DeficiencyVerificationStatus.PENDING_SUBMISSION,
      closureDate: null,
      aphClause: params.aphClause || "APH 2024-27 Clause 2.9",
      historyTrail: [
        {
          id: `trail-${webClock.timestamp()}`,
          cycleNumber: 1,
          originalObservations: params.description,
          institutionResponse: "Pending response from institution",
          revisedDocumentName: "None",
          revisedDocumentSha256:
            "0000000000000000000000000000000000000000000000000000000000000000",
          reScrutinyObservations:
            params.officerRationale ||
            "Statutory deficiency memo recorded by Scrutiny Desk.",
          officerSignoff: `${actor} · Memo Issued`,
          timestamp: "02 Nov 2026, 10:00 IST",
        },
      ],
    };

    const defs = this.getGranularDeficiencies();
    this.saveGranularDeficiencies([newDeficiency, ...defs]);

    // Update application
    const apps = this.getApplications();
    const memoRef = `WRO/${refSuffix}/D${Math.floor(1 + Math.random() * 3)}`;
    const updatedApps = apps.map((a) => {
      if (a.ref === params.appRef) {
        return {
          ...a,
          hasDeficiency: true,
          status: "SCRUTINY_DEFICIENT",
          ballWith: "INSTITUTION",
          currentQueue: "INSTITUTION_ACTION",
          statusPillClass: "text-[#D32F2F] font-semibold",
          nextAction: `Resolve by ${params.responseDeadline} →`,
          deficiencyMemo: memoRef,
          deficiencyDeadline: params.responseDeadline,
          stage: "SCRUTINY" as ApplicationStage,
          stageLabel: "Scrutiny",
        };
      }
      return a;
    });
    this.saveApplications(updatedApps);

    // Live transactional pipeline dispatch
    if (typeof window !== "undefined") {
      fetch(
        `/api/v1/applications/${encodeURIComponent(params.appRef)}/scrutiny/deficiency`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: params.description,
            aphClause: params.aphClause,
            responseDeadline: params.responseDeadline,
            requiredEvidence: params.requiredEvidence,
            officerRationale: params.officerRationale,
          }),
        },
      ).catch(() => {});
    }

    return newDeficiency;
  }

  // TRIAGE ACTION 3: Forward to Committee (Primary Brand Action)
  forwardToCommittee(params: {
    appRef: string;
    committeeType: "EVC" | "SAC_SHC";
    scheduledDate?: string;
    panelLead?: string;
    rationale: string;
    officerName?: string;
  }): void {
    const actor = params.officerName || "Regional Officer (WRO Desk)";
    this.appendAuditLog({
      actor,
      action:
        params.committeeType === "EVC"
          ? "FORWARD_TO_EVC_COMMITTEE"
          : "FORWARD_TO_STANDING_COMMITTEE",
      targetRef: params.appRef,
      rationale: params.rationale,
    });

    const apps = this.getApplications();
    const updatedApps = apps.map((app) => {
      if (app.ref === params.appRef) {
        const isEvc = params.committeeType === "EVC";
        return {
          ...app,
          stage: (isEvc ? "EVC" : "SAC_SHC") as ApplicationStage,
          stageLabel: isEvc ? "EVC Inspection" : "Standing Committee (SAC/SHC)",
          status: isEvc
            ? "EVC_SCHEDULED"
            : "Referred to Standing Committee (SAC/SHC)",
          currentQueue: isEvc ? "REGIONAL_EVC_QUEUE" : "COMMITTEE_BENCH",
          ballWith: "COMMITTEE",
          statusPillClass: "text-[#EC642A] font-semibold",
          nextAction: isEvc
            ? "View EVC Docket →"
            : "Prepare Committee Dossier →",
          evcDate: params.scheduledDate || "12 Nov 2026",
          evcPanelLead: params.panelLead || "Prof. Vikram Rao",
          hasDeficiency: false,
        };
      }
      return app;
    });
    this.saveApplications(updatedApps);
  }

  verifyScrutinyAndForward(appRef: string, scheduledEvcDate?: string): void {
    const undertakings = this.getUndertakings();
    const updatedUndertakings = undertakings.map((u) => {
      if (u.appRef === appRef) {
        return {
          ...u,
          isVerified: true,
          isPendingScrutiny: false,
          needsAttention: false,
          actionText: undefined,
        };
      }
      return u;
    });
    this.saveUndertakings(updatedUndertakings);

    const apps = this.getApplications();
    const updatedApps = apps.map((app) => {
      if (app.ref === appRef) {
        return {
          ...app,
          stage: "EVC" as ApplicationStage,
          stageLabel: "EVC Inspection",
          status: scheduledEvcDate
            ? `EVC Scheduled for ${scheduledEvcDate}`
            : "Scrutiny Approved · EVC Inspection Allocated",
          statusPillClass: "text-[#2E7D32] font-semibold",
          nextAction: "View EVC Docket →",
          evcDate: scheduledEvcDate || "12 Nov 2026",
          evcPanelLead: "Prof. Vikram Rao",
        };
      }
      return app;
    });
    this.saveApplications(updatedApps);
  }

  submitEvcDossier(
    appRef: string,
    observations?: string,
    reportFingerprint?: string,
    payload?: {
      institutionId?: string;
      verifiedClaims?: Record<string, boolean>;
      qualitativeObservations?: string;
      panelChair?: string;
      uploadedPhotos?: Array<{ name: string; sha256Preview?: string }>;
    },
  ): void {
    const apps = this.getApplications();
    const updatedApps = apps.map((app) => {
      if (app.ref === appRef) {
        return {
          ...app,
          stage: "BUREAU_REVIEW" as ApplicationStage,
          stageLabel: "Executive Review",
          status: "EVC_REPORT_SUBMITTED",
          currentQueue: "EXECUTIVE_APPROVAL",
          ballWith: "EXECUTIVE_COMMITTEE",
          statusPillClass: "text-[#EC642A] font-semibold",
          nextAction: "Awaiting Competent Authority Order",
        };
      }
      return app;
    });
    this.saveApplications(updatedApps);

    this.appendAuditLog({
      actor: payload?.panelChair || "Prof. Vikram Rao (EVC Panel Lead)",
      action: "SUBMIT_EVC_INSPECTION_REPORT",
      targetRef: appRef,
      rationale:
        observations ||
        "EVC physical on-site inspection verified and submitted.",
    });

    // Optional non-blocking API synchronization dispatch
    if (typeof window !== "undefined" && typeof fetch === "function") {
      fetch(`/api/evc/cases/${appRef}/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportFileId: `rep-${appRef}`,
          fileSha256:
            reportFingerprint ||
            "9a7b4f2c1e8d0234b6791e2049d816a7f34081c95e6201b483109a82649b1043",
          summary: observations || "EVC report submitted",
          observations: observations ? [observations] : [],
          infrastructureVerified: true,
          facultyVerified: true,
          actorUserId: "expert-member-01",
          actorRole: "COMMITTEE_MEMBER",
        }),
      }).catch(() => {
        // Fallback to local store state
      });
    }
  }

  finalizeBureauApproval(appRef: string): void {
    const apps = this.getApplications();
    const updatedApps = apps.map((app) => {
      if (app.ref === appRef) {
        return {
          ...app,
          stage: "APPROVAL" as ApplicationStage,
          stageLabel: "Approved",
          status: "Letter of Approval Issued",
          statusPillClass: "text-[#2E7D32] font-bold",
          nextAction: "Download LoA / EoA Order ↓",
          orderIssuedDate: "02 Nov 2026",
        };
      }
      return app;
    });
    this.saveApplications(updatedApps);
  }

  getValidityRecords(): RegulatoryValidityRecord[] {
    return this.getStorageItem<RegulatoryValidityRecord[]>(
      STORAGE_KEY_VALIDITY,
      DEFAULT_VALIDITY_RECORDS,
    );
  }

  saveValidityRecords(records: RegulatoryValidityRecord[]): void {
    this.setStorageItem(STORAGE_KEY_VALIDITY, records);
  }

  addValidityRecord(
    record: Partial<RegulatoryValidityRecord>,
  ): RegulatoryValidityRecord {
    const records = this.getValidityRecords();
    const newRecord: RegulatoryValidityRecord = {
      id: `val-${webClock.timestamp()}`,
      docName: record.docName || "Statutory Document",
      ref: record.ref || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      expiresOn: record.expiresOn || "01 Nov 2027",
      timeLeft: record.timeLeft || "365-day validity",
      owner: record.owner || "S. Patil",
      practicalStep: "Active · Annual verification",
      actionText: "Track Status →",
      ...record,
    };
    this.saveValidityRecords([newRecord, ...records]);

    // REQUIREMENT 6: REACTIVE STATE SYNC FROM VALIDITY RADAR TO UNDERTAKINGS
    if (newRecord.docName && newRecord.docName.toLowerCase().includes("fire")) {
      const undertakings = this.getUndertakings();
      const updatedUndertakings = undertakings.map((u) => {
        if (u.condition.toLowerCase().includes("fire")) {
          return {
            ...u,
            evidence: `${newRecord.docName.replace(/\s+/g, "_")}.pdf`,
            validUntil: newRecord.expiresOn,
            signedDetail: `Renewed in validity radar · Valid until ${newRecord.expiresOn}`,
            isVerified: false,
            isPendingScrutiny: true,
            needsAttention: false,
            actionText: "Under Review ⟳",
          };
        }
        return u;
      });
      this.saveUndertakings(updatedUndertakings);
    }

    return newRecord;
  }

  getPolicies(): RegulatoryPolicy[] {
    return this.getStorageItem<RegulatoryPolicy[]>(
      STORAGE_KEY_POLICIES,
      DEFAULT_POLICIES,
    );
  }

  savePolicies(policies: RegulatoryPolicy[]): void {
    this.setStorageItem(STORAGE_KEY_POLICIES, policies);
  }

  // MODULE 2: Centralized Configurable Statutory Policies Engine (APH 2024–2027)
  getStatutoryPolicies(): StatutoryPolicyRecord[] {
    return this.getStorageItem<StatutoryPolicyRecord[]>(
      "samay_statutory_policies_v1",
      STATUTORY_POLICIES_SEED,
    );
  }

  saveStatutoryPolicies(policies: StatutoryPolicyRecord[]): void {
    this.setStorageItem("samay_statutory_policies_v1", policies);
  }

  getStatutoryDeadlineDays(parameterKey: string, fallbackDays: number): number {
    const policies = this.getStatutoryPolicies();
    const policy = getStatutoryPolicy(parameterKey, policies);
    return policy ? policy.deadlineDays : fallbackDays;
  }

  // MODULE 1: Configurable APH Workflow Engine evaluation
  evaluateWorkflow(input: AphWorkflowEvaluationInput): AphWorkflowPlan {
    return evaluateAphWorkflow(input);
  }

  getWorkflowPlanForApplication(ref: string): AphWorkflowPlan {
    const app = this.getApplicationByRef(ref);
    const category =
      app?.aphCategory || AphApplicationCategory.EOA_SELF_DISCLOSURE;
    const isContestedRejection =
      app?.stage === "SAC_SHC" || app?.ref === "EOA-2027-1017";
    const hasShortcomingsOrScn =
      app?.hasDeficiency || app?.ref === "EOA-2027-1104";
    const requiresOnSiteInspection =
      category === AphApplicationCategory.NEW_INSTITUTION ||
      category === AphApplicationCategory.COURSE_VARIATION_INTAKE ||
      app?.stage === "EVC";
    const deficiencyCount = app?.hasDeficiency ? 1 : 0;

    return evaluateAphWorkflow({
      category,
      isContestedRejection,
      hasShortcomingsOrScn,
      requiresOnSiteInspection,
      deficiencyCount,
    });
  }

  // MODULE 5: APH Clause Intelligence Document Mapping
  analyzeDocument(
    documentName: string,
    documentTypeHint?: string,
    sha256Hash?: string,
  ): AphClauseIntelligenceResult {
    return analyzeDocumentAgainstAph({
      documentName,
      documentTypeHint,
      sha256Hash,
    });
  }

  addPolicy(policy: Partial<RegulatoryPolicy>): RegulatoryPolicy {
    const list = this.getPolicies();
    const newPolicy: RegulatoryPolicy = {
      id: `pol-${webClock.timestamp()}`,
      stage: policy.stage || "Stage New: Statutory Compliance",
      slaDays: policy.slaDays || "15 Working Days",
      roles: policy.roles || "Regional Officer + Bureau Nominee",
      fee: policy.fee || "₹50,000",
      escalation: policy.escalation || "L1: 15d · L2: 20d · L3: 30d",
      referenceClause: policy.referenceClause || "APH 2024-27 Clause 5.1",
      updatedAt: "Today",
      ...policy,
    };
    this.savePolicies([newPolicy, ...list]);
    return newPolicy;
  }

  subscribe(callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = () => callback();
    window.addEventListener(SYNC_EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }

  // STAGE 2: Resolve statutory deficiency and resubmit application back into Regional Scrutiny Queue
  resolveAndResubmitDeficiency(
    appRef: string,
    evidenceFileName?: string,
    notes?: string,
  ): void {
    const apps = this.getApplications();
    const updatedApps = apps.map((app) => {
      if (app.ref === appRef) {
        return {
          ...app,
          stage: "SCRUTINY" as ApplicationStage,
          stageLabel: "Scrutiny Queue",
          status: "DEFICIENCY_RESOLVED_RESUBMITTED",
          statusPillClass: "text-[#EC642A] font-semibold",
          nextAction: "Under Regional Officer re-scrutiny",
          currentQueue: "REGIONAL_SCRUTINY",
          ballWith: "REGIONAL_OFFICER",
          hasDeficiency: false,
        };
      }
      return app;
    });
    this.saveApplications(updatedApps);

    this.appendAuditLog({
      actor: "Applicant Institution (Authorized Signatory)",
      action: "DEFICIENCY_RESOLVED_RESUBMITTED",
      targetRef: appRef,
      rationale:
        notes ||
        `Replacement evidence ${evidenceFileName || "filed"} submitted to Scrutiny Desk.`,
    });

    if (typeof window !== "undefined") {
      fetch(
        `/api/v1/applications/${encodeURIComponent(appRef)}/resolve-deficiency`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evidenceFileName, responseNotes: notes }),
        },
      ).catch(() => {});
    }
  }

  // STAGE 5: Executive Committee / Authorized Officer issues final approval (EoA) or rejection decree
  issueFinalDecision(
    appRef: string,
    decision: "APPROVED" | "REJECTED",
    rationale: string,
    officerName?: string,
  ): { orderNumber: string } {
    const actor = officerName || "Executive Committee / Competent Authority";
    const isApproved = decision === "APPROVED";
    const orderNumber = `AICTE/APH/2027/${isApproved ? "EOA" : "REJ"}-${Math.floor(1000 + Math.random() * 9000)}`;

    const apps = this.getApplications();
    const updatedApps = apps.map((app) => {
      if (app.ref === appRef) {
        return {
          ...app,
          stage: "APPROVAL" as ApplicationStage,
          stageLabel: isApproved ? "Approved" : "Rejected",
          status: decision,
          statusPillClass: isApproved
            ? "text-[#2E7D32] font-semibold"
            : "text-[#D32F2F] font-semibold",
          nextAction: isApproved ? "Download order ↓" : "View rejection decree",
          currentQueue: "ARCHIVED",
          ballWith: "INSTITUTION",
          orderIssuedDate: webClock.isoString(),
        };
      }
      return app;
    });
    this.saveApplications(updatedApps);

    this.appendAuditLog({
      actor,
      action: isApproved ? "FINAL_APPROVAL_ISSUED" : "FINAL_REJECTION_ISSUED",
      targetRef: appRef,
      rationale: `${rationale} · Order Number: ${orderNumber}`,
    });

    if (typeof window !== "undefined") {
      fetch(
        `/api/v1/applications/${encodeURIComponent(appRef)}/final-decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, rationale, orderNumber }),
        },
      ).catch(() => {});
    }

    return { orderNumber };
  }
}

export const regulatoryStore = new RegulatoryStoreService();
