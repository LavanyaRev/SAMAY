"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  SlidersHorizontal,
  FileCode2,
  Eye,
  Plus,
  Save,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { useApp } from "@/lib/app-context";
import {
  getNotificationsSnapshot,
  subscribeNotificationsStore,
  renderHandlebars,
  createTemplateVersionInStore,
  updatePolicyInStore,
  type DueItemKind,
  type EscalationLevelRuleItem,
} from "@/lib/notifications-client";

export default function AdminNotificationsPage() {
  const { locale } = useApp();
  const [store, setStore] = useState(() => getNotificationsSnapshot());
  const [selectedKind, setSelectedKind] =
    useState<DueItemKind>("PROCESSING_STAGE");
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>(
    "TPL_ESCALATION_L1_REGIONAL_OFFICER",
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Sample variables for live Handlebars preview
  const [previewVars, setPreviewVars] = useState({
    institution: "Walchand College of Engineering, Sangli",
    applicationId: "APP-2026-WRO-00104",
    dueDate: "2026-05-08",
    daysRemaining: -3,
    actionLink: "/applications/APP-2026-WRO-00104",
  });

  useEffect(() => {
    return subscribeNotificationsStore(() => {
      setStore({ ...getNotificationsSnapshot() });
    });
  }, []);

  const currentPolicy =
    store.policies.find((p) => p.kind === selectedKind) || store.policies[0];
  const [editableLevels, setEditableLevels] = useState<
    EscalationLevelRuleItem[]
  >(() => JSON.parse(JSON.stringify(currentPolicy.levels)));

  useEffect(() => {
    const found =
      store.policies.find((p) => p.kind === selectedKind) || store.policies[0];
    setEditableLevels(JSON.parse(JSON.stringify(found.levels)));
  }, [selectedKind, store.policies]);

  const activeTemplate =
    store.templates.find((t) => t.code === selectedTemplateCode) ||
    store.templates[0];

  const [draftSubjectEn, setDraftSubjectEn] = useState(
    activeTemplate.subjectEn,
  );
  const [draftBodyEn, setDraftBodyEn] = useState(activeTemplate.bodyEn);
  const [draftSubjectHi, setDraftSubjectHi] = useState(
    activeTemplate.subjectHi,
  );
  const [draftBodyHi, setDraftBodyHi] = useState(activeTemplate.bodyHi);
  const [draftSmsTemplateId, setDraftSmsTemplateId] = useState(
    activeTemplate.smsTemplateId,
  );

  useEffect(() => {
    setDraftSubjectEn(activeTemplate.subjectEn);
    setDraftBodyEn(activeTemplate.bodyEn);
    setDraftSubjectHi(activeTemplate.subjectHi);
    setDraftBodyHi(activeTemplate.bodyHi);
    setDraftSmsTemplateId(activeTemplate.smsTemplateId);
  }, [activeTemplate]);

  const handleSavePolicy = () => {
    updatePolicyInStore(selectedKind, editableLevels);
    setSavedNotice(
      `Escalation Policy for ${selectedKind} saved with recalculated cumulative working-day delays.`,
    );
  };

  const handleCreateTemplateVersion = () => {
    const created = createTemplateVersionInStore({
      code: activeTemplate.code,
      name: activeTemplate.name,
      smsTemplateId: draftSmsTemplateId,
      subjectEn: draftSubjectEn,
      bodyEn: draftBodyEn,
      subjectHi: draftSubjectHi,
      bodyHi: draftBodyHi,
      smsBodyEn: activeTemplate.smsBodyEn,
      smsBodyHi: activeTemplate.smsBodyHi,
    });
    setSavedNotice(
      `Created immutable version v${created.version} for template ${created.code} (previous versions preserved).`,
    );
  };

  const renderedEnSubject = renderHandlebars(draftSubjectEn, previewVars);
  const renderedEnBody = renderHandlebars(draftBodyEn, previewVars);
  const renderedHiSubject = renderHandlebars(draftSubjectHi, previewVars);
  const renderedHiBody = renderHandlebars(draftBodyHi, previewVars);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xs border border-brand bg-brand px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-brand-on">
                ADMINISTRATION • POLICIES & TEMPLATES
              </span>
              <span className="rounded-xs border border-border bg-surface-sunken px-2 py-0.5 font-mono text-[10px] font-semibold text-text-muted">
                TODO(APH-VERIFY) PLACEHOLDERS
              </span>
            </div>
            <h1 className="mt-1.5 font-serif text-xl font-bold text-text-primary">
              {locale === "hi"
                ? "वृद्धि नीतियां (Escalation Policies) और द्विभाषी हैंडलबार्स टेम्पलेट्स"
                : "Escalation Policies as Data & Versioned Bilingual Handlebars Templates"}
            </h1>
            <p className="mt-0.5 text-xs text-text-muted">
              Configure working-day delays across Levels 0–3 and preview English
              (EN) and Hindi (हिन्दी) Handlebars templates before publishing a
              new immutable version.
            </p>
          </div>

          <Link
            href="/notifications"
            className="inline-flex items-center gap-1.5 rounded-xs border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-brand"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-brand" />
            <span>Back to Notification Centre</span>
          </Link>
        </div>

        {savedNotice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xs border border-sla-ontrack bg-surface-raised px-3 py-2 text-xs font-semibold text-sla-ontrack"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{savedNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setSavedNotice(null)}
              className="text-[11px] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section 1: Escalation Policies as Data */}
        <section className="space-y-3 rounded-sm border border-border bg-surface-raised p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-brand" />
              <h2 className="font-serif text-sm font-bold text-text-primary">
                1. Escalation Policies as Data (Levels 0 → 3)
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-text-muted">
                <span>DueItem Kind:</span>
                <select
                  value={selectedKind}
                  onChange={(e) =>
                    setSelectedKind(e.target.value as DueItemKind)
                  }
                  className="rounded-xs border border-border bg-surface px-2.5 py-1 font-mono text-xs font-semibold text-text-primary"
                >
                  {store.policies.map((pol) => (
                    <option key={pol.kind} value={pol.kind}>
                      {pol.kind}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleSavePolicy}
                data-testid="save-policy-btn"
                className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-3 py-1 text-xs font-semibold text-brand-on hover:bg-brand-hover"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Policy</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Statutory Target Role(s)</th>
                  <th className="px-3 py-2">
                    Delay After Previous (Working Days)
                  </th>
                  <th className="px-3 py-2">Cumulative Overdue</th>
                  <th className="px-3 py-2">Assigned Template Code</th>
                  <th className="px-3 py-2">Active Channels</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {editableLevels.map((lvl, idx) => (
                  <tr key={lvl.level} className="bg-surface">
                    <td className="px-3 py-2.5 font-mono font-bold text-brand">
                      Level {lvl.level}
                      <div className="font-sans text-[11px] font-normal text-text-muted">
                        {lvl.label}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-text-primary">
                      {lvl.notifyRoles.join(", ")}
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={30}
                        aria-label={`Working day delay for level ${lvl.level}`}
                        value={lvl.delayWorkingDaysAfterPrevious}
                        onChange={(e) => {
                          const next = [...editableLevels];
                          next[idx] = {
                            ...next[idx],
                            delayWorkingDaysAfterPrevious: Number(
                              e.target.value,
                            ),
                          };
                          setEditableLevels(next);
                        }}
                        className="tabular-nums-data w-20 rounded-xs border border-border bg-surface-raised px-2 py-1 font-mono text-xs font-semibold text-text-primary"
                      />{" "}
                      <span className="text-[11px] text-text-muted">
                        working days
                      </span>
                    </td>
                    <td className="tabular-nums-data px-3 py-2.5 font-mono text-xs text-text-muted">
                      +{lvl.cumulativeWorkingDaysOverdue}w days
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-brand">
                      {lvl.templateCode}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-text-primary">
                      {lvl.channels.join(" • ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: Versioned Bilingual Handlebars Templates & Live Preview */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Template Editor & Version Creator */}
          <section className="space-y-3 rounded-sm border border-border bg-surface-raised p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-brand" />
                <h2 className="font-serif text-sm font-bold text-text-primary">
                  2. Versioned Handlebars Templates (EN & HI)
                </h2>
              </div>

              <select
                value={selectedTemplateCode}
                onChange={(e) => setSelectedTemplateCode(e.target.value)}
                className="rounded-xs border border-border bg-surface px-2.5 py-1 font-mono text-xs font-semibold text-text-primary"
              >
                {Array.from(
                  new Set(store.templates.map((t) => t.code)),
                ).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between rounded-xs border border-border bg-surface-sunken px-3 py-1.5 text-xs">
              <span className="font-mono font-semibold text-text-primary">
                Active Version: v{activeTemplate.version}
              </span>
              <span className="font-mono text-[11px] text-brand">
                SMS Template ID: {activeTemplate.smsTemplateId}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-semibold text-text-primary">
                  SMS Gateway DLT Template ID (Mandatory)
                </label>
                <input
                  type="text"
                  value={draftSmsTemplateId}
                  onChange={(e) => setDraftSmsTemplateId(e.target.value)}
                  className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-text-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-primary">
                  English Subject (Handlebars)
                </label>
                <input
                  type="text"
                  value={draftSubjectEn}
                  onChange={(e) => setDraftSubjectEn(e.target.value)}
                  className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-primary">
                  English Body (Handlebars)
                </label>
                <textarea
                  rows={3}
                  value={draftBodyEn}
                  onChange={(e) => setDraftBodyEn(e.target.value)}
                  className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-primary">
                  Hindi Subject / हिन्दी विषय (Handlebars)
                </label>
                <input
                  type="text"
                  value={draftSubjectHi}
                  onChange={(e) => setDraftSubjectHi(e.target.value)}
                  className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-primary">
                  Hindi Body / हिन्दी संदेश (Handlebars)
                </label>
                <textarea
                  rows={3}
                  value={draftBodyHi}
                  onChange={(e) => setDraftBodyHi(e.target.value)}
                  className="mt-1 w-full rounded-xs border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateTemplateVersion}
                data-testid="publish-template-version-btn"
                className="inline-flex items-center gap-1.5 rounded-xs border border-brand bg-brand px-3 py-1.5 text-xs font-semibold text-brand-on hover:bg-brand-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>
                  Publish New Immutable Version (v{activeTemplate.version + 1})
                </span>
              </button>
            </div>
          </section>

          {/* Live Bilingual Preview Panel */}
          <section className="space-y-3 rounded-sm border border-border bg-surface-raised p-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Eye className="h-4 w-4 text-brand" />
              <h2 className="font-serif text-sm font-bold text-text-primary">
                3. Live Handlebars Preview (English & हिन्दी)
              </h2>
            </div>

            {/* Context Variable Controls */}
            <div className="grid grid-cols-2 gap-2 rounded-xs border border-border bg-surface-sunken p-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-text-muted">
                  {"{{institution}}"}
                </label>
                <input
                  type="text"
                  value={previewVars.institution}
                  onChange={(e) =>
                    setPreviewVars({
                      ...previewVars,
                      institution: e.target.value,
                    })
                  }
                  className="mt-0.5 w-full rounded-xs border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-text-muted">
                  {"{{applicationId}}"}
                </label>
                <input
                  type="text"
                  value={previewVars.applicationId}
                  onChange={(e) =>
                    setPreviewVars({
                      ...previewVars,
                      applicationId: e.target.value,
                    })
                  }
                  className="mt-0.5 w-full rounded-xs border border-border bg-surface px-2 py-1 font-mono text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-text-muted">
                  {"{{dueDate}}"}
                </label>
                <input
                  type="text"
                  value={previewVars.dueDate}
                  onChange={(e) =>
                    setPreviewVars({ ...previewVars, dueDate: e.target.value })
                  }
                  className="mt-0.5 w-full rounded-xs border border-border bg-surface px-2 py-1 font-mono text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-text-muted">
                  {"{{daysRemaining}}"}
                </label>
                <input
                  type="number"
                  value={previewVars.daysRemaining}
                  onChange={(e) =>
                    setPreviewVars({
                      ...previewVars,
                      daysRemaining: Number(e.target.value),
                    })
                  }
                  className="mt-0.5 w-full rounded-xs border border-border bg-surface px-2 py-1 font-mono text-xs text-text-primary"
                />
              </div>
            </div>

            {/* Rendered English Preview */}
            <div
              data-testid="preview-en-card"
              className="rounded-xs border border-border bg-surface p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase text-brand">
                  ENGLISH (EN) RENDERED OUTPUT
                </span>
                <span className="font-mono text-[10px] text-text-muted">
                  DLT: {draftSmsTemplateId}
                </span>
              </div>
              <div className="font-serif text-xs font-bold text-text-primary">
                {renderedEnSubject}
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                {renderedEnBody}
              </p>
            </div>

            {/* Rendered Hindi Preview */}
            <div
              data-testid="preview-hi-card"
              className="rounded-xs border border-border bg-surface p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase text-brand">
                  HINDI (हिन्दी) RENDERED OUTPUT
                </span>
                <span className="font-mono text-[10px] text-text-muted">
                  UTF-8 DEVANAGARI
                </span>
              </div>
              <div className="font-serif text-xs font-bold text-text-primary">
                {renderedHiSubject}
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                {renderedHiBody}
              </p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

