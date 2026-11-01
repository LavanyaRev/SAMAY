"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  FileDropzone,
  type UploadedRegulatoryFile,
} from "@/components/ui/file-dropzone";
import {
  regulatoryStore,
  type RegulatoryUndertaking,
} from "@/lib/regulatory-store";
import {
  type UndertakingFulfillmentRecord,
  UndertakingStatusTag,
} from "@samay/shared";
import { downloadTextReport } from "@/lib/download-utils";

export default function InstitutionUndertakingsPage() {
  const [checklist, setChecklist] = useState<RegulatoryUndertaking[]>([]);
  const [activeItem, setActiveItem] = useState<{
    id: string;
    title: string;
    pill: string;
  }>({
    id: "chk-3",
    title: "Replace Fire safety NOC",
    pill: "DEFICIENCY D1 · ITEM 01",
  });
  const [issuedOn, setIssuedOn] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [officerResponse, setOfficerResponse] = useState("");
  const [uploadedFile, setUploadedFile] =
    useState<UploadedRegulatoryFile | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(
    null,
  );

  // MODULE 6: Undertaking Fulfillment Engine States
  const [fulfillments, setFulfillments] = useState<
    UndertakingFulfillmentRecord[]
  >([]);
  const [selectedFulfillment, setSelectedFulfillment] =
    useState<UndertakingFulfillmentRecord | null>(null);
  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false);
  const [fulfillmentFile, setFulfillmentFile] =
    useState<UploadedRegulatoryFile | null>(null);

  useEffect(() => {
    const loadData = () => {
      setChecklist(regulatoryStore.getUndertakings());
      setFulfillments(
        regulatoryStore.getUndertakingFulfillments("EOA-2027-1042"),
      );
    };
    loadData();
    const unsubscribe = regulatoryStore.subscribe(loadData);
    return unsubscribe;
  }, []);

  const completedCount = checklist.filter((c) => c.isVerified).length;
  const pendingScrutinyCount = checklist.filter(
    (c) => c.isPendingScrutiny,
  ).length;
  const attentionCount = checklist.filter((c) => c.needsAttention).length;

  const handleSelectCondition = (item: RegulatoryUndertaking) => {
    const isFire = item.condition.toLowerCase().includes("fire");
    const isFaculty = item.condition.toLowerCase().includes("faculty");
    setActiveItem({
      id: item.id,
      title: isFire
        ? "Replace Fire safety NOC"
        : isFaculty
          ? "Upload Faculty Undertaking"
          : `Upload Evidence: ${item.condition}`,
      pill: isFire
        ? "DEFICIENCY D1 · ITEM 01"
        : isFaculty
          ? "DEFICIENCY D1 · ITEM 02"
          : `REQUIREMENT · ${item.id.toUpperCase()}`,
    });
    setOfficerResponse("");
    setIssuedOn("");
    setValidUntil("");
    setUploadedFile(null);
    setSaveSuccessNotice(null);
  };

  const handleResetDemoState = () => {
    const fresh = regulatoryStore.resetUndertakingsToDemoState();
    setChecklist(fresh);
    setActiveItem({
      id: "chk-3",
      title: "Replace Fire safety NOC",
      pill: "DEFICIENCY D1 · ITEM 01",
    });
    setOfficerResponse("");
    setIssuedOn("");
    setValidUntil("");
    setUploadedFile(null);
    setSaveSuccessNotice(
      "Demo state restored: 2 statutory deficiencies open (Fire safety NOC expired & Faculty availability affidavit not attached). 6 of 8 requirements verified.",
    );
  };

  const handleToggleState = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    regulatoryStore.toggleUndertakingDeficiency(id);
  };

  const handleSaveEvidence = () => {
    if (!uploadedFile) {
      alert(
        "Please select and attach a valid replacement PDF document before saving evidence.",
      );
      return;
    }
    const fileName = uploadedFile.name;

    // CRITICAL: Newly uploaded evidence enters "Pending Scrutiny Review" stage, NOT "Verified"
    regulatoryStore.submitUndertakingEvidence(
      activeItem.id,
      fileName,
      validUntil || "31 Oct 2027",
      officerResponse || "Documentary evidence attached for scrutiny review.",
    );

    // Advance application state to DEFICIENCY_RESOLVED_RESUBMITTED and ballWith: REGIONAL_OFFICER
    regulatoryStore.resolveAndResubmitDeficiency(
      "EOA-2027-1042",
      fileName,
      officerResponse ||
        "Deficiency resolved by institution; resubmitted for regional scrutiny verification.",
    );

    setUploadedFile(null);
    setIssuedOn("");
    setValidUntil("");
    setOfficerResponse("");
    setSaveSuccessNotice(
      `Evidence "${fileName}" for "${activeItem.title}" committed to immutable SHA-256 audit ledger (v2) and routed to Regional Scrutiny Desk. Status: DEFICIENCY_RESOLVED_RESUBMITTED. Application has re-entered Regional Scrutiny Queue!`,
    );
  };

  const handleOpenFulfillmentUpload = (ful: UndertakingFulfillmentRecord) => {
    setSelectedFulfillment(ful);
    setFulfillmentFile(null);
    setIsFulfillmentModalOpen(true);
  };

  const handleSubmitFulfillmentEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFulfillment) return;
    const name =
      fulfillmentFile?.name ||
      `${selectedFulfillment.promiseDescription.slice(0, 15).replace(/\s+/g, "_")}_Evidence.pdf`;
    const sha =
      fulfillmentFile?.sha256Preview ||
      "4a82190b82736451029384756102938475610293847561029384756102938475";

    regulatoryStore.submitFulfillmentEvidence(selectedFulfillment.id, {
      filename: name,
      mimeType: "application/pdf",
      sha256: sha,
      uploadedAt: "02 Nov 2026, 11:45 IST",
    });

    setIsFulfillmentModalOpen(false);
    setSelectedFulfillment(null);
    setFulfillmentFile(null);
    setSaveSuccessNotice(
      `Evidence for commitment "${selectedFulfillment.promiseDescription}" submitted and registered under SHA-256 audit fingerprint: ${sha.slice(0, 16)}...`,
    );
  };

  const handleDownloadFulfillmentReport = (
    ful: UndertakingFulfillmentRecord,
  ) => {
    const content = `================================================================================
ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
UNDERTAKING LIFECYCLE FULFILLMENT AUDIT DOSSIER
================================================================================
Fulfillment Ref:      ${ful.id}
Application Ref:      ${ful.applicationRef}
Institution:          ${ful.institutionId} (Sahyadri Institute of Technology, Pune)
Status Tag:           ${ful.statusTag}

1. WHAT WAS PROMISED?
${ful.promiseDescription}

2. WHEN WAS IT PROMISED?
Committed Date:       ${ful.committedDate}

3. WHAT IS THE DEADLINE?
Fulfillment Deadline: ${ful.fulfillmentDeadline}

4. EVIDENCE SUBMISSIONS:
${
  ful.evidenceBindings.length > 0
    ? ful.evidenceBindings
        .map(
          (b, i) =>
            `[${i + 1}] File: ${b.filename}\n    SHA-256: ${b.sha256}\n    Timestamp: ${b.uploadedAt}`,
        )
        .join("\n")
    : "No digital evidence attached yet."
}

5. VERIFICATION STATUS:
Authorized Official:   ${ful.authorizedVerifier || "Pending verification by Regional Desk"}
Verified Timestamp:    ${ful.verifiedTimestamp || "Awaiting statutory review"}
================================================================================
DIGITAL AUDIT VALIDATION:
SHA-256 Digest: c9824f1182374e62938a7b0192837465e9102938475610293847561029384756
AICTE Central Trust Engine · IST Standard
================================================================================`;
    downloadTextReport(`Undertaking-Fulfillment-${ful.id}.txt`, content);
  };

  return (
    <RoleGuard allowedRoles={["INSTITUTION"]}>
      <AppShell>
        <div className="space-y-8">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>INSTITUTION PORTAL / Undertakings &amp; Evidence</span>
            <span>Statutory Cycle AY 2027–28 • IST Standard</span>
          </div>

          {/* Header Title + Demo Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Undertakings &amp; evidence
              </h1>
              <p className="text-sm text-[#736357] mt-1">
                EOA-2027-1042 · Respond to memo WRO/1042/D1 with traceable,
                signed evidence.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDemoState}
              className="inline-flex items-center gap-2 rounded-lg border border-[#F3C39E] bg-[#FFF8F0] px-3.5 py-2 text-xs font-semibold text-[#EC642A] hover:bg-[#FFEEDD] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
              title="Reset undertakings checklist to show 2 open deficiencies (Fire Safety NOC expired & Faculty ratio missing) for demo video"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Demo State (2 Deficiencies)</span>
            </button>
          </div>

          {saveSuccessNotice && (
            <div className="flex items-center gap-2 rounded-xl border border-[#C8E6C9] bg-[#E8F5E9] p-4 text-xs text-[#2E7D32] shadow-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{saveSuccessNotice}</span>
            </div>
          )}

          {/* Alert Banner */}
          {attentionCount > 0 ? (
            <div className="rounded-xl border border-[#F3C39E] bg-[#FFFBF7] p-5 shadow-xs flex items-start gap-3">
              <div className="mt-0.5 text-[#EC642A]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#2A1810]">
                  {attentionCount}{" "}
                  {attentionCount === 1 ? "item needs" : "items need"} your
                  attention before resubmission
                </h2>
                <p className="text-xs text-[#736357] mt-0.5">
                  {completedCount} of 8 requirements verified.{" "}
                  {pendingScrutinyCount > 0
                    ? `${pendingScrutinyCount} under scrutiny review.`
                    : ""}{" "}
                  Automated checks are advisory; the scrutiny officer makes the
                  final statutory determination.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#FAAA21] bg-[#FFFDF5] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#8C6D1F]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    All 8 statutory undertakings currently marked verified
                  </h2>
                  <p className="text-xs text-[#736357] mt-0.5">
                    To demonstrate the deficiency rectification flow (replacing
                    expired Fire Safety NOC &amp; Faculty Cadre Affidavit) in
                    your video, reset to demo state below.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetDemoState}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-[#EC642A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset 2 Deficiencies for Demo</span>
              </button>
            </div>
          )}

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            {/* Left Column (7 cols): Checklist */}
            <div className="lg:col-span-7 rounded-xl bg-white p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  Conditional undertaking checklist
                </h2>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-[#736357] font-semibold">
                    {completedCount} / 8 complete
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDemoState}
                    className="inline-flex items-center gap-1 rounded bg-[#EC642A]/10 border border-[#EC642A]/30 px-2.5 py-1 text-[11px] font-bold text-[#EC642A] hover:bg-[#EC642A] hover:text-white transition-colors cursor-pointer"
                    title="Reset to 2 open deficiencies (Fire Safety NOC expired & Faculty ratio missing) for demo video"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Demo State (2 Deficiencies)</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                      <th className="py-2.5 px-2">REQUIREMENT / CONDITION</th>
                      <th className="py-2.5 px-2">EVIDENCE</th>
                      <th className="py-2.5 px-2">STATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE6]">
                    {checklist.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => handleSelectCondition(item)}
                        className={`cursor-pointer transition-colors ${
                          item.id === activeItem.id
                            ? "bg-[#FFF9F4]"
                            : item.isVerified
                              ? "hover:bg-[#FAFAFA]"
                              : "bg-[#FFFDF5] hover:bg-[#FFF8EE]"
                        }`}
                      >
                        <td className="py-3 px-2">
                          <div className="font-bold text-[#2A1810] flex items-center gap-1.5">
                            {item.isVerified ? (
                              <Check className="h-3.5 w-3.5 text-[#2E7D32]" />
                            ) : (
                              <span className="text-[#EC642A] font-bold">
                                !
                              </span>
                            )}
                            <span>{item.condition}</span>
                          </div>
                          <div className="text-[11px] text-[#736357] ml-5">
                            {item.detail}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-[#2A1810] font-medium">
                            {item.evidence}
                          </div>
                          <div className="text-[11px] text-[#736357]">
                            {item.signedDetail}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {item.isVerified ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#2E7D32]">
                                Verified
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleToggleState(item.id, e)}
                                title="Toggle deficient state for video demonstration"
                                className="text-[10px] text-[#EC642A] hover:underline cursor-pointer"
                              >
                                (mark deficient)
                              </button>
                            </div>
                          ) : item.isPendingScrutiny ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded bg-[#FFF9E6] px-2 py-0.5 text-[10px] font-bold uppercase text-[#8C6D1F] border border-[#FAAA21]/40">
                                Pending Scrutiny
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleToggleState(item.id, e)}
                                title="Toggle deficient state for video demonstration"
                                className="text-[10px] text-[#A89D95] hover:text-[#EC642A] underline cursor-pointer"
                              >
                                (reopen)
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectCondition(item);
                              }}
                              className="font-medium text-[#EC642A] hover:underline cursor-pointer"
                            >
                              {item.actionText}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Card note */}
              <div className="rounded-md bg-[#F8F7F5] p-3 text-[11px] text-[#736357] leading-relaxed">
                Conditional logic: AICTE statutory profile • Self-financed •
                Engineering • Existing Institution. No requirements are waived
                by an upload alone.
              </div>
            </div>

            {/* Right Column (5 cols): Replace Fire safety NOC / Upload panel */}
            <div className="lg:col-span-5 rounded-xl bg-white p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                <h2 className="text-sm font-bold text-[#2A1810]">
                  {activeItem.title}
                </h2>
                <button
                  type="button"
                  className="text-[#8A7D75] hover:text-[#2A1810]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="inline-block rounded bg-[#FFF3E0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9A5B18]">
                {activeItem.pill}
              </div>

              <p className="text-xs text-[#736357] leading-relaxed">
                Attach the renewed certificate or signed affidavit in PDF
                format. Client-side SHA-256 fingerprint will be generated
                automatically.
              </p>

              {/* Standardized FileDropzone */}
              <div>
                <FileDropzone
                  label="Drop renewed certificate PDF"
                  helperText="PDF format · Max 15MB · Instant SHA-256 computation"
                  onFileSelected={(file) => setUploadedFile(file)}
                />
              </div>

              {/* Issued on / Valid until side-by-side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#736357] mb-1">
                    Issued on
                  </label>
                  <input
                    type="text"
                    value={issuedOn}
                    onChange={(e) => setIssuedOn(e.target.value)}
                    placeholder="e.g. 01 Nov 2026"
                    className="w-full rounded border border-[#E5E0D8] bg-white px-2.5 py-1.5 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#736357] mb-1">
                    Valid until
                  </label>
                  <input
                    type="text"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    placeholder="e.g. 01 Nov 2027"
                    className="w-full rounded border border-[#E5E0D8] bg-white px-2.5 py-1.5 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Response to Scrutiny Officer */}
              <div>
                <label className="block text-[11px] font-medium text-[#736357] mb-1">
                  Response to scrutiny officer
                </label>
                <textarea
                  rows={2}
                  value={officerResponse}
                  onChange={(e) => setOfficerResponse(e.target.value)}
                  placeholder="Enter institutional response / notes for scrutiny officer..."
                  className="w-full rounded border border-[#E5E0D8] bg-white p-2.5 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none resize-none"
                />
              </div>

              {/* Verification check item - ONLY rendered when replacement document is attached */}
              {uploadedFile && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#2E7D32] font-medium animate-fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    PDF readable · Signature detected · Validity in statutory
                    range
                  </span>
                </div>
              )}

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveEvidence}
                className="w-full rounded-md bg-[#EC642A] py-2.5 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs cursor-pointer"
              >
                Resolve Defect & Resubmit to Scrutiny Queue →
              </button>

              <div className="text-[10px] text-[#8A7D75] text-center">
                Saving creates version 2. The original remains in the immutable
                audit ledger.
              </div>

              {/* Version History */}
              <div className="border-t border-[#F0ECE6] pt-3 text-[11px] text-[#736357] space-y-1">
                <div className="font-bold text-[#2A1810]">Version history</div>
                <div className="text-[#8A7D75]">
                  v1 · 20 Oct, 11:29 · S. Patil · Submitted
                </div>
                <div className="text-[#8A7D75]">
                  02 Nov, 09:20 · WRO desk · Replacement requested
                </div>
              </div>
            </div>
          </div>

          {/* MODULE 6: Undertaking Lifecycle Fulfillment Engine */}
          <div className="rounded-xl bg-white p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F0ECE6] gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#EC642A]" />
                  <h2 className="text-base font-bold text-[#2A1810]">
                    Undertaking Lifecycle Fulfillment Engine
                  </h2>
                </div>
                <p className="text-xs text-[#736357] mt-0.5">
                  Statutory compliance monitor answering: What was promised?
                  When? Deadline? Evidence submitted? Official verification?
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#E8F5E9] px-2.5 py-1 text-xs font-bold text-[#2E7D32]">
                  {
                    fulfillments.filter(
                      (f) => f.statusTag === UndertakingStatusTag.FULFILLED,
                    ).length
                  }{" "}
                  Fulfilled
                </span>
                <span className="rounded bg-[#FFF9E6] px-2.5 py-1 text-xs font-bold text-[#8C6D1F]">
                  {
                    fulfillments.filter(
                      (f) =>
                        f.statusTag === UndertakingStatusTag.PENDING_EVIDENCE,
                    ).length
                  }{" "}
                  Pending Evidence
                </span>
                <span className="rounded bg-[#FFEBE5] px-2.5 py-1 text-xs font-bold text-[#C23B17]">
                  {
                    fulfillments.filter(
                      (f) =>
                        f.statusTag === UndertakingStatusTag.OVERDUE_ESCALATED,
                    ).length
                  }{" "}
                  Overdue
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE6] text-[10px] font-bold uppercase tracking-wider text-[#8A7D75]">
                    <th className="py-3 px-2">WHAT WAS PROMISED?</th>
                    <th className="py-3 px-2">WHEN PROMISED?</th>
                    <th className="py-3 px-2">DEADLINE</th>
                    <th className="py-3 px-2">EVIDENCE SUBMITTED?</th>
                    <th className="py-3 px-2">VERIFIER SIGNOFF</th>
                    <th className="py-3 px-2">STATUS</th>
                    <th className="py-3 px-2">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {fulfillments.map((ful) => (
                    <tr
                      key={ful.id}
                      className="hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="py-3 px-2 max-w-xs">
                        <div className="font-bold text-[#2A1810]">
                          {ful.promiseDescription}
                        </div>
                        <div className="text-[10px] font-mono text-[#8A7D75]">
                          Ref: {ful.id}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[#736357] whitespace-nowrap">
                        {ful.committedDate}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            ful.statusTag ===
                            UndertakingStatusTag.OVERDUE_ESCALATED
                              ? "text-[#C23B17]"
                              : "text-[#2A1810]"
                          }`}
                        >
                          {ful.fulfillmentDeadline}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {ful.evidenceBindings.length > 0 ? (
                          <div className="space-y-1">
                            {ful.evidenceBindings.map((ev, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 text-xs text-[#2A1810]"
                              >
                                <FileText className="h-3.5 w-3.5 text-[#EC642A]" />
                                <span className="font-medium underline">
                                  {ev.filename}
                                </span>
                              </div>
                            ))}
                            <div className="text-[10px] font-mono text-[#8A7D75]">
                              SHA-256:{" "}
                              {ful.evidenceBindings[0].sha256.slice(0, 16)}...
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#8A7D75] italic">
                            No evidence attached
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {ful.authorizedVerifier ? (
                          <div>
                            <div className="font-semibold text-[#2E7D32] flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{ful.authorizedVerifier}</span>
                            </div>
                            <div className="text-[10px] text-[#8A7D75]">
                              {ful.verifiedTimestamp}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#8A7D75]">
                            Awaiting Officer Verification
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        {ful.statusTag === UndertakingStatusTag.FULFILLED && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#E8F5E9] px-2 py-0.5 text-[10px] font-bold uppercase text-[#2E7D32] border border-[#C8E6C9]">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Fulfilled</span>
                          </span>
                        )}
                        {ful.statusTag ===
                          UndertakingStatusTag.PENDING_EVIDENCE && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#FFF9E6] px-2 py-0.5 text-[10px] font-bold uppercase text-[#8C6D1F] border border-[#FAAA21]/50">
                            <Clock className="h-3 w-3" />
                            <span>Pending Evidence</span>
                          </span>
                        )}
                        {ful.statusTag ===
                          UndertakingStatusTag.OVERDUE_ESCALATED && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#FFEBE5] px-2 py-0.5 text-[10px] font-bold uppercase text-[#C23B17] border border-[#F3C39E]">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Overdue Escalated</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {ful.statusTag !== UndertakingStatusTag.FULFILLED && (
                            <button
                              type="button"
                              onClick={() => handleOpenFulfillmentUpload(ful)}
                              className="inline-flex items-center gap-1 rounded border border-[#E5E0D8] bg-white px-2 py-1 text-xs font-semibold text-[#EC642A] hover:bg-neutral-50 cursor-pointer"
                            >
                              <Upload className="h-3 w-3" />
                              <span>Attach Evidence</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDownloadFulfillmentReport(ful)}
                            className="p-1 text-[#736357] hover:text-[#EC642A] rounded hover:bg-neutral-100 cursor-pointer"
                            title="Download Statutory Fulfillment Dossier"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Evidence Upload Modal for Fulfillment Record */}
        {isFulfillmentModalOpen && selectedFulfillment && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
          >
            <div className="flex min-h-full items-center justify-center py-6 sm:py-10">
              <div
                className="relative w-full max-w-md rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xl space-y-4"
                style={{ backgroundColor: "#ffffff" }}
              >
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                  <div>
                    <h2 className="text-base font-bold text-[#2A1810]">
                      Attach Fulfillment Evidence
                    </h2>
                    <p className="text-xs text-[#736357]">
                      Ref: {selectedFulfillment.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFulfillmentModalOpen(false)}
                    className="rounded p-1 text-[#736357] hover:bg-neutral-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded bg-[#FAFAFA] p-3 border border-[#E5E0D8] text-xs">
                  <div className="font-semibold text-[#2A1810]">
                    Statutory Commitment:
                  </div>
                  <p className="text-[#736357] mt-1">
                    {selectedFulfillment.promiseDescription}
                  </p>
                  <div className="mt-2 text-[11px] font-semibold text-[#EC642A]">
                    Deadline: {selectedFulfillment.fulfillmentDeadline}
                  </div>
                </div>

                <form
                  onSubmit={handleSubmitFulfillmentEvidence}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-[#2A1810] mb-1">
                      Signed Affidavit or Authority Certificate
                    </label>
                    <FileDropzone
                      label="Drop fulfillment affidavit PDF"
                      helperText="PDF format · Max 10MB · Generates SHA-256 fingerprint"
                      onFileSelected={(file) => setFulfillmentFile(file)}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0ECE6]">
                    <button
                      type="button"
                      onClick={() => setIsFulfillmentModalOpen(false)}
                      className="rounded border border-[#E5E0D8] px-3 py-1.5 text-xs font-medium text-[#736357] hover:bg-neutral-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-[#EC642A] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#D5531B] transition-colors cursor-pointer"
                    >
                      Submit for Statutory Verification →
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </RoleGuard>
  );
}
