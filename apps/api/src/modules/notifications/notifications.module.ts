import { Module } from "@nestjs/common";
import { DeadlinesModule } from "../deadlines/deadlines.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { TemplateService } from "./template.service";
import { EscalationPolicyService } from "./escalation-policy.service";
import { ChannelsService, MockSmsGatewayAdapter } from "./channels.service";

@Module({
  imports: [DeadlinesModule],
  controllers: [NotificationsController],
  providers: [
    TemplateService,
    EscalationPolicyService,
    MockSmsGatewayAdapter,
    ChannelsService,
    NotificationsService,
  ],
  exports: [
    TemplateService,
    EscalationPolicyService,
    MockSmsGatewayAdapter,
    ChannelsService,
    NotificationsService,
  ],
})
export class NotificationsModule {}
