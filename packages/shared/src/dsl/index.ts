import { z } from 'zod';
import { ApplicationStatus, UserRole, WorkflowStage } from '../types/index.js';

/**
 * ============================================================================
 * PHASE 3 PIPELINE DSL (Versioned Workflow Graph as DATA)
 * ============================================================================
 * All stage timelines, return reason codes, and stage labels below are
 * placeholder configurations pending statutory verification.
 * // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
 */

export const BallWithSchema = z.enum(['AICTE', 'INSTITUTION']);
export type BallWith = z.infer<typeof BallWithSchema>;

export const PipelineStageSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  owner_role: z.nativeEnum(UserRole),
  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
  timeline_working_days: z.number().int().min(0),
  ball_with: BallWithSchema,
  requires_evc: z.boolean(),
  requires_committee: z.boolean(),
});

export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const PipelineTransitionSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  action: z.string().min(1),
  allowed_roles: z.array(z.nativeEnum(UserRole)).min(1),
  requires_reason: z.boolean(),
  auto: z.boolean(),
});

export type PipelineTransition = z.infer<typeof PipelineTransitionSchema>;

export const PipelineReturnRuleSchema = z.object({
  from_stage: z.string().min(1),
  to_stage: z.string().min(1),
  reason_codes: z.array(z.string().min(1)).min(1),
  requires_reason: z.boolean().default(true),
});

export type PipelineReturnRule = z.infer<typeof PipelineReturnRuleSchema>;

export const PipelineMetadataSchema = z.object({
  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
  aph_edition: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+(\.\d+)?$/, 'Version must follow SemVer format e.g. 1.0.0'),
  effective_from: z.string().min(1),
});

export type PipelineMetadata = z.infer<typeof PipelineMetadataSchema>;

const BasePipelineDslSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  initial_stage: z.string().min(1).optional(),
  stages: z.array(PipelineStageSchema).min(1),
  transitions: z.array(PipelineTransitionSchema).min(1),
  return_rules: z.array(PipelineReturnRuleSchema).default([]),
  escalation_policy_ref: z.string().min(1),
  metadata: PipelineMetadataSchema,
});

export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
  unreachableStages: string[];
  terminalStages: string[];
}

/**
 * Graph Validator for Pipeline DSL:
 * 1. Ensures stage IDs are unique.
 * 2. Ensures all transition and return_rule stage references exist.
 * 3. Rejects graphs with unreachable stages from the initial stage (first stage in stages[] or initial_stage).
 * 4. Rejects graphs with missing terminal states (a terminal state is a stage with 0 outgoing transitions).
 * 5. Regulatory Safeguard: Rejects auto-transitions directly into an APPROVED stage (human supremacy).
 */
