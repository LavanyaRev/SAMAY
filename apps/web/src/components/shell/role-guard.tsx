"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";
import { useApp, type StatutoryRole } from "@/lib/app-context";

interface RoleGuardProps {
  allowedRoles: StatutoryRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isAuthReady } = useApp();

  if (!isAuthReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-xs text-text-muted">
        Verifying statutory authorization…
      </div>
    );
  }

  const currentRole = user?.role || "INSTITUTION";
  const hasAccess = allowedRoles.includes(currentRole);

  if (!hasAccess) {
    const defaultRolePath =
      currentRole === "INSTITUTION"
        ? "/institution/workspace"
        : currentRole === "REGIONAL_OFFICER"
          ? "/regional/workbench"
          : currentRole === "BUREAU_OFFICER"
            ? "/bureau/hq"
            : currentRole === "COMMITTEE_MEMBER"
              ? "/committee/panel-queue"
              : "/admin/governance";

    return (
      <div className="mx-auto my-12 flex max-w-lg flex-col items-center justify-center rounded-sm border border-border bg-surface-raised p-8 text-center shadow-none">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sla-overdue/10 text-sla-overdue">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-sla-overdue">
          <Lock className="h-3.5 w-3.5" />
          <span>Statutory Jurisdiction Barrier • HTTP 403</span>
        </div>

        <h1 className="mt-2 font-serif text-xl font-bold text-text-primary">
          Access Restricted by AICTE Governance
        </h1>

        <p className="mt-2.5 text-xs text-text-muted leading-relaxed">
          Under AICTE Approval Process Handbook (APH 2024-27) security mandates,
          your authenticated role (
          <span className="font-semibold text-text-primary">{currentRole}</span>
          ) is strictly segregated from this administrative workspace. This
          access attempt has been logged to the statutory audit ledger.
        </p>

        <div className="mt-6">
          <Link
            href={defaultRolePath}
            className="inline-flex h-9 items-center gap-2 rounded-xs border border-brand bg-brand px-4 text-xs font-semibold text-brand-on hover:bg-brand-hover transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Your Assigned Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
