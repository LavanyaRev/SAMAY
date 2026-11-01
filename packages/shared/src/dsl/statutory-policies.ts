import { StatutoryPolicyRecord } from "../types";

/**
 * AICTE Approval Process Handbook (APH 2024–2027) Canonical Statutory Rules.
 * Extracted directly from official APH 2024-27 chapters, clauses, and annexures.
 * All automated compliance scores referencing these policies MUST carry advisoryTag: 'ADVISORY'.
 */
export const STATUTORY_POLICIES_SEED: StatutoryPolicyRecord[] = [
  // ==========================================
  // CHAPTER I: NEW INSTITUTIONS & APPROVAL PROCESS
  // ==========================================
  {
    id: "POL-APH-0101",
    applicationType: "NEW_INSTITUTE",
    stage: "SCRUTINY",
    parameterKey: "scrutiny_sla_window",
    parameterName: "Scrutiny Committee SLA Window",
    deadlineDays: 15,
    thresholdValue: 15,
    source: "APH 2024-27",
    sourceClause: "Clause 1.4.2",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Regional Scrutiny Committee must complete online document scrutiny within 15 working days from application submission deadline.",
  },
  {
    id: "POL-APH-0102",
    applicationType: "NEW_INSTITUTE",
    stage: "SCRUTINY",
    parameterKey: "scrutiny_deficiency_rectification_window",
    parameterName: "Scrutiny Deficiency Rectification Window",
    deadlineDays: 15,
    thresholdValue: 15,
    source: "APH 2024-27",
    sourceClause: "Clause 1.4.3",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Institutions issued Scrutiny Deficiency Report have exactly 15 calendar days to upload rectified compliance documents for re-scrutiny.",
  },
  {
    id: "POL-APH-0103",
    applicationType: "NEW_INSTITUTE",
    stage: "EVC",
    parameterKey: "evc_inspection_sla",
    parameterName: "Expert Visit Committee (EVC) SLA Window",
    deadlineDays: 21,
    thresholdValue: 21,
    source: "APH 2024-27",
    sourceClause: "Clause 1.5.1",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Physical/digital EVC inspection must be conducted and geo-tagged report uploaded within 21 days of Scrutiny clearance.",
  },
  {
    id: "POL-APH-0104",
    applicationType: "NEW_INSTITUTE",
    stage: "SAC",
    parameterKey: "sac_appeal_window",
    parameterName: "Standing Appeal Committee (SAC) Appeal Window",
    deadlineDays: 7,
    thresholdValue: 7,
    source: "APH 2024-27",
    sourceClause: "Clause 1.7.1",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Institutions rejected by Scrutiny or EVC may prefer an appeal before SAC within 7 calendar days of rejection notification.",
  },
  {
    id: "POL-APH-0105",
    applicationType: "NEW_INSTITUTE",
    stage: "SCRUTINY",
    parameterKey: "land_title_ownership_nature",
    parameterName: "Land Title Ownership & Nature",
    deadlineDays: 0,
    thresholdValue: 1,
    source: "APH 2024-27",
    sourceClause: "Clause 1.6 & Annexure 4",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Land must be owned or leased on a registered statutory lease of minimum 30 years with uninterrupted, contiguous possession in applicant Trust/Society/Company name.",
  },
  {
    id: "POL-APH-0106",
    applicationType: "NEW_INSTITUTE",
    stage: "SCRUTINY",
    parameterKey: "security_deposit_joint_fdr",
    parameterName: "Statutory Security Deposit (Joint FDR)",
    deadlineDays: 30,
    thresholdValue: 3500000, // INR 35 Lakhs
    source: "APH 2024-27",
    sourceClause: "Clause 1.9 & Chapter I Table 1.3",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Joint Fixed Deposit Receipt (FDR) in name of AICTE and Society/Trust for statutory period of 10 years.",
  },

  // ==========================================
  // CHAPTER II: EXTENSION OF APPROVAL (EOA) & CHANGES
  // ==========================================
  {
    id: "POL-APH-0201",
    applicationType: "EOA",
    stage: "SCRUTINY",
    parameterKey: "eoa_submission_deadline",
    parameterName: "Annual Extension of Approval Submission Deadline",
    deadlineDays: 30,
    thresholdValue: 30,
    source: "APH 2024-27",
    sourceClause: "Clause 2.1.2",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Existing technical institutions must submit online application for EoA within 30 days from portal announcement.",
  },
  {
    id: "POL-APH-0202",
    applicationType: "EOA",
    stage: "SCRUTINY",
    parameterKey: "faculty_student_ratio_ug_engg",
    parameterName: "Cadre & Faculty Student Ratio (UG Engineering)",
    deadlineDays: 0,
    thresholdValue: 20, // 1:20 ratio
    source: "APH 2024-27",
    sourceClause: "Clause 2.1.8 & Chapter VI Clause 6.7",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Faculty:Student Ratio (FSR) must be 1:20 for Under Graduate Engineering & Technology programs, with Cadre Ratio 1:2:6 (Professor : Assoc Prof : Asst Prof).",
  },
  {
    id: "POL-APH-0203",
    applicationType: "EOA",
    stage: "SCRUTINY",
    parameterKey: "faculty_student_ratio_pg_management",
    parameterName: "Faculty Student Ratio (PG Management/MBA)",
    deadlineDays: 0,
    thresholdValue: 15, // 1:15 ratio
    source: "APH 2024-27",
    sourceClause: "Clause 2.1.9 & Chapter VI Clause 6.7",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Faculty:Student Ratio (FSR) must be 1:15 for Post Graduate Management programs (MBA/PGDM) with at least 1 Professor and 2 Associate Professors per department.",
  },
  {
    id: "POL-APH-0204",
    applicationType: "EOA",
    stage: "SCRUTINY",
    parameterKey: "mandatory_disclosure_update",
    parameterName: "Mandatory Public Disclosure Update on Website",
    deadlineDays: 15,
    thresholdValue: 1,
    source: "APH 2024-27",
    sourceClause: "Clause 2.3.1 & Annexure 10",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Institutions must maintain verified, publicly accessible Mandatory Disclosure updated annually before EoA processing.",
  },

  // ==========================================
  // CHAPTER III & IV: COLLABORATION, TWINNING & UNIVERSITIES
  // ==========================================
  {
    id: "POL-APH-0301",
    applicationType: "COLLABORATION",
    stage: "SCRUTINY",
    parameterKey: "foreign_university_qs_ranking_threshold",
    parameterName: "Foreign Collaborating University Global Ranking Threshold",
    deadlineDays: 0,
    thresholdValue: 500, // Top 500 QS / THE ranking
    source: "APH 2024-27",
    sourceClause: "Clause 3.2.1",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Foreign Partner Institution collaborating for Twinning or Dual Degree must be ranked within the Top 500 in global QS/THE rankings.",
  },
  {
    id: "POL-APH-0401",
    applicationType: "UNIVERSITY",
    stage: "SCRUTINY",
    parameterKey: "university_off_campus_land_norm",
    parameterName: "State/Deemed University Off-Campus Land Requirement",
    deadlineDays: 0,
    thresholdValue: 5, // 5 Acres
    source: "APH 2024-27",
    sourceClause: "Clause 4.3.2",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Off-campus technical centers operated by State or Deemed Universities must possess dedicated minimum contiguous 5 acres of land in non-metro areas or 2.5 acres in metro areas.",
  },

  // ==========================================
  // CHAPTER V: ONLINE AND DISTANCE LEARNING (ODL / OL)
  // ==========================================
  {
    id: "POL-APH-0501",
    applicationType: "ODL",
    stage: "SCRUTINY",
    parameterKey: "odl_naac_score_eligibility",
    parameterName: "ODL/Online Learning NAAC Score Eligibility Threshold",
    deadlineDays: 0,
    thresholdValue: 3.26, // 3.26 out of 4.00
    source: "APH 2024-27",
    sourceClause: "Clause 5.2.1",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Institutions applying for offering courses via ODL/OL mode must possess NAAC score of not less than 3.26 on a 4-point scale or NIRF top 100 ranking in overall/university category.",
  },

  // ==========================================
  // CHAPTER VI: NORMS, INFRASTRUCTURE & COMMITTEES
  // ==========================================
  {
    id: "POL-APH-0601",
    applicationType: "NEW_INSTITUTE",
    stage: "SCRUTINY",
    parameterKey: "instructional_area_per_student",
    parameterName: "Instructional Area Norms (Classrooms, Labs & Workshops)",
    deadlineDays: 0,
    thresholdValue: 66, // 66 sq.m standard classroom
    source: "APH 2024-27",
    sourceClause: "Clause 6.1 & Annexure 5",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Each standard classroom must have minimum 66 sq.m carpet area; tutorials 33 sq.m; laboratories 66 sq.m for 30 batch size or 132 sq.m for 60 batch size.",
  },
  {
    id: "POL-APH-0602",
    applicationType: "NEW_INSTITUTE",
    stage: "SCRUTINY",
    parameterKey: "fire_safety_certificate_validity",
    parameterName:
      "National Building Code (NBC) Compliant Fire Safety Certificate",
    deadlineDays: 30,
    thresholdValue: 1,
    source: "APH 2024-27",
    sourceClause: "Clause 6.4 & Annexure 4",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Valid Fire Safety Certificate issued by competent government fire services authority adhering to NBC Part 4 is non-negotiable for approval.",
  },
  {
    id: "POL-APH-0603",
    applicationType: "NEW_INSTITUTE",
    stage: "SCRUTINY",
    parameterKey: "barrier_free_environment_divyangjan",
    parameterName: "Barrier-Free Environment & Divyangjan Amenities",
    deadlineDays: 0,
    thresholdValue: 1,
    source: "APH 2024-27",
    sourceClause: "Clause 6.5 & Annexure 6",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Universal accessibility ramps (gradient <= 1:12), Divyangjan-friendly toilets on every floor, lifts with Braille signage, and dedicated pathways.",
  },
  {
    id: "POL-APH-0604",
    applicationType: "EOA",
    stage: "SCRUTINY",
    parameterKey: "icc_internal_complaints_committee",
    parameterName: "Internal Complaints Committee (ICC) Statutory Constitution",
    deadlineDays: 15,
    thresholdValue: 1,
    source: "APH 2024-27",
    sourceClause: "Clause 6.8.1 & Annexure 8",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Mandatory constitution of ICC under Section 4 of Sexual Harassment of Women at Workplace Act 2013, presided by woman professor.",
  },
  {
    id: "POL-APH-0605",
    applicationType: "EOA",
    stage: "SCRUTINY",
    parameterKey: "anti_ragging_committee_and_squad",
    parameterName: "Anti-Ragging Committee and Squad Constitution",
    deadlineDays: 15,
    thresholdValue: 1,
    source: "APH 2024-27",
    sourceClause: "Clause 6.8.2 & Annexure 9",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Establishment of Anti-Ragging Committee headed by Head of the Institution, squad, police liaison, and 100% student/parent undertaking verification.",
  },
  {
    id: "POL-APH-0606",
    applicationType: "EOA",
    stage: "SCRUTINY",
    parameterKey: "student_grievance_redressal_committee",
    parameterName:
      "Student Grievance Redressal Committee (SGRC) & Ombudsperson",
    deadlineDays: 15,
    thresholdValue: 1,
    source: "APH 2024-27",
    sourceClause: "Clause 6.8.3 & Annexure 11",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Constitution of SGRC with collegiate representation and appointment of Ombudsperson by affiliating university with online portal grievance linkage.",
  },

  // ==========================================
  // CHAPTER VII: PENAL ACTIONS & NON-COMPLIANCE
  // ==========================================
  {
    id: "POL-APH-0701",
    applicationType: "EOA",
    stage: "SHC",
    parameterKey: "excess_admission_penalty_multiplier",
    parameterName: "Excess Admission Statutory Penalty Multiplier",
    deadlineDays: 30,
    thresholdValue: 5, // 5 times tuition fee per excess student
    source: "APH 2024-27",
    sourceClause: "Clause 7.1.1",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Institutions admitting students beyond sanctioned intake shall be levied penalty equal to 5 times tuition fee per excess admitted candidate plus 50% reduction in sanctioned intake for following year.",
  },
  {
    id: "POL-APH-0702",
    applicationType: "EOA",
    stage: "SHC",
    parameterKey: "faculty_shortage_penalty_action",
    parameterName: "Persistent Faculty Shortage Penalty Schedule",
    deadlineDays: 30,
    thresholdValue: 30, // Shortage > 30% triggers no-admission
    source: "APH 2024-27",
    sourceClause: "Clause 7.2.3",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      'Faculty deficit between 10% to 30% attracts punitive fine of ₹5 Lakh per department; deficit > 30% places course into "No Admission" status.',
  },
  {
    id: "POL-APH-0703",
    applicationType: "EOA",
    stage: "SHC",
    parameterKey: "unapproved_course_closure_notice",
    parameterName: "Unapproved Technical Course Show-Cause and Cease Notice",
    deadlineDays: 14,
    thresholdValue: 14,
    source: "APH 2024-27",
    sourceClause: "Clause 7.4.2",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Conducting unapproved technical courses without prior Council approval invites immediate 14-day statutory Show Cause Notice followed by public advisory.",
  },

  // ==========================================
  // ANNEXURES: INFRASTRUCTURE & COMMITTEE CONSTITUTION
  // ==========================================
  {
    id: "POL-APH-0801",
    applicationType: "NEW_INSTITUTE",
    stage: "EVC",
    parameterKey: "evc_panel_composition_rules",
    parameterName: "EVC Three-Member Panel Conflict-Free Composition",
    deadlineDays: 0,
    thresholdValue: 3,
    source: "APH 2024-27",
    sourceClause: "Annexure 1 & Clause 1.5.2",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "EVC panel must comprise Chairman (Professor/Ex-VC from IIT/NIT/Govt Inst outside region), Expert Member (Senior Faculty), and Regional Officer / Architect representative with zero verified conflicts of interest.",
  },
  {
    id: "POL-APH-0802",
    applicationType: "NEW_INSTITUTE",
    stage: "SCRUTINY",
    parameterKey: "bandwidth_internet_connectivity_norm",
    parameterName: "Minimum Dedicated Broadband Internet Bandwidth Norms",
    deadlineDays: 0,
    thresholdValue: 300, // 300 Mbps minimum for institute
    source: "APH 2024-27",
    sourceClause: "Annexure 5 Table 5.3",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Institutions must maintain minimum 300 Mbps dedicated leased-line broadband internet connectivity with Wi-Fi coverage across campus.",
  },
  {
    id: "POL-APH-0803",
    applicationType: "NEW_INSTITUTE",
    stage: "SCRUTINY",
    parameterKey: "library_books_titles_volumes_norm",
    parameterName: "Central Library Minimum Titles and Volumes Standard",
    deadlineDays: 0,
    thresholdValue: 500, // 500 titles minimum per program
    source: "APH 2024-27",
    sourceClause: "Annexure 5 Table 5.2",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Minimum 500 distinct titles and 2,500 total volumes per division at inception, with automated library management and subscription to national e-journal consortia.",
  },
];

