import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DeadlinesModule } from "../deadlines/deadlines.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [AuditModule, DeadlinesModule, NotificationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
