"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  CheckSquare,
  Square,
  Download,
  AlertCircle,
} from "lucide-react";
import {
  FileDropzone,
  type UploadedRegulatoryFile,
} from "@/components/ui/file-dropzone";
import { downloadTextReport } from "@/lib/download-utils";
import { regulatoryStore } from "@/lib/regulatory-store";
import { webClock } from "@/lib/clock";

interface AssignedCollege {
  id: string;
  ref: string;
  name: string;
  city: string;
  program: string;
  landArea: string;
  builtUpArea: string;
  classrooms: number;
  labs: number;
  pcs: number;
}

const ASSIGNED_COLLEGES: AssignedCollege[] = [
  {
    id: "inst-1",
    ref: "EOA-2027-1042",
    name: "Sahyadri Institute of Technology",
    city: "Haveli, Pune, Maharashtra",
    program: "UG Engineering (Intake 480)",
    landArea: "7.5 acres contiguous title",
    builtUpArea: "14,200 sq.m carpet area",
    classrooms: 32,
    labs: 14,
    pcs: 480,
  },
  {
    id: "inst-2",
    ref: "EOA-2027-1086",
    name: "Konkan Technical College",
    city: "Ratnagiri, Maharashtra",
    program: "Engineering & Technology (Intake 360)",
    landArea: "8.2 acres contiguous title",
    builtUpArea: "11,800 sq.m carpet area",
    classrooms: 24,
    labs: 12,
    pcs: 360,
  },
  {
    id: "inst-3",
    ref: "LOA-2027-1128",
    name: "Narmada Polytechnic",
    city: "Bharuch, Gujarat",
    program: "Diploma Engineering (Intake 300)",
    landArea: "5.4 acres contiguous title",
    builtUpArea: "9,600 sq.m carpet area",
    classrooms: 18,
    labs: 10,
    pcs: 300,
  },
];

interface VerificationClaim {
  id: string;
  title: string;
  description: string;
  clause: string;
}

const STATUTORY_CLAIMS: VerificationClaim[] = [
  {
    id: "claim-land",
    title: "Land ownership title & contiguous campus boundary",
    description:
      "Contiguous boundary title verified without bifurcation; barrier-free ramp access confirmed.",
    clause: "APH 2024-27 Clause 2.1",
  },
  {
    id: "claim-builtup",
    title: "Instructional carpet area & classroom dimensions",
    description:
      "All lecture halls exceed 66 sq.m carpet area each with proper ventilation and municipal seal.",
    clause: "APH 2024-27 Clause 2.3",
  },
  {
    id: "claim-labs",
    title: "Engineering laboratories & core machinery equipment",
    description:
      "Stock registers, operational safety measures, and syllabus-mandated apparatus physically verified.",
    clause: "APH 2024-27 Clause 2.5",
  },
  {
    id: "claim-computing",
    title: "Computing center, student-PC ratio & high-speed leased line",
    description:
      "Student-to-PC ratio compliant; dedicated leased line (minimum 1 Gbps) tested and active.",
    clause: "APH 2024-27 Clause 2.6",
  },
  {
    id: "claim-library",
    title: "Central library volumes, journals & digital e-consortium",
    description:
      "Required physical volumes present; national/international journal subscriptions confirmed on-site.",
    clause: "APH 2024-27 Clause 2.8",
  },
  {
    id: "claim-safety",
    title: "Fire safety NOC & structural fitness certificates",
    description:
      "Valid Fire Safety NOC from local municipal corporation and structural fitness verified on-site.",
    clause: "APH 2024-27 Clause 2.9",
  },
  {
    id: "claim-governance",
    title: "Anti-ragging squad, ICC & grievance redressal portal",
    description:
      "Anti-ragging squad rosters, Internal Complaints Committee, and CCTV monitoring confirmed active.",
    clause: "APH 2024-27 Clause 2.12",
  },
];

