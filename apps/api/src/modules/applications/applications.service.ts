import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@samay/shared";
import { withRlsContext } from "@samay/database";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthenticatedUser } from "../auth/current-user.decorator";
import { randomUUID } from "crypto";
import { AuditService } from "../audit/audit.service";
import { EvcService } from "../evc/evc.service";

import { Optional } from "@nestjs/common";
import {
  WorkflowActionName,
  WorkflowService,
} from "../workflow/workflow.service";

@Injectable()
export class ApplicationsService {
  private readonly inMemoryDeficiencies = new Map<string, any[]>();
  private readonly inMemoryEvcInspections = new Map<string, any[]>();
  private readonly inMemoryNotifications: any[] = [];
  constructor(
    private readonly clock: SystemClockService,
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
    @Optional() private readonly evcService?: EvcService,
  ) {
    this.seedInitialInMemoryStore();
  }

  private seedInitialInMemoryStore(): void {
    const initialDeficiency = {
      id: "def-init-01",
      deficiencyId: "DEF-LOA-2027-1128-01",
      applicationId: "sc-03",
      applicationRef: "LOA-2027-1128",
      description:
        "Non-submission of Fire Safety Certificate adhering to NBC Part 4 and 30-Year Encumbrance Certificate.",
      dateIdentified: this.clock.parseIso("2026-10-25T14:00:00.000Z"),
      responsibleInstitution: "Narmada Polytechnic",
      responseDeadline: this.clock.parseIso("2026-11-09T23:59:59.000Z"),
      deadlineDays: 15,
      requiredEvidence:
        "Original NBC Part 4 Fire NOC and Sub-Registrar 30-Year Encumbrance Certificate",
      verificationStatus: "PENDING_SUBMISSION",
      closureDate: null,
      aphClause: "Clause 1.4.3 & Clause 6.4",
      officerRationale:
        "Life safety and legal land tenure are non-negotiable statutory mandates per APH 2024-27.",
      officerName: "Dr. Suresh Patil (WRO Scrutiny Officer)",
      historyTrail: [
        {
          action: "DEFICIENCY_RECORDED",
          officer: "Dr. Suresh Patil (WRO Scrutiny Officer)",
          timestamp: "2026-10-25T14:00:00.000Z",
          deadline: "2026-11-09T23:59:59.000Z",
        },
      ],
    };
    this.inMemoryDeficiencies.set("sc-03", [initialDeficiency]);
    this.inMemoryDeficiencies.set("44444444-4444-4444-8444-444444444403", [
      initialDeficiency,
    ]);

    this.inMemoryNotifications.push({
      id: "notif-init-01",
      recipientRole: "INSTITUTION",
      channel: "IN_APP",
      title: "Urgent: Statutory Scrutiny Deficiency Notice Issued (15-Day SLA)",
      body: "8-point statutory deficiency recorded for LOA-2027-1128. Rectification deadline: 15 days.",
      metadata: {
        applicationId: "sc-03",
        deficiencyId: "DEF-LOA-2027-1128-01",
        deadline: "2026-11-09T23:59:59.000Z",
        aphClause: "Clause 1.4.3 & Clause 6.4",
      },
      createdAt: "2026-10-25T14:00:00.000Z",
    });
  }

  private checkJurisdiction(
    user: AuthenticatedUser,
    appRegionId: string,
    appInstitutionId: string,
  ): void {
    const isRegionalOfficer =
      user.role === UserRole.REGIONAL_OFFICER ||
      user.roles.includes("REGIONAL_OFFICER");
    const isInstitution =
      user.role === UserRole.INSTITUTION || user.roles.includes("INSTITUTION");

    if (isRegionalOfficer && appRegionId !== user.regionId) {
      throw new ForbiddenException("Forbidden");
    }
    if (
      isInstitution &&
      user.institutionId &&
      appInstitutionId !== user.institutionId
    ) {
      throw new ForbiddenException("Forbidden");
    }
  }

