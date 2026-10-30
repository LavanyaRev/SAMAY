import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ApplicationStatus, UserRole, WorkflowStage } from "@samay/shared";
import { withRlsContext } from "@samay/database";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthenticatedUser } from "../auth/current-user.decorator";
import {
  WorkflowActionName,
  WorkflowService,
} from "../workflow/workflow.service";

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly clock: SystemClockService,
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
  ) {}

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
      const enriched = await this.workflowService.getApplicationWithTimeline(id);
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

  create(
    payload: { institutionId: string; academicYear: string },
    _user?: AuthenticatedUser,
  ) {
    return {
      id: "app-sample-uuid",
      institutionId: payload.institutionId,
      academicYear: payload.academicYear,
      stage: WorkflowStage.SUBMISSION,
      status: ApplicationStatus.DRAFT,
      createdAt: this.clock.isoString(),
    };
  }
}
