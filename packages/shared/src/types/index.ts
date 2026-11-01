/**
 * Core User Roles for SAMAY (Smart AICTE Monitoring & Approval Yojana)
 */
/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
export enum UserRole {
  INSTITUTION = "INSTITUTION",
  REGIONAL_OFFICER = "REGIONAL_OFFICER",
  BUREAU_OFFICER = "BUREAU_OFFICER",
  COMMITTEE_MEMBER = "COMMITTEE_MEMBER",
  ADMIN = "ADMIN",
  // Backward compatibility aliases
  INSTITUTION_ADMIN = "INSTITUTION",
  SCRUTINY_MEMBER = "COMMITTEE_MEMBER",
  EVC_EXPERT = "COMMITTEE_MEMBER",
  SAC_SHC_MEMBER = "COMMITTEE_MEMBER",
  BUREAU_HEAD = "BUREAU_OFFICER",
  COMPETENT_AUTHORITY = "BUREAU_OFFICER",
  SUPER_ADMIN = "ADMIN",
}
/* eslint-enable @typescript-eslint/no-duplicate-enum-values */

/**
 * Statutory Workflow Stages
 */
export enum WorkflowStage {
  SUBMISSION = "SUBMISSION",
  SCRUTINY = "SCRUTINY",
  EVC = "EVC",
  SAC_SHC = "SAC_SHC",
  FINAL_DECISION = "FINAL_DECISION",
}

/**
 * Application Approval Lifecycle States
 */
export enum ApplicationStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_SCRUTINY = "UNDER_SCRUTINY",
  SCRUTINY_DEFICIENT = "SCRUTINY_DEFICIENT",
  DEFICIENCY_RESOLVED_RESUBMITTED = "DEFICIENCY_RESOLVED_RESUBMITTED",
  SCRUTINY_CLEARED = "SCRUTINY_CLEARED",
  SCRUTINY_VERIFIED = "SCRUTINY_VERIFIED",
  EVC_SCHEDULED = "EVC_SCHEDULED",
  EVC_IN_PROGRESS = "EVC_IN_PROGRESS",
  EVC_REPORT_SUBMITTED = "EVC_REPORT_SUBMITTED",
  EVC_COMPLETED = "EVC_COMPLETED",
  SAC_HEARING_SCHEDULED = "SAC_HEARING_SCHEDULED",
  SAC_RECOMMENDED = "SAC_RECOMMENDED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

/**
 * Live queue categories across the 5-stage approval lifecycle.
 */
export enum ApplicationQueue {
  REGIONAL_SCRUTINY = "REGIONAL_SCRUTINY",
  REGIONAL_EVC_QUEUE = "REGIONAL_EVC_QUEUE",
  INSTITUTION_ACTION = "INSTITUTION_ACTION",
  COMMITTEE_BENCH = "COMMITTEE_BENCH",
  EXECUTIVE_APPROVAL = "EXECUTIVE_APPROVAL",
  ARCHIVED = "ARCHIVED",
}

/**
 * Regulatory Safeguard: Automated system outputs must strictly carry the ADVISORY label.
 */
export const STATUTORY_ADVISORY_LABEL = "ADVISORY" as const;

export type AdvisoryRecommendation<T = Record<string, unknown>> = {
  classification: typeof STATUTORY_ADVISORY_LABEL;
  ruleId: string;
  aphClause?: string; // Must be verified or tagged with TODO(APH-VERIFY)
  summary: string;
  rationale: string;
  metadata?: T;
};

/**
 * Audit Action Categories for immutable transactional logging
 */
export enum AuditAction {
  APPLICATION_CREATED = "APPLICATION_CREATED",
  APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED",
  WORKFLOW_TRANSITION = "WORKFLOW_TRANSITION",
  SCRUTINY_DECISION = "SCRUTINY_DECISION",
  EVC_SCHEDULED = "EVC_SCHEDULED",
  EVC_REPORT_SUBMITTED = "EVC_REPORT_SUBMITTED",
  UNDERTAKING_REGISTERED = "UNDERTAKING_REGISTERED",
  UNDERTAKING_COMPLIED = "UNDERTAKING_COMPLIED",
  DEADLINE_ESCALATION = "DEADLINE_ESCALATION",
  FINAL_APPROVAL_DECISION = "FINAL_APPROVAL_DECISION",
  FINAL_REJECTION_DECISION = "FINAL_REJECTION_DECISION",
}

/**
 * Injectable Clock Service Interface
 * All system time access must occur through this abstraction.
 */
export interface IClockService {
  now(): Date;
  isoString(): string;
  timestamp(): number;
  plusDays(days: number): Date;
  minusDays(days: number): Date;
  isBefore(date1: Date, date2: Date): boolean;
  isAfter(date1: Date, date2: Date): boolean;
}

