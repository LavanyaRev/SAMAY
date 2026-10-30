/**
 * Phase 6: Notifications, Outbox Delivery Log, Mailpit Inbox, Templates & Escalation Policies
 * Client & deterministic state store for `apps/web`.
 */

export type EscalationLevel = 0 | 1 | 2 | 3;
export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS";
export type DeliveryStatus = "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
export type DueItemKind =
  | "PROCESSING_STAGE"
  | "EVC_SCHEDULING"
  | "EVC_COMPLETION"
  | "UNDERTAKING"
  | "DOCUMENT_EXPIRY"
  | "DOCUMENT_RENEWAL";

export interface InAppNotificationItem {
  id: string;
  recipientRole: string;
  recipientEmail: string;
  applicationId: string;
  institution: string;
  escalationLevel: EscalationLevel;
  titleEn: string;
  bodyEn: string;
  titleHi: string;
  bodyHi: string;
  actionLink: string;
  isRead: boolean;
  readAt: string | null;
  eventKey: string;
  createdAt: string;
}

export interface MailpitMessageItem {
  id: string;
  from: string;
  to: string[];
  recipientRole: string;
  escalationLevel: EscalationLevel;
  subjectEn: string;
  bodyEn: string;
  subjectHi: string;
  bodyHi: string;
  actionLink: string;
  smtpResponse: string;
  receivedAt: string;
}

export interface DeliveryLogItem {
  id: string;
  dedupKey: string;
  recipientEmail: string;
  recipientPhone: string;
  recipientRole: string;
  eventKey: string;
  channel: NotificationChannel;
  escalationLevel: EscalationLevel;
  templateCode: string;
  smsTemplateId: string;
  status: DeliveryStatus;
  statusHistory: DeliveryStatus[];
  attemptNumber: number;
  nextRetryBackoffMs: number;
  lastError: string | null;
  deliveredAt: string | null;
}

export interface TemplateVersionItem {
  id: string;
  code: string;
  version: number;
  name: string;
  smsTemplateId: string;
  subjectEn: string;
  bodyEn: string;
  subjectHi: string;
  bodyHi: string;
  smsBodyEn: string;
  smsBodyHi: string;
  isActive: boolean;
  createdAt: string;
}

export interface EscalationLevelRuleItem {
  level: EscalationLevel;
  label: string;
  notifyRoles: string[];
  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
  delayWorkingDaysAfterPrevious: number;
  cumulativeWorkingDaysOverdue: number;
  templateCode: string;
  channels: NotificationChannel[];
}

export interface EscalationPolicyItem {
  id: string;
  code: string;
  name: string;
  kind: DueItemKind;
  aphClause: string;
  levels: EscalationLevelRuleItem[];
  updatedAt: string;
}

export interface DemoClockBannerState {
  isActive: boolean;
  offsetDays: number;
  simulatedDateIso: string;
  bannerTextEn: string;
  bannerTextHi: string;
}

/**
 * Deterministic Handlebars renderer supporting `{{var}}` and `{{#if var}}...{{/if}}`
 */
export function renderHandlebars(
  template: string,
  variables: Record<string, string | number>,
): string {
  let out = template.replace(
    /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_m, key: string, inner: string) => (variables[key] ? inner : ""),
  );
  out = out.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) =>
    variables[key] !== undefined ? String(variables[key]) : "",
  );
  return out;
}

