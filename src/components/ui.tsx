"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { fileToDataUrl } from "@/lib/client";

/* ------------------------------------------------------------------ Modal */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4 print:hidden"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${
          wide ? "sm:max-w-5xl" : "sm:max-w-2xl"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Toast */
export type ToastMsg = { id: number; text: string; kind: "ok" | "err" | "info" };

export function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const push = useCallback((text: string, kind: ToastMsg["kind"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return { toasts, push };
}

export function ToastHost({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col gap-2 print:hidden">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
            t.kind === "ok" ? "bg-emerald-600" : t.kind === "err" ? "bg-rose-600" : "bg-slate-800"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Confirm */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={onConfirm} className={danger ? "btn-danger" : "btn-primary"}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ ImageField */
export function ImageField({
  label,
  value,
  onChange,
  onReset,
  round,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  onReset?: () => void;
  round?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div
        className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white ${
          round ? "rounded-full" : "rounded-xl"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt={label}
          className={`h-full w-full object-cover ${round ? "object-[50%_20%]" : ""}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-800">{label}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary !py-1.5 !text-xs" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? "Reading…" : "Upload / Change"}
          </button>
          {onReset && (
            <button type="button" className="btn-ghost !py-1.5 !text-xs" onClick={onReset}>
              Reset
            </button>
          )}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              onChange(await fileToDataUrl(f));
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Field */
export function Field({
  label,
  value,
  onChange,
  textarea,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="input"
        />
      ) : (
        <input value={value} type={type} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
      )}
    </label>
  );
}

/* ------------------------------------------------------ Hidden trigger */
/** Footer text that opens admin after 5 quick clicks. */
export function SecretFooter({ text, onUnlock }: { text: string; onUnlock: () => void }) {
  const clicks = useRef<number[]>([]);
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white/70 py-6 text-center print:hidden">
      <button
        type="button"
        onClick={() => {
          const now = Date.now();
          clicks.current = [...clicks.current.filter((t) => now - t < 4000), now];
          if (clicks.current.length >= 5) {
            clicks.current = [];
            onUnlock();
          }
        }}
        className="select-none text-sm text-slate-500 outline-none transition hover:text-slate-700"
        title=""
      >
        {text}
      </button>
    </footer>
  );
}

/* ------------------------------------------------------------- Tabs */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (k: T) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
            active === t.key ? "bg-white text-sky-800 shadow" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
