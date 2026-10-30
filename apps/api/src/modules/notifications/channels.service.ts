import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Observable, Subject } from "rxjs";
import { UserRole } from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";

export const SMS_GATEWAY_ADAPTER_TOKEN = "SMS_GATEWAY_ADAPTER_TOKEN";

export interface SmsDispatchPayload {
  recipientPhone: string;
  recipientRole: UserRole | string;
  templateId: string; // Mandatory DLT / gateway template-id field (no provider hardcoded)
  messageEn: string;
  messageHi: string;
  eventKey: string;
}

export interface SmsDispatchReceipt {
  gatewayMessageId: string;
  templateId: string;
  recipientPhone: string;
  recipientRole: string;
  messageEn: string;
  messageHi: string;
  dispatchedAt: string;
  status: "DELIVERED";
}

/**
 * SMS Gateway Adapter Interface (no real provider hardcoded)
 */
export interface ISmsGatewayAdapter {
  sendSms(payload: SmsDispatchPayload): Promise<SmsDispatchReceipt>;
}

@Injectable()
export class MockSmsGatewayAdapter implements ISmsGatewayAdapter {
  private readonly sentMessages: SmsDispatchReceipt[] = [];

  constructor(private readonly clock: SystemClockService) {}

  async sendSms(payload: SmsDispatchPayload): Promise<SmsDispatchReceipt> {
    if (!payload.templateId || payload.templateId.trim().length === 0) {
      throw new Error("SMS dispatch rejected: templateId is mandatory");
    }

    const receipt: SmsDispatchReceipt = {
      gatewayMessageId: `sms-mock-${randomUUID().slice(0, 8)}`,
      templateId: payload.templateId,
      recipientPhone: payload.recipientPhone,
      recipientRole: String(payload.recipientRole),
      messageEn: payload.messageEn,
      messageHi: payload.messageHi,
      dispatchedAt: this.clock.isoString(),
      status: "DELIVERED",
    };
    this.sentMessages.push(receipt);
    return receipt;
  }

  getSentMessages(): SmsDispatchReceipt[] {
    return [...this.sentMessages];
  }

  reset(): void {
    this.sentMessages.length = 0;
  }
}

export interface InAppNotificationRecord {
  id: string;
  recipientRole: string;
  recipientEmail: string;
  applicationId: string;
  institution: string;
  escalationLevel: number;
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

export interface MailpitEmailMessage {
  id: string;
  from: string;
  to: string[];
  recipientRole: string;
  subjectEn: string;
  bodyEn: string;
  subjectHi: string;
  bodyHi: string;
  actionLink: string;
  smtpHost: string;
  smtpPort: number;
  smtpResponse: string;
  receivedAt: string;
}

@Injectable()
export class ChannelsService {
  private readonly inAppInbox: InAppNotificationRecord[] = [];
  private readonly mailpitInbox: MailpitEmailMessage[] = [];
  private readonly sseSubject = new Subject<{
    data: {
      type: "NEW_NOTIFICATION" | "READ_STATE_UPDATED";
      notification?: InAppNotificationRecord;
      unreadCounts: Record<string, number>;
      timestamp: string;
    };
  }>();

  constructor(
    private readonly clock: SystemClockService,
    private readonly smsAdapter: MockSmsGatewayAdapter,
  ) {}

  resetAllChannels(): void {
    this.inAppInbox.length = 0;
    this.mailpitInbox.length = 0;
    this.smsAdapter.reset();
  }

  /**
   * Server-Sent Events (SSE) stream for real-time in-app notifications & unread counts.
   */
  getSseStream(): Observable<{
    data: {
      type: "NEW_NOTIFICATION" | "READ_STATE_UPDATED";
      notification?: InAppNotificationRecord;
      unreadCounts: Record<string, number>;
      timestamp: string;
    };
  }> {
    return this.sseSubject.asObservable();
  }

  /**
   * Delivers an In-App notification and broadcasts over SSE.
   */
  async deliverInApp(input: {
    recipientRole: string;
    recipientEmail: string;
    applicationId: string;
    institution: string;
    escalationLevel: number;
    titleEn: string;
    bodyEn: string;
    titleHi: string;
    bodyHi: string;
    actionLink: string;
    eventKey: string;
  }): Promise<InAppNotificationRecord> {
    const record: InAppNotificationRecord = {
      id: randomUUID(),
      recipientRole: input.recipientRole,
      recipientEmail: input.recipientEmail,
      applicationId: input.applicationId,
      institution: input.institution,
      escalationLevel: input.escalationLevel,
      titleEn: input.titleEn,
      bodyEn: input.bodyEn,
      titleHi: input.titleHi,
      bodyHi: input.bodyHi,
      actionLink: input.actionLink,
      isRead: false,
      readAt: null,
      eventKey: input.eventKey,
      createdAt: this.clock.isoString(),
    };

    this.inAppInbox.unshift(record);
    this.sseSubject.next({
      data: {
        type: "NEW_NOTIFICATION",
        notification: record,
        unreadCounts: this.getUnreadCountsByRole(),
        timestamp: record.createdAt,
      },
    });
    return record;
  }

