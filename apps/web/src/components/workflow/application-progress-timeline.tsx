"use client";

import React from "react";
import { Check, AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import type { RegulatoryApplication } from "@/lib/regulatory-store";

interface TimelineStep {
  id: string;
  number: number;
  label: string;
  subtitle: string;
  status: "completed" | "active" | "deficiency" | "pending";
  date?: string;
}

interface ApplicationProgressTimelineProps {
  application?: RegulatoryApplication | null;
  className?: string;
}

export function ApplicationProgressTimeline({
  application,
  className = "",
}: ApplicationProgressTimelineProps) {
  const stage = application?.stage || "SCRUTINY";
  const hasDeficiency = application?.hasDeficiency ?? true;
  const isApproved =
    stage === "APPROVAL" ||
    application?.status?.toLowerCase().includes("approved");
  const isBureau = stage === "BUREAU_REVIEW";
  const isEvc = stage === "EVC";
  const isRectified =
    application?.status?.includes("rectified") ||
    application?.status?.includes("Pending Scrutiny");

  const steps: TimelineStep[] = [
    {
      id: "submission",
      number: 1,
      label: "Submission",
      subtitle: application?.submittedOn || "20 Oct 2026",
      status: "completed",
      date: "20 Oct, 11:32 IST",
    },
    {
      id: "scrutiny",
      number: 2,
      label: "Scrutiny",
      subtitle:
        isApproved || isBureau || isEvc
          ? "Scrutiny Passed"
          : hasDeficiency
            ? "Deficiency Returned"
            : isRectified
              ? "Rectified · Reviewing"
              : "Under Review",
      status:
        isApproved || isBureau || isEvc
          ? "completed"
          : hasDeficiency
            ? "deficiency"
            : "active",
      date: hasDeficiency
        ? "Memo WRO/1042/D1"
        : isApproved || isBureau || isEvc
          ? "Verified 29 Oct"
          : "In Progress",
    },
    {
      id: "evc",
      number: 3,
      label: "EVC Inspection",
      subtitle:
        isApproved || isBureau
          ? "Inspection Complete"
          : isEvc
            ? "Panel Allocated"
            : "Upcoming",
      status:
        isApproved || isBureau ? "completed" : isEvc ? "active" : "pending",
      date: isEvc ? application?.evcDate || "12 Nov 2026" : undefined,
    },
    {
      id: "bureau",
      number: 4,
      label: "Bureau Review",
      subtitle: isApproved
        ? "Recommended"
        : isBureau
          ? "HQ Review"
          : "Upcoming",
      status: isApproved ? "completed" : isBureau ? "active" : "pending",
      date: isBureau ? "Docket Pending Sign-off" : undefined,
    },
    {
      id: "approval",
      number: 5,
      label: "Statutory Approval",
      subtitle: isApproved ? "EoA Issued" : "Competent Authority",
      status: isApproved ? "completed" : "pending",
      date: isApproved ? "Order Available" : undefined,
    },
  ];

  // Calculate progress percentage for connector line
  const activeIndex = steps.findIndex(
    (s) => s.status === "active" || s.status === "deficiency",
  );
  const completedIndex = isApproved ? 4 : activeIndex > 0 ? activeIndex : 1;
  const progressPercent = Math.min(
    100,
    Math.max(12, (completedIndex / 4) * 100),
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Header bar of timeline with clean typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-[#F0ECE6]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#2A1810] tracking-tight">
              Active Application Progress
            </h2>
            <span className="rounded-md bg-[#FFF7F0] px-2 py-0.5 text-[10px] font-bold text-[#EC642A] border border-[#F3C39E]/60 uppercase tracking-wider">
              {application?.routeLabel || "Route 5: Conditional Processing"}
            </span>
          </div>
          <p className="text-xs text-[#736357] mt-0.5">
            {application?.ref || "EOA-2027-1042"} · Extension of Approval (EoA)
            Cycle 2027–28
          </p>
        </div>

        {/* SLA Status Pill */}
        <div className="flex items-center gap-2">
          {hasDeficiency ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E0] px-3 py-1 text-xs font-semibold text-[#9A5B18] border border-[#FFE0B2]">
              <AlertTriangle className="h-3.5 w-3.5 text-[#EC642A]" />
              <span>Deficiency Response Due in 4 Calendar Days</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5E9] px-3 py-1 text-xs font-semibold text-[#2E7D32] border border-[#C8E6C9]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2E7D32]" />
              <span>SLA Clock Active · Under Scrutiny Desk</span>
            </div>
          )}
        </div>
      </div>

      {/* Modern Connected Graphical Timeline */}
      <div className="relative pt-8 pb-4 px-2 sm:px-6 overflow-x-auto">
        <div className="relative min-w-[680px]">
          {/* Background Connecting SVG Line */}
          <div className="absolute top-[20px] left-6 right-6 h-[3px] bg-[#EAE5DE] -z-0">
            {/* Active progress fill */}
            <div
              className={`h-full transition-all duration-500 ease-out ${
                hasDeficiency
                  ? "bg-gradient-to-r from-[#2E7D32] to-[#EC642A]"
                  : "bg-[#2E7D32]"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stepper Nodes */}
          <div className="relative z-10 flex items-start justify-between">
            {steps.map((step) => {
              const isCompleted = step.status === "completed";
              const isDef = step.status === "deficiency";
              const isActive = step.status === "active";

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center text-center max-w-[130px]"
                >
                  {/* Circular Node Icon */}
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing ring for active / deficiency */}
                    {isDef && (
                      <span className="absolute -inset-1.5 rounded-full bg-[#EC642A]/25 animate-ping" />
                    )}
                    {isActive && (
                      <span className="absolute -inset-1.5 rounded-full bg-[#EC642A]/20 animate-pulse" />
                    )}

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs ${
                        isCompleted
                          ? "bg-[#2E7D32] text-white ring-4 ring-[#E8F5E9]"
                          : isDef
                            ? "bg-[#EC642A] text-white ring-4 ring-[#FFF3E0]"
                            : isActive
                              ? "bg-[#EC642A] text-white ring-4 ring-orange-100"
                              : "bg-white text-[#8A7D75] border-2 border-[#D8D2C9]"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5 stroke-[2.5]" />
                      ) : isDef ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <span>{step.number}</span>
                      )}
                    </div>
                  </div>

                  {/* Node Label & Subtitle */}
                  <div className="mt-3 space-y-0.5">
                    <div
                      className={`text-xs font-bold leading-tight ${
                        isCompleted
                          ? "text-[#2A1810]"
                          : isDef
                            ? "text-[#EC642A]"
                            : isActive
                              ? "text-[#EC642A]"
                              : "text-[#736357]"
                      }`}
                    >
                      {step.label}
                    </div>
                    <div
                      className={`text-[11px] font-medium leading-tight ${
                        isDef
                          ? "text-[#EC642A] font-semibold"
                          : isCompleted
                            ? "text-[#2E7D32]"
                            : "text-[#8A7D75]"
                      }`}
                    >
                      {step.subtitle}
                    </div>
                    {step.date && (
                      <div className="text-[10px] text-[#A3968C] pt-0.5">
                        {step.date}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subtle Explanatory Context Bar */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-[#FAF8F5] p-3 text-xs text-[#736357] border border-[#F0ECE6]/80">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#8C7E75] shrink-0" />
          <span>
            Current Status:{" "}
            <strong className="text-[#2A1810]">
              {application?.status || "Deficiency Returned"}
            </strong>
            {application?.deficiencyDeadline
              ? ` (Resolution deadline: ${application.deficiencyDeadline})`
              : ""}
          </span>
        </div>
        <div className="text-[11px] font-mono text-[#8A7D75]">
          Ledger Entry: SHA-256 Verified · Non-repudiable
        </div>
      </div>
    </div>
  );
}
