import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DeadlinesModule } from "../deadlines/deadlines.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UndertakingsController } from "./undertakings.controller";
import { UndertakingsService } from "./undertakings.service";

@Module({
  imports: [AuditModule, DeadlinesModule, NotificationsModule],
  controllers: [UndertakingsController],
  providers: [UndertakingsService],
  exports: [UndertakingsService],
})
export class UndertakingsModule {}
