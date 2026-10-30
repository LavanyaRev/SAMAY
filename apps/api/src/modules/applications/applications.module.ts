import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";

@Module({
  imports: [AuthModule, WorkflowModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
