import { ForbiddenException, Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { UserRole } from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaService } from "../../common/prisma/prisma.service";

export interface AuditLogRow {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorRole: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown>;
  rationale: string | null;
  ipAddress?: string | null;
  timestamp: string;
  prevHash: string;
  hash: string;
}

export interface BrokenChainLinkReport {
  index: number;
  entryId: string;
  action: string;
  actorId: string;
  timestamp: string;
  failureType: "PREV_HASH_MISMATCH" | "ROW_HASH_MISMATCH";
  expectedPrevHash: string;
  actualPrevHash: string;
  expectedHash: string;
  actualHash: string;
  description: string;
}

export interface AuditChainVerificationReport {
  applicationId: string;
  valid: boolean;
  totalEntries: number;
  verifiedAt: string;
  genesisHash: string | null;
  headHash: string | null;
  firstBrokenLink: BrokenChainLinkReport | null;
}

/**
 * Deterministic recursive key-sorting JSON serializer so JSONB round-trips
 * produce identical byte strings for SHA-256 hashing.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    const pairs = sortedKeys.map(
      (k) => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`,
    );
    return `{${pairs.join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Computes SHA-256 of canonical row JSON plus prev_hash.
 */
export function computeAuditHash(
  row: {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    actorId: string;
    actorRole: string;
    previousState: Record<string, unknown> | null;
    newState: Record<string, unknown>;
    rationale: string | null;
    timestamp: string;
  },
  prevHash: string,
): string {
  const canonicalRow = canonicalizeJson({
    action: row.action,
    actorId: row.actorId,
    actorRole: row.actorRole,
    after: row.newState,
    before: row.previousState ?? null,
    entityId: row.entityId,
    entityType: row.entityType,
    id: row.id,
    reason: row.rationale ?? null,
    timestamp: row.timestamp,
  });
  return createHash("sha256")
    .update(`${canonicalRow}|${prevHash}`, "utf8")
    .digest("hex");
}

@Injectable()
export class AuditService {
  /**
   * In-memory append-only ledger per applicationId (used when PostgreSQL is offline
   * and mirrored for rapid verification).
   */
  private readonly chains = new Map<string, AuditLogRow[]>();

  constructor(
    private readonly clock: SystemClockService,
    private readonly prisma: PrismaService,
  ) { }

  /**
   * Resets in-memory chains (used between isolated test suites).
   */
  resetInMemoryStore(): void {
    this.chains.clear();
  }

  /**
   * Appends a hash-chained audit entry for an application inside a transaction.
   * One chain per application (genesis prev_hash = 'GENESIS').
   */
  async appendEntry(
    input: {
      id?: string;
      entityType?: string;
      entityId: string;
      action: string;
      actorId: string;
      actorRole: UserRole | string;
      previousState: Record<string, unknown> | null;
      newState: Record<string, unknown>;
      rationale?: string | null;
      ipAddress?: string | null;
      timestamp?: string;
    },
    tx?: any,
  ): Promise<AuditLogRow> {
    const id = input.id ?? randomUUID();
    const entityType = input.entityType ?? "APPLICATION";
    const entityId = input.entityId;
    const timestamp = input.timestamp ?? this.clock.isoString();
    const rationale = input.rationale ?? null;
    const previousState = input.previousState
      ? (JSON.parse(JSON.stringify(input.previousState)) as Record<string, unknown>)
      : null;
    const newState = JSON.parse(JSON.stringify(input.newState)) as Record<
      string,
      unknown
    >;

    const dbClient = tx ?? (this.prisma.isConnected ? this.prisma : null);
    let prevHash = "GENESIS";

    if (dbClient && this.prisma.isConnected) {
      const lastRow = await dbClient.auditLog.findFirst({
        where: { entityId },
        orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      });
      if (lastRow) {
        prevHash = lastRow.hash;
      }
    } else {
      const existingChain = this.chains.get(entityId) ?? [];
      if (existingChain.length > 0) {
        prevHash = existingChain[existingChain.length - 1].hash;
      }
    }

    const hash = computeAuditHash(
      {
        id,
        entityType,
        entityId,
        action: input.action,
        actorId: input.actorId,
        actorRole: String(input.actorRole),
        previousState,
        newState,
        rationale,
        timestamp,
      },
      prevHash,
    );

    const row: AuditLogRow = {
      id,
      entityType,
      entityId,
      action: input.action,
      actorId: input.actorId,
      actorRole: String(input.actorRole),
      previousState,
      newState,
      rationale,
      ipAddress: input.ipAddress ?? null,
      timestamp,
      prevHash,
      hash,
    };

    if (dbClient && this.prisma.isConnected) {
      await dbClient.auditLog.create({
        data: {
          id: row.id,
          entityType: row.entityType,
          entityId: row.entityId,
          action: row.action,
          actorId: row.actorId,
          actorRole: row.actorRole,
          previousState: (row.previousState ?? undefined) as any,
          newState: row.newState as any,
          rationale: row.rationale,
          ipAddress: row.ipAddress,
          timestamp: this.clock.parseIso(row.timestamp),
          prevHash: row.prevHash,
          hash: row.hash,
        },
      });
    }

    const currentChain = this.chains.get(entityId) ?? [];
    currentChain.push(row);
    this.chains.set(entityId, currentChain);

    return row;
  }

