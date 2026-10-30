"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Mail,
  Activity,
  RotateCcw,
  CheckCheck,
  ExternalLink,
  Clock,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { useApp } from "@/lib/app-context";
import {
  getNotificationsSnapshot,
  subscribeNotificationsStore,
  markNotificationRead,
  markAllNotificationsRead,
  replayFailedDeliveryById,
  replayAllFailedDeliveries,
  triggerDemoClockEscalationLadderRun,
} from "@/lib/notifications-client";

const ROLE_FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All Roles (Pan-Ladder View)" },
  { value: "INSTITUTION", label: "L0 • Institution" },
  { value: "COMMITTEE_MEMBER", label: "L0 • Responsible Officer (Scrutiny)" },
  { value: "REGIONAL_OFFICER", label: "L1 • Regional Officer (RO)" },
  { value: "BUREAU_OFFICER", label: "L2 • Approval Bureau Officer (HQ)" },
  { value: "ADMIN", label: "L3 • Designated Head (ADMIN)" },
];

export default function NotificationCentrePage() {
  const { locale } = useApp();
  const [store, setStore] = useState(() => getNotificationsSnapshot());
  const [activeTab, setActiveTab] = useState<
    "IN_APP" | "MAILPIT" | "DELIVERY_LOG"
  >("IN_APP");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    return subscribeNotificationsStore(() => {
      setStore({ ...getNotificationsSnapshot() });
    });
  }, []);

  const filteredInApp = store.inApp.filter(
    (n) => roleFilter === "ALL" || n.recipientRole === roleFilter,
  );
  const filteredMailpit = store.mailpit.filter(
    (m) => roleFilter === "ALL" || m.recipientRole === roleFilter,
  );
  const filteredDeliveries = store.deliveries.filter((d) => {
    if (roleFilter !== "ALL" && d.recipientRole !== roleFilter) return false;
    if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
    return true;
  });

  const failedDeliveriesCount = store.deliveries.filter(
    (d) => d.status === "FAILED",
  ).length;

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xs border border-brand bg-brand px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-brand-on">
                PHASE 6 • OUTBOX & ESCALATION
              </span>
              <span className="rounded-xs border border-border bg-surface-sunken px-2 py-0.5 font-mono text-[10px] font-semibold text-text-muted">
                ADVISORY NOTIFICATIONS ONLY
              </span>
            </div>
            <h1 className="mt-1.5 font-serif text-xl font-bold text-text-primary">
              {locale === "hi"
                ? "वैधानिक सूचना केंद्र, मेलपिट इनबॉक्स और वितरण लेजर"
                : "Statutory Notification Centre, Mailpit Inbox & Outbox Delivery Log"}
            </h1>
            <p className="mt-0.5 text-xs text-text-muted">
              {locale === "hi"
                ? "स्तर 0 (अधिकारी/संस्थान) → स्तर 1 (क्षेत्रीय अधिकारी) → स्तर 2 (ब्यूरो अधिकारी) → स्तर 3 (नामित प्रमुख)"
                : "At-least-once Outbox Processor deduplicated by (recipient, event_key, channel) across IN_APP (SSE), EMAIL (Mailpit), and SMS (DLT Mock Gateway)."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => triggerDemoClockEscalationLadderRun()}
              data-testid="run-demo-ladder-btn"
              className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-3 py-1.5 text-xs font-semibold text-brand-on hover:bg-brand-hover"
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {locale === "hi"
                  ? "डेमो घड़ी से L0 → L3 चलाएं"
                  : "Push Overdue Item L0 → L3 (Demo Clock)"}
              </span>
            </button>

            <Link
              href="/admin/notifications"
              className="inline-flex items-center gap-1.5 rounded-xs border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-brand"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-brand" />
              <span>
                {locale === "hi"
                  ? "टेम्पलेट्स और नीतियां (Admin)"
                  : "Templates & Escalation Policies"}
              </span>
            </Link>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-sm border border-border bg-surface-raised p-3">
            <div className="text-[11px] font-medium text-text-muted">
              In-App Notifications (All Roles)
            </div>
            <div className="tabular-nums-data mt-1 font-serif text-lg font-bold text-text-primary">
              {store.inApp.length}{" "}
              <span className="font-sans text-xs font-normal text-text-muted">
                ({store.inApp.filter((n) => !n.isRead).length} unread)
              </span>
            </div>
          </div>

          <div className="rounded-sm border border-border bg-surface-raised p-3">
            <div className="text-[11px] font-medium text-text-muted">
              Mailpit SMTP Captured (Port 1025)
            </div>
            <div className="tabular-nums-data mt-1 font-serif text-lg font-bold text-text-primary">
              {store.mailpit.length}{" "}
              <span className="font-sans text-xs font-normal text-sla-ontrack">
                250 OK
              </span>
            </div>
          </div>

          <div className="rounded-sm border border-border bg-surface-raised p-3">
            <div className="text-[11px] font-medium text-text-muted">
              Outbox Deliveries (DELIVERED)
            </div>
            <div className="tabular-nums-data mt-1 font-serif text-lg font-bold text-sla-ontrack">
              {
                store.deliveries.filter((d) => d.status === "DELIVERED")
                  .length
              }{" "}
              <span className="font-sans text-xs font-normal text-text-muted">
                / {store.deliveries.length} total
              </span>
            </div>
          </div>

          <div className="rounded-sm border border-border bg-surface-raised p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted">
                Failed Deliveries (Replay Queue)
              </span>
              {failedDeliveriesCount > 0 && (
                <button
                  type="button"
                  onClick={() => replayAllFailedDeliveries()}
                  className="inline-flex items-center gap-1 rounded-xs border border-sla-overdue bg-sla-overdue px-1.5 py-0.5 text-[10px] font-bold text-brand-on"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>Replay All</span>
                </button>
              )}
            </div>
            <div
              className={`tabular-nums-data mt-1 font-serif text-lg font-bold ${
                failedDeliveriesCount > 0
                  ? "text-sla-overdue"
                  : "text-text-primary"
              }`}
            >
              {failedDeliveriesCount}
            </div>
          </div>
        </div>

        {/* Filter Bar & View Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2.5">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "IN_APP"}
              onClick={() => setActiveTab("IN_APP")}
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                activeTab === "IN_APP"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>In-App Notifications per Role ({filteredInApp.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "MAILPIT"}
              onClick={() => setActiveTab("MAILPIT")}
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                activeTab === "MAILPIT"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Mailpit Email Inbox ({filteredMailpit.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "DELIVERY_LOG"}
              onClick={() => setActiveTab("DELIVERY_LOG")}
              className={`inline-flex items-center gap-1.5 rounded-xs border px-3 py-1.5 text-xs font-semibold ${
                activeTab === "DELIVERY_LOG"
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border bg-surface-raised text-text-primary hover:border-brand"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>
                Delivery Log & Failed Replay ({filteredDeliveries.length})
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-text-muted">
              <span>Role Filter:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xs border border-border bg-surface-raised px-2 py-1 text-xs font-semibold text-text-primary"
              >
                {ROLE_FILTERS.map((rf) => (
                  <option key={rf.value} value={rf.value}>
                    {rf.label}
                  </option>
                ))}
              </select>
            </label>

            {activeTab === "IN_APP" && (
              <button
                type="button"
                onClick={() => markAllNotificationsRead(roleFilter)}
                className="inline-flex items-center gap-1 rounded-xs border border-border bg-surface-raised px-2.5 py-1 text-xs font-semibold text-brand hover:border-brand"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark Shown Read</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: In-App Notifications per Role */}
        {activeTab === "IN_APP" && (
          <div className="overflow-x-auto rounded-sm border border-border bg-surface-raised">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2.5">Level</th>
                  <th className="px-3 py-2.5">Target Role</th>
                  <th className="px-3 py-2.5">Step Key</th>
                  <th className="px-3 py-2.5">
                    Notification Content ({locale.toUpperCase()})
                  </th>
                  <th className="px-3 py-2.5">State</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInApp.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      item.isRead ? "bg-surface-raised opacity-80" : "bg-surface"
                    }
                  >
                    <td className="px-3 py-2.5 align-top">
                      <span className="rounded-xs border border-brand bg-brand px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-on">
                        L{item.escalationLevel}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top font-mono text-[11px] font-semibold text-text-primary">
                      {item.recipientRole}
                      <div className="font-sans text-[10px] font-normal text-text-muted">
                        {item.recipientEmail}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top font-mono text-[11px] text-text-muted">
                      {item.eventKey}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="font-semibold text-text-primary">
                        {locale === "hi" ? item.titleHi : item.titleEn}
                      </div>
                      <div className="mt-0.5 text-[11px] text-text-muted">
                        {locale === "hi" ? item.bodyHi : item.bodyEn}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {item.isRead ? (
                        <span className="rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                          READ
                        </span>
                      ) : (
                        <span className="rounded-xs border border-sla-overdue bg-sla-overdue px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-on">
                          UNREAD
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={item.actionLink}
                          onClick={() => markNotificationRead(item.id)}
                          className="inline-flex items-center gap-1 rounded-xs border border-border bg-surface-raised px-2 py-1 text-[11px] font-semibold text-brand hover:border-brand"
                        >
                          <span>Dossier</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        {!item.isRead && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(item.id)}
                            className="rounded-xs border border-border bg-surface-sunken px-2 py-1 text-[11px] font-medium text-text-primary hover:border-brand"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Mailpit SMTP Email Inbox */}
        {activeTab === "MAILPIT" && (
          <div className="overflow-x-auto rounded-sm border border-border bg-surface-raised">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2.5">Message ID</th>
                  <th className="px-3 py-2.5">Level & Role</th>
                  <th className="px-3 py-2.5">Recipient (To)</th>
                  <th className="px-3 py-2.5">
                    Bilingual Subject & Body (EN / HI)
                  </th>
                  <th className="px-3 py-2.5">SMTP Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMailpit.map((msg) => (
                  <tr key={msg.id} className="bg-surface-raised">
                    <td className="px-3 py-2.5 align-top font-mono text-[11px] text-text-muted">
                      {msg.id}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span className="rounded-xs border border-brand bg-brand px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-on">
                        L{msg.escalationLevel}
                      </span>{" "}
                      <span className="font-mono text-[11px] font-semibold text-text-primary">
                        {msg.recipientRole}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top font-mono text-[11px] text-text-primary">
                      {msg.to.join(", ")}
                    </td>
                    <td className="px-3 py-2.5 align-top space-y-1">
                      <div className="font-semibold text-text-primary">
                        EN: {msg.subjectEn}
                      </div>
                      <div className="font-semibold text-brand">
                        HI: {msg.subjectHi}
                      </div>
                      <div className="text-[11px] text-text-muted">
                        {locale === "hi" ? msg.bodyHi : msg.bodyEn}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top font-mono text-[10px] text-sla-ontrack">
                      {msg.smtpResponse}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Outbox Delivery Log & Failed Replay */}
        {activeTab === "DELIVERY_LOG" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-muted">Filter by Status:</span>
                {(["ALL", "DELIVERED", "FAILED", "SENT", "QUEUED"] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-xs border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                        statusFilter === st
                          ? "border-brand bg-brand text-brand-on"
                          : "border-border bg-surface-raised text-text-primary"
                      }`}
                    >
                      {st}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-sm border border-border bg-surface-raised">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-2.5">Role & Recipient</th>
                    <th className="px-3 py-2.5">Channel</th>
                    <th className="px-3 py-2.5">Level & Event Key</th>
                    <th className="px-3 py-2.5">Template / SMS DLT ID</th>
                    <th className="px-3 py-2.5">Status Transitions</th>
                    <th className="px-3 py-2.5 text-right">Action / Replay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDeliveries.map((dlv) => (
                    <tr key={dlv.id} className="bg-surface-raised">
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-mono text-[11px] font-semibold text-text-primary">
                          {dlv.recipientRole}
                        </div>
                        <div className="font-mono text-[10px] text-text-muted">
                          {dlv.channel === "SMS"
                            ? dlv.recipientPhone
                            : dlv.recipientEmail}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono text-[11px] font-bold text-brand">
                        {dlv.channel}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <span className="rounded-xs border border-brand bg-brand px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-on">
                          L{dlv.escalationLevel}
                        </span>{" "}
                        <span className="font-mono text-[11px] text-text-muted">
                          {dlv.eventKey}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono text-[10px] text-text-muted">
                        <div>{dlv.templateCode}</div>
                        {dlv.channel === "SMS" && (
                          <div className="text-brand">
                            DLT: {dlv.smsTemplateId}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-mono text-[10px] text-text-primary">
                          {dlv.statusHistory.join(" → ")}
                        </div>
                        {dlv.lastError && (
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-sla-overdue">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>
                              {dlv.lastError} (backoff: {dlv.nextRetryBackoffMs}
                              ms)
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top text-right">
                        {dlv.status === "FAILED" ? (
                          <button
                            type="button"
                            onClick={() => replayFailedDeliveryById(dlv.id)}
                            data-testid={`replay-btn-${dlv.id}`}
                            className="inline-flex items-center gap-1 rounded-xs border border-sla-overdue bg-sla-overdue px-2.5 py-1 text-[11px] font-bold text-brand-on hover:opacity-90"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Replay Delivery</span>
                          </button>
                        ) : (
                          <span className="rounded-xs border border-sla-ontrack/40 bg-surface-sunken px-2 py-0.5 font-mono text-[10px] font-bold text-sla-ontrack">
                            {dlv.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
