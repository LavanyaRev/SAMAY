import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { SystemClockService } from "../../common/clock/clock.service";

export interface TemplateVariables {
  institution: string;
  applicationId: string;
  dueDate: string;
  daysRemaining: number | string;
  actionLink: string;
  stage?: string;
  escalationLevel?: number | string;
  recipientName?: string;
}

export interface NotificationTemplateVersion {
  id: string;
  code: string;
  version: number;
  name: string;
  smsTemplateId: string; // Mandatory template-id field for SMS gateway adapter
  subjectEn: string;
  bodyEn: string;
  subjectHi: string;
  bodyHi: string;
  smsBodyEn: string;
  smsBodyHi: string;
  isActive: boolean;
  createdAt: string;
}

export interface RenderedTemplateOutput {
  templateCode: string;
  templateVersion: number;
  smsTemplateId: string;
  en: {
    subject: string;
    body: string;
    sms: string;
  };
  hi: {
    subject: string;
    body: string;
    sms: string;
  };
}

/**
 * Deterministic Handlebars-compatible template engine supporting `{{variable}}`
 * and `{{#if var}}...{{/if}}` blocks without eval/unsafe dynamic code.
 */
export function renderHandlebarsTemplate(
  templateStr: string,
  variables: Record<string, unknown>,
): string {
  // Handle {{#if key}}...{{/if}} blocks
  let result = templateStr.replace(
    /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, key: string, inner: string) => {
      const val = variables[key];
      return val !== undefined && val !== null && val !== false && val !== ""
        ? inner
        : "";
    },
  );

  // Replace {{variable}} placeholders
  result = result.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_match, key: string) => {
      const val = variables[key];
      return val !== undefined && val !== null ? String(val) : "";
    },
  );

  return result;
}

const SEEDED_TEMPLATES: Array<
  Omit<NotificationTemplateVersion, "id" | "createdAt">
> = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];

@Injectable()
export class TemplateService {
  private readonly templates: NotificationTemplateVersion[] = [];

  constructor(private readonly clock: SystemClockService) {
    this.resetDefaultTemplates();
  }

  resetDefaultTemplates(): void {
    this.templates.length = 0;
    const nowIso = this.clock.isoString();
    for (const tpl of SEEDED_TEMPLATES) {
      this.templates.push({
        ...tpl,
        id: randomUUID(),
        createdAt: nowIso,
      });
    }
  }

  listTemplates(): NotificationTemplateVersion[] {
    return [...this.templates].sort((a, b) =>
      a.code === b.code ? b.version - a.version : a.code.localeCompare(b.code),
    );
  }

  getActiveTemplate(code: string): NotificationTemplateVersion {
    const matching = this.templates
      .filter((t) => t.code === code && t.isActive)
      .sort((a, b) => b.version - a.version);
    if (matching.length === 0) {
      throw new NotFoundException(`Active template "${code}" not found`);
    }
    return matching[0];
  }

  /**
   * Creates a new immutable version of a template without mutating previous versions.
   */
  createNewTemplateVersion(input: {
    code: string;
    name: string;
    smsTemplateId: string;
    subjectEn: string;
    bodyEn: string;
    subjectHi: string;
    bodyHi: string;
    smsBodyEn: string;
    smsBodyHi: string;
  }): NotificationTemplateVersion {
    const existingVersions = this.templates.filter(
      (t) => t.code === input.code,
    );
    const nextVersion =
      existingVersions.length > 0
        ? Math.max(...existingVersions.map((t) => t.version)) + 1
        : 1;

    const created: NotificationTemplateVersion = {
      id: randomUUID(),
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
      createdAt: this.clock.isoString(),
    };

    this.templates.push(created);
    return created;
  }

  /**
   * Renders English and Hindi Handlebars templates for a template code and variables.
   */
  render(
    code: string,
    variables: TemplateVariables,
    version?: number,
  ): RenderedTemplateOutput {
    const tpl = version
      ? this.templates.find((t) => t.code === code && t.version === version)
      : this.getActiveTemplate(code);

    if (!tpl) {
      throw new NotFoundException(
        `Template ${code}${version ? `@v${version}` : ""} not found`,
      );
    }

    const varsRecord: Record<string, unknown> = { ...variables };

    return {
      templateCode: tpl.code,
      templateVersion: tpl.version,
      smsTemplateId: tpl.smsTemplateId,
      en: {
        subject: renderHandlebarsTemplate(tpl.subjectEn, varsRecord),
        body: renderHandlebarsTemplate(tpl.bodyEn, varsRecord),
        sms: renderHandlebarsTemplate(tpl.smsBodyEn, varsRecord),
      },
      hi: {
        subject: renderHandlebarsTemplate(tpl.subjectHi, varsRecord),
        body: renderHandlebarsTemplate(tpl.bodyHi, varsRecord),
        sms: renderHandlebarsTemplate(tpl.smsBodyHi, varsRecord),
      },
    };
  }
}