const INITIAL_TEMPLATES: TemplateVersionItem[] = [
  {
    id: "tpl-v1-l0",
    code: "TPL_DEADLINE_WARNING_L0",
    version: 1,
    name: "Level 0 SLA Warning — Responsible Officer & Institution",
    smsTemplateId: "DLT-AICTE-SLA-WARN-L0-001",
    subjectEn:
      "[SAMAY Advisory L0] SLA Due Soon ({{daysRemaining}}d left): {{applicationId}} — {{institution}}",
    bodyEn:
      "Statutory SLA Reminder for {{institution}} (Dossier: {{applicationId}}). Deadline is {{dueDate}} ({{daysRemaining}} days remaining). Review dossier at: {{actionLink}}",
    subjectHi:
      "[समय सूचना L0] समय-सीमा निकट ({{daysRemaining}} दिन शेष): {{applicationId}} — {{institution}}",
    bodyHi:
      "{{institution}} (आवेदन संख्या: {{applicationId}}) के लिए वैधानिक समय-सीमा {{dueDate}} है ({{daysRemaining}} दिन शेष)। कार्रवाई लिंक: {{actionLink}}",
    smsBodyEn:
      "AICTE SAMAY: Application {{applicationId}} ({{institution}}) is due on {{dueDate}} ({{daysRemaining}}d left). Link: {{actionLink}}",
    smsBodyHi:
      "AICTE SAMAY: आवेदन {{applicationId}} ({{institution}}) की अंतिम तिथि {{dueDate}} ({{daysRemaining}} दिन शेष) है। लिंक: {{actionLink}}",
    isActive: true,
    createdAt: "2026-05-01T09:00:00+05:30",
  },
  {
    id: "tpl-v1-l1",
    code: "TPL_ESCALATION_L1_REGIONAL_OFFICER",
    version: 1,
    name: "Level 1 Escalation — Regional Officer (RO)",
    smsTemplateId: "DLT-AICTE-ESC-L1-RO-002",
    subjectEn:
      "[SAMAY ESCALATION L1] Overdue Breach on {{applicationId}} ({{institution}}) — Regional Officer Attention",
    bodyEn:
      "Level 1 Statutory Escalation: Dossier {{applicationId}} for {{institution}} breached its due date of {{dueDate}} ({{daysRemaining}} days relative to deadline). Immediate Regional Officer intervention required: {{actionLink}}",
    subjectHi:
      "[समय वृद्धि L1] समय-सीमा उल्लंघन: {{applicationId}} ({{institution}}) — क्षेत्रीय अधिकारी ध्यान दें",
    bodyHi:
      "स्तर 1 वैधानिक वृद्धि: {{institution}} का आवेदन {{applicationId}} अंतिम तिथि {{dueDate}} को पार कर चुका है ({{daysRemaining}} दिन)। क्षेत्रीय अधिकारी तुरंत देखें: {{actionLink}}",
    smsBodyEn:
      "AICTE ESCALATION L1 (RO): {{applicationId}} ({{institution}}) overdue since {{dueDate}} ({{daysRemaining}}d). Act at {{actionLink}}",
    smsBodyHi:
      "AICTE L1 (RO): आवेदन {{applicationId}} ({{institution}}) तिथि {{dueDate}} से अतिदेय है। लिंक: {{actionLink}}",
    isActive: true,
    createdAt: "2026-05-01T09:00:00+05:30",
  },
  {
    id: "tpl-v1-l2",
    code: "TPL_ESCALATION_L2_BUREAU_OFFICER",
    version: 1,
    name: "Level 2 Escalation — Approval Bureau Officer (HQ)",
    smsTemplateId: "DLT-AICTE-ESC-L2-BUREAU-003",
    subjectEn:
      "[SAMAY ESCALATION L2] Unresolved SLA Breach on {{applicationId}} ({{institution}}) — Approval Bureau HQ",
    bodyEn:
      "Level 2 Statutory Escalation to Approval Bureau HQ: Dossier {{applicationId}} ({{institution}}) remains overdue past {{dueDate}} ({{daysRemaining}} days). Inspect at: {{actionLink}}",
    subjectHi:
      "[समय वृद्धि L2] अनसुलझा समय-सीमा उल्लंघन: {{applicationId}} ({{institution}}) — अनुमोदन ब्यूरो मुख्यालय",
    bodyHi:
      "स्तर 2 वैधानिक वृद्धि (अनुमोदन ब्यूरो मुख्यालय): {{institution}} का आवेदन {{applicationId}} अंतिम तिथि {{dueDate}} के बाद भी लंबित है ({{daysRemaining}} दिन)। लिंक: {{actionLink}}",
    smsBodyEn:
      "AICTE ESCALATION L2 (Bureau): {{applicationId}} ({{institution}}) overdue ({{daysRemaining}}d). Review: {{actionLink}}",
    smsBodyHi:
      "AICTE L2 (ब्यूरो): आवेदन {{applicationId}} ({{institution}}) अतिदेय ({{daysRemaining}} दिन)। लिंक: {{actionLink}}",
    isActive: true,
    createdAt: "2026-05-01T09:00:00+05:30",
  },
  {
    id: "tpl-v1-l3",
    code: "TPL_ESCALATION_L3_DESIGNATED_HEAD",
    version: 1,
    name: "Level 3 Critical Escalation — Designated Council Head",
    smsTemplateId: "DLT-AICTE-ESC-L3-HEAD-004",
    subjectEn:
      "[SAMAY CRITICAL ESCALATION L3] Severe Pendency Breach on {{applicationId}} ({{institution}}) — Designated Head",
    bodyEn:
      "Level 3 Critical Escalation to Designated Head: Dossier {{applicationId}} for {{institution}} has exceeded statutory threshold since {{dueDate}} ({{daysRemaining}} days). Direct oversight link: {{actionLink}}",
    subjectHi:
      "[समय गंभीर वृद्धि L3] गंभीर लंबित उल्लंघन: {{applicationId}} ({{institution}}) — नामित प्रमुख",
    bodyHi:
      "स्तर 3 गंभीर वैधानिक वृद्धि (नामित प्रमुख): {{institution}} का आवेदन {{applicationId}} अंतिम तिथि {{dueDate}} से गंभीर रूप से अतिदेय है ({{daysRemaining}} दिन)। लिंक: {{actionLink}}",
    smsBodyEn:
      "AICTE CRITICAL L3 (Head): {{applicationId}} ({{institution}}) breached {{dueDate}} ({{daysRemaining}}d). Link: {{actionLink}}",
    smsBodyHi:
      "AICTE गंभीर L3 (प्रमुख): आवेदन {{applicationId}} ({{institution}}) तिथि {{dueDate}} से अतिदेय। लिंक: {{actionLink}}",
    isActive: true,
    createdAt: "2026-05-01T09:00:00+05:30",
  },
];

