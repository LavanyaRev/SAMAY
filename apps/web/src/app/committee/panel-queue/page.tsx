"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { Calendar, ShieldCheck } from "lucide-react";

interface PanelQueueItem {
  ref: string;
  institution: string;
  city: string;
  role: string;
  visitDate: string;
  status: string;
}

const COMMITTEE_ITEMS: PanelQueueItem[] = [
  {
    ref: "EOA-2027-1042",
    institution: "Sahyadri Institute of Technology",
    city: "Pune, MH",
    role: "Panel Chair",
    visitDate: "12 Nov 2026",
    status: "Conflict Declaration Signed",
  },
  {
    ref: "EOA-2027-1086",
    institution: "Konkan Technical College",
    city: "Ratnagiri, MH",
    role: "Expert Member",
    visitDate: "05 Nov 2026",
    status: "Inspection Dossier Ready",
  },
  {
    ref: "LOA-2027-1128",
    institution: "Narmada Polytechnic",
    city: "Bharuch, GJ",
    role: "Expert Member",
    visitDate: "18 Nov 2026",
    status: "Pending Travel Booking",
  },
];

export default function CommitteePanelQueuePage() {
  const [signedNotice, setSignedNotice] = useState<string | null>(null);

  const handleSignConflict = () => {
    setSignedNotice(
      "Annual Conflict of Interest Statutory Affidavit digitally signed and notarized with SHA-256 hash chaining.",
    );
  };

  return (
    <RoleGuard allowedRoles={["COMMITTEE_MEMBER", "ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>COMMITTEE PORTAL / Expert Panel Queue</span>
            <span>Statutory Cycle AY 2027–28 • Expert Panels</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Your expert panel queue
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Inspection panels allocated to you for on-site physical and
                documentary verification.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignConflict}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Sign conflict declaration →</span>
            </button>
          </div>

          {signedNotice && (
            <div className="flex items-center gap-2 rounded-md border border-[#C8E6C9] bg-[#E8F5E9] p-3 text-xs text-[#2E7D32]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{signedNotice}</span>
            </div>
          )}

          {/* Panel Table Card */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
              <h2 className="text-sm font-bold text-[#2A1810]">
                Assigned Expert Visit Committee (EVC) Panels (
                {COMMITTEE_ITEMS.length})
              </h2>
              <span className="text-xs text-[#736357]">
                AY 2027–28 Evaluation Cycle
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">APPLICATION / INSTITUTION</th>
                    <th className="py-3 px-2">YOUR ROLE</th>
                    <th className="py-3 px-2">VISIT DATE</th>
                    <th className="py-3 px-2">STATUS</th>
                    <th className="py-3 px-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {COMMITTEE_ITEMS.map((item) => (
                    <tr key={item.ref} className="hover:bg-[#FAFAFA]">
                      <td className="py-3 px-2">
                        <div className="font-bold text-[#2A1810]">
                          {item.ref}
                        </div>
                        <div className="text-[11px] text-[#736357]">
                          {item.institution} · {item.city}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="rounded bg-[#EFECE6] px-2 py-0.5 text-[10px] font-bold text-[#2A1810]">
                          {item.role}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5 text-[#2A1810]">
                          <Calendar className="h-3.5 w-3.5 text-[#EC642A]" />
                          <span>{item.visitDate}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[#2E7D32] font-medium">
                        {item.status}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Link
                          href="/committee/evc-visits"
                          className="font-medium text-[#EC642A] hover:underline"
                        >
                          Submit Report →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
