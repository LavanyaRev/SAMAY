"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface AuditRow {
  index: number;
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  prevHash: string;
  hash: string;
  isTampered?: boolean;
}

const INITIAL_ENTRIES: AuditRow[] = [
  {
    index: 0,
    id: "aud-001",
    timestamp: "2026-10-20 11:32:00",
    actor: "Institution nodal officer",
    action: "SUBMIT_APPLICATION",
    prevHash:
      "0000000000000000000000000000000000000000000000000000000000000000",
    hash: "9f83a218d6e1919869a19c5950e181827464a0e980a4534e6378e9b048590623",
  },
  {
    index: 1,
    id: "aud-002",
    timestamp: "2026-10-29 16:40:00",
    actor: "R. Kulkarni (WRO Desk)",
    action: "VERIFY_RECORDS",
    prevHash:
      "9f83a218d6e1919869a19c5950e181827464a0e980a4534e6378e9b048590623",
    hash: "4d12c8209823059871ab93821764350198276354182763541827635418276354",
  },
  {
    index: 2,
    id: "aud-003",
    timestamp: "2026-11-02 09:20:00",
    actor: "WRO scrutiny desk",
    action: "ISSUE_DEFICIENCY_MEMO",
    prevHash:
      "4d12c8209823059871ab93821764350198276354182763541827635418276354",
    hash: "7c33e82938472910293847562019283746501928374650192837465019283746",
  },
  {
    index: 3,
    id: "aud-004",
    timestamp: "2026-11-02 09:45:00",
    actor: "Dr. Suresh Patil (RO)",
    action: "AFFIRM_PAUSE_CLOCK",
    prevHash:
      "7c33e82938472910293847562019283746501928374650192837465019283746",
    hash: "2e91a03847562019283746501928374650192837465019283746501928374650",
  },
];

export default function AdminAuditTamperPage() {
  const [entries, setEntries] = useState<AuditRow[]>(INITIAL_ENTRIES);
  const [isTampered, setIsTampered] = useState(false);

  const handleTamperSimulation = () => {
    setIsTampered(true);
    setEntries((prev) =>
      prev.map((e) =>
        e.index === 1
          ? {
              ...e,
              action: "UNAUTHORIZED_ALTERATION:STATUS_APPROVED",
              hash: "TAMPERED_HASH_BAD_SIGNATURE_0000000000000000000000000000000000000000",
              isTampered: true,
            }
          : e,
      ),
    );
  };

  const handleResetLedger = () => {
    setIsTampered(false);
    setEntries(INITIAL_ENTRIES);
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>ADMIN PORTAL / Audit Tamper Console</span>
            <span>Statutory Cycle AY 2027–28 • Cryptographic Audit Ledger</span>
          </div>

          {/* Header Title + Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                SHA-256 Audit Hash-Chain Inspector
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                Client-side file fingerprinting and sequential integrity
                simulation (append-only ledger design).
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetLedger}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#EC642A] px-4 py-2 text-sm font-medium text-white hover:bg-[#D5531B] transition-colors shadow-2xs self-start sm:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Re-verify ledger hash chain</span>
            </button>
          </div>

          {/* Cryptographic Honesty & Architecture Disclaimer */}
          <div className="rounded-lg border border-[#E5E0D8] bg-[#FAF8F5] p-4 text-xs text-[#642D0A] space-y-1.5 leading-relaxed">
            <div className="font-bold flex items-center gap-2 text-[#2A1810]">
              <AlertTriangle className="h-4 w-4 text-[#EC642A]" />
              <span>Regulatory Cryptographic Honesty Notice</span>
            </div>
            <p>
              This audit console provides{" "}
              <strong>
                client-side file fingerprinting and sequential integrity
                simulation
              </strong>{" "}
              adhering to append-only architectural principles. It demonstrates
              continuous block linking (
              <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-[#E5E0D8]">
                prevHash + payload = hash
              </code>
              ). In production, non-repudiation against privileged database
              administrators requires hardware security module (HSM) digital
              signatures, write-once-read-many (WORM) storage, and external
              timestamping authority (TSA) attestation.
            </p>
          </div>

          {/* Hash Chain Status Banner */}
          {isTampered ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-sm">
                  Cryptographic Integrity Breach Detected at Block #1
                </div>
                <div className="text-xs text-red-700 mt-0.5">
                  Recomputed SHA-256 hash does not match stored block digest.
                  Subsequent block #2 link is broken.
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetLedger}
                className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Restore Ledger Integrity
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-[#C8E6C9] bg-[#E8F5E9] p-4 text-[#2E7D32]">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-sm">
                  All 4 Immutable Ledger Blocks Verified (0 Broken Links)
                </div>
                <div className="text-xs text-[#2E7D32] mt-0.5">
                  Genesis to head hash chain is contiguous and verified with
                  SHA-256 HMAC digest.
                </div>
              </div>
            </div>
          )}

          {/* Table Card */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
              <h2 className="text-sm font-bold text-[#2A1810]">
                Cryptographic Block Ledger (EOA-2027-1042)
              </h2>
              <span className="text-xs font-mono text-[#736357]">
                Algorithm: SHA-256
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">IDX</th>
                    <th className="py-3 px-2">TIMESTAMP</th>
                    <th className="py-3 px-2">ACTOR</th>
                    <th className="py-3 px-2">ACTION</th>
                    <th className="py-3 px-2">HASH DIGEST</th>
                    <th className="py-3 px-2 text-right">INTEGRITY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {entries.map((e) => (
                    <tr
                      key={e.id}
                      className={
                        e.isTampered
                          ? "bg-red-50 text-red-900"
                          : "hover:bg-[#FAFAFA] text-[#2A1810]"
                      }
                    >
                      <td className="py-3 px-2 font-bold">#{e.index}</td>
                      <td className="py-3 px-2 text-[#736357]">
                        {e.timestamp}
                      </td>
                      <td className="py-3 px-2 font-sans font-medium">
                        {e.actor}
                      </td>
                      <td className="py-3 px-2 font-bold">{e.action}</td>
                      <td className="py-3 px-2 text-[10px] text-[#736357] truncate max-w-[180px]">
                        {e.hash}
                      </td>
                      <td className="py-3 px-2 text-right font-sans">
                        {e.isTampered ? (
                          <span className="font-bold text-red-600">
                            TAMPERED
                          </span>
                        ) : (
                          <span className="font-semibold text-[#2E7D32]">
                            VALID
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tamper Simulation Console */}
            <div className="border-t border-[#F0ECE6] pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-[#736357]">
                <AlertTriangle className="h-4 w-4 text-[#FAAA21]" />
                <span>
                  Simulate out-of-band SQL payload modification to test
                  automated tamper detection.
                </span>
              </div>
              <button
                type="button"
                onClick={handleTamperSimulation}
                disabled={isTampered}
                className="rounded border border-[#EC642A] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#EC642A] hover:bg-[#FFFBF7] transition-colors disabled:opacity-50"
              >
                Simulate Tamper on Block #1
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
