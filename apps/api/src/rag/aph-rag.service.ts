import { Injectable, Logger } from "@nestjs/common";
import { SystemClockService } from "../common/clock/clock.service";
import { APH_POLICY_CHUNKS } from "./aph-rag.data";
import {
  AphPolicyChunk,
  AphSearchResult,
  DocumentClauseMatch,
  ApplicationComplianceEvaluation,
} from "./aph-rag.types";

@Injectable()
export class AphRagService {
  private readonly logger = new Logger(AphRagService.name);
  private readonly chunks: AphPolicyChunk[] = APH_POLICY_CHUNKS;

  // Inverted index for fast keyword matching and token frequencies
  private readonly tokenFrequencyIndex = new Map<string, Map<string, number>>();
  private readonly docTokenCounts = new Map<string, number>();
  private readonly idfMap = new Map<string, number>();

  constructor(private readonly clock: SystemClockService) {
    this.buildTfIdfIndex();
    this.logger.log(
      `Initialized APH RAG Service with ${this.chunks.length} canonical policy chunks.`,
    );
  }

  /**
   * Tokenize and normalize text into stem-like tokens.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  /**
   * Build TF-IDF inverted index across all indexed policy chunks.
   */
  private buildTfIdfIndex(): void {
    const totalDocs = this.chunks.length;
    const docTermFreq = new Map<string, number>();

    for (const chunk of this.chunks) {
      const fullText = `${chunk.clauseNumber} ${chunk.clauseTitle} ${chunk.chapterTitle} ${chunk.content} ${chunk.keywords.join(" ")} ${chunk.mandatoryChecklistItems.join(" ")}`;
      const tokens = this.tokenize(fullText);
      this.docTokenCounts.set(chunk.id, tokens.length);

      const chunkFreqs = new Map<string, number>();
      const uniqueTokensInDoc = new Set<string>();

      for (const token of tokens) {
        chunkFreqs.set(token, (chunkFreqs.get(token) || 0) + 1);
        uniqueTokensInDoc.add(token);
      }

      this.tokenFrequencyIndex.set(chunk.id, chunkFreqs);

      for (const token of uniqueTokensInDoc) {
        docTermFreq.set(token, (docTermFreq.get(token) || 0) + 1);
      }
    }

    for (const [term, docCount] of docTermFreq.entries()) {
      // Standard smoothed IDF
      const idf = Math.log(1 + (totalDocs - docCount + 0.5) / (docCount + 0.5));
      this.idfMap.set(term, Math.max(idf, 0.1));
    }
  }

  /**
   * Semantic search across canonical APH 2024-2027 policy chunks.
   * Computes hybrid TF-IDF similarity modulated by statutory clause weights.
   * All results carry mandatory `advisoryTag: 'ADVISORY'`.
   */
  searchAphPolicyRag(
    query: string,
    options: {
      limit?: number;
      stage?: string;
      applicationType?: string;
      minScore?: number;
    } = {},
  ): AphSearchResult[] {
    const limit = options.limit ?? 5;
    const minScore = options.minScore ?? 0.05;
    const queryTokens = this.tokenize(query);

    if (queryTokens.length === 0) {
      return [];
    }

    const scoredResults: AphSearchResult[] = [];

    for (const chunk of this.chunks) {
      // Optional stage and application type filtering
      if (
        options.stage &&
        chunk.stage !== options.stage &&
        chunk.stage !== "GENERAL"
      ) {
        continue;
      }
      if (
        options.applicationType &&
        !chunk.applicationTypes.includes("ALL") &&
        !chunk.applicationTypes.includes(options.applicationType)
      ) {
        continue;
      }

      const chunkFreqs = this.tokenFrequencyIndex.get(chunk.id);
      const totalTokensInDoc = this.docTokenCounts.get(chunk.id) || 1;
      if (!chunkFreqs) continue;

      let score = 0;
      const matchedKeywords: string[] = [];

      for (const token of queryTokens) {
        const count = chunkFreqs.get(token);
        if (count) {
          const tf = count / totalTokensInDoc;
          const idf = this.idfMap.get(token) || 0.1;
          score += tf * idf;
          if (chunk.keywords.includes(token)) {
            matchedKeywords.push(token);
            score += 0.3; // Keyword priority boost
          }
        }
      }

      // Check for exact clause number match (e.g. "1.4.2" or "6.4")
      if (query.includes(chunk.clauseNumber.replace("Clause ", ""))) {
        score += 2.0;
      }

      // Combine text similarity with normalized statutory weight (weight 1-100 -> factor 0.7-1.3)
      const weightFactor = 0.7 + (chunk.statutoryWeight / 100) * 0.6;
      const relevanceScore = score * weightFactor;

      if (relevanceScore >= minScore) {
        scoredResults.push({
          chunkId: chunk.id,
          chapter: chunk.chapterTitle,
          clause: chunk.clauseNumber,
          title: chunk.clauseTitle,
          content: chunk.content,
          statutoryWeight: chunk.statutoryWeight,
          similarityScore: Number(score.toFixed(4)),
          relevanceScore: Number(relevanceScore.toFixed(4)),
          advisoryTag: "ADVISORY",
          governingClause: `${chunk.clauseNumber}: ${chunk.clauseTitle}`,
          summary: chunk.content.slice(0, 180) + "...",
          mandatoryChecklistItems: chunk.mandatoryChecklistItems,
          matchedKeywords: Array.from(new Set(matchedKeywords)),
        });
      }
    }

    // Sort by relevance score descending
    scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scoredResults.slice(0, limit);
  }

