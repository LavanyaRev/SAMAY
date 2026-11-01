import {
  AphApplicationCategory,
  type AphWorkflowEvaluationInput,
  type AphWorkflowPlan,
  type AphWorkflowStageMetadata,
  type AphWorkflowTransitionRule,
  UserRole,
} from "../types/index.js";

/**
 * ============================================================================
 * CONFIGURABLE APH WORKFLOW ENGINE (APH 2024–2027)
 * Evaluates dynamic regulatory pipelines driven by:
 * 1. Application Category
 * 2. Governing APH 2024–2027 Clause references
 * 3. Required vs. Conditional stages (SAC & SHC are strictly conditional)
 * 4. Entry/exit conditions and authorized transition rules
 * ============================================================================
 */

export function evaluateAphWorkflow(
  input: AphWorkflowEvaluationInput,
): AphWorkflowPlan {
  const {
    category,
    isContestedRejection = false,
    hasShortcomingsOrScn = false,
    requiresOnSiteInspection = false,
    deficiencyCount = 0,
  } = input;

  const stages: AphWorkflowStageMetadata[] = [];
  const allowedTransitions: AphWorkflowTransitionRule[] = [];
  const governingClauses: string[] = [];
  let categoryLabel = "";
  let statutorySummary = "";
  let isEvcMandatory = false;

  // Base Stage 1: Submission
  stages.push({
    id: "SUBMISSION",
    label: "Application Submission & Institutional Self-Disclosure",
    ownerRole: UserRole.INSTITUTION,
    isConditional: false,
    governingClause: "APH 2024–27 Chapter II, Clause 2.1",
    entryCondition:
      "Digital signature, TER fee payment receipt, and notarized affidavits uploaded",
    exitCondition:
      "Application dossier sealed with SHA-256 hash and dispatched to Regional Desk",
    responsibleAuthority: "Institutional Nodal Officer / Principal",
  });

  // Base Stage 2: Scrutiny
  stages.push({
    id: "SCRUTINY",
    label: "Regional Scrutiny Committee Verification",
    ownerRole: UserRole.REGIONAL_OFFICER,
    isConditional: false,
    governingClause: "APH 2024–27 Chapter II, Clause 2.4",
    entryCondition:
      "Dossier received in Regional Office queue; fee reconciliation complete",
    exitCondition:
      "Scrutiny Committee Report signed by Regional Officer & panel experts",
    responsibleAuthority: "Regional Officer (WRO/SRO/NRO/ERO/CRO)",
  });

  allowedTransitions.push({
    from: "SUBMISSION",
    to: "SCRUTINY",
    action: "DISPATCH_TO_REGIONAL_DESK",
    allowedRoles: [UserRole.INSTITUTION, UserRole.ADMIN],
    requiresHumanSignoff: true,
    description:
      "Institution seals application and transmits to regional intake queue",
  });

  // Conditional Stage: Deficiency Rectification (if deficiencyCount > 0)
  if (deficiencyCount > 0) {
    stages.push({
      id: "DEFICIENCY_RECTIFICATION",
      label: "8-Point Deficiency Compliance & Rectification",
      ownerRole: UserRole.INSTITUTION,
      isConditional: true,
      conditionReason: `Identified ${deficiencyCount} deficiency item(s) under APH Clause 2.4.3`,
      governingClause: "APH 2024–27 Chapter II, Clause 2.4.3",
      entryCondition:
        "Formal Deficiency Memo issued by Regional Scrutiny Officer",
      exitCondition:
        "Institution submits counter-affidavits, purchase orders, or NOC renewals within statutory window",
      responsibleAuthority:
        "Authorized Signatory of Sponsoring Trust / Society",
    });

    allowedTransitions.push(
      {
        from: "SCRUTINY",
        to: "DEFICIENCY_RECTIFICATION",
        action: "ISSUE_DEFICIENCY_MEMO",
        allowedRoles: [
          UserRole.REGIONAL_OFFICER,
          UserRole.COMMITTEE_MEMBER,
          UserRole.ADMIN,
        ],
        requiresHumanSignoff: true,
        description:
          "Scrutiny Committee issues 8-point deficiency notice with response deadline",
      },
      {
        from: "DEFICIENCY_RECTIFICATION",
        to: "SCRUTINY",
        action: "SUBMIT_COMPLIANCE_RECTIFICATION",
        allowedRoles: [UserRole.INSTITUTION, UserRole.ADMIN],
        requiresHumanSignoff: true,
        description:
          "Institution re-submits rectified evidence for secondary scrutiny verification",
      },
    );
  }

  // Branch Logic based on Application Category
  switch (category) {
    case AphApplicationCategory.EOA_SELF_DISCLOSURE: {
      categoryLabel = "Extension of Approval (EoA) via Self-Disclosure";
      governingClauses.push(
        "APH 2024–27 Clause 2.1 (Self-Disclosure Evaluation)",
        "APH 2024–27 Clause 2.4 (Scrutiny Norms)",
      );
      statutorySummary =
        "Standard Extension of Approval for existing compliant institutions. Evaluated via documentary scrutiny and self-disclosure affidavits. EVC is triggered only if infrastructure changes or unverified claims are detected.";

      if (requiresOnSiteInspection) {
        isEvcMandatory = true;
        stages.push({
          id: "EVC",
          label: "Expert Visit Committee (EVC) On-Site Inspection",
          ownerRole: UserRole.COMMITTEE_MEMBER,
          isConditional: true,
          conditionReason:
            "Triggered by land/built-up variation or discrepancy flagged during scrutiny",
          governingClause: "APH 2024–27 Chapter II, Clause 2.7",
          entryCondition:
            "Regional Officer orders physical panel inspection with conflict-free screening",
          exitCondition:
            "Three-member expert panel affirms geo-tagged observation report",
          responsibleAuthority: "EVC Panel Lead & Domain Experts (Advisory)",
        });
        allowedTransitions.push({
          from: "SCRUTINY",
          to: "EVC",
          action: "DEPLOY_EVC_PANEL",
          allowedRoles: [UserRole.REGIONAL_OFFICER, UserRole.ADMIN],
          requiresHumanSignoff: true,
          description:
            "Regional Officer deploys 3-member expert visit committee",
        });
      }
      break;
    }

    case AphApplicationCategory.NEW_INSTITUTION: {
      categoryLabel = "Setting up New Technical Institution (LoA)";
      isEvcMandatory = true;
      governingClauses.push(
        "APH 2024–27 Chapter I, Clause 1.4 (Mandatory EVC Inspection for New Institutions)",
        "APH 2024–27 Clause 1.6 (Land Ownership & Built-up Norms)",
      );
      statutorySummary =
        "Establishment of new institution requiring mandatory documentary scrutiny followed by mandatory on-site physical inspection by Expert Visit Committee (EVC).";

      stages.push({
        id: "EVC",
        label: "Expert Visit Committee (EVC) On-Site Inspection",
        ownerRole: UserRole.COMMITTEE_MEMBER,
        isConditional: false,
        governingClause: "APH 2024–27 Chapter I, Clause 1.4",
        entryCondition:
          "Scrutiny Committee clears land title, FDR, and trust ownership credentials",
        exitCondition:
          "Panel verifies physical campus boundaries, instructional carpet area, barrier-free access",
        responsibleAuthority:
          "EVC Panel Lead, Senior Architect & Domain Expert",
      });

      allowedTransitions.push({
        from: "SCRUTINY",
        to: "EVC",
        action: "COMMENCE_MANDATORY_EVC",
        allowedRoles: [UserRole.REGIONAL_OFFICER, UserRole.ADMIN],
        requiresHumanSignoff: true,
        description:
          "Mandatory EVC panel deployment following scrutiny clearance",
      });
      break;
    }

    case AphApplicationCategory.COURSE_VARIATION_INTAKE: {
      categoryLabel =
        "Course Variation / Additional Division / Increase in Intake";
      isEvcMandatory = true;
      governingClauses.push(
        "APH 2024–27 Chapter II, Clause 2.3 (Infrastructure & Faculty Surplus Verification)",
        "APH 2024–27 Clause 2.7 (On-Site Verification of Laboratories)",
      );
      statutorySummary =
        "Increase in student intake or new branch introduction requiring verification of additional laboratory equipment, computing surplus, and faculty cadre compliance.";

      stages.push({
        id: "EVC",
        label: "Expert Visit Committee (EVC) Capacity Inspection",
        ownerRole: UserRole.COMMITTEE_MEMBER,
        isConditional: false,
        governingClause: "APH 2024–27 Chapter II, Clause 2.3 & 2.7",
        entryCondition:
          "Regional Scrutiny confirms prerequisite accreditation (NBA/NAAC) and land ratio",
        exitCondition:
          "Panel validates laboratory readiness, equipment logbooks, and software licenses",
        responsibleAuthority: "EVC Expert Panel (Advisory)",
      });

      allowedTransitions.push({
        from: "SCRUTINY",
        to: "EVC",
        action: "DEPLOY_CAPACITY_EVC",
        allowedRoles: [UserRole.REGIONAL_OFFICER, UserRole.ADMIN],
        requiresHumanSignoff: true,
        description:
          "Forward dossier to EVC for on-site physical capacity audit",
      });
      break;
    }

    case AphApplicationCategory.INSTITUTION_CLOSURE: {
      categoryLabel = "Closure of Institution / Progressive Program Closure";
      governingClauses.push(
        "APH 2024–27 Chapter II, Clause 2.12 (Institutional Closure & Student Redeployment)",
      );
      statutorySummary =
        "Closure process requiring submission of university NOC, state government recommendation, and verified plan for redeployment or completion of existing enrolled batches.";
      break;
    }

    case AphApplicationCategory.SUPERNUMERARY_SEATS: {
      categoryLabel =
        "Introduction of Supernumerary Seats (FN / OCI / CIWG / TFW)";
      governingClauses.push(
        "APH 2024–27 Chapter II, Clause 2.8 (Supernumerary Seat Allocation Norms)",
      );
      statutorySummary =
        "Statutory allotment of 15% supernumerary quota for foreign nationals and 5% TFW seats evaluated against instructional area capacity and faculty availability.";
      break;
    }
  }

  // CONDITIONAL COMMITTEE SEPARATION 1: SHC (Standing Hearing Committee)
  // Strictly scoped for verifying compliance arising from scrutiny/EVC shortcomings and SCN hearings.
  // Recommendations are formally placed before the Executive Committee.
  if (hasShortcomingsOrScn) {
    stages.push({
      id: "SHC",
      label: "Standing Hearing Committee (SHC) - Statutory Compliance Hearing",
      ownerRole: UserRole.COMMITTEE_MEMBER,
      isConditional: true,
      conditionReason:
        "Shortcomings identified during Scrutiny/EVC or Show Cause Notice issued under APH Clause 3.1",
      governingClause:
        "APH 2024–27 Chapter III, Clause 3.1 (SHC Compliance Hearings)",
      entryCondition:
        "SCN issued or severe deficiencies unrectified; formal representation submitted",
      exitCondition:
        "SHC Bench drafts Advisory Recommendation for submission to the Executive Committee",
      responsibleAuthority:
        "Standing Hearing Committee Bench (Senior Academicians & Legal Expert)",
    });

    const previousStage =
      isEvcMandatory || requiresOnSiteInspection ? "EVC" : "SCRUTINY";
    allowedTransitions.push({
      from: previousStage,
      to: "SHC",
      action: "REFER_TO_SHC_HEARING",
      allowedRoles: [
        UserRole.REGIONAL_OFFICER,
        UserRole.BUREAU_OFFICER,
        UserRole.ADMIN,
      ],
      requiresHumanSignoff: true,
      description:
        "Refer unrectified shortcomings or SCN representation to Standing Hearing Committee",
    });
  }

  // CONDITIONAL COMMITTEE SEPARATION 2: SAC (Standing Appellate Committee)
  // Strictly scoped as an appellate review process for contested rejections.
  if (isContestedRejection) {
    stages.push({
      id: "SAC",
      label: "Standing Appellate Committee (SAC) - Contested Rejection Appeal",
      ownerRole: UserRole.COMMITTEE_MEMBER,
      isConditional: true,
      conditionReason:
        "Formal institutional appeal filed against rejection order within statutory 10-day window",
      governingClause:
        "APH 2024–27 Chapter III, Clause 3.2 (Appellate Proceedings)",
      entryCondition:
        "Appeal petition filed with appeal fee challan and counter-affidavits",
      exitCondition:
        "Appellate Bench prepares recommendation (Uphold / Conditional Relief / Re-EVC)",
      responsibleAuthority:
        "Standing Appellate Committee (Chaired by Retired High Court Judge)",
    });

    allowedTransitions.push({
      from: "SCRUTINY",
      to: "SAC",
      action: "LODGE_STATUTORY_APPEAL",
      allowedRoles: [UserRole.INSTITUTION, UserRole.ADMIN],
      requiresHumanSignoff: true,
      description:
        "Institution lodges formal appeal against regional scrutiny rejection order",
    });
  }

  // Final Stage: Authorized Final Decision (Executive Committee / Competent Authority)
  // Explicitly separates Committee Recommendations from Authorized Final Decisions.
  stages.push({
    id: "FINAL_DECISION",
    label:
      "Authorized Final Decision (Competent Authority / Executive Committee)",
    ownerRole: UserRole.BUREAU_OFFICER,
    isConditional: false,
    governingClause: "APH 2024–27 Chapter IV, Clause 4.1 & 4.2",
    entryCondition:
      "All committee recommendations (Scrutiny/EVC/SHC/SAC) compiled and signed digitally",
    exitCondition:
      "Issuance of formal Letter of Approval (LoA) or Extension of Approval (EoA) signed by Member Secretary",
    responsibleAuthority:
      "Authorized Officer / AICTE Executive Committee (Competent Authority)",
  });

  // Wire transitions to FINAL_DECISION
  const terminalPrecursors = stages
    .map((s) => s.id)
    .filter((id) => id !== "SUBMISSION" && id !== "FINAL_DECISION");

  for (const precursor of terminalPrecursors) {
    allowedTransitions.push({
      from: precursor,
      to: "FINAL_DECISION",
      action: `RECOMMEND_TO_AUTHORITY_FROM_${precursor}`,
      allowedRoles: [
        UserRole.REGIONAL_OFFICER,
        UserRole.COMMITTEE_MEMBER,
        UserRole.BUREAU_OFFICER,
        UserRole.ADMIN,
      ],
      requiresHumanSignoff: true,
      requiresExecutiveCommitteeSignoff:
        precursor === "SHC" || precursor === "SAC",
      description: `Transmit ${precursor} findings and recommendations to Authorized Officer / Executive Committee for final decision`,
    });
  }

  governingClauses.push(
    "APH 2024–27 Chapter IV, Clause 4.1 (Role of Competent Authority & Council Supremacy)",
  );

  return {
    category,
    categoryLabel,
    governingClauses,
    stages,
    allowedTransitions,
    statutorySummary,
    isSacApplicable: isContestedRejection,
    isShcApplicable: hasShortcomingsOrScn,
    isEvcMandatory,
  };
}
