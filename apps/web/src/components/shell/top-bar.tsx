"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, LogOut, Shield, User } from "lucide-react";
import { useApp, type StatutoryRole } from "@/lib/app-context";
import { cn } from "@/lib/utils";

interface RoleNavTab {
  label: string;
  labelHi: string;
  href: string;
}

const ROLE_TABS: Record<StatutoryRole, RoleNavTab[]> = {
  INSTITUTION: [
    {
      label: "Role Workspace",
      labelHi: "कार्यक्षेत्र",
      href: "/institution/workspace",
    },
    {
      label: "My Applications",
      labelHi: "मेरे आवेदन",
      href: "/institution/applications",
    },
    {
      label: "Undertakings & Evidence",
      labelHi: "वचनबद्धता एवं साक्ष्य",
      href: "/institution/undertakings",
    },
    {
      label: "Document Validity",
      labelHi: "दस्तावेज़ वैधता",
      href: "/institution/validity",
    },
  ],
  REGIONAL_OFFICER: [
    {
      label: "WRO Workbench",
      labelHi: "डब्ल्यूआरओ वर्कबेंच",
      href: "/regional/workbench",
    },
    {
      label: "Scrutiny Queue",
      labelHi: "संवीक्षा कतार",
      href: "/regional/scrutiny",
    },
    {
      label: "EVC Inspections",
      labelHi: "ईवीसी निरीक्षण",
      href: "/regional/evc",
    },
    {
      label: "SCN Management",
      labelHi: "कारण बताओ नोटिस",
      href: "/regional/scn",
    },
    {
      label: "Regional Pendency",
      labelHi: "क्षेत्रीय लंबितता",
      href: "/regional/pendency",
    },
  ],
  BUREAU_OFFICER: [
    {
      label: "Pan-India HQ Dashboard",
      labelHi: "मुख्यालय डैशबोर्ड",
      href: "/bureau/hq",
    },
    { label: "SCN Register", labelHi: "एससीएन रजिस्टर", href: "/bureau/scn" },
    {
      label: "Escalation L3 Register",
      labelHi: "एल-3 रजिस्टर",
      href: "/bureau/escalations",
    },
    {
      label: "Global Policy Matrix",
      labelHi: "नीति मैट्रिक्स",
      href: "/bureau/policy-matrix",
    },
  ],
  COMMITTEE_MEMBER: [
    {
      label: "Expert Panel Queue",
      labelHi: "विशेषज्ञ पैनल",
      href: "/committee/evc-visits",
    },
    {
      label: "SAC - Standing Appeals",
      labelHi: "एसएसी अपीलीय समिति",
      href: "/committee/sac",
    },
    {
      label: "SHC - Standing Hearings",
      labelHi: "एसएचसी सुनवाई समिति",
      href: "/committee/shc",
    },
  ],
  ADMIN: [
    {
      label: "System Governance",
      labelHi: "प्रणाली शासन",
      href: "/admin/governance",
    },
    {
      label: "Audit Tamper Console",
      labelHi: "ऑडिट कंसोल",
      href: "/admin/audit-tamper",
    },
    {
      label: "Time-Travel Simulator",
      labelHi: "समय-यात्रा",
      href: "/admin/time-travel",
    },
  ],
};

