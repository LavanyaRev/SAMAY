"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Landmark,
  Lock,
  Languages,
  Sun,
  Moon,
  ArrowRight,
  SwatchBook,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { DEMO_ROLE_ACCOUNTS } from "@/lib/mock-data";
import { AuditSeal } from "@/components/ui/audit-seal";

export default function LoginPage() {
  const { t, locale, toggleLocale, theme, toggleTheme, loginWithApi } =
    useApp();
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_ROLE_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ROLE_ACCOUNTS[0].password);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await loginWithApi(email, password);
      router.push("/");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickRoleLogin = async (
    acctEmail: string,
    acctPassword: string,
  ) => {
    setEmail(acctEmail);
    setPassword(acctPassword);
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await loginWithApi(acctEmail, acctPassword);
      router.push("/");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-surface text-text-primary">
      {/* Top Regulatory Bar */}
      <header className="flex items-center justify-between border-b border-border bg-surface-raised px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xs border border-brand bg-brand text-brand-on">
            <Landmark className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="font-serif text-sm font-bold text-text-primary">
              {t.aicteCouncil}
            </div>
            <div className="tabular-nums-data text-[11px] text-text-muted">
              {t.portalSubtitle} • {t.academicCycle}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dev/components"
            className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-border bg-surface px-2.5 text-xs font-medium text-text-primary hover:border-brand"
          >
            <SwatchBook className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            <span>{t.nav.componentGallery}</span>
          </Link>

          <button
            type="button"
            onClick={toggleLocale}
            className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-border bg-surface px-2.5 text-xs font-semibold text-text-primary hover:border-brand"
          >
            <Languages className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            <span>{locale === "en" ? "हिन्दी" : "English"}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-border bg-surface px-2.5 text-xs font-medium text-text-primary hover:border-brand"
          >
            {theme === "light" ? (
              <>
                <Moon className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                <span>{t.themeDark}</span>
              </>
            ) : (
              <>
                <Sun className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                <span>{t.themeLight}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Login Dossier Container */}
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center p-6"
      >
        <div className="grid w-full grid-cols-1 rounded-sm border border-border bg-surface-raised lg:grid-cols-12">
          {/* Left Form Column */}
          <div className="border-b border-border p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
            <div className="space-y-1 border-b border-border pb-4">
              <div className="tabular-nums-data text-[11px] font-semibold uppercase tracking-wider text-brand">
                PHASE 1 & 2 STATUTORY AUTHENTICATION GATEWAY
              </div>
              <h1 className="font-serif text-xl font-bold text-text-primary">
                {t.portalName}
              </h1>
              <p className="text-xs text-text-muted">{t.portalSubtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-text-primary"
                >
                  {t.emailLabel}
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="tabular-nums-data h-9 w-full rounded-xs border border-border bg-surface px-3 text-xs text-text-primary"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-text-primary"
                >
                  {t.passwordLabel}
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="tabular-nums-data h-9 w-full rounded-xs border border-border bg-surface px-3 text-xs text-text-primary"
                />
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xs border border-sla-overdue bg-surface-sunken px-3 py-2 text-xs font-medium text-sla-overdue"
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                data-testid="login-submit-btn"
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xs border border-brand bg-brand px-4 text-xs font-semibold text-brand-on transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isLoading ? t.signingIn : t.signIn}</span>
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-border">
              <AuditSeal
                authorityRole="KEYCLOAK / AUTH_PROVIDER"
                ledgerHash="HS256 • DB Role & RLS Verified"
                timestamp="AY 2026-27"
              />
            </div>
          </div>

          {/* Right Demo Role Selector Column */}
          <div className="bg-surface-sunken p-6 lg:col-span-5">
            <h2 className="font-serif text-sm font-bold text-text-primary">
              {t.demoAccountsTitle}
            </h2>
            <p className="mt-1 text-[11px] text-text-muted">
              Click any seeded statutory role below to sign in via{" "}
              <code className="font-mono">POST /api/v1/auth/login</code> and
              inspect its role-specific landing page:
            </p>

            <div className="mt-3.5 space-y-2">
              {DEMO_ROLE_ACCOUNTS.map((acct) => (
                <button
                  key={acct.role}
                  type="button"
                  data-testid={`quick-login-${acct.role}`}
                  onClick={() =>
                    handleQuickRoleLogin(acct.email, acct.password)
                  }
                  className="flex w-full items-center justify-between gap-2 rounded-xs border border-border bg-surface-raised p-2.5 text-left text-xs transition-colors hover:border-brand"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold uppercase text-brand">
                        {acct.role}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        • {acct.regionBadge}
                      </span>
                    </div>
                    <div className="truncate font-semibold text-text-primary">
                      {acct.personName}
                    </div>
                    <div className="tabular-nums-data truncate text-[11px] text-text-muted">
                      {acct.email}
                    </div>
                  </div>
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-surface-raised px-6 py-2.5 text-center text-[11px] text-text-muted">
        All India Council for Technical Education (AICTE) • Statutory Regulatory
        Platform • Zero Autonomous Approvals
      </footer>
    </div>
  );
}
