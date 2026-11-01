import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { UserRole } from "@samay/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AdminService } from "./admin.service";
import {
  ComplianceScoreWeights,
  DraftSimulationConfig,
  HeroFeaturesService,
} from "./hero-features.service";

@ApiTags("Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly heroFeatures: HeroFeaturesService,
  ) {}

  @Get("config")
  @ApiOperation({
    summary:
      "Get system parameters, demo clock state, and active APH configuration",
  })
  @ApiResponse({ status: 200, description: "System configuration" })
  getConfig() {
    return this.adminService.getConfig();
  }

  @Get("clock")
  @ApiOperation({
    summary: "Get current demo-clock state for frontend banner visibility",
  })
  @ApiResponse({ status: 200, description: "Current demo-clock state" })
  getClockState() {
    return this.adminService.getClockState();
  }

  @Post("clock/offset")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      "Set demo clock offset in milliseconds (stored in system_settings & audited)",
  })
  @ApiResponse({ status: 200, description: "Clock offset updated and audited" })
  setClockOffset(
    @Body() body: { offsetMs: number; actorId?: string; reason?: string },
  ) {
    return this.adminService.setClockOffset(
      body.offsetMs,
      body.actorId,
      body.reason,
    );
  }

  @Post("clock/advance")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Advance demo clock by N days and/or hours (audited)",
  })
  @ApiResponse({ status: 200, description: "Clock advanced and audited" })
  advanceClock(
    @Body()
    body: {
      days?: number;
      hours?: number;
      actorId?: string;
      reason?: string;
    },
  ) {
    return this.adminService.advanceClock(body, body.actorId);
  }

  @Post("clock/reset")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Reset demo clock offset to real system time (audited)",
  })
  @ApiResponse({ status: 200, description: "Clock reset and audited" })
  resetClock(@Body() body?: { actorId?: string; reason?: string }) {
    return this.adminService.resetClock(body?.actorId, body?.reason);
  }

  @Get("holidays")
  @Roles(UserRole.ADMIN, UserRole.BUREAU_OFFICER, UserRole.REGIONAL_OFFICER)
  @ApiOperation({
    summary: "List holiday_calendar entries (national and regional)",
  })
  listHolidays(@Query("regionId") regionId?: string) {
    return this.adminService.listHolidays(regionId);
  }

  @Post("holidays")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Create a holiday in holiday_calendar",
  })
  createHoliday(
    @Body()
    body: {
      date: string;
      name: string;
      description?: string;
      regionId?: string | null;
      isNational?: boolean;
    },
  ) {
    return this.adminService.createHoliday(body);
  }

  @Put("holidays/:id")
  @ApiOperation({
    summary: "Update a holiday in holiday_calendar",
  })
  @ApiParam({ name: "id", description: "Holiday UUID" })
  updateHoliday(
    @Param("id") id: string,
    @Body()
    body: Partial<{
      date: string;
      name: string;
      description: string | null;
      regionId: string | null;
      isNational: boolean;
    }>,
  ) {
    return this.adminService.updateHoliday(id, body);
  }

  @Delete("holidays/:id")
  @ApiOperation({
    summary: "Delete a holiday from holiday_calendar",
  })
  @ApiParam({ name: "id", description: "Holiday UUID" })
  deleteHoliday(@Param("id") id: string) {
    return this.adminService.deleteHoliday(id);
  }

  @Post("deadlines/sweep")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Trigger on-demand deadline sweep across active due items",
  })
  runSweep(@Body() body?: { batchSize?: number }) {
    return this.adminService.runDeadlineSweep(body?.batchSize);
  }

  /* ========================================================================
   * HERO FEATURE 1: TIME-TRAVEL CONSOLE & JSON SCENARIO RUNNER
   * ======================================================================== */

  @Post("time-travel/jump")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      "Jump demo clock (+1d, +1w, +1m, or date picker), run sweep & notification worker immediately, and return live alert feed",
  })
  timeTravelJump(
    @Body()
    body: {
      days?: number;
      hours?: number;
      targetIso?: string;
      actorId?: string;
      reason?: string;
    },
  ) {
    return this.heroFeatures.jumpClockAndRunWorkers(body);
  }

  @Get("scenario")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Get JSON-defined scenario runner state and live alert feed",
  })
  getScenarioState() {
    return this.heroFeatures.getScenarioState();
  }

  @Post("scenario/next")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      "Execute next step in the JSON scenario runner (submit -> return -> respond -> EVC delay -> undertaking miss -> lease expiry)",
  })
  stepScenarioNext(@Body() body?: { actorId?: string }) {
    return this.heroFeatures.stepScenarioNext(body?.actorId);
  }

  @Post("scenario/reset")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Reset JSON scenario runner and demo clock",
  })
  resetScenario(@Body() body?: { actorId?: string }) {
    return this.heroFeatures.resetScenario(body?.actorId);
  }

  /* ========================================================================
   * HERO FEATURE 2: TAMPER DEMO (DISABLED IN PRODUCTION BUILDS)
   * ======================================================================== */

  @Get("tamper-demo/state")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      "Get current audit chain entries and verification status for Tamper Demo",
  })
  getTamperDemoState() {
    return this.heroFeatures.getTamperDemoState();
  }

  @Post("tamper-demo/tamper")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      "Tamper one audit row in demo chain (disabled in production builds)",
  })
  tamperAuditRow(
    @Body() body?: { entryIndex?: number; tamperedRationale?: string },
  ) {
    return this.heroFeatures.tamperOneAuditRow(body);
  }

  @Get("tamper-demo/verify")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Verify hash chain and pinpoint the exact broken link",
  })
  verifyTamperChain() {
    return this.heroFeatures.verifyTamperDemoChain();
  }

  @Post("tamper-demo/repair")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Repair demo state to restore untampered audit rows",
  })
  repairTamperState() {
    return this.heroFeatures.repairTamperDemoState();
  }

  /* ========================================================================
   * HERO FEATURE 3: COMPLIANCE HEALTH SCORE (WEIGHTED RULE-BASED, ADVISORY)
   * ======================================================================== */

  @Get("compliance-score/weights")
  @ApiOperation({
    summary:
      "Get configurable weights for the advisory Compliance Health Score",
  })
  getComplianceWeights() {
    return this.heroFeatures.getComplianceScoreWeights();
  }

  @Put("compliance-score/weights")
  @ApiOperation({
    summary:
      "Update configurable weights for the advisory Compliance Health Score",
  })
  updateComplianceWeights(
    @Body()
    body: {
      weights: Partial<ComplianceScoreWeights>;
      actorId?: string;
    },
  ) {
    return this.heroFeatures.updateComplianceScoreWeights(
      body.weights,
      body.actorId,
    );
  }

  @Get("compliance-score/:institutionId")
  @ApiOperation({
    summary:
      "Calculate transparent weighted rule-based Compliance Health Score (ADVISORY) with item-by-item deduction breakdown",
  })
  getInstitutionComplianceScore(@Param("institutionId") institutionId: string) {
    return this.heroFeatures.calculateInstitutionComplianceScore(institutionId);
  }

  /* ========================================================================
   * HERO FEATURE 4: RULE-CHANGE IMPACT SIMULATOR (READ-ONLY COMPARISON)
   * ======================================================================== */

  @Get("simulator/baseline")
  @ApiOperation({
    summary:
      "Get active pipeline timelines, escalation delays, and published versions",
  })
  getSimulatorBaseline() {
    return this.heroFeatures.getLiveSimulatorBaseline();
  }

  @Post("simulator/simulate")
  @ApiOperation({
    summary:
      "Replay open cases against draft timelines and escalation delays (strictly read-only, never mutates live data)",
  })
  simulateRuleChangeImpact(@Body() body: DraftSimulationConfig) {
    return this.heroFeatures.simulateRuleChangeImpact(body);
  }

  @Post("simulator/publish")
  @ApiOperation({
    summary:
      "Publish a new pipeline/policy version (requires reason and is audited)",
  })
  publishDraftVersion(
    @Body()
    body: {
      versionName: string;
      reason: string;
      draftConfig: DraftSimulationConfig;
      actorId?: string;
    },
  ) {
    return this.heroFeatures.publishDraftVersion(body);
  }
}
