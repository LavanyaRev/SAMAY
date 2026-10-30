/**
 * Core User Roles for SAMAY (Smart AICTE Monitoring & Approval Yojana)
 */
export enum UserRole {
  INSTITUTION = 'INSTITUTION',
  REGIONAL_OFFICER = 'REGIONAL_OFFICER',
  BUREAU_OFFICER = 'BUREAU_OFFICER',
  COMMITTEE_MEMBER = 'COMMITTEE_MEMBER',
  ADMIN = 'ADMIN',
  // Backward compatibility aliases
  INSTITUTION_ADMIN = 'INSTITUTION',
  SCRUTINY_MEMBER = 'COMMITTEE_MEMBER',
  EVC_EXPERT = 'COMMITTEE_MEMBER',
  SAC_SHC_MEMBER = 'COMMITTEE_MEMBER',
  BUREAU_HEAD = 'BUREAU_OFFICER',
  COMPETENT_AUTHORITY = 'BUREAU_OFFICER',
  SUPER_ADMIN = 'ADMIN',
}

/**
 * Statutory Workflow Stages
 */
export enum WorkflowStage {
  SUBMISSION = 'SUBMISSION',
  SCRUTINY = 'SCRUTINY',
  EVC = 'EVC',
  SAC_SHC = 'SAC_SHC',
  FINAL_DECISION = 'FINAL_DECISION',
}

/**
 * Application Approval Lifecycle States
 */
export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_SCRUTINY = 'UNDER_SCRUTINY',
  SCRUTINY_DEFICIENT = 'SCRUTINY_DEFICIENT',
  SCRUTINY_VERIFIED = 'SCRUTINY_VERIFIED',
  EVC_SCHEDULED = 'EVC_SCHEDULED',
  EVC_IN_PROGRESS = 'EVC_IN_PROGRESS',
  EVC_COMPLETED = 'EVC_COMPLETED',
  SAC_HEARING_SCHEDULED = 'SAC_HEARING_SCHEDULED',
  SAC_RECOMMENDED = 'SAC_RECOMMENDED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Regulatory Safeguard: Automated system outputs must strictly carry the ADVISORY label.
 */
export const STATUTORY_ADVISORY_LABEL = 'ADVISORY' as const;

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
  APPLICATION_CREATED = 'APPLICATION_CREATED',
  APPLICATION_SUBMITTED = 'APPLICATION_SUBMITTED',
  WORKFLOW_TRANSITION = 'WORKFLOW_TRANSITION',
  SCRUTINY_DECISION = 'SCRUTINY_DECISION',
  EVC_SCHEDULED = 'EVC_SCHEDULED',
  EVC_REPORT_SUBMITTED = 'EVC_REPORT_SUBMITTED',
  UNDERTAKING_REGISTERED = 'UNDERTAKING_REGISTERED',
  UNDERTAKING_COMPLIED = 'UNDERTAKING_COMPLIED',
  DEADLINE_ESCALATION = 'DEADLINE_ESCALATION',
  FINAL_APPROVAL_DECISION = 'FINAL_APPROVAL_DECISION',
  FINAL_REJECTION_DECISION = 'FINAL_REJECTION_DECISION',
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
