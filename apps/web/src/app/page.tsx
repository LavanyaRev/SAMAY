"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";

export default function RootPage() {
  const { user, isAuthReady } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthReady) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // Role-scoped root routing
    switch (user.role) {
      case "INSTITUTION":
        router.replace("/institution/workspace");
        break;
      case "REGIONAL_OFFICER":
        router.replace("/regional/workbench");
        break;
      case "BUREAU_OFFICER":
        router.replace("/bureau/hq");
        break;
      case "COMMITTEE_MEMBER":
        router.replace("/committee/panel-queue");
        break;
      case "ADMIN":
        router.replace("/admin/governance");
        break;
      default:
        router.replace("/login");
    }
  }, [user, isAuthReady, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface text-xs text-text-muted">
      Routing to your authorized statutory workspace…
    </div>
  );
}