export function validatePipelineGraph(
  dsl: z.infer<typeof BasePipelineDslSchema>,
): GraphValidationResult {
  const errors: string[] = [];
  const stageIds = new Set<string>();

  for (const stage of dsl.stages) {
    if (stageIds.has(stage.id)) {
      errors.push(`Duplicate stage id: "${stage.id}"`);
    }
    stageIds.add(stage.id);
  }

  const startStageId = dsl.initial_stage ?? dsl.stages[0]?.id;
  if (!startStageId || !stageIds.has(startStageId)) {
    errors.push(`Initial stage "${startStageId ?? 'undefined'}" does not exist in stages[]`);
  }

  const adjacency = new Map<string, Set<string>>();
  for (const id of stageIds) {
    adjacency.set(id, new Set<string>());
  }

  for (const t of dsl.transitions) {
    if (!stageIds.has(t.from)) {
      errors.push(`Transition "${t.action}" references unknown 'from' stage "${t.from}"`);
    }
    if (!stageIds.has(t.to)) {
      errors.push(`Transition "${t.action}" references unknown 'to' stage "${t.to}"`);
    }
    if (stageIds.has(t.from) && stageIds.has(t.to)) {
      adjacency.get(t.from)!.add(t.to);
    }
    // Regulatory Safeguard (AGENTS.md Section 2.3): No Autonomous Approvals
    if (t.auto && t.to.toUpperCase() === 'APPROVED') {
      errors.push(
        `Regulatory violation: Transition from "${t.from}" to "APPROVED" cannot have auto=true (Human Supremacy Mandate)`,
      );
    }
  }

  for (const rr of dsl.return_rules) {
    if (!stageIds.has(rr.from_stage)) {
      errors.push(`Return rule references unknown 'from_stage' "${rr.from_stage}"`);
    }
    if (!stageIds.has(rr.to_stage)) {
      errors.push(`Return rule references unknown 'to_stage' "${rr.to_stage}"`);
    }
    if (stageIds.has(rr.from_stage) && stageIds.has(rr.to_stage)) {
      adjacency.get(rr.from_stage)!.add(rr.to_stage);
    }
  }

  // BFS from startStageId to detect unreachable stages
  const visited = new Set<string>();
  if (startStageId && stageIds.has(startStageId)) {
    const queue: string[] = [startStageId];
    visited.add(startStageId);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current) ?? new Set<string>();
      for (const next of neighbors) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }

  const unreachableStages: string[] = [];
  for (const stage of dsl.stages) {
    if (!visited.has(stage.id)) {
      unreachableStages.push(stage.id);
    }
  }

  if (unreachableStages.length > 0) {
    errors.push(`Unreachable stages detected: ${unreachableStages.join(', ')}`);
  }

  // Terminal states: stages with no outgoing edges (in transitions or return_rules)
  const terminalStages: string[] = [];
  for (const stage of dsl.stages) {
    const outgoing = adjacency.get(stage.id);
    if (!outgoing || outgoing.size === 0) {
      terminalStages.push(stage.id);
    }
  }

  const reachableTerminalStages = terminalStages.filter((id) => visited.has(id));
  if (terminalStages.length === 0 || reachableTerminalStages.length === 0) {
    errors.push('Pipeline graph is missing reachable terminal states');
  }

  return {
    valid: errors.length === 0,
    errors,
    unreachableStages,
    terminalStages: reachableTerminalStages,
  };
}

export const PipelineDslSchema = BasePipelineDslSchema.superRefine((dsl, ctx) => {
  const result = validatePipelineGraph(dsl);
  if (!result.valid) {
    for (const err of result.errors) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err,
      });
    }
  }
});

export type PipelineDsl = z.infer<typeof PipelineDslSchema>;

/**
 * ============================================================================
 * SEED PIPELINE 1: ONLY_SCRUTINY (e.g., Extension of Approval without EVC)
 * ============================================================================
 * // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
 */
