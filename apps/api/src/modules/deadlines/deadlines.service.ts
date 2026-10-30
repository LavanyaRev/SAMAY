import { Injectable } from "@nestjs/common";
import { SystemClockService } from "../../common/clock/clock.service";
import { DueItemService } from "./due-item.service";
import { WorkingDayCalendarService } from "./working-day-calendar.service";

@Injectable()
export class DeadlinesService {
  constructor(
    private readonly clock: SystemClockService,
    private readonly calendar: WorkingDayCalendarService,
    private readonly dueItems: DueItemService,
  ) {}

  getActiveDeadlines() {
    const all = this.dueItems.listDueItems();
    const active = all.filter((i) => i.status !== "CLOSED");
    const overdue = active.filter((i) => i.status === "OVERDUE");
    return {
      activeCount: active.length,
      overdueCount: overdue.length,
      items: active,
      demoClock: this.clock.getDemoClockState(),
      evaluatedAt: this.clock.isoString(),
    };
  }

  calculateDeadline(days: number, regionId?: string) {
    const targetDate = this.calendar.addWorkingDays(
      this.clock.now(),
      days,
      regionId,
    );
    return {
      inputWorkingDays: days,
      calculatedDate: targetDate.toISOString(),
      kolkataDate: this.calendar.toKolkataDateKey(targetDate),
      generatedAt: this.clock.isoString(),
    };
  }
}
