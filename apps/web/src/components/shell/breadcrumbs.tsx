"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { useApp } from "@/lib/app-context";

export function Breadcrumbs() {
  const { t, user, activeNavKey } = useApp();
  const pathname = usePathname();
  const isGallery = pathname?.startsWith("/dev/components");
  const roleKey = user?.role || "INSTITUTION";

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center justify-between border-b border-border bg-surface px-4 py-1.5 text-xs text-text-muted"
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        <li className="inline-flex items-center gap-1">
          <Home className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          <Link
            href="/"
            className="font-medium text-text-primary hover:text-brand"
          >
            {t.portalName}
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3 w-3" />
        </li>
        {isGallery ? (
          <li aria-current="page" className="font-semibold text-brand">
            {t.nav.componentGallery} (/dev/components)
          </li>
        ) : (
          <>
            <li className="font-medium text-text-primary">
              {t.roles[roleKey]}
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3 w-3" />
            </li>
            <li aria-current="page" className="font-semibold text-brand">
              {t.nav[activeNavKey as keyof typeof t.nav] || t.nav.overview}
            </li>
          </>
        )}
      </ol>

      <div className="tabular-nums-data hidden items-center gap-2 text-[11px] sm:flex">
        <span>Cycle: AY 2026-27</span>
        <span>•</span>
        <span>Clock: ClockService (Deterministic)</span>
      </div>
    </nav>
  );
}
