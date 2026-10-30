import { describe, expect, it } from 'vitest';
import {
  ApplicationStatus,
  UserRole,
  WorkflowDefinitionSchema,
  WorkflowStage,
  STATUTORY_ADVISORY_LABEL,
  AdvisoryRecommendationSchema,
} from './index.js';

describe('@samay/shared - Workflow Rule DSL and Schemas', () => {
  it('should validate a complete workflow definition JSON as DATA', () => {
    const sampleWorkflowData = {
      id: 'aicte-approval-core-v1',
      version: '1.0.0',
      name: 'AICTE Approval Workflow 2026-27',
      description: 'Standard statutory evaluation workflow from Scrutiny to SAC/SHC',
      aphCycle: 'APH-2026-2027-TODO(APH-VERIFY)',
      initialState: ApplicationStatus.SUBMITTED,
      terminalStates: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED],
      transitions: [
        {
          id: 't-scrutiny-start',
          name: 'Begin Scrutiny Committee Verification',
          stage: WorkflowStage.SCRUTINY,
          from: ApplicationStatus.SUBMITTED,
          to: ApplicationStatus.UNDER_SCRUTINY,
          allowedRoles: [UserRole.REGIONAL_OFFICER, UserRole.SCRUTINY_MEMBER],
          requiresHumanSignoff: true,
          aphClause: 'TODO(APH-VERIFY)',
          conditions: [
            {
              id: 'c-all-docs-uploaded',
              field: 'documents.isComplete',
              operator: 'EQUALS',
              value: true,
              description: 'All mandatory compliance documents must be uploaded',
            },
          ],
          actions: [
            {
              id: 'a-log-audit',
              type: 'RECORD_AUDIT_LOG',
              params: { event: 'SCRUTINY_COMMENCED' },
              isAsync: false,
            },
          ],
        },
      ],
      metadata: {},
    };

    const parsed = WorkflowDefinitionSchema.safeParse(sampleWorkflowData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.transitions[0].requiresHumanSignoff).toBe(true);
      expect(parsed.data.initialState).toBe(ApplicationStatus.SUBMITTED);
    }
  });

  it('should enforce statutory ADVISORY label on automated recommendations', () => {
    const recommendation = {
      classification: STATUTORY_ADVISORY_LABEL,
      ruleId: 'RULE-LAND-DEFICIENCY-01',
      aphClause: 'TODO(APH-VERIFY)',
      summary: 'Potential land lease expiry detected within 12 months',
      rationale: 'Lease registered under parcel 402 expires before academic term 2027.',
      score: 85,
      generatedAt: '2026-10-30T12:00:00Z',
    };

    const parsed = AdvisoryRecommendationSchema.safeParse(recommendation);
    expect(parsed.success).toBe(true);
  });
});
