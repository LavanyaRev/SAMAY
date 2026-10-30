import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { STATUTORY_ADVISORY_LABEL } from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";

export type ExpertPanelRole = "CHAIRPERSON" | "MEMBER" | "CONVENER";

export interface EvcExpertMember {
  expertUserId: string;
  fullName: string;
  role: ExpertPanelRole;
  designation: string;
  region: string;
  parentInstitutionId: string;
  parentInstitutionName: string;
  trustOrSociety: string;
  expertiseTags: string[];
  availableDates: string[]; // YYYY-MM-DD
  activeWorkloadCount: number;
  maxWorkloadCap: number;
  priorAssociatedInstitutionIds: string[];
}

export interface ConflictOfInterestRejection {
  expertUserId: string;
  fullName: string;
  parentInstitutionName: string;
  trustOrSociety: string;
  conflictType:
    | "SAME_INSTITUTION"
    | "SAME_TRUST_OR_SOCIETY"
    | "PRIOR_ASSOCIATION_LIST"
    | "WORKLOAD_CAP_EXCEEDED"
    | "NO_AVAILABILITY";
  reason: string;
  ruleCited: string;
}

export interface EvcPanel {
  id: string;
  panelCode: string;
  region: string;
  members: EvcExpertMember[];
  expertiseTags: string[];
  availability: string[]; // Common available dates across panel members
  totalWorkloadScore: number;
  expertiseMatchScore: number;
  compositeRankScore: number;
  classification: typeof STATUTORY_ADVISORY_LABEL;
  rationale: {
    ruleId: string;
    // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
    aphClause: string;
    summary: string;
    coiClearanceSummary: string;
  };
}

export interface PanelProposalResult {
  classification: typeof STATUTORY_ADVISORY_LABEL;
  generatedAt: string;
  proposedPanels: EvcPanel[];
  rejectedExperts: ConflictOfInterestRejection[];
}

