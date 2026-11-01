import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UserRole } from "@samay/shared";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Audit")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUREAU_OFFICER, UserRole.ADMIN)
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("entity/:entityId")
  @ApiOperation({
    summary:
      "Get immutable hash-chained audit trail for an application or entity",
  })
  @ApiParam({ name: "entityId", description: "Target entity UUID" })
  @ApiResponse({ status: 200, description: "Audit trail records" })
  getTrail(@Param("entityId") entityId: string) {
    return this.auditService.getTrail(entityId);
  }

  @Get("verify/:applicationId")
  @ApiOperation({
    summary:
      "Recompute the SHA-256 hash chain for an application and report the first broken link if tampered",
  })
  @ApiParam({ name: "applicationId", description: "Application UUID" })
  @ApiResponse({
    status: 200,
    description:
      "Cryptographic verification report including valid status and firstBrokenLink details",
  })
  verifyChain(@Param("applicationId") applicationId: string) {
    return this.auditService.verifyChain(applicationId);
  }
}
