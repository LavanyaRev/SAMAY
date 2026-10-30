import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import {
  DocumentsService,
  DocumentTypeConfigItem,
  ExtractionResultExtension,
} from "./documents.service";

@ApiTags("Tracked Documents & Lease Monitoring")
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: "List all tracked documents across institutions" })
  listAll() {
    return this.documentsService.listDocuments();
  }

  @Get("types")
  @ApiOperation({ summary: "List configurable tracked document types" })
  listTypes() {
    return this.documentsService.listDocumentTypeConfigs();
  }

  @Post("types")
  @ApiOperation({ summary: "Add or update a configurable tracked document type" })
  upsertType(@Body() body: DocumentTypeConfigItem) {
    return this.documentsService.addDocumentTypeConfig(body);
  }

  @Get("radar")
  @ApiOperation({
    summary:
      "Expiry Radar: next 30, 60, and 90 days expiring documents grouped by region",
  })
  getExpiryRadar() {
    return this.documentsService.getExpiryRadar();
  }

  @Get("validity/:institutionId")
  @ApiOperation({
    summary:
      "Check validity of statutory documents (leases, FDRs, NOCs) for an institution",
  })
  @ApiParam({ name: "institutionId", description: "Institution UUID" })
  @ApiResponse({ status: 200, description: "Validity report" })
  checkValidity(@Param("institutionId") institutionId: string) {
    return this.documentsService.checkValidity(institutionId);
  }

  @Post()
  @ApiOperation({
    summary:
      "Register a TrackedDocument and create DOCUMENT_EXPIRY (90/60/30/15/7d) & DOCUMENT_RENEWAL DueItems",
  })
  createDocument(
    @Body()
    body: {
      institutionId: string;
      institutionName?: string;
      region?: string;
      type: string;
      reference: string;
      validFrom: string;
      expiryDate: string;
      fileId?: string;
      extractionResult?: ExtractionResultExtension | null;
    },
  ) {
    return this.documentsService.createTrackedDocument(body);
  }

  @Post(":id/renew")
  @ApiOperation({
    summary: "Institution submits a renewal version for a TrackedDocument",
  })
  submitRenewal(
    @Param("id") id: string,
    @Body()
    body: {
      newReference: string;
      newValidFrom: string;
      newExpiryDate: string;
      fileId: string;
      submittedByUserId: string;
      submittedByRole: string;
      remarks?: string;
    },
  ) {
    return this.documentsService.submitDocumentRenewal(id, body);
  }

  @Post(":id/verify-renewal")
  @ApiOperation({
    summary:
      "Officer verifies or rejects a document renewal; ACCEPT promotes new version, archives old version, and recalculates DueItems",
  })
  verifyRenewal(
    @Param("id") id: string,
    @Body()
    body: {
      decision: "ACCEPT" | "REJECT";
      actorUserId: string;
      actorRole: string;
      reason?: string;
    },
  ) {
    return this.documentsService.verifyDocumentRenewal(id, body);
  }

  @Post("import-csv")
  @ApiOperation({
    summary:
      "Bulk CSV import of TrackedDocuments with dry-run preview, row-level errors, and idempotency on repeat",
  })
  importCsv(@Body() body: { csvText: string; dryRun: boolean }) {
    return this.documentsService.importCsvTrackedDocuments(body.csvText, {
      dryRun: Boolean(body.dryRun),
    });
  }

  @Post("alerts/evaluate")
  @ApiOperation({
    summary:
      "Evaluate DOCUMENT_EXPIRY alerts on the Demo Clock (90, 60, 30, 15, 7 days)",
  })
  evaluateExpiryAlerts() {
    return this.documentsService.evaluateDocumentExpiryAlerts();
  }
}