  /**
   * Backward-compatible synchronous record wrapper.
   */
  record(entry: {
    entityType: string;
    entityId: string;
    action: string;
    actorId: string;
    actorRole: UserRole | string;
    previousState?: Record<string, unknown> | null;
    newState: Record<string, unknown>;
    rationale?: string;
  }) {
    const id = randomUUID();
    const timestamp = this.clock.isoString();
    const existingChain = this.chains.get(entry.entityId) ?? [];
    const prevHash =
      existingChain.length > 0
        ? existingChain[existingChain.length - 1].hash
        : "GENESIS";
    const rationale = entry.rationale ?? null;
    const previousState = entry.previousState ?? null;
    const hash = computeAuditHash(
      {
        id,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorId: entry.actorId,
        actorRole: String(entry.actorRole),
        previousState,
        newState: entry.newState,
        rationale,
        timestamp,
      },
      prevHash,
    );
    const row: AuditLogRow = {
      id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorId: entry.actorId,
      actorRole: String(entry.actorRole),
      previousState,
      newState: entry.newState,
      rationale,
      timestamp,
      prevHash,
      hash,
    };
    existingChain.push(row);
    this.chains.set(entry.entityId, existingChain);
    return {
      ...row,
      immutable: true,
    };
  }

  /**
   * Returns chronological audit trail for an application/entity.
   */
  async getTrail(entityId: string) {
    const entries = await this.getChainEntries(entityId);
    return {
      entityId,
      retrievedAt: this.clock.isoString(),
      totalEntries: entries.length,
      entries,
    };
  }

  async getChainEntries(applicationId: string): Promise<AuditLogRow[]> {
    if (this.prisma.isConnected) {
      const dbRows = await this.prisma.auditLog.findMany({
        where: { entityId: applicationId },
        orderBy: [{ timestamp: "asc" }, { id: "asc" }],
      });
      if (dbRows.length > 0) {
        return dbRows.map((r) => ({
          id: r.id,
          entityType: r.entityType,
          entityId: r.entityId,
          action: r.action,
          actorId: r.actorId,
          actorRole: r.actorRole,
          previousState: (r.previousState as Record<string, unknown>) ?? null,
          newState: (r.newState as Record<string, unknown>) ?? {},
          rationale: r.rationale ?? null,
          ipAddress: r.ipAddress ?? null,
          timestamp: r.timestamp.toISOString(),
          prevHash: r.prevHash,
          hash: r.hash,
        }));
      }
    }
    return [...(this.chains.get(applicationId) ?? [])];
  }

