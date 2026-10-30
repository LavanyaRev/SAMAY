"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  Play,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Zap,
  Calendar,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import {
  getHeroFeaturesSnapshot,
  subscribeHeroFeaturesStore,
  jumpDemoClockInStore,
  stepScenarioRunnerInStore,
  resetDemoClockToRealTimeInStore,
  HERO_SCENARIO_STEPS,
} from "@/lib/hero-features-client";

export function TimeTravelConsole() {
  const { user, locale } = useApp();
  const [store, setStore] = useState(() => getHeroFeaturesSnapshot());
  const [isExpanded, setIsExpanded] = useState(false);
  const [pickedDate, setPickedDate] = useState("2026-06-15");

  useEffect(() => {
    return subscribeHeroFeaturesStore(() => {
      setStore({ ...getHeroFeaturesSnapshot() });
    });
  }, []);

  // Admin-only floating console
  if (user?.role !== "ADMIN") {
    return null;
  }

  const nextScenarioIdx =
    store.scenarioCursor + 1 < HERO_SCENARIO_STEPS.length
      ? store.scenarioCursor + 1
      : 0;
  const nextStep = HERO_SCENARIO_STEPS[nextScenarioIdx];

  return (
    <aside
      aria-label="Admin Time-Travel Console and Scenario Runner"
      data-testid="time-travel-console"
      className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-sm border-2 border-brand bg-surface-raised shadow-overlay"
    >
      {/* Floating Header Bar */}
      <div className="flex items-center justify-between gap-2 bg-brand px-3 py-2 text-brand-on">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-serif text-xs font-bold leading-tight">
              {locale === "hi"
                ? "टाइम-ट्रैवल कंसोल (केवल एडमिन)"
                : "Time-Travel Console (Admin)"}
            </div>
            <div
              data-testid="time-travel-current-date"
              className="tabular-nums-data font-mono text-[10px] opacity-95"
            >
              Demo Date: {store.demoDateIso.slice(0, 10)} (
              {store.offsetDays >= 0
                ? `+${store.offsetDays}d`
                : `${store.offsetDays}d`}
              )
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          data-testid="time-travel-expand-btn"
          className="inline-flex items-center gap-1 rounded-xs border border-brand-on/40 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-on hover:bg-brand-hover"
        >
          <span>{isExpanded ? "Minimize" : "Controls"}</span>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Quick Action Strip (Always Visible) */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-surface p-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => jumpDemoClockInStore({ days: 1 })}
            data-testid="tt-jump-1d"
            className="rounded-xs border border-border bg-surface-raised px-2 py-1 font-mono text-[11px] font-bold text-text-primary hover:border-brand"
          >
            +1 Day
          </button>
          <button
            type="button"
            onClick={() => jumpDemoClockInStore({ days: 7 })}
            data-testid="tt-jump-1w"
            className="rounded-xs border border-border bg-surface-raised px-2 py-1 font-mono text-[11px] font-bold text-text-primary hover:border-brand"
          >
            +1 Week
          </button>
          <button
            type="button"
            onClick={() => jumpDemoClockInStore({ days: 30 })}
            data-testid="tt-jump-1m"
            className="rounded-xs border border-border bg-surface-raised px-2 py-1 font-mono text-[11px] font-bold text-text-primary hover:border-brand"
          >
            +1 Month
          </button>
        </div>

        <button
          type="button"
          onClick={() => stepScenarioRunnerInStore()}
          data-testid="scenario-next-btn"
          className="inline-flex items-center gap-1 rounded-xs border border-brand bg-brand px-2.5 py-1 text-[11px] font-bold text-brand-on hover:bg-brand-hover"
        >
          <Play className="h-3 w-3" />
          <span>Next Scenario ({nextScenarioIdx + 1}/6)</span>
        </button>
      </div>

      {/* Expanded Console Details: Date Picker, Scenario Story, and Live Alert Feed */}
      {isExpanded && (
        <div className="space-y-3 p-3 text-xs">
          {/* Date Picker & Real-Time Reset */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-1 items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-brand" />
              <input
                type="date"
                aria-label="Jump to demo date"
                data-testid="tt-date-picker"
                value={pickedDate}
                onChange={(e) => setPickedDate(e.target.value)}
                className="w-full rounded-xs border border-border bg-surface px-2 py-1 font-mono text-[11px] text-text-primary"
              />
              <button
                type="button"
                onClick={() =>
                  jumpDemoClockInStore({ targetDateStr: pickedDate })
                }
                data-testid="tt-date-jump-btn"
                className="shrink-0 rounded-xs border border-brand bg-surface px-2 py-1 text-[11px] font-semibold text-brand hover:bg-surface-sunken"
              >
                Jump
              </button>
            </div>

            <button
              type="button"
              onClick={() => resetDemoClockToRealTimeInStore()}
              data-testid="tt-reset-realtime-btn"
              className="inline-flex shrink-0 items-center gap-1 rounded-xs border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-secondary hover:border-sla-overdue hover:text-sla-overdue"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Real Time</span>
            </button>
          </div>

          {/* JSON Scenario Runner Progress */}
          <div className="rounded-xs border border-border bg-surface p-2.5">
            <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase text-brand">
              <span>JSON Scenario Story Runner</span>
              <span>
                Step {Math.max(0, store.scenarioCursor + 1)} /{" "}
                {HERO_SCENARIO_STEPS.length}
              </span>
            </div>
            <div className="mt-1 font-semibold text-text-primary">
              Next: {locale === "hi" ? nextStep.titleHi : nextStep.titleEn}
            </div>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {locale === "hi"
                ? nextStep.descriptionHi
                : nextStep.descriptionEn}
            </p>
          </div>

          {/* Live Feed of Alerts & Escalations Fired */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-sla-overdue" />
                <span>Live Sweep & Outbox Escalation Feed</span>
              </span>
              <span>{store.liveFeed.length} events</span>
            </div>
            <ul
              data-testid="time-travel-live-feed"
              className="max-h-40 space-y-1.5 overflow-y-auto pr-1"
            >
              {store.liveFeed.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xs border border-border bg-surface p-2 text-[11px]"
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold text-brand">
                      L{item.escalationLevel} • {item.kind}
                    </span>
                    <span className="text-text-muted">
                      {item.firedAt.slice(0, 10)}
                    </span>
                  </div>
                  <p className="mt-0.5 leading-snug text-text-primary">
                    {locale === "hi" ? item.summaryHi : item.summaryEn}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </aside>
  );
}
