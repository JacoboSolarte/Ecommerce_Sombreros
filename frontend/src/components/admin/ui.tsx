"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, RotateCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";

/* ---------- page title ---------- */

export function PageTitle({
  title,
  subline,
  children,
}: {
  title: string;
  subline?: React.ReactNode;
  /** actions: an outlined secondary and the one primary */
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-8 font-semibold">{title}</h1>
        {subline && <p className="mt-0.5 text-sm text-ink-2">{subline}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/* ---------- underline tabs ---------- */

export interface TabItem {
  key: string;
  label: string;
  count?: number | null;
}

export function Tabs({
  items,
  value,
  onChange,
  label,
  panelId,
}: {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  label: string;
  panelId?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKey(e: React.KeyboardEvent, i: number) {
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % items.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = items.length - 1;
    if (n < 0) return;
    e.preventDefault();
    refs.current[n]?.focus();
    onChange(items[n].key);
  }
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="tablist" aria-label={label} className="flex min-w-max gap-5 border-b border-edge">
        {items.map((t, i) => {
          const on = t.key === value;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls={panelId}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(t.key)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-0.5 text-sm whitespace-nowrap transition-colors duration-150",
                on
                  ? "border-link font-semibold text-ink"
                  : "border-transparent text-ink-2 hover:text-ink",
              )}
            >
              {t.label}
              {t.count != null && <span className="tnum text-xs font-normal text-ink-2">{t.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- toolbar controls (32px) ---------- */

export const CONTROL =
  "h-8 rounded-field border border-field bg-surface px-2.5 text-sm text-ink transition-colors duration-150 hover:border-ink-2 disabled:bg-tone disabled:text-ink-2";

export function SearchField({
  value,
  onCommit,
  label,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    // the URL changed from elsewhere (back button, tab switch): follow it
    setPrev(value);
    setText(value);
  }
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function change(v: string) {
    setText(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setPrev(v.trim());
      onCommit(v.trim());
    }, 350);
  }
  return (
    <div role="search" className={cn("relative w-full sm:w-72", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-2" aria-hidden />
      <input
        id={id}
        type="search"
        value={text}
        placeholder={placeholder}
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            window.clearTimeout(timer.current);
            setPrev(text.trim());
            onCommit(text.trim());
          }
        }}
        className={cn(CONTROL, "w-full pr-2.5 pl-8 placeholder:text-ink-2")}
      />
    </div>
  );
}

export function DateField({
  value,
  onChange,
  label,
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  min?: string;
  max?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="text-sm text-ink-2">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={cn(CONTROL, "tnum")}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--color-chart)]"
      />
      {children}
    </label>
  );
}

/* ---------- table styling ---------- */

export const TH = "px-3 py-2 text-left text-xs font-medium whitespace-nowrap text-ink-2";
export const TH_R = "px-3 py-2 text-right text-xs font-medium whitespace-nowrap text-ink-2";
export const TD = "px-3 py-3 align-middle text-sm";
export const TD_R = "px-3 py-3 text-right align-middle text-sm tnum";
export const ROW = "border-t border-rule transition-colors duration-150 hover:bg-tile";

export function Dash({ label = "Sin dato" }: { label?: string }) {
  return (
    <span aria-label={label} className="text-ink-2">
      –
    </span>
  );
}

/* ---------- states ---------- */

export function BlockError({
  error,
  onRetry,
  what,
}: {
  error: ApiError;
  onRetry?: () => void;
  what: string;
}) {
  let text = `No pudimos cargar ${what}. ${error.message}`;
  let action: React.ReactNode = onRetry ? (
    <Button variant="outline" size="sm" onClick={onRetry}>
      <RotateCcw className="size-4" aria-hidden /> Reintentar
    </Button>
  ) : null;
  if (error.status === 401) {
    text = "Tu sesión expiró. Ingresa de nuevo para seguir.";
    action = (
      <Button size="sm" variant="secondary" href="/ingresar?next=/admin">
        Ingresar
      </Button>
    );
  } else if (error.status === 403) {
    text = "Tu cuenta no tiene permiso para ver esta información.";
    action = null;
  }
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-edge bg-tile px-4 py-3 text-sm"
    >
      <AlertCircle className="size-4 shrink-0 text-out" aria-hidden />
      <p className="min-w-0 flex-1">{text}</p>
      {action}
    </div>
  );
}

export function BlockEmpty({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-field px-4 py-8 text-center text-sm text-ink-2">
      <p className="max-w-md">{children}</p>
      {action}
    </div>
  );
}

export function RowsSkeleton({ rows = 6, height = 48 }: { rows?: number; height?: number }) {
  return (
    <div aria-hidden>
      <span className="sr-only" role="status">
        Cargando…
      </span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-rule px-3" style={{ height }}>
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/* ---------- pagination ---------- */

export function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Paginación" className="mt-3 flex items-center justify-between gap-3 text-sm">
      <p className="tnum text-ink-2">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-field px-2 hover:bg-tone disabled:text-field disabled:hover:bg-transparent"
        >
          <ChevronLeft className="size-4" aria-hidden /> Anterior
        </button>
        <span className="tnum px-2 text-ink-2" aria-current="page">
          {page} / {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-field px-2 hover:bg-tone disabled:text-field disabled:hover:bg-transparent"
        >
          Siguiente <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}

/* ---------- misc ---------- */

export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("text-sm font-medium text-link hover:underline", className)}>
      {children}
    </Link>
  );
}

export function CloseChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1 rounded-full bg-tone px-3 text-sm hover:bg-skeleton"
    >
      {children}
      <X className="size-3.5" aria-hidden />
    </button>
  );
}

/** Stock number colored by level: red at 0, amber when low. */
export function StockText({ stock, low }: { stock: number; low?: boolean }) {
  return (
    <span className={cn("tnum", stock === 0 ? "font-semibold text-out" : low ? "font-semibold text-low" : "")}>
      {stock}
    </span>
  );
}

/** Reads/updates URL search params for list filters. */
export function setParams(
  current: URLSearchParams,
  patch: Record<string, string | number | null | undefined>,
): string {
  const sp = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "" || v === 1 && k === "page") sp.delete(k);
    else sp.set(k, String(v));
  }
  if (!("page" in patch)) sp.delete("page");
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** SKUs and payment references are identifiers: the one place monospace is used. */
export const MONO = "font-mono"; // taste-skill-ignore
