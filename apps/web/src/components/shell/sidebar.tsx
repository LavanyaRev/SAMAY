"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileSpreadsheet,
  SearchCheck,
  CalendarClock,
  FileCheck2,
  FileClock,
  BarChart3,
  ShieldCheck,
  Settings,
  SwatchBook,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp, type StatutoryRole } from "@/lib/app-context";

interface NavItemConfig {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: StatutoryRole[];
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    key: "overview",
    href: "/",
    icon: LayoutDashboard,
    allowedRoles: [
      "INSTITUTION",
      "REGIONAL_OFFICER",
      "BUREAU_OFFICER",
      "COMMITTEE_MEMBER",
      "ADMIN",
    ],
  },
  {
    key: "applications",
    href: "/?section=applications",
    icon: FileSpreadsheet,
    allowedRoles: [
      "INSTITUTION",
      "REGIONAL_OFFICER",
      "BUREAU_OFFICER",
      "ADMIN",
    ],
  },
  {
    key: "scrutinyQueue",
    href: "/?section=scrutiny",
    icon: SearchCheck,
    allowedRoles: ["REGIONAL_OFFICER", "COMMITTEE_MEMBER", "BUREAU_OFFICER"],
  },
  {
    key: "evcScheduling",
    href: "/?section=evc",
    icon: CalendarClock,
    allowedRoles: ["REGIONAL_OFFICER", "COMMITTEE_MEMBER", "BUREAU_OFFICER"],
  },
  {
    key: "undertakings",
    href: "/?section=undertakings",
    icon: FileCheck2,
    allowedRoles: ["INSTITUTION", "REGIONAL_OFFICER", "BUREAU_OFFICER"],
  },
  {
    key: "trackedDocuments",
    href: "/?section=documents",
    icon: FileClock,
    allowedRoles: ["INSTITUTION", "REGIONAL_OFFICER", "COMMITTEE_MEMBER"],
  },
  {
    key: "regionalPendency",
    href: "/?section=pendency",
    icon: BarChart3,
    allowedRoles: ["REGIONAL_OFFICER", "BUREAU_OFFICER", "ADMIN"],
  },
  {
    key: "auditLedger",
    href: "/?section=audit",
    icon: ShieldCheck,
    allowedRoles: ["BUREAU_OFFICER", "ADMIN"],
  },
  {
    key: "systemSettings",
    href: "/?section=settings",
    icon: Settings,
    allowedRoles: ["ADMIN"],
  },
];

export function Sidebar() {
  const { t, user, activeNavKey, setActiveNavKey } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const currentRole: StatutoryRole = user?.role || "INSTITUTION";

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(currentRole),
  );
  const isGalleryActive = pathname?.startsWith("/dev/components");
  const isNotificationsActive = pathname === "/notifications";
  const isAdminNotificationsActive = pathname?.startsWith(
    "/admin/notifications",
  );

  return (
    <aside
      aria-label="Statutory Portal Navigation"
      className="flex w-shell-sidebar shrink-0 flex-col border-r border-border bg-surface-sunken text-text-primary"
    >
      {/* Statutory Brand Emblem Header */}
      <div className="flex h-shell-topbar items-center gap-2.5 border-b border-border bg-surface-raised px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-brand bg-brand text-brand-on">
          <Landmark className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-serif text-sm font-bold tracking-tight text-text-primary">
            {t.portalName}
          </div>
          <div className="tabular-nums-data truncate text-[10px] font-medium uppercase tracking-wider text-text-muted">
            AICTE • APH 2024-27
          </div>
        </div>
      </div>

      {/* Role Scope Banner */}
      <div className="border-b border-border bg-surface px-4 py-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          {t.jurisdictionLabel}
        </div>
        <div className="mt-0.5 break-words text-xs font-semibold text-text-primary">
          {t.roles[currentRole]}
        </div>
        <div className="tabular-nums-data mt-0.5 text-[11px] text-text-muted">
          {currentRole === "REGIONAL_OFFICER"
            ? `WRO (${user?.regionCode || "Western Region"})`
            : currentRole === "INSTITUTION"
              ? "ID: 1-2000000001 (WRO)"
              : t.panIndiaHq}
        </div>
      </div>

      {/* Role-Scoped Navigation Links */}
      <nav
        aria-label="Role Navigation"
        className="flex-1 space-y-1 overflow-y-auto p-2.5"
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const label = t.nav[item.key as keyof typeof t.nav];
          const isActive = !isGalleryActive && activeNavKey === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setActiveNavKey(item.key);
                if (item.key === "applications" || item.key === "scrutinyQueue") {
                  router.push("/applications");
                } else if (item.key === "evcScheduling") {
                  router.push("/evc");
                } else if (item.key === "undertakings") {
                  router.push("/undertakings");
                } else if (item.key === "trackedDocuments") {
                  router.push("/documents");
                } else if (item.key === "regionalPendency") {
                  router.push("/dashboards");
                } else if (item.key === "auditLedger") {
                  router.push("/admin/dev-tools");
                } else if (item.key === "systemSettings") {
                  router.push("/admin/notifications");
                } else if (pathname !== "/") {
                  router.push("/");
                }
              }}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xs border px-3 py-2 text-left text-xs font-medium transition-colors",
                isActive
                  ? "border-brand bg-brand text-brand-on font-semibold"
                  : "border-transparent text-text-primary hover:border-border hover:bg-surface-raised",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="break-words leading-snug">{label}</span>
            </button>
          );
        })}

        <div className="my-2 space-y-1 border-t border-border pt-2">
          <Link
            href="/notifications"
            aria-current={isNotificationsActive ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xs border px-3 py-2 text-left text-xs font-medium transition-colors",
              isNotificationsActive
                ? "border-brand bg-brand text-brand-on font-semibold"
                : "border-border bg-surface-raised text-text-primary hover:border-brand",
            )}
          >
            <FileClock className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="break-words leading-snug">
              {t.notifications} & Mailpit
            </span>
          </Link>

          <Link
            href="/admin/notifications"
            aria-current={isAdminNotificationsActive ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xs border px-3 py-2 text-left text-xs font-medium transition-colors",
              isAdminNotificationsActive
                ? "border-brand bg-brand text-brand-on font-semibold"
                : "border-border bg-surface-raised text-text-primary hover:border-brand",
            )}
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="break-words leading-snug">
              Policies & Templates
            </span>
          </Link>

          <Link
            href="/dev/components"
            aria-current={isGalleryActive ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xs border px-3 py-2 text-left text-xs font-medium transition-colors",
              isGalleryActive
                ? "border-brand bg-brand text-brand-on font-semibold"
                : "border-border bg-surface-raised text-text-primary hover:border-brand",
            )}
          >
            <SwatchBook className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="break-words leading-snug">
              {t.nav.componentGallery}
            </span>
          </Link>
        </div>
      </nav>

      {/* Regulatory Safeguard Footer */}
      <div className="border-t border-border bg-surface px-3.5 py-2.5 text-[11px] text-text-muted">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase">
          <span>WCAG 2.1 AA</span>
          <span>RLS ACTIVE</span>
        </div>
        <p className="mt-1 leading-tight">
          Human Supremacy Enforced • No Autonomous Approvals
        </p>
      </div>
    </aside>
  );
}
