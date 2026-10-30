import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DeadlinesModule } from "../deadlines/deadlines.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { HeroFeaturesService } from "./hero-features.service";

@Module({
  imports: [AuditModule, DeadlinesModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService, HeroFeaturesService],
  exports: [AdminService, HeroFeaturesService],
})
export class AdminModule {}
