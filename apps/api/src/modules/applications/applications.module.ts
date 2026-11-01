import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { AuditModule } from "../audit/audit.module";
import { EvcModule } from "../evc/evc.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";

@Module({
  imports: [
    AuthModule,
    WorkflowModule,
    AuditModule,
    EvcModule,
    NotificationsModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
