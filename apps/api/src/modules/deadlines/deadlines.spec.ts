import { Test, TestingModule } from "@nestjs/testing";
import { UserRole } from "@samay/shared";
import { ClockModule } from "../../common/clock/clock.module";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AdminController } from "../admin/admin.controller";
import { AdminModule } from "../admin/admin.module";
import { SYSTEM_CLOCK_ENTITY_ID } from "../admin/admin.service";
import { AuditModule } from "../audit/audit.module";
import { AuditService } from "../audit/audit.service";
import { WorkflowModule } from "../workflow/workflow.module";
import { WorkflowService } from "../workflow/workflow.service";
import { DeadlinesModule } from "./deadlines.module";
import { DueItemService } from "./due-item.service";
import {
  DAY_MS,
  WorkingDayCalendarService,
} from "./working-day-calendar.service";

describe("Phase 5: Clock, Working-Day Calendar (Asia/Kolkata) & Deadline Engine", () => {
  let moduleRef: TestingModule;
  let clock: SystemClockService;
  let calendar: WorkingDayCalendarService;
  let dueItems: DueItemService;
  let adminController: AdminController;
  let auditService: AuditService;
  let workflowService: WorkflowService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ClockModule,
        PrismaModule,
        AuditModule,
        DeadlinesModule,
        AdminModule,
        WorkflowModule,
      ],
    }).compile();

    clock = moduleRef.get(SystemClockService);
    calendar = moduleRef.get(WorkingDayCalendarService);
    dueItems = moduleRef.get(DueItemService);
    adminController = moduleRef.get(AdminController);
    auditService = moduleRef.get(AuditService);
    workflowService = moduleRef.get(WorkflowService);

    clock.setSimulatedTime("2026-05-01T03:30:00.000Z"); // 2026-05-01 09:00:00 IST
    calendar.resetDefaultHolidays();
    calendar.setWeekendDays([0, 6]);
    dueItems.resetStore();
    auditService.resetInMemoryStore();
    workflowService.resetState();
  });

  afterEach(async () => {
    dueItems.stopScheduledSweep();
    clock.resetToSystemTime();
    await moduleRef.close();
  });

  describe("1. ClockService & Audited Admin Clock Endpoints", () => {
    it("sets offset, advances by days/hours, resets, exposes demo-clock banner state, and audits every change", async () => {
      // 1. Set offset to +48 hours
      const setRes = await adminController.setClockOffset({
        offsetMs: 2 * DAY_MS,
        actorId: "admin-1",
        reason: "Set +2d offset for SLA simulation",
      });
      expect(setRes.clockState.isDemoClockActive).toBe(true);
      expect(setRes.clockState.offsetDays).toBe(2);
      expect(setRes.clockState.bannerText).toContain("DEMO CLOCK ACTIVE");

      // 2. Advance by 5 days and 6 hours
      const advRes = await adminController.advanceClock({
        days: 5,
        hours: 6,
        actorId: "admin-1",
        reason: "Advance 5d 6h to test warning threshold",
      });
      expect(advRes.clockState.offsetHours).toBe(2 * 24 + 5 * 24 + 6);

      // 3. Reset clock
      const resetRes = await adminController.resetClock({
        actorId: "admin-1",
        reason: "Restore production clock",
      });
      expect(resetRes.clockState.offsetMs).toBe(0);
      expect(resetRes.clockState.isDemoClockActive).toBe(false);
      expect(resetRes.clockState.bannerText).toBeNull();

      // 4. Verify all 3 clock mutations were recorded in the hash-chained audit log
      const clockAuditChain = await auditService.verifyChain(
        SYSTEM_CLOCK_ENTITY_ID,
      );
      expect(clockAuditChain.valid).toBe(true);
      expect(clockAuditChain.totalEntries).toBe(3);
    });
  });

  describe("2. WorkingDayCalendar (Asia/Kolkata): Month Boundaries, Weekend Start, Negative N & Holiday CRUD", () => {
    it("handles holidays at month boundaries (Jan 30 -> Feb 3 across weekend + Feb 2 holiday)", async () => {
      // 2026-01-30 is Friday. Jan 31 = Sat, Feb 1 = Sun.
      // Add a holiday on 2026-02-02 (Monday).
      const createdHoliday = await adminController.createHoliday({
        date: "2026-02-02",
        name: "Special Statutory Month-Boundary Holiday",
        isNational: true,
      });

      const nextWorkDay = calendar.addWorkingDays("2026-01-30", 1);
      expect(calendar.toKolkataDateKey(nextWorkDay)).toBe("2026-02-03");
      expect(calendar.workingDaysBetween("2026-01-30", "2026-02-03")).toBe(1);

      // Update and delete holiday via admin CRUD
      const updated = await adminController.updateHoliday(createdHoliday.id, {
        name: "Updated Month-Boundary Holiday",
      });
      expect(updated.name).toBe("Updated Month-Boundary Holiday");

      await adminController.deleteHoliday(createdHoliday.id);
      const afterDelete = calendar.addWorkingDays("2026-01-30", 1);
      expect(calendar.toKolkataDateKey(afterDelete)).toBe("2026-02-02");
    });

    it("handles starting on a weekend (Saturday / Sunday) and regional holidays", () => {
      // 2026-05-02 is Saturday, 2026-05-03 is Sunday.
      expect(calendar.isWorkingDay("2026-05-02")).toBe(false);
      expect(calendar.isWorkingDay("2026-05-03")).toBe(false);

      // Adding 0 working days from Saturday rolls forward to Monday 2026-05-04
      expect(
        calendar.toKolkataDateKey(calendar.addWorkingDays("2026-05-02", 0)),
      ).toBe("2026-05-04");

      // Adding 1 working day from Saturday lands on Monday 2026-05-04
      expect(
        calendar.toKolkataDateKey(calendar.addWorkingDays("2026-05-02", 1)),
      ).toBe("2026-05-04");

      // Regional holiday: 2026-05-01 is Maharashtra Din (WRO only)
      expect(calendar.isWorkingDay("2026-05-01", "WRO")).toBe(false);
      expect(calendar.isWorkingDay("2026-05-01", "NRO")).toBe(true);
    });

    it("supports negative n in addWorkingDays and negative workingDaysBetween", () => {
      // 2026-05-06 is Wednesday.
      // Stepping back -3 working days in NRO:
      // Tue May 5 (-1), Mon May 4 (-2), Sun May 3 (skip), Sat May 2 (skip), Fri May 1 (-3)
      const back3Nro = calendar.addWorkingDays("2026-05-06", -3, "NRO");
      expect(calendar.toKolkataDateKey(back3Nro)).toBe("2026-05-01");
      expect(
        calendar.workingDaysBetween("2026-05-06", "2026-05-01", "NRO"),
      ).toBe(-3);

      // In WRO, Fri May 1 is Maharashtra Din holiday, so -3 working days lands on Thu Apr 30!
      const back3Wro = calendar.addWorkingDays("2026-05-06", -3, "WRO");
      expect(calendar.toKolkataDateKey(back3Wro)).toBe("2026-04-30");
      expect(
        calendar.workingDaysBetween("2026-05-06", "2026-04-30", "WRO"),
      ).toBe(-3);
    });
  });

  describe("3. SLA Pause & Resume Bookkeeping via Workflow Domain Events", () => {
    it("pauses SLA clock while application is with INSTITUTION and extends due_at in working days on resume", async () => {
      // Start on Monday 2026-05-04 09:00 IST
      clock.setSimulatedTime("2026-05-04T03:30:00.000Z");
      const appId = "44444444-4444-4444-8444-444444444501";

      // 1. Submit DRAFT -> SUBMITTED -> complete_stage -> SCRUTINY (7 working days timeline)
      await workflowService.submit(
        appId,
        "inst-1",
        UserRole.INSTITUTION,
        1,
        "sla-test-1",
      );
      await workflowService.completeStage(
        appId,
        "ro-1",
        UserRole.REGIONAL_OFFICER,
        2,
        "sla-test-2",
      );

      const items = dueItems.listDueItems({
        entityId: appId,
        kind: "PROCESSING_STAGE",
      });
      const activeDue = items.find((i) => i.status !== "CLOSED")!;
      expect(activeDue).toBeDefined();
      expect(activeDue.status).toBe("ON_TRACK");
      // 7 working days from Mon May 4 -> Wed May 13
      expect(calendar.toKolkataDateKey(activeDue.dueAt)).toBe("2026-05-13");

      // Advance 2 working days to Wed May 6, then Officer returns for deficiency (ball -> INSTITUTION)
      clock.advanceDays(2);
      await workflowService.returnForDeficiency(
        appId,
        "committee-1",
        UserRole.COMMITTEE_MEMBER,
        3,
        "sla-test-3",
        "Upload notarized land title deed",
        "DEF_LAND_DOCS_INCOMPLETE",
      );

      const pausedItem = dueItems.getDueItem(activeDue.id);
      expect(pausedItem.status).toBe("PAUSED");
      expect(pausedItem.pausedAt).not.toBeNull();

      // Advance 7 calendar days (5 working days: Thu May 7, Fri May 8, Mon May 11, Tue May 12, Wed May 13)
      // Run daily sweeps while PAUSED -> 0 steps should fire for paused item!
      for (let d = 0; d < 7; d++) {
        clock.advanceDays(1);
        const sweep = await dueItems.runSweep();
        expect(
          sweep.firedEvents.filter((e) => e.dueItemId === pausedItem.id).length,
        ).toBe(0);
      }

      // Now on Wed May 13, Institution submits clarification (ball -> AICTE)
      await workflowService.submit(
        appId,
        "inst-1",
        UserRole.INSTITUTION,
        4,
        "sla-test-4",
        "Uploaded notarized land title deed",
      );

      const resumedItem = dueItems.getDueItem(activeDue.id);
      expect(resumedItem.status).not.toBe("PAUSED");
      expect(resumedItem.pausedAt).toBeNull();
      expect(resumedItem.totalPausedWorkingDays).toBe(5);
      // Original dueAt was Wed May 13; extended by 5 working days -> Wed May 20!
      expect(calendar.toKolkataDateKey(resumedItem.dueAt)).toBe("2026-05-20");
    });
  });

  describe("4. Crash-Recovery & Batch Idempotency Test", () => {
    it("recovers cleanly from a mid-batch crash without firing duplicate steps", async () => {
      clock.setSimulatedTime("2026-05-04T03:30:00.000Z");

      // Create 6 due items that are already 2 days overdue
      for (let i = 1; i <= 6; i++) {
        await dueItems.createDueItem({
          label: `CRASH-TEST-ITEM-${i}`,
          kind: "PROCESSING_STAGE",
          entityType: "APPLICATION",
          entityId: `44444444-4444-4444-8444-44444444450${i}`,
          dueAt: clock.minusDays(2),
          warningOffsets: [-7, -3, -1],
        });
      }

      // 1. Run sweep that crashes after processing 3 items
      await expect(dueItems.runSweep({ failAfterItems: 3 })).rejects.toThrow(
        "Simulated mid-batch sweep crash after 3 items",
      );

      // First 3 items fired 5 steps each (T-7, T-3, T-1, OVERDUE, ESCALATION_L1) = 15 steps
      expect(dueItems.getAllFiredSteps().length).toBe(15);

      // 2. Re-run sweep after crash recovery -> first 3 items fire 0 duplicate steps, remaining 3 items fire 15 steps
      const recoveryReport = await dueItems.runSweep();
      expect(recoveryReport.itemsScanned).toBe(6);
      expect(recoveryReport.stepsFired).toBe(15);
      expect(dueItems.getAllFiredSteps().length).toBe(30);

      // 3. Re-run sweep a third time -> 0 steps fired
      const idempotentReport = await dueItems.runSweep();
      expect(idempotentReport.stepsFired).toBe(0);
    });
  });

  describe("5. 180-Day Day-by-Day Simulation & Verification Table", () => {
    it("advances Clock day-by-day for 180 days, asserts exactly-once step firing, and prints steps-fired table for 3 sample items", async () => {
      // Day 0: 2026-05-01 09:00 IST
      const startEpochMs = clock.parseIso("2026-05-01T03:30:00.000Z").getTime();
      clock.setSimulatedTime(startEpochMs);

      // Seed 3 primary sample items + 3 additional items across all 6 kinds
      const sample1 = await dueItems.createDueItem({
        id: "77777777-7777-4777-8777-777777777001",
        label: "SAMPLE-1 (PROCESSING_STAGE • Due Day 15)",
        kind: "PROCESSING_STAGE",
        entityType: "APPLICATION",
        entityId: "44444444-4444-4444-8444-444444444501",
        dueAt: clock.fromEpochMs(startEpochMs + 15 * DAY_MS),
        warningOffsets: [-7, -3, -1],
      });

      const sample2 = await dueItems.createDueItem({
        id: "77777777-7777-4777-8777-777777777002",
        label: "SAMPLE-2 (UNDERTAKING • Due Day 60)",
        kind: "UNDERTAKING",
        entityType: "UNDERTAKING",
        entityId: "44444444-4444-4444-8444-444444444502",
        dueAt: clock.fromEpochMs(startEpochMs + 60 * DAY_MS),
        warningOffsets: [-30, -15, -7, -1],
      });

      const sample3 = await dueItems.createDueItem({
        id: "77777777-7777-4777-8777-777777777003",
        label: "SAMPLE-3 (DOCUMENT_EXPIRY • Due Day 120)",
        kind: "DOCUMENT_EXPIRY",
        entityType: "TRACKED_DOCUMENT",
        entityId: "44444444-4444-4444-8444-444444444503",
        dueAt: clock.fromEpochMs(startEpochMs + 120 * DAY_MS),
        warningOffsets: [-30, -15, -7, -1],
      });

      // Also seed EVC_SCHEDULING, EVC_COMPLETION, and DOCUMENT_RENEWAL
      await dueItems.createDueItem({
        label: "EXTRA-4 (EVC_SCHEDULING • Due Day 10)",
        kind: "EVC_SCHEDULING",
        entityType: "EVC_CASE",
        entityId: "44444444-4444-4444-8444-444444444504",
        dueAt: clock.fromEpochMs(startEpochMs + 10 * DAY_MS),
        warningOffsets: [-7, -3, -1],
      });
      await dueItems.createDueItem({
        label: "EXTRA-5 (EVC_COMPLETION • Due Day 25)",
        kind: "EVC_COMPLETION",
        entityType: "EVC_CASE",
        entityId: "44444444-4444-4444-8444-444444444505",
        dueAt: clock.fromEpochMs(startEpochMs + 25 * DAY_MS),
        warningOffsets: [-15, -7, -3, -1],
      });
      await dueItems.createDueItem({
        label: "EXTRA-6 (DOCUMENT_RENEWAL • Due Day 150)",
        kind: "DOCUMENT_RENEWAL",
        entityType: "TRACKED_DOCUMENT",
        entityId: "44444444-4444-4444-8444-444444444506",
        dueAt: clock.fromEpochMs(startEpochMs + 150 * DAY_MS),
        warningOffsets: [-30, -15, -7, -1],
      });

      const sampleIds = new Set([sample1.id, sample2.id, sample3.id]);
      const tableRows: Array<{
        day: number;
        istDate: string;
        sample1Steps: string;
        sample2Steps: string;
        sample3Steps: string;
      }> = [];

      const seenItemStepPairs = new Set<string>();

      for (let day = 0; day <= 180; day++) {
        if (day > 0) {
          clock.advanceDays(1);
        }

        // Run first sweep of the day
        const sweep1 = await dueItems.runSweep();
        // Run second duplicate sweep on the exact same day to prove idempotency
        const sweep2 = await dueItems.runSweep();
        expect(sweep2.stepsFired).toBe(0);

        for (const ev of sweep1.firedEvents) {
          const pairKey = `${ev.dueItemId}::${ev.stepKey}`;
          expect(seenItemStepPairs.has(pairKey)).toBe(false);
          seenItemStepPairs.add(pairKey);
        }

        const sampleEventsToday = sweep1.firedEvents.filter((e) =>
          sampleIds.has(e.dueItemId),
        );
        if (sampleEventsToday.length > 0) {
          const s1 = sampleEventsToday
            .filter((e) => e.dueItemId === sample1.id)
            .map((e) => e.stepKey)
            .join(", ");
          const s2 = sampleEventsToday
            .filter((e) => e.dueItemId === sample2.id)
            .map((e) => e.stepKey)
            .join(", ");
          const s3 = sampleEventsToday
            .filter((e) => e.dueItemId === sample3.id)
            .map((e) => e.stepKey)
            .join(", ");

          tableRows.push({
            day,
            istDate: calendar.toKolkataDateKey(clock.now()),
            sample1Steps: s1 || "—",
            sample2Steps: s2 || "—",
            sample3Steps: s3 || "—",
          });
        }
      }

      // Assert exact step counts for each of the 3 sample items:
      // Sample 1: T-7, T-3, T-1, OVERDUE, ESCALATION_L1, ESCALATION_L2, ESCALATION_L3 = 7 steps
      // Sample 2: T-30, T-15, T-7, T-1, OVERDUE, ESCALATION_L1, ESCALATION_L2, ESCALATION_L3 = 8 steps
      // Sample 3: T-30, T-15, T-7, T-1, OVERDUE, ESCALATION_L1, ESCALATION_L2, ESCALATION_L3 = 8 steps
      expect(dueItems.getFiredStepsForDueItem(sample1.id).length).toBe(7);
      expect(dueItems.getFiredStepsForDueItem(sample2.id).length).toBe(8);
      expect(dueItems.getFiredStepsForDueItem(sample3.id).length).toBe(8);

      const formattedTable = [
        "",
        "=== 180-DAY DEADLINE ENGINE SIMULATION: STEPS FIRED PER DAY (3 SAMPLE ITEMS) ===",
        "| Day | Date (IST) | SAMPLE-1 (PROCESSING_STAGE, Due D15) | SAMPLE-2 (UNDERTAKING, Due D60) | SAMPLE-3 (DOCUMENT_EXPIRY, Due D120) |",
        "| :--- | :--- | :--- | :--- | :--- |",
        ...tableRows.map(
          (r) =>
            `| Day ${String(r.day).padStart(3, " ")} | ${r.istDate} | ${r.sample1Steps.padEnd(36, " ")} | ${r.sample2Steps.padEnd(31, " ")} | ${r.sample3Steps.padEnd(36, " ")} |`,
        ),
        "",
      ].join("\n");

      // eslint-disable-next-line no-console
      console.log(formattedTable);
    });
  });
});

