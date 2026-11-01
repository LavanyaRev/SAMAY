import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { WorkflowActionName, WorkflowService } from "./workflow.service";
import {
  ApplicationStatus,
  UserRole,
  AphApplicationCategory,
  type DocumentAnalysisInput,
} from "@samay/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser, CurrentUser } from "../auth/current-user.decorator";

@ApiTags("Workflow")
@Controller("workflow")
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get("definition")
  @ApiOperation({
    summary: "Get active workflow rule definition (versioned JSON data)",
  })
  @ApiResponse({ status: 200, description: "Active workflow definition" })
  getActiveDefinition() {
    return this.workflowService.getActiveDefinition();
  }

  @Get("pipelines")
  @ApiOperation({
    summary:
      "List all immutable versioned pipeline definitions (ONLY_SCRUTINY, SCRUTINY_EVC)",
  })
  @ApiResponse({ status: 200, description: "Versioned pipeline definitions" })
  listPipelines() {
    return this.workflowService.listPipelines();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("applications/:id/allowed-actions")
  @ApiOperation({
    summary: "List allowed next workflow actions for the current user",
  })
  @ApiParam({ name: "id", description: "Application UUID" })
  @ApiResponse({ status: 200, description: "Allowed next actions" })
  getAllowedActions(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflowService.getAllowedActions(id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("applications/:id/submit")
  @ApiOperation({
    summary: "Submit an application draft into the pinned workflow pipeline",
  })
  @ApiParam({ name: "id", description: "Application UUID" })
  @ApiResponse({ status: 200, description: "Application submitted" })
  @ApiResponse({
    status: 409,
    description: "Optimistic locking version conflict",
  })
  submitApplication(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      expectedVersion: number;
      idempotencyKey: string;
      reason?: string;
    },
  ) {
    return this.workflowService.submit(
      id,
      user.id,
      user.role,
      body.expectedVersion,
      body.idempotencyKey,
      body.reason,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("applications/:id/actions")
  @ApiOperation({
    summary:
      "Perform a workflow transition action (submit, advance, complete_stage, return_for_deficiency, revert, withdraw, reject)",
  })
  @ApiParam({ name: "id", description: "Application UUID" })
  @ApiResponse({ status: 200, description: "Action executed atomically" })
  @ApiResponse({
    status: 403,
    description: "Role not permitted for transition",
  })
  @ApiResponse({
    status: 409,
    description: "Optimistic locking version conflict",
  })
  performAction(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      action: WorkflowActionName;
      expectedVersion: number;
      idempotencyKey: string;
      reason?: string;
      reasonCode?: string;
      targetStage?: string;
    },
  ) {
    return this.workflowService.performAction({
      applicationId: id,
      action: body.action,
      actorId: user.id,
      actorRole: user.role,
      actorRegionId: user.regionId,
      actorInstitutionId: user.institutionId,
      expectedVersion: body.expectedVersion,
      idempotencyKey: body.idempotencyKey,
      reason: body.reason,
      reasonCode: body.reasonCode,
      targetStage: body.targetStage,
    });
  }

  @Post("transition/:applicationId")
  @ApiOperation({
    summary: "Execute an atomic state transition and write audit log",
  })
  @ApiParam({ name: "applicationId", description: "Application UUID" })
  @ApiResponse({ status: 200, description: "Transition executed atomically" })
  executeTransition(
    @Param("applicationId") applicationId: string,
    @Body()
    body: {
      targetState: ApplicationStatus;
      actorId: string;
      actorRole: UserRole;
      rationale?: string;
    },
  ) {
    return this.workflowService.executeTransition(
      applicationId,
      body.targetState,
      body.actorId,
      body.actorRole,
      body.rationale,
    );
  }

  @Get("evaluate-aph")
  @ApiOperation({
    summary:
      "Evaluate dynamic APH 2024-27 workflow plan for application category",
  })
  evaluateAphWorkflow(
    @Query("category") category?: AphApplicationCategory,
    @Query("isContested") isContested?: string,
    @Query("hasShortcomings") hasShortcomings?: string,
    @Query("requiresEvc") requiresEvc?: string,
    @Query("deficiencies") deficiencies?: string,
  ) {
    return this.workflowService.evaluateAphWorkflow({
      category: category || AphApplicationCategory.EOA_SELF_DISCLOSURE,
      isContestedRejection: isContested === "true",
      hasShortcomingsOrScn: hasShortcomings === "true",
      requiresOnSiteInspection: requiresEvc === "true",
      deficiencyCount: deficiencies ? parseInt(deficiencies, 10) : 0,
    });
  }

  @Get("policies")
  @ApiOperation({
    summary:
      "Get centralized statutory policies and deadlines from APH rule engine",
  })
  getStatutoryPolicies() {
    return this.workflowService.getStatutoryPolicies();
  }

  @Post("analyze-document")
  @ApiOperation({
    summary:
      "Analyze document against APH clauses with structural completeness verification",
  })
  analyzeDocument(@Body() body: DocumentAnalysisInput) {
    return this.workflowService.analyzeDocument(body);
  }
}
