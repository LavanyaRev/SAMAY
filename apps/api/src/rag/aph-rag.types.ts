/**
 * APH RAG Intelligence Engine Types and Contracts
 * AICTE Approval Process Handbook (APH 2024–2027)
 */

export interface AphPolicyChunk {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  clauseNumber: string;
  clauseTitle: string;
  content: string;
  statutoryWeight: number; // 1 to 100 (statutory priority)
  applicationTypes: string[]; // e.g. ['NEW_INSTITUTION', 'EXTENSION_OF_APPROVAL', 'ALL']
  stage: "SCRUTINY" | "EVC" | "SAC_SHC" | "APPROVAL" | "GENERAL";
  mandatoryChecklistItems: string[];
  keywords: string[];
  effectiveFrom: string;
  effectiveTo: string;
  handbookReference: string;
}

export interface AphSearchResult {
  chunkId: string;
  chapter: string;
  clause: string;
  title: string;
  content: string;
  statutoryWeight: number;
  similarityScore: number;
  relevanceScore: number;
  advisoryTag: "ADVISORY"; // MANDATORY: System supports but never replaces statutory authority
  governingClause: string;
  summary: string;
  mandatoryChecklistItems: string[];
  matchedKeywords: string[];
}

export interface DocumentClauseMatch {
  documentId: string;
  documentType: string;
  documentTitle: string;
  matchedClauses: AphSearchResult[];
  primaryGoverningClause: string;
  complianceConfidenceScore: number;
  detectedDeficiencies: string[];
  advisoryTag: "ADVISORY";
  suggestedAction: "CLEAR" | "SCRUTINIZE_MANUALLY" | "ISSUE_DEFICIENCY";
  timestamp: string;
}

export interface ApplicationComplianceEvaluation {
  applicationRef: string;
  applicationType: string;
  overallComplianceScore: number;
  advisoryTag: "ADVISORY";
  analyzedAt: string;
  documentMatches: DocumentClauseMatch[];
  statutoryAdvisories: Array<{
    clause: string;
    weight: number;
    description: string;
    severity: "CRITICAL" | "WARNING" | "INFORMATIONAL";
  }>;
  recommendedWorkflowStage: string;
}
