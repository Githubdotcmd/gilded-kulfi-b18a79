export type CsvStudent = { name: string; ruid: string; email: string };

/** RFC-4180-ish CSV parser that handles quotes, commas and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

/** Convert parsed CSV into student records (auto-detects header row). */
export function csvToStudents(text: string): CsvStudent[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const findCol = (...names: string[]) =>
    header.findIndex((h) => names.some((n) => h.includes(n)));
  let nameIdx = findCol("name");
  let ruidIdx = findCol("ruid", "id", "roll");
  let emailIdx = findCol("email", "mail");
  const hasHeader = nameIdx >= 0 || emailIdx >= 0;
  if (!hasHeader) {
    nameIdx = 0;
    ruidIdx = 1;
    emailIdx = 2;
  }
  // Skip a leading serial column if header says so
  const body = hasHeader ? rows.slice(1) : rows;
  return body
    .map((r) => ({
      name: (r[nameIdx] ?? "").trim(),
      ruid: (ruidIdx >= 0 ? r[ruidIdx] ?? "" : "").trim(),
      email: (emailIdx >= 0 ? r[emailIdx] ?? "" : "").trim(),
    }))
    .filter((s) => s.name);
}

function esc(v: string | number | null | undefined) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\r\n");
}

export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const CSV_TEMPLATE = toCsv(
  ["Name", "RUID", "Email"],
  [
    ["Rahul Kumar", "RU-26-00001", "rahul.kumar@rungta.org"],
    ["Priya Sharma", "RU-26-00002", "priya.sharma@rungta.org"],
  ],
);
