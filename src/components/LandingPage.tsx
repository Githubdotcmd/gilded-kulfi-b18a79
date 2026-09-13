"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type LandingSettings, type Section } from "@/lib/client";
import { DEFAULT_LOGO, DEFAULT_PERSONAL_IMAGE } from "@/lib/defaults";
import { ConfirmDialog, Field, ImageField, Modal, SecretFooter, Tabs, ToastHost, useToast } from "./ui";

type SectionDraft = Pick<Section, "id" | "title" | "description" | "destination">;
type AdminTab = "page" | "images" | "sections";

export default function LandingPage() {
  const [landing, setLanding] = useState<LandingSettings | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const { toasts, push } = useToast();

  const load = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([api<LandingSettings>("/api/landing"), api<Section[]>("/api/sections")]);
      setLanding(l);
      setSections(s);
    } catch (e) {
      push((e as Error).message, "err");
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !landing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-lg font-semibold text-slate-500">Loading Programming Fundamentals…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={landing.logoUrl} alt="Logo" className="h-11 w-11 rounded-lg object-contain" />
            <span className="text-base font-extrabold text-[var(--brand)] sm:text-lg">{landing.brandName}</span>
          </div>
          <a
            href="#sections"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[var(--brand)] shadow-sm transition hover:bg-slate-50 sm:px-5"
          >
            Select Section ↓
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {/* Hero */}
        <section className="card overflow-hidden">
          <div className="flex flex-row flex-nowrap items-center gap-3 px-3 py-6 sm:gap-6 sm:px-8 sm:py-8 lg:px-12">
            <div className="flex shrink-0 justify-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={landing.logoUrl} alt="EIT Logo" className="h-14 w-14 object-contain xs:h-20 xs:w-20 sm:h-32 sm:w-32 lg:h-40 lg:w-40" />
            </div>
            <div className="min-w-0 flex-1 text-center">
              <span className="inline-block rounded-full bg-sky-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--brand)] sm:px-4 sm:py-1.5 sm:text-xs sm:tracking-[0.18em]">
                {landing.badgeText}
              </span>
              <h1 className="mt-2 text-xl font-black leading-tight tracking-tight text-slate-900 xs:text-2xl sm:mt-4 sm:text-4xl lg:text-6xl xl:text-7xl">
                {landing.mainTitle}
              </h1>
              <p className="mx-auto mt-1.5 max-w-2xl text-xs text-slate-500 xs:text-sm sm:mt-4 sm:text-lg lg:text-xl">
                {landing.subtitle}
              </p>
            </div>
            <div className="flex shrink-0 justify-end">
              <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-[0_0_0_3px_#d7e6f6] xs:h-20 xs:w-20 sm:h-32 sm:w-32 sm:border-4 sm:shadow-[0_0_0_4px_#d7e6f6] lg:h-40 lg:w-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={landing.personalImageUrl}
                  alt="Faculty"
                  className="h-full w-full object-cover object-[50%_20%]"
                />
              </div>
            </div>
          </div>
          <div className="grid divide-y divide-slate-200 border-t border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              [landing.subjectLabel, landing.subjectValue],
              [landing.facultyLabel, landing.facultyValue],
              [landing.portalLabel, landing.portalValue],
            ].map(([l, v]) => (
              <div key={l} className="px-6 py-5 text-center">
                <div className="meta-label">{l}</div>
                <div className="meta-value">{v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Sections */}
        <section id="sections" className="scroll-mt-24 pt-12">
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">{landing.chooseTitle}</h2>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">{landing.chooseSubtitle}</p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {sections.map((s, i) => (
              <Link
                key={s.id}
                href={s.destination}
                className="card group relative overflow-hidden p-6 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-50 transition group-hover:bg-sky-100" />
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-2xl font-black text-[var(--brand)]">
                    {i + 1}
                  </div>
                  <h3 className="mt-5 text-2xl font-extrabold text-slate-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500">{s.description}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]">
                    Open Section
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SecretFooter text={landing.footerText} onUnlock={() => setAdminOpen(true)} />

      {adminOpen && (
        <LandingAdminPanel
          landing={landing}
          sections={sections}
          onClose={() => setAdminOpen(false)}
          onSaved={(l, s) => {
            setLanding(l);
            setSections(s);
          }}
          reload={load}
          push={push}
        />
      )}
      <ToastHost toasts={toasts} />
    </div>
  );
}

/* ======================================================= Admin panel */
function LandingAdminPanel({
  landing,
  sections,
  onClose,
  onSaved,
  reload,
  push,
}: {
  landing: LandingSettings;
  sections: Section[];
  onClose: () => void;
  onSaved: (l: LandingSettings, s: Section[]) => void;
  reload: () => Promise<void>;
  push: (t: string, k?: "ok" | "err" | "info") => void;
}) {
  const [tab, setTab] = useState<AdminTab>("page");
  const [draft, setDraft] = useState<LandingSettings>(landing);
  const [secDrafts, setSecDrafts] = useState<SectionDraft[]>(
    sections.map(({ id, title, description, destination }) => ({ id, title, description, destination })),
  );
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: "reset" } | { kind: "deleteSection"; id: number; title: string }>(null);

  useEffect(() => {
    setSecDrafts(sections.map(({ id, title, description, destination }) => ({ id, title, description, destination })));
  }, [sections]);

  const set = <K extends keyof LandingSettings>(k: K, v: LandingSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setSec = (id: number, patch: Partial<SectionDraft>) =>
    setSecDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(landing) || JSON.stringify(secDrafts) !==
    JSON.stringify(sections.map(({ id, title, description, destination }) => ({ id, title, description, destination }))), [draft, landing, secDrafts, sections]);

  async function saveAll() {
    setSaving(true);
    try {
      const l = await api<LandingSettings>("/api/landing", { method: "PUT", body: JSON.stringify(draft) });
      const changed = secDrafts.filter((d) => {
        const o = sections.find((s) => s.id === d.id);
        return !o || o.title !== d.title || o.description !== d.description || o.destination !== d.destination;
      });
      await Promise.all(
        changed.map((d) => api(`/api/sections/${d.id}`, { method: "PUT", body: JSON.stringify(d) })),
      );
      const s = await api<Section[]>("/api/sections");
      onSaved(l, s);
      push("All changes saved to the shared database");
    } catch (e) {
      push((e as Error).message, "err");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(landing);
    setSecDrafts(sections.map(({ id, title, description, destination }) => ({ id, title, description, destination })));
    push("Unsaved changes discarded", "info");
  }

  async function resetAll() {
    setSaving(true);
    try {
      const l = await api<LandingSettings>("/api/landing", { method: "DELETE" });
      setDraft(l);
      const s = await api<Section[]>("/api/sections");
      onSaved(l, s);
      push("Landing page reset to original settings");
    } catch (e) {
      push((e as Error).message, "err");
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  }

  async function addSection() {
    setSaving(true);
    try {
      const created = await api<Section>("/api/sections", { method: "POST", body: JSON.stringify({}) });
      await reload();
      push(`${created.title} added with demo details`);
      setTab("sections");
    } catch (e) {
      push((e as Error).message, "err");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSection(id: number) {
    setSaving(true);
    try {
      await api(`/api/sections/${id}`, { method: "DELETE" });
      await reload();
      push("Section deleted", "info");
    } catch (e) {
      push((e as Error).message, "err");
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        wide
        title={
          <span className="flex items-center gap-2">
            <span className="rounded-lg bg-[var(--brand)] px-2 py-0.5 text-xs font-black uppercase tracking-wider text-white">Admin</span>
            Landing Page Admin Panel
          </span>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button className="btn-danger !bg-rose-50 !text-rose-700 hover:!bg-rose-100" onClick={() => setConfirm({ kind: "reset" })} disabled={saving}>
              Reset Landing Page
            </button>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={cancel} disabled={saving || !dirty}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveAll} disabled={saving}>
                {saving ? "Saving…" : "Save All Changes"}
              </button>
            </div>
          </div>
        }
      >
        <Tabs<AdminTab>
          tabs={[
            { key: "page", label: "Page Information" },
            { key: "images", label: "Logo & Personal Image" },
            { key: "sections", label: `Section Links (${secDrafts.length})` },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === "page" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Header brand name" value={draft.brandName} onChange={(v) => set("brandName", v)} />
            <Field label="Badge text" value={draft.badgeText} onChange={(v) => set("badgeText", v)} />
            <div className="sm:col-span-2">
              <Field label="Main title" value={draft.mainTitle} onChange={(v) => set("mainTitle", v)} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Subtitle / description" value={draft.subtitle} onChange={(v) => set("subtitle", v)} textarea />
            </div>
            <Field label="Meta 1 label" value={draft.subjectLabel} onChange={(v) => set("subjectLabel", v)} />
            <Field label="Meta 1 value" value={draft.subjectValue} onChange={(v) => set("subjectValue", v)} />
            <Field label="Meta 2 label" value={draft.facultyLabel} onChange={(v) => set("facultyLabel", v)} />
            <Field label="Meta 2 value" value={draft.facultyValue} onChange={(v) => set("facultyValue", v)} />
            <Field label="Meta 3 label" value={draft.portalLabel} onChange={(v) => set("portalLabel", v)} />
            <Field label="Meta 3 value" value={draft.portalValue} onChange={(v) => set("portalValue", v)} />
            <Field label="Section heading" value={draft.chooseTitle} onChange={(v) => set("chooseTitle", v)} />
            <Field label="Section sub-heading" value={draft.chooseSubtitle} onChange={(v) => set("chooseSubtitle", v)} />
            <div className="sm:col-span-2">
              <Field label="Footer text (click 5× to open admin)" value={draft.footerText} onChange={(v) => set("footerText", v)} />
            </div>
          </div>
        )}

        {tab === "images" && (
          <div className="grid gap-4">
            <ImageField label="Logo" value={draft.logoUrl} onChange={(v) => set("logoUrl", v)} onReset={() => set("logoUrl", DEFAULT_LOGO)} />
            <ImageField
              label="Personal image"
              value={draft.personalImageUrl}
              onChange={(v) => set("personalImageUrl", v)}
              onReset={() => set("personalImageUrl", DEFAULT_PERSONAL_IMAGE)}
              round
            />
            <button
              className="btn-ghost self-start"
              onClick={() => {
                set("logoUrl", DEFAULT_LOGO);
                set("personalImageUrl", DEFAULT_PERSONAL_IMAGE);
              }}
            >
              Reset both images
            </button>
            <p className="text-xs text-slate-500">
              Uploaded images are stored in the shared database, so they appear for everyone on every device after you click <b>Save All Changes</b>.
            </p>
          </div>
        )}

        {tab === "sections" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-sky-300 bg-sky-50 p-4">
              <div>
                <div className="font-bold text-slate-800">Add a new section</div>
                <div className="text-xs text-slate-500">A section is created instantly with demo details and demo students. Edit the details later.</div>
              </div>
              <button className="btn-primary" onClick={addSection} disabled={saving}>
                + Add Section
              </button>
            </div>
            {secDrafts.map((d, i) => {
              const original = sections.find((s) => s.id === d.id);
              return (
                <div key={d.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-xs font-black text-[var(--brand)]">{i + 1}</span>
                      <span className="text-sm font-bold text-slate-700">{original?.title}</span>
                      <span className="text-xs text-slate-400">/{original?.slug}</span>
                    </div>
                    <div className="flex gap-1">
                      <Link href={d.destination} className="btn-ghost !px-3 !py-1.5 !text-xs" target="_blank">
                        Open ↗
                      </Link>
                      <button
                        className="btn-ghost !px-3 !py-1.5 !text-xs !text-rose-600 hover:!bg-rose-50"
                        onClick={() => setConfirm({ kind: "deleteSection", id: d.id, title: original?.title ?? d.title })}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Section title" value={d.title} onChange={(v) => setSec(d.id, { title: v })} />
                    <Field label="Section description" value={d.description} onChange={(v) => setSec(d.id, { description: v })} />
                    <Field label="Destination" value={d.destination} onChange={(v) => setSec(d.id, { destination: v })} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm?.kind === "reset"}
        title="Reset landing page?"
        message="This restores the original title, description, meta information, logo and personal image for everyone."
        confirmLabel="Reset"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={resetAll}
      />
      <ConfirmDialog
        open={confirm?.kind === "deleteSection"}
        title={`Delete ${confirm?.kind === "deleteSection" ? confirm.title : "section"}?`}
        message="All students and attendance data in this section will be permanently removed."
        confirmLabel="Delete Section"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.kind === "deleteSection" && deleteSection(confirm.id)}
      />
    </>
  );
}
