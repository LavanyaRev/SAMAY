import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DeadlinesController } from "./deadlines.controller";
import { DeadlinesService } from "./deadlines.service";
import { DueItemService } from "./due-item.service";
import { WorkingDayCalendarService } from "./working-day-calendar.service";

@Module({
  imports: [AuditModule],
  controllers: [DeadlinesController],
  providers: [WorkingDayCalendarService, DueItemService, DeadlinesService],
  exports: [WorkingDayCalendarService, DueItemService, DeadlinesService],
})
export class DeadlinesModule {}