/**
 * MODULE 1: Dynamic APH Workflow Routing Engine (Routes 1 to 5)
 */
export enum AphWorkflowRoute {
  ROUTE_1_ONLY_SCRUTINY = "ROUTE_1_ONLY_SCRUTINY",
  ROUTE_2_SCRUTINY_EVC = "ROUTE_2_SCRUTINY_EVC",
  ROUTE_3_SCRUTINY_EVC_SAC_SHC = "ROUTE_3_SCRUTINY_EVC_SAC_SHC",
  ROUTE_4_ONLY_EVC = "ROUTE_4_ONLY_EVC",
  ROUTE_5_CONDITIONAL_PROCESSING = "ROUTE_5_CONDITIONAL_PROCESSING",
}

/**
 * MODULE 2: Granular 8-Point Deficiency Schema
 */
export enum DeficiencyVerificationStatus {
  PENDING_SUBMISSION = "PENDING_SUBMISSION",
  SUBMITTED_UNDER_REVIEW = "SUBMITTED_UNDER_REVIEW",
  VERIFIED_ACCEPTED = "VERIFIED_ACCEPTED",
  REJECTED_DEFICIENT = "REJECTED_DEFICIENT",
}

export interface SupportingEvidenceBinding {
  fileId?: string;
  filename: string;
  mimeType: string;
  sha256: string;
  uploadedAt: string;
}

export interface ReScrutinyAuditLogItem {
  id: string;
  cycleNumber: number;
  originalObservations: string;
  institutionResponse: string;
  revisedDocumentName: string;
  revisedDocumentSha256: string;
  reScrutinyObservations: string;
  officerSignoff: string;
  timestamp: string;
}

export interface GranularDeficiencyItem {
  deficiencyId: string;
  description: string;
  dateIdentified: string;
  responsibleInstitution: string;
  responseDeadline: string;
  supportingEvidence?: SupportingEvidenceBinding | null;
  verificationStatus: DeficiencyVerificationStatus;
  closureDate: string | null;
  aphClause?: string;
  historyTrail: ReScrutinyAuditLogItem[];
}

/**
 * MODULE 3: Committee Member Modules (SAC & SHC)
 */
export enum CommitteeHearingStatus {
  NOT_SCHEDULED = "NOT_SCHEDULED",
  SCHEDULED = "SCHEDULED",
  HEARING_CONCLUDED = "HEARING_CONCLUDED",
  RECOMMENDATION_ISSUED = "RECOMMENDATION_ISSUED",
}

export interface SacAppealCase {
  id: string;
  appealRef: string;
  applicationRef: string;
  institutionId: string;
  institutionName: string;
  originalRejectionGrounds: string;
  appealPetitionSummary: string;
  submittedAppealDocuments: SupportingEvidenceBinding[];
  hearingStatus: CommitteeHearingStatus;
  scheduledHearingDate?: string;
  benchMembers: string[];
  recommendationOutcome?:
    "UPHOLD_REJECTION" | "GRANT_RELIEF_CONDITIONAL" | "DIRECT_FRESH_EVC";
  recommendationRationale?: string;
  docketSha256: string;
  createdAt: string;
}

export interface ShcHearingCase {
  id: string;
  hearingRef: string;
  applicationRef: string;
  institutionId: string;
  institutionName: string;
  evcDeficiencySummary: string;
  complianceReportSummary: string;
  scheduledHearingDate: string;
  hearingMode: "VIRTUAL" | "PHYSICAL_HQ";
  hearingStatus: CommitteeHearingStatus;
  recommendationOutcome?:
    "SATISFACTORY_CLOSURE" | "ISSUE_SHOW_CAUSE" | "PENALTY_INTAKE_REDUCTION";
  recommendationNotes?: string;
  issuedAt: string;
}

/**
 * MODULE 4: Show Cause Notice (SCN) Management
 */
export enum ScnHearingStatus {
  HEARING_EXEMPTED = "HEARING_EXEMPTED",
  HEARING_SCHEDULED = "HEARING_SCHEDULED",
  HEARING_COMPLETED = "HEARING_COMPLETED",
}

export enum ScnOutcomeStatus {
  ISSUED_PENDING_REPLY = "ISSUED_PENDING_REPLY",
  UNDER_REVIEW = "UNDER_REVIEW",
  DROPPED_SATISFACTORY = "DROPPED_SATISFACTORY",
  PENALTY_IMPOSED = "PENALTY_IMPOSED",
  WITHDRAWAL_RECOMMENDED = "WITHDRAWAL_RECOMMENDED",
}