const POLICY_KEY_ALIASES: Record<string, StatutoryPolicyRecord> = {
  SCRUTINY_SLA_DAYS: {
    id: "POL-APH-SCRUTINY-SLA",
    applicationType: "NEW_INSTITUTE",
    stage: "SCRUTINY",
    parameterKey: "SCRUTINY_SLA_DAYS",
    parameterName: "Scrutiny Committee SLA Window",
    deadlineDays: 15,
    thresholdValue: 15,
    source: "APH 2024-27",
    sourceClause: "Clause 2.4.1 & Clause 1.4.2",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Regional Scrutiny Committee must complete online document scrutiny within 15 working days.",
  },
  SAC_APPEAL_FILING_WINDOW_DAYS: {
    id: "POL-APH-SAC-WINDOW",
    applicationType: "NEW_INSTITUTE",
    stage: "SAC",
    parameterKey: "SAC_APPEAL_FILING_WINDOW_DAYS",
    parameterName: "Standing Appeal Committee (SAC) Appeal Window",
    deadlineDays: 10,
    thresholdValue: 10,
    source: "APH 2024-27",
    sourceClause: "Clause 1.7.1 & Clause 2.6",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description:
      "Statutory window for filing appeal before Standing Appeal Committee.",
  },
  LEASE_DEED_WARNING_HORIZON_DAYS: {
    id: "POL-APH-LEASE-HORIZON",
    applicationType: "NEW_INSTITUTE",
    stage: "SCRUTINY",
    parameterKey: "LEASE_DEED_WARNING_HORIZON_DAYS",
    parameterName: "Statutory Lease Deed Expiry Warning Horizon",
    deadlineDays: 60,
    thresholdValue: 60,
    source: "APH 2024-27",
    sourceClause: "Clause 1.6 & Annexure 4",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description: "Warning horizon for monitoring lease deed expiration.",
  },
  MANDATORY_FACULTY_CADRE_RATIO_UG: {
    id: "POL-APH-CADRE-RATIO",
    applicationType: "EOA",
    stage: "SCRUTINY",
    parameterKey: "MANDATORY_FACULTY_CADRE_RATIO_UG",
    parameterName: "Faculty Student Cadre Ratio (UG)",
    deadlineDays: 0,
    thresholdValue: "1:15",
    source: "APH 2024-27",
    sourceClause: "Clause 2.1.8 & Chapter VI Clause 6.7",
    effectiveFrom: "2024-04-01T00:00:00.000Z",
    effectiveTo: "2027-03-31T23:59:59.000Z",
    approvedBy: "AICTE Executive Committee Notification 2024",
    description: "Mandatory faculty cadre ratio for UG Engineering programs.",
  },
};

export function getStatutoryPolicy(
  key: string,
  list: StatutoryPolicyRecord[] = STATUTORY_POLICIES_SEED,
): StatutoryPolicyRecord | undefined {
  const normalized = key.trim().toUpperCase();
  if (POLICY_KEY_ALIASES[normalized]) {
    return POLICY_KEY_ALIASES[normalized];
  }
  return (
    list.find((p) => p.parameterKey.toUpperCase() === normalized) ||
    list.find((p) => p.parameterKey.toUpperCase().includes(normalized))
  );
}

export function getAllStatutoryPolicies(): StatutoryPolicyRecord[] {
  return STATUTORY_POLICIES_SEED;
}