const DEFAULT_LADDER_LEVELS: EscalationLevelRuleItem[] = [
  {
    level: 0,
    label: "Level 0: Responsible Officer & Applicant Institution",
    notifyRoles: ["COMMITTEE_MEMBER", "INSTITUTION"],
    delayWorkingDaysAfterPrevious: 0,
    cumulativeWorkingDaysOverdue: 0,
    templateCode: "TPL_DEADLINE_WARNING_L0",
    channels: ["IN_APP", "EMAIL", "SMS"],
  },
  {
    level: 1,
    label: "Level 1: Regional Officer (RO)",
    notifyRoles: ["REGIONAL_OFFICER"],
    delayWorkingDaysAfterPrevious: 1,
    cumulativeWorkingDaysOverdue: 1,
    templateCode: "TPL_ESCALATION_L1_REGIONAL_OFFICER",
    channels: ["IN_APP", "EMAIL", "SMS"],
  },
  {
    level: 2,
    label: "Level 2: Approval Bureau Officer (HQ)",
    notifyRoles: ["BUREAU_OFFICER"],
    delayWorkingDaysAfterPrevious: 2,
    cumulativeWorkingDaysOverdue: 3,
    templateCode: "TPL_ESCALATION_L2_BUREAU_OFFICER",
    channels: ["IN_APP", "EMAIL", "SMS"],
  },
  {
    level: 3,
    label: "Level 3: Designated Council Head / Competent Authority",
    notifyRoles: ["ADMIN"],
    delayWorkingDaysAfterPrevious: 4,
    cumulativeWorkingDaysOverdue: 7,
    templateCode: "TPL_ESCALATION_L3_DESIGNATED_HEAD",
    channels: ["IN_APP", "EMAIL", "SMS"],
  },
];

const INITIAL_POLICIES: EscalationPolicyItem[] = (
  [
    "PROCESSING_STAGE",
    "EVC_SCHEDULING",
    "EVC_COMPLETION",
    "UNDERTAKING",
    "DOCUMENT_EXPIRY",
    "DOCUMENT_RENEWAL",
  ] as DueItemKind[]
).map((kind, idx) => ({
  id: `pol-${idx + 1}`,
  code: `ESC_POLICY_${kind}`,
  name: `Statutory Escalation Policy — ${kind}`,
  kind,
  aphClause: "APH-2024-27-TODO(APH-VERIFY)",
  levels: JSON.parse(JSON.stringify(DEFAULT_LADDER_LEVELS)),
  updatedAt: "2026-05-01T09:00:00+05:30",
}));