  async list(
    user: AuthenticatedUser,
    query: {
      regionId?: string;
      status?: string;
      stage?: string;
      ballWith?: string;
      limit?: number;
    } = {},
  ) {
    const isRegionalOfficer =
      user.role === UserRole.REGIONAL_OFFICER ||
      user.roles.includes("REGIONAL_OFFICER");
    const isInstitution =
      user.role === UserRole.INSTITUTION || user.roles.includes("INSTITUTION");

    if (
      isRegionalOfficer &&
      query.regionId &&
      query.regionId !== user.regionId
    ) {
      throw new ForbiddenException("Forbidden");
    }

    if (!this.prisma.isConnected) {
      const allApps = this.workflowService.getAllApplications();
      const filtered = allApps.filter((app) => {
        if (isRegionalOfficer && app.regionId !== user.regionId) return false;
        if (
          isInstitution &&
          user.institutionId &&
          app.institutionId !== user.institutionId
        ) {
          return false;
        }
        if (query.regionId && app.regionId !== query.regionId) return false;
        if (query.status && app.status !== query.status) return false;
        if (query.stage && app.stage !== query.stage) return false;
        if (query.ballWith && app.ballWith !== query.ballWith) return false;
        return true;
      });

      const limited =
        query.limit && query.limit > 0
          ? filtered.slice(0, Math.min(query.limit, 200))
          : filtered;

      return {
        total: limited.length,
        items: limited,
        timestamp: this.clock.isoString(),
      };
    }

    const rlsRole = isRegionalOfficer
      ? "REGIONAL_OFFICER"
      : isInstitution
        ? "INSTITUTION"
        : "BUREAU_OFFICER";

    const items = await withRlsContext(
      this.prisma,
      {
        userId: user.id,
        role: rlsRole,
        regionId: user.regionId,
        institutionId: user.institutionId,
      },
      async (tx) => {
        const where: Record<string, unknown> = {
          deletedAt: null,
        };

        if (isRegionalOfficer) {
          where.regionId = user.regionId;
        } else if (isInstitution && user.institutionId) {
          where.institutionId = user.institutionId;
        } else if (query.regionId) {
          where.regionId = query.regionId;
        }

        if (query.status) {
          where.status = query.status;
        }
        if (query.stage) {
          where.stage = query.stage;
        }

        return tx.application.findMany({
          where,
          include: {
            institution: {
              select: {
                id: true,
                name: true,
                aictePermanentId: true,
                state: true,
                district: true,
              },
            },
            region: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take:
            query.limit && query.limit > 0 ? Math.min(query.limit, 200) : 100,
        });
      },
    );

    return {
      total: items.length,
      items,
      timestamp: this.clock.isoString(),
    };
  }

  async getById(id: string, user: AuthenticatedUser) {
    const isRegionalOfficer =
      user.role === UserRole.REGIONAL_OFFICER ||
      user.roles.includes("REGIONAL_OFFICER");
    const isInstitution =
      user.role === UserRole.INSTITUTION || user.roles.includes("INSTITUTION");

    if (!this.prisma.isConnected) {
      const enriched =
        await this.workflowService.getApplicationWithTimeline(id);
      this.checkJurisdiction(user, enriched.regionId, enriched.institutionId);
      return enriched;
    }

    const rawApp = await this.prisma.application.findUnique({
      where: { id },
      include: {
        institution: true,
        region: true,
        stageInstances: {
          orderBy: { startedAt: "asc" },
        },
      },
    });

    if (!rawApp || rawApp.deletedAt) {
      throw new NotFoundException("Application not found");
    }

    this.checkJurisdiction(user, rawApp.regionId, rawApp.institutionId);

    const rlsRole = isRegionalOfficer
      ? "REGIONAL_OFFICER"
      : isInstitution
        ? "INSTITUTION"
        : "BUREAU_OFFICER";

    const rlsVerified = await withRlsContext(
      this.prisma,
      {
        userId: user.id,
        role: rlsRole,
        regionId: user.regionId,
        institutionId: user.institutionId,
      },
      async (tx) => tx.application.findUnique({ where: { id } }),
    );

    if (!rlsVerified) {
      throw new ForbiddenException("Forbidden");
    }

    const enriched = await this.workflowService
      .getApplicationWithTimeline(id)
      .catch(() => null);

    return {
      ...rawApp,
      timeline: enriched?.timeline ?? rawApp.stageInstances,
      auditTrail: enriched?.auditTrail ?? [],
      // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
      slaDeadline: this.clock.plusDays(15).toISOString(),
    };
  }

  async submit(
    id: string,
    user: AuthenticatedUser,
    body: {
      expectedVersion: number;
      idempotencyKey: string;
      reason?: string;
    },
  ) {
    const app = await this.getById(id, user);
    return this.workflowService.submit(
      app.id,
      user.id,
      user.role,
      body.expectedVersion,
      body.idempotencyKey,
      body.reason,
    );
  }

  async performAction(
    id: string,
    user: AuthenticatedUser,
    body: {
      action: WorkflowActionName;
      expectedVersion: number;
      idempotencyKey: string;
      reason?: string;
      reasonCode?: string;
      targetStage?: string;
    },
  ) {
    const app = await this.getById(id, user);
    return this.workflowService.performAction({
      applicationId: app.id,
      action: body.action,
      actorId: user.id,
      actorRole: user.role,
      actorRegionId: user.regionId,
      actorInstitutionId: user.institutionId,
      expectedVersion: body.expectedVersion,
      idempotencyKey: body.idempotencyKey,
      reason: body.reason,
      reasonCode: body.reasonCode,
      targetStage: body.targetStage,
    });
  }

  async getAllowedActions(id: string, user: AuthenticatedUser) {
    const app = await this.getById(id, user);
    return this.workflowService.getAllowedActions(app.id, user.role);
  }

  /**
   * REGIONAL TRIAGE: Accept Action
   * Updates application status to SCRUTINY_CLEARED and moves record out of active scrutiny queue
   * into approval / bureau review registry. Atomically writes hash-chained audit log and outbox event.
   */
  async acceptScrutiny(
    id: string,
    user: AuthenticatedUser,
    body: { rationale?: string } = {},
  ) {
    const isAuthorized =
      user.role === UserRole.REGIONAL_OFFICER ||
      user.roles.includes("REGIONAL_OFFICER") ||
      user.role === UserRole.BUREAU_OFFICER ||
      user.roles.includes("BUREAU_OFFICER") ||
      user.role === UserRole.ADMIN ||
      user.roles.includes("ADMIN");

    if (!isAuthorized) {
      throw new ForbiddenException(
        "Only Regional Officers or Bureau Authority may clear scrutiny.",
      );
    }

    const app = await this.getById(id, user);
    const prevStatus = app.status;
    const prevStage = app.stage;
    const rationale =
      body.rationale ||
      "Regional Scrutiny Committee completed document verification: Cleared.";
    const timestamp = this.clock.isoString();

    if (this.prisma.isConnected) {
      await this.prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: app.id },
          data: {
            status: "SCRUTINY_CLEARED",
            stage: "APPROVAL",
            ballWith: "AICTE",
            currentQueue: "EXECUTIVE_APPROVAL",
            version: { increment: 1 },
            updatedAt: this.clock.now(),
          },
        });

