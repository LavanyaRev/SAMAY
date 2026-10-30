import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import {
  UndertakingsService,
  ConditionEvidenceFile,
} from "./undertakings.service";

@ApiTags("Undertakings & Conditions")
@Controller("undertakings")
export class UndertakingsController {
  constructor(private readonly undertakingsService: UndertakingsService) {}

  @Get()
  @ApiOperation({ summary: "List all undertakings and their conditions" })
  listAll() {
    return this.undertakingsService.listUndertakings();
  }

  @Get("conditions")
  @ApiOperation({ summary: "List all undertaking conditions across institutions" })
  listConditions() {
    return this.undertakingsService.listConditions();
  }

  @Get("application/:applicationId")
  @ApiOperation({ summary: "List time-bound undertakings for an application" })
  @ApiParam({ name: "applicationId", description: "Application UUID" })
  @ApiResponse({ status: 200, description: "Undertakings list" })
  getByApplication(@Param("applicationId") applicationId: string) {
    return this.undertakingsService.getByApplication(applicationId);
  }

  @Post()
  @ApiOperation({
    summary:
      "Register a new time-bound compliance undertaking (officer form or workflow API)",
  })
  @ApiResponse({ status: 201, description: "Undertaking registered" })
  create(
    @Body()
    payload: {
      applicationId: string;
      applicationRef?: string;
      institutionId?: string;
      institutionName?: string;
      region?: string;
      category: string;
      description: string;
      affidavitUrl: string;
      conditions?: Array<{
        conditionType: string;
        description?: string;
        requiredEvidenceTypes: string[];
        dueDate?: string;
      }>;
    },
  ) {
    return this.undertakingsService.createUndertakingWithConditions(payload);
  }

  @Post(":id/conditions")
  @ApiOperation({
    summary:
      "Add a Condition to an Undertaking and create an UNDERTAKING DueItem",
  })
  addCondition(
    @Param("id") id: string,
    @Body()
    body: {
      conditionType: string;
      description?: string;
      requiredEvidenceTypes: string[];
      dueDate?: string;
      warningOffsets?: number[];
      actorUserId?: string;
      actorRole?: string;
    },
  ) {
    return this.undertakingsService.addConditionToUndertaking(id, body);
  }

  @Post("conditions/:conditionId/submit-evidence")
  @ApiOperation({
    summary:
      "Institution submits evidence per condition; advisory panel flags missing evidence types without auto-accepting",
  })
  submitEvidence(
    @Param("conditionId") conditionId: string,
    @Body()
    body: {
      submittedByUserId: string;
      submittedByRole: string;
      evidenceFiles: ConditionEvidenceFile[];
      providedEvidenceTypes?: string[];
      remarks: string;
    },
  ) {
    return this.undertakingsService.submitConditionEvidence(conditionId, body);
  }

  @Post("conditions/:conditionId/review")
  @ApiOperation({
    summary:
      "Officer reviews condition evidence (ACCEPT, REJECT with reason, or REQUEST_MORE; institutions forbidden)",
  })
  reviewEvidence(
    @Param("conditionId") conditionId: string,
    @Body()
    body: {
      decision: "ACCEPT" | "REJECT" | "REQUEST_MORE";
      actorUserId: string;
      actorRole: string;
      reason?: string;
    },
  ) {
    return this.undertakingsService.reviewConditionEvidence(conditionId, body);
  }

  @Post("conditions/:conditionId/waive")
  @ApiOperation({
    summary:
      "Competent Authority waives a condition with mandatory reason (audited)",
  })
  waiveCondition(
    @Param("conditionId") conditionId: string,
    @Body()
    body: {
      actorUserId: string;
      actorRole: string;
      waiverReason: string;
    },
  ) {
    return this.undertakingsService.waiveConditionByAuthority(
      conditionId,
      body,
    );
  }

  @Post("escalations/evaluate")
  @ApiOperation({
    summary:
      "Evaluate overdue undertaking conditions against Demo Clock and escalate via Phase 6 ladder",
  })
  evaluateEscalations() {
    return this.undertakingsService.evaluateUndertakingEscalations();
  }
}
