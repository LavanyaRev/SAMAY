import { Controller, Get, Post, Body, Query, Param } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { AphRagService } from "./aph-rag.service";

@ApiTags("APH Policy RAG Intelligence")
@Controller("rag")
export class AphRagController {
  constructor(private readonly aphRagService: AphRagService) {}

  @Get("search")
  @ApiOperation({
    summary:
      "Semantic search across APH 2024–2027 statutory policy chunks with advisory tagging",
  })
  @ApiQuery({
    name: "query",
    required: true,
    description: "Natural language search or clause query",
  })
  @ApiQuery({
    name: "stage",
    required: false,
    description: "Workflow stage filter (SCRUTINY, EVC, SAC_SHC)",
  })
  @ApiQuery({
    name: "applicationType",
    required: false,
    description: "Application type filter",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of results to return (default 5)",
  })
  @ApiResponse({
    status: 200,
    description: "Ranked list of governing APH clauses with ADVISORY tagging",
  })
  search(
    @Query("query") query: string,
    @Query("stage") stage?: string,
    @Query("applicationType") applicationType?: string,
    @Query("limit") limit?: string,
  ) {
    return this.aphRagService.searchAphPolicyRag(query, {
      stage,
      applicationType,
      limit: limit ? parseInt(limit, 10) : 5,
    });
  }

  @Post("link-document")
  @ApiOperation({
    summary:
      "Link uploaded institutional document to governing APH clause and statutory weight",
  })
  @ApiResponse({
    status: 200,
    description: "Document-to-clause match with ADVISORY tagging",
  })
  linkDocument(
    @Body()
    body: {
      id: string;
      type: string;
      title: string;
      contentText?: string;
      tags?: string[];
    },
  ) {
    return this.aphRagService.linkDocumentToAphClause(body);
  }

  @Post("evaluate-application")
  @ApiOperation({
    summary: "Evaluate full application compliance against APH 2024–2027 rules",
  })
  @ApiResponse({
    status: 200,
    description: "Overall compliance score and statutory advisories",
  })
  evaluateApplication(
    @Body()
    body: {
      applicationRef: string;
      applicationType: string;
      documents: Array<{
        id: string;
        type: string;
        title: string;
        content?: string;
      }>;
    },
  ) {
    return this.aphRagService.evaluateApplicationCompliance(body);
  }

  @Get("chunks")
  @ApiOperation({
    summary: "List all indexed APH 2024–2027 statutory knowledge chunks",
  })
  @ApiResponse({ status: 200, description: "All policy chunks" })
  getAllChunks() {
    return this.aphRagService.getAllChunks();
  }

  @Get("clauses/:clauseNumber")
  @ApiOperation({ summary: "Get details for a specific APH clause number" })
  @ApiParam({
    name: "clauseNumber",
    description: "Clause number e.g. 1.4.2 or 6.4",
  })
  getByClause(@Param("clauseNumber") clauseNumber: string) {
    return this.aphRagService.getChunkByClause(clauseNumber);
  }
}