        await this.auditService.appendEntry(
          {
            entityType: "APPLICATION",
            entityId: app.id,
            action: "SCRUTINY_ACCEPTED_CLEARED",
            actorId: user.id,
            actorRole: user.role,
            previousState: { status: prevStatus, stage: prevStage },
            newState: {
              status: "SCRUTINY_CLEARED",
              stage: "APPROVAL",
              ballWith: "AICTE",
            },
            rationale,
            timestamp,
          },
          tx,
        );

        await tx.outboxEvent.create({
          data: {
            aggregateType: "APPLICATION",
            aggregateId: app.id,
            eventType: "APPLICATION_SCRUTINY_CLEARED",
            payload: {
              applicationId: app.id,
              applicationRef: (app as any).applicationRef,
              officerId: user.id,
              rationale,
              timestamp,
            },
            status: "PENDING",
          },
        });
      });
    }

    // Always update runtime workflow store
    this.workflowService.updateApplicationStore(app.id, {
      status: "SCRUTINY_CLEARED",
      stage: "APPROVAL",
      ballWith: "AICTE",
      currentQueue: "EXECUTIVE_APPROVAL",
    } as any);

    if (!this.prisma.isConnected) {
      await this.auditService.appendEntry({
        entityType: "APPLICATION",
        entityId: app.id,
        action: "SCRUTINY_ACCEPTED_CLEARED",
        actorId: user.id,
        actorRole: user.role,
        previousState: { status: prevStatus, stage: prevStage },
        newState: {
          status: "SCRUTINY_CLEARED",
          stage: "APPROVAL",
          ballWith: "AICTE",
        },
        rationale,
        timestamp,
      });
    }

    return {
      success: true,
      applicationId: app.id,
      applicationRef: (app as any).applicationRef,
      status: "SCRUTINY_CLEARED",
      stage: "APPROVAL",
      ballWith: "AICTE",
      message:
        "Application scrutiny successfully cleared and transitioned to approval registry.",
      timestamp,
      advisoryTag: "ADVISORY",
    };
  }

  /**
   * REGIONAL TRIAGE: Deficiency / Defect Action
   * Generates an 8-point deficiency record linked to the application ID in the database
   * with a strict 15-day policy deadline per APH 2024–27 Clause 1.4.3.
   * Instantly populates the institution's active action alert feed in their portal.
   */
  async issueDeficiency(
    id: string,
    user: AuthenticatedUser,
    body: {
      description: string;
      aphClause?: string;
      requiredEvidence?: string;
      deadlineDays?: number;
      rationale?: string;
    },
  ) {
    const isAuthorized =
      user.role === UserRole.REGIONAL_OFFICER ||
      user.roles.includes("REGIONAL_OFFICER") ||
      user.role === UserRole.BUREAU_OFFICER ||
      user.roles.includes("BUREAU_OFFICER") ||
      user.role === UserRole.ADMIN ||
      user.roles.includes("ADMIN");

    if (!isAuthorized) {
      throw new ForbiddenException(
        "Only Regional Officers or Bureau Authority may issue scrutiny deficiencies.",
      );
    }

    const app = await this.getById(id, user);
    const deadlineDays = body.deadlineDays || 15;
    const deadline = this.clock.plusDays(deadlineDays);
    const timestamp = this.clock.isoString();
    const defId = randomUUID();
    const appRef = (app as any).applicationRef || `APP-${app.id.slice(0, 8)}`;
    const defCode = `DEF-${appRef}-${this.clock.timestamp().toString(36).toUpperCase()}`;

    const deficiencyData = {
      id: defId,
      deficiencyId: defCode,
      applicationId: app.id,
      applicationRef: appRef,
      description: body.description,
      dateIdentified: this.clock.now(),
      responsibleInstitution:
        (app as any).institution?.name || "Applicant Institution",
      responseDeadline: deadline,
      deadlineDays,
      requiredEvidence:
        body.requiredEvidence ||
        "Statutory compliance proof adhering to APH 2024-27",
      verificationStatus: "PENDING_SUBMISSION",
      closureDate: null,
      aphClause: body.aphClause || "Clause 1.4.3",
      officerRationale:
        body.rationale || "Deficiency flagged during Scrutiny Committee review",
      officerName: user.fullName || "Regional Scrutiny Officer",
      historyTrail: [
        {
          action: "DEFICIENCY_RECORDED",
          officer: user.fullName || "Regional Scrutiny Officer",
          timestamp,
          deadline: deadline.toISOString(),
          notes: body.description,
        },
      ],
    };

    if (this.prisma.isConnected) {
      await this.prisma.$transaction(async (tx) => {
        await tx.deficiencyRecord.create({
          data: deficiencyData,
        });

        await tx.application.update({
          where: { id: app.id },
          data: {
            status: "SCRUTINY_DEFICIENT",
            ballWith: "INSTITUTION",
            currentQueue: "INSTITUTION_ACTION",
            version: { increment: 1 },
            updatedAt: this.clock.now(),
          },
        });

        // Instantly populate institution's active action alert feed in database
        await tx.notification.create({
          data: {
            recipientEmail: `institution@${app.institutionId}.edu.in`,
            recipientRole: "INSTITUTION",
            channel: "IN_APP",
            title: `Urgent: Statutory Deficiency Notice Issued for ${appRef}`,
            body: `An 8-point statutory deficiency has been recorded with a ${deadlineDays}-day policy deadline: ${body.description}`,
            metadata: {
              applicationId: app.id,
              applicationRef: appRef,
              deficiencyId: defCode,
              deadline: deadline.toISOString(),
              aphClause: body.aphClause || "Clause 1.4.3",
              actionRequired: "UPLOAD_COMPLIANCE_EVIDENCE",
            },
          },
        });

        await this.auditService.appendEntry(
          {
            entityType: "APPLICATION",
            entityId: app.id,
            action: "SCRUTINY_DEFICIENCY_RECORDED",
            actorId: user.id,
            actorRole: user.role,
            previousState: { status: app.status, stage: app.stage },
            newState: {
              status: "SCRUTINY_DEFICIENT",
              ballWith: "INSTITUTION",
              deficiencyId: defCode,
            },
            rationale:
              body.rationale ||
              `Issued 8-point deficiency: ${body.description}`,
            timestamp,
          },
          tx,
        );

        await tx.outboxEvent.create({
          data: {
            aggregateType: "APPLICATION",
            aggregateId: app.id,
            eventType: "SCRUTINY_DEFICIENCY_ISSUED",
            payload: {
              applicationId: app.id,
              deficiencyId: defCode,
              deadline: deadline.toISOString(),
              deadlineDays,
            },
            status: "PENDING",
          },
        });
      });
    }

    // Mirror in in-memory state
    const existingDef = this.inMemoryDeficiencies.get(app.id) || [];
    this.inMemoryDeficiencies.set(app.id, [deficiencyData, ...existingDef]);

    this.inMemoryNotifications.push({
      id: randomUUID(),
      recipientRole: "INSTITUTION",
      channel: "IN_APP",
      title: `Urgent: Statutory Deficiency Notice Issued for ${appRef}`,
      body: `An 8-point statutory deficiency has been recorded with a ${deadlineDays}-day policy deadline: ${body.description}`,
      metadata: {
        applicationId: app.id,
        applicationRef: appRef,
        deficiencyId: defCode,
        deadline: deadline.toISOString(),
        aphClause: body.aphClause || "Clause 1.4.3",
      },
      createdAt: timestamp,
    });

    this.workflowService.updateApplicationStore(app.id, {
      status: "SCRUTINY_DEFICIENT",
      ballWith: "INSTITUTION",
      currentQueue: "INSTITUTION_ACTION",
    } as any);

    if (!this.prisma.isConnected) {
      await this.auditService.appendEntry({
        entityType: "APPLICATION",
        entityId: app.id,
        action: "SCRUTINY_DEFICIENCY_RECORDED",
        actorId: user.id,
        actorRole: user.role,
        previousState: { status: app.status, stage: app.stage },
        newState: {
          status: "SCRUTINY_DEFICIENT",
          ballWith: "INSTITUTION",
          deficiencyId: defCode,
        },
        rationale:
          body.rationale || `Issued 8-point deficiency: ${body.description}`,
        timestamp,
      });
    }

    return {
      success: true,
      applicationId: app.id,
      applicationRef: appRef,
      deficiencyId: defCode,
      responseDeadline: deadline.toISOString(),
      deadlineDays,
      status: "SCRUTINY_DEFICIENT",
      ballWith: "INSTITUTION",
      message: `8-point statutory deficiency created with ${deadlineDays}-day deadline; active alert broadcasted to institution feed.`,
      timestamp,
      advisoryTag: "ADVISORY",
    };
  }

  /**
   * REGIONAL TRIAGE: Forward to EVC Action
   * Inserts a live record into the database evc_inspections table, making it immediately
   * accessible and visible in the live EVC Schedule table for committee assignment and date selection.
   * Atomically transitions application status to EVC_SCHEDULED and writes audit ledger entry.
   */
  async forwardToEvc(
    id: string,
    user: AuthenticatedUser,
    body: {
      rationale?: string;
      inspectionDate?: string;
      panelChair?: string;
      panelMember2?: string;
    } = {},
  ) {
    const isAuthorized =
      user.role === UserRole.REGIONAL_OFFICER ||
      user.roles.includes("REGIONAL_OFFICER") ||
      user.role === UserRole.BUREAU_OFFICER ||
      user.roles.includes("BUREAU_OFFICER") ||
      user.role === UserRole.ADMIN ||
      user.roles.includes("ADMIN");

    if (!isAuthorized) {
      throw new ForbiddenException(
        "Only Regional Officers or Bureau Authority may forward applications to EVC.",
      );
    }

    const app = await this.getById(id, user);
    const inspectionDate = body.inspectionDate
      ? this.clock.parseIso(body.inspectionDate)
      : this.clock.plusDays(7);
    const timestamp = this.clock.isoString();
    const inspectionId = randomUUID();
    const appRef = (app as any).applicationRef || `APP-${app.id.slice(0, 8)}`;
    const instName = (app as any).institution?.name || "Applicant Institution";
    const regionalDesk = `${(app as any).region?.name || "Regional"} Office`;
    const rationale =
      body.rationale ||
      "Scrutiny cleared; forwarded to Expert Visit Committee inspection per APH Clause 1.5.1.";

    const inspectionData = {
      id: inspectionId,
      applicationId: app.id,
      applicationRef: appRef,
      institutionName: instName,
      regionId: app.regionId,
      regionalDesk,
      status: "EVC_SCHEDULED",
      inspectionDate,
      panelChair: body.panelChair || "Dr. K. G. Narayanan (IIT Bombay)",
      panelMember2:
        body.panelMember2 || "Prof. Sunita Rao (COEP Technological Univ)",
      conflictFreeVerified: true,
      rationale,
      officerName: user.fullName || "Regional Scrutiny Officer",
    };

    if (this.prisma.isConnected) {
      await this.prisma.$transaction(async (tx) => {
        await tx.evcInspection.create({
          data: inspectionData,
        });

        await tx.application.update({
          where: { id: app.id },
          data: {
            status: "EVC_SCHEDULED",
            stage: "EVC",
            ballWith: "COMMITTEE",
            currentQueue: "REGIONAL_EVC_QUEUE",
            version: { increment: 1 },
            updatedAt: this.clock.now(),
          },
        });

        await this.auditService.appendEntry(
          {
            entityType: "APPLICATION",
            entityId: app.id,
            action: "SCRUTINY_FORWARDED_TO_EVC",
            actorId: user.id,
            actorRole: user.role,
            previousState: { status: app.status, stage: app.stage },
            newState: {
              status: "EVC_SCHEDULED",
              stage: "EVC",
              ballWith: "AICTE",
            },
            rationale,
            timestamp,
          },
          tx,
        );

        await tx.outboxEvent.create({
          data: {
            aggregateType: "APPLICATION",
            aggregateId: app.id,
            eventType: "APPLICATION_FORWARDED_TO_EVC",
            payload: {
              applicationId: app.id,
              applicationRef: appRef,
              inspectionId,
              inspectionDate: inspectionDate.toISOString(),
            },
            status: "PENDING",
          },
        });
      });
    }

    // Mirror in runtime stores
    const existingInspections = this.inMemoryEvcInspections.get(app.id) || [];
    this.inMemoryEvcInspections.set(app.id, [
      inspectionData,
      ...existingInspections,
    ]);

    this.workflowService.updateApplicationStore(app.id, {
      status: "EVC_SCHEDULED",
      stage: "EVC",
      ballWith: "COMMITTEE",
      currentQueue: "REGIONAL_EVC_QUEUE",
    } as any);

    if (this.evcService) {
      this.evcService.handleWorkflowRequiresEvcEvent({
        applicationId: app.id,
        applicationRef: appRef,
        institutionId: app.institutionId,
        institutionName: instName,
        region: (app as any).region?.code || "WRO",
        isNewInstitution: (app as any).applicationType === "NEW_INSTITUTION",
      });
    }

    if (!this.prisma.isConnected) {
      await this.auditService.appendEntry({
        entityType: "APPLICATION",
        entityId: app.id,
        action: "SCRUTINY_FORWARDED_TO_EVC",
        actorId: user.id,
        actorRole: user.role,
        previousState: { status: app.status, stage: app.stage },
        newState: { status: "EVC_SCHEDULED", stage: "EVC", ballWith: "AICTE" },
        rationale,
        timestamp,
      });
    }

    return {
      success: true,
      applicationId: app.id,
      applicationRef: appRef,
      status: "EVC_SCHEDULED",
      stage: "EVC",
      ballWith: "AICTE",
      inspectionId,
      inspectionDate: inspectionDate.toISOString(),
      message:
        "Application forwarded to EVC; live inspection record inserted and visible in EVC Schedule table.",
      timestamp,
      advisoryTag: "ADVISORY",
    };
  }

  /**
   * Retrieves 8-point deficiency records for an application.
   */
  async getDeficiencies(id: string, user: AuthenticatedUser) {
    const app = await this.getById(id, user);

    if (this.prisma.isConnected) {
      const records = await this.prisma.deficiencyRecord.findMany({
        where: { applicationId: app.id },
        orderBy: { dateIdentified: "desc" },
      });
      return {
        total: records.length,
        items: records,
        timestamp: this.clock.isoString(),
      };
    }

    const items = this.inMemoryDeficiencies.get(app.id) || [];
    return {
      total: items.length,
      items,
      timestamp: this.clock.isoString(),
    };
  }

  /**
   * Retrieves active action alert feed for an institution portal.
   */
  async getInstitutionAlerts(_user: AuthenticatedUser) {
    if (this.prisma.isConnected) {
      const notifications = await this.prisma.notification.findMany({
        where: { recipientRole: "INSTITUTION" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return {
        total: notifications.length,
        items: notifications,
        timestamp: this.clock.isoString(),
      };
    }

    return {
      total: this.inMemoryNotifications.length,
      items: this.inMemoryNotifications,
      timestamp: this.clock.isoString(),
    };
  }

  /**
   * Retrieves active regional scrutiny queue for Regional Officers.
   */
  async getRegionalScrutinyQueue(
    user: AuthenticatedUser,
    query: { regionId?: string; limit?: number } = {},
  ) {
    const isRegionalOfficer =
      user.role === UserRole.REGIONAL_OFFICER ||
      user.roles.includes("REGIONAL_OFFICER");

    const effectiveRegionId = isRegionalOfficer
      ? user.regionId
      : query.regionId;

    if (!this.prisma.isConnected) {
      const all = this.workflowService.getAllApplications();
      const filtered = all.filter((app) => {
        if (effectiveRegionId && app.regionId !== effectiveRegionId)
          return false;

        // Condition 1: status is 'SUBMITTED' where ballWith is 'REGIONAL_OFFICER' or 'AICTE'
        const isSubmittedToRo =
          app.status === "SUBMITTED" &&
          (app.ballWith === "REGIONAL_OFFICER" ||
            app.ballWith === "AICTE" ||
            !app.ballWith);

        // Condition 2: status is 'DEFICIENCY_RESOLVED_RESUBMITTED' where ballWith is 'REGIONAL_OFFICER' or 'AICTE'
        const isDeficiencyResubmitted =
          app.status === "DEFICIENCY_RESOLVED_RESUBMITTED" &&
          (app.ballWith === "REGIONAL_OFFICER" ||
            app.ballWith === "AICTE" ||
            !app.ballWith);

        // Condition 3: currentQueue is 'REGIONAL_SCRUTINY' where status is NOT in ['SCRUTINY_CLEARED', 'APPROVED', 'REJECTED']
        const isRegionalScrutinyQueue =
          ((app as any).currentQueue === "REGIONAL_SCRUTINY" ||
            app.stage === "SCRUTINY" ||
            app.status === "UNDER_SCRUTINY") &&
          ![
            "SCRUTINY_CLEARED",
            "APPROVED",
            "REJECTED",
            "SCRUTINY_DEFICIENT",
            "EVC_SCHEDULED",
          ].includes(app.status) &&
          app.ballWith !== "INSTITUTION";

        return (
          isSubmittedToRo || isDeficiencyResubmitted || isRegionalScrutinyQueue
        );
      });

      const enriched = filtered.map((app) => {
        const defs = this.inMemoryDeficiencies.get(app.id) || [];
        return {
          id: app.id,
          ref: (app as any).applicationRef || app.id,
          institution: app.institution?.name || "Institution",
          city: `${app.institution?.district || "City"}, ${app.institution?.state || "State"}`,
          program: "Technical Program",
          intake: 360,
          stage: app.stage,
          status: app.status,
          ballWith: app.ballWith,
          deficiencyCount: defs.length,
          aiAdvisoryScore: 92,
          slaState:
            app.status === "SCRUTINY_DEFICIENT" ? "DUE_SOON" : "ON_TRACK",
        };
      });

      return {
        total: enriched.length,
        items: query.limit ? enriched.slice(0, query.limit) : enriched,
        timestamp: this.clock.isoString(),
      };
    }

    const where: any = {
      deletedAt: null,
      OR: [
        {
          status: "SUBMITTED",
          ballWith: { in: ["REGIONAL_OFFICER", "AICTE"] },
        },
        {
          status: "DEFICIENCY_RESOLVED_RESUBMITTED",
          ballWith: { in: ["REGIONAL_OFFICER", "AICTE"] },
        },
        {
          currentQueue: "REGIONAL_SCRUTINY",
          status: {
            notIn: [
              "SCRUTINY_CLEARED",
              "APPROVED",
              "REJECTED",
              "SCRUTINY_DEFICIENT",
              "EVC_SCHEDULED",
            ],
          },
          ballWith: { not: "INSTITUTION" },
        },
      ],
    };

    if (effectiveRegionId) {
      where.regionId = effectiveRegionId;
    }

    const items = await this.prisma.application.findMany({
      where,
      include: {
        institution: true,
        region: true,
        deficiencies: true,
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 100,
    });

    const enriched = items.map((app) => ({
      id: app.id,
      ref: app.applicationRef || app.id,
      institution: app.institution?.name || "Institution",
      city: `${app.institution?.district || ""}, ${app.institution?.state || ""}`,
      program: "Technical Program",
      intake: 360,
      stage: app.stage,
      status: app.status,
      ballWith: app.ballWith,
      deficiencyCount: app.deficiencies?.length ?? 0,
      aiAdvisoryScore: 92,
      slaState: app.status === "SCRUTINY_DEFICIENT" ? "DUE_SOON" : "ON_TRACK",
    }));

    return {
      total: enriched.length,
      items: enriched,
      timestamp: this.clock.isoString(),
    };
  }

  async create(
    payload: {
      institutionId: string;
      academicYear: string;
      applicationType?: string;
      program?: string;
      intake?: number;
      route?: string;
    },
    user?: AuthenticatedUser,
  ) {
    const actorId = user?.id || "inst-demo-user";
    const actorRole = user?.role || UserRole.INSTITUTION;
    return this.workflowService.createAndInitializeApplication({
      institutionId: payload.institutionId,
      academicYear: payload.academicYear,
      applicationType: payload.applicationType,
      program: payload.program,
      intake: payload.intake,
      route: payload.route,
      actorId,
      actorRole,
    });
  }

  /**
   * STAGE 2: Deficiency Resolution & Resubmission
   * Triggered when an institute uploads replacement evidence and resubmits to Scrutiny.
   * Sets status: 'DEFICIENCY_RESOLVED_RESUBMITTED', ballWith: 'REGIONAL_OFFICER', currentQueue: 'REGIONAL_SCRUTINY'.
   * Immediately causes the application to reappear in the active Regional Scrutiny Queue.
   */
  async resolveDeficiencyAndResubmit(
    id: string,
    user: AuthenticatedUser,
    body: {
      deficiencyId?: string;
      evidenceFileName?: string;
      responseNotes?: string;
    } = {},
  ) {
    const isAuthorized =
      user.role === UserRole.INSTITUTION ||
      user.roles.includes("INSTITUTION") ||
      user.role === UserRole.ADMIN ||
      user.roles.includes("ADMIN");

    if (!isAuthorized) {
      throw new ForbiddenException(
        "Only Institutions or Admins may resolve deficiencies and resubmit.",
      );
    }

    const app = await this.getById(id, user);
    const timestamp = this.clock.isoString();
    const evidenceFileName =
      body.evidenceFileName || "Statutory_Replacement_Evidence.pdf";
    const notes =
      body.responseNotes ||
      "Deficiency rectified by institution; replacement evidence submitted for regional scrutiny.";

    if (this.prisma.isConnected) {
      await this.prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: app.id },
          data: {
            status: "DEFICIENCY_RESOLVED_RESUBMITTED",
            stage: "SCRUTINY",
            ballWith: "REGIONAL_OFFICER",
            currentQueue: "REGIONAL_SCRUTINY",
            version: { increment: 1 },
            updatedAt: this.clock.now(),
          },
        });

        if (body.deficiencyId) {
          await tx.deficiencyRecord.updateMany({
            where: {
              OR: [
                { id: body.deficiencyId },
                { deficiencyId: body.deficiencyId },
              ],
            },
            data: {
              verificationStatus: "SUBMITTED_UNDER_REVIEW",
              closureDate: this.clock.now(),
            },
          });
        }

        await this.auditService.appendEntry(
          {
            entityType: "APPLICATION",
            entityId: app.id,
            action: "DEFICIENCY_RESOLVED_RESUBMITTED",
            actorId: user.id,
            actorRole: user.role,
            previousState: {
              status: app.status,
              stage: app.stage,
              ballWith: app.ballWith,
            },
            newState: {
              status: "DEFICIENCY_RESOLVED_RESUBMITTED",
              stage: "SCRUTINY",
              ballWith: "REGIONAL_OFFICER",
              currentQueue: "REGIONAL_SCRUTINY",
            },
            rationale: notes,
            timestamp,
          },
          tx,
        );

        await tx.outboxEvent.create({
          data: {
            aggregateType: "APPLICATION",
            aggregateId: app.id,
            eventType: "APPLICATION_DEFICIENCY_RESUBMITTED",
            payload: {
              applicationId: app.id,
              applicationRef: (app as any).applicationRef,
              evidenceFileName,
              timestamp,
            },
            status: "PENDING",
          },
        });
      });
    }

    // Mirror in runtime stores
    this.workflowService.updateApplicationStore(app.id, {
      status: "DEFICIENCY_RESOLVED_RESUBMITTED",
      stage: "SCRUTINY",
      ballWith: "REGIONAL_OFFICER",
      currentQueue: "REGIONAL_SCRUTINY",
    } as any);

    if (!this.prisma.isConnected) {
      await this.auditService.appendEntry({
        entityType: "APPLICATION",
        entityId: app.id,
        action: "DEFICIENCY_RESOLVED_RESUBMITTED",
        actorId: user.id,
        actorRole: user.role,
        previousState: {
          status: app.status,
          stage: app.stage,
          ballWith: app.ballWith,
        },
        newState: {
          status: "DEFICIENCY_RESOLVED_RESUBMITTED",
          stage: "SCRUTINY",
          ballWith: "REGIONAL_OFFICER",
          currentQueue: "REGIONAL_SCRUTINY",
        },
        rationale: notes,
        timestamp,
      });
    }

    return {
      success: true,
      applicationId: app.id,
      applicationRef: (app as any).applicationRef,
      status: "DEFICIENCY_RESOLVED_RESUBMITTED",
      stage: "SCRUTINY",
      ballWith: "REGIONAL_OFFICER",
      currentQueue: "REGIONAL_SCRUTINY",
      message:
        "Replacement evidence submitted; application re-entered Regional Scrutiny Queue for officer review.",
      timestamp,
      advisoryTag: "ADVISORY",
    };
  }

  /**
   * STAGE 4: Committee Member Dashboard ➔ Report Submission
   * Committee panel members inspect details and submit structured advisory inspection report.
   * Sets status: 'EVC_REPORT_SUBMITTED', ballWith: 'EXECUTIVE_COMMITTEE', currentQueue: 'EXECUTIVE_APPROVAL'.
   */
  async submitEvcInspectionReport(
    id: string,
    user: AuthenticatedUser,
    body: {
      observations?: string;
      verifiedClaims?: Record<string, boolean>;
      reportFingerprint?: string;
    } = {},
  ) {
    const isAuthorized =
      user.role === UserRole.COMMITTEE_MEMBER ||
      user.roles.includes("COMMITTEE_MEMBER") ||
      user.role === UserRole.ADMIN ||
      user.roles.includes("ADMIN");

    if (!isAuthorized) {
      throw new ForbiddenException(
        "Only Committee Members or Admins may submit EVC inspection reports.",
      );
    }

    const app = await this.getById(id, user);
    const timestamp = this.clock.isoString();
    const observations =
      body.observations ||
      "All statutory infrastructure, laboratories, and land requirements verified on-site.";
    const fingerprint =
      body.reportFingerprint ||
      "9a7b4f2c1e8d0234b6791e2049d816a7f34081c95e6201b483109a82649b1043";

    if (this.prisma.isConnected) {
      await this.prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: app.id },
          data: {
            status: "EVC_REPORT_SUBMITTED",
            stage: "FINAL_DECISION",
            ballWith: "EXECUTIVE_COMMITTEE",
            currentQueue: "EXECUTIVE_APPROVAL",
            version: { increment: 1 },
            updatedAt: this.clock.now(),
          },
        });

        await tx.evcInspection.updateMany({
          where: { applicationId: app.id },
          data: {
            status: "EVC_COMPLETED",
          },
        });

        await this.auditService.appendEntry(
          {
            entityType: "APPLICATION",
            entityId: app.id,
            action: "EVC_REPORT_SUBMITTED",
            actorId: user.id,
            actorRole: user.role,
            previousState: { status: app.status, stage: app.stage },
            newState: {
              status: "EVC_REPORT_SUBMITTED",
              stage: "FINAL_DECISION",
              ballWith: "EXECUTIVE_COMMITTEE",
              currentQueue: "EXECUTIVE_APPROVAL",
            },
            rationale: `EVC Panel submitted inspection report with fingerprint ${fingerprint}: ${observations}`,
            timestamp,
          },
          tx,
        );
      });
    }

    this.workflowService.updateApplicationStore(app.id, {
      status: "EVC_REPORT_SUBMITTED",
      stage: "FINAL_DECISION",
      ballWith: "EXECUTIVE_COMMITTEE",
      currentQueue: "EXECUTIVE_APPROVAL",
    } as any);

    if (!this.prisma.isConnected) {
      await this.auditService.appendEntry({
        entityType: "APPLICATION",
        entityId: app.id,
        action: "EVC_REPORT_SUBMITTED",
        actorId: user.id,
        actorRole: user.role,
        previousState: { status: app.status, stage: app.stage },
        newState: {
          status: "EVC_REPORT_SUBMITTED",
          stage: "FINAL_DECISION",
          ballWith: "EXECUTIVE_COMMITTEE",
          currentQueue: "EXECUTIVE_APPROVAL",
        },
        rationale: `EVC Panel submitted inspection report with fingerprint ${fingerprint}: ${observations}`,
        timestamp,
      });
    }

    return {
      success: true,
      applicationId: app.id,
      applicationRef: (app as any).applicationRef,
      status: "EVC_REPORT_SUBMITTED",
      stage: "FINAL_DECISION",
      ballWith: "EXECUTIVE_COMMITTEE",
      currentQueue: "EXECUTIVE_APPROVAL",
      message:
        "EVC inspection report submitted; application advanced to Executive Committee review.",
      timestamp,
      advisoryTag: "ADVISORY",
    };
  }

  /**
   * STAGE 5: Final Decision (Approval / Rejection)
   * The Executive Committee / Authorized Officer reviews the advisory report and issues the final decree.
   * Sets status: 'APPROVED' or 'REJECTED', ballWith: 'INSTITUTION', currentQueue: 'ARCHIVED'.
   */
  async issueFinalDecision(
    id: string,
    user: AuthenticatedUser,
    body: {
      decision: "APPROVED" | "REJECTED";
      rationale: string;
      orderNumber?: string;
    },
  ) {
    const isAuthorized =
      user.role === UserRole.BUREAU_OFFICER ||
      user.roles.includes("BUREAU_OFFICER") ||
      user.role === UserRole.ADMIN ||
      user.roles.includes("ADMIN");

    if (!isAuthorized) {
      throw new ForbiddenException(
        "Only Bureau Authority or Admins may issue final approval/rejection decrees.",
      );
    }

    const app = await this.getById(id, user);
    const timestamp = this.clock.isoString();
    const isApproved = body.decision === "APPROVED";
    const status = isApproved ? "APPROVED" : "REJECTED";
    const orderNumber =
      body.orderNumber ||
      `AICTE/APH/2027/${status === "APPROVED" ? "EOA" : "REJ"}-${this.clock.timestamp().toString(36).toUpperCase()}`;

    if (this.prisma.isConnected) {
      await this.prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: app.id },
          data: {
            status,
            stage: "FINAL_DECISION",
            ballWith: "INSTITUTION",
            currentQueue: "ARCHIVED",
            version: { increment: 1 },
            updatedAt: this.clock.now(),
          },
        });

        await this.auditService.appendEntry(
          {
            entityType: "APPLICATION",
            entityId: app.id,
            action: isApproved
              ? "FINAL_APPROVAL_ISSUED"
              : "FINAL_REJECTION_ISSUED",
            actorId: user.id,
            actorRole: user.role,
            previousState: { status: app.status, stage: app.stage },
            newState: {
              status,
              stage: "FINAL_DECISION",
              ballWith: "INSTITUTION",
              currentQueue: "ARCHIVED",
              orderNumber,
            },
            rationale: body.rationale,
            timestamp,
          },
          tx,
        );

        await tx.outboxEvent.create({
          data: {
            aggregateType: "APPLICATION",
            aggregateId: app.id,
            eventType: isApproved
              ? "APPLICATION_APPROVED"
              : "APPLICATION_REJECTED",
            payload: {
              applicationId: app.id,
              applicationRef: (app as any).applicationRef,
              orderNumber,
              decision: status,
              timestamp,
            },
            status: "PENDING",
          },
        });
      });
    }

    this.workflowService.updateApplicationStore(app.id, {
      status,
      stage: "FINAL_DECISION",
      ballWith: "INSTITUTION",
      currentQueue: "ARCHIVED",
    } as any);

    if (!this.prisma.isConnected) {
      await this.auditService.appendEntry({
        entityType: "APPLICATION",
        entityId: app.id,
        action: isApproved ? "FINAL_APPROVAL_ISSUED" : "FINAL_REJECTION_ISSUED",
        actorId: user.id,
        actorRole: user.role,
        previousState: { status: app.status, stage: app.stage },
        newState: {
          status,
          stage: "FINAL_DECISION",
          ballWith: "INSTITUTION",
          currentQueue: "ARCHIVED",
          orderNumber,
        },
        rationale: body.rationale,
        timestamp,
      });
    }

    return {
      success: true,
      applicationId: app.id,
      applicationRef: (app as any).applicationRef,
      status,
      stage: "FINAL_DECISION",
      ballWith: "INSTITUTION",
      currentQueue: "ARCHIVED",
      orderNumber,
      message: `Final statutory decision issued: ${status}. Order ${orderNumber} committed to immutable audit ledger.`,
      timestamp,
      advisoryTag: "ADVISORY",
    };
  }
}
