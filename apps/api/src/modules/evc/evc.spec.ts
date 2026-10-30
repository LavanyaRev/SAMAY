import { Test, TestingModule } from "@nestjs/testing";
import { STATUTORY_ADVISORY_LABEL } from "@samay/shared";
import { ClockModule } from "../../common/clock/clock.module";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuditService } from "../audit/audit.service";
import { DeadlinesModule } from "../deadlines/deadlines.module";
import { DueItemService } from "../deadlines/due-item.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationsService } from "../notifications/notifications.service";
import { EvcModule } from "./evc.module";
import { EvcService, STATUTORY_EVC_COMMITTEE_NOTICE } from "./evc.service";
import { PanelProposalService } from "./panel-proposal.service";

describe("Phase 7: Expert Visit Committee (EVC) Module — CoI, Workload, Scheduling & Demo Clock Escalation", () => {
  let moduleRef: TestingModule;
  let clock: SystemClockService;
  let dueItems: DueItemService;
  let auditService: AuditService;
  let notificationsService: NotificationsService;
  let panelProposalService: PanelProposalService;
  let evcService: EvcService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ClockModule,
        PrismaModule,
        AuditModule,
        DeadlinesModule,
        NotificationsModule,
        EvcModule,
      ],
    }).compile();

    clock = moduleRef.get(SystemClockService);
    dueItems = moduleRef.get(DueItemService);
    auditService = moduleRef.get(AuditService);
    notificationsService = moduleRef.get(NotificationsService);
    panelProposalService = moduleRef.get(PanelProposalService);
    evcService = moduleRef.get(EvcService);

    clock.setSimulatedTime(
      clock.parseIso("2026-05-04T03:30:00.000Z").getTime(),
    );
    evcService.resetAll();
    notificationsService.resetAll();
  });

  it("1. Rejects experts with Conflict of Interest (Same Institution, Same Trust/Society, Prior-Association List) and ranks conflict-free panels by workload & expertise as ADVISORY", () => {
    const result = panelProposalService.proposePanelsForCase({
      applicationId: "APP-2026-WRO-COI-TEST",
      institutionId: "inst-wce-sangli",
      institutionName: "Walchand College of Engineering, Sangli",
      trustOrSociety: "Shikshan Prasarak Mandal, Pune",
      region: "WRO",
      requiredExpertiseTags: [
        "ENGINEERING_TECHNOLOGY",
        "AI_DS",
        "INFRASTRUCTURE",
      ],
    });

    expect(result.classification).toBe(STATUTORY_ADVISORY_LABEL);

    // Verify all 3 Conflict-of-Interest categories are caught and explicitly reported
    const coiTypes = result.rejectedExperts.map((r) => r.conflictType);
    expect(coiTypes).toContain("SAME_INSTITUTION");
    expect(coiTypes).toContain("SAME_TRUST_OR_SOCIETY");
    expect(coiTypes).toContain("PRIOR_ASSOCIATION_LIST");

    const rejectedIds = new Set(
      result.rejectedExperts.map((r) => r.expertUserId),
    );
    expect(rejectedIds.has("exp-wro-coi-inst")).toBe(true);
    expect(rejectedIds.has("exp-wro-coi-trust")).toBe(true);
    expect(rejectedIds.has("exp-wro-coi-prior")).toBe(true);

    // Verify none of the rejected experts appear in any proposed panel
    for (const panel of result.proposedPanels) {
      expect(panel.classification).toBe(STATUTORY_ADVISORY_LABEL);
      for (const member of panel.members) {
        expect(rejectedIds.has(member.expertUserId)).toBe(false);
      }
    }

    // Verify Panel #1 has lower active workload (higher totalWorkloadScore) than Panel #2
    expect(result.proposedPanels.length).toBeGreaterThanOrEqual(2);
    expect(result.proposedPanels[0].totalWorkloadScore).toBeGreaterThan(
      result.proposedPanels[1].totalWorkloadScore,
    );
    expect(result.proposedPanels[0].compositeRankScore).toBeGreaterThanOrEqual(
      result.proposedPanels[1].compositeRankScore,
    );
  });

  it("2. Creates EvcCase and DueItems (EVC_SCHEDULING & EVC_COMPLETION) with stricter timelines for NEW_INSTITUTION when workflow reaches requires_evc", async () => {
    const newInstResult = await evcService.handleWorkflowRequiresEvcEvent({
      applicationId: "44444444-4444-4444-8444-444444444601",
      applicationRef: "APP-2026-WRO-NEW-001",
      institutionId: "inst-new-pune-ai",
      institutionName: "Pune Institute of AI & Emerging Tech",
      isNewInstitution: true,
    });

    const existingInstResult = await evcService.handleWorkflowRequiresEvcEvent({
      applicationId: "44444444-4444-4444-8444-444444444602",
      applicationRef: "APP-2026-WRO-EXT-002",
      institutionId: "inst-coep-pune",
      institutionName: "COEP Technological University, Pune",
      isNewInstitution: false,
    });

    expect(newInstResult.evcCase.status).toBe("QUEUED");
    expect(newInstResult.schedulingDueItem.kind).toBe("EVC_SCHEDULING");
    expect(newInstResult.completionDueItem.kind).toBe("EVC_COMPLETION");

    // Stricter timeline check: NEW_INSTITUTION due dates are strictly earlier than existing institution due dates
    const newSchedMs = clock
      .parseIso(newInstResult.schedulingDueItem.dueAt)
      .getTime();
    const extSchedMs = clock
      .parseIso(existingInstResult.schedulingDueItem.dueAt)
      .getTime();
    expect(newSchedMs).toBeLessThan(extSchedMs);

    const newCompMs = clock
      .parseIso(newInstResult.completionDueItem.dueAt)
      .getTime();
    const extCompMs = clock
      .parseIso(existingInstResult.completionDueItem.dueAt)
      .getTime();
    expect(newCompMs).toBeLessThan(extCompMs);
  });

  it("3. Executes full lifecycle on the Demo Clock for a delayed New-Institution EVC across 30 seeded EVC-eligible applications, verifying reminders, Phase 6 escalations, human confirmation audit, reschedule, and automatic committee stage continuation", async () => {
    const sim = await evcService.runDelayedNewInstitutionEvcSimulation();

    // 1. 30 seeded EVC-eligible applications created
    expect(sim.seededCaseCount).toBe(30);

    // 2. Final status is REPORT_ACCEPTED and workflowStage automatically advanced to SAC_SHC
    expect(sim.finalCase.status).toBe("REPORT_ACCEPTED");
    expect(sim.finalCase.workflowStage).toBe("SAC_SHC");
    expect(sim.finalCase.statutoryCommitteeNotice).toBe(
      STATUTORY_EVC_COMMITTEE_NOTICE,
    );
    expect(sim.finalCase.visitReport?.statutoryNotice).toBe(
      STATUTORY_EVC_COMMITTEE_NOTICE,
    );
    expect(sim.finalCase.rescheduleHistory.length).toBe(1);

    // 3. Both DueItems (EVC_SCHEDULING & EVC_COMPLETION) are CLOSED
    const schedDue = dueItems.getDueItem(sim.finalCase.schedulingDueItemId);
    const compDue = dueItems.getDueItem(sim.finalCase.completionDueItemId);
    expect(schedDue.status).toBe("CLOSED");
    expect(compDue.status).toBe("CLOSED");

    // 4. Verify all 3 EVC Alert Types fired through the Phase 6 escalation ladder
    const alertKinds = new Set(sim.alertsFired.map((a) => a.alertKind));
    expect(alertKinds.has("EVC_UNSCHEDULED_BEYOND_THRESHOLD")).toBe(true);
    expect(alertKinds.has("EVC_APPROACHING")).toBe(true);
    expect(alertKinds.has("EVC_VISIT_DONE_REPORT_OVERDUE")).toBe(true);

    // Verify hash-chained audit trail integrity for the application
    const auditVerify = await auditService.verifyChain(
      sim.finalCase.applicationId,
    );
    expect(auditVerify.valid).toBe(true);
    expect(auditVerify.totalEntries).toBeGreaterThanOrEqual(6);

    // Print verification tables
    console.log(
      "\n==========================================================================================",
    );
    console.log(
      "EVC MODULE VERIFICATION: DELAYED NEW-INSTITUTION EVC ON DEMO CLOCK (30 SEEDED CASES)",
    );
    console.log(
      `Statutory Notice: "${sim.finalCase.statutoryCommitteeNotice}"`,
    );
    console.log(
      `Final Case Status: ${sim.finalCase.status} | Next Workflow Stage: ${sim.finalCase.workflowStage}`,
    );
    console.log(
      "==========================================================================================",
    );

    console.log(
      "\n--- 1. CONFLICT-OF-INTEREST (CoI) DISQUALIFICATIONS ---",
    );
    console.table(
      sim.rejectedCoiExperts.map((c) => ({
        ExpertID: c.expertUserId,
        Name: c.fullName,
        ConflictType: c.conflictType,
        RuleCited: c.ruleCited,
        Reason: c.reason.slice(0, 62),
      })),
    );

    console.log(
      "\n--- 2. EVC PHASE 6 ESCALATION & REMINDER ALERTS FIRED ON DEMO CLOCK ---",
    );
    console.table(
      sim.alertsFired.map((a) => ({
        AlertKind: a.alertKind,
        Level: `L${a.escalationLevel}`,
        EventKey: a.eventKey.split(":").slice(-1)[0],
        FiredAt: a.firedAt.slice(0, 10),
        Description: a.description.slice(0, 68),
      })),
    );
  });
});
