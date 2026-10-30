"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CornerDownLeft,
  FileSpreadsheet,
  SwatchBook,
  Languages,
  SunMoon,
  UserCheck,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { DEMO_ROLE_ACCOUNTS, REGULATORY_APPLICATIONS } from "@/lib/mock-data";

interface CommandItem {
  id: string;
  category: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export function CommandPalette() {
  const {
    t,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    toggleTheme,
    toggleLocale,
    loginWithApi,
  } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items: CommandItem[] = useMemo(() => {
    const appCommands: CommandItem[] = REGULATORY_APPLICATIONS.slice(0, 5).map(
      (app) => ({
        id: `app-${app.id}`,
        category: "Applications",
        label: `${app.applicationRef} — ${app.institutionName}`,
        sublabel: `${app.regionCode} • ${app.stage} • AICTE ID: ${app.aictePermanentId}`,
        icon: FileSpreadsheet,
        onSelect: () => {
          router.push("/");
          setCommandPaletteOpen(false);
        },
      }),
    );

    const roleCommands: CommandItem[] = DEMO_ROLE_ACCOUNTS.map((acct) => ({
      id: `role-${acct.role}`,
      category: "Switch Role",
      label: `Authenticate as ${acct.label} (${acct.personName})`,
      sublabel: `${acct.email} • ${acct.regionBadge}`,
      icon: UserCheck,
      onSelect: async () => {
        await loginWithApi(acct.email, acct.password);
        router.push("/");
        setCommandPaletteOpen(false);
      },
    }));

    const utilityCommands: CommandItem[] = [
      {
        id: "nav-gallery",
        category: "Navigation",
        label: "Open Design System & Component Gallery (/dev/components)",
        sublabel:
          "Inspect all components in Light, Dark, Hindi & WCAG Contrast Audit",
        icon: SwatchBook,
        onSelect: () => {
          router.push("/dev/components");
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "cmd-theme",
        category: "Preferences",
        label: "Toggle Light / Dark Theme",
        sublabel:
          "Switch between Seashell Light (#F7F1EB) and Obsidian Dark (#17140A)",
        icon: SunMoon,
        onSelect: () => {
          toggleTheme();
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "cmd-locale",
        category: "Preferences",
        label: "Toggle Language (English / हिन्दी)",
        sublabel: "Switch bilingual shell & landing labels",
        icon: Languages,
        onSelect: () => {
          toggleLocale();
          setCommandPaletteOpen(false);
        },
      },
    ];

    return [...utilityCommands, ...roleCommands, ...appCommands];
  }, [router, setCommandPaletteOpen, toggleTheme, toggleLocale, loginWithApi]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.sublabel.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isCommandPaletteOpen]);

  useEffect(() => {
    if (!isCommandPaletteOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          filtered.length > 0 ? (prev + 1) % filtered.length : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          filtered.length > 0
            ? (prev - 1 + filtered.length) % filtered.length
            : 0,
        );
      } else if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].onSelect();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isCommandPaletteOpen, filtered, activeIndex, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Statutory Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-text-primary/45 pt-20 p-4"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-sm border border-border bg-surface-raised shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border bg-surface-sunken px-3.5 py-2.5">
          <Search className="h-4 w-4 text-brand" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label="Command palette search"
            className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="tabular-nums-data rounded-xs border border-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
            ESC
          </kbd>
        </div>

        <ul
          role="listbox"
          className="max-h-80 divide-y divide-border overflow-y-auto"
        >
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === activeIndex;
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={item.onSelect}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-xs ${
                  isSelected
                    ? "bg-surface-sunken text-text-primary"
                    : "bg-surface-raised"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className="h-4 w-4 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-text-primary">
                      {item.label}
                    </div>
                    <div className="tabular-nums-data truncate text-[11px] text-text-muted">
                      {item.sublabel}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="rounded-xs border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                    {item.category}
                  </span>
                  <CornerDownLeft
                    className="h-3.5 w-3.5 text-text-muted"
                    aria-hidden="true"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