function buildLadderArtifacts(): {
  inApp: InAppNotificationItem[];
  mailpit: MailpitMessageItem[];
  deliveries: DeliveryLogItem[];
} {
  const applicationId = "APP-2026-WRO-00104";
  const institution = "Walchand College of Engineering, Sangli";
  const dueDate = "2026-05-08";
  const actionLink = "/applications/APP-2026-WRO-00104";

  const steps: Array<{
    stepKey: string;
    level: EscalationLevel;
    daysRemaining: number;
    timestamp: string;
    roles: Array<{ role: string; email: string; phone: string }>;
    tplCode: string;
  }> = [
    {
      stepKey: "WARN_T_MINUS_1",
      level: 0,
      daysRemaining: 1,
      timestamp: "2026-05-07T09:00:00+05:30",
      roles: [
        {
          role: "COMMITTEE_MEMBER",
          email: "committee.member@aicte.gov.in",
          phone: "+919820010002",
        },
        {
          role: "INSTITUTION",
          email: "institution@aicte.gov.in",
          phone: "+919820010001",
        },
      ],
      tplCode: "TPL_DEADLINE_WARNING_L0",
    },
    {
      stepKey: "OVERDUE_L0",
      level: 0,
      daysRemaining: 0,
      timestamp: "2026-05-08T09:00:00+05:30",
      roles: [
        {
          role: "COMMITTEE_MEMBER",
          email: "committee.member@aicte.gov.in",
          phone: "+919820010002",
        },
        {
          role: "INSTITUTION",
          email: "institution@aicte.gov.in",
          phone: "+919820010001",
        },
      ],
      tplCode: "TPL_DEADLINE_WARNING_L0",
    },
    {
      stepKey: "ESCALATION_L1",
      level: 1,
      daysRemaining: -1,
      timestamp: "2026-05-09T09:00:00+05:30",
      roles: [
        {
          role: "REGIONAL_OFFICER",
          email: "ro.western@aicte.gov.in",
          phone: "+919820010003",
        },
      ],
      tplCode: "TPL_ESCALATION_L1_REGIONAL_OFFICER",
    },
    {
      stepKey: "ESCALATION_L2",
      level: 2,
      daysRemaining: -3,
      timestamp: "2026-05-11T09:00:00+05:30",
      roles: [
        {
          role: "BUREAU_OFFICER",
          email: "bureau.officer@aicte.gov.in",
          phone: "+919820010004",
        },
      ],
      tplCode: "TPL_ESCALATION_L2_BUREAU_OFFICER",
    },
    {
      stepKey: "ESCALATION_L3",
      level: 3,
      daysRemaining: -7,
      timestamp: "2026-05-15T09:00:00+05:30",
      roles: [
        {
          role: "ADMIN",
          email: "admin@aicte.gov.in",
          phone: "+919820010005",
        },
      ],
      tplCode: "TPL_ESCALATION_L3_DESIGNATED_HEAD",
    },
  ];

  const inApp: InAppNotificationItem[] = [];
  const mailpit: MailpitMessageItem[] = [];
  const deliveries: DeliveryLogItem[] = [];
  let seq = 1;

  for (const step of steps) {
    const tpl =
      INITIAL_TEMPLATES.find((t) => t.code === step.tplCode) ||
      INITIAL_TEMPLATES[0];
    const vars = {
      institution,
      applicationId,
      dueDate,
      daysRemaining: step.daysRemaining,
      actionLink,
    };

    const subjectEn = renderHandlebars(tpl.subjectEn, vars);
    const bodyEn = renderHandlebars(tpl.bodyEn, vars);
    const subjectHi = renderHandlebars(tpl.subjectHi, vars);
    const bodyHi = renderHandlebars(tpl.bodyHi, vars);

    for (const r of step.roles) {
      const eventKey = `DUE-888001:${step.stepKey}`;

      inApp.unshift({
        id: `inapp-${seq}`,
        recipientRole: r.role,
        recipientEmail: r.email,
        applicationId,
        institution,
        escalationLevel: step.level,
        titleEn: subjectEn,
        bodyEn,
        titleHi: subjectHi,
        bodyHi,
        actionLink,
        isRead: false,
        readAt: null,
        eventKey,
        createdAt: step.timestamp,
      });

      mailpit.unshift({
        id: `mailpit-${seq}`,
        from: "statutory-alerts@aicte.gov.in",
        to: [r.email],
        recipientRole: r.role,
        escalationLevel: step.level,
        subjectEn,
        bodyEn,
        subjectHi,
        bodyHi,
        actionLink,
        smtpResponse: "250 2.0.0 Ok: queued in Mailpit (127.0.0.1:1025)",
        receivedAt: step.timestamp,
      });

      for (const ch of ["IN_APP", "EMAIL", "SMS"] as NotificationChannel[]) {
        deliveries.push({
          id: `dlv-${seq}-${ch.toLowerCase()}`,
          dedupKey: `${r.email}::${eventKey}::${ch}`,
          recipientEmail: r.email,
          recipientPhone: r.phone,
          recipientRole: r.role,
          eventKey,
          channel: ch,
          escalationLevel: step.level,
          templateCode: tpl.code,
          smsTemplateId: tpl.smsTemplateId,
          status: "DELIVERED",
          statusHistory: ["QUEUED", "SENT", "DELIVERED"],
          attemptNumber: 1,
          nextRetryBackoffMs: 0,
          lastError: null,
          deliveredAt: step.timestamp,
        });
      }
      seq++;
    }
  }

  // Add one sample transient FAILED delivery so the officer/admin can test Replay directly in the UI
  deliveries.unshift({
    id: "dlv-failed-sample-01",
    dedupKey: "ro.western@aicte.gov.in::DUE-888002:ESCALATION_L1::SMS",
    recipientEmail: "ro.western@aicte.gov.in",
    recipientPhone: "+919820010003",
    recipientRole: "REGIONAL_OFFICER",
    eventKey: "DUE-888002:ESCALATION_L1",
    channel: "SMS",
    escalationLevel: 1,
    templateCode: "TPL_ESCALATION_L1_REGIONAL_OFFICER",
    smsTemplateId: "DLT-AICTE-ESC-L1-RO-002",
    status: "FAILED",
    statusHistory: ["QUEUED", "SENT", "FAILED"],
    attemptNumber: 3,
    nextRetryBackoffMs: 4000,
    lastError: "SMS Gateway DLT timeout after 3 exponential backoff attempts",
    deliveredAt: null,
  });

  return { inApp, mailpit, deliveries };
}

