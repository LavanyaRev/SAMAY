import { test, expect } from '@playwright/test';

test.describe('Phase 4: Application Lifecycle E2E Journey', () => {
  test('Full journey: Institution submits -> Officer scrutinises & returns for deficiency -> Institution responds -> Application advances (with Document Viewer & 409 Conflict UX)', async ({
    page,
  }) => {
    // 1. Authenticate as Institution Principal
    await page.goto('/login');
    await page.getByTestId('demo-fill-INSTITUTION').click();
    await page.getByTestId('login-submit-btn').click();
    await expect(page).toHaveURL('/');

    // Navigate to Applications Lifecycle Portal
    await page.goto('/applications');
    await expect(page.getByTestId('active-role-indicator')).toContainText(
      'INSTITUTION',
    );

    // 2. Institution opens 3-Step Application Wizard & submits new application
    await page.getByTestId('toggle-application-wizard-btn').click();
    await expect(page.getByTestId('application-wizard')).toBeVisible();

    // Step 1: Fill details
    await page
      .getByTestId('wizard-program-input')
      .fill('B.Tech Robotics & Cyber-Physical Systems');
    await page.getByTestId('wizard-intake-input').fill('120');
    await page.getByTestId('wizard-next-to-step-2').click();

    // Step 2: Verify Document Checklist has scan_status: CLEAN from mock scanner
    await expect(page.getByTestId('wizard-step-2-content')).toBeVisible();
    await page.getByTestId('mock-upload-btn-chk-affidavit').click();
    await expect(page.getByTestId('scan-badge-chk-affidavit')).toContainText(
      'scan_status: CLEAN',
    );
    await page.getByTestId('wizard-next-to-step-3').click();

    // Step 3: Review & Submit
    await expect(page.getByTestId('wizard-step-3-content')).toBeVisible();
    await page.getByTestId('wizard-submit-application-btn').click();

    // Redirected to new Application Detail Page in SCRUTINY stage
    await expect(page.getByTestId('detail-stage-badge')).toContainText(
      'STAGE: SCRUTINY',
    );
    const createdAppRef = await page
      .getByTestId('detail-application-ref')
      .innerText();
    expect(createdAppRef).toMatch(/^APP-2026-WRO-/);

    // 3. Switch to Regional Officer / Scrutiny Officer Role
    await page.getByTestId('switch-role-REGIONAL_OFFICER').click();
    await expect(page.getByTestId('detail-active-role')).toContainText(
      'REGIONAL_OFFICER',
    );

    // Inspect Documents tab (PDF & Image viewer with Download, scan_status: CLEAN, and SHA-256)
    await page.getByTestId('tab-documents').click();
    await expect(page.getByTestId('document-viewer')).toBeVisible();
    await expect(page.getByTestId('viewer-scan-status')).toContainText(
      'Scan Status: CLEAN',
    );
    const shaText = await page.getByTestId('viewer-sha256').innerText();
    expect(shaText.length).toBeGreaterThanOrEqual(32);

    // Verify Competent Authority Banner in Officer Action Drawer
    await expect(page.getByTestId('competent-authority-banner')).toContainText(
      'This decision is reserved for the competent authority. The system only assists.',
    );

    // Test 409 Conflict UX first: simulate another officer acting concurrently
    await page.getByTestId('simulate-conflict-btn').click();
    await page
      .getByTestId('drawer-reason-textarea')
      .fill('Attempting action on stale version');
    await page.getByTestId('drawer-execute-action-btn').click();

    // Friendly 409 Conflict Dialog appears with latest state
    await expect(page.getByTestId('optimistic-conflict-dialog')).toBeVisible();
    await page.getByTestId('conflict-reload-btn').click();
    await expect(page.getByTestId('optimistic-conflict-dialog')).toBeHidden();

    // Now Officer returns application for deficiency with mandatory reason & reason code
    await page
      .getByTestId('drawer-action-select')
      .selectOption('return_for_deficiency');
    await page
      .getByTestId('drawer-reason-code-select')
      .selectOption('DEF_FACULTY_CADRE_SHORTFALL');
    const officerDeficiencyNote =
      'Senior Professor appointment letters for Robotics division require notarized Selection Committee minutes.';
    await page.getByTestId('drawer-reason-textarea').fill(officerDeficiencyNote);
    await page.getByTestId('drawer-execute-action-btn').click();

    // Stage is now DEFICIENCY_RECTIFICATION
    await expect(page.getByTestId('detail-stage-badge')).toContainText(
      'STAGE: DEFICIENCY_RECTIFICATION',
    );

    // 4. Switch back to Institution Role & Respond to Deficiency Return
    await page.getByTestId('switch-role-INSTITUTION').click();
    await expect(page.getByTestId('respond-to-return-panel')).toBeVisible();
    await expect(
      page.getByTestId('officer-deficiency-reason-text'),
    ).toContainText(officerDeficiencyNote);

    await page
      .getByTestId('clarification-note-textarea')
      .fill(
        'Uploaded notarized Selection Committee minutes and joining reports for 2 Professors.',
      );
    await page.getByTestId('submit-deficiency-response-btn').click();

    // Application advances back to SCRUTINY!
    await expect(page.getByTestId('detail-stage-badge')).toContainText(
      'STAGE: SCRUTINY',
    );

    // 5. Switch to Committee Member / Officer and advance application to BUREAU_REVIEW -> APPROVED
    await page.getByTestId('switch-role-COMMITTEE_MEMBER').click();
    await page
      .getByTestId('drawer-action-select')
      .selectOption('complete_stage');
    await page.getByTestId('drawer-execute-action-btn').click();

    await expect(page.getByTestId('detail-stage-badge')).toContainText(
      'STAGE: BUREAU_REVIEW',
    );

    // Switch to Bureau Officer (Competent Authority) to grant final approval
    await page.getByTestId('switch-role-BUREAU_OFFICER').click();
    await expect(page.getByTestId('competent-authority-banner')).toContainText(
      'This decision is reserved for the competent authority. The system only assists.',
    );
    await page.getByTestId('drawer-action-select').selectOption('advance');
    await page
      .getByTestId('drawer-reason-textarea')
      .fill(
        'Deficiency rectified and verified by Scrutiny Committee. Extension of Approval (EoA) granted.',
      );
    await page.getByTestId('drawer-execute-action-btn').click();

    await expect(page.getByTestId('detail-stage-badge')).toContainText(
      'STAGE: APPROVED',
    );

    // Inspect Timeline & Audit tab to verify all transitions are hash-chained
    await page.getByTestId('tab-timeline-audit').click();
    await expect(
      page.getByTestId('tab-panel-timeline-audit'),
    ).toContainText('CHAIN VERIFIED');
  });
});

