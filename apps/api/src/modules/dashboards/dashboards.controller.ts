import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { UserRole } from "@samay/shared";
import {
  DashboardsService,
  AnalyticsActorScope,
  AnalyticsFilterQuery,
} from "./dashboards.service";

@ApiTags("Dashboards & Analytics API")
@Controller("dashboards")
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  private parseScopeAndFilters(query: Record<string, string | undefined>): {
    scope: AnalyticsActorScope;
    filters: AnalyticsFilterQuery;
  } {
    const scope: AnalyticsActorScope = {
      actorRole: query.actorRole || UserRole.BUREAU_OFFICER,
      actorRegion: query.actorRegion,
      actorInstitutionId: query.actorInstitutionId,
      actorUserId: query.actorUserId,
    };
    const filters: AnalyticsFilterQuery = {
      region: query.region,
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
  @ApiOperation({
    summary: "Get national pendency and approval progress summary",
  })
  @ApiResponse({ status: 200, description: "Summary statistics" })
  getSummary() {
    return this.dashboardsService.getSummary();
  }

  @Get("applications-by-stage")
  @ApiOperation({
    summary:
      "Applications by stage and region (SQL View vw_applications_by_stage_region, scoped & cached)",
  })
  getApplicationsByStage(@Query() query: Record<string, string | undefined>) {
    const { scope, filters } = this.parseScopeAndFilters(query);
    return this.dashboardsService.getApplicationsByStageAndRegion(
      scope,
      filters,
    );
  }

  @Get("ageing-buckets")
  @ApiOperation({
    summary:
      "Ageing buckets in working days (0-7, 8-15, 16-30, 31-60, 60+, configurable thresholds)",
  })
  getAgeingBuckets(@Query() query: Record<string, string | undefined>) {
    const { scope, filters } = this.parseScopeAndFilters(query);
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
  @ApiOperation({
    summary: "SLA state counts (ON_TRACK, DUE_SOON, OVERDUE, PAUSED)",
  })
  getSlaCounts(@Query() query: Record<string, string | undefined>) {
    const { scope, filters } = this.parseScopeAndFilters(query);
    return this.dashboardsService.getSlaStateCounts(scope, filters);
  }

  @Get("officer-workload")
  @ApiOperation({
    summary: "Pending applications and overdue counts per officer",
  })
  getOfficerWorkload(@Query() query: Record<string, string | undefined>) {
    const { scope, filters } = this.parseScopeAndFilters(query);
    return this.dashboardsService.getPendingPerOfficer(scope, filters);
  }

  @Get("evc-counts")
  @ApiOperation({
    summary: "EVC status counts (vw_evc_status_counts)",
  })
  getEvcCounts(@Query() query: Record<string, string | undefined>) {
    const { scope, filters } = this.parseScopeAndFilters(query);
    return this.dashboardsService.getEvcStatusCounts(scope, filters);
  }

  @Get("undertaking-counts")
  @ApiOperation({
    summary:
      "Undertaking condition compliance counts (vw_undertaking_compliance_counts)",
  })
  getUndertakingCounts(@Query() query: Record<string, string | undefined>) {
    const { scope, filters } = this.parseScopeAndFilters(query);
    return this.dashboardsService.getUndertakingComplianceCounts(
      scope,
      filters,
    );
  }

  @Get("document-expiry-buckets")
  @ApiOperation({
    summary:
      "Tracked document expiry buckets (EXPIRED, 0-30d, 31-60d, 61-90d, >90d)",
  })
  getDocumentExpiryBuckets(@Query() query: Record<string, string | undefined>) {
    const { scope, filters } = this.parseScopeAndFilters(query);
    return this.dashboardsService.getDocumentExpiryBuckets(scope, filters);
  }

  @Get("overdue-lists")
  @ApiOperation({
    summary:
      "Overdue and due-soon lists plus stage bottleneck variance vs statutory target",
  })
  getOverdueLists(@Query() query: Record<string, string | undefined>) {
    const { scope, filters } = this.parseScopeAndFilters(query);
    return this.dashboardsService.getOverdueListsAndBottlenecks(scope, filters);
  }

  @Get("drilldown")
  @ApiOperation({
    summary:
      "Drill-down endpoint returning filtered case list for any clicked chart element",
  })
  getDrilldown(@Query() query: Record<string, string | undefined>) {
    const { scope, filters } = this.parseScopeAndFilters(query);
    return this.dashboardsService.getDrilldownCases(scope, filters);
  }
}
