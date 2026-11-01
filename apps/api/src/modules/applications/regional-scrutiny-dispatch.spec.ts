import { Test, TestingModule } from "@nestjs/testing";
import { ApplicationsService } from "./applications.service";
import { ApplicationsController } from "./applications.controller";
import { WorkflowService } from "../workflow/workflow.service";
import { AuditService } from "../audit/audit.service";
import { EvcService } from "../evc/evc.service";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthenticatedUser } from "../auth/current-user.decorator";
import { UserRole } from "@samay/shared";

describe("Regional Scrutiny Triage Dispatch (Live State-Machine Pipelines)", () => {
  let controller: ApplicationsController;
  let auditService: AuditService;

  const mockUser: AuthenticatedUser = {
    id: "ro-user-01",
    keycloakId: "kc-ro-01",
    email: "suresh.patil@aicte.gov.in",
    fullName: "Dr. Suresh Patil (RO WRO)",
    role: UserRole.REGIONAL_OFFICER,
    roles: [UserRole.REGIONAL_OFFICER],
    regionId: "11111111-1111-4111-8111-111111111101",
  };

  const mockInstUser: AuthenticatedUser = {
    id: "inst-user-01",
    keycloakId: "kc-inst-01",
    email: "principal@narmadapoly.edu.in",
    fullName: "Dr. Arvind Shah (Principal)",
    role: UserRole.INSTITUTION,
    roles: [UserRole.INSTITUTION],
    regionId: "11111111-1111-4111-8111-111111111101",
    institutionId: "33333333-3333-4333-8333-333333333301",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        ApplicationsService,
        {
          provide: SystemClockService,
          useValue: {
            now: () => new Date("2026-11-01T10:00:00.000Z"),
            isoString: () => "2026-11-01T10:00:00.000Z",
            plusDays: (days: number) => {
              const d = new Date("2026-11-01T10:00:00.000Z");
              d.setDate(d.getDate() + days);
              return d;
            },
          },
        },
        {
          provide: PrismaService,
          useValue: {
            isConnected: false,
          },
        },
        {
          provide: WorkflowService,
          useValue: {
            getAllApplications: () => [
              {
                id: "sc-01",
                applicationRef: "EOA-2027-1042",
                institutionId: "33333333-3333-4333-8333-333333333301",
                regionId: "11111111-1111-4111-8111-111111111101",
                applicationTypeId: "55555555-5555-4555-8555-555555555501",
                academicYear: "2026-27",
                stage: "SCRUTINY",
                status: "UNDER_SCRUTINY",
                pipelineDefinitionId: "66666666-6666-4666-8666-666666666601",
                ballWith: "REGIONAL_OFFICE",
                version: 1,
                institution: {
                  id: "33333333-3333-4333-8333-333333333301",
                  name: "Sahyadri Institute of Technology",
                  aictePermanentId: "1-4000000001",
                  state: "Maharashtra",
                  district: "Pune",
                },
                region: {
                  id: "11111111-1111-4111-8111-111111111101",
                  code: "WRO",
                  name: "Western Region",
                },
              },
            ],
            getApplicationWithTimeline: async (id: string) => ({
              id,
              applicationRef: "EOA-2027-1042",
              institutionId: "33333333-3333-4333-8333-333333333301",
              regionId: "11111111-1111-4111-8111-111111111101",
              academicYear: "2026-27",
              stage: "SCRUTINY",
              status: "UNDER_SCRUTINY",
              pipelineDefinitionId: "66666666-6666-4666-8666-666666666601",
              ballWith: "REGIONAL_OFFICE",
              version: 1,
              institution: {
                name: "Sahyadri Institute of Technology",
              },
              region: {
                name: "Western Region",
              },
              timeline: [],
              auditTrail: [],
            }),
            updateApplicationStore: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            appendEntry: jest.fn().mockImplementation(async (input) => ({
              id: "audit-row-01",
              entityType: input.entityType || "APPLICATION",
              entityId: input.entityId,
              action: input.action,
              actorId: input.actorId,
              actorRole: input.actorRole,
              previousState: input.previousState,
              newState: input.newState,
              rationale: input.rationale,
              timestamp: input.timestamp || "2026-11-01T10:00:00.000Z",
              prevHash: "GENESIS",
              hash: "mock-sha256-hash-chain-digest-01",
            })),
          },
        },
        {
          provide: EvcService,
          useValue: {
            handleWorkflowRequiresEvcEvent: jest.fn(),
            listInspections: jest.fn().mockReturnValue({
              total: 1,
              items: [
                {
                  id: "evc-01",
                  applicationRef: "EOA-2027-1042",
                  status: "EVC_SCHEDULED",
                },
              ],
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ApplicationsController>(ApplicationsController);
    auditService = module.get<AuditService>(AuditService);
  });

  describe("Accept Action (Regional Scrutiny)", () => {
    it("should atomically update status to SCRUTINY_CLEARED and write immutable audit entry", async () => {
      const result = await controller.acceptScrutiny("sc-01", mockUser, {
        rationale: "All NBC fire and land documents verified in order.",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("SCRUTINY_CLEARED");
      expect(result.stage).toBe("APPROVAL");
      expect(result.ballWith).toBe("AICTE");
      expect(result.advisoryTag).toBe("ADVISORY");

      expect(auditService.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "SCRUTINY_ACCEPTED_CLEARED",
          actorId: mockUser.id,
          entityId: "sc-01",
          rationale: "All NBC fire and land documents verified in order.",
        }),
      );
    });
  });

  describe("Deficiency / Defect Action (Regional Scrutiny)", () => {
    it("should generate an 8-point deficiency record with strict 15-day deadline and broadcast active alert", async () => {
      const result = await controller.issueDeficiency("sc-01", mockUser, {
        description:
          "Missing 30-year Encumbrance Certificate and National Building Code NBC Part 4 Fire NOC",
        aphClause: "Clause 1.4.3 & Clause 6.4",
        requiredEvidence:
          "Sub-Registrar 30-Year Encumbrance Certificate and Fire Authority NBC NOC",
        deadlineDays: 15,
        rationale: "Non-negotiable statutory infrastructure prerequisite",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("SCRUTINY_DEFICIENT");
      expect(result.ballWith).toBe("INSTITUTION");
      expect(result.deadlineDays).toBe(15);
      expect(result.responseDeadline).toBe("2026-11-16T10:00:00.000Z"); // 15 days from Nov 1
      expect(result.deficiencyId).toContain("DEF-");
      expect(result.advisoryTag).toBe("ADVISORY");

      // Verify audit trail write
      expect(auditService.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "SCRUTINY_DEFICIENCY_RECORDED",
          actorId: mockUser.id,
          entityId: "sc-01",
        }),
      );

      // Verify institution action alert feed is immediately populated
      const alertFeed = await controller.getInstitutionAlerts(mockInstUser);
      expect(alertFeed.items.length).toBeGreaterThan(0);
      const alert = alertFeed.items.find(
        (a: any) => a.metadata?.applicationId === "sc-01",
      );
      expect(alert).toBeDefined();
      expect(alert.metadata?.deadline).toBe("2026-11-16T10:00:00.000Z");

      // Verify deficiency record can be queried
      const defRecords = await controller.getDeficiencies("sc-01", mockUser);
      expect(defRecords.total).toBeGreaterThan(0);
      const item = defRecords.items[0];
      expect(item.deadlineDays).toBe(15);
      expect(item.verificationStatus).toBe("PENDING_SUBMISSION");
    });
  });

  describe("Forward to EVC Action (Regional Scrutiny)", () => {
    it("should transition status to EVC_SCHEDULED and make case visible for committee allocation", async () => {
      const result = await controller.forwardToEvc("sc-01", mockUser, {
        inspectionDate: "2026-11-12T09:00:00.000Z",
        panelChair: "Dr. K. G. Narayanan (IIT Bombay)",
        panelMember2: "Prof. Sunita Rao (COEP Technological Univ)",
        rationale:
          "Document scrutiny passed. Inspection required for lab verification.",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("EVC_SCHEDULED");
      expect(result.stage).toBe("EVC");
      expect(result.inspectionId).toBeDefined();
      expect(result.inspectionDate).toBe("2026-11-12T09:00:00.000Z");
      expect(result.advisoryTag).toBe("ADVISORY");

      expect(auditService.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "SCRUTINY_FORWARDED_TO_EVC",
          actorId: mockUser.id,
          entityId: "sc-01",
        }),
      );
    });
  });

  describe("Regional Scrutiny Queue", () => {
    it("should return active scrutiny queue cases with deficiency counts and SLA status", async () => {
      const queue = await controller.getRegionalScrutinyQueue(mockUser);
      expect(queue.items.length).toBeGreaterThan(0);
      const first = queue.items[0];
      expect(first.ref).toBe("EOA-2027-1042");
      expect(first.stage).toBe("SCRUTINY");
      expect(first.slaState).toBeDefined();
    });
  });

  describe("Stage 2: Deficiency Resolution & Resubmission to Scrutiny Queue", () => {
    it("should transition status to DEFICIENCY_RESOLVED_RESUBMITTED and pass ball to REGIONAL_OFFICER", async () => {
      const result = await controller.resolveDeficiency("sc-01", mockInstUser, {
        deficiencyId: "DEF-EOA-2027-1042-01",
        evidenceFileName: "Notarized_Cadre_Affidavit_Signed.pdf",
        responseNotes:
          "Faculty cadre deficiency resolved per APH norms; evidence uploaded.",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("DEFICIENCY_RESOLVED_RESUBMITTED");
      expect(result.stage).toBe("SCRUTINY");
      expect(result.ballWith).toBe("REGIONAL_OFFICER");
      expect(result.currentQueue).toBe("REGIONAL_SCRUTINY");
      expect(result.advisoryTag).toBe("ADVISORY");

      expect(auditService.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DEFICIENCY_RESOLVED_RESUBMITTED",
          actorId: mockInstUser.id,
          entityId: "sc-01",
        }),
      );
    });
  });

  describe("Stage 4: Committee Member Dashboard & Report Submission", () => {
    const mockCommitteeUser: AuthenticatedUser = {
      id: "comm-user-01",
      keycloakId: "kc-comm-01",
      email: "panel.chair@evc.aicte.gov.in",
      fullName: "Prof. K. G. Narayanan (EVC Chair)",
      role: UserRole.COMMITTEE_MEMBER,
      roles: [UserRole.COMMITTEE_MEMBER],
      regionId: "11111111-1111-4111-8111-111111111101",
    };

    it("should allow committee member to submit inspection report and advance to EXECUTIVE_APPROVAL", async () => {
      const result = await controller.submitEvcReport(
        "sc-01",
        mockCommitteeUser,
        {
          observations:
            "All physical labs, faculty roster, and library books verified compliant.",
          reportFingerprint:
            "a8f3b4c1e920d583b271e84019d615a2f14081c75e6201b483109a82649b1049",
        },
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe("EVC_REPORT_SUBMITTED");
      expect(result.stage).toBe("FINAL_DECISION");
      expect(result.ballWith).toBe("EXECUTIVE_COMMITTEE");
      expect(result.currentQueue).toBe("EXECUTIVE_APPROVAL");
      expect(result.advisoryTag).toBe("ADVISORY");

      expect(auditService.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EVC_REPORT_SUBMITTED",
          actorId: mockCommitteeUser.id,
          entityId: "sc-01",
        }),
      );
    });
  });

  describe("Stage 5: Final Decision (Approval / Rejection) by Competent Authority", () => {
    const mockBureauUser: AuthenticatedUser = {
      id: "bureau-user-01",
      keycloakId: "kc-bureau-01",
      email: "member.secretary@aicte.gov.in",
      fullName: "Member Secretary (AICTE HQ)",
      role: UserRole.BUREAU_OFFICER,
      roles: [UserRole.BUREAU_OFFICER],
      regionId: "11111111-1111-4111-8111-111111111101",
    };

    it("should issue final approval (EoA) and transition to ARCHIVED with order number", async () => {
      const result = await controller.issueFinalDecision(
        "sc-01",
        mockBureauUser,
        {
          decision: "APPROVED",
          rationale:
            "Scrutiny and EVC inspection reports reviewed and approved by Executive Committee.",
          orderNumber: "AICTE/APH/2027/EOA-FINAL-1042",
        },
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe("APPROVED");
      expect(result.stage).toBe("FINAL_DECISION");
      expect(result.ballWith).toBe("INSTITUTION");
      expect(result.currentQueue).toBe("ARCHIVED");
      expect(result.orderNumber).toBe("AICTE/APH/2027/EOA-FINAL-1042");
      expect(result.advisoryTag).toBe("ADVISORY");

      expect(auditService.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "FINAL_APPROVAL_ISSUED",
          actorId: mockBureauUser.id,
          entityId: "sc-01",
        }),
      );
    });

    it("should issue final rejection decree when decision is REJECTED", async () => {
      const result = await controller.issueFinalDecision(
        "sc-01",
        mockBureauUser,
        {
          decision: "REJECTED",
          rationale:
            "Critical land ownership discrepancy unresolved under APH Clause 1.4.3.",
          orderNumber: "AICTE/APH/2027/REJ-FINAL-1042",
        },
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe("REJECTED");
      expect(result.currentQueue).toBe("ARCHIVED");

      expect(auditService.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "FINAL_REJECTION_ISSUED",
          actorId: mockBureauUser.id,
          entityId: "sc-01",
        }),
      );
    });
  });
});
