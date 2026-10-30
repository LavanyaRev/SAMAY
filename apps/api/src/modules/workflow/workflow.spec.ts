import { ConflictException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  ONLY_SCRUTINY_PIPELINE_V1,
  PipelineDslSchema,
  SCRUTINY_EVC_PIPELINE_V1,
  UserRole,
} from "@samay/shared";
import { ClockModule } from "../../common/clock/clock.module";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuditController } from "../audit/audit.controller";
import { AuditModule } from "../audit/audit.module";
import { AuditService } from "../audit/audit.service";
import { ApplicationsController } from "../applications/applications.controller";
import { ApplicationsModule } from "../applications/applications.module";
import { WorkflowActionName, WorkflowService } from "./workflow.service";
import { WorkflowModule } from "./workflow.module";

describe("Phase 3: Workflow Engine & Tamper-Evident Hash-Chained Audit Log", () => {
  let moduleRef: TestingModule;
  let workflowService: WorkflowService;
  let auditService: AuditService;
  let auditController: AuditController;
  let applicationsController: ApplicationsController;
  let clock: SystemClockService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ClockModule,
        PrismaModule,
        AuditModule,
        WorkflowModule,
        ApplicationsModule,
      ],
    }).compile();

    workflowService = moduleRef.get(WorkflowService);
    auditService = moduleRef.get(AuditService);
    auditController = moduleRef.get(AuditController);
    applicationsController = moduleRef.get(ApplicationsController);
    clock = moduleRef.get(SystemClockService);

    clock.setSimulatedTime("2026-05-01T09:00:00.000Z");
    workflowService.resetState();
  });

  afterEach(async () => {
    clock.resetToSystemTime();
    await moduleRef.close();
  });

  describe("1. Pipeline DSL Graph Validation & Immutability", () => {
    it("validates canonical ONLY_SCRUTINY and SCRUTINY_EVC seed pipelines", () => {
      expect(() =>
        PipelineDslSchema.parse(ONLY_SCRUTINY_PIPELINE_V1),
      ).not.toThrow();
      expect(() =>
        PipelineDslSchema.parse(SCRUTINY_EVC_PIPELINE_V1),
      ).not.toThrow();
    });

    it("rejects pipeline graphs with unreachable stages", () => {
      const invalidUnreachable = {
        ...ONLY_SCRUTINY_PIPELINE_V1,
        stages: [
          ...ONLY_SCRUTINY_PIPELINE_V1.stages,
          {
            id: "ORPHAN_STAGE",
            label: "Unreachable Orphan Stage",
            owner_role: UserRole.BUREAU_OFFICER,
            timeline_working_days: 5,
            ball_with: "AICTE" as const,
            requires_evc: false,
            requires_committee: false,
          },
        ],
      };

      const result = PipelineDslSchema.safeParse(invalidUnreachable);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join(" | ");
        expect(messages).toContain("Unreachable stages detected: ORPHAN_STAGE");
      }
    });

    it("rejects pipeline graphs with missing terminal states", () => {
      const cyclicNoTerminal = {
        code: "CYCLIC_INVALID",
        name: "Invalid Cyclic Pipeline",
        initial_stage: "STAGE_A",
        stages: [
          {
            id: "STAGE_A",
            label: "Stage A",
            owner_role: UserRole.INSTITUTION,
            timeline_working_days: 5,
            ball_with: "INSTITUTION" as const,
            requires_evc: false,
            requires_committee: false,
          },
          {
            id: "STAGE_B",
            label: "Stage B",
            owner_role: UserRole.REGIONAL_OFFICER,
            timeline_working_days: 5,
            ball_with: "AICTE" as const,
            requires_evc: false,
            requires_committee: false,
          },
        ],
        transitions: [
          {
            from: "STAGE_A",
            to: "STAGE_B",
            action: "submit",
            allowed_roles: [UserRole.INSTITUTION],
            requires_reason: false,
            auto: false,
          },
          {
            from: "STAGE_B",
            to: "STAGE_A",
            action: "revert",
            allowed_roles: [UserRole.REGIONAL_OFFICER],
            requires_reason: true,
            auto: false,
          },
        ],
        return_rules: [],
        escalation_policy_ref: "ESC_TEST",
        metadata: {
          aph_edition: "APH-2024-27-TODO(APH-VERIFY)",
          version: "1.0.0",
          effective_from: "2026-04-01T00:00:00.000Z",
        },
      };

      const result = PipelineDslSchema.safeParse(cyclicNoTerminal);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join(" | ");
        expect(messages).toContain(
          "Pipeline graph is missing reachable terminal states",
        );
      }
    });

    it("preserves immutability when a new pipeline version is registered", () => {
      const v2Dsl = {
        ...ONLY_SCRUTINY_PIPELINE_V1,
        metadata: {
          ...ONLY_SCRUTINY_PIPELINE_V1.metadata,
          version: "2.0.0",
        },
      };
      const v2Record = workflowService.registerPipelineVersion(v2Dsl);
      expect(v2Record.version).toBe("2.0.0");

      // Existing v1.0.0 remains untouched and pinned applications still use v1.0.0
      const v1Record = workflowService.getPinnedPipeline(
        "66666666-6666-4666-8666-666666666601",
      );
      expect(v1Record.version).toBe("1.0.0");

      // Re-registering v2.0.0 throws 409 Conflict
      expect(() => workflowService.registerPipelineVersion(v2Dsl)).toThrow(
        ConflictException,
      );
    });
  });

  describe("2. End-to-End Pipeline Execution (ONLY_SCRUTINY & SCRUTINY_EVC)", () => {
    it("executes ONLY_SCRUTINY pipeline end-to-end with deficiency return, revert, auto-transitions, and idempotency", async () => {
      const appId = "44444444-4444-4444-8444-444444444501"; // Pinned to ONLY_SCRUTINY

      // 1. Institution submits DRAFT -> SUBMITTED
      const step1 = await workflowService.submit(
        appId,
        "inst-user-1",
        UserRole.INSTITUTION,
        1,
        "idem-submit-1",
      );
      expect(step1.currentStage).toBe("SUBMITTED");
      expect(step1.version).toBe(2);
      expect(step1.ballWith).toBe("AICTE");

      // Idempotent replay of step 1 returns identical version without duplicate side effects
      const replay1 = await workflowService.submit(
        appId,
        "inst-user-1",
        UserRole.INSTITUTION,
        1,
        "idem-submit-1",
      );
      expect(replay1.idempotentReplay).toBe(true);
      expect(replay1.version).toBe(2);

      // 2. Regional Officer completes SUBMITTED stage -> auto-transitions to SCRUTINY
      const step2 = await workflowService.completeStage(
        appId,
        "ro-user-1",
        UserRole.REGIONAL_OFFICER,
        2,
        "idem-complete-submitted",
      );
      expect(step2.currentStage).toBe("SCRUTINY");
      expect(step2.autoTransitionsFired).toEqual([
        {
          from: "SUBMITTED",
          to: "SCRUTINY",
          action: "auto_allocate_scrutiny",
        },
      ]);
      expect(step2.version).toBe(3);

      // 3. Committee Member returns for deficiency -> DEFICIENCY_RECTIFICATION
      const step3 = await workflowService.returnForDeficiency(
        appId,
        "committee-1",
        UserRole.COMMITTEE_MEMBER,
        3,
        "idem-return-def",
        "Faculty cadre ratio annexure requires notarized stamp",
        "DEF_FACULTY_CADRE_SHORTFALL",
      );
      expect(step3.currentStage).toBe("DEFICIENCY_RECTIFICATION");
      expect(step3.ballWith).toBe("INSTITUTION");
      expect(step3.version).toBe(4);

      // 4. Institution re-submits rectified application -> SCRUTINY
      const step4 = await workflowService.submit(
        appId,
        "inst-user-1",
        UserRole.INSTITUTION,
        4,
        "idem-resubmit-1",
        "Uploaded notarized faculty cadre ratio annexure",
      );
      expect(step4.currentStage).toBe("SCRUTINY");
      expect(step4.version).toBe(5);

      // 5. Committee Member completes SCRUTINY stage -> auto-transitions to BUREAU_REVIEW
      const step5 = await workflowService.completeStage(
        appId,
        "committee-1",
        UserRole.COMMITTEE_MEMBER,
        5,
        "idem-complete-scrutiny",
      );
      expect(step5.currentStage).toBe("BUREAU_REVIEW");
      expect(step5.version).toBe(6);

      // 6. Bureau Officer reverts to SCRUTINY for additional clarification -> SCRUTINY
      const step6 = await workflowService.revert(
        appId,
        "bureau-1",
        UserRole.BUREAU_OFFICER,
        6,
        "idem-revert-1",
        "Verify updated intake table before issuing EoA",
      );
      expect(step6.currentStage).toBe("SCRUTINY");
      expect(step6.version).toBe(7);

      // 7. Committee Member advances to BUREAU_REVIEW -> BUREAU_REVIEW
      const step7 = await workflowService.advance(
        appId,
        "committee-1",
        UserRole.COMMITTEE_MEMBER,
        7,
        "idem-advance-bureau",
      );
      expect(step7.currentStage).toBe("BUREAU_REVIEW");
      expect(step7.version).toBe(8);

      // 8. Bureau Officer approves -> APPROVED
      const step8 = await workflowService.advance(
        appId,
        "bureau-1",
        UserRole.BUREAU_OFFICER,
        8,
        "idem-approve-final",
        "All statutory norms verified by Scrutiny Committee; EoA approved.",
      );
      expect(step8.currentStage).toBe("APPROVED");
      expect(step8.version).toBe(9);

      // Verify audit chain and outbox events
      const verification = await auditController.verifyChain(appId);
      expect(verification.valid).toBe(true);
      expect(verification.totalEntries).toBe(8);
      expect(workflowService.getOutboxEvents(appId).length).toBe(8);
    });

    it("executes SCRUTINY_EVC pipeline end-to-end including EVC trigger and SAC/SHC hearing", async () => {
      const appId = "44444444-4444-4444-8444-444444444502"; // Pinned to SCRUTINY_EVC

      // 1. Submit DRAFT -> SUBMITTED
      await workflowService.submit(
        appId,
        "inst-user-1",
        UserRole.INSTITUTION,
        1,
        "evc-step-1",
      );

      // 2. Complete SUBMITTED -> auto SCRUTINY
      await workflowService.completeStage(
        appId,
        "ro-user-1",
        UserRole.REGIONAL_OFFICER,
        2,
        "evc-step-2",
      );

      // 3. Complete SCRUTINY -> auto EVC (requires_evc = true)
      const step3 = await workflowService.completeStage(
        appId,
        "committee-1",
        UserRole.COMMITTEE_MEMBER,
        3,
        "evc-step-3",
      );
      expect(step3.currentStage).toBe("EVC");
      expect(step3.evcTriggered).toBe(true);
      expect(
        step3.outboxEvents.some(
          (e) => e.eventType === "WORKFLOW_STAGE_REQUIRES_EVC",
        ),
      ).toBe(true);

      // 4. EVC raises deficiency -> SAC_SHC hearing
      const step4 = await workflowService.returnForDeficiency(
        appId,
        "committee-1",
        UserRole.COMMITTEE_MEMBER,
        4,
        "evc-step-4",
        "Computing lab terminal count shortfall referred to SAC/SHC",
        "EVC_COMPUTING_INFRA_SHORTFALL",
      );
      expect(step4.currentStage).toBe("SAC_SHC");

      // 5. Complete SAC_SHC -> auto BUREAU_REVIEW
      const step5 = await workflowService.completeStage(
        appId,
        "committee-1",
        UserRole.COMMITTEE_MEMBER,
        5,
        "evc-step-5",
      );
      expect(step5.currentStage).toBe("BUREAU_REVIEW");

      // 6. Bureau Officer approves -> APPROVED
      const step6 = await workflowService.advance(
        appId,
        "bureau-1",
        UserRole.BUREAU_OFFICER,
        6,
        "evc-step-6",
        "SAC/SHC recommendation accepted by Competent Authority; LoA granted.",
      );
      expect(step6.currentStage).toBe("APPROVED");
      expect(step6.version).toBe(7);

      const verification = await auditController.verifyChain(appId);
      expect(verification.valid).toBe(true);
      expect(verification.totalEntries).toBe(6);
    });
  });

  describe("3. Optimistic Locking Concurrency Test (HTTP 409 Conflict)", () => {
    it("returns 409 Conflict when two parallel transitions use the same expectedVersion", async () => {
      const appId = "44444444-4444-4444-8444-444444444503";

      const results = await Promise.allSettled([
        workflowService.submit(
          appId,
          "inst-user-a",
          UserRole.INSTITUTION,
          1,
          "concurrent-key-a",
        ),
        workflowService.submit(
          appId,
          "inst-user-b",
          UserRole.INSTITUTION,
          1,
          "concurrent-key-b",
        ),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(rejected[0].reason).toBeInstanceOf(ConflictException);
      expect(rejected[0].reason.getStatus()).toBe(409);
    });
  });

  describe("4. Randomized Property Test: Illegal States Never Reached", () => {
    it("survives 200 random action sequences across roles without ever reaching an illegal state", async () => {
      const appIds = [
        "44444444-4444-4444-8444-444444444505", // ONLY_SCRUTINY
        "44444444-4444-4444-8444-444444444506", // SCRUTINY_EVC
      ];
      const allActions: WorkflowActionName[] = [
        "submit",
        "advance",
        "complete_stage",
        "return_for_deficiency",
        "revert",
        "withdraw",
        "reject",
      ];
      const allRoles = [
        UserRole.INSTITUTION,
        UserRole.REGIONAL_OFFICER,
        UserRole.COMMITTEE_MEMBER,
        UserRole.BUREAU_OFFICER,
        UserRole.ADMIN,
      ];

      // Deterministic PRNG
      let seed = 987654321;
      const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      for (let i = 0; i < 200; i++) {
        const appId = appIds[i % appIds.length];
        const beforeApp = await workflowService.getApplicationWithTimeline(appId);
        const pipeline = workflowService.getPinnedPipeline(
          beforeApp.pipelineDefinitionId,
        );
        const action = allActions[Math.floor(nextRand() * allActions.length)];
        const role = allRoles[Math.floor(nextRand() * allRoles.length)];
        const includeReason = nextRand() > 0.3;
        const useCorrectVersion = nextRand() > 0.15;
        const expectedVersion = useCorrectVersion
          ? beforeApp.version
          : beforeApp.version + 99;

        try {
          const res = await workflowService.performAction({
            applicationId: appId,
            action,
            actorId: `rand-actor-${i}`,
            actorRole: role,
            expectedVersion,
            idempotencyKey: `rand-idem-${i}`,
            reason: includeReason ? `Random test reason #${i}` : undefined,
          });

          // If the transition succeeded, verify all state invariants:
          // 1. Resulting stage must exist in the pinned pipeline
          const stageObj = pipeline.dsl.stages.find(
            (s) => s.id === res.currentStage,
          );
          expect(stageObj).toBeDefined();

          // 2. Ball-with must match the stage definition
          expect(res.ballWith).toBe(stageObj!.ball_with);

          // 3. Transition from previousStage -> currentStage must exist in pipeline transitions
          const validEdge = pipeline.dsl.transitions.find(
            (t) =>
              t.from === beforeApp.stage &&
              t.to === res.currentStage &&
              t.allowed_roles.includes(role),
          );
          expect(validEdge).toBeDefined();

          // 4. Version incremented by exactly 1
          expect(res.version).toBe(beforeApp.version + 1);
        } catch (err: any) {
          // Rejected transitions must leave application state completely unchanged
          const afterApp =
            await workflowService.getApplicationWithTimeline(appId);
          expect(afterApp.stage).toBe(beforeApp.stage);
          expect(afterApp.version).toBe(beforeApp.version);
        }

        // Audit chain must remain valid at all times
        const chainReport = await auditService.verifyChain(appId);
        expect(chainReport.valid).toBe(true);
      }
    });
  });

  describe("5. Verification: Push 50 Seeded Applications Through Full Pipelines & Catch SQL Tampering", () => {
    it("pushes all 50 seeded applications through full pipelines, blocks normal UPDATE/DELETE, and catches SQL tampering on verify", async () => {
      const fiftyAppIds = Array.from(
        { length: 50 },
        (_, idx) =>
          `44444444-4444-4444-8444-444444444${(501 + idx).toString().padStart(3, "0")}`,
      );

      const summaryCounts = {
        ONLY_SCRUTINY_APPROVED: 0,
        ONLY_SCRUTINY_REJECTED: 0,
        ONLY_SCRUTINY_WITHDRAWN: 0,
        SCRUTINY_EVC_APPROVED: 0,
        SCRUTINY_EVC_REJECTED: 0,
      };

      for (let i = 0; i < fiftyAppIds.length; i++) {
        const appId = fiftyAppIds[i];
        const isEvc = (i + 1) % 2 === 0;
        clock.advanceDays(1);

        if (!isEvc) {
          // ONLY_SCRUTINY pipeline (25 applications)
          if (i % 10 === 8) {
            // Withdraw path
            await workflowService.submit(
              appId,
              "inst-user",
              UserRole.INSTITUTION,
              1,
              `50run-${appId}-1`,
            );
            await workflowService.withdraw(
              appId,
              "inst-user",
              UserRole.INSTITUTION,
              2,
              `50run-${appId}-2`,
              "Institution trust requested voluntary withdrawal for current cycle",
            );
            summaryCounts.ONLY_SCRUTINY_WITHDRAWN++;
          } else {
            await workflowService.submit(
              appId,
              "inst-user",
              UserRole.INSTITUTION,
              1,
              `50run-${appId}-1`,
            );
            await workflowService.completeStage(
              appId,
              "ro-user",
              UserRole.REGIONAL_OFFICER,
              2,
              `50run-${appId}-2`,
            );
            await workflowService.completeStage(
              appId,
              "committee-user",
              UserRole.COMMITTEE_MEMBER,
              3,
              `50run-${appId}-3`,
            );
            if (i % 10 === 4) {
              await workflowService.performAction({
                applicationId: appId,
                action: "reject",
                actorId: "bureau-user",
                actorRole: UserRole.BUREAU_OFFICER,
                expectedVersion: 4,
                idempotencyKey: `50run-${appId}-4`,
                reason: "Unrectified land title encumbrance deficiency",
              });
              summaryCounts.ONLY_SCRUTINY_REJECTED++;
            } else {
              await workflowService.advance(
                appId,
                "bureau-user",
                UserRole.BUREAU_OFFICER,
                4,
                `50run-${appId}-4`,
                "Competent authority granted Extension of Approval (EoA)",
              );
              summaryCounts.ONLY_SCRUTINY_APPROVED++;
            }
          }
        } else {
          // SCRUTINY_EVC pipeline (25 applications)
          await workflowService.submit(
            appId,
            "inst-user",
            UserRole.INSTITUTION,
            1,
            `50run-${appId}-1`,
          );
          await workflowService.completeStage(
            appId,
            "ro-user",
            UserRole.REGIONAL_OFFICER,
            2,
            `50run-${appId}-2`,
          );
          await workflowService.completeStage(
            appId,
            "committee-user",
            UserRole.COMMITTEE_MEMBER,
            3,
            `50run-${appId}-3`,
          );
          await workflowService.completeStage(
            appId,
            "committee-user",
            UserRole.COMMITTEE_MEMBER,
            4,
            `50run-${appId}-4`,
          );
          if (i % 10 === 9) {
            await workflowService.performAction({
              applicationId: appId,
              action: "reject",
              actorId: "bureau-user",
              actorRole: UserRole.BUREAU_OFFICER,
              expectedVersion: 5,
              idempotencyKey: `50run-${appId}-5`,
              reason: "EVC reported non-existent laboratory infrastructure",
            });
            summaryCounts.SCRUTINY_EVC_REJECTED++;
          } else {
            await workflowService.advance(
              appId,
              "bureau-user",
              UserRole.BUREAU_OFFICER,
              5,
              `50run-${appId}-5`,
              "EVC and Scrutiny verified; Letter of Approval (LoA) issued",
            );
            summaryCounts.SCRUTINY_EVC_APPROVED++;
          }
        }
      }

      // Verify all 50 applications reached terminal states and have intact SHA-256 chains
      for (const appId of fiftyAppIds) {
        const appView = await workflowService.getApplicationWithTimeline(appId);
        expect(["APPROVED", "REJECTED", "WITHDRAWN"]).toContain(appView.stage);
        const verifyReport = await auditController.verifyChain(appId);
        expect(verifyReport.valid).toBe(true);
        expect(verifyReport.firstBrokenLink).toBeNull();
      }

      // Verify normal UPDATE / DELETE is blocked by append-only protection
      const targetAppId = fiftyAppIds[0];
      const chainBefore = await auditService.getChainEntries(targetAppId);
      await expect(
        auditService.attemptUpdateOrDelete("UPDATE", chainBefore[1].id),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        auditService.attemptUpdateOrDelete("DELETE", chainBefore[1].id),
      ).rejects.toThrow(ForbiddenException);

      // Now simulate direct SQL tampering on entry index 2 of targetAppId
      await auditService.simulateSqlTamperForVerification(targetAppId, 2, {
        rationale: "TAMPERED_RATIONALE_BY_ROGUE_ACTOR",
        newState: { stage: "APPROVED", tampered: true },
      });

      // Run GET /audit/verify/:applicationId and inspect the broken link report
      const tamperReport = await auditController.verifyChain(targetAppId);
      expect(tamperReport.valid).toBe(false);
      expect(tamperReport.firstBrokenLink).not.toBeNull();
      expect(tamperReport.firstBrokenLink!.index).toBe(2);
      expect(tamperReport.firstBrokenLink!.entryId).toBe(chainBefore[2].id);
      expect(tamperReport.firstBrokenLink!.failureType).toBe(
        "ROW_HASH_MISMATCH",
      );
      expect(tamperReport.firstBrokenLink!.expectedHash).not.toBe(
        tamperReport.firstBrokenLink!.actualHash,
      );

      // Log verification output for inspection
      // eslint-disable-next-line no-console
      console.log(
        "=== 50-APPLICATION PIPELINE & AUDIT TAMPER VERIFICATION REPORT ===",
        JSON.stringify(
          {
            totalApplicationsProcessed: fiftyAppIds.length,
            terminalBreakdown: summaryCounts,
            tamperedApplicationReport: tamperReport,
          },
          null,
          2,
        ),
      );
    });

    it("exposes role-and-region-scoped list, timeline, and allowed-actions via ApplicationsController", async () => {
      const wroRoUser = {
        id: "22222222-2222-4222-8222-222222222203",
        sub: "keycloak-ro-western-uuid",
        keycloakId: "keycloak-ro-western-uuid",
        email: "ro.western@aicte.gov.in",
        fullName: "Dr. Suresh Patil (RO Western)",
        role: UserRole.REGIONAL_OFFICER,
        roles: ["REGIONAL_OFFICER"],
        regionId: "11111111-1111-4111-8111-111111111101",
        institutionId: undefined,
      };
      const instUser = {
        id: "22222222-2222-4222-8222-222222222206",
        sub: "keycloak-institution-uuid",
        keycloakId: "keycloak-institution-uuid",
        email: "institution@aicte.gov.in",
        fullName: "Dr. Arvind Kulkarni",
        role: UserRole.INSTITUTION,
        roles: ["INSTITUTION"],
        regionId: "11111111-1111-4111-8111-111111111101",
        institutionId: "33333333-3333-4333-8333-333333333301",
      };

      const appId = "44444444-4444-4444-8444-444444444501";
      const allowedForInst = await applicationsController.getAllowedActions(
        appId,
        instUser,
      );
      expect(
        allowedForInst.allowedActions.map((a) => a.action),
      ).toEqual(expect.arrayContaining(["submit", "withdraw"]));

      await applicationsController.submit(appId, instUser, {
        expectedVersion: 1,
        idempotencyKey: "ctrl-submit-1",
      });

      const appWithTimeline = await applicationsController.getById(
        appId,
        wroRoUser,
      );
      expect(appWithTimeline.stage).toBe("SUBMITTED");
      expect(appWithTimeline.timeline.length).toBe(2);
      expect(appWithTimeline.auditTrail.length).toBe(1);
    });
  });
});
