import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { EvcService } from "./evc.service";
import { PanelProposalService } from "./panel-proposal.service";

@ApiTags("EVC (Expert Visit Committee)")
@Controller("evc")
export class EvcController {
  constructor(
    private readonly evcService: EvcService,
    private readonly panelProposalService: PanelProposalService,
  ) { }

  @Get("schedules")
  @ApiOperation({
    summary: "List scheduled Expert Visit Committee inspections",
  })
  @ApiResponse({ status: 200, description: "EVC schedule list" })
  listSchedules() {
    return this.evcService.listSchedules();
  }

  @Get("cases")
  @ApiOperation({ summary: "List all EVC cases across regions and statuses" })
  listCases() {
    return this.evcService.listCases();
  }

  @Get("cases/:id")
  @ApiOperation({ summary: "Get EVC case detail by ID" })
  getCaseById(@Param("id") id: string) {
    return this.evcService.getCaseById(id);
  }

  @Post("cases/workflow-trigger")
  @ApiOperation({
    summary:
      "Trigger EVC case creation and EVC_SCHEDULING / EVC_COMPLETION DueItems when workflow enters requires_evc stage",
  })
  triggerFromWorkflow(
    @Body()
    body: {
      applicationId: string;
      applicationRef?: string;
      institutionId: string;
      institutionName: string;
      trustOrSociety?: string;
      region?: string;
      programStream?: string;
      isNewInstitution: boolean;
      requiredExpertiseTags?: string[];
    },
  ) {
    return this.evcService.handleWorkflowRequiresEvcEvent(body);
  }

  @Post("cases/:id/propose")
  @ApiOperation({
    summary:
      "Propose ADVISORY conflict-free EVC panels by region, expertise, workload, and availability",
  })
  proposePanels(
    @Param("id") id: string,
    @Body() body?: { userId?: string; role?: string },
  ) {
    return this.evcService.proposePanels(id, body);
  }

  @Post("cases/:id/confirm")
  @ApiOperation({
    summary:
      "Human confirmation of proposed EVC panel and scheduled date (audited)",
  })
  confirmSchedule(
    @Param("id") id: string,
    @Body()
    body: {
      panelId: string;
      scheduledDate: string;
      actorUserId: string;
      actorRole: string;
      confirmationNote?: string;
    },
  ) {
    return this.evcService.confirmPanelAndSchedule(id, body);
  }

  @Post("cases/:id/reschedule")
  @ApiOperation({
    summary:
      "Reschedule EVC inspection with mandatory reason and recalculate DueItems",
  })
  rescheduleVisit(
    @Param("id") id: string,
    @Body()
    body: {
      newDate: string;
      reason: string;
      actorUserId: string;
      actorRole: string;
    },
  ) {
    return this.evcService.rescheduleVisit(id, body);
  }

  @Post("cases/:id/visit-done")
  @ApiOperation({ summary: "Mark EVC physical/virtual inspection visit done" })
  markVisitDone(
    @Param("id") id: string,
    @Body() body: { userId: string; role: string; note?: string },
  ) {
    return this.evcService.markVisitDone(id, body);
  }

  @Post("cases/:id/submit-report")
  @ApiOperation({
    summary:
      "Upload EVC visit report and automatically continue committee stage (SAC_SHC)",
  })
  submitReport(
    @Param("id") id: string,
    @Body()
    body: {
      reportFileId: string;
      fileSha256?: string;
      summary: string;
      observations: string[];
      infrastructureVerified: boolean;
      facultyVerified: boolean;
      actorUserId: string;
      actorRole: string;
    },
  ) {
    return this.evcService.submitVisitReport(id, body);
  }

  @Get("alerts")
  @ApiOperation({
    summary:
      "List EVC alerts emitted through the Phase 6 escalation ladder (EVC_APPROACHING, EVC_UNSCHEDULED_BEYOND_THRESHOLD, EVC_VISIT_DONE_REPORT_OVERDUE)",
  })
  listAlerts(@Query("caseId") caseId?: string) {
    return this.evcService.getAlertsForCase(caseId);
  }

  @Post("alerts/evaluate")
  @ApiOperation({
    summary: "Evaluate EVC cases against clock and fire Phase 6 alerts",
  })
  evaluateAlerts() {
    return this.evcService.evaluateEvcAlerts();
  }

  @Post("simulate-delayed-new-institution")
  @ApiOperation({
    summary:
      "Run full lifecycle simulation on the demo clock for a delayed new-institution EVC across 30 seeded cases",
  })
  simulateDelayedNewInstitution() {
    return this.evcService.runDelayedNewInstitutionEvcSimulation();
  }

  @Get("experts")
  @ApiOperation({ summary: "List EVC expert pool and active workloads" })
  listExperts() {
    return this.panelProposalService.getExperts();
  }

  @Post("schedule/:applicationId")
  @ApiOperation({ summary: "Schedule an EVC inspection for an application" })
  @ApiParam({ name: "applicationId", description: "Application UUID" })
  @ApiResponse({ status: 201, description: "Inspection scheduled" })
  scheduleInspection(
    @Param("applicationId") applicationId: string,
    @Body() payload: { proposedDate: string; panelExpertIds: string[] },
  ) {
    return this.evcService.scheduleInspection(applicationId, payload);
  }
}