export const ONLY_SCRUTINY_PIPELINE_V1: PipelineDsl = PipelineDslSchema.parse({
  code: 'ONLY_SCRUTINY',
  name: 'Statutory Scrutiny-Only Approval Pipeline (Placeholder)',
  description:
    'Placeholder pipeline for applications evaluated solely via Scrutiny Committee without EVC inspection.',
  initial_stage: 'DRAFT',
  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
  stages: [
    {
      id: 'DRAFT',
      label: 'Application Draft Preparation (Placeholder)',
      owner_role: UserRole.INSTITUTION,
      timeline_working_days: 15,
      ball_with: 'INSTITUTION',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'SUBMITTED',
      label: 'Application Submitted & Regional Intake (Placeholder)',
      owner_role: UserRole.REGIONAL_OFFICER,
      timeline_working_days: 2,
      ball_with: 'AICTE',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'SCRUTINY',
      label: 'Scrutiny Committee Verification (Placeholder)',
      owner_role: UserRole.COMMITTEE_MEMBER,
      timeline_working_days: 7,
      ball_with: 'AICTE',
      requires_evc: false,
      requires_committee: true,
    },
    {
      id: 'DEFICIENCY_RECTIFICATION',
      label: 'Institution Deficiency Compliance (Placeholder)',
      owner_role: UserRole.INSTITUTION,
      timeline_working_days: 10,
      ball_with: 'INSTITUTION',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'BUREAU_REVIEW',
      label: 'Approval Bureau Competent Authority Review (Placeholder)',
      owner_role: UserRole.BUREAU_OFFICER,
      timeline_working_days: 5,
      ball_with: 'AICTE',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'APPROVED',
      label: 'Approval Granted by Competent Authority (Placeholder)',
      owner_role: UserRole.BUREAU_OFFICER,
      timeline_working_days: 0,
      ball_with: 'AICTE',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'REJECTED',
      label: 'Application Rejected by Competent Authority (Placeholder)',
      owner_role: UserRole.BUREAU_OFFICER,
      timeline_working_days: 0,
      ball_with: 'AICTE',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'WITHDRAWN',
      label: 'Application Withdrawn by Institution (Placeholder)',
      owner_role: UserRole.INSTITUTION,
      timeline_working_days: 0,
      ball_with: 'INSTITUTION',
      requires_evc: false,
      requires_committee: false,
    },
  ],
  transitions: [
    {
      from: 'DRAFT',
      to: 'SUBMITTED',
      action: 'submit',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: false,
      auto: false,
    },
    {
      from: 'SUBMITTED',
      to: 'SCRUTINY',
      action: 'auto_allocate_scrutiny',
      allowed_roles: [
        UserRole.REGIONAL_OFFICER,
        UserRole.BUREAU_OFFICER,
        UserRole.COMMITTEE_MEMBER,
        UserRole.ADMIN,
      ],
      requires_reason: false,
      auto: true,
    },
    {
      from: 'SUBMITTED',
      to: 'SCRUTINY',
      action: 'advance',
      allowed_roles: [UserRole.REGIONAL_OFFICER, UserRole.BUREAU_OFFICER, UserRole.ADMIN],
      requires_reason: false,
      auto: false,
    },
    {
      from: 'SCRUTINY',
      to: 'BUREAU_REVIEW',
      action: 'auto_forward_bureau',
      allowed_roles: [
        UserRole.COMMITTEE_MEMBER,
        UserRole.REGIONAL_OFFICER,
        UserRole.BUREAU_OFFICER,
        UserRole.ADMIN,
      ],
      requires_reason: false,
      auto: true,
    },
    {
      from: 'SCRUTINY',
      to: 'BUREAU_REVIEW',
      action: 'advance',
      allowed_roles: [UserRole.COMMITTEE_MEMBER, UserRole.REGIONAL_OFFICER, UserRole.ADMIN],
      requires_reason: false,
      auto: false,
    },
    {
      from: 'SCRUTINY',
      to: 'DEFICIENCY_RECTIFICATION',
      action: 'return_for_deficiency',
      allowed_roles: [UserRole.COMMITTEE_MEMBER, UserRole.REGIONAL_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'DEFICIENCY_RECTIFICATION',
      to: 'SCRUTINY',
      action: 'submit',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'DEFICIENCY_RECTIFICATION',
      to: 'SCRUTINY',
      action: 'advance',
      allowed_roles: [UserRole.INSTITUTION, UserRole.REGIONAL_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'BUREAU_REVIEW',
      to: 'SCRUTINY',
      action: 'revert',
      allowed_roles: [UserRole.BUREAU_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'BUREAU_REVIEW',
      to: 'APPROVED',
      action: 'advance',
      allowed_roles: [UserRole.BUREAU_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'BUREAU_REVIEW',
      to: 'REJECTED',
      action: 'reject',
      allowed_roles: [UserRole.BUREAU_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'DRAFT',
      to: 'WITHDRAWN',
      action: 'withdraw',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'SUBMITTED',
      to: 'WITHDRAWN',
      action: 'withdraw',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'SCRUTINY',
      to: 'WITHDRAWN',
      action: 'withdraw',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'DEFICIENCY_RECTIFICATION',
      to: 'WITHDRAWN',
      action: 'withdraw',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
  ],
  return_rules: [
    {
      from_stage: 'SCRUTINY',
      to_stage: 'DEFICIENCY_RECTIFICATION',
      // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
      reason_codes: [
        'DEF_LAND_DOCS_INCOMPLETE',
        'DEF_FACULTY_CADRE_SHORTFALL',
        'DEF_FDR_ENCUMBRANCE_MISMATCH',
        'DEF_FIRE_SAFETY_EXPIRED',
        'DEF_AFFIDAVIT_FORMAT_INVALID',
      ],
      requires_reason: true,
    },
  ],
  escalation_policy_ref: 'ESC_POLICY_STANDARD_SCRUTINY_TODO_APH_VERIFY',
  metadata: {
    // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
    aph_edition: 'APH-2024-27-TODO(APH-VERIFY)',
    version: '1.0.0',
    effective_from: '2026-04-01T00:00:00.000Z',
  },
});

/**
 * ============================================================================
 * SEED PIPELINE 2: SCRUTINY_EVC (Scrutiny + Expert Visit Committee + SAC/SHC)
 * ============================================================================
 * // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
 */
export const SCRUTINY_EVC_PIPELINE_V1: PipelineDsl = PipelineDslSchema.parse({
  code: 'SCRUTINY_EVC',
  name: 'Statutory Scrutiny & EVC Inspection Pipeline (Placeholder)',
  description:
    'Placeholder pipeline for New Institutions and major proposals requiring Scrutiny, EVC inspection, and optional SAC/SHC hearing.',
  initial_stage: 'DRAFT',
  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
  stages: [
    {
      id: 'DRAFT',
      label: 'Application Draft Preparation (Placeholder)',
      owner_role: UserRole.INSTITUTION,
      timeline_working_days: 15,
      ball_with: 'INSTITUTION',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'SUBMITTED',
      label: 'Application Submitted & Regional Intake (Placeholder)',
      owner_role: UserRole.REGIONAL_OFFICER,
      timeline_working_days: 2,
      ball_with: 'AICTE',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'SCRUTINY',
      label: 'Scrutiny Committee Verification (Placeholder)',
      owner_role: UserRole.COMMITTEE_MEMBER,
      timeline_working_days: 7,
      ball_with: 'AICTE',
      requires_evc: false,
      requires_committee: true,
    },
    {
      id: 'DEFICIENCY_RECTIFICATION',
      label: 'Institution Deficiency Compliance (Placeholder)',
      owner_role: UserRole.INSTITUTION,
      timeline_working_days: 10,
      ball_with: 'INSTITUTION',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'EVC',
      label: 'Expert Visit Committee (EVC) Inspection (Placeholder)',
      owner_role: UserRole.COMMITTEE_MEMBER,
      timeline_working_days: 14,
      ball_with: 'AICTE',
      requires_evc: true,
      requires_committee: true,
    },
    {
      id: 'SAC_SHC',
      label: 'Standing Appeal / Hearing Committee (SAC/SHC) Review (Placeholder)',
      owner_role: UserRole.COMMITTEE_MEMBER,
      timeline_working_days: 10,
      ball_with: 'AICTE',
      requires_evc: false,
      requires_committee: true,
    },
    {
      id: 'BUREAU_REVIEW',
      label: 'Approval Bureau Competent Authority Review (Placeholder)',
      owner_role: UserRole.BUREAU_OFFICER,
      timeline_working_days: 5,
      ball_with: 'AICTE',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'APPROVED',
      label: 'Letter of Approval (LoA) Issued by Competent Authority (Placeholder)',
      owner_role: UserRole.BUREAU_OFFICER,
      timeline_working_days: 0,
      ball_with: 'AICTE',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'REJECTED',
      label: 'Application Rejected by Competent Authority (Placeholder)',
      owner_role: UserRole.BUREAU_OFFICER,
      timeline_working_days: 0,
      ball_with: 'AICTE',
      requires_evc: false,
      requires_committee: false,
    },
    {
      id: 'WITHDRAWN',
      label: 'Application Withdrawn by Institution (Placeholder)',
      owner_role: UserRole.INSTITUTION,
      timeline_working_days: 0,
      ball_with: 'INSTITUTION',
      requires_evc: false,
      requires_committee: false,
    },
  ],
  transitions: [
    {
      from: 'DRAFT',
      to: 'SUBMITTED',
      action: 'submit',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: false,
      auto: false,
    },
    {
      from: 'SUBMITTED',
      to: 'SCRUTINY',
      action: 'auto_allocate_scrutiny',
      allowed_roles: [
        UserRole.REGIONAL_OFFICER,
        UserRole.BUREAU_OFFICER,
        UserRole.COMMITTEE_MEMBER,
        UserRole.ADMIN,
      ],
      requires_reason: false,
      auto: true,
    },
    {
      from: 'SUBMITTED',
      to: 'SCRUTINY',
      action: 'advance',
      allowed_roles: [UserRole.REGIONAL_OFFICER, UserRole.BUREAU_OFFICER, UserRole.ADMIN],
      requires_reason: false,
      auto: false,
    },
    {
      from: 'SCRUTINY',
      to: 'EVC',
      action: 'auto_schedule_evc',
      allowed_roles: [
        UserRole.COMMITTEE_MEMBER,
        UserRole.REGIONAL_OFFICER,
        UserRole.BUREAU_OFFICER,
        UserRole.ADMIN,
      ],
      requires_reason: false,
      auto: true,
    },
    {
      from: 'SCRUTINY',
      to: 'EVC',
      action: 'advance',
      allowed_roles: [UserRole.COMMITTEE_MEMBER, UserRole.REGIONAL_OFFICER, UserRole.ADMIN],
      requires_reason: false,
      auto: false,
    },
    {
      from: 'SCRUTINY',
      to: 'DEFICIENCY_RECTIFICATION',
      action: 'return_for_deficiency',
      allowed_roles: [UserRole.COMMITTEE_MEMBER, UserRole.REGIONAL_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'DEFICIENCY_RECTIFICATION',
      to: 'SCRUTINY',
      action: 'submit',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'DEFICIENCY_RECTIFICATION',
      to: 'SCRUTINY',
      action: 'advance',
      allowed_roles: [UserRole.INSTITUTION, UserRole.REGIONAL_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'EVC',
      to: 'BUREAU_REVIEW',
      action: 'auto_forward_evc_report',
      allowed_roles: [
        UserRole.COMMITTEE_MEMBER,
        UserRole.REGIONAL_OFFICER,
        UserRole.BUREAU_OFFICER,
        UserRole.ADMIN,
      ],
      requires_reason: false,
      auto: true,
    },
    {
      from: 'EVC',
      to: 'BUREAU_REVIEW',
      action: 'advance',
      allowed_roles: [UserRole.COMMITTEE_MEMBER, UserRole.REGIONAL_OFFICER, UserRole.ADMIN],
      requires_reason: false,
      auto: false,
    },
    {
      from: 'EVC',
      to: 'SAC_SHC',
      action: 'return_for_deficiency',
      allowed_roles: [UserRole.COMMITTEE_MEMBER, UserRole.REGIONAL_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'SAC_SHC',
      to: 'BUREAU_REVIEW',
      action: 'auto_forward_sac_recommendation',
      allowed_roles: [
        UserRole.COMMITTEE_MEMBER,
        UserRole.BUREAU_OFFICER,
        UserRole.ADMIN,
      ],
      requires_reason: false,
      auto: true,
    },
    {
      from: 'SAC_SHC',
      to: 'BUREAU_REVIEW',
      action: 'advance',
      allowed_roles: [UserRole.COMMITTEE_MEMBER, UserRole.BUREAU_OFFICER, UserRole.ADMIN],
      requires_reason: false,
      auto: false,
    },
    {
      from: 'SAC_SHC',
      to: 'EVC',
      action: 'revert',
      allowed_roles: [UserRole.COMMITTEE_MEMBER, UserRole.BUREAU_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'BUREAU_REVIEW',
      to: 'EVC',
      action: 'revert',
      allowed_roles: [UserRole.BUREAU_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'BUREAU_REVIEW',
      to: 'APPROVED',
      action: 'advance',
      allowed_roles: [UserRole.BUREAU_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'BUREAU_REVIEW',
      to: 'REJECTED',
      action: 'reject',
      allowed_roles: [UserRole.BUREAU_OFFICER, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'DRAFT',
      to: 'WITHDRAWN',
      action: 'withdraw',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'SUBMITTED',
      to: 'WITHDRAWN',
      action: 'withdraw',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'SCRUTINY',
      to: 'WITHDRAWN',
      action: 'withdraw',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'DEFICIENCY_RECTIFICATION',
      to: 'WITHDRAWN',
      action: 'withdraw',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'EVC',
      to: 'WITHDRAWN',
      action: 'withdraw',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
    {
      from: 'SAC_SHC',
      to: 'WITHDRAWN',
      action: 'withdraw',
      allowed_roles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requires_reason: true,
      auto: false,
    },
  ],
  return_rules: [
    {
      from_stage: 'SCRUTINY',
      to_stage: 'DEFICIENCY_RECTIFICATION',
      // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
      reason_codes: [
        'DEF_LAND_DOCS_INCOMPLETE',
        'DEF_FACULTY_CADRE_SHORTFALL',
        'DEF_FDR_ENCUMBRANCE_MISMATCH',
        'DEF_FIRE_SAFETY_EXPIRED',
        'DEF_AFFIDAVIT_FORMAT_INVALID',
      ],
      requires_reason: true,
    },
    {
      from_stage: 'EVC',
      to_stage: 'SAC_SHC',
      // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
      reason_codes: [
        'EVC_LAB_EQUIPMENT_SHORTFALL',
        'EVC_BUILT_UP_AREA_DEFICIENT',
        'EVC_COMPUTING_INFRA_SHORTFALL',
        'EVC_BARRIER_FREE_NON_COMPLIANT',
      ],
      requires_reason: true,
    },
  ],
  escalation_policy_ref: 'ESC_POLICY_NEW_INST_EVC_STRICT_TODO_APH_VERIFY',
  metadata: {
    // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
    aph_edition: 'APH-2024-27-TODO(APH-VERIFY)',
    version: '1.0.0',
    effective_from: '2026-04-01T00:00:00.000Z',
  },
});

export const SEEDED_PIPELINE_DEFINITIONS: Record<string, { id: string; dsl: PipelineDsl }> = {
  ONLY_SCRUTINY: {
    id: '66666666-6666-4666-8666-666666666601',
    dsl: ONLY_SCRUTINY_PIPELINE_V1,
  },
  SCRUTINY_EVC: {
    id: '66666666-6666-4666-8666-666666666602',
    dsl: SCRUTINY_EVC_PIPELINE_V1,
  },
};

/**
 * ============================================================================
 * BACKWARD-COMPATIBLE WORKFLOW SCHEMAS
 * ============================================================================
 */
export const ConditionOperatorSchema = z.enum([
  'EQUALS',
  'NOT_EQUALS',
  'IN',
  'GREATER_THAN',
  'LESS_THAN',
  'CONTAINS',
  'ALL_TRUE',
]);

export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>;

export const WorkflowConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: ConditionOperatorSchema,
  value: z.unknown(),
  description: z.string(),
});

export type WorkflowCondition = z.infer<typeof WorkflowConditionSchema>;

export const WorkflowActionTypeSchema = z.enum([
  'DISPATCH_OUTBOX_NOTIFICATION',
  'RECORD_AUDIT_LOG',
  'SCHEDULE_EVC_INSPECTION',
  'START_SLA_COUNTDOWN',
  'REGISTER_UNDERTAKING',
  'GENERATE_ADVISORY_REPORT',
]);

export const WorkflowActionSchema = z.object({
  id: z.string(),
  type: WorkflowActionTypeSchema,
  params: z.record(z.unknown()),
  isAsync: z.boolean().default(false),
});

export type WorkflowAction = z.infer<typeof WorkflowActionSchema>;

export const WorkflowTransitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  stage: z.nativeEnum(WorkflowStage),
  from: z.nativeEnum(ApplicationStatus),
  to: z.nativeEnum(ApplicationStatus),
  allowedRoles: z.array(z.nativeEnum(UserRole)).min(1),
  requiresHumanSignoff: z.boolean().default(true),
  // TODO(APH-VERIFY): Verify official stage transition timelines and APH regulatory clauses
  aphClause: z.string().default('TODO(APH-VERIFY)'),
  conditions: z.array(WorkflowConditionSchema).default([]),
  actions: z.array(WorkflowActionSchema).default([]),
});

export type WorkflowTransition = z.infer<typeof WorkflowTransitionSchema>;

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  version: z.string().regex(/^\d+\.\d+(\.\d+)?$/, 'Version must follow SemVer format e.g. 1.0.0'),
  name: z.string(),
  description: z.string(),
  // TODO(APH-VERIFY): Verify approval handbook cycle year
  aphCycle: z.string().default('APH-2026-2027-TODO(APH-VERIFY)'),
  initialState: z.nativeEnum(ApplicationStatus),
  terminalStates: z.array(z.nativeEnum(ApplicationStatus)),
  transitions: z.array(WorkflowTransitionSchema).min(1),
  metadata: z.record(z.unknown()).default({}),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
