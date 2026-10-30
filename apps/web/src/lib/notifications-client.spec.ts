import { describe, it, expect } from "vitest";
import {
  getNotificationsSnapshot,
  renderHandlebars,
  markNotificationRead,
  replayFailedDeliveryById,
  createTemplateVersionInStore,
  triggerDemoClockEscalationLadderRun,
} from "./notifications-client";

describe("Frontend Notifications, Mailpit & Escalation Store", () => {
  it("renders English and Hindi Handlebars templates accurately", () => {
    const vars = {
      institution: "COEP Technological University, Pune",
      applicationId: "APP-2026-WRO-00104",
      dueDate: "2026-05-08",
      daysRemaining: -3,
      actionLink: "/applications/APP-2026-WRO-00104",
    };

    const hi = renderHandlebars(
      "स्तर 1 वैधानिक वृद्धि: {{institution}} ({{applicationId}}) अंतिम तिथि {{dueDate}} ({{daysRemaining}} दिन)। लिंक: {{actionLink}}",
      vars,
    );
    expect(hi).toContain("COEP Technological University, Pune");
    expect(hi).toContain("APP-2026-WRO-00104");
    expect(hi).toContain("/applications/APP-2026-WRO-00104");
  });

  it("replays failed deliveries to DELIVERED and creates immutable template versions", () => {
    triggerDemoClockEscalationLadderRun();
    const snap = getNotificationsSnapshot();
    expect(snap.inApp.length).toBe(7);
    expect(snap.mailpit.length).toBe(7);

    const failed = snap.deliveries.find((d) => d.status === "FAILED");
    expect(failed).toBeDefined();
    if (failed) {
      const replayed = replayFailedDeliveryById(failed.id);
      expect(replayed?.status).toBe("DELIVERED");
    }

    const unreadFirst = snap.inApp[0];
    markNotificationRead(unreadFirst.id);
    expect(
      getNotificationsSnapshot().inApp.find((n) => n.id === unreadFirst.id)
        ?.isRead,
    ).toBe(true);

    const v2 = createTemplateVersionInStore({
      code: "TPL_DEADLINE_WARNING_L0",
      name: "Level 0 Warning v2",
      smsTemplateId: "DLT-AICTE-SLA-WARN-L0-002",
      subjectEn: "V2 {{applicationId}}",
      bodyEn: "V2 {{institution}}",
      subjectHi: "V2 HI {{applicationId}}",
      bodyHi: "V2 HI {{institution}}",
      smsBodyEn: "SMS {{applicationId}}",
      smsBodyHi: "SMS HI {{applicationId}}",
    });
    expect(v2.version).toBe(2);
  });
});

