"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { Clock, FastForward, RotateCcw } from "lucide-react";

export default function AdminTimeTravelPage() {
  const [simulatedDate, setSimulatedDate] = useState("02 Nov 2026 · 10:00 IST");
  const [offsetDays, setOffsetDays] = useState(0);

  const handleAdvance = (days: number) => {
    const nextOffset = offsetDays + days;
    setOffsetDays(nextOffset);
    if (nextOffset === 7) setSimulatedDate("09 Nov 2026 · 10:00 IST");
    else if (nextOffset === 15) setSimulatedDate("17 Nov 2026 · 10:00 IST");
    else if (nextOffset >= 30) setSimulatedDate("02 Dec 2026 · 10:00 IST");
    else setSimulatedDate(`02 Nov + ${nextOffset} days`);
  };

  const handleReset = () => {
    setOffsetDays(0);
    setSimulatedDate("02 Nov 2026 · 10:00 IST");
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>ADMIN PORTAL / Time-Travel Simulator</span>
            <span>Statutory Cycle AY 2027–28 • Clock Infrastructure</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Time-travel simulator
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Injectable clock offset controller for deterministic compliance
                audits and temporal deadline escalation.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#E5E0D8] bg-white px-4 py-2 text-sm font-medium text-[#2A1810] hover:bg-neutral-50 transition-colors shadow-2xs self-start sm:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to live system clock</span>
            </button>
          </div>

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Controller Card */}
            <div className="lg:col-span-7 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Deterministic Clock Offset Controller
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-[#EC642A] font-semibold">
                  <Clock className="h-4 w-4" />
                  <span>ClockService Active</span>
                </div>
              </div>

              <div className="rounded-lg bg-[#FAFAFA] border border-[#E5E0D8] p-5 text-center space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A7D75]">
                  Active Simulated Statutory Timestamp
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-[#2A1810]">
                  {simulatedDate}
                </div>
                <div className="text-xs text-[#EC642A] font-medium">
                  {offsetDays === 0
                    ? "Standard Baseline Time"
                    : `Offset: +${offsetDays} Days Fast-Forwarded`}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-[#2A1810] mb-2">
                  Fast-Forward Statutory Clock:
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAdvance(7)}
                    className="flex items-center gap-1.5 rounded-md border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-medium text-[#2A1810] hover:bg-neutral-50 shadow-2xs"
                  >
                    <FastForward className="h-3.5 w-3.5 text-[#EC642A]" />
                    <span>Advance +7 Days</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdvance(15)}
                    className="flex items-center gap-1.5 rounded-md border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-medium text-[#2A1810] hover:bg-neutral-50 shadow-2xs"
                  >
                    <FastForward className="h-3.5 w-3.5 text-[#EC642A]" />
                    <span>Advance +15 Days</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdvance(30)}
                    className="flex items-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D5531B] shadow-2xs"
                  >
                    <FastForward className="h-3.5 w-3.5" />
                    <span>Advance +30 Days</span>
                  </button>
                </div>
              </div>

              <div className="rounded-md bg-[#F8F7F5] p-3 text-[11px] text-[#736357] leading-relaxed">
                AST-enforced rule prohibits direct{" "}
                <code className="font-mono">new Date()</code> calls. All time
                calculations across web and api services flow through{" "}
                <code className="font-mono">IClockService</code>.
              </div>
            </div>

            {/* Right 5 cols: Triggered Escalations */}
            <div className="lg:col-span-5 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
              <div className="border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Escalation triggers at current offset
                </h2>
                <p className="text-xs text-[#736357] mt-0.5">
                  Automated statutory notices generated
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {offsetDays >= 7 && (
                  <div className="p-3 rounded-md bg-[#FFF7F0] border border-[#F3C39E] space-y-1">
                    <div className="font-bold text-[#EC642A]">
                      L1 Scrutiny Breach: EOA-2027-1042
                    </div>
                    <div className="text-[#736357] text-[11px]">
                      Sahyadri Institute deficiency response window closed.
                      Automated penalty notice dispatched to Outbox.
                    </div>
                  </div>
                )}
                {offsetDays >= 15 && (
                  <div className="p-3 rounded-md bg-[#FFF7F0] border border-[#F3C39E] space-y-1">
                    <div className="font-bold text-[#D5531B]">
                      L2 Regional Alert: EOA-2027-1086
                    </div>
                    <div className="text-[#736357] text-[11px]">
                      EVC physical inspection overdue. Standing appeal notice
                      escalated to Western Regional Officer.
                    </div>
                  </div>
                )}
                {offsetDays >= 30 && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200 space-y-1">
                    <div className="font-bold text-red-700">
                      L3 Bureau Headquarters Escalation: All WRO Cases
                    </div>
                    <div className="text-red-600 text-[11px]">
                      Critical breach register populated for AICTE Member
                      Secretary statutory intervention.
                    </div>
                  </div>
                )}
                {offsetDays === 0 && (
                  <div className="p-6 text-center text-xs text-[#8A7D75]">
                    No temporal escalations active at baseline. Advance the
                    clock to simulate automated SLA triggers.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
