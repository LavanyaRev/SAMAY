import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { SystemClockService } from "../../common/clock/clock.service";
import { DeadlinesService } from "./deadlines.service";
import { DueItemService } from "./due-item.service";
import { WorkingDayCalendarService } from "./working-day-calendar.service";

@ApiTags("Deadlines")
@Controller("deadlines")
export class DeadlinesController {
  constructor(
    private readonly deadlinesService: DeadlinesService,
    private readonly clock: SystemClockService,
    private readonly calendar: WorkingDayCalendarService,
    private readonly dueItems: DueItemService,
  ) {}

  @Get("clock")
  @ApiOperation({
    summary:
      "Get current demo-clock state so the frontend can display a visible banner when active",
  })
  @ApiResponse({ status: 200, description: "Demo clock state" })
  getClockState() {
    return this.clock.getDemoClockState();
  }

  @Get("active")
  @ApiOperation({
    summary: "List all active regulatory deadlines and impending SLA breaches",
  })
  @ApiResponse({ status: 200, description: "Active deadlines list" })
  getActiveDeadlines() {
    return this.deadlinesService.getActiveDeadlines();
  }

  @Get("calculate/:days")
  @ApiOperation({
    summary:
      "Compute statutory working-day deadline in Asia/Kolkata timezone using injectable clock",
  })
  @ApiParam({ name: "days", description: "Number of working days" })
  @ApiResponse({ status: 200, description: "Target deadline timestamp" })
  calculateDeadline(
    @Param("days") days: string,
    @Query("regionId") regionId?: string,
  ) {
    return this.deadlinesService.calculateDeadline(
      parseInt(days, 10),
      regionId,
    );
  }

  @Post("sweep")
  @ApiOperation({
    summary: "Run deadline sweep on demand across active due items",
  })
  @ApiResponse({ status: 200, description: "Sweep execution report" })
  runSweep(@Body() body?: { batchSize?: number }) {
    return this.dueItems.runSweep({ batchSize: body?.batchSize });
  }

  @Get("holidays")
  @ApiOperation({
    summary: "List national and regional holidays in Asia/Kolkata calendar",
  })
  listHolidays(@Query("regionId") regionId?: string) {
    return this.calendar.listHolidays(regionId);
  }
}
