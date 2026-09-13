"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type Section, type SectionPayload, type Student } from "@/lib/client";
import { SecretFooter, ToastHost, useToast } from "./ui";
import SectionAdminPanel from "./SectionAdminPanel";

type SortKey = "serial" | "name" | "ruid" | "email";
const PAGE_SIZE = 30;

export default function SectionPage({ slug }: { slug: string }) {
  const [section, setSection] = useState<Section | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const { toasts, push } = useToast();

  // Filters
  const [q, setQ] = useState("");
  const [nameLetter, setNameLetter] = useState("");
  const [idPrefix, setIdPrefix] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("serial");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const pendingRef = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      try {
        const data = await api<SectionPayload>(`/api/sections/${encodeURIComponent(slug)}`);
        // Don't clobber optimistic updates in-flight
        if (pendingRef.current > 0 && silent) return;
        setSection(data.section);
        setStudents(data.students);
      } catch (e) {
        if ((e as { status?: number }).status === 404) setNotFound(true);
        else if (!silent) push((e as Error).message, "err");
      } finally {
        setLoading(false);
      }
    },
    [slug, push],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Keep every device in sync with the shared database.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && !adminOpen) load(true);
    }, 12000);
    return () => clearInterval(t);
  }, [load, adminOpen]);

  useEffect(() => {
    const before = () => setPrinting(true);
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  const locked = !!section?.attendanceSubmitted;
  const present = students.filter((s) => s.status === "present").length;
  const absent = students.filter((s) => s.status === "absent").length;
  const marked = present + absent;

  const letters = useMemo(
    () => Array.from(new Set(students.map((s) => s.name.trim()[0]?.toUpperCase()).filter(Boolean))).sort(),
    [students],
  );
  const idPrefixes = useMemo(
    () =>
      Array.from(new Set(students.map((s) => s.ruid.split("-").slice(0, 2).join("-")).filter((x) => x))).sort(),
    [students],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = students.filter((s) => {
      if (term && !`${s.name} ${s.ruid} ${s.email}`.toLowerCase().includes(term)) return false;
      if (nameLetter && s.name.trim()[0]?.toUpperCase() !== nameLetter) return false;
      if (idPrefix && !s.ruid.startsWith(idPrefix)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let r = 0;
      if (sortKey === "serial") r = a.serial - b.serial;
      else r = String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { sensitivity: "base" });
      return sortDir === "asc" ? r : -r;
    });
    return list;
  }, [students, q, nameLetter, idPrefix, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = printing ? filtered : filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const half = Math.ceil(visible.length / 2);
  const leftCol = visible.slice(0, half);
  const rightCol = visible.slice(half);

  function resetFilters() {
    setQ("");
    setNameLetter("");
    setIdPrefix("");
    setSortKey("serial");
    setSortDir("asc");
    setPage(1);
  }

  /* ------------------------------------------------------- attendance */
  async function mark(studentId: number, status: "present" | "absent") {
    if (locked || !section) return; // silently enforce lock
    const current = students.find((s) => s.id === studentId)?.status;
    const next = current === status ? null : status;
    setStudents((list) => list.map((s) => (s.id === studentId ? { ...s, status: next } : s)));
    pendingRef.current++;
    try {
      await api(`/api/sections/${section.id}/attendance`, {
        method: "POST",
        body: JSON.stringify({ action: "mark", studentId, status: next }),
      });
    } catch (e) {
      if ((e as { status?: number }).status !== 423) push((e as Error).message, "err");
      await load();
    } finally {
      pendingRef.current--;
    }
  }

  async function markAll(status: "present" | "absent") {
    if (locked || !section) return;
    setStudents((list) => list.map((s) => ({ ...s, status })));
    pendingRef.current++;
    try {
      const data = await api<SectionPayload>(`/api/sections/${section.id}/attendance`, {
        method: "POST",
        body: JSON.stringify({ action: "markAll", status }),
      });
      setStudents(data.students);
      push(status === "present" ? "All students marked present" : "All students marked absent", "info");
    } catch (e) {
      if ((e as { status?: number }).status !== 423) push((e as Error).message, "err");
      await load();
    } finally {
      pendingRef.current--;
    }
  }

  async function submitAttendance() {
    if (!section || locked) return;
    try {
      const data = await api<SectionPayload>(`/api/sections/${section.id}/attendance`, {
        method: "POST",
        body: JSON.stringify({ action: "submit" }),
      });
      setSection(data.section);
      setStudents(data.students);
      push("Attendance submitted and locked");
    } catch (e) {
      push((e as Error).message, "err");
    }
  }

  /* ------------------------------------------------------------ render */
  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-black text-slate-800">Section not found</h1>
        <p className="text-slate-500">This section may have been removed by the administrator.</p>
        <Link href="/" className="btn-primary">
          ← Back to main page
        </Link>
      </div>
    );
  }
  if (loading || !section) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-lg font-semibold text-slate-500">Loading section…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur print:static print:bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="text-base font-extrabold text-[var(--brand)] sm:text-xl">
            {section.brandName}
          </Link>
          <div className="flex items-center gap-3 text-right text-sm text-slate-500 sm:text-base">
            <span className="hidden sm:inline">
              {section.subjectName} • Section {section.sectionName}
            </span>
            <Link href="/" className="btn-secondary !px-3 !py-1.5 !text-xs print:hidden">
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-3 pt-4 sm:px-6">
        {/* Hero */}
        <section className="card overflow-hidden">
          <div className="flex flex-row flex-nowrap items-center gap-3 px-3 py-6 sm:gap-6 sm:px-8 sm:py-8 lg:px-12">
            <div className="flex shrink-0 justify-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={section.leftLogoUrl} alt="Logo" className="h-14 w-14 object-contain xs:h-20 xs:w-20 sm:h-28 sm:w-28 lg:h-36 lg:w-36" />
            </div>
            <div className="min-w-0 flex-1 text-center">
              <span className="inline-block rounded-full bg-sky-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--brand)] sm:px-4 sm:py-1.5 sm:text-xs sm:tracking-[0.18em]">
                {section.badgeText}
              </span>
              <h1 className="mt-2 text-xl font-black leading-tight tracking-tight text-slate-900 xs:text-2xl sm:mt-4 sm:text-4xl lg:text-6xl">
                {section.pageTitle}
              </h1>
              <p className="mt-1.5 text-xs text-slate-500 xs:text-sm sm:mt-3 sm:text-lg lg:text-xl">{section.pageSubtitle}</p>
            </div>
            <div className="flex shrink-0 justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={section.rightLogoUrl} alt="Institution" className="h-14 w-14 object-contain xs:h-20 xs:w-20 sm:h-28 sm:w-28 lg:h-36 lg:w-36" />
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-t border-slate-200 lg:grid-cols-4 lg:divide-y-0">
            {[
              ["Subject Name", section.subjectName],
              ["Faculty Name", section.facultyName || "Not Set"],
              ["Section Name", section.sectionName],
              ["Total Students", String(students.length)],
            ].map(([l, v]) => (
              <div key={l} className="px-4 py-5 text-center">
                <div className="meta-label">{l}</div>
                <div className="meta-value break-words">{v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Filters */}
        <section className="card mt-5 p-4 sm:p-5 print:hidden">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto_auto]">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search students by name, ID or email..."
              className="input !py-3 md:min-w-[280px]"
            />
            <select value={nameLetter} onChange={(e) => { setNameLetter(e.target.value); setPage(1); }} className="input !py-3">
              <option value="">All names</option>
              {letters.map((l) => (
                <option key={l} value={l}>
                  Names starting with {l}
                </option>
              ))}
            </select>
            <select value={idPrefix} onChange={(e) => { setIdPrefix(e.target.value); setPage(1); }} className="input !py-3">
              <option value="">All IDs</option>
              {idPrefixes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="input !py-3">
              <option value="serial">Serial Number</option>
              <option value="name">Name</option>
              <option value="ruid">RUID</option>
              <option value="email">Email</option>
            </select>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")} className="input !py-3">
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <button onClick={resetFilters} className="btn-secondary !py-3 !text-[var(--brand)]">
              Reset
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>
              Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} students
              {filtered.length !== students.length && ` (filtered from ${students.length})`}
            </span>
            <span className="hidden sm:inline">Use filters and sorting to quickly find students.</span>
          </div>
        </section>

        {/* Attendance */}
        <section className="card mt-5 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
            <h2 className="text-xl font-extrabold text-slate-900">Student Attendance</h2>
            {locked && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                Submitted {section.attendanceDate ? `• ${section.attendanceDate}` : ""} — locked
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 px-5 py-5 sm:gap-6">
            <CircleAction label="Present All" icon="✓" onClick={() => markAll("present")} disabled={locked} tone="present" />
            <CircleAction label="Absent All" icon="✕" onClick={() => markAll("absent")} disabled={locked} tone="absent" />
            <CountBox value={present} label="Presentees" tone="present" />
            <CountBox value={absent} label="Absentees" tone="absent" />
            <button onClick={submitAttendance} disabled={locked} className="btn-primary !rounded-2xl !px-6 !py-4 !text-lg print:hidden">
              {locked ? "Attendance Submitted" : "Submit Attendance"}
            </button>
            <button onClick={() => window.print()} className="btn-secondary !rounded-2xl !px-6 !py-4 !text-lg !text-[var(--brand)] print:hidden">
              Print / Save PDF
            </button>
            <span className="ml-auto text-base font-bold text-slate-600">
              {marked} / {students.length} marked
            </span>
          </div>

          {/* Table */}
          {visible.length === 0 ? (
            <div className="border-t border-slate-200 px-5 py-14 text-center text-slate-500">
              {students.length === 0 ? "No students yet. Use the admin panel to add or upload students." : "No students match your filters."}
            </div>
          ) : (
            <div className="grid border-t border-slate-200 lg:grid-cols-2">
              <StudentTable rows={leftCol} onMark={mark} locked={locked} />
              <StudentTable rows={rightCol} onMark={mark} locked={locked} className="hidden lg:block lg:border-l lg:border-slate-200" />
              {/* On small screens show the right column below the left */}
              <StudentTable rows={rightCol} onMark={mark} locked={locked} className="lg:hidden" hideHead />
            </div>
          )}

          {totalPages > 1 && !printing && (
            <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 px-5 py-4 print:hidden">
              <button className="btn-secondary !py-1.5" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-9 min-w-9 rounded-xl px-2 text-sm font-bold ${
                    p === safePage ? "bg-[var(--brand)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button className="btn-secondary !py-1.5" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                Next →
              </button>
            </div>
          )}
        </section>
      </main>

      <SecretFooter text={section.footerText} onUnlock={() => setAdminOpen(true)} />

      {adminOpen && (
        <SectionAdminPanel
          section={section}
          students={students}
          onClose={() => setAdminOpen(false)}
          onChange={(s, st) => {
            if (s) setSection(s);
            if (st) setStudents(st);
          }}
          reload={() => load()}
          push={push}
        />
      )}
      <ToastHost toasts={toasts} />
    </div>
  );
}

/* ================================================================ parts */
function CircleAction({
  label, icon, onClick, disabled, tone,
}: { label: string; icon: string; onClick: () => void; disabled?: boolean; tone: "present" | "absent" }) {
  return (
    <button onClick={onClick} disabled={disabled} className="group flex flex-col items-center gap-1.5 print:hidden disabled:opacity-50">
      <span
        className={`att-circle idle ${tone === "present" ? "group-hover:!border-emerald-500 group-hover:!text-emerald-600" : "group-hover:!border-rose-500 group-hover:!text-rose-600"}`}
      >
        {icon}
      </span>
      <span className="text-xs font-bold text-[var(--brand)] sm:text-sm">{label}</span>
    </button>
  );
}

function CountBox({ value, label, tone }: { value: number; label: string; tone: "present" | "absent" }) {
  return (
    <div className="min-w-[130px] rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center shadow-sm">
      <div className={`text-3xl font-black ${tone === "present" ? "text-emerald-700" : "text-rose-700"}`}>{value}</div>
      <div className="meta-label">{label}</div>
    </div>
  );
}

function StudentTable({
  rows, onMark, locked, className = "", hideHead,
}: {
  rows: Student[];
  onMark: (id: number, s: "present" | "absent") => void;
  locked: boolean;
  className?: string;
  hideHead?: boolean;
}) {
  if (rows.length === 0) return <div className={className} />;
  return (
    <table className={`w-full border-collapse ${className}`}>
      {!hideHead && (
        <thead>
          <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
            <th className="w-16 px-4 py-3 sm:px-6">S.No.</th>
            <th className="px-3 py-3">Student</th>
            <th className="px-3 py-3 text-center sm:px-6">Attendance</th>
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((s) => (
          <tr key={s.id} className="border-t border-slate-200 align-middle">
            <td className="px-4 py-4 text-lg font-semibold text-slate-600 sm:px-6">{s.serial}</td>
            <td className="px-3 py-4">
              <div className="text-lg font-extrabold leading-tight text-slate-900 sm:text-xl">{s.name}</div>
              <div className="mt-0.5 font-mono text-sm font-bold text-[var(--brand)]">{s.ruid}</div>
              <div className="break-all text-sm text-slate-500">{s.email}</div>
            </td>
            <td className="px-3 py-3 sm:px-6">
              <div className="flex items-center justify-center gap-5 sm:gap-8">
                <AttButton active={s.status === "present"} tone="present" label="Present" icon="✓" locked={locked} onClick={() => onMark(s.id, "present")} />
                <AttButton active={s.status === "absent"} tone="absent" label="Absent" icon="✕" locked={locked} onClick={() => onMark(s.id, "absent")} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AttButton({
  active, tone, label, icon, locked, onClick,
}: { active: boolean; tone: "present" | "absent"; label: string; icon: string; locked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-disabled={locked}
      className="flex flex-col items-center gap-1"
      title={locked ? undefined : label}
    >
      <span className={`att-circle ${active ? tone : "idle"} ${locked ? "locked" : ""}`}>{icon}</span>
      <span className={`text-xs font-bold sm:text-sm ${active ? (tone === "present" ? "text-emerald-700" : "text-rose-700") : "text-[var(--brand)]"}`}>
        {label}
      </span>
    </button>
  );
}
