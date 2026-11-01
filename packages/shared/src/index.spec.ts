import { describe, expect, it } from "vitest";
import {
  ApplicationStatus,
  UserRole,
  WorkflowDefinitionSchema,
  WorkflowStage,
  STATUTORY_ADVISORY_LABEL,
  AdvisoryRecommendationSchema,
  AphApplicationCategory,
  evaluateAphWorkflow,
  getStatutoryPolicy,
  analyzeDocumentAgainstAph,
} from "./index.js";

describe("@samay/shared - Workflow Rule DSL and Schemas", () => {
  it("should validate a complete workflow definition JSON as DATA", () => {
    const sampleWorkflowData = {
      id: "aicte-approval-core-v1",
      version: "1.0.0",
      name: "AICTE Approval Workflow 2026-27",
      description:
        "Standard statutory evaluation workflow from Scrutiny to SAC/SHC",
      aphCycle: "APH-2026-2027-TODO(APH-VERIFY)",
      initialState: ApplicationStatus.SUBMITTED,
      terminalStates: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED],
      transitions: [
        {
          id: "t-scrutiny-start",
          name: "Begin Scrutiny Committee Verification",
          stage: WorkflowStage.SCRUTINY,
          from: ApplicationStatus.SUBMITTED,
          to: ApplicationStatus.UNDER_SCRUTINY,
          allowedRoles: [UserRole.REGIONAL_OFFICER, UserRole.SCRUTINY_MEMBER],
          requiresHumanSignoff: true,
          aphClause: "TODO(APH-VERIFY)",
          conditions: [
            {
              id: "c-all-docs-uploaded",
              field: "documents.isComplete",
              operator: "EQUALS",
              value: true,
              description:
                "All mandatory compliance documents must be uploaded",
            },
          ],
          actions: [
            {
              id: "a-log-audit",
              type: "RECORD_AUDIT_LOG",
              params: { event: "SCRUTINY_COMMENCED" },
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

  it("should enforce statutory ADVISORY label on automated recommendations", () => {
    const recommendation = {
      classification: STATUTORY_ADVISORY_LABEL,
      ruleId: "RULE-LAND-DEFICIENCY-01",
      aphClause: "TODO(APH-VERIFY)",
      summary: "Potential land lease expiry detected within 12 months",
      rationale:
        "Lease registered under parcel 402 expires before academic term 2027.",
      score: 85,
      generatedAt: "2026-10-30T12:00:00Z",
    };

    const parsed = AdvisoryRecommendationSchema.safeParse(recommendation);
    expect(parsed.success).toBe(true);
  });

  it("should evaluate configurable APH workflow and respect conditional SAC/SHC separation", () => {
    // Standard EoA without contest
    const standardPlan = evaluateAphWorkflow({
      category: AphApplicationCategory.EOA_SELF_DISCLOSURE,
    });
    expect(standardPlan.isSacApplicable).toBe(false);
    expect(standardPlan.isShcApplicable).toBe(false);
    expect(standardPlan.isEvcMandatory).toBe(false);
    expect(standardPlan.stages.map((s) => s.id)).toEqual([
      "SUBMISSION",
      "SCRUTINY",
      "FINAL_DECISION",
    ]);

    // Contested Rejection -> SAC attached
    const contestedPlan = evaluateAphWorkflow({
      category: AphApplicationCategory.EOA_SELF_DISCLOSURE,
      isContestedRejection: true,
    });
    expect(contestedPlan.isSacApplicable).toBe(true);
    expect(contestedPlan.stages.some((s) => s.id === "SAC")).toBe(true);
    const sacStage = contestedPlan.stages.find((s) => s.id === "SAC");
    expect(sacStage?.governingClause).toContain("Clause 3.2");

    // New Institution -> Mandatory EVC
    const newInstPlan = evaluateAphWorkflow({
      category: AphApplicationCategory.NEW_INSTITUTION,
    });
    expect(newInstPlan.isEvcMandatory).toBe(true);
    expect(newInstPlan.stages.some((s) => s.id === "EVC")).toBe(true);

    // Shortcomings / SCN -> SHC attached
    const shcPlan = evaluateAphWorkflow({
      category: AphApplicationCategory.COURSE_VARIATION_INTAKE,
      hasShortcomingsOrScn: true,
    });
    expect(shcPlan.isShcApplicable).toBe(true);
    expect(shcPlan.stages.some((s) => s.id === "SHC")).toBe(true);
    const shcStage = shcPlan.stages.find((s) => s.id === "SHC");
    expect(shcStage?.governingClause).toContain("Clause 3.1");
  });

  it("should retrieve statutory policy parameters and externalized deadlines", () => {
    const scrutinyPolicy = getStatutoryPolicy("SCRUTINY_SLA_DAYS");
    expect(scrutinyPolicy).toBeDefined();
    expect(scrutinyPolicy?.deadlineDays).toBe(15);
    expect(scrutinyPolicy?.sourceClause).toContain("Clause 2.4.1");

    const sacPolicy = getStatutoryPolicy("SAC_APPEAL_FILING_WINDOW_DAYS");
    expect(sacPolicy?.deadlineDays).toBe(10);

    const leasePolicy = getStatutoryPolicy("LEASE_DEED_WARNING_HORIZON_DAYS");
    expect(leasePolicy?.deadlineDays).toBe(60);

    const facultyPolicy = getStatutoryPolicy(
      "MANDATORY_FACULTY_CADRE_RATIO_UG",
    );
    expect(facultyPolicy?.thresholdValue).toBe("1:15");
  });

  it("should map documents to governing APH clauses with completeness verification", () => {
    const fireAnalysis = analyzeDocumentAgainstAph({
      documentName: "Fire_NOC_Municipal_2026.pdf",
      sha256Hash:
        "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    });
    expect(fireAnalysis.aphClause).toContain("Clause 2.4.2");
    expect(fireAnalysis.advisoryRationale).toContain("ADVISORY");

    const landAnalysis = analyzeDocumentAgainstAph({
      documentName: "Registered_Lease_Deed_Parcel4.pdf",
      sha256Hash:
        "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5",
    });
    expect(landAnalysis.aphClause).toContain("Clause 1.4.2");
    expect(landAnalysis.governingPolicyDeadline).toContain("60 days");

    const facultyAnalysis = analyzeDocumentAgainstAph({
      documentName: "Faculty_Cadre_Affidavit_Signed.pdf",
    });
    expect(facultyAnalysis.aphClause).toContain("Clause 5.1.4");
  });
});