interface NotificationsStoreState {
  inApp: InAppNotificationItem[];
  mailpit: MailpitMessageItem[];
  deliveries: DeliveryLogItem[];
  templates: TemplateVersionItem[];
  policies: EscalationPolicyItem[];
  demoClock: DemoClockBannerState;
}

const seedArtifacts = buildLadderArtifacts();

const memoryState: NotificationsStoreState = {
  inApp: seedArtifacts.inApp,
  mailpit: seedArtifacts.mailpit,
  deliveries: seedArtifacts.deliveries,
  templates: [...INITIAL_TEMPLATES],
  policies: [...INITIAL_POLICIES],
  demoClock: {
    isActive: true,
    offsetDays: 14,
    simulatedDateIso: "2026-05-15T09:00:00+05:30",
    bannerTextEn:
      "DEMO CLOCK ACTIVE (+14d offset • 15 May 2026 IST) — Escalation Ladder L0 → L3 Verified",
    bannerTextHi:
      "डेमो घड़ी सक्रिय (+14 दिन ऑफ़सेट • 15 मई 2026 IST) — वृद्धि सीढ़ी L0 → L3 सत्यापित",
  },
};

const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) {
    fn();
  }
}

export function subscribeNotificationsStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotificationsSnapshot(): NotificationsStoreState {
  return memoryState;
}

export function markNotificationRead(id: string): void {
  const item = memoryState.inApp.find((n) => n.id === id);
  if (item && !item.isRead) {
    item.isRead = true;
    item.readAt = memoryState.demoClock.simulatedDateIso;
    notifyListeners();
  }
}

export function markAllNotificationsRead(role?: string): void {
  for (const item of memoryState.inApp) {
    if (!role || role === "ALL" || item.recipientRole === role) {
      item.isRead = true;
      item.readAt = memoryState.demoClock.simulatedDateIso;
    }
  }
  notifyListeners();
}