  /**
   * Links an uploaded document (title, type, text) to its governing APH 2024–2027 clause.
   */
  linkDocumentToAphClause(document: {
    id: string;
    type: string;
    title: string;
    contentText?: string;
    tags?: string[];
  }): DocumentClauseMatch {
    const combinedQuery = `${document.type} ${document.title} ${document.contentText || ""} ${(document.tags || []).join(" ")}`;
    const matches = this.searchAphPolicyRag(combinedQuery, { limit: 3 });

    const primary = matches[0];
    const primaryGoverningClause = primary
      ? primary.governingClause
      : "APH 2024-27 General Document Norms";

    const confidence = primary
      ? Math.min(Math.round(primary.relevanceScore * 100), 99)
      : 40;

    const deficiencies: string[] = [];
    let suggestedAction: "CLEAR" | "SCRUTINIZE_MANUALLY" | "ISSUE_DEFICIENCY" =
      "CLEAR";

    // Domain heuristic checks for critical document types
    const lowerType = document.type.toLowerCase();
    const lowerTitle = document.title.toLowerCase();

    if (lowerType.includes("fire") || lowerTitle.includes("fire")) {
      if (
        !lowerTitle.includes("nbc") &&
        !(document.contentText || "").toLowerCase().includes("nbc")
      ) {
        deficiencies.push(
          "Missing explicit National Building Code (NBC) Part 4 compliance certificate (APH Clause 6.4).",
        );
        suggestedAction = "ISSUE_DEFICIENCY";
      }
    }

    if (lowerType.includes("land") || lowerTitle.includes("land")) {
      if (
        !lowerTitle.includes("30") &&
        !lowerTitle.includes("ownership") &&
        !(document.contentText || "").toLowerCase().includes("lease")
      ) {
        deficiencies.push(
          "Land deed does not explicitly verify 30-year registered lease or unencumbered title (APH Clause 1.6).",
        );
        suggestedAction = "SCRUTINIZE_MANUALLY";
      }
    }

    if (confidence < 50) {
      suggestedAction = "SCRUTINIZE_MANUALLY";
    }

    return {
      documentId: document.id,
      documentType: document.type,
      documentTitle: document.title,
      matchedClauses: matches,
      primaryGoverningClause,
      complianceConfidenceScore: confidence,
      detectedDeficiencies: deficiencies,
      advisoryTag: "ADVISORY",
      suggestedAction,
      timestamp: this.clock.isoString(),
    };
  }

  /**
   * Evaluates overall institutional application compliance using APH RAG intelligence.
   */
  evaluateApplicationCompliance(application: {
    applicationRef: string;
    applicationType: string;
    documents: Array<{
      id: string;
      type: string;
      title: string;
      content?: string;
    }>;
  }): ApplicationComplianceEvaluation {
    const documentMatches: DocumentClauseMatch[] = [];
    const statutoryAdvisories: ApplicationComplianceEvaluation["statutoryAdvisories"] =
      [];

    for (const doc of application.documents) {
      const match = this.linkDocumentToAphClause({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        contentText: doc.content,
      });
      documentMatches.push(match);

      if (match.detectedDeficiencies.length > 0) {
        statutoryAdvisories.push({
          clause: match.primaryGoverningClause,
          weight: match.matchedClauses[0]?.statutoryWeight ?? 90,
          description: match.detectedDeficiencies.join(" "),
          severity: "CRITICAL",
        });
      }
    }

    // Check mandatory documents presence
    const docTypesPresent = new Set(
      application.documents.map((d) => d.type.toUpperCase()),
    );
    if (!docTypesPresent.has("FIRE_SAFETY")) {
      statutoryAdvisories.push({
        clause: "Clause 6.4: Fire Safety Certificate",
        weight: 98,
        description:
          "Mandatory NBC-compliant Fire Safety Certificate is missing.",
        severity: "CRITICAL",
      });
    }

    if (
      application.applicationType === "NEW_INSTITUTION" &&
      !docTypesPresent.has("LAND_TITLE")
    ) {
      statutoryAdvisories.push({
        clause: "Clause 1.6: Land Title & 30-Year Lease",
        weight: 98,
        description:
          "Mandatory Land Ownership or 30-Year Registered Lease Deed is missing.",
        severity: "CRITICAL",
      });
    }

    // Calculate score
    const criticalCount = statutoryAdvisories.filter(
      (a) => a.severity === "CRITICAL",
    ).length;
    let score = 100 - criticalCount * 25;
    if (score < 0) score = 10;

    const recommendedWorkflowStage =
      criticalCount > 0 ? "SCRUTINY_DEFICIENT" : "SCRUTINY_CLEARED";

    return {
      applicationRef: application.applicationRef,
      applicationType: application.applicationType,
      overallComplianceScore: score,
      advisoryTag: "ADVISORY",
      analyzedAt: this.clock.isoString(),
      documentMatches,
      statutoryAdvisories,
      recommendedWorkflowStage,
    };
  }

  /**
   * Get all registered chunks
   */
  getAllChunks(): AphPolicyChunk[] {
    return this.chunks;
  }

  /**
   * Get chunk by clause number
   */
  getChunkByClause(clauseNumber: string): AphPolicyChunk | undefined {
    return this.chunks.find(
      (c) =>
        c.clauseNumber.toLowerCase() === clauseNumber.toLowerCase() ||
        c.clauseNumber.toLowerCase() === `clause ${clauseNumber.toLowerCase()}`,
    );
  }
}