export function TopBar() {
  const { t, locale, toggleLocale, user, logout, setCommandPaletteOpen } =
    useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentRole: StatutoryRole = user?.role || "INSTITUTION";
  const roleTabs = ROLE_TABS[currentRole] || [];

  const isInstitution = currentRole === "INSTITUTION";
  const isRegional = currentRole === "REGIONAL_OFFICER";

  const displayName =
    user?.fullName ||
    (isInstitution
      ? "Sahyadri Institute of Technology"
      : isRegional
        ? "Western Regional Office"
        : "Authorized Statutory Officer");

  const displaySubtitle = isInstitution
    ? "Institution Desk (ID: 1-DEMO-4102)"
    : isRegional
      ? "WRO Statutory Desk (Mumbai)"
      : `${currentRole} Desk`;

  const initials = isInstitution
    ? "SI"
    : isRegional
      ? "RO"
      : displayName.slice(0, 2).toUpperCase() || "AI";

  const handleSignOut = () => {
    logout();
    router.push("/login?reason=session_terminated");
  };

  return (
    <div
      className="sticky top-0 z-50 w-full shrink-0 border-b border-[#E5E0D8] bg-white shadow-xs"
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* Top Header Bar */}
      <header
        className="flex h-16 items-center justify-between gap-4 px-6 lg:px-8 border-b border-[#F0ECE6] bg-white"
        style={{ backgroundColor: "#ffffff" }}
      >
        {/* Brand & AICTE Emblem */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            aria-label="SAMAY Home"
          >
            <div className="flex h-10 w-10 flex-col items-center justify-center rounded border border-[#E5E0D8] bg-[#FAFAFA] text-center shadow-2xs">
              <span className="text-[9px] font-bold tracking-tight text-[#2A1810] leading-none">
                AICTE
              </span>
              <span className="text-[7px] font-semibold tracking-tight text-[#EC642A] leading-none mt-0.5">
                SAMAY
              </span>
            </div>

            <div>
              <div className="font-serif text-lg font-bold tracking-tight text-[#2A1810] leading-tight">
                SAMAY
              </div>
              <div className="text-[11px] text-[#736357] leading-tight font-medium">
                Smart AICTE Monitoring &amp; Approval Yojana
              </div>
            </div>
          </Link>
        </div>

        {/* Global Search / Command Palette Trigger (Centered Omnibox) */}
        <div className="flex flex-1 max-w-md items-center justify-center">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label={`${t.searchPlaceholder} (${t.commandPaletteHint})`}
            className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[#E5E0D8] bg-[#FAFAFA] px-3.5 text-xs text-[#736357] hover:border-[#EC642A]/60 hover:bg-white transition-colors"
          >
            <span className="flex items-center gap-2 truncate">
              <Search
                className="h-3.5 w-3.5 shrink-0 text-[#8C7E75]"
                aria-hidden="true"
              />
              <span className="truncate text-[#8C7E75]">
                Search applications, institutions, clauses...
              </span>
            </span>
            <kbd className="tabular-nums-data shrink-0 rounded border border-[#E5E0D8] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#736357]">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-5 shrink-0">
          {/* Language Toggle: English / हिंदी */}
          <button
            type="button"
            onClick={toggleLocale}
            suppressHydrationWarning
            className="text-xs transition-colors cursor-pointer select-none"
            aria-label="Toggle Language"
          >
            <span
              className={cn(
                locale === "en"
                  ? "font-bold text-[#EC642A]"
                  : "text-[#736357] font-medium",
              )}
            >
              English
            </span>
            <span className="text-[#A89D95] mx-1">/</span>
            <span
              className={cn(
                locale === "hi"
                  ? "font-bold text-[#EC642A]"
                  : "text-[#736357] font-medium",
              )}
            >
              हिंदी
            </span>
          </button>

          {/* Clean Notification Bell Icon */}
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative p-1 text-[#2A1810] hover:text-[#EC642A] transition-colors"
          >
            <Bell className="h-4 w-4 stroke-[1.75]" />
          </Link>

          {/* User Profile Chip (Clean, Professional, No Mock Leaks) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              aria-expanded={showUserMenu}
              className="flex items-center gap-2.5 text-left rounded-md p-1 hover:bg-[#F5F2EB] transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFECE6] border border-[#E0DBD3] text-xs font-bold text-[#2A1810]">
                {initials}
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-xs font-bold text-[#2A1810] max-w-[170px] truncate">
                  {displayName}
                </div>
                <div className="text-[10px] text-[#736357]">
                  {displaySubtitle}
                </div>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-64 rounded-md border border-[#E5E0D8] bg-white p-3 shadow-lg z-50 space-y-3"
              >
                <div className="border-b border-[#E5E0D8] pb-2">
                  <div className="font-bold text-xs text-[#2A1810] truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-[#736357] truncate">
                    {user?.email || "officer@aicte.gov.in"}
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-[#EC642A]/10 px-2 py-0.5 text-[10px] font-bold text-[#EC642A]">
                    <Shield className="h-3 w-3" />
                    <span>Role: {currentRole}</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <Link
                    href="/institution/workspace"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-[#2A1810] hover:bg-[#FAFAFA]"
                  >
                    <User className="h-3.5 w-3.5 text-[#736357]" />
                    <span>Statutory Workspace</span>
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-[#2A1810] hover:bg-[#FAFAFA]"
                  >
                    <Bell className="h-3.5 w-3.5 text-[#736357]" />
                    <span>Regulatory Notices</span>
                  </Link>
                </div>

                <div className="border-t border-[#E5E0D8] pt-2">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out from Portal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Horizontal Role-Scoped Navigation Bar (Clean wrap layout, no horizontal scrolling) */}
      <nav
        aria-label="Role Statutory Navigation"
        className="w-full bg-white border-t border-[#F5F2EB] px-6 lg:px-8 py-1 overflow-x-hidden"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="flex flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-2">
          {roleTabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/" && pathname?.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "py-2.5 text-xs sm:text-sm transition-all border-b-2 -mb-[1px] whitespace-nowrap",
                  isActive
                    ? "font-semibold text-[#EC642A] border-[#EC642A]"
                    : "font-medium text-[#5C4D44] border-transparent hover:text-[#EC642A]",
                )}
              >
                <span>{locale === "hi" ? tab.labelHi : tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
