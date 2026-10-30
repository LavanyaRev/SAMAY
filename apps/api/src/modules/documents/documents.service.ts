import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { STATUTORY_ADVISORY_LABEL, UserRole } from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";
import { AuditService } from "../audit/audit.service";
import { DueItemService } from "../deadlines/due-item.service";
import { DAY_MS } from "../deadlines/working-day-calendar.service";
import { NotificationsService } from "../notifications/notifications.service";

export type TrackedDocumentStatus =
  | "VALID"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "RENEWAL_SUBMITTED"
  | "RENEWAL_VERIFIED"
  | "RENEWAL_REJECTED";

export interface DocumentTypeConfigItem {
  code: string; // LEASE, LAND_DOCUMENT, OTHER, etc.
  label: string;
  expiryWarningDays: number[]; // Default: [90, 60, 30, 15, 7]
  requiresOfficerVerification: boolean;
}

export interface TrackedDocumentVersionEntry {
  versionNumber: number;
  reference: string;
  validFrom: string;
  expiryDate: string;
  fileId: string;
  archivedAt: string;
  verifiedBy: string | null;
}

export interface ExtractionResultExtension {
  confidenceScore?: number; // 0..1 extension point for ConfidenceBadge (no AI logic yet)
  extractedFields?: Record<string, string | number | null>;
  advisoryLabel: typeof STATUTORY_ADVISORY_LABEL;
}

export interface TrackedDocumentRecord {
  id: string;
  institutionId: string;
  institutionName: string;
  region: string;
  type: string; // LEASE, LAND_DOCUMENT, OTHER
  reference: string;
  validFrom: string;
  expiryDate: string;
  version: number;
  versionHistory: TrackedDocumentVersionEntry[];
  status: TrackedDocumentStatus;
  expiryDueItemId: string;
  renewalDueItemId: string;
  pendingRenewal: {
    reference: string;
    validFrom: string;
    expiryDate: string;
    fileId: string;
    submittedBy: string;
    submittedAt: string;
    remarks?: string;
  } | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  /**
   * Optional `extraction_result` JSON field as the extension point for the AI phase (no AI logic yet).
   */
  extractionResult: ExtractionResultExtension | null;
  createdAt: string;
  updatedAt: string;
}

export interface CsvImportRowError {
  rowNumber: number;
  rawLine: string;
  errors: string[];
}

export interface CsvBulkImportResult {
  dryRun: boolean;
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  createdCount: number;
  skippedIdempotentCount: number;
  rowErrors: CsvImportRowError[];
  previewValidRows: Array<{
    rowNumber: number;
    institutionId: string;
    institutionName: string;
    region: string;
    type: string;
    reference: string;
    validFrom: string;
    expiryDate: string;
    wouldSkipAsDuplicate: boolean;
  }>;
}

const DEFAULT_DOCUMENT_TYPES: DocumentTypeConfigItem[] = [
  {
    code: "LEASE",
    label: "Registered Land/Building Lease Deed",
    // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
    expiryWarningDays: [90, 60, 30, 15, 7],
    requiresOfficerVerification: true,
  },
  {
    code: "LAND_DOCUMENT",
    label: "Land Ownership Title & Non-Encumbrance Certificate",
    expiryWarningDays: [90, 60, 30, 15, 7],
    requiresOfficerVerification: true,
  },
  {
    code: "OTHER",
    label: "Other Statutory Validity Instrument (Fire NOC / FDR / Building Safety)",
    expiryWarningDays: [90, 60, 30, 15, 7],
    requiresOfficerVerification: true,
  },
];

@Injectable()
export class DocumentsService {
  private readonly documents = new Map<string, TrackedDocumentRecord>();
  private readonly idempotencyKeyMap = new Map<string, string>(); // `${institutionId}::${type}::${reference}` -> docId
  private readonly firedAlertKeys = new Set<string>();
  private documentTypes: DocumentTypeConfigItem[] = [
    ...DEFAULT_DOCUMENT_TYPES,
  ];

  constructor(
    private readonly clock: SystemClockService,
    private readonly dueItems: DueItemService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) { }

  resetAll(): void {
    this.documents.clear();
    this.idempotencyKeyMap.clear();
    this.firedAlertKeys.clear();
    this.documentTypes = [...DEFAULT_DOCUMENT_TYPES];
  }

  listDocumentTypeConfigs(): DocumentTypeConfigItem[] {
    return [...this.documentTypes];
  }