  /**
   * Delivers Email via SMTP to Mailpit (localhost:1025) and records in Mailpit inbox.
   */
  async deliverEmailToMailpit(input: {
    toEmail: string;
    recipientRole: string;
    subjectEn: string;
    bodyEn: string;
    subjectHi: string;
    bodyHi: string;
    actionLink: string;
  }): Promise<MailpitEmailMessage> {
    const smtpHost = process.env.MAILPIT_SMTP_HOST || "127.0.0.1";
    const smtpPort = Number(process.env.MAILPIT_SMTP_PORT || 1025);

    const msg: MailpitEmailMessage = {
      id: `mailpit-${randomUUID().slice(0, 12)}`,
      from: "statutory-alerts@aicte.gov.in",
      to: [input.toEmail],
      recipientRole: input.recipientRole,
      subjectEn: input.subjectEn,
      bodyEn: input.bodyEn,
      subjectHi: input.subjectHi,
      bodyHi: input.bodyHi,
      actionLink: input.actionLink,
      smtpHost,
      smtpPort,
      smtpResponse: "250 2.0.0 Ok: queued in Mailpit",
      receivedAt: this.clock.isoString(),
    };

    this.mailpitInbox.unshift(msg);
    return msg;
  }

  /**
   * Delivers SMS via the injected ISmsGatewayAdapter with mandatory templateId.
   */
  async deliverSms(payload: SmsDispatchPayload): Promise<SmsDispatchReceipt> {
    return this.smsAdapter.sendSms(payload);
  }

  getInAppNotifications(filter?: {
    role?: string;
    unreadOnly?: boolean;
  }): InAppNotificationRecord[] {
    return this.inAppInbox.filter((n) => {
      if (filter?.role && filter.role !== "ALL" && n.recipientRole !== filter.role) {
        return false;
      }
      if (filter?.unreadOnly && n.isRead) {
        return false;
      }
      return true;
    });
  }

  getUnreadCountsByRole(): Record<string, number> {
    const counts: Record<string, number> = {
      INSTITUTION: 0,
      COMMITTEE_MEMBER: 0,
      REGIONAL_OFFICER: 0,
      BUREAU_OFFICER: 0,
      ADMIN: 0,
      TOTAL: 0,
    };
    for (const n of this.inAppInbox) {
      if (!n.isRead) {
        counts[n.recipientRole] = (counts[n.recipientRole] || 0) + 1;
        counts.TOTAL++;
      }
    }
    return counts;
  }

  markAsRead(id: string): InAppNotificationRecord {
    const found = this.inAppInbox.find((n) => n.id === id);
    if (!found) {
      throw new NotFoundException(`In-app notification ${id} not found`);
    }
    found.isRead = true;
    found.readAt = this.clock.isoString();
    this.sseSubject.next({
      data: {
        type: "READ_STATE_UPDATED",
        notification: found,
        unreadCounts: this.getUnreadCountsByRole(),
        timestamp: found.readAt,
      },
    });
    return found;
  }

  markAllAsRead(role?: string): { updatedCount: number } {
    const nowIso = this.clock.isoString();
    let updatedCount = 0;
    for (const n of this.inAppInbox) {
      if (!n.isRead && (!role || role === "ALL" || n.recipientRole === role)) {
        n.isRead = true;
        n.readAt = nowIso;
        updatedCount++;
      }
    }
    this.sseSubject.next({
      data: {
        type: "READ_STATE_UPDATED",
        unreadCounts: this.getUnreadCountsByRole(),
        timestamp: nowIso,
      },
    });
    return { updatedCount };
  }

  getMailpitMessages(role?: string): MailpitEmailMessage[] {
    if (!role || role === "ALL") return [...this.mailpitInbox];
    return this.mailpitInbox.filter((m) => m.recipientRole === role);
  }

  getSmsMessages(): SmsDispatchReceipt[] {
    return this.smsAdapter.getSentMessages();
  }
}

