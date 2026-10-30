import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { STATUTORY_ADVISORY_LABEL, UserRole } from "@samay/shared";
import { ClockModule } from "../../common/clock/clock.module";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { DeadlinesModule } from "../deadlines/deadlines.module";
import { DueItemService } from "../deadlines/due-item.service";
import { DAY_MS } from "../deadlines/working-day-calendar.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationsService } from "../notifications/notifications.service";
import { UndertakingsModule } from "./undertakings.module";
import { UndertakingsService } from "./undertakings.service";
import { DocumentsModule } from "../documents/documents.module";
import { DocumentsService } from "../documents/documents.service";

describe("Phase 8: Undertakings with Conditions & Tracked Document / Lease Monitoring", () => {
  let moduleRef: TestingModule;
  let clock: SystemClockService;
  let dueItems: DueItemService;
  let notificationsService: NotificationsService;
  let undertakingsService: UndertakingsService;
  let documentsService: DocumentsService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ClockModule,
        PrismaModule,
        AuditModule,
        DeadlinesModule,
        NotificationsModule,
        UndertakingsModule,
        DocumentsModule,
      ],
    }).compile();

    clock = moduleRef.get(SystemClockService);
    dueItems = moduleRef.get(DueItemService);
    notificationsService = moduleRef.get(NotificationsService);
    undertakingsService = moduleRef.get(UndertakingsService);
    documentsService = moduleRef.get(DocumentsService);

    clock.setSimulatedTime(
      clock.parseIso("2026-05-01T03:30:00.000Z").getTime(),
    );
    undertakingsService.resetAll();
    documentsService.resetAll();
    notificationsService.resetAll();
  });

  it("1. Undertaking Cycles: (A) Happy Path with Advisory missing-evidence detection, (B) Rejected then Resubmitted keeping history, and (C) Competent Authority Waiver", async () => {
    const undertaking =
      await undertakingsService.createUndertakingWithConditions({
        applicationId: "44444444-4444-4444-8444-444444444701",
        applicationRef: "APP-2026-WRO-UND-001",
        institutionId: "inst-wce-sangli",
        institutionName: "Walchand College of Engineering, Sangli",
        region: "WRO",
        category: "FACULTY_AND_LAB_COMPLIANCE",
        description: "Conditional EoA compliance undertaking",
        conditions: [
          {
            conditionType: "FACULTY_CADRE_RECTIFICATION",
            requiredEvidenceTypes: [
              "APPOINTMENT_LETTERS",
              "JOINING_REPORTS",
              "PAN_FORM16_PROOF",
            ],
            dueDate: "2026-06-15T09:00:00.000Z",
          },
          {
            conditionType: "AI_GPU_LAB_COMMISSIONING",
            requiredEvidenceTypes: [
              "INVOICE_RECEIPT",
              "GEO_TAGGED_LAB_PHOTOS",
            ],
            dueDate: "2026-06-15T09:00:00.000Z",
          },
          {
            conditionType: "BARRIER_FREE_LIFT_CERTIFICATE",
            requiredEvidenceTypes: ["PWD_SAFETY_CERTIFICATE"],
            dueDate: "2026-06-15T09:00:00.000Z",
          },
        ],
      });

    expect(undertaking.conditions.length).toBe(3);
    const [condHappy, condRejectResubmit, condWaive] = undertaking.conditions;

    // --- Cycle A: Happy Path + Advisory Panel missing evidence check ---
    // First submit partial evidence -> Advisory flags missing PAN_FORM16_PROOF and never auto-accepts
    const afterPartial = await undertakingsService.submitConditionEvidence(
      condHappy.id,
      {
        submittedByUserId: "inst-user-01",
        submittedByRole: UserRole.INSTITUTION,
        evidenceFiles: [
          {
            fileId: "f-1",
            filename: "appointments.pdf",
            evidenceType: "APPOINTMENT_LETTERS",
          },
          {
            fileId: "f-2",
            filename: "joining.pdf",
            evidenceType: "JOINING_REPORTS",
          },
        ],
        remarks: "Initial upload of faculty appointment and joining letters.",
      },
    );

    expect(afterPartial.status).toBe("SUBMITTED");
    expect(afterPartial.latestAdvisory?.classification).toBe(
      STATUTORY_ADVISORY_LABEL,
    );
    expect(afterPartial.latestAdvisory?.autoAccepted).toBe(false);
    expect(afterPartial.latestAdvisory?.missingEvidenceTypes).toEqual([
      "PAN_FORM16_PROOF",
    ]);

    // Submit complete evidence -> Officer accepts
    await undertakingsService.submitConditionEvidence(condHappy.id, {
      submittedByUserId: "inst-user-01",
      submittedByRole: UserRole.INSTITUTION,
      evidenceFiles: [
        {
          fileId: "f-1",
          filename: "appointments.pdf",
          evidenceType: "APPOINTMENT_LETTERS",
        },
        {
          fileId: "f-2",
          filename: "joining.pdf",
          evidenceType: "JOINING_REPORTS",
        },
        {
          fileId: "f-3",
          filename: "form16.pdf",
          evidenceType: "PAN_FORM16_PROOF",
        },
      ],
      remarks: "Uploaded complete faculty cadre evidence including Form-16.",
    });

    const verifiedHappy = await undertakingsService.reviewConditionEvidence(
      condHappy.id,
      {
        decision: "ACCEPT",
        actorUserId: "ro-wro-01",
        actorRole: UserRole.REGIONAL_OFFICER,
        reason: "All 3 faculty evidence types verified.",
      },
    );
    expect(verifiedHappy.status).toBe("VERIFIED");
    expect(dueItems.getDueItem(verifiedHappy.dueItemId).status).toBe("CLOSED");

    // --- Cycle B: Rejected then Resubmitted keeping full history ---
    await undertakingsService.submitConditionEvidence(condRejectResubmit.id, {
      submittedByUserId: "inst-user-01",
      submittedByRole: UserRole.INSTITUTION,
      evidenceFiles: [
        {
          fileId: "f-lab-1",
          filename: "proforma_quote.pdf",
          evidenceType: "INVOICE_RECEIPT",
        },
      ],
      remarks: "Uploaded proforma invoice.",
    });

    const rejectedCond = await undertakingsService.reviewConditionEvidence(
      condRejectResubmit.id,
      {
        decision: "REJECT",
        actorUserId: "ro-wro-01",
        actorRole: UserRole.REGIONAL_OFFICER,
        reason:
          "Proforma quotation is not valid proof of commissioning; upload final tax invoice and geo-tagged photos.",
      },
    );
    expect(rejectedCond.status).toBe("REJECTED");

    // Institution resubmits (Attempt #2)
    await undertakingsService.submitConditionEvidence(condRejectResubmit.id, {
      submittedByUserId: "inst-user-01",
      submittedByRole: UserRole.INSTITUTION,
      evidenceFiles: [
        {
          fileId: "f-lab-2",
          filename: "final_tax_invoice.pdf",
          evidenceType: "INVOICE_RECEIPT",
        },
        {
          fileId: "f-lab-3",
          filename: "gpu_lab_geotag.jpg",
          evidenceType: "GEO_TAGGED_LAB_PHOTOS",
        },
      ],
      remarks: "Resubmitted with GST tax invoice and geo-tagged lab photos.",
    });

    const acceptedResubmit = await undertakingsService.reviewConditionEvidence(
      condRejectResubmit.id,
      {
        decision: "ACCEPT",
        actorUserId: "ro-wro-01",
        actorRole: UserRole.REGIONAL_OFFICER,
        reason: "Verified final invoice and geo-tagged photos on attempt #2.",
      },
    );
    expect(acceptedResubmit.status).toBe("VERIFIED");
    expect(acceptedResubmit.submissions.length).toBe(2);
    expect(acceptedResubmit.submissions[0].status).toBe("REJECTED");
    expect(acceptedResubmit.submissions[1].status).toBe("VERIFIED");

    // --- Cycle C: Waived by Competent Authority ---
    const waivedCond = await undertakingsService.waiveConditionByAuthority(
      condWaive.id,
      {
        actorUserId: "bureau-head-01",
        actorRole: UserRole.BUREAU_OFFICER,
        waiverReason:
          "Single-storey ground-floor campus layout verified; lift requirement waived by Competent Authority.",
      },
    );
    expect(waivedCond.status).toBe("WAIVED_BY_AUTHORITY");
    expect(
      undertakingsService.getUndertakingById(undertaking.id).status,
    ).toBe("COMPLIED");
  });

  it("2. Undertaking Never Submitted Escalates to Level 3 on the Demo Clock & Enforces RBAC (Institutions Cannot Verify Their Own Evidence)", async () => {
    const startMs = clock.parseIso("2026-05-01T03:30:00.000Z").getTime();
    clock.setSimulatedTime(startMs);

    const undertaking =
      await undertakingsService.createUndertakingWithConditions({
        applicationId: "44444444-4444-4444-8444-444444444702",
        applicationRef: "APP-2026-NRO-UND-002",
        institutionId: "inst-hbtu-kanpur",
        institutionName: "Harcourt Butler Technical University, Kanpur",
        region: "NRO",
        category: "FIRE_SAFETY_UNDERTAKING",
        description: "Time-bound fire safety rectification",
        conditions: [
          {
            conditionType: "FIRE_HYDRANT_PRESSURE_TEST",
            requiredEvidenceTypes: ["FIRE_NOC_RENEWAL"],
            dueDate: clock.fromEpochMs(startMs + 10 * DAY_MS).toISOString(),
            warningOffsets: [-7, -1],
          },
        ],
      });

    const cond = undertaking.conditions[0];

    // Advance Demo Clock across 25 days without any submission -> reaches Level 3 escalation
    const checkpoints = [3, 9, 10, 12, 15, 22];
    let currentDay = 0;
    for (const targetDay of checkpoints) {
      clock.advanceDays(targetDay - currentDay);
      currentDay = targetDay;
      await undertakingsService.evaluateUndertakingEscalations();
    }

    const updatedCond = undertakingsService.getConditionById(cond.id);
    expect(updatedCond.status).toBe("OVERDUE");
    expect(updatedCond.escalationLevel).toBe(3);

    // Verify Level 3 (ADMIN / Designated Head) received the escalation notification
    const adminDeliveries = notificationsService.getDeliveryLog({
      recipientRole: UserRole.ADMIN,
    });
    expect(adminDeliveries.length).toBeGreaterThanOrEqual(3);

    // RBAC Check: Institution submits evidence and tries to verify its own submission -> ForbiddenException
    await undertakingsService.submitConditionEvidence(cond.id, {
      submittedByUserId: "inst-user-hbtu",
      submittedByRole: UserRole.INSTITUTION,
      evidenceFiles: [
        {
          fileId: "f-fire-1",
          filename: "fire_noc.pdf",
          evidenceType: "FIRE_NOC_RENEWAL",
        },
      ],
      remarks: "Uploaded late Fire NOC.",
    });

    await expect(
      undertakingsService.reviewConditionEvidence(cond.id, {
        decision: "ACCEPT",
        actorUserId: "inst-user-hbtu",
        actorRole: UserRole.INSTITUTION,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("3. TrackedDocument Expiry Alerts on the Demo Clock (90, 60, 30, 15, 7 days) and Renewal Verification Resetting the Timeline & Preserving Version History", async () => {
    const startMs = clock.parseIso("2026-05-01T03:30:00.000Z").getTime();
    clock.setSimulatedTime(startMs);

    const { document } = await documentsService.createTrackedDocument({
      institutionId: "inst-wce-sangli",
      institutionName: "Walchand College of Engineering, Sangli",
      region: "WRO",
      type: "LEASE",
      reference: "LEASE-WRO-2026-0091",
      validFrom: "2021-05-01T00:00:00.000Z",
      expiryDate: clock.fromEpochMs(startMs + 95 * DAY_MS).toISOString(),
      extractionResult: {
        confidenceScore: 0.94,
        extractedFields: { leaseYears: 30, lessor: "MIDC Sangli" },
        advisoryLabel: STATUTORY_ADVISORY_LABEL,
      },
    });

    expect(document.status).toBe("VALID");
    expect(document.version).toBe(1);
    expect(document.extractionResult?.confidenceScore).toBe(0.94);

    // Step Demo Clock through 90d, 60d, 30d, 15d, and 7d thresholds
    // Start is T-95d. Advancing +5d -> T-90d, +30d -> T-60d, +30d -> T-30d, +15d -> T-15d, +8d -> T-7d
    const dayDeltas = [5, 30, 30, 15, 8];
    const firedThresholds: number[] = [];

    for (const delta of dayDeltas) {
      clock.advanceDays(delta);
      const res = await documentsService.evaluateDocumentExpiryAlerts();
      for (const a of res.alertsFired) {
        if (a.documentId === document.id) {
          firedThresholds.push(a.thresholdDays);
        }
      }
    }

    expect(firedThresholds).toEqual([90, 60, 30, 15, 7]);
    expect(documentsService.getDocumentById(document.id).status).toBe(
      "EXPIRING_SOON",
    );

    // Institution submits renewal
    const newExpiryIso = clock
      .fromEpochMs(clock.timestamp() + 365 * DAY_MS)
      .toISOString();
    await documentsService.submitDocumentRenewal(document.id, {
      newReference: "LEASE-WRO-2026-0091-REN-V2",
      newValidFrom: clock.isoString(),
      newExpiryDate: newExpiryIso,
      fileId: "file-lease-v2.pdf",
      submittedByUserId: "inst-user-01",
      submittedByRole: UserRole.INSTITUTION,
      remarks: "Registered 30-year lease renewal deed uploaded.",
    });

    expect(documentsService.getDocumentById(document.id).status).toBe(
      "RENEWAL_SUBMITTED",
    );

    // RBAC Check: Institution cannot verify its own document renewal
    await expect(
      documentsService.verifyDocumentRenewal(document.id, {
        decision: "ACCEPT",
        actorUserId: "inst-user-01",
        actorRole: UserRole.INSTITUTION,
      }),
    ).rejects.toThrow(ForbiddenException);

    // Officer verifies renewal -> version becomes 2, old version stays in versionHistory, DueItems recalculate
    const oldExpiryDueItemId = document.expiryDueItemId;
    const verifiedDoc = await documentsService.verifyDocumentRenewal(
      document.id,
      {
        decision: "ACCEPT",
        actorUserId: "ro-wro-01",
        actorRole: UserRole.REGIONAL_OFFICER,
      },
    );

    expect(verifiedDoc.status).toBe("RENEWAL_VERIFIED");
    expect(verifiedDoc.version).toBe(2);
    expect(verifiedDoc.reference).toBe("LEASE-WRO-2026-0091-REN-V2");
    expect(verifiedDoc.versionHistory.length).toBe(1);
    expect(verifiedDoc.versionHistory[0].reference).toBe("LEASE-WRO-2026-0091");
    expect(dueItems.getDueItem(oldExpiryDueItemId).status).toBe("CLOSED");
    expect(dueItems.getDueItem(verifiedDoc.expiryDueItemId).status).toBe(
      "ON_TRACK",
    );
  });

  it("4. CSV Bulk Import: Supports dry-run preview with row-level errors and is strictly idempotent on repeat imports", async () => {
    const csvSample = [
      "institution_id,institution_name,region,type,reference,valid_from,expiry_date",
      "inst-coep-pune,COEP Technological University Pune,WRO,LEASE,LEASE-COEP-2026-01,2022-01-01,2026-06-15",
      "inst-vjti-mumbai,VJTI Matunga Mumbai,WRO,LAND_DOCUMENT,LAND-VJTI-2026-02,2020-04-01,2026-07-10",
      "inst-psg-cbe,PSG College of Technology,SRO,OTHER,FDR-PSG-2026-03,2023-01-01,2026-05-20",
      "inst-bad-row,Broken Institute,NRO,INVALID_TYPE,REF-BAD-01,2026-09-01,2025-01-01",
    ].join("\n");

    // 1. Dry-Run Preview
    const dryRunResult = await documentsService.importCsvTrackedDocuments(
      csvSample,
      { dryRun: true },
    );
    expect(dryRunResult.dryRun).toBe(true);
    expect(dryRunResult.totalRows).toBe(4);
    expect(dryRunResult.validRowsCount).toBe(3);
    expect(dryRunResult.errorRowsCount).toBe(1);
    expect(dryRunResult.createdCount).toBe(0);
    expect(dryRunResult.rowErrors[0].rowNumber).toBe(5);
    expect(dryRunResult.rowErrors[0].errors.length).toBe(2);

    // 2. Commit Import #1
    const commit1 = await documentsService.importCsvTrackedDocuments(
      csvSample,
      { dryRun: false },
    );
    expect(commit1.createdCount).toBe(3);
    expect(commit1.skippedIdempotentCount).toBe(0);

    // 3. Commit Import #2 (Repeat of same CSV -> 0 created, 3 skipped idempotently)
    const commit2 = await documentsService.importCsvTrackedDocuments(
      csvSample,
      { dryRun: false },
    );
    expect(commit2.createdCount).toBe(0);
    expect(commit2.skippedIdempotentCount).toBe(3);

    // Check Expiry Radar across regions
    const radar = documentsService.getExpiryRadar();
    const wroBucket = radar.regions.find((r) => r.region === "WRO");
    expect(wroBucket).toBeDefined();
    expect(
      (wroBucket?.within60Days ?? 0) + (wroBucket?.within90Days ?? 0),
    ).toBe(2);
  });
});

