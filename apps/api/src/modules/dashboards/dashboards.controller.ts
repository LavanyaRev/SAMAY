import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UserRole } from "@samay/shared";
import {
  DashboardsService,
  AnalyticsActorScope,
  AnalyticsFilterQuery,
} from "./dashboards.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/current-user.decorator";

@ApiTags("Dashboards & Analytics API")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("dashboards")
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  private parseScopeAndFilters(
    user: AuthenticatedUser | undefined,
    query: Record<string, string | undefined>,
  ): {
    scope: AnalyticsActorScope;
    filters: AnalyticsFilterQuery;
  } {
    const actorRole = user?.role || query.actorRole || UserRole.BUREAU_OFFICER;
    const actorRegion = user?.regionCode || user?.regionId || query.actorRegion;
    const actorInstitutionId = user?.institutionId || query.actorInstitutionId;
    const actorUserId = user?.id || query.actorUserId;

    // Strict RBAC: Regional Officer cannot query other regions or national un-scoped data
    if (actorRole === UserRole.REGIONAL_OFFICER) {
      const allowedRegion = actorRegion || "WRO";
      if (
        query.region &&
        query.region !== "ALL" &&
        query.region !== allowedRegion
      ) {
        throw new ForbiddenException(
          `Jurisdiction violation: Regional Officers cannot access analytics outside their assigned region (${allowedRegion}).`,
        );
      }
    }

    const scope: AnalyticsActorScope = {
      actorRole,
      actorRegion,
      actorInstitutionId,
      actorUserId,
    };

    const filters: AnalyticsFilterQuery = {
      region:
        actorRole === UserRole.REGIONAL_OFFICER
          ? actorRegion || "WRO"
          : query.region,
      stage: query.stage,
      institution: query.institution,
      officer: query.officer,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      pipeline: query.pipeline,
      slaState: query.slaState as AnalyticsFilterQuery["slaState"],
      ageingBucket: query.ageingBucket,
    };
    return { scope, filters };
  }

  @Get("summary")
  @Roles(UserRole.BUREAU_OFFICER, UserRole.ADMIN)
  @ApiOperation({
    summary:
      "Get national pendency and approval progress summary (BUREAU_OFFICER and ADMIN only)",
  })
  @ApiResponse({ status: 200, description: "Summary statistics" })
  @ApiResponse({
    status: 403,
    description: "Forbidden for regional officers or unauthorized roles",
  })
  getSummary(@CurrentUser() user?: AuthenticatedUser) {
    if (user && user.role === UserRole.REGIONAL_OFFICER) {
      throw new ForbiddenException(
        "Jurisdiction violation: Regional Officers cannot access macro Pan-India Bureau summaries.",
      );
    }
    return this.dashboardsService.getSummary();
  }

  @Get("applications-by-stage")
  @Roles(
    UserRole.BUREAU_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.ADMIN,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({
    summary:
      "Applications by stage and region (SQL View vw_applications_by_stage_region, scoped & cached)",
  })
  getApplicationsByStage(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    const { scope, filters } = this.parseScopeAndFilters(user, query);
    return this.dashboardsService.getApplicationsByStageAndRegion(
      scope,
      filters,
    );
  }

  @Get("ageing-buckets")
  @Roles(
    UserRole.BUREAU_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.ADMIN,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({
    summary:
      "Ageing buckets in working days (0-7, 8-15, 16-30, 31-60, 60+, configurable thresholds)",
  })
  getAgeingBuckets(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    const { scope, filters } = this.parseScopeAndFilters(user, query);
    const customThresholds = query.thresholds
      ? query.thresholds
          .split(",")
          .map((n) => Number(n.trim()))
          .filter((n) => !Number.isNaN(n))
      : undefined;
    return this.dashboardsService.getAgeingBuckets(
      scope,
      filters,
      customThresholds,
    );
  }

  @Get("sla-counts")
  @Roles(
    UserRole.BUREAU_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.ADMIN,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({
    summary: "SLA state counts (ON_TRACK, DUE_SOON, OVERDUE, PAUSED)",
  })
  getSlaCounts(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    const { scope, filters } = this.parseScopeAndFilters(user, query);
    return this.dashboardsService.getSlaStateCounts(scope, filters);
  }

  @Get("officer-workload")
  @Roles(UserRole.BUREAU_OFFICER, UserRole.REGIONAL_OFFICER, UserRole.ADMIN)
  @ApiOperation({
    summary: "Pending applications and overdue counts per officer",
  })
  getOfficerWorkload(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    const { scope, filters } = this.parseScopeAndFilters(user, query);
    return this.dashboardsService.getPendingPerOfficer(scope, filters);
  }

  @Get("evc-counts")
  @Roles(
    UserRole.BUREAU_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.ADMIN,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({
    summary: "EVC status counts (vw_evc_status_counts)",
  })
  getEvcCounts(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    const { scope, filters } = this.parseScopeAndFilters(user, query);
    return this.dashboardsService.getEvcStatusCounts(scope, filters);
  }

  @Get("undertaking-counts")
  @Roles(
    UserRole.BUREAU_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.ADMIN,
    UserRole.INSTITUTION,
  )
  @ApiOperation({
    summary:
      "Undertaking condition compliance counts (vw_undertaking_compliance_counts)",
  })
  getUndertakingCounts(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    const { scope, filters } = this.parseScopeAndFilters(user, query);
    return this.dashboardsService.getUndertakingComplianceCounts(
      scope,
      filters,
    );
  }

  @Get("document-expiry-buckets")
  @Roles(
    UserRole.BUREAU_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.ADMIN,
    UserRole.INSTITUTION,
  )
  @ApiOperation({
    summary:
      "Tracked document expiry buckets (EXPIRED, 0-30d, 31-60d, 61-90d, >90d)",
  })
  getDocumentExpiryBuckets(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    const { scope, filters } = this.parseScopeAndFilters(user, query);
    return this.dashboardsService.getDocumentExpiryBuckets(scope, filters);
  }

  @Get("overdue-lists")
  @Roles(UserRole.BUREAU_OFFICER, UserRole.REGIONAL_OFFICER, UserRole.ADMIN)
  @ApiOperation({
    summary:
      "Overdue and due-soon lists plus stage bottleneck variance vs statutory target",
  })
  getOverdueLists(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    const { scope, filters } = this.parseScopeAndFilters(user, query);
    return this.dashboardsService.getOverdueListsAndBottlenecks(scope, filters);
  }

  @Get("drilldown")
  @Roles(
    UserRole.BUREAU_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.ADMIN,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({
    summary:
      "Drill-down endpoint returning filtered case list for any clicked chart element",
  })
  getDrilldown(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    const { scope, filters } = this.parseScopeAndFilters(user, query);
    return this.dashboardsService.getDrilldownCases(scope, filters);
  }
}