export interface ShowCauseNoticeRecord {
  scnId: string;
  applicationRef: string;
  institutionId: string;
  institutionName: string;
  issuanceDate: string;
  reasonForNotice: string;
  responseDeadline: string;
  institutionReply?: string;
  replySubmittedAt?: string;
  supportingDocuments: SupportingEvidenceBinding[];
  hearingStatus: ScnHearingStatus;
  outcomeStatus: ScnOutcomeStatus;
  formalOutcomeNotes?: string;
  issuedByOfficer: string;
  closedAt?: string;
}

/**
 * MODULE 5: TER Payment Integration
 */
export enum TerPaymentStatus {
  PAYMENT_PENDING = "PAYMENT_PENDING",
  PAYMENT_COMPLETED = "PAYMENT_COMPLETED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAYMENT_VERIFIED = "PAYMENT_VERIFIED",
}

export enum PaymentMode {
  BHIM_UPI = "BHIM_UPI",
  RTGS_NEFT = "RTGS_NEFT",
  NET_BANKING = "NET_BANKING",
  TREASURY_CHALLAN = "TREASURY_CHALLAN",
}

export interface TerPaymentRecord {
  txnId: string;
  gatewayTxnId: string;
  applicationRef: string;
  purpose: string; // e.g. "EoA Regulatory Processing Fee"
  amountRupees: number;
  paymentMode: PaymentMode;
  status: TerPaymentStatus;
  initiatedAt: string;
  verifiedAt?: string;
  reconciliationReceiptUrl?: string;
}

/**
 * MODULE 6: Undertaking Lifecycle Fulfillment Engine
 */
export enum UndertakingStatusTag {
  FULFILLED = "FULFILLED",
  PENDING_EVIDENCE = "PENDING_EVIDENCE",
  OVERDUE_ESCALATED = "OVERDUE_ESCALATED",
}

export interface UndertakingFulfillmentRecord {
  id: string;
  applicationRef: string;
  institutionId: string;
  promiseDescription: string;
  committedDate: string;
  fulfillmentDeadline: string;
  evidenceBindings: SupportingEvidenceBinding[];
  authorizedVerifier?: string;
  verifiedTimestamp?: string;
  statusTag: UndertakingStatusTag;
}

/**
 * ============================================================================
 * ARCHITECTURAL MODULE 1: Configurable APH Workflow Engine Types
 * ============================================================================
 */
export enum AphApplicationCategory {
  EOA_SELF_DISCLOSURE = "EOA_SELF_DISCLOSURE",
  NEW_INSTITUTION = "NEW_INSTITUTION",
  COURSE_VARIATION_INTAKE = "COURSE_VARIATION_INTAKE",
  INSTITUTION_CLOSURE = "INSTITUTION_CLOSURE",
  SUPERNUMERARY_SEATS = "SUPERNUMERARY_SEATS",
}

export interface AphWorkflowEvaluationInput {
  category: AphApplicationCategory;
  isContestedRejection?: boolean;
  hasShortcomingsOrScn?: boolean;
  requiresOnSiteInspection?: boolean;
  deficiencyCount?: number;
}

export interface AphWorkflowStageMetadata {
  id: string;
  label: string;
  ownerRole: UserRole;
  isConditional: boolean;
  conditionReason?: string;
  governingClause: string;
  entryCondition: string;
  exitCondition: string;
  responsibleAuthority: string;
}

export interface AphWorkflowTransitionRule {
  from: string;
  to: string;
  action: string;
  allowedRoles: UserRole[];
  requiresHumanSignoff: boolean;
  requiresExecutiveCommitteeSignoff?: boolean;
  description: string;
}

export interface AphWorkflowPlan {
  category: AphApplicationCategory;
  categoryLabel: string;
  governingClauses: string[];
  stages: AphWorkflowStageMetadata[];
  allowedTransitions: AphWorkflowTransitionRule[];
  statutorySummary: string;
  isSacApplicable: boolean;
  isShcApplicable: boolean;
  isEvcMandatory: boolean;
}

/**
 * ============================================================================
 * ARCHITECTURAL MODULE 2: Configurable Statutory Policy Table Types
 * ============================================================================
 */
export interface StatutoryPolicyRecord {
  id: string;
  applicationType: string;
  stage: string;
  parameterKey: string;
  parameterName: string;
  deadlineDays: number;
  thresholdValue?: string | number;
  source: "APH 2024-27";
  sourceClause: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  approvedBy: string;
  description: string;
}

/**
 * ============================================================================
 * ARCHITECTURAL MODULE 5: APH Clause Intelligence Types
 * ============================================================================
 */
export interface AphCompletenessCheck {
  check: string;
  passed: boolean;
  detail: string;
}

export interface AphClauseIntelligenceResult {
  documentType: string;
  regulatoryRequirement: string;
  aphClause: string;
  aphClauseTitle: string;
  aphChapter: string;
  completenessChecks: AphCompletenessCheck[];
  responsibleVerifyingOfficial: string;
  governingPolicyDeadline: string;
  advisoryRationale: string;
}
