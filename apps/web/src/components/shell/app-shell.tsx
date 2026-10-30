"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandPalette } from "./command-palette";
import { TimeTravelConsole } from "./time-travel-console";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-surface text-text-primary">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <Breadcrumbs />
        <main id="main-content" className="flex-1 space-y-5 p-4 lg:p-6">
          {children}
        </main>
      </div>
      <CommandPalette />
      <TimeTravelConsole />
    </div>
  );
}
