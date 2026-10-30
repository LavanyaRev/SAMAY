import { describe, it, expect, beforeEach } from 'vitest';
import {
  samayApiClient,
  OptimisticConflictError,
  resetLifecycleStore,
  scanUploadedFileMock,
} from './api-client';

describe('Application Lifecycle State Engine & API Client', () => {
  beforeEach(() => {
    resetLifecycleStore();
  });

  it('executes full lifecycle: Institution submits -> Officer scrutinises & returns for deficiency -> Institution responds -> Application advances & handles 409 Conflict', async () => {
    const scannedDoc = scanUploadedFileMock({
      checklistItem: 'Notarized Statutory Format-1 Affidavit',
      filename: 'Affidavit_Format1.pdf',
      sizeBytes: 1420000,
      uploadedBy: 'Dr. Arvind Kulkarni',
    });
    expect(scannedDoc.scanStatus).toBe('CLEAN');
    expect(scannedDoc.sha256).toHaveLength(64);

    // 1. Institution creates and submits application
    const created = await samayApiClient.createAndSubmitApplication({
      institutionName: 'Walchand College of Engineering, Sangli',
      aictePermanentId: '1-2000000001',
      regionCode: 'WRO',
      state: 'Maharashtra',
      district: 'Sangli',
      academicYear: '2026-27',
      applicationTypeCode: 'EXTENSION_OF_APPROVAL',
      programStream: 'B.Tech AI & Data Science',
      proposedIntake: 120,
      documents: [scannedDoc],
      actorName: 'Dr. Arvind Kulkarni',
    });
    expect(created.stage).toBe('SCRUTINY');
    expect(created.version).toBe(2);

    // 2. Officer returns for deficiency
    const returned = await samayApiClient.performWorkflowAction({
      applicationId: created.id,
      action: 'return_for_deficiency',
      expectedVersion: 2,
      idempotencyKey: 'test-ret-1',
      actorName: 'Dr. Suresh Patil (RO Western)',
      actorRole: 'REGIONAL_OFFICER',
      reason: 'Faculty cadre ratio table missing notarized seal',
      reasonCode: 'DEF_FACULTY_CADRE_SHORTFALL',
    });
    expect(returned.stage).toBe('DEFICIENCY_RECTIFICATION');
    expect(returned.ballWith).toBe('INSTITUTION');
    expect(returned.version).toBe(3);

    // 3. Institution responds with clarification upload
    const clarificationDoc = scanUploadedFileMock({
      checklistItem: 'Clarification Annexure',
      filename: 'Clarification_Cadre_Seal.pdf',
      sizeBytes: 980000,
      uploadedBy: 'Dr. Arvind Kulkarni',
    });
    const responded = await samayApiClient.performWorkflowAction({
      applicationId: created.id,
      action: 'submit',
      expectedVersion: 3,
      idempotencyKey: 'test-resp-1',
      actorName: 'Dr. Arvind Kulkarni',
      actorRole: 'INSTITUTION',
      reason: 'Uploaded notarized faculty cadre ratio seal',
      newDocuments: [clarificationDoc],
    });
    expect(responded.stage).toBe('SCRUTINY');
    expect(responded.version).toBe(4);
    expect(responded.documents.length).toBe(2);

    // 4. Test 409 Optimistic Locking Conflict when stale version is sent
    await expect(
      samayApiClient.performWorkflowAction({
        applicationId: created.id,
        action: 'complete_stage',
        expectedVersion: 3, // Stale version!
        idempotencyKey: 'test-stale',
        actorName: 'Prof. Vikram Rao',
        actorRole: 'COMMITTEE_MEMBER',
      }),
    ).rejects.toThrow(OptimisticConflictError);

    // 5. Committee completes scrutiny -> advances to BUREAU_REVIEW -> APPROVED
    const bureauStage = await samayApiClient.performWorkflowAction({
      applicationId: created.id,
      action: 'complete_stage',
      expectedVersion: 4,
      idempotencyKey: 'test-complete-scrutiny',
      actorName: 'Prof. Vikram Rao',
      actorRole: 'COMMITTEE_MEMBER',
    });
    expect(bureauStage.stage).toBe('BUREAU_REVIEW');
    expect(bureauStage.version).toBe(5);

    const approved = await samayApiClient.performWorkflowAction({
      applicationId: created.id,
      action: 'advance',
      expectedVersion: 5,
      idempotencyKey: 'test-approve',
      actorName: 'Dr. Anita Deshmukh',
      actorRole: 'BUREAU_OFFICER',
      reason: 'Competent Authority approved Extension of Approval.',
    });
    expect(approved.stage).toBe('APPROVED');
    expect(approved.version).toBe(6);
  });
});