  addDocumentTypeConfig(config: DocumentTypeConfigItem): DocumentTypeConfigItem {
    const idx = this.documentTypes.findIndex((t) => t.code === config.code);
    if (idx >= 0) {
      this.documentTypes[idx] = config;
    } else {
      this.documentTypes.push(config);
    }
    return config;
  }

  /**
   * Registers a TrackedDocument and creates both `DOCUMENT_EXPIRY` (alerts at 90, 60, 30, 15, 7 days)
   * and `DOCUMENT_RENEWAL` DueItems.
   */
  async createTrackedDocument(input: {
    id?: string;
    institutionId: string;
    institutionName?: string;
    region?: string;
    type: string; // LEASE | LAND_DOCUMENT | OTHER
    reference: string;
    validFrom: string;
    expiryDate: string;
    fileId?: string;
    extractionResult?: ExtractionResultExtension | null;
    actorUserId?: string;
    actorRole?: string;
  }): Promise<{ document: TrackedDocumentRecord; created: boolean }> {
    const dedupKey = `${input.institutionId}::${input.type}::${input.reference}`;
    const existingId = this.idempotencyKeyMap.get(dedupKey);
    if (existingId && this.documents.has(existingId)) {
      return { document: this.documents.get(existingId)!, created: false };
    }

    const typeCfg = this.documentTypes.find((t) => t.code === input.type);
    if (!typeCfg) {
      throw new BadRequestException(
        `Unsupported document type "${input.type}". Configured types: ${this.documentTypes.map((t) => t.code).join(", ")}`,
      );
    }

    const validFromMs = this.clock.parseIso(input.validFrom).getTime();
    const expiryMs = this.clock.parseIso(input.expiryDate).getTime();
    if (Number.isNaN(validFromMs) || Number.isNaN(expiryMs) || expiryMs <= validFromMs) {
      throw new BadRequestException(
        "expiryDate must be a valid ISO date strictly after validFrom.",
      );
    }

    const docId = input.id ?? randomUUID();
    const nowIso = this.clock.isoString();
    const nowMs = this.clock.timestamp();
    const daysLeft = Math.ceil((expiryMs - nowMs) / DAY_MS);

    let initialStatus: TrackedDocumentStatus = "VALID";
    if (daysLeft <= 0) initialStatus = "EXPIRED";
    else if (daysLeft <= 90) initialStatus = "EXPIRING_SOON";

    // Create DOCUMENT_EXPIRY DueItem with [-90, -60, -30, -15, -7] warning offsets
    const expiryDueItem = await this.dueItems.createDueItem({
      label: `DOCUMENT_EXPIRY:${input.reference}`,
      kind: "DOCUMENT_EXPIRY",
      entityType: "TRACKED_DOCUMENT",
      entityId: docId,
      dueAt: this.clock.fromEpochMs(expiryMs),
      warningOffsets: typeCfg.expiryWarningDays.map((d) => -Math.abs(d)),
    });

    // Create DOCUMENT_RENEWAL DueItem due 15 days prior to expiryDate
    const renewalDueItem = await this.dueItems.createDueItem({
      label: `DOCUMENT_RENEWAL:${input.reference}`,
      kind: "DOCUMENT_RENEWAL",
      entityType: "TRACKED_DOCUMENT",
      entityId: docId,
      dueAt: this.clock.fromEpochMs(expiryMs - 15 * DAY_MS),
      warningOffsets: [-30, -15, -7, -1],
    });

    const record: TrackedDocumentRecord = {
      id: docId,
      institutionId: input.institutionId,
      institutionName:
        input.institutionName ?? "Walchand College of Engineering, Sangli",
      region: input.region ?? "WRO",
      type: input.type,
      reference: input.reference,
      validFrom: input.validFrom,
      expiryDate: input.expiryDate,
      version: 1,
      versionHistory: [],
      status: initialStatus,
      expiryDueItemId: expiryDueItem.id,
      renewalDueItemId: renewalDueItem.id,
      pendingRenewal: null,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
      extractionResult: input.extractionResult ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.documents.set(docId, record);
    this.idempotencyKeyMap.set(dedupKey, docId);

    return { document: record, created: true };
  }

  /**
   * Institution uploads a renewal version (`RENEWAL_SUBMITTED`).
   */
  async submitDocumentRenewal(
    documentId: string,
    input: {
      newReference: string;
      newValidFrom: string;
      newExpiryDate: string;
      fileId: string;
      submittedByUserId: string;
      submittedByRole: string;
      remarks?: string;
    },
  ): Promise<TrackedDocumentRecord> {
    const doc = this.getDocumentById(documentId);
    const nowIso = this.clock.isoString();

    doc.pendingRenewal = {
      reference: input.newReference,
      validFrom: input.newValidFrom,
      expiryDate: input.newExpiryDate,
      fileId: input.fileId,
      submittedBy: input.submittedByUserId,
      submittedAt: nowIso,
      remarks: input.remarks,
    };
    doc.status = "RENEWAL_SUBMITTED";
    doc.updatedAt = nowIso;

    // Pause DOCUMENT_RENEWAL DueItem while awaiting officer verification
    await this.dueItems.pauseDueItem(doc.renewalDueItemId);

    return doc;
  }

  /**
   * Officer verifies or rejects a submitted document renewal:
   * - Institutions cannot verify their own renewal (`ForbiddenException`).
   * - On `ACCEPT`: Archives current version into `versionHistory`, promotes new version to current,
   *   sets status to `RENEWAL_VERIFIED`, and recalculates `DOCUMENT_EXPIRY` & `DOCUMENT_RENEWAL` DueItems
   *   so the timeline resets for the new expiry date.
   */
  async verifyDocumentRenewal(
    documentId: string,
    input: {
      decision: "ACCEPT" | "REJECT";
      actorUserId: string;
      actorRole: string;
      reason?: string;
    },
  ): Promise<TrackedDocumentRecord> {
    if (input.actorRole === UserRole.INSTITUTION) {
      throw new ForbiddenException(
        "Statutory violation: Institutions cannot verify their own document renewals.",
      );
    }

    const doc = this.getDocumentById(documentId);
    if (!doc.pendingRenewal) {
      throw new BadRequestException(
        `TrackedDocument ${documentId} has no pending renewal submission.`,
      );
    }

    const nowIso = this.clock.isoString();

    if (input.decision === "REJECT") {
      if (!input.reason || input.reason.trim().length < 5) {
        throw new BadRequestException(
          "A mandatory reason is required when rejecting a document renewal.",
        );
      }
      doc.status = "RENEWAL_REJECTED";
      doc.rejectionReason = input.reason.trim();
      doc.updatedAt = nowIso;
      await this.dueItems.resumeDueItem(doc.renewalDueItemId);
      return doc;
    }

    // Archive current version in versionHistory
    doc.versionHistory.push({
      versionNumber: doc.version,
      reference: doc.reference,
      validFrom: doc.validFrom,
      expiryDate: doc.expiryDate,
      fileId: `file-v${doc.version}-${doc.id.slice(0, 6)}`,
      archivedAt: nowIso,
      verifiedBy: doc.verifiedBy,
    });

    // Promote pending renewal to current version
    const renewal = doc.pendingRenewal;
    doc.version += 1;
    doc.reference = renewal.reference;
    doc.validFrom = renewal.validFrom;
    doc.expiryDate = renewal.expiryDate;
    doc.pendingRenewal = null;
    doc.status = "RENEWAL_VERIFIED";
    doc.verifiedBy = input.actorUserId;
    doc.verifiedAt = nowIso;
    doc.rejectionReason = null;
    doc.updatedAt = nowIso;

    // Close old DueItems and create fresh recalculated DueItems for the new expiryDate
    await this.dueItems.closeDueItem(doc.expiryDueItemId);
    await this.dueItems.closeDueItem(doc.renewalDueItemId);

    const newExpiryMs = this.clock.parseIso(doc.expiryDate).getTime();
    const typeCfg =
      this.documentTypes.find((t) => t.code === doc.type) ??
      DEFAULT_DOCUMENT_TYPES[0];

    const newExpiryDueItem = await this.dueItems.createDueItem({
      label: `DOCUMENT_EXPIRY:${doc.reference}:v${doc.version}`,
      kind: "DOCUMENT_EXPIRY",
      entityType: "TRACKED_DOCUMENT",
      entityId: doc.id,
      dueAt: this.clock.fromEpochMs(newExpiryMs),
      warningOffsets: typeCfg.expiryWarningDays.map((d) => -Math.abs(d)),
    });

    const newRenewalDueItem = await this.dueItems.createDueItem({
      label: `DOCUMENT_RENEWAL:${doc.reference}:v${doc.version}`,
      kind: "DOCUMENT_RENEWAL",
      entityType: "TRACKED_DOCUMENT",
      entityId: doc.id,
      dueAt: this.clock.fromEpochMs(newExpiryMs - 15 * DAY_MS),
      warningOffsets: [-30, -15, -7, -1],
    });

    doc.expiryDueItemId = newExpiryDueItem.id;
    doc.renewalDueItemId = newRenewalDueItem.id;

    await this.audit.appendEntry({
      entityType: "TRACKED_DOCUMENT",
      entityId: doc.id,
      action: "DOCUMENT_RENEWAL_VERIFIED",
      actorId: input.actorUserId,
      actorRole: input.actorRole,
      previousState: {
        version: doc.version - 1,
        reference: doc.versionHistory[doc.versionHistory.length - 1]?.reference,
      },
      newState: {
        version: doc.version,
        reference: doc.reference,
        expiryDate: doc.expiryDate,
        status: doc.status,
      },
      rationale: input.reason ?? `Verified renewal v${doc.version} for ${doc.reference}.`,
    });

    return doc;
  }

  /**
   * Evaluates DOCUMENT_EXPIRY alerts on the Demo Clock at 90, 60, 30, 15, and 7 days,
   * updating document statuses (`VALID`, `EXPIRING_SOON`, `EXPIRED`) and dispatching notifications.
   */
  async evaluateDocumentExpiryAlerts(): Promise<{
    alertsFired: Array<{
      documentId: string;
      reference: string;
      thresholdDays: number;
      status: TrackedDocumentStatus;
      firedAt: string;
    }>;
  }> {
    await this.dueItems.runSweep();
    const nowMs = this.clock.timestamp();
    const nowIso = this.clock.isoString();
    const alertsFired: Array<{
      documentId: string;
      reference: string;
      thresholdDays: number;
      status: TrackedDocumentStatus;
      firedAt: string;
    }> = [];

    const thresholds = [90, 60, 30, 15, 7, 0];

    for (const doc of this.documents.values()) {
      const expiryMs = this.clock.parseIso(doc.expiryDate).getTime();
      const daysRemaining = Math.ceil((expiryMs - nowMs) / DAY_MS);

      if (
        doc.status !== "RENEWAL_SUBMITTED" &&
        doc.status !== "RENEWAL_REJECTED"
      ) {
        if (daysRemaining <= 0) {
          doc.status = "EXPIRED";
        } else if (daysRemaining <= 90) {
          doc.status = "EXPIRING_SOON";
        } else if (doc.status !== "RENEWAL_VERIFIED") {
          doc.status = "VALID";
        }
      }

      for (const th of thresholds) {
        if (daysRemaining <= th) {
          const alertKey = `DOC:${doc.id}:VER:${doc.version}:EXPIRY_T_${th}`;
          if (this.firedAlertKeys.has(alertKey)) continue;
          this.firedAlertKeys.add(alertKey);

          alertsFired.push({
            documentId: doc.id,
            reference: doc.reference,
            thresholdDays: th,
            status: doc.status,
            firedAt: nowIso,
          });

          this.notifications.enqueueOutboxEvent({
            eventKey: alertKey,
            dueItemId: doc.expiryDueItemId,
            kind: "DOCUMENT_EXPIRY",
            escalationLevel: th === 0 ? 1 : 0,
            applicationId: doc.reference,
            institution: doc.institutionName,
            dueDate: doc.expiryDate.slice(0, 10),
            daysRemaining,
            actionLink: `/documents?documentId=${doc.id}`,
          });
        }
      }
    }

    if (alertsFired.length > 0) {
      await this.notifications.processOutboxEvents();
    }

    return { alertsFired };
  }

  /**
   * CSV Bulk Import with dry-run preview, row-level errors, and idempotent repeat.
   * Expected header: `institution_id,institution_name,region,type,reference,valid_from,expiry_date`
   */
  async importCsvTrackedDocuments(
    csvText: string,
    options: { dryRun: boolean },
  ): Promise<CsvBulkImportResult> {
    const rawLines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) {
      return {
        dryRun: options.dryRun,
        totalRows: 0,
        validRowsCount: 0,
        errorRowsCount: 0,
        createdCount: 0,
        skippedIdempotentCount: 0,
        rowErrors: [],
        previewValidRows: [],
      };
    }

    const hasHeader = rawLines[0].toLowerCase().includes("institution_id");
    const dataLines = hasHeader ? rawLines.slice(1) : rawLines;

    const rowErrors: CsvImportRowError[] = [];
    const previewValidRows: CsvBulkImportResult["previewValidRows"] = [];
    let createdCount = 0;
    let skippedIdempotentCount = 0;

    const validTypes = new Set(this.documentTypes.map((t) => t.code));

    for (let i = 0; i < dataLines.length; i++) {
      const rowNumber = hasHeader ? i + 2 : i + 1;
      const line = dataLines[i];
      const cols = line.split(",").map((c) => c.trim());

      const errors: string[] = [];
      if (cols.length < 7) {
        errors.push(
          `Expected 7 columns (institution_id,institution_name,region,type,reference,valid_from,expiry_date), found ${cols.length}.`,
        );
      } else {
        const [
          institutionId,
          institutionName,
          region,
          type,
          reference,
          validFrom,
          expiryDate,
        ] = cols;

        if (!institutionId) errors.push("institution_id is required.");
        if (!institutionName) errors.push("institution_name is required.");
        if (!region) errors.push("region is required.");
        if (!validTypes.has(type)) {
          errors.push(
            `Invalid document type "${type}". Must be one of: ${Array.from(validTypes).join(", ")}.`,
          );
        }
        if (!reference) errors.push("reference is required.");

        const vfMs = this.clock.parseIso(validFrom).getTime();
        const exMs = this.clock.parseIso(expiryDate).getTime();
        if (Number.isNaN(vfMs)) {
          errors.push(`valid_from "${validFrom}" is not a valid ISO date.`);
        }
        if (Number.isNaN(exMs)) {
          errors.push(`expiry_date "${expiryDate}" is not a valid ISO date.`);
        }
        if (!Number.isNaN(vfMs) && !Number.isNaN(exMs) && exMs <= vfMs) {
          errors.push("expiry_date must be strictly after valid_from.");
        }

        if (errors.length === 0) {
          const dedupKey = `${institutionId}::${type}::${reference}`;
          const alreadyExists = this.idempotencyKeyMap.has(dedupKey);

          previewValidRows.push({
            rowNumber,
            institutionId,
            institutionName,
            region,
            type,
            reference,
            validFrom,
            expiryDate,
            wouldSkipAsDuplicate: alreadyExists,
          });

          if (!options.dryRun) {
            const res = await this.createTrackedDocument({
              institutionId,
              institutionName,
              region,
              type,
              reference,
              validFrom,
              expiryDate,
            });
            if (res.created) {
              createdCount++;
            } else {
              skippedIdempotentCount++;
            }
          } else if (alreadyExists) {
            skippedIdempotentCount++;
          }
        }
      }

      if (errors.length > 0) {
        rowErrors.push({
          rowNumber,
          rawLine: line,
          errors,
        });
      }
    }

    return {
      dryRun: options.dryRun,
      totalRows: dataLines.length,
      validRowsCount: previewValidRows.length,
      errorRowsCount: rowErrors.length,
      createdCount,
      skippedIdempotentCount,
      rowErrors,
      previewValidRows,
    };
  }