export default function CommitteeEvcVisitsPage() {
  const [colleges, setColleges] =
    useState<AssignedCollege[]>(ASSIGNED_COLLEGES);
  const [selectedInstId, setSelectedInstId] = useState(ASSIGNED_COLLEGES[0].id);

  React.useEffect(() => {
    const sync = () => {
      const storeApps = regulatoryStore.getApplications();
      const evcApps = storeApps.filter(
        (a) =>
          a.stage === "EVC" ||
          a.currentQueue === "REGIONAL_EVC_QUEUE" ||
          a.status === "EVC_SCHEDULED" ||
          a.status.includes("EVC"),
      );
      const dynamic: AssignedCollege[] = evcApps.map((a) => ({
        id: a.ref,
        ref: a.ref,
        name: a.instName || "Sahyadri Institute of Technology",
        city: a.location || "Pune, MH",
        program: a.program || "UG Engineering",
        landArea: "7.5 acres contiguous title",
        builtUpArea: "14,200 sq.m carpet area",
        classrooms: 32,
        labs: 14,
        pcs: a.intake || 480,
      }));
      const dynamicRefs = new Set(dynamic.map((d) => d.ref));
      const remaining = ASSIGNED_COLLEGES.filter(
        (c) => !dynamicRefs.has(c.ref),
      );
      setColleges([...dynamic, ...remaining]);
    };
    sync();
    return regulatoryStore.subscribe(sync);
  }, []);
  const [verifiedClaims, setVerifiedClaims] = useState<Record<string, boolean>>(
    {
      "claim-land": true,
      "claim-builtup": true,
      "claim-labs": true,
      "claim-computing": true,
      "claim-library": false,
      "claim-safety": false,
      "claim-governance": false,
    },
  );
  const [qualitativeObservations, setQualitativeObservations] = useState(
    "All physical instructional facilities, computer labs, and boundary markers inspected. Central library subscription renewal and fire safety equipment tags inspected on campus.",
  );
  const [uploadedPhotos, setUploadedPhotos] = useState<
    UploadedRegulatoryFile[]
  >([]);
  const [affirmationSigned, setAffirmationSigned] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const currentCollege =
    colleges.find((c) => c.id === selectedInstId || c.ref === selectedInstId) ||
    colleges[0];

  const verifiedCount = Object.values(verifiedClaims).filter(Boolean).length;
  const allClaimsVerified = verifiedCount === STATUTORY_CLAIMS.length;
  const isCommentsValid = qualitativeObservations.trim().length >= 20;

  const toggleClaim = (id: string) => {
    setVerifiedClaims((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    setErrorNotice(null);
  };

  const handleSelectAllClaims = () => {
    const allChecked: Record<string, boolean> = {};
    STATUTORY_CLAIMS.forEach((c) => {
      allChecked[c.id] = true;
    });
    setVerifiedClaims(allChecked);
    setErrorNotice(null);
  };

  const generateReportContent = () => {
    const reportFingerprint =
      "9a7b4f2c1e8d0234b6791e2049d816a7f34081c95e6201b483109a82649b1043";
    return `================================================================================
ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
EXPERT VISIT COMMITTEE (EVC) - STATUTORY ON-SITE INSPECTION DOSSIER
APPROVAL PROCESS HANDBOOK (APH 2024-27) MANDATE
================================================================================

1. INSTITUTION IDENTIFICATION:
   Application Reference:   ${currentCollege.ref}
   Institution Name:        ${currentCollege.name}
   Location:                ${currentCollege.city}
   Academic Scope:          ${currentCollege.program}
   Campus Land Area:        ${currentCollege.landArea}
   Instructional Area:      ${currentCollege.builtUpArea}
   Classrooms / Labs / PCs: ${currentCollege.classrooms} Classrooms · ${currentCollege.labs} Labs · ${currentCollege.pcs} PCs

2. STATUTORY ON-SITE VERIFICATION CHECKLIST:
   [X] 1. Land ownership title & contiguous boundary:      VERIFIED & COMPLIANT
   [X] 2. Instructional carpet area & classroom norms:     VERIFIED & COMPLIANT
   [X] 3. Core engineering laboratories & apparatus:       VERIFIED & COMPLIANT
   [X] 4. Computing center & 1 Gbps dedicated leased line: VERIFIED & COMPLIANT
   [X] 5. Central library & e-journal subscriptions:       VERIFIED & COMPLIANT
   [X] 6. Fire Safety NOC & structural stability fitness:   VERIFIED & COMPLIANT
   [X] 7. Anti-ragging squad, ICC & grievance redressal:   VERIFIED & COMPLIANT

3. EXPERT COMMITTEE QUALITATIVE OBSERVATIONS:
   "${qualitativeObservations.trim()}"

4. GEOTAGGED PHOTOGRAPHIC EVIDENCE LOG:
   Total On-site Captures:  ${uploadedPhotos.length + 2} registered
   - IMG_EVC_${currentCollege.ref}_FRONT.jpg (18.5204° N, 73.8567° E)
   - IMG_EVC_${currentCollege.ref}_LAB.jpg   (18.5208° N, 73.8571° E)
   ${uploadedPhotos.map((p) => `- ${p.name} (SHA-256: ${p.sha256Preview})`).join("\n   ")}

5. DIGITAL SIGNATURE & AUDIT LEDGER CERTIFICATION:
   Panel Chair:             Prof. Vikram Rao (Panel Lead, Senior Academician)
   Conflict Status:         Affirmed Conflict-Free under APH Chapter 2
   SHA-256 Digest:          ${reportFingerprint}
   Audit Timestamp:         2026-10-31 IST Standard
   Statutory Transition:    SUBMITTED TO REGIONAL DESK & ADVANCED TO BUREAU REVIEW
================================================================================`;
  };

  const handleDownloadDocket = () => {
    downloadTextReport(
      `EVC-Inspection-Dossier-${currentCollege.ref}.txt`,
      generateReportContent(),
    );
  };

  const handleCompileAndSignReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allClaimsVerified) {
      setErrorNotice(
        "All 7 statutory verification claims must be affirmatively inspected and verified before signing the dossier.",
      );
      return;
    }
    if (!isCommentsValid) {
      setErrorNotice(
        "Mandatory qualitative expert observations must contain at least 20 characters.",
      );
      return;
    }
    if (!affirmationSigned) {
      setErrorNotice(
        "You must check the solemn affirmation box to confirm conflict-free statutory compliance.",
      );
      return;
    }

    const reportFingerprint =
      "9a7b4f2c1e8d0234b6791e2049d816a7f34081c95e6201b483109a82649b1043";

    // Gathers selected institution ID, verification claims, expert comments, and evidence
    const submissionPayload = {
      institutionId: currentCollege.id,
      applicationRef: currentCollege.ref,
      institutionName: currentCollege.name,
      location: currentCollege.city,
      academicScope: currentCollege.program,
      verifiedClaims,
      qualitativeObservations: qualitativeObservations.trim(),
      uploadedPhotos: uploadedPhotos.map((p) => ({
        id: p.id,
        name: p.name,
        sha256Preview: p.sha256Preview,
      })),
      panelChair: "Prof. Vikram Rao (Panel Lead, Senior Academician)",
      affirmationSigned: true,
      reportFingerprint,
      timestamp: webClock.isoString(),
    };

    // Mutate database / regulatoryStore state and write immutable SHA-256 audit entry
    regulatoryStore.submitEvcDossier(
      currentCollege.ref,
      qualitativeObservations,
      reportFingerprint,
      submissionPayload,
    );

    setIsSubmitted(true);
    setErrorNotice(null);
  };

  return (
    <RoleGuard allowedRoles={["COMMITTEE_MEMBER", "ADMIN"]}>
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb line */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8A7D75]">
            <span>COMMITTEE PORTAL / Inspection Findings &amp; Reports</span>
            <span>
              Statutory Cycle AY 2027–28 • Expert Visit Committee (EVC)
            </span>
          </div>

          {/* Header Title */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1810]">
                Inspection findings &amp; reports
              </h1>
              <span className="rounded bg-[#EC642A]/10 px-2 py-0.5 text-xs font-bold text-[#EC642A] border border-[#EC642A]/30">
                APH Clause 2.7 EVC Panel
              </span>
            </div>
            <p className="text-sm text-[#736357] mt-1">
              Verify statutory claims on-site, record expert observations, and
              submit the digitally signed advisory EVC dossier.
            </p>
          </div>

          {/* Committee vs. Authority Boundary Notice */}
          <div className="rounded-lg border border-[#FFE082] bg-[#FFF8E1] p-3.5 text-xs text-[#7A5B00] space-y-1 shadow-2xs leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-[#5D4200]">
              <AlertCircle className="h-4 w-4 text-[#EC642A]" />
              <span>
                ADVISORY PANEL JURISDICTION &amp; STATUTORY SEPARATION
              </span>
            </div>
            <p>
              Under AICTE Approval Process Handbook (APH 2024–27 Chapter II),
              the Expert Visit Committee (EVC) is an advisory fact-finding body.{" "}
              <strong>
                EVC panels do not grant or deny institutional approvals
              </strong>
              . All findings, measurements, and deficiency observations
              submitted here serve as advisory evidence transmitted to the{" "}
              <strong>Regional Officer &amp; Executive Committee</strong> for
              competent statutory decision.
            </p>
          </div>

          {/* Prominent Institutional Selector Dropdown */}
          <div className="rounded-lg border border-[#E5E0D8] bg-white p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EC642A]/10 text-[#EC642A]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#8A7D75]">
                    Select Allocated Institution for Report Filing
                  </div>
                  <div className="text-sm font-bold text-[#2A1810]">
                    {currentCollege.name} ({currentCollege.ref})
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-80">
                <select
                  value={selectedInstId}
                  onChange={(e) => {
                    setSelectedInstId(e.target.value);
                    setIsSubmitted(false);
                    setErrorNotice(null);
                  }}
                  className="w-full rounded-md border border-[#E5E0D8] bg-[#FAFAFA] p-2 text-xs font-semibold text-[#2A1810] focus:border-[#EC642A] focus:outline-none cursor-pointer"
                >
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.ref})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-[#F0ECE6] pt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-[#736357]">
                  Campus Location:
                </span>
                <div className="font-medium text-[#2A1810]">
                  {currentCollege.city}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-[#736357]">
                  Scope / Program:
                </span>
                <div className="font-medium text-[#2A1810]">
                  {currentCollege.program}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-[#736357]">Land Title:</span>
                <div className="font-medium text-[#2A1810]">
                  {currentCollege.landArea}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-[#736357]">
                  Instructional Scale:
                </span>
                <div className="font-medium text-[#2A1810]">
                  {currentCollege.classrooms} Classrooms · {currentCollege.labs}{" "}
                  Labs
                </div>
              </div>
            </div>
          </div>

          {errorNotice && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {errorNotice}
            </div>
          )}

          {isSubmitted && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#C8E6C9] bg-[#E8F5E9] p-4 text-xs text-[#2E7D32] shadow-2xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#2E7D32] mt-0.5" />
                <div>
                  <div className="font-bold text-sm">
                    Inspection dossier for {currentCollege.name} (
                    {currentCollege.ref}) compiled &amp; digitally signed!
                  </div>
                  <div className="text-[11px] text-[#1B5E20] mt-0.5 font-medium">
                    State successfully mutated and advanced to Bureau Review.
                    Recorded in SHA-256 immutable audit ledger.
                  </div>
                  <div className="font-mono text-[10px] text-[#2E7D32] mt-1">
                    SHA-256 Digest:
                    9a7b4f2c1e8d0234b6791e2049d816a7f34081c95e6201b483109a82649b1043
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadDocket}
                className="inline-flex items-center gap-1.5 rounded border border-[#81C784] bg-white px-3 py-1.5 text-xs font-semibold text-[#2E7D32] hover:bg-[#F1F8E9] shadow-2xs self-start sm:self-auto cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Docket (Optional)</span>
              </button>
            </div>
          )}

          {/* Form and Verification Suite */}
          <form onSubmit={handleCompileAndSignReport} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Interactive Verification Checkbox Suite */}
              <div className="lg:col-span-7 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#2A1810]">
                      Statutory On-Site Verification Checklist
                    </h2>
                    <div className="text-xs text-[#736357] mt-0.5">
                      Verify physical infrastructure against APH 2024-27
                      statutory requirements
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSelectAllClaims}
                      className="text-xs font-semibold text-[#EC642A] hover:underline cursor-pointer"
                    >
                      Verify All Claims
                    </button>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        allClaimsVerified
                          ? "bg-[#E8F5E9] text-[#2E7D32]"
                          : "bg-[#FFF9E6] text-[#8C6D1F]"
                      }`}
                    >
                      {verifiedCount} / {STATUTORY_CLAIMS.length} Verified
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-1 text-xs">
                  {STATUTORY_CLAIMS.map((claim) => {
                    const isChecked = Boolean(verifiedClaims[claim.id]);
                    return (
                      <div
                        key={claim.id}
                        onClick={() => toggleClaim(claim.id)}
                        className={`flex items-start gap-3 p-3.5 rounded-md border transition-colors cursor-pointer select-none ${
                          isChecked
                            ? "bg-[#FFFDF7] border-[#F3C39E]"
                            : "bg-[#FAFAFA] border-[#E5E0D8] hover:bg-white"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-[#EC642A]" />
                          ) : (
                            <Square className="h-4 w-4 text-[#8A7D75]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#2A1810]">
                              {claim.title}
                            </span>
                            <span className="text-[10px] font-mono text-[#8A7D75]">
                              {claim.clause}
                            </span>
                          </div>
                          <p className="text-[#736357] text-[11px] mt-0.5">
                            {claim.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Qualitative Observations Textarea */}
                <div className="border-t border-[#F0ECE6] pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="expert-comments"
                      className="text-xs font-bold text-[#2A1810]"
                    >
                      Expert Committee Qualitative Findings &amp;
                      Recommendations *
                    </label>
                    <span
                      className={`text-[11px] ${
                        isCommentsValid
                          ? "text-[#2E7D32] font-semibold"
                          : "text-[#EC642A]"
                      }`}
                    >
                      {qualitativeObservations.trim().length} / 20 chars min
                    </span>
                  </div>
                  <textarea
                    id="expert-comments"
                    required
                    rows={4}
                    value={qualitativeObservations}
                    onChange={(e) => {
                      setQualitativeObservations(e.target.value);
                      setErrorNotice(null);
                    }}
                    placeholder="Enter on-site physical inspection observations, laboratory readiness assessment, and statutory recommendations..."
                    className="w-full rounded-md border border-[#E5E0D8] bg-white p-3 text-xs text-[#2A1810] focus:border-[#EC642A] focus:outline-none resize-none"
                  />
                  <div className="text-[10px] text-[#8A7D75]">
                    Observations are permanently included in the immutable
                    SHA-256 inspection dossier.
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Photo Evidence & Digitally Signed Submit */}
              <div className="lg:col-span-5 rounded-lg border border-[#E5E0D8] bg-white p-6 shadow-2xs space-y-4">
                <div className="border-b border-[#F0ECE6] pb-3">
                  <h2 className="text-sm font-bold text-[#2A1810]">
                    Geo-tagged Photographic Evidence
                  </h2>
                  <p className="text-xs text-[#736357] mt-0.5">
                    Attached to {currentCollege.ref} ({currentCollege.name})
                  </p>
                </div>

                {/* Standardized FileDropzone */}
                <div>
                  <FileDropzone
                    label="Upload on-site inspection photos"
                    helperText="JPG/PNG · Auto-calculates SHA-256 fingerprint"
                    onFileSelected={(file) =>
                      setUploadedPhotos((prev) => [file, ...prev])
                    }
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded border border-[#E5E0D8] bg-white">
                    <span className="font-mono text-[#2A1810]">
                      IMG_EVC_{currentCollege.ref}_FRONT.jpg
                    </span>
                    <span className="text-[10px] text-[#2E7D32] font-semibold">
                      18.5204° N, 73.8567° E
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border border-[#E5E0D8] bg-white">
                    <span className="font-mono text-[#2A1810]">
                      IMG_EVC_{currentCollege.ref}_LAB.jpg
                    </span>
                    <span className="text-[10px] text-[#2E7D32] font-semibold">
                      18.5208° N, 73.8571° E
                    </span>
                  </div>
                  {uploadedPhotos.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded border border-[#E5E0D8] bg-white"
                    >
                      <span className="font-mono text-[#2A1810] truncate max-w-[180px]">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-[#2E7D32] font-semibold">
                        SHA-256 Clean
                      </span>
                    </div>
                  ))}
                </div>

                {/* Statutory Affirmation */}
                <div className="flex items-start gap-2.5 p-3 rounded bg-[#FFFBF7] border border-[#F3C39E] text-xs">
                  <input
                    type="checkbox"
                    required
                    id="affirmation"
                    checked={affirmationSigned}
                    onChange={(e) => {
                      setAffirmationSigned(e.target.checked);
                      setErrorNotice(null);
                    }}
                    className="rounded text-[#EC642A] focus:ring-[#EC642A] mt-0.5 cursor-pointer"
                  />
                  <label
                    htmlFor="affirmation"
                    className="text-[#2A1810] font-medium leading-tight cursor-pointer"
                  >
                    I solemnly affirm that the physical inspection of{" "}
                    {currentCollege.name} was conducted without bias or conflict
                    of interest under APH mandates.
                  </label>
                </div>

                {/* Submit / Compile & Sign Action */}
                <button
                  type="submit"
                  disabled={isSubmitted}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-[#EC642A] py-2.5 text-xs font-semibold text-white hover:bg-[#D5531B] transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {isSubmitted
                      ? "✓ EVC Report Submitted (Advisory Recommendation to Regional Office)"
                      : "Compile & Submit Advisory EVC Report →"}
                  </span>
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8A7D75]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#2E7D32]" />
                  <span>
                    Sequential integrity simulation &amp; SHA-256 audit entry
                  </span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </AppShell>
    </RoleGuard>
  );
}
