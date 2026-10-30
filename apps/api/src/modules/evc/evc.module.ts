import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DeadlinesModule } from "../deadlines/deadlines.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { EvcController } from "./evc.controller";
import { EvcService } from "./evc.service";
import { PanelProposalService } from "./panel-proposal.service";

@Module({
  imports: [AuditModule, DeadlinesModule, NotificationsModule],
  controllers: [EvcController],
  providers: [PanelProposalService, EvcService],
  exports: [PanelProposalService, EvcService],
})
export class EvcModule { }