  /**
   * Expiry Radar: aggregates documents expiring in the next 30, 60, and 90 days by region.
   */
  getExpiryRadar() {
    const nowMs = this.clock.timestamp();
    const regions = ["WRO", "NRO", "SRO", "ERO", "NWRO", "CRO"];
    const byRegion: Record<
      string,
      {
        region: string;
        expired: number;
        within30Days: number;
        within60Days: number;
        within90Days: number;
        validBeyond90Days: number;
      }
    > = {};

    for (const r of regions) {
      byRegion[r] = {
        region: r,
        expired: 0,
        within30Days: 0,
        within60Days: 0,
        within90Days: 0,
        validBeyond90Days: 0,
      };
    }

    for (const doc of this.documents.values()) {
      const r = byRegion[doc.region] ?? {
        region: doc.region,
        expired: 0,
        within30Days: 0,
        within60Days: 0,
        within90Days: 0,
        validBeyond90Days: 0,
      };
      byRegion[doc.region] = r;

      const expiryMs = this.clock.parseIso(doc.expiryDate).getTime();
      const daysLeft = Math.ceil((expiryMs - nowMs) / DAY_MS);

      if (daysLeft <= 0) r.expired++;
      else if (daysLeft <= 30) r.within30Days++;
      else if (daysLeft <= 60) r.within60Days++;
      else if (daysLeft <= 90) r.within90Days++;
      else r.validBeyond90Days++;
    }

    return {
      evaluatedAt: this.clock.isoString(),
      regions: Object.values(byRegion),
    };
  }

  listDocuments(): TrackedDocumentRecord[] {
    return Array.from(this.documents.values());
  }

  getDocumentById(id: string): TrackedDocumentRecord {
    const found = this.documents.get(id);
    if (!found) {
      throw new NotFoundException(`TrackedDocument ${id} not found`);
    }
    return found;
  }

  /**
   * Backward-compatible method
   */
  checkValidity(institutionId: string) {
    const docs = this.listDocuments().filter(
      (d) => d.institutionId === institutionId,
    );
    return {
      institutionId,
      evaluationTimestamp: this.clock.isoString(),
      documents: docs,
      recommendationLabel: STATUTORY_ADVISORY_LABEL,
    };
  }
}