export function replayFailedDeliveryById(id: string): DeliveryLogItem | null {
  const found = memoryState.deliveries.find((d) => d.id === id);
  if (!found) return null;
  found.status = "DELIVERED";
  found.statusHistory = [...found.statusHistory, "QUEUED", "SENT", "DELIVERED"];
  found.lastError = null;
  found.nextRetryBackoffMs = 0;
  found.deliveredAt = memoryState.demoClock.simulatedDateIso;
  notifyListeners();
  return found;
}

export function replayAllFailedDeliveries(): number {
  let count = 0;
  for (const d of memoryState.deliveries) {
    if (d.status === "FAILED") {
      d.status = "DELIVERED";
      d.statusHistory = [...d.statusHistory, "QUEUED", "SENT", "DELIVERED"];
      d.lastError = null;
      d.nextRetryBackoffMs = 0;
      d.deliveredAt = memoryState.demoClock.simulatedDateIso;
      count++;
    }
  }
  notifyListeners();
  return count;
}

export function triggerDemoClockEscalationLadderRun(): NotificationsStoreState {
  const fresh = buildLadderArtifacts();
  memoryState.inApp = fresh.inApp;
  memoryState.mailpit = fresh.mailpit;
  memoryState.deliveries = fresh.deliveries;
  memoryState.demoClock = {
    isActive: true,
    offsetDays: 14,
    simulatedDateIso: "2026-05-15T09:00:00+05:30",
    bannerTextEn:
      "DEMO CLOCK ACTIVE (+14d offset • 15 May 2026 IST) — Escalation Ladder L0 → L1 → L2 → L3 Executed",
    bannerTextHi:
      "डेमो घड़ी सक्रिय (+14 दिन ऑफ़सेट • 15 मई 2026 IST) — वृद्धि सीढ़ी L0 → L1 → L2 → L3 निष्पादित",
  };
  notifyListeners();
  return memoryState;
}

export function createTemplateVersionInStore(input: {
  code: string;
  name: string;
  smsTemplateId: string;
  subjectEn: string;
  bodyEn: string;
  subjectHi: string;
  bodyHi: string;
  smsBodyEn: string;
  smsBodyHi: string;
}): TemplateVersionItem {
  const existing = memoryState.templates.filter((t) => t.code === input.code);
  const nextVersion =
    existing.length > 0 ? Math.max(...existing.map((e) => e.version)) + 1 : 1;

  const created: TemplateVersionItem = {
    id: `tpl-v${nextVersion}-${input.code.toLowerCase()}`,
    code: input.code,
    version: nextVersion,
    name: input.name,
    smsTemplateId: input.smsTemplateId,
    subjectEn: input.subjectEn,
    bodyEn: input.bodyEn,
    subjectHi: input.subjectHi,
    bodyHi: input.bodyHi,
    smsBodyEn: input.smsBodyEn,
    smsBodyHi: input.smsBodyHi,
    isActive: true,
    createdAt: memoryState.demoClock.simulatedDateIso,
  };
  memoryState.templates = [created, ...memoryState.templates];
  notifyListeners();
  return created;
}

export function updatePolicyInStore(
  kind: DueItemKind,
  levels: EscalationLevelRuleItem[],
): EscalationPolicyItem | null {
  const idx = memoryState.policies.findIndex((p) => p.kind === kind);
  if (idx === -1) return null;
  let cumulative = 0;
  const normalized = levels.map((l) => {
    cumulative += Number(l.delayWorkingDaysAfterPrevious);
    return {
      ...l,
      cumulativeWorkingDaysOverdue: l.level === 0 ? 0 : cumulative,
    };
  });
  memoryState.policies[idx] = {
    ...memoryState.policies[idx],
    levels: normalized,
    updatedAt: memoryState.demoClock.simulatedDateIso,
  };
  notifyListeners();
  return memoryState.policies[idx];
}

export function syncDemoClockBannerInStore(params: {
  isActive: boolean;
  offsetDays: number;
  simulatedDateIso: string;
  bannerTextEn: string;
  bannerTextHi: string;
}) {
  memoryState.demoClock = {
    isActive: params.isActive,
    offsetDays: params.offsetDays,
    simulatedDateIso: params.simulatedDateIso,
    bannerTextEn: params.bannerTextEn,
    bannerTextHi: params.bannerTextHi,
  };
  notifyListeners();
  return memoryState.demoClock;
}

