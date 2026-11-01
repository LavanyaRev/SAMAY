"use client";

import React from "react";
import { TopBar } from "./top-bar";
import { CommandPalette } from "./command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#FAFAFA] text-[#2A1810]">
      {/* Strictly solid, non-transparent sticky top header */}
      <TopBar />

      {/* Main Content Canvas with generous top clearance so titles never touch or overlap under sticky header */}
      <main
        id="main-content"
        className="flex-1 w-full max-w-7xl mx-auto px-6 pt-8 sm:pt-10 pb-16 space-y-8 relative z-0"
      >
        {children}

        {/* Global Statutory Footer */}
        <footer className="mt-12 border-t border-[#E5E0D8] pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8A7D75] gap-3">
          <div>
            SAMAY / Statutory Approval Cycle 2027–28 • All India Council for
            Technical Education
          </div>
          <div className="flex items-center gap-3">
            <span>Role &amp; RLS Enforced</span>
            <span>•</span>
            <span>SHA-256 Audit Ledger Active</span>
            <span>•</span>
            <span className="hover:text-[#EC642A] cursor-pointer">
              Regulatory Help Desk ↗
            </span>
          </div>
        </footer>
      </main>

      {/* Omnibox Command Palette */}
      <CommandPalette />
    </div>
  );
}