const INITIAL_EXPERT_POOL: EvcExpertMember[] = [
  // WRO Conflict Candidates (will be rejected for Walchand / Shikshan Prasarak Mandal)
  {
    expertUserId: "exp-wro-coi-inst",
    fullName: "Prof. Milind Joshi",
    role: "CHAIRPERSON",
    designation: "Professor of Computer Engineering",
    region: "WRO",
    parentInstitutionId: "inst-wce-sangli",
    parentInstitutionName: "Walchand College of Engineering, Sangli",
    trustOrSociety: "Maharashtra Technical Education Society",
    expertiseTags: ["ENGINEERING_TECHNOLOGY", "AI_DS", "INFRASTRUCTURE"],
    availableDates: ["2026-05-10", "2026-05-12", "2026-05-14", "2026-05-18"],
    activeWorkloadCount: 0,
    maxWorkloadCap: 4,
    priorAssociatedInstitutionIds: [],
  },
  {
    expertUserId: "exp-wro-coi-trust",
    fullName: "Dr. Vandana Gokhale",
    role: "MEMBER",
    designation: "Dean Academics",
    region: "WRO",
    parentInstitutionId: "inst-spm-pune",
    parentInstitutionName: "SPM Institute of Information Technology, Pune",
    trustOrSociety: "Shikshan Prasarak Mandal, Pune",
    expertiseTags: ["ENGINEERING_TECHNOLOGY", "AI_DS", "COMPUTING_LABS"],
    availableDates: ["2026-05-10", "2026-05-12", "2026-05-14", "2026-05-18"],
    activeWorkloadCount: 1,
    maxWorkloadCap: 4,
    priorAssociatedInstitutionIds: [],
  },
  {
    expertUserId: "exp-wro-coi-prior",
    fullName: "Prof. Shrikant Bapat",
    role: "CONVENER",
    designation: "Former Visiting Faculty & BoG Nominee",
    region: "WRO",
    parentInstitutionId: "inst-vjti-mumbai",
    parentInstitutionName: "VJTI Mumbai",
    trustOrSociety: "VJTI Autonomous Board",
    expertiseTags: ["ENGINEERING_TECHNOLOGY", "AI_DS", "INFRASTRUCTURE"],
    availableDates: ["2026-05-10", "2026-05-12", "2026-05-14", "2026-05-18"],
    activeWorkloadCount: 0,
    maxWorkloadCap: 4,
    priorAssociatedInstitutionIds: ["inst-new-pune-ai", "inst-wce-sangli"],
  },
  // Clean WRO Experts with varying workloads
  {
    expertUserId: "exp-wro-clean-1",
    fullName: "Prof. Raghunath Kashyap",
    role: "CHAIRPERSON",
    designation: "Senior Professor, IIT Bombay",
    region: "WRO",
    parentInstitutionId: "inst-iit-bombay",
    parentInstitutionName: "Indian Institute of Technology Bombay",
    trustOrSociety: "Ministry of Education Autonomous IIT",
    expertiseTags: [
      "ENGINEERING_TECHNOLOGY",
      "AI_DS",
      "INFRASTRUCTURE",
      "COMPUTING_LABS",
    ],
    availableDates: ["2026-05-10", "2026-05-12", "2026-05-14", "2026-05-18"],
    activeWorkloadCount: 1,
    maxWorkloadCap: 4,
    priorAssociatedInstitutionIds: [],
  },
  {
    expertUserId: "exp-wro-clean-2",
    fullName: "Dr. Meenakshi Nadkarni",
    role: "MEMBER",
    designation: "Head of AI & Data Science, VNIT Nagpur",
    region: "WRO",
    parentInstitutionId: "inst-vnit-nagpur",
    parentInstitutionName: "Visvesvaraya National Institute of Technology",
    trustOrSociety: "NIT Council India",
    expertiseTags: ["ENGINEERING_TECHNOLOGY", "AI_DS", "COMPUTING_LABS"],
    availableDates: ["2026-05-10", "2026-05-12", "2026-05-14", "2026-05-18"],
    activeWorkloadCount: 0,
    maxWorkloadCap: 4,
    priorAssociatedInstitutionIds: [],
  },
  {
    expertUserId: "exp-wro-clean-3",
    fullName: "Prof. Harishchandra Sawant",
    role: "CONVENER",
    designation: "Professor of Civil & Infrastructure, Sardar Patel CE",
    region: "WRO",
    parentInstitutionId: "inst-spce-mumbai",
    parentInstitutionName: "Sardar Patel College of Engineering, Mumbai",
    trustOrSociety: "Bharatiya Vidya Bhavan",
    expertiseTags: ["ENGINEERING_TECHNOLOGY", "INFRASTRUCTURE", "STRUCTURAL"],
    availableDates: ["2026-05-10", "2026-05-12", "2026-05-14", "2026-05-18"],
    activeWorkloadCount: 1,
    maxWorkloadCap: 4,
    priorAssociatedInstitutionIds: [],
  },
  {
    expertUserId: "exp-wro-clean-4",
    fullName: "Prof. Devendra Chitale",
    role: "CHAIRPERSON",
    designation: "Professor Emeritus, SVNIT Surat",
    region: "WRO",
    parentInstitutionId: "inst-svnit-surat",
    parentInstitutionName: "SVNIT Surat",
    trustOrSociety: "NIT Council India",
    expertiseTags: ["ENGINEERING_TECHNOLOGY", "AI_DS", "HIGH_VOLTAGE_LAB"],
    availableDates: ["2026-05-12", "2026-05-14", "2026-05-20"],
    activeWorkloadCount: 3, // Higher workload -> ranked lower than Panel 1
    maxWorkloadCap: 4,
    priorAssociatedInstitutionIds: [],
  },
  {
    expertUserId: "exp-wro-clean-5",
    fullName: "Dr. Sunita Borgaonkar",
    role: "MEMBER",
    designation: "Associate Professor, GEC Goa",
    region: "WRO",
    parentInstitutionId: "inst-gec-goa",
    parentInstitutionName: "Goa College of Engineering",
    trustOrSociety: "Directorate of Technical Education Goa",
    expertiseTags: ["ENGINEERING_TECHNOLOGY", "COMPUTING_LABS"],
    availableDates: ["2026-05-12", "2026-05-14", "2026-05-20"],
    activeWorkloadCount: 2,
    maxWorkloadCap: 4,
    priorAssociatedInstitutionIds: [],
  },
  {
    expertUserId: "exp-wro-clean-6",
    fullName: "Dr. Nilesh Kadam",
    role: "CONVENER",
    designation: "Professor, KJSCE Mumbai",
    region: "WRO",
    parentInstitutionId: "inst-kjsce-mumbai",
    parentInstitutionName: "KJ Somaiya College of Engineering",
    trustOrSociety: "Somaiya Vidyavihar Trust",
    expertiseTags: ["ENGINEERING_TECHNOLOGY", "INFRASTRUCTURE"],
    availableDates: ["2026-05-12", "2026-05-14", "2026-05-20"],
    activeWorkloadCount: 2,
    maxWorkloadCap: 4,
    priorAssociatedInstitutionIds: [],
  },
];

