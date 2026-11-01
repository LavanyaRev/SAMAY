import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";

@ApiTags("Reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("compliance/:applicationId")
  @ApiOperation({
    summary: "Generate statutory compliance and deficiency report",
  })
  @ApiParam({ name: "applicationId", description: "Application UUID" })
  @ApiResponse({ status: 200, description: "Statutory compliance report" })
  generateComplianceReport(@Param("applicationId") applicationId: string) {
    return this.reportsService.generateComplianceReport(applicationId);
  }
}
