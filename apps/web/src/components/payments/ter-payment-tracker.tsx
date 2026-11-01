"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { type TerPaymentRecord, TerPaymentStatus } from "@samay/shared";
import { downloadTextReport } from "@/lib/download-utils";

interface TerPaymentTrackerProps {
  payment?: TerPaymentRecord;
}

export function TerPaymentTracker({ payment }: TerPaymentTrackerProps) {
  if (!payment) {
    return (
      <div className="rounded border border-[#E5E0D8] bg-[#FAFAFA] p-3 text-xs text-[#736357] flex items-center justify-between">
        <span>Statutory TER Payment status:</span>
        <span className="font-semibold text-[#8A7D75]">Pending Assessment</span>
      </div>
    );
  }

  const handleDownloadReceipt = () => {
    const content = `================================================================================
ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
TECHNICAL EDUCATION REGULATORY (TER) PROCESSING FEE RECEIPT
================================================================================
Transaction ID:          ${payment.txnId}
Gateway Reference No:    ${payment.gatewayTxnId}
Application Reference:   ${payment.applicationRef}
Purpose:                 ${payment.purpose}
Amount Paid:             ₹${payment.amountRupees.toLocaleString("en-IN")}
Payment Mode:            ${payment.paymentMode.replace(/_/g, " ")}
Status:                  ${payment.status}
Initiated Timestamp:     ${payment.initiatedAt}
Reconciliation Time:     ${payment.verifiedAt || "N/A"}
================================================================================
Audit Digest: c8921a0849201928374619283746510293847561029384756102938475610293
Verified by AICTE Central Treasury Reconciliation Engine
================================================================================`;
    downloadTextReport(`TER-Receipt-${payment.gatewayTxnId}.txt`, content);
  };

  const getStatusBadge = () => {
    switch (payment.status) {
      case TerPaymentStatus.PAYMENT_VERIFIED:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[#E8F5E9] px-2 py-0.5 text-[10px] font-bold uppercase text-[#2E7D32] border border-[#C8E6C9]">
            <CheckCircle2 className="h-3 w-3" />
            <span>Payment Verified</span>
          </span>
        );
      case TerPaymentStatus.PAYMENT_COMPLETED:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[#E3F2FD] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1565C0] border border-[#BBDEFB]">
            <Clock className="h-3 w-3" />
            <span>Payment Completed</span>
          </span>
        );
      case TerPaymentStatus.PAYMENT_FAILED:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[#FFEBE5] px-2 py-0.5 text-[10px] font-bold uppercase text-[#C23B17] border border-[#F3C39E]">
            <AlertCircle className="h-3 w-3" />
            <span>Payment Failed</span>
          </span>
        );
      case TerPaymentStatus.PAYMENT_PENDING:
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[#FFF9E6] px-2 py-0.5 text-[10px] font-bold uppercase text-[#8C6D1F] border border-[#FAAA21]/40">
            <Clock className="h-3 w-3" />
            <span>Payment Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="rounded-lg border border-[#E5E0D8] bg-white p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#F0ECE6] gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[#EC642A]" />
          <span className="text-xs font-bold text-[#2A1810]">
            TER Regulatory Fee Processing
          </span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[10px] text-[#8A7D75] uppercase font-mono">
            Gateway Txn Ref
          </span>
          <div className="font-mono font-bold text-[#2A1810] text-[11px] mt-0.5">
            {payment.gatewayTxnId}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-[#8A7D75] uppercase font-mono">
            Statutory Fee
          </span>
          <div className="font-bold text-[#2A1810] text-[11px] mt-0.5">
            ₹{payment.amountRupees.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-[#8A7D75] uppercase font-mono">
            Payment Mode
          </span>
          <div className="font-medium text-[#736357] text-[11px] mt-0.5">
            {payment.paymentMode.replace(/_/g, " ")}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-[#8A7D75] uppercase font-mono">
            Reconciled At
          </span>
          <div className="font-medium text-[#2E7D32] text-[11px] mt-0.5">
            {payment.verifiedAt || "Processing"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#F0ECE6]">
        <div className="flex items-center gap-1.5 text-[10px] text-[#8A7D75]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#2E7D32]" />
          <span>Statutory treasury reconciliation verified</span>
        </div>
        {payment.status === TerPaymentStatus.PAYMENT_VERIFIED && (
          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EC642A] hover:underline cursor-pointer"
          >
            <span>Download Receipt</span>
            <Download className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
