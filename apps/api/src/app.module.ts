import { Module } from "@nestjs/common";
import { ClockModule } from "./common/clock/clock.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { InstitutionsModule } from "./modules/institutions/institutions.module";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { DeadlinesModule } from "./modules/deadlines/deadlines.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { EvcModule } from "./modules/evc/evc.module";
import { UndertakingsModule } from "./modules/undertakings/undertakings.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { DashboardsModule } from "./modules/dashboards/dashboards.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AphRagModule } from "./rag/aph-rag.module";

@Module({
  imports: [
    ClockModule,
    PrismaModule,
    AuthModule,
    InstitutionsModule,
    ApplicationsModule,
    WorkflowModule,
    DeadlinesModule,
    NotificationsModule,
    EvcModule,
    UndertakingsModule,
    DocumentsModule,
    DashboardsModule,
    ReportsModule,
    AuditModule,
    AdminModule,
    AphRagModule,
  ],
})
export class AppModule {}
