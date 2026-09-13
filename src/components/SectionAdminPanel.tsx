"use client";

import { useMemo, useRef, useState } from "react";
import { api, formatDate, type Section, type SectionPayload, type Student } from "@/lib/client";
import { CSV_TEMPLATE, csvToStudents, downloadText, toCsv, type CsvStudent } from "@/lib/csv";
import { generateStudentPdf } from "@/lib/pdf";
import { DEFAULT_COLLEGE_LOGO, DEFAULT_LOGO } from "@/lib/defaults";
import { ConfirmDialog, Field, ImageField, Modal, Tabs } from "./ui";

type Tab = "dashboard" | "students" | "bulk" | "settings" | "export";
type Push = (t: string, k?: "ok" | "err" | "info") => void;
type ViewKind = "present" | "absent" | "all";

type Props = {
  section: Section;
  students: Student[];
  onClose: () => void;
  onChange: (s: Section | null, st: Student[] | null) => void;
  reload: () => Promise<void>;
  push: Push;
};

export default function SectionAdminPanel({ section, students, onClose, onChange, reload, push }: Props) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Student | "new" | null>(null);
  const [view, setView] = useState<ViewKind | null>(null);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; label: string; action: () => Promise<void> }>(null);

  const present = students.filter((s) => s.status === "present");
  const absent = students.filter((s) => s.status === "absent");
  const unmarked = students.length - present.length - absent.length;

  async function run(fn: () => Promise<void>, ok?: string) {
    setBusy(true);
    try {
      await fn();
      if (ok) push(ok);
    } catch (e) {
      push((e as Error).message, "err");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const attendance = (action: string) => () =>
    run(async () => {
      const data = await api<SectionPayload>(`/api/sections/${section.id}/attendance`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      onChange(data.section, data.students);
    }, action === "resetSubmit" ? "Submission unlocked — attendance can be changed again" : "Attendance reset to initial state");

  async function deleteStudent(s: Student) {
    await run(async () => {
      await api(`/api/sections/${section.id}/students/${s.id}`, { method: "DELETE" });
      await reload();
    }, `${s.name} removed`);
  }

  async function deleteAll() {
    await run(async () => {
      await api(`/api/sections/${section.id}/students`, { method: "DELETE" });
      await reload();
    }, "All students deleted");
  }

  const meta = {
    title: `${section.pageTitle} — Section ${section.sectionName}`,
    subjectName: section.subjectName,
    facultyName: section.facultyName || "Not Set",
    sectionName: section.sectionName,
    date: section.attendanceDate ?? undefined,
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        wide
        title={
          <span className="flex items-center gap-2">
            <span className="rounded-lg bg-[var(--brand)] px-2 py-0.5 text-xs font-black uppercase tracking-wider text-white">Admin</span>
            Section {section.sectionName} • Admin Panel
          </span>
        }
        footer={
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">All changes are saved to the shared database instantly.</span>
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        }
      >
        <Tabs<Tab>
          tabs={[
            { key: "dashboard", label: "Dashboard" },
            { key: "students", label: `Students (${students.length})` },
            { key: "bulk", label: "Bulk Upload" },
            { key: "settings", label: "Settings" },
            { key: "export", label: "Export" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {/* ------------------------------------------------ Dashboard */}
        {tab === "dashboard" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Total students" value={students.length} />
              <Stat label="Present" value={present.length} tone="green" />
              <Stat label="Absent" value={absent.length} tone="red" />
              <Stat label="Not marked" value={unmarked} tone="gray" />
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <Info k="Subject" v={section.subjectName} />
                <Info k="Faculty" v={section.facultyName || "Not Set"} />
                <Info k="Section" v={section.sectionName} />
                <Info k="Page" v={section.destination} />
                <Info
                  k="Attendance status"
                  v={section.attendanceSubmitted ? `Submitted & locked (${formatDate(section.submittedAt)})` : "Open for marking"}
                />
                <Info k="Last updated" v={formatDate(section.updatedAt)} />
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Attendance controls</div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" disabled={busy || !section.attendanceSubmitted} onClick={attendance("resetSubmit")}>
                  Reset Submit (unlock)
                </button>
                <button
                  className="btn-danger"
                  disabled={busy}
                  onClick={() =>
                    setConfirm({
                      title: "Reset all attendance?",
                      message: "Every student will be un-marked and the submission lock will be removed.",
                      label: "Reset All",
                      action: attendance("resetAll"),
                    })
                  }
                >
                  Reset All
                </button>
                <button className="btn-success" onClick={() => setView("present")}>
                  View &amp; Download Present ({present.length})
                </button>
                <button className="btn-danger !bg-rose-500" onClick={() => setView("absent")}>
                  View &amp; Download Absent ({absent.length})
                </button>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Student management</div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" onClick={() => setEditing("new")}>
                  + Add Student
                </button>
                <button className="btn-secondary" onClick={() => setTab("bulk")}>
                  Bulk Upload
                </button>
                <button className="btn-secondary" onClick={() => setTab("export")}>
                  Export
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------- Students */}
        {tab === "students" && (
          <StudentsTab
            students={students}
            busy={busy}
            onAdd={() => setEditing("new")}
            onEdit={(s) => setEditing(s)}
            onDelete={(s) =>
              setConfirm({ title: `Delete ${s.name}?`, message: "This student will be removed from the directory.", label: "Delete", action: () => deleteStudent(s) })
            }
            onDeleteAll={() =>
              setConfirm({
                title: "Delete ALL students?",
                message: `This removes all ${students.length} students from Section ${section.sectionName}. This cannot be undone.`,
                label: "Delete All Students",
                action: deleteAll,
              })
            }
          />
        )}

        {/* ---------------------------------------------- Bulk upload */}
        {tab === "bulk" && (
          <BulkTab
            busy={busy}
            existingCount={students.length}
            onUpload={(rows, mode) =>
              run(async () => {
                const data = await api<{ count: number; students: Student[] }>(`/api/sections/${section.id}/students`, {
                  method: "POST",
                  body: JSON.stringify({ students: rows, mode }),
                });
                onChange(null, data.students);
              }, `${rows.length} students ${mode === "replace" ? "loaded (directory replaced)" : "appended"}`)
            }
          />
        )}

        {/* ------------------------------------------------- Settings */}
        {tab === "settings" && (
          <SettingsTab
            section={section}
            busy={busy}
            onSave={(patch) =>
              run(async () => {
                const s = await api<Section>(`/api/sections/${section.id}`, { method: "PUT", body: JSON.stringify(patch) });
                onChange(s, null);
              }, "Directory information saved")
            }
            onSaveLogos={(patch) =>
              run(async () => {
                const s = await api<Section>(`/api/sections/${section.id}`, { method: "PUT", body: JSON.stringify(patch) });
                onChange(s, null);
              }, "Logos saved — visible to everyone")
            }
            onRestoreLogos={() =>
              run(async () => {
                const s = await api<Section>(`/api/sections/${section.id}`, { method: "PUT", body: JSON.stringify({ action: "restoreLogos" }) });
                onChange(s, null);
              }, "Original logos restored")
            }
          />
        )}

        {/* --------------------------------------------------- Export */}
        {tab === "export" && (
          <ExportTab section={section} students={students} present={present} absent={absent} onView={setView} push={push} />
        )}
      </Modal>

      {/* Edit / add student modal */}
      {editing && (
        <StudentEditModal
          student={editing === "new" ? null : editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(data) =>
            run(async () => {
              if (editing === "new") {
                await api(`/api/sections/${section.id}/students`, { method: "POST", body: JSON.stringify({ student: data }) });
              } else {
                await api(`/api/sections/${section.id}/students/${editing.id}`, { method: "PUT", body: JSON.stringify(data) });
              }
              await reload();
              setEditing(null);
            }, editing === "new" ? "Student added" : "Student updated")
          }
        />
      )}

      {/* Present / absent view */}
      {view && (
        <AttendanceViewModal
          kind={view}
          rows={view === "present" ? present : view === "absent" ? absent : students}
          section={section}
          meta={meta}
          onClose={() => setView(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.label}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.action()}
      />
    </>
  );
}

/* ================================================================ Bits */
function Stat({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "green" | "red" | "gray" }) {
  const c = { blue: "text-[var(--brand)] bg-sky-50", green: "text-emerald-700 bg-emerald-50", red: "text-rose-700 bg-rose-50", gray: "text-slate-700 bg-slate-100" }[tone];
  return (
    <div className={`rounded-2xl p-4 ${c}`}>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}
function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-36 shrink-0 font-bold text-slate-500">{k}</span>
      <span className="break-all text-slate-800">{v}</span>
    </div>
  );
}

/* ------------------------------------------------------- Students tab */
function StudentsTab({
  students, busy, onAdd, onEdit, onDelete, onDeleteAll,
}: {
  students: Student[];
  busy: boolean;
  onAdd: () => void;
  onEdit: (s: Student) => void;
  onDelete: (s: Student) => void;
  onDeleteAll: () => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? students.filter((s) => `${s.name} ${s.ruid} ${s.email}`.toLowerCase().includes(t)) : students;
  }, [students, q]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…" className="input max-w-xs" />
        <button className="btn-primary" onClick={onAdd}>
          + Add Student
        </button>
        <button className="btn-danger ml-auto" onClick={onDeleteAll} disabled={busy || students.length === 0}>
          Delete All Students
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Student</th>
              <th className="hidden px-3 py-2 sm:table-cell">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  No students.
                </td>
              </tr>
            )}
            {list.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-500">{s.serial}</td>
                <td className="px-3 py-2">
                  <div className="font-bold text-slate-900">{s.name}</div>
                  <div className="font-mono text-xs font-bold text-[var(--brand)]">{s.ruid}</div>
                  <div className="break-all text-xs text-slate-500">{s.email}</div>
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  <StatusPill status={s.status} />
                </td>
                <td className="px-3 py-2 text-right">
                  <button className="btn-ghost !px-2.5 !py-1 !text-xs" onClick={() => onEdit(s)}>
                    Edit
                  </button>
                  <button className="btn-ghost !px-2.5 !py-1 !text-xs !text-rose-600 hover:!bg-rose-50" onClick={() => onDelete(s)} disabled={busy}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (status === "present") return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Present</span>;
  if (status === "absent") return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">Absent</span>;
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Not marked</span>;
}

/* --------------------------------------------------------- Edit modal */
function StudentEditModal({
  student, busy, onClose, onSave,
}: { student: Student | null; busy: boolean; onClose: () => void; onSave: (d: CsvStudent) => void }) {
  const [name, setName] = useState(student?.name ?? "");
  const [ruid, setRuid] = useState(student?.ruid ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  return (
    <Modal open onClose={onClose} title={student ? `Edit Student — ${student.name}` : "Add New Student"}>
      <div className="grid gap-4">
        <Field label="Student name" value={name} onChange={setName} placeholder="e.g. Rahul Kumar" />
        <Field label="RUID / Student ID" value={ruid} onChange={setRuid} placeholder="e.g. RU-26-00001" />
        <Field label="Email" value={email} onChange={setEmail} placeholder="e.g. rahul.kumar@rungta.org" type="email" />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" disabled={busy || !name.trim()} onClick={() => onSave({ name: name.trim(), ruid: ruid.trim(), email: email.trim() })}>
          {student ? "Save Changes" : "Add Student"}
        </button>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------- Bulk tab */
function BulkTab({
  busy, existingCount, onUpload,
}: { busy: boolean; existingCount: number; onUpload: (rows: CsvStudent[], mode: "replace" | "append") => void }) {
  const [rows, setRows] = useState<CsvStudent[]>([]);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <ol className="grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
        {["Download the CSV template", "Fill in Name, RUID, Email", "Upload the completed CSV", "Students appear in the directory"].map((t, i) => (
          <li key={t} className="rounded-2xl border border-slate-200 p-3">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-[var(--brand)]">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => downloadText("students-template.csv", CSV_TEMPLATE)}>
          ⬇ Download CSV Template
        </button>
        <button className="btn-primary" onClick={() => ref.current?.click()}>
          Choose CSV File
        </button>
        <input
          ref={ref}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFileName(f.name);
            setError("");
            try {
              const parsed = csvToStudents(await f.text());
              if (parsed.length === 0) setError("No student rows were found. Check that the file has Name, RUID and Email columns.");
              setRows(parsed);
            } catch {
              setError("Could not read this file.");
            } finally {
              e.target.value = "";
            }
          }}
        />
      </div>
      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-slate-600">
            <b>{fileName}</b> — {rows.length} students parsed. Preview:
          </div>
          <div className="max-h-64 overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-left font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">RUID</th>
                  <th className="px-3 py-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-1.5 font-semibold">{r.name}</td>
                    <td className="px-3 py-1.5 font-mono">{r.ruid}</td>
                    <td className="px-3 py-1.5">{r.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} />
              Replace existing {existingCount} students
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "append"} onChange={() => setMode("append")} />
              Append to existing list
            </label>
          </div>
          <button className="btn-primary" disabled={busy} onClick={() => onUpload(rows, mode)}>
            {busy ? "Uploading…" : mode === "replace" ? "Upload / Replace Students" : "Upload / Append Students"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------- Settings tab */
const DIRECTORY_KEYS = [
  "brandName", "badgeText", "pageTitle", "pageSubtitle", "subjectName", "facultyName", "sectionName", "footerText", "title", "description",
] as const;
type DirKey = (typeof DIRECTORY_KEYS)[number];

function SettingsTab({
  section, busy, onSave, onSaveLogos, onRestoreLogos,
}: {
  section: Section;
  busy: boolean;
  onSave: (p: Partial<Record<DirKey, string>>) => void;
  onSaveLogos: (p: { leftLogoUrl: string; rightLogoUrl: string }) => void;
  onRestoreLogos: () => void;
}) {
  const [d, setD] = useState<Record<DirKey, string>>(() =>
    Object.fromEntries(DIRECTORY_KEYS.map((k) => [k, section[k]])) as Record<DirKey, string>,
  );
  const [left, setLeft] = useState(section.leftLogoUrl);
  const [right, setRight] = useState(section.rightLogoUrl);
  const set = (k: DirKey) => (v: string) => setD((x) => ({ ...x, [k]: v }));

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-base font-extrabold text-slate-800">Edit Directory Details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Header brand text" value={d.brandName} onChange={set("brandName")} />
          <Field label="Badge text" value={d.badgeText} onChange={set("badgeText")} />
          <Field label="Page title" value={d.pageTitle} onChange={set("pageTitle")} />
          <Field label="Page subtitle" value={d.pageSubtitle} onChange={set("pageSubtitle")} />
          <Field label="Subject name" value={d.subjectName} onChange={set("subjectName")} />
          <Field label="Faculty name" value={d.facultyName} onChange={set("facultyName")} placeholder="Not Set" />
          <Field label="Section name" value={d.sectionName} onChange={set("sectionName")} />
          <Field label="Footer text (click 5× for admin)" value={d.footerText} onChange={set("footerText")} />
          <Field label="Landing card title" value={d.title} onChange={set("title")} />
          <Field label="Landing card description" value={d.description} onChange={set("description")} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => onSave(d)}>
            Save Directory Information
          </button>
          <button
            className="btn-secondary"
            onClick={() => setD(Object.fromEntries(DIRECTORY_KEYS.map((k) => [k, section[k]])) as Record<DirKey, string>)}
          >
            Cancel
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-base font-extrabold text-slate-800">Branding / Logos</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <ImageField label="Left logo (EIT)" value={left} onChange={setLeft} onReset={() => setLeft(DEFAULT_LOGO)} />
          <ImageField label="Right logo (Institution)" value={right} onChange={setRight} onReset={() => setRight(DEFAULT_COLLEGE_LOGO)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => onSaveLogos({ leftLogoUrl: left, rightLogoUrl: right })}>
            Save Logos
          </button>
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() => {
              setLeft(DEFAULT_LOGO);
              setRight(DEFAULT_COLLEGE_LOGO);
              onRestoreLogos();
            }}
          >
            Restore Original Logos
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Saved logos are stored centrally and shown on every device that opens this section.</p>
      </section>
    </div>
  );
}

/* --------------------------------------------------------- Export tab */
const FIELD_OPTIONS = [
  { key: "serial", label: "Serial No." },
  { key: "name", label: "Name" },
  { key: "ruid", label: "RUID" },
  { key: "email", label: "Email" },
  { key: "status", label: "Attendance status" },
] as const;
type FieldKey = (typeof FIELD_OPTIONS)[number]["key"];

function fileBase(section: Section, suffix: string) {
  return `Section-${section.sectionName}-${suffix}-${new Date().toISOString().slice(0, 10)}`;
}

function ExportTab({
  section, students, present, absent, onView, push,
}: { section: Section; students: Student[]; present: Student[]; absent: Student[]; onView: (v: ViewKind) => void; push: Push }) {
  const [fields, setFields] = useState<FieldKey[]>(["serial", "name", "ruid", "email"]);
  const [scope, setScope] = useState<ViewKind>("all");
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const scoped = scope === "present" ? present : scope === "absent" ? absent : students;

  const meta = {
    title: `${section.pageTitle} — Section ${section.sectionName}`,
    subjectName: section.subjectName,
    facultyName: section.facultyName || "Not Set",
    sectionName: section.sectionName,
    date: section.attendanceDate ?? undefined,
  };

  function downloadAll() {
    downloadText(
      fileBase(section, "students") + ".csv",
      toCsv(["S.No.", "Name", "RUID", "Email", "Status"], students.map((s) => [s.serial, s.name, s.ruid, s.email, s.status ?? "not marked"])),
    );
    push("Student details downloaded");
  }

  function downloadSelected() {
    if (fields.length === 0) return push("Select at least one field", "err");
    const suffix = scope === "all" ? "selected" : scope;
    if (format === "csv") {
      const headers = FIELD_OPTIONS.filter((f) => fields.includes(f.key)).map((f) => f.label);
      downloadText(
        fileBase(section, suffix) + ".csv",
        toCsv(headers, scoped.map((s) => fields.map((k) => (k === "status" ? s.status ?? "not marked" : s[k])))),
      );
    } else {
      generateStudentPdf(fileBase(section, suffix) + ".pdf", { ...meta, subtitle: `${scope === "all" ? "Student" : scope[0].toUpperCase() + scope.slice(1)} details`, summary: { total: students.length, present: present.length, absent: absent.length } }, scoped, {
        includeStatus: fields.includes("status"),
      });
    }
    push("Download started");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 p-4">
        <h3 className="font-extrabold text-slate-800">Student details</h3>
        <p className="mb-3 text-sm text-slate-500">Full directory with current attendance status.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={downloadAll}>
            ⬇ Download Updated Student Details (CSV)
          </button>
          <button
            className="btn-secondary"
            onClick={() =>
              generateStudentPdf(fileBase(section, "attendance") + ".pdf", { ...meta, subtitle: "Attendance report", summary: { total: students.length, present: present.length, absent: absent.length } }, students, { includeStatus: true })
            }
          >
            ⬇ Attendance PDF
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-4">
        <h3 className="font-extrabold text-slate-800">Download Selected Details</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1 text-xs font-bold uppercase text-slate-500">Students</div>
            {(["all", "present", "absent"] as ViewKind[]).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm capitalize">
                <input type="radio" checked={scope === k} onChange={() => setScope(k)} />
                {k} ({k === "all" ? students.length : k === "present" ? present.length : absent.length})
              </label>
            ))}
          </div>
          <div>
            <div className="mb-1 text-xs font-bold uppercase text-slate-500">Fields</div>
            {FIELD_OPTIONS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fields.includes(f.key)}
                  onChange={(e) => setFields((x) => (e.target.checked ? [...x, f.key] : x.filter((k) => k !== f.key)))}
                />
                {f.label}
              </label>
            ))}
          </div>
          <div>
            <div className="mb-1 text-xs font-bold uppercase text-slate-500">Format</div>
            {(["csv", "pdf"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm uppercase">
                <input type="radio" checked={format === k} onChange={() => setFormat(k)} />
                {k}
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary mt-4" onClick={downloadSelected}>
          ⬇ Download Selected Details
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-3xl font-black text-emerald-700">{present.length}</div>
          <div className="text-xs font-bold uppercase text-emerald-700/70">Present students</div>
          <button className="btn-success mt-3" onClick={() => onView("present")}>
            View &amp; Download Present
          </button>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-3xl font-black text-rose-700">{absent.length}</div>
          <div className="text-xs font-bold uppercase text-rose-700/70">Absent students</div>
          <button className="btn-danger mt-3" onClick={() => onView("absent")}>
            View &amp; Download Absent
          </button>
        </div>
      </section>
    </div>
  );
}

/* --------------------------------------------- Present / absent view */
function AttendanceViewModal({
  kind, rows, section, meta, onClose,
}: {
  kind: ViewKind;
  rows: Student[];
  section: Section;
  meta: { title: string; subjectName: string; facultyName: string; sectionName: string; date?: string };
  onClose: () => void;
}) {
  const label = kind === "present" ? "Present" : kind === "absent" ? "Absent" : "All";
  const tone = kind === "present" ? "text-emerald-700" : kind === "absent" ? "text-rose-700" : "text-slate-800";

  function csv() {
    downloadText(fileBase(section, kind) + ".csv", toCsv(["S.No.", "Name", "RUID", "Email"], rows.map((s) => [s.serial, s.name, s.ruid, s.email])));
  }
  function pdf() {
    generateStudentPdf(fileBase(section, kind) + ".pdf", { ...meta, subtitle: `${label} students (${rows.length})` }, rows);
  }
  function print() {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
    w.document.write(`<!doctype html><html><head><title>${esc(label)} Students — Section ${esc(section.sectionName)}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{margin:0;font-size:22px;color:#0d4b8f}p{margin:4px 0 16px;color:#475569}
      table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}th{background:#e8f1fb}</style></head><body>
      <h1>${esc(meta.title)}</h1><p>${esc(label)} students: ${rows.length} • Subject: ${esc(meta.subjectName)} • Faculty: ${esc(meta.facultyName)} • Date: ${esc(meta.date ?? new Date().toLocaleDateString())}</p>
      <table><thead><tr><th>S.No.</th><th>Name</th><th>RUID</th><th>Email</th></tr></thead><tbody>
      ${rows.map((s) => `<tr><td>${s.serial}</td><td>${esc(s.name)}</td><td>${esc(s.ruid)}</td><td>${esc(s.email)}</td></tr>`).join("")}
      </tbody></table><script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={
        <span className={tone}>
          {label} Students ({rows.length}) — Section {section.sectionName}
        </span>
      }
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button className="btn-secondary" onClick={csv} disabled={rows.length === 0}>
            ⬇ Download {label} CSV
          </button>
          <button className="btn-secondary" onClick={pdf} disabled={rows.length === 0}>
            ⬇ Download {label} PDF
          </button>
          <button className="btn-primary" onClick={print} disabled={rows.length === 0}>
            Print / Save PDF
          </button>
        </div>
      }
    >
      {rows.length === 0 ? (
        <div className="py-10 text-center text-slate-500">No {label.toLowerCase()} students yet.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">S.No.</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">RUID</th>
                <th className="px-3 py-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-500">{s.serial}</td>
                  <td className="px-3 py-2 font-bold text-slate-900">{s.name}</td>
                  <td className="px-3 py-2 font-mono text-xs font-bold text-[var(--brand)]">{s.ruid}</td>
                  <td className="break-all px-3 py-2 text-slate-600">{s.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
