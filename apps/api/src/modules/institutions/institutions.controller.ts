import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { InstitutionsService } from "./institutions.service";

@ApiTags("Institutions")
@Controller("institutions")
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get()
  @ApiOperation({ summary: "List all registered institutions" })
  @ApiResponse({ status: 200, description: "List of institutions" })
  listAll() {
    return this.institutionsService.listAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get institution profile by ID" })
  @ApiParam({ name: "id", description: "Institution UUID" })
  @ApiResponse({ status: 200, description: "Institution details" })
  getById(@Param("id") id: string) {
    return this.institutionsService.getById(id);
  }
}
