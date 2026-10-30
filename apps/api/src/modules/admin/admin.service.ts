import { Injectable } from "@nestjs/common";
import { UserRole } from "@samay/shared";
import {
  DemoClockState,
  SystemClockService,
} from "../../common/clock/clock.service";
import { AuditService } from "../audit/audit.service";
import { DueItemService } from "../deadlines/due-item.service";
import { WorkingDayCalendarService } from "../deadlines/working-day-calendar.service";

export const SYSTEM_CLOCK_ENTITY_ID = "00000000-0000-4000-8000-000000000001";

@Injectable()
export class AdminService {
  constructor(
    private readonly clock: SystemClockService,
    private readonly auditService: AuditService,
    private readonly calendar: WorkingDayCalendarService,
    private readonly dueItems: DueItemService,
  ) {}

  getConfig() {
    return {
      systemVersion: "0.1.0",
      // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
      aphCycle: "2026-2027-TODO(APH-VERIFY)",
      demoClock: this.clock.getDemoClockState(),
      weekendDays: this.calendar.getWeekendDays(),
      retrievedAt: this.clock.isoString(),
    };
  }

  getClockState(): DemoClockState {
    return this.clock.getDemoClockState();
  }

  async setClockOffset(
    offsetMs: number,
    actorId = "admin-user",
    reason = "Admin set demo clock offset",
  ) {
    const before = this.clock.getDemoClockState();
    const after = this.clock.setOffsetMs(offsetMs);
    const auditEntry = await this.auditService.appendEntry({
      entityType: "SYSTEM_CLOCK",
      entityId: SYSTEM_CLOCK_ENTITY_ID,
      action: "CLOCK_SET_OFFSET",
      actorId,
      actorRole: UserRole.ADMIN,
      previousState: {
        offsetMs: before.offsetMs,
        currentIso: before.currentIso,
      },
      newState: {
        offsetMs: after.offsetMs,
        currentIso: after.currentIso,
      },
      rationale: reason,
    });

    return {
      clockState: after,
      auditEntry,
    };
  }

  async advanceClock(
    params: { days?: number; hours?: number; reason?: string },
    actorId = "admin-user",
  ) {
    const before = this.clock.getDemoClockState();
    const after = this.clock.advanceBy({
      days: params.days,
      hours: params.hours,
    });
    const auditEntry = await this.auditService.appendEntry({
      entityType: "SYSTEM_CLOCK",
      entityId: SYSTEM_CLOCK_ENTITY_ID,
      action: "CLOCK_ADVANCE",
      actorId,
      actorRole: UserRole.ADMIN,
      previousState: {
        offsetMs: before.offsetMs,
        currentIso: before.currentIso,
      },
      newState: {
        offsetMs: after.offsetMs,
        currentIso: after.currentIso,
        advancedDays: params.days ?? 0,
        advancedHours: params.hours ?? 0,
      },
      rationale:
        params.reason ??
        `Advanced demo clock by ${params.days ?? 0}d ${params.hours ?? 0}h`,
    });

    return {
      clockState: after,
      auditEntry,
    };
  }

  async resetClock(actorId = "admin-user", reason = "Admin reset demo clock") {
    const before = this.clock.getDemoClockState();
    const after = this.clock.resetOffset();
    const auditEntry = await this.auditService.appendEntry({
      entityType: "SYSTEM_CLOCK",
      entityId: SYSTEM_CLOCK_ENTITY_ID,
      action: "CLOCK_RESET",
      actorId,
      actorRole: UserRole.ADMIN,
      previousState: {
        offsetMs: before.offsetMs,
        currentIso: before.currentIso,
      },
      newState: {
        offsetMs: after.offsetMs,
        currentIso: after.currentIso,
      },
      rationale: reason,
    });

    return {
      clockState: after,
      auditEntry,
    };
  }

  listHolidays(regionId?: string) {
    return this.calendar.listHolidays(regionId);
  }

  createHoliday(input: {
    date: string;
    name: string;
    description?: string;
    regionId?: string | null;
    isNational?: boolean;
  }) {
    return this.calendar.createHoliday(input);
  }

  updateHoliday(
    id: string,
    input: Partial<{
      date: string;
      name: string;
      description: string | null;
      regionId: string | null;
      isNational: boolean;
    }>,
  ) {
    return this.calendar.updateHoliday(id, input);
  }

  deleteHoliday(id: string) {
    return this.calendar.deleteHoliday(id);
  }

  runDeadlineSweep(batchSize?: number) {
    return this.dueItems.runSweep({ batchSize });
  }
}
