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
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ApplicationsService } from "./applications.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RegionScopeGuard } from "../auth/region-scope.guard";
import { RegionScope } from "../auth/region-scope.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/current-user.decorator";
import { WorkflowActionName } from "../workflow/workflow.service";

@ApiTags("Applications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RegionScopeGuard)
@RegionScope({ paramName: "regionId" })
@Controller("applications")
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({
    summary:
      "List and filter institutional applications (role and region scoped)",
  })
  @ApiQuery({ name: "regionId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "stage", required: false })
  @ApiQuery({
    name: "ballWith",
    required: false,
    enum: ["AICTE", "INSTITUTION"],
  })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({ status: 200, description: "Applications list" })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("regionId") regionId?: string,
    @Query("status") status?: string,
    @Query("stage") stage?: string,
    @Query("ballWith") ballWith?: string,
    @Query("limit") limit?: string,
  ) {
    return this.applicationsService.list(user, {
      regionId,
      status,
      stage,
      ballWith,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("regional-queue")
  @ApiOperation({
    summary: "Get active regional scrutiny queue for Regional Scrutiny Officer",
  })
  @ApiQuery({ name: "regionId", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({
    status: 200,
    description: "Active Regional Scrutiny Queue cases",
  })
  getRegionalScrutinyQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query("regionId") regionId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.applicationsService.getRegionalScrutinyQueue(user, {
      regionId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("institution-alerts")
  @ApiOperation({
    summary: "Get active action alert feed for institution portal",
  })
  @ApiResponse({
    status: 200,
    description: "Active deficiency alerts and notices",
  })
  getInstitutionAlerts(@CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.getInstitutionAlerts(user);
  }

  @Get(":id")
  @ApiOperation({
    summary:
      "Get application details with pinned pipeline, stage timeline, and hash-chained audit trail",
  })
  @ApiParam({ name: "id", description: "Application UUID" })
  @ApiResponse({ status: 200, description: "Application state with timeline" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.getById(id, user);
  }

  @Get(":id/allowed-actions")
  @ApiOperation({
    summary:
      "List allowed next workflow actions on this application for the current user",
  })
  @ApiParam({ name: "id", description: "Application UUID" })
  @ApiResponse({ status: 200, description: "Allowed next workflow actions" })
  getAllowedActions(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationsService.getAllowedActions(id, user);
  }

  @Post(":id/submit")
  @ApiOperation({
    summary:
      "Submit an application draft into the pinned workflow pipeline (atomic outbox & audit)",
  })
  @ApiParam({ name: "id", description: "Application UUID" })
  @ApiResponse({ status: 200, description: "Application submitted" })
  @ApiResponse({
    status: 409,
    description: "Optimistic locking version conflict",
  })
  submit(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      expectedVersion: number;
      idempotencyKey: string;
      reason?: string;
    },
  ) {
    return this.applicationsService.submit(id, user, body);
  }

  @Post(":id/actions")
  @ApiOperation({
    summary:
      "Perform a workflow action on an application (submit, advance, complete_stage, return_for_deficiency, revert, withdraw, reject)",
  })
  @ApiParam({ name: "id", description: "Application UUID" })
  @ApiResponse({
    status: 200,
    description: "Workflow action executed atomically",
  })
  @ApiResponse({ status: 403, description: "Forbidden role or jurisdiction" })
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
    return this.applicationsService.performAction(id, user, body);
  }

  @Post(":id/scrutiny/accept")
  @ApiOperation({
    summary:
      "REGIONAL TRIAGE: Accept Action - Clears scrutiny, advances to approval milestone, writes hash-chained audit log and outbox event",
  })
  @ApiParam({ name: "id", description: "Application UUID or Reference" })
  @ApiResponse({
    status: 200,
    description: "Application moved out of scrutiny queue to approval registry",
  })
  acceptScrutiny(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { rationale?: string },
  ) {
    return this.applicationsService.acceptScrutiny(id, user, body);
  }

  @Post(":id/scrutiny/deficiency")
  @ApiOperation({
    summary:
      "REGIONAL TRIAGE: Deficiency Action - Generates 8-point deficiency record with strict 15-day policy deadline and triggers active institution alert",
  })
  @ApiParam({ name: "id", description: "Application UUID or Reference" })
  @ApiResponse({
    status: 200,
    description: "Deficiency record created and active alert broadcasted",
  })
  issueDeficiency(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      description: string;
      aphClause?: string;
      requiredEvidence?: string;
      deadlineDays?: number;
      rationale?: string;
    },
  ) {
    return this.applicationsService.issueDeficiency(id, user, body);
  }

  @Post(":id/scrutiny/forward-evc")
  @ApiOperation({
    summary:
      "REGIONAL TRIAGE: Forward to EVC Action - Inserts live record into evc_inspections table for committee assignment and date selection",
  })
  @ApiParam({ name: "id", description: "Application UUID or Reference" })
  @ApiResponse({
    status: 200,
    description: "Application forwarded to EVC; live inspection record created",
  })
  forwardToEvc(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      rationale?: string;
      inspectionDate?: string;
      panelChair?: string;
      panelMember2?: string;
    },
  ) {
    return this.applicationsService.forwardToEvc(id, user, body);
  }

  @Get(":id/deficiencies")
  @ApiOperation({
    summary: "Get 8-point deficiency records for an application",
  })
  @ApiParam({ name: "id", description: "Application UUID or Reference" })
  @ApiResponse({ status: 200, description: "Deficiency records list" })
  getDeficiencies(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationsService.getDeficiencies(id, user);
  }

  @Post()
  @ApiOperation({
    summary:
      "Create initial approval application and initialize workflow lifecycle",
  })
  @ApiResponse({
    status: 201,
    description:
      "Application created, route pinned, genesis audit entry written, and SLA clock started",
  })
  create(
    @Body()
    payload: {
      institutionId: string;
      academicYear: string;
      applicationType?: string;
      program?: string;
      intake?: number;
      route?: string;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationsService.create(payload, user);
  }

  @Post(":id/resolve-deficiency")
  @ApiOperation({
    summary:
      "STAGE 2: Resolve statutory deficiency and resubmit application back into Regional Scrutiny Queue",
  })
  @ApiParam({ name: "id", description: "Application UUID or Reference" })
  @ApiResponse({
    status: 200,
    description: "Deficiency resolved; re-entered Regional Scrutiny Queue",
  })
  resolveDeficiency(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      deficiencyId?: string;
      evidenceFileName?: string;
      responseNotes?: string;
    },
  ) {
    return this.applicationsService.resolveDeficiencyAndResubmit(
      id,
      user,
      body,
    );
  }

  @Post(":id/resubmit")
  @ApiOperation({
    summary:
      "Alias for resolve-deficiency: resubmits application to Regional Scrutiny Queue",
  })
  resubmit(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      deficiencyId?: string;
      evidenceFileName?: string;
      responseNotes?: string;
    },
  ) {
    return this.applicationsService.resolveDeficiencyAndResubmit(
      id,
      user,
      body,
    );
  }

  @Post(":id/evc/submit-report")
  @ApiOperation({
    summary:
      "STAGE 4: Committee Panel Member submits advisory on-site inspection report",
  })
  @ApiParam({ name: "id", description: "Application UUID or Reference" })
  @ApiResponse({
    status: 200,
    description:
      "Inspection report submitted; advanced to Executive Committee review",
  })
  submitEvcReport(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      observations?: string;
      verifiedClaims?: Record<string, boolean>;
      reportFingerprint?: string;
    },
  ) {
    return this.applicationsService.submitEvcInspectionReport(id, user, body);
  }

  @Post(":id/final-decision")
  @ApiOperation({
    summary:
      "STAGE 5: Executive Committee / Authorized Officer issues final approval (EoA) or rejection decree",
  })
  @ApiParam({ name: "id", description: "Application UUID or Reference" })
  @ApiResponse({
    status: 200,
    description: "Final decree issued; order logged in immutable audit ledger",
  })
  issueFinalDecision(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      decision: "APPROVED" | "REJECTED";
      rationale: string;
      orderNumber?: string;
    },
  ) {
    return this.applicationsService.issueFinalDecision(id, user, body);
  }
}
