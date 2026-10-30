import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { UserRole } from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";
import { DueItemKind } from "../deadlines/due-item.service";

export type NotificationChannelType = "IN_APP" | "EMAIL" | "SMS";

export interface EscalationLevelRule {
  level: 0 | 1 | 2 | 3;
  label: string;
  notifyRoles: UserRole[];
  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
  delayWorkingDaysAfterPrevious: number;
  cumulativeWorkingDaysOverdue: number;
  templateCode: string;
  channels: NotificationChannelType[];
}

export interface EscalationPolicyData {
  id: string;
  code: string;
  name: string;
  kind: DueItemKind;
  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
  aphClause: string;
  levels: EscalationLevelRule[];
  isActive: boolean;
  updatedAt: string;
}

const DEFAULT_LEVEL_LADDER: EscalationLevelRule[] = [
  {
    level: 0,
    label: "Level 0: Responsible Officer & Applicant Institution",
    notifyRoles: [UserRole.COMMITTEE_MEMBER, UserRole.INSTITUTION],
    // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
    delayWorkingDaysAfterPrevious: 0,
    cumulativeWorkingDaysOverdue: 0,
    templateCode: "TPL_DEADLINE_WARNING_L0",
    channels: ["IN_APP", "EMAIL", "SMS"],
  },
  {
    level: 1,
    label: "Level 1: Regional Officer (RO)",
    notifyRoles: [UserRole.REGIONAL_OFFICER],
    // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
    delayWorkingDaysAfterPrevious: 1,
    cumulativeWorkingDaysOverdue: 1,
    templateCode: "TPL_ESCALATION_L1_REGIONAL_OFFICER",
    channels: ["IN_APP", "EMAIL", "SMS"],
  },
  {
    level: 2,
    label: "Level 2: Approval Bureau Officer (HQ)",
    notifyRoles: [UserRole.BUREAU_OFFICER],
    // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
    delayWorkingDaysAfterPrevious: 2,
    cumulativeWorkingDaysOverdue: 3,
    templateCode: "TPL_ESCALATION_L2_BUREAU_OFFICER",
    channels: ["IN_APP", "EMAIL", "SMS"],
  },
  {
    level: 3,
    label: "Level 3: Designated Council Head / Competent Authority",
    notifyRoles: [UserRole.ADMIN],
    // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
    delayWorkingDaysAfterPrevious: 4,
    cumulativeWorkingDaysOverdue: 7,
    templateCode: "TPL_ESCALATION_L3_DESIGNATED_HEAD",
    channels: ["IN_APP", "EMAIL", "SMS"],
  },
];

const ALL_KINDS: DueItemKind[] = [
  "PROCESSING_STAGE",
  "EVC_SCHEDULING",
  "EVC_COMPLETION",
  "UNDERTAKING",
  "DOCUMENT_EXPIRY",
  "DOCUMENT_RENEWAL",
];

@Injectable()
export class EscalationPolicyService {
  private readonly policies = new Map<DueItemKind, EscalationPolicyData>();

  constructor(private readonly clock: SystemClockService) {
    this.resetDefaultPolicies();
  }

  resetDefaultPolicies(): void {
    this.policies.clear();
    const nowIso = this.clock.isoString();
    for (const kind of ALL_KINDS) {
      this.policies.set(kind, {
        id: randomUUID(),
        code: `ESC_POLICY_${kind}`,
        name: `Statutory Escalation Ladder for ${kind} (Placeholder)`,
        kind,
        // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
        aphClause: "APH-2024-27-TODO(APH-VERIFY)",
        levels: JSON.parse(JSON.stringify(DEFAULT_LEVEL_LADDER)),
        isActive: true,
        updatedAt: nowIso,
      });
    }
  }

  listPolicies(): EscalationPolicyData[] {
    return Array.from(this.policies.values());
  }

  getPolicyForKind(kind: DueItemKind): EscalationPolicyData {
    const policy = this.policies.get(kind);
    if (!policy) {
      throw new NotFoundException(`Escalation policy for kind ${kind} not found`);
    }
    return policy;
  }

  getLevelRule(kind: DueItemKind, level: number): EscalationLevelRule {
    const policy = this.getPolicyForKind(kind);
    const clampedLevel = Math.min(3, Math.max(0, level)) as 0 | 1 | 2 | 3;
    const rule = policy.levels.find((l) => l.level === clampedLevel);
    if (!rule) {
      throw new NotFoundException(
        `Escalation level ${level} not found in policy ${policy.code}`,
      );
    }
    return rule;
  }

  updatePolicy(
    kind: DueItemKind,
    levels: EscalationLevelRule[],
  ): EscalationPolicyData {
    const existing = this.getPolicyForKind(kind);
    let cumulative = 0;
    const normalizedLevels = levels.map((l) => {
      cumulative += l.delayWorkingDaysAfterPrevious;
      return {
        ...l,
        cumulativeWorkingDaysOverdue: l.level === 0 ? 0 : cumulative,
      };
    });

    const updated: EscalationPolicyData = {
      ...existing,
      levels: normalizedLevels,
      updatedAt: this.clock.isoString(),
    };
    this.policies.set(kind, updated);
    return updated;
  }
}

