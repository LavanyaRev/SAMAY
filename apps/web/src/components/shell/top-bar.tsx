"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Sun,
  Moon,
  Languages,
  UserCheck,
  LogOut,
  ChevronDown,
  Clock,
  ExternalLink,
  CheckCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useApp, type StatutoryRole } from "@/lib/app-context";
import { DEMO_ROLE_ACCOUNTS } from "@/lib/mock-data";
import {
  getNotificationsSnapshot,
  subscribeNotificationsStore,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications-client";

export function TopBar() {
  const {
    t,
    theme,
    toggleTheme,
    locale,
    toggleLocale,
    user,
    logout,
    loginWithApi,
    setCommandPaletteOpen,
  } = useApp();
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [storeState, setStoreState] = useState(() =>
    getNotificationsSnapshot(),
  );

  useEffect(() => {
    return subscribeNotificationsStore(() => {
      setStoreState({ ...getNotificationsSnapshot() });
    });
  }, []);

  const currentRole: StatutoryRole = user?.role || "INSTITUTION";
  const roleScopedNotifications = storeState.inApp.filter(
    (item) => item.recipientRole === currentRole,
  );
  const unreadCount = roleScopedNotifications.filter((n) => !n.isRead).length;

  const handleQuickRoleSwitch = async (role: StatutoryRole) => {
    const account = DEMO_ROLE_ACCOUNTS.find((a) => a.role === role);
    if (!account) return;
    await loginWithApi(account.email, account.password);
    setShowUserMenu(false);
  };

  return (
    <div className="shrink-0">
      {/* Visible Demo Clock Active Banner */}
      {storeState.demoClock.isActive && (
        <div
          role="status"
          aria-live="polite"
          data-testid="demo-clock-banner"
          className="flex items-center justify-between gap-2 border-b border-border bg-brand px-4 py-1 text-[11px] font-semibold text-brand-on"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {locale === "hi"
                ? storeState.demoClock.bannerTextHi
                : storeState.demoClock.bannerTextEn}
            </span>
          </span>
          <Link
            href="/notifications"
            className="shrink-0 rounded-xs border border-brand-on/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-on hover:bg-brand-hover"
          >
            {locale === "hi" ? "वृद्धि लॉग देखें" : "Inspect Escalation Ladder"}
          </Link>
        </div>
      )}

      <header className="flex h-shell-topbar shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-raised px-4">
        {/* Search / Command Palette Trigger */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label={`${t.searchPlaceholder} (${t.commandPaletteHint})`}
          className="flex h-8 w-full max-w-md items-center justify-between gap-2 rounded-xs border border-border bg-surface px-3 text-xs text-text-muted hover:border-brand"
        >
          <span className="flex items-center gap-2 truncate">
            <Search
              className="h-3.5 w-3.5 shrink-0 text-text-muted"
              aria-hidden="true"
            />
            <span className="truncate">{t.searchPlaceholder}</span>
          </span>
          <kbd className="tabular-nums-data shrink-0 rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold text-text-primary">
            {t.commandPaletteHint}
          </kbd>
        </button>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-2">
          {/* Bilingual Toggle (EN / हिन्दी) */}
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={`Switch language to ${t.languageToggleLabel}`}
            data-testid="locale-toggle-btn"
            className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-border bg-surface px-2.5 text-xs font-semibold text-text-primary hover:border-brand"
          >
            <Languages className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            <span>{locale === "en" ? "हिन्दी" : "English"}</span>
          </button>

          {/* Light / Dark Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "Dark" : "Light"} theme`}
            data-testid="theme-toggle-btn"
            className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-border bg-surface px-2.5 text-xs font-medium text-text-primary hover:border-brand"
          >
            {theme === "light" ? (
              <>
                <Moon className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                <span className="hidden sm:inline">{t.themeDark}</span>
              </>
            ) : (
              <>
                <Sun className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                <span className="hidden sm:inline">{t.themeLight}</span>
              </>
            )}
          </button>

          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotif((prev) => !prev);
                setShowUserMenu(false);
              }}
              aria-label={`${t.notifications} (${unreadCount} unread)`}
              aria-expanded={showNotif}
              data-testid="notification-bell-btn"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-xs border border-border bg-surface text-text-primary hover:border-brand"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  data-testid="notification-unread-badge"
                  className="tabular-nums-data absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-xs border border-surface bg-sla-overdue px-1 text-[10px] font-bold text-brand-on"
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div
                role="region"
                aria-label={t.notifications}
                className="absolute right-0 z-40 mt-1.5 w-96 rounded-sm border border-border bg-surface-raised shadow-overlay"
              >
                <div className="flex items-center justify-between border-b border-border bg-surface-sunken px-3 py-2">
                  <div>
                    <span className="font-serif text-xs font-bold text-text-primary">
                      {t.notifications} ({currentRole})
                    </span>
                    <span className="ml-2 rounded-xs border border-border bg-surface px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-brand">
                      SSE LIVE
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => markAllNotificationsRead(currentRole)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                  >
                    <CheckCheck className="h-3 w-3" aria-hidden="true" />
                    <span>{t.markAllRead}</span>
                  </button>
                </div>

                <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                  {roleScopedNotifications.length === 0 ? (
                    <li className="p-4 text-center text-xs text-text-muted">
                      No in-app notifications for role {currentRole}.
                    </li>
                  ) : (
                    roleScopedNotifications.map((item) => (
                      <li
                        key={item.id}
                        className={`p-3 text-xs space-y-1.5 transition-colors ${
                          item.isRead ? "bg-surface-raised opacity-75" : "bg-surface"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="rounded-xs border border-brand bg-brand px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-on">
                              L{item.escalationLevel}
                            </span>
                            <span className="rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-text-muted">
                              ADVISORY
                            </span>
                          </span>
                          <span className="tabular-nums-data text-[10px] text-text-muted">
                            {item.createdAt.slice(0, 10)}
                          </span>
                        </div>
                        <p className="font-semibold text-text-primary leading-snug">
                          {locale === "hi" ? item.titleHi : item.titleEn}
                        </p>
                        <p className="text-[11px] text-text-muted line-clamp-2">
                          {locale === "hi" ? item.bodyHi : item.bodyEn}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <Link
                            href={item.actionLink}
                            onClick={() => {
                              markNotificationRead(item.id);
                              setShowNotif(false);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                          >
                            <span>
                              {locale === "hi"
                                ? "आवेदन खोलें"
                                : "Open Dossier"}
                            </span>
                            <ExternalLink
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                          </Link>
                          {!item.isRead && (
                            <button
                              type="button"
                              onClick={() => markNotificationRead(item.id)}
                              className="text-[10px] font-medium text-text-muted hover:text-text-primary"
                            >
                              {locale === "hi" ? "पढ़ा हुआ चिह्नित करें" : "Mark read"}
                            </button>
                          )}
                        </div>
                      </li>
                    ))
                  )}
                </ul>

                <div className="flex items-center justify-between border-t border-border bg-surface-sunken px-3 py-2 text-[11px]">
                  <Link
                    href="/notifications"
                    onClick={() => setShowNotif(false)}
                    className="font-semibold text-brand hover:underline"
                  >
                    {locale === "hi"
                      ? "सूचना केंद्र और मेलपिट इनबॉक्स →"
                      : "Notification Centre & Mailpit →"}
                  </Link>
                  <Link
                    href="/admin/notifications"
                    onClick={() => setShowNotif(false)}
                    className="inline-flex items-center gap-1 font-medium text-text-muted hover:text-text-primary"
                  >
                    <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
                    <span>{locale === "hi" ? "नीतियां" : "Policies"}</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUserMenu((prev) => !prev);
                setShowNotif(false);
              }}
              aria-expanded={showUserMenu}
              aria-label="Authenticated User Menu"
              data-testid="user-menu-btn"
              className="inline-flex h-8 items-center gap-2 rounded-xs border border-border bg-surface px-2.5 text-xs text-text-primary hover:border-brand"
            >
              <UserCheck className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              <span className="max-w-[140px] truncate font-semibold">
                {user?.fullName || "Dr. Arvind Kulkarni"}
              </span>
              <span className="tabular-nums-data hidden rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold text-text-muted md:inline">
                {user?.role || "INSTITUTION"}
              </span>
              <ChevronDown
                className="h-3 w-3 text-text-muted"
                aria-hidden="true"
              />
            </button>

            {showUserMenu && (
              <div
                role="menu"
                className="absolute right-0 z-40 mt-1.5 w-72 rounded-sm border border-border bg-surface-raised p-2 shadow-overlay"
              >
                <div className="border-b border-border px-2.5 py-2">
                  <div className="font-serif text-xs font-bold text-text-primary">
                    {user?.fullName}
                  </div>
                  <div className="tabular-nums-data text-[11px] text-text-muted">
                    {user?.email}
                  </div>
                  <div className="mt-1 inline-block rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand">
                    ROLE: {user?.role}
                  </div>
                </div>

                <div className="border-b border-border py-1.5">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Switch Statutory Role Session
                  </div>
                  {DEMO_ROLE_ACCOUNTS.map((acct) => (
                    <button
                      key={acct.role}
                      type="button"
                      onClick={() => handleQuickRoleSwitch(acct.role)}
                      className="flex w-full items-center justify-between rounded-xs px-2.5 py-1.5 text-left text-xs text-text-primary hover:bg-surface-sunken"
                    >
                      <span>{locale === "hi" ? acct.labelHi : acct.label}</span>
                      <span className="tabular-nums-data text-[10px] text-text-muted">
                        {acct.regionBadge}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                      router.push("/login");
                    }}
                    className="flex w-full items-center gap-2 rounded-xs px-2.5 py-1.5 text-left text-xs font-semibold text-sla-overdue hover:bg-surface-sunken"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.signOut}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
