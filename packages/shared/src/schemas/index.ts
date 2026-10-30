import { z } from 'zod';
import {
  ApplicationStatus,
  AuditAction,
  STATUTORY_ADVISORY_LABEL,
  UserRole,
  WorkflowStage,
} from '../types/index.js';

/**
 * Institution Profile Schema
 */
export const InstitutionSchema = z.object({
  id: z.string().uuid(),
  aictePermanentId: z.string().min(3),
  name: z.string().min(3),
  type: z.enum(['ENGINEERING_TECHNOLOGY', 'MANAGEMENT', 'PHARMACY', 'POLYTECHNIC', 'APPLIED_ARTS']),
  region: z.enum(['NORTHERN', 'NORTH_WEST', 'CENTRAL', 'WESTERN', 'EASTERN', 'SOUTHERN', 'SOUTH_WEST']),
  state: z.string().min(2),
  district: z.string().min(2),
  address: z.string().min(10),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid Indian Pincode'),
  principalName: z.string().min(3),
  principalEmail: z.string().email(),
  principalPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  establishedYear: z.number().int().min(1850).max(2030),
  isMinorityInstitution: z.boolean().default(false),
});

export type Institution = z.infer<typeof InstitutionSchema>;

/**
 * Time-Bound Undertaking Schema
 */
export const UndertakingSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  category: z.enum(['FACULTY_DEFICIENCY', 'LAB_INFRASTRUCTURE', 'LAND_LEASE_RENEWAL', 'LIBRARY_TITLES', 'BUILDING_OCCUPANCY']),
  description: z.string().min(10),
  // TODO(APH-VERIFY): Verify maximum permitted compliance timeline for conditional approval affidavits
  complianceDeadlineDays: z.number().int().positive().default(90),
  deadlineDate: z.string().datetime(),
  status: z.enum(['PENDING', 'COMPLIED', 'DEFAULTED', 'ESCALATED']),
  affidavitDocUrl: z.string().url(),
  rectificationEvidenceUrl: z.string().url().optional(),
});

export type Undertaking = z.infer<typeof UndertakingSchema>;

/**
 * Statutory Document Validity Schema
 */
export const DocumentValiditySchema = z.object({
  id: z.string().uuid(),
  institutionId: z.string().uuid(),
  documentType: z.enum(['LAND_LEASE_DEED', 'OWNERSHIP_TITLE', 'OCCUPANCY_CERTIFICATE', 'FIRE_SAFETY_NOC', 'FDR_DEPOSIT']),
  documentNumber: z.string().min(3),
  issueDate: z.string().datetime(),
  expiryDate: z.string().datetime().nullable(),
  isPerpetual: z.boolean().default(false),
  verifiedStatus: z.enum(['PENDING', 'VALID', 'EXPIRED', 'REJECTED']),
  fileUrl: z.string().url(),
});

export type DocumentValidity = z.infer<typeof DocumentValiditySchema>;

/**
 * Advisory Output Schema
 */
export const AdvisoryRecommendationSchema = z.object({
  classification: z.literal(STATUTORY_ADVISORY_LABEL),
  ruleId: z.string(),
  // TODO(APH-VERIFY): Verify exact APH clause mapping
  aphClause: z.string().default('TODO(APH-VERIFY)'),
  summary: z.string().min(5),
  rationale: z.string().min(5),
  score: z.number().min(0).max(100).optional(),
  generatedAt: z.string().datetime(),
});

export type AdvisoryRecommendationData = z.infer<typeof AdvisoryRecommendationSchema>;

/**
 * Immutable Transactional Audit Log Schema
 */
export const AuditEntrySchema = z.object({
  id: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  action: z.nativeEnum(AuditAction),
  actorId: z.string(),
  actorRole: z.nativeEnum(UserRole),
  previousState: z.record(z.unknown()).nullable(),
  newState: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  ipAddress: z.string().optional(),
  rationale: z.string().optional(),
});

export type AuditEntry = z.infer<typeof AuditEntrySchema>;

/**
 * Application Lifecycle Schema
 */
export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  institutionId: z.string().uuid(),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/, 'Must be in YYYY-YY format e.g. 2026-27'),
  stage: z.nativeEnum(WorkflowStage),
  status: z.nativeEnum(ApplicationStatus),
  submittedAt: z.string().datetime().nullable(),
  currentReviewerId: z.string().nullable(),
  advisoryRecommendations: z.array(AdvisoryRecommendationSchema).default([]),
});

export type Application = z.infer<typeof ApplicationSchema>;

/**
 * Authentication Schemas
 */
export const LoginRequestSchema = z.object({
  email: z.string().email('Valid official email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