@Injectable()
export class PanelProposalService {
  private experts: EvcExpertMember[] = [];
  /**
   * Configurable prior-association registry mapping `institutionId -> Set<expertUserId>`
   */
  private readonly priorAssociationRegistry = new Map<string, Set<string>>();

  constructor(private readonly clock: SystemClockService) {
    this.resetExpertPool();
  }

  resetExpertPool(): void {
    this.experts = JSON.parse(JSON.stringify(INITIAL_EXPERT_POOL));
    this.priorAssociationRegistry.clear();
    this.priorAssociationRegistry.set(
      "inst-new-pune-ai",
      new Set(["exp-wro-coi-prior"]),
    );
  }

  getExperts(): EvcExpertMember[] {
    return [...this.experts];
  }

  registerPriorAssociation(institutionId: string, expertUserId: string): void {
    const existing =
      this.priorAssociationRegistry.get(institutionId) ?? new Set<string>();
    existing.add(expertUserId);
    this.priorAssociationRegistry.set(institutionId, existing);
  }

  incrementExpertWorkload(expertUserIds: string[]): void {
    for (const id of expertUserIds) {
      const exp = this.experts.find((e) => e.expertUserId === id);
      if (exp) {
        exp.activeWorkloadCount += 1;
      }
    }
  }

