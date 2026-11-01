"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

function LoginForm() {
  const { locale, toggleLocale, loginWithApi } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSessionTerminated =
    searchParams.get("reason") === "session_terminated";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const user = await loginWithApi(email, password);
      if (user.role === "INSTITUTION") router.push("/institution/workspace");
      else if (user.role === "REGIONAL_OFFICER")
        router.push("/regional/workbench");
      else if (user.role === "BUREAU_OFFICER") router.push("/bureau/hq");
      else if (user.role === "COMMITTEE_MEMBER")
        router.push("/committee/panel-queue");
      else router.push("/admin/governance");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please verify your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-[#FAFAFA] text-[#2A1810]">
      {/* Subtle Repeating Geometric Emblem Watermark */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#EC642A 1.5px, transparent 1.5px), radial-gradient(#642D0A 1.5px, #FAFAFA 1.5px)`,
          backgroundSize: "36px 36px",
          backgroundPosition: "0 0, 18px 18px",
        }}
        aria-hidden="true"
      />

      {/* Top Header */}
      <header className="relative z-10 flex h-16 items-center justify-between border-b border-[#E5E0D8] bg-white px-6 lg:px-8 shadow-2xs">
        <div className="flex items-center gap-3">
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
        </div>

        <button
          type="button"
          onClick={toggleLocale}
          suppressHydrationWarning
          className="text-xs transition-colors cursor-pointer select-none"
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
      </header>

      {/* Main Centered Gateway Canvas */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Breadcrumb line */}
          <div className="text-center text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            SAMAY STATUTORY PORTAL • AY 2027–28
          </div>

          {isSessionTerminated ? (
            /* Session Terminated / Signed Out View */
            <div className="rounded-lg border border-[#E5E0D8] bg-white p-8 shadow-2xs text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                <CheckCircle2 className="h-6 w-6 stroke-[2]" />
              </div>
              <h1 className="text-xl font-bold text-[#2A1810]">
                You're securely signed out.
              </h1>
              <div className="rounded-md bg-[#F1F8E9] p-3 text-xs text-[#2E7D32]">
                Your statutory session was closed securely. Audit trails and
                immutable logs remain intact.
              </div>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#EC642A] py-2.5 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs"
                >
                  <span>Sign back in →</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Clean Production Authentication Gateway Card (Zero Mock Data Leaks) */
            <div className="rounded-lg border border-[#E5E0D8] bg-white p-8 shadow-2xs space-y-5">
              <div className="text-center space-y-1 border-b border-[#F0ECE6] pb-5">
                <h1 className="text-lg font-bold text-[#2A1810]">
                  SAMAY Statutory Portal
                </h1>
                <p className="text-xs text-[#736357]">
                  Authentication Gateway for Institutional and Departmental
                  Officers
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                suppressHydrationWarning
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-[#2A1810] mb-1.5">
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    required
                    suppressHydrationWarning
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@aicte.gov.in or institute@domain.edu"
                    className="w-full rounded-md border border-[#E5E0D8] bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-[#2A1810] placeholder:text-[#A89D95] focus:border-[#EC642A] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#2A1810]">
                      Statutory Password
                    </label>
                    <span className="text-[11px] text-[#736357] hover:text-[#EC642A] cursor-pointer">
                      Forgot credentials?
                    </span>
                  </div>
                  <input
                    type="password"
                    required
                    suppressHydrationWarning
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-md border border-[#E5E0D8] bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-[#2A1810] placeholder:text-[#A89D95] focus:border-[#EC642A] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  suppressHydrationWarning
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-[#EC642A] py-2.5 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>
                    {isLoading
                      ? "Verifying Statutory Authorization…"
                      : "Authenticate & Enter Portal →"}
                  </span>
                </button>
              </form>

              <div className="border-t border-[#F0ECE6] pt-4 flex items-center justify-center gap-2 text-[10px] text-[#8A7D75]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#2E7D32]" />
                <span>
                  AICTE 256-Bit TLS Encryption • ISO 27001 Certified Security
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Global Statutory Footer */}
      <footer className="relative z-10 border-t border-[#E5E0D8] bg-white py-4 px-6 text-center text-[11px] text-[#8A7D75]">
        All India Council for Technical Education (AICTE) • Statutory Approval
        Process Handbook Compliance
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-[#736357]">
          Loading statutory gateway…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