  /**
   * Recomputes the SHA-256 hash chain for an application from GENESIS and reports
   * the first broken link if any row was modified, reordered, or deleted.
   */
  async verifyChain(
    applicationId: string,
  ): Promise<AuditChainVerificationReport> {
    const entries = await this.getChainEntries(applicationId);
    const verifiedAt = this.clock.isoString();

    let expectedPrevHash = "GENESIS";
    let firstBrokenLink: BrokenChainLinkReport | null = null;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedHash = computeAuditHash(
        {
          id: entry.id,
          entityType: entry.entityType,
          entityId: entry.entityId,
          action: entry.action,
          actorId: entry.actorId,
          actorRole: entry.actorRole,
          previousState: entry.previousState,
          newState: entry.newState,
          rationale: entry.rationale,
          timestamp: entry.timestamp,
        },
        entry.prevHash,
      );

      if (entry.prevHash !== expectedPrevHash) {
        firstBrokenLink = {
          index: i,
          entryId: entry.id,
          action: entry.action,
          actorId: entry.actorId,
          timestamp: entry.timestamp,
          failureType: "PREV_HASH_MISMATCH",
          expectedPrevHash,
          actualPrevHash: entry.prevHash,
          expectedHash,
          actualHash: entry.hash,
          description: `Chain continuity broken at index ${i} (entry ${entry.id}): expected prev_hash "${expectedPrevHash}" but found "${entry.prevHash}"`,
        };
        break;
      }

      if (entry.hash !== expectedHash) {
        firstBrokenLink = {
          index: i,
          entryId: entry.id,
          action: entry.action,
          actorId: entry.actorId,
          timestamp: entry.timestamp,
          failureType: "ROW_HASH_MISMATCH",
          expectedPrevHash,
          actualPrevHash: entry.prevHash,
          expectedHash,
          actualHash: entry.hash,
          description: `Row payload tampering detected at index ${i} (entry ${entry.id}): recomputed SHA-256 "${expectedHash}" does not match stored hash "${entry.hash}"`,
        };
        break;
      }

      expectedPrevHash = entry.hash;
    }

    return {
      applicationId,
      valid: firstBrokenLink === null,
      totalEntries: entries.length,
      verifiedAt,
      genesisHash: entries.length > 0 ? entries[0].hash : null,
      headHash: entries.length > 0 ? entries[entries.length - 1].hash : null,
      firstBrokenLink,
    };
  }

  /**
   * Attempts a normal UPDATE or DELETE on audit_log.
   * Blocked by the PostgreSQL BEFORE UPDATE OR DELETE trigger `audit_log_immutable_trigger`
   * (and enforced identically when running in-memory).
   */
  async attemptUpdateOrDelete(
    operation: "UPDATE" | "DELETE",
    entryId: string,
  ): Promise<never> {
    if (this.prisma.isConnected) {
      if (operation === "UPDATE") {
        await this.prisma.$executeRawUnsafe(
          `UPDATE audit_log SET rationale = 'illegal-mutation' WHERE id = $1::uuid`,
          entryId,
        );
      } else {
        await this.prisma.$executeRawUnsafe(
          `DELETE FROM audit_log WHERE id = $1::uuid`,
          entryId,
        );
      }
    }
    throw new ForbiddenException(
      `audit_log is append-only: ${operation} operations are strictly prohibited`,
    );
  }

  /**
   * Simulates direct storage/SQL tampering (e.g., superuser temporarily bypassing trigger
   * to alter a row's JSON state or rationale on disk) so that `GET /audit/verify/:applicationId`
   * can be tested and proven to catch tampering.
   */
  async simulateSqlTamperForVerification(
    applicationId: string,
    entryIndex: number,
    tamperedFields: {
      rationale?: string;
      newState?: Record<string, unknown>;
      actorId?: string;
    },
  ): Promise<AuditLogRow> {
    const chain = this.chains.get(applicationId) ?? [];
    if (entryIndex < 0 || entryIndex >= chain.length) {
      throw new Error(
        `Invalid entryIndex ${entryIndex} for application ${applicationId} (chain length ${chain.length})`,
      );
    }

    const target = chain[entryIndex];
    if (tamperedFields.rationale !== undefined) {
      target.rationale = tamperedFields.rationale;
    }
    if (tamperedFields.newState !== undefined) {
      target.newState = tamperedFields.newState;
    }
    if (tamperedFields.actorId !== undefined) {
      target.actorId = tamperedFields.actorId;
    }

    if (this.prisma.isConnected) {
      await this.prisma.$transaction([
        this.prisma.$executeRawUnsafe(
          `ALTER TABLE audit_log DISABLE TRIGGER audit_log_immutable_trigger`,
        ),
        this.prisma.auditLog.update({
          where: { id: target.id },
          data: {
            rationale: target.rationale,
            newState: target.newState as any,
            actorId: target.actorId,
          },
        }),
        this.prisma.$executeRawUnsafe(
          `ALTER TABLE audit_log ENABLE TRIGGER audit_log_immutable_trigger`,
        ),
      ]);
    }

    return target;
  }
}