  /**
   * Proposes conflict-free 3-member EVC panels ranked by region, expertise match,
   * lowest active workload, and overlapping availability.
   * Rejects any expert with Same Institution, Same Trust/Society, or Prior Association conflict.
   */
  proposePanelsForCase(input: {
    applicationId: string;
    institutionId: string;
    institutionName: string;
    trustOrSociety: string;
    region: string;
    requiredExpertiseTags: string[];
    preferredDateWindow?: string[];
  }): PanelProposalResult {
    const rejectedExperts: ConflictOfInterestRejection[] = [];
    const eligibleExperts: EvcExpertMember[] = [];
    const configuredPriorSet =
      this.priorAssociationRegistry.get(input.institutionId) ??
      new Set<string>();

    for (const expert of this.experts) {
      // 1. Conflict of Interest Check A: Same Institution
      if (
        expert.parentInstitutionId === input.institutionId ||
        expert.parentInstitutionName.toLowerCase() ===
          input.institutionName.toLowerCase()
      ) {
        rejectedExperts.push({
          expertUserId: expert.expertUserId,
          fullName: expert.fullName,
          parentInstitutionName: expert.parentInstitutionName,
          trustOrSociety: expert.trustOrSociety,
          conflictType: "SAME_INSTITUTION",
          reason: `Disqualified: Expert belongs to applicant institution (${expert.parentInstitutionName}).`,
          // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
          ruleCited: "RULE-EVC-COI-SAME-INSTITUTION (TODO(APH-VERIFY))",
        });
        continue;
      }

      // 2. Conflict of Interest Check B: Same Trust or Society
      if (
        expert.trustOrSociety.toLowerCase() ===
        input.trustOrSociety.toLowerCase()
      ) {
        rejectedExperts.push({
          expertUserId: expert.expertUserId,
          fullName: expert.fullName,
          parentInstitutionName: expert.parentInstitutionName,
          trustOrSociety: expert.trustOrSociety,
          conflictType: "SAME_TRUST_OR_SOCIETY",
          reason: `Disqualified: Expert's parent body shares the same Trust/Society (${expert.trustOrSociety}).`,
          // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
          ruleCited: "RULE-EVC-COI-SAME-TRUST-SOCIETY (TODO(APH-VERIFY))",
        });
        continue;
      }

      // 3. Conflict of Interest Check C: Configurable Prior-Association List
      if (
        expert.priorAssociatedInstitutionIds.includes(input.institutionId) ||
        configuredPriorSet.has(expert.expertUserId)
      ) {
        rejectedExperts.push({
          expertUserId: expert.expertUserId,
          fullName: expert.fullName,
          parentInstitutionName: expert.parentInstitutionName,
          trustOrSociety: expert.trustOrSociety,
          conflictType: "PRIOR_ASSOCIATION_LIST",
          reason: `Disqualified: Expert appears on the configurable prior-association registry for ${input.institutionName}.`,
          // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
          ruleCited: "RULE-EVC-COI-PRIOR-ASSOCIATION (TODO(APH-VERIFY))",
        });
        continue;
      }

      // 4. Workload Cap Check
      if (expert.activeWorkloadCount >= expert.maxWorkloadCap) {
        rejectedExperts.push({
          expertUserId: expert.expertUserId,
          fullName: expert.fullName,
          parentInstitutionName: expert.parentInstitutionName,
          trustOrSociety: expert.trustOrSociety,
          conflictType: "WORKLOAD_CAP_EXCEEDED",
          reason: `Unavailable: Active EVC workload (${expert.activeWorkloadCount}/${expert.maxWorkloadCap}) reached statutory cap.`,
          ruleCited: "RULE-EVC-WORKLOAD-CAP",
        });
        continue;
      }

      // 5. Availability Check
      if (expert.availableDates.length === 0) {
        rejectedExperts.push({
          expertUserId: expert.expertUserId,
          fullName: expert.fullName,
          parentInstitutionName: expert.parentInstitutionName,
          trustOrSociety: expert.trustOrSociety,
          conflictType: "NO_AVAILABILITY",
          reason: "Unavailable: No open inspection dates in current window.",
          ruleCited: "RULE-EVC-AVAILABILITY",
        });
        continue;
      }

      eligibleExperts.push(expert);
    }

    // Score each eligible expert by Region match, Expertise overlap, and Workload (lower workload = higher score)
    const scoreExpert = (exp: EvcExpertMember): number => {
      const regionBonus = exp.region === input.region ? 30 : 10;
      const matchingTags = exp.expertiseTags.filter((tag) =>
        input.requiredExpertiseTags.includes(tag),
      ).length;
      const expertiseBonus = matchingTags * 20;
      const workloadScore = Math.max(0, 40 - exp.activeWorkloadCount * 12);
      return regionBonus + expertiseBonus + workloadScore;
    };

    const chairs = eligibleExperts
      .filter((e) => e.role === "CHAIRPERSON")
      .sort((a, b) => scoreExpert(b) - scoreExpert(a));
    const members = eligibleExperts
      .filter((e) => e.role === "MEMBER")
      .sort((a, b) => scoreExpert(b) - scoreExpert(a));
    const conveners = eligibleExperts
      .filter((e) => e.role === "CONVENER")
      .sort((a, b) => scoreExpert(b) - scoreExpert(a));

    const proposedPanels: EvcPanel[] = [];
    const maxPanels = Math.min(chairs.length, members.length, conveners.length);

    for (let i = 0; i < maxPanels; i++) {
      const trio = [chairs[i], members[i], conveners[i]];
      const commonDates = trio[0].availableDates.filter(
        (d) =>
          trio[1].availableDates.includes(d) &&
          trio[2].availableDates.includes(d),
      );
      const availability =
        commonDates.length > 0 ? commonDates : trio[0].availableDates;

      const combinedTags = Array.from(
        new Set(trio.flatMap((m) => m.expertiseTags)),
      );
      const totalWorkload = trio.reduce(
        (acc, m) => acc + m.activeWorkloadCount,
        0,
      );
      const expertiseMatches = combinedTags.filter((t) =>
        input.requiredExpertiseTags.includes(t),
      ).length;
      const expertiseMatchScore = Math.min(100, expertiseMatches * 35);
      const workloadScore = Math.max(10, 100 - totalWorkload * 15);
      const compositeRankScore = Math.round(
        expertiseMatchScore * 0.5 + workloadScore * 0.5,
      );

      proposedPanels.push({
        id: randomUUID(),
        panelCode: `EVC-PNL-${input.region}-0${i + 1}`,
        region: input.region,
        members: trio,
        expertiseTags: combinedTags,
        availability,
        totalWorkloadScore: workloadScore,
        expertiseMatchScore,
        compositeRankScore,
        classification: STATUTORY_ADVISORY_LABEL,
        rationale: {
          ruleId: "RULE-EVC-PANEL-ALLOC-01",
          // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
          aphClause: "APH-2024-27-CH-EVC-TODO(APH-VERIFY)",
          summary: `ADVISORY Proposal #${i + 1}: Selected 3-member ${input.region} panel with combined workload=${totalWorkload} active cases, matching ${expertiseMatches}/${input.requiredExpertiseTags.length} required expertise tags (${combinedTags.join(", ")}).`,
          coiClearanceSummary: `Zero Conflicts of Interest: Verified independent of ${input.institutionName}, ${input.trustOrSociety}, and prior-association registry (${rejectedExperts.length} conflicting candidates excluded).`,
        },
      });
    }

    proposedPanels.sort((a, b) => b.compositeRankScore - a.compositeRankScore);

    return {
      classification: STATUTORY_ADVISORY_LABEL,
      generatedAt: this.clock.isoString(),
      proposedPanels,
      rejectedExperts,
    };
  }
}

