import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Sse,
  MessageEvent,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { Observable, map } from "rxjs";
import { NotificationsService, DeliveryStatus } from "./notifications.service";
import { TemplateService, TemplateVariables } from "./template.service";
import {
  EscalationPolicyService,
  EscalationLevelRule,
  NotificationChannelType,
} from "./escalation-policy.service";
import { ChannelsService } from "./channels.service";
import { DueItemKind } from "../deadlines/due-item.service";

@ApiTags("Notifications & Escalation")
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly templateService: TemplateService,
    private readonly escalationPolicyService: EscalationPolicyService,
    private readonly channelsService: ChannelsService,
  ) {}

  @Sse("stream")
  @ApiOperation({
    summary:
      "Server-Sent Events (SSE) stream for real-time in-app notifications and unread counts",
  })
  streamInAppNotifications(): Observable<MessageEvent> {
    return this.channelsService.getSseStream().pipe(
      map((payload) => ({
        type: payload.data.type,
        data: payload.data,
      })),
    );
  }

  @Get("in-app")
  @ApiOperation({
    summary:
      "List in-app notifications with unread counts and deep links per role",
  })
  @ApiQuery({ name: "role", required: false })
  @ApiQuery({ name: "unreadOnly", required: false })
  listInAppNotifications(
    @Query("role") role?: string,
    @Query("unreadOnly") unreadOnly?: string,
  ) {
    return {
      items: this.channelsService.getInAppNotifications({
        role,
        unreadOnly: unreadOnly === "true",
      }),
      unreadCountsByRole: this.channelsService.getUnreadCountsByRole(),
    };
  }

  @Post("in-app/:id/read")
  @ApiOperation({ summary: "Mark a specific in-app notification as read" })
  markInAppAsRead(@Param("id") id: string) {
    return this.channelsService.markAsRead(id);
  }

  @Post("in-app/read-all")
  @ApiOperation({
    summary: "Mark all in-app notifications as read (optionally scoped by role)",
  })
  markAllInAppAsRead(@Body() body?: { role?: string }) {
    return this.channelsService.markAllAsRead(body?.role);
  }

  @Get("outbox/pending")
  @ApiOperation({ summary: "Get pending transactional outbox notifications" })
  @ApiResponse({
    status: 200,
    description: "Pending notifications count and items",
  })
  getPendingOutbox() {
    return this.notificationsService.getPendingOutbox();
  }

  @Post("outbox/process")
  @ApiOperation({
    summary:
      "Poll outbox_events, map each event using escalation policy, and deliver across IN_APP, EMAIL, SMS",
  })
  processOutbox() {
    return this.notificationsService.processOutboxEvents();
  }

  @Post("enqueue")
  @ApiOperation({ summary: "Enqueue a transactional outbox notification" })
  @ApiResponse({ status: 201, description: "Notification enqueued in outbox" })
  enqueueNotification(
    @Body()
    payload: {
      recipient: string;
      channel: "EMAIL" | "SMS" | "IN_APP";
      template: string;
      idempotencyKey: string;
    },
  ) {
    return this.notificationsService.enqueue(payload);
  }

  @Get("deliveries")
  @ApiOperation({
    summary: "List notification delivery logs (QUEUED, SENT, DELIVERED, FAILED)",
  })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "channel", required: false })
  @ApiQuery({ name: "recipientRole", required: false })
  listDeliveries(
    @Query("status") status?: DeliveryStatus,
    @Query("channel") channel?: NotificationChannelType,
    @Query("recipientRole") recipientRole?: string,
  ) {
    return this.notificationsService.getDeliveryLog({
      status,
      channel,
      recipientRole,
    });
  }

  @Get("deliveries/failed")
  @ApiOperation({ summary: "List failed notification deliveries for replay" })
  listFailedDeliveries() {
    return this.notificationsService.getFailedDeliveries();
  }

  @Post("deliveries/:id/replay")
  @ApiOperation({ summary: "Replay a specific failed notification delivery" })
  replayFailedDelivery(@Param("id") id: string) {
    return this.notificationsService.replayFailedDelivery(id);
  }

  @Post("deliveries/replay-all")
  @ApiOperation({ summary: "Replay all failed notification deliveries" })
  replayAllFailedDeliveries() {
    return this.notificationsService.replayAllFailedDeliveries();
  }

  @Get("mailpit/messages")
  @ApiOperation({ summary: "List captured Mailpit SMTP email messages" })
  @ApiQuery({ name: "role", required: false })
  listMailpitMessages(@Query("role") role?: string) {
    return this.channelsService.getMailpitMessages(role);
  }

  @Get("sms/messages")
  @ApiOperation({ summary: "List dispatched SMS gateway records" })
  listSmsMessages() {
    return this.channelsService.getSmsMessages();
  }

  @Get("templates")
  @ApiOperation({
    summary: "List versioned bilingual (English & Hindi) Handlebars templates",
  })
  listTemplates() {
    return this.templateService.listTemplates();
  }

  @Post("templates")
  @ApiOperation({
    summary:
      "Create a new immutable version of a notification template (English & Hindi)",
  })
  createTemplateVersion(
    @Body()
    body: {
      code: string;
      name: string;
      smsTemplateId: string;
      subjectEn: string;
      bodyEn: string;
      subjectHi: string;
      bodyHi: string;
      smsBodyEn: string;
      smsBodyHi: string;
    },
  ) {
    return this.templateService.createNewTemplateVersion(body);
  }

  @Post("templates/preview")
  @ApiOperation({
    summary:
      "Preview a Handlebars template in English (en) and Hindi (hi) with sample or custom variables",
  })
  previewTemplate(
    @Body()
    body: {
      code: string;
      version?: number;
      variables?: Partial<TemplateVariables>;
    },
  ) {
    const vars: TemplateVariables = {
      institution:
        body.variables?.institution ||
        "Walchand College of Engineering, Sangli",
      applicationId: body.variables?.applicationId || "APP-2026-WRO-00104",
      dueDate: body.variables?.dueDate || "2026-05-08",
      daysRemaining: body.variables?.daysRemaining ?? -3,
      actionLink:
        body.variables?.actionLink || "/applications/APP-2026-WRO-00104",
      stage: body.variables?.stage || "SCRUTINY",
      escalationLevel: body.variables?.escalationLevel ?? 1,
    };
    return this.templateService.render(body.code, vars, body.version);
  }

  @Get("policies")
  @ApiOperation({
    summary:
      "List escalation policies by DueItemKind (Levels 0..3, roles, working-day delays, templates)",
  })
  listPolicies() {
    return this.escalationPolicyService.listPolicies();
  }

  @Put("policies/:kind")
  @ApiOperation({
    summary: "Update escalation policy definition for a DueItemKind",
  })
  updatePolicy(
    @Param("kind") kind: DueItemKind,
    @Body() body: { levels: EscalationLevelRule[] },
  ) {
    return this.escalationPolicyService.updatePolicy(kind, body.levels);
  }

  @Post("verify-escalation-ladder")
  @ApiOperation({
    summary:
      "Push an overdue item through all levels (L0 -> L1 -> L2 -> L3) using the demo clock and return delivery log, Mailpit inbox, and in-app notifications per role",
  })
  verifyEscalationLadder(
    @Body() body?: { applicationId?: string; institution?: string },
  ) {
    return this.notificationsService.runDemoClockEscalationLadderVerification(
      body,
    );
  }
}
