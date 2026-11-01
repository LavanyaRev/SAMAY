import { Test, TestingModule } from "@nestjs/testing";
import { AphRagService } from "./aph-rag.service";
import { SystemClockService } from "../common/clock/clock.service";

describe("AphRagService", () => {
  let service: AphRagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AphRagService,
        {
          provide: SystemClockService,
          useValue: {
            now: () => new Date("2026-11-01T10:00:00.000Z"),
            isoString: () => "2026-11-01T10:00:00.000Z",
          },
        },
      ],
    }).compile();

    service = module.get<AphRagService>(AphRagService);
  });

  it("should be defined and initialize chunks", () => {
    expect(service).toBeDefined();
    const chunks = service.getAllChunks();
    expect(chunks.length).toBeGreaterThan(10);
  });

  it("should retrieve fire safety clauses with high relevance and advisory tagging", () => {
    const results = service.searchAphPolicyRag(
      "National Building Code NBC Fire Safety Certificate",
    );
    expect(results.length).toBeGreaterThan(0);
    const topResult = results[0];
    expect(topResult.clause).toContain("6.4");
    expect(topResult.advisoryTag).toBe("ADVISORY");
    expect(topResult.statutoryWeight).toBeGreaterThanOrEqual(95);
  });

  it("should retrieve faculty student ratio norms for UG engineering", () => {
    const results = service.searchAphPolicyRag(
      "faculty student ratio FSR cadre ratio 1:20 UG engineering",
    );
    expect(results.length).toBeGreaterThan(0);
    const fsrResult = results.find(
      (r) => r.clause.includes("2.1.8") || r.clause.includes("6.7"),
    );
    expect(fsrResult).toBeDefined();
    expect(fsrResult?.advisoryTag).toBe("ADVISORY");
  });

  it("should link an uploaded document to its governing clause and detect missing NBC certification", () => {
    const docMatch = service.linkDocumentToAphClause({
      id: "doc-fire-01",
      type: "FIRE_SAFETY",
      title: "Local Municipality Fire NOC",
      contentText: "Fire safety check conducted on 2026-01-15",
    });

    expect(docMatch.advisoryTag).toBe("ADVISORY");
    expect(docMatch.detectedDeficiencies.length).toBeGreaterThan(0);
    expect(docMatch.detectedDeficiencies[0]).toContain("NBC");
    expect(docMatch.suggestedAction).toBe("ISSUE_DEFICIENCY");
  });

  it("should evaluate full application compliance and generate critical advisories", () => {
    const evaluation = service.evaluateApplicationCompliance({
      applicationRef: "APP-2027-1042",
      applicationType: "NEW_INSTITUTION",
      documents: [
        {
          id: "doc-1",
          type: "LAND_TITLE",
          title: "30-Year Registered Lease Deed",
          content: "Registered lease for 30 years contiguous plot",
        },
      ],
    });

    expect(evaluation.advisoryTag).toBe("ADVISORY");
    expect(
      evaluation.statutoryAdvisories.some((a) => a.clause.includes("6.4")),
    ).toBe(true);
    expect(evaluation.recommendedWorkflowStage).toBe("SCRUTINY_DEFICIENT");
  });
});
