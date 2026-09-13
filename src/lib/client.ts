import type { LandingSettings, Section, Student } from "@/db/schema";

export type { LandingSettings, Section, Student };

export type SectionPayload = { section: Section; students: Student[] };

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Read an image file as a compressed data URL (kept small enough for DB storage). */
export function fileToDataUrl(file: File, maxSize = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const isPng = file.type === "image/png";
        resolve(isPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.86));
      };
      img.onerror = () => resolve(String(reader.result));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}
