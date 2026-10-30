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
import {
  CurrentUser,
  AuthenticatedUser,
} from "../auth/current-user.decorator";
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
    summary: "List and filter institutional applications (role and region scoped)",
  })
  @ApiQuery({ name: "regionId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "stage", required: false })
  @ApiQuery({ name: "ballWith", required: false, enum: ["AICTE", "INSTITUTION"] })
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
  @ApiResponse({ status: 409, description: "Optimistic locking version conflict" })
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
  @ApiResponse({ status: 200, description: "Workflow action executed atomically" })
  @ApiResponse({ status: 403, description: "Forbidden role or jurisdiction" })
  @ApiResponse({ status: 409, description: "Optimistic locking version conflict" })
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

  @Post()
  @ApiOperation({ summary: "Create initial approval application draft" })
  @ApiResponse({ status: 201, description: "Application created" })
  create(
    @Body() payload: { institutionId: string; academicYear: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationsService.create(payload, user);
  }
}
