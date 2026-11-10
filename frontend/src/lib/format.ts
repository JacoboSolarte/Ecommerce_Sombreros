import type { Availability, OrderStatus, PaymentStatus, WeaveGrade } from "./types";

/** Manual grouping so output is identical on server and client ("$ 189.000"). */
function groupThousands(n: number): string {
  return String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** formatCOP(189000) -> "$ 189.000" (es-CO convention). */
export function formatCOP(value: number): string {
  const n = Math.round(value);
  return `${n < 0 ? "-" : ""}$ ${groupThousands(n)}`;
}

/** Splits an amount for typographic treatment (small currency sign). */
export function copParts(value: number): { sign: string; amount: string } {
  const n = Math.round(value);
  return { sign: n < 0 ? "-$" : "$", amount: groupThousands(n) };
}

export function percentOff(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});
const dateTimeFmt = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateTimeFmt.format(d);
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  declined: "Rechazado",
  failed: "Fallido",
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  in_stock: "Disponible",
  low_stock: "Últimas unidades",
  out_of_stock: "Agotado",
};

export const WEAVE_LABELS: Record<WeaveGrade, string> = {
  fino: "Fino",
  superfino: "Superfino",
  extrafino: "Extrafino",
};

export const WEAVE_ORDER: WeaveGrade[] = ["fino", "superfino", "extrafino"];

export function weaveLine(grade: WeaveGrade): string {
  return `Tejido ${grade}`;
}

export function deliveryText(min: number, max: number): string {
  if (min === max) return `Llega en ${min} días hábiles`;
  return `Llega en ${min} a ${max} días hábiles`;
}

export function pluralUnits(n: number): string {
  return n === 1 ? "1 unidad" : `${n} unidades`;
}

export function onlyLeft(n: number): string {
  if (n <= 0) return "Agotado";
  return n === 1 ? "Solo queda 1 unidad" : `Solo quedan ${n} unidades`;
}

// ---- Admin helpers ----

/** Today's calendar date in Bogotá as YYYY-MM-DD. */
export function todayBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Adds days to a YYYY-MM-DD string (calendar math in UTC, no timezone drift). */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

const shortDayFmt = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const longDayFmt = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "12 oct" for a YYYY-MM-DD string. */
export function formatDayShort(ymd: string): string {
  return shortDayFmt.format(new Date(`${ymd}T00:00:00Z`)).replace(".", "");
}
export function formatDayLong(ymd: string): string {
  return longDayFmt.format(new Date(`${ymd}T00:00:00Z`)).replace(/\./g, "");
}

const shortDateFmt = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : shortDateFmt.format(d).replace(/\./g, "");
}

export const MOVEMENT_LABELS: Record<string, string> = {
  initial: "Stock inicial",
  purchase: "Compra",
  adjustment: "Ajuste",
  restock: "Reposición",
  cancellation: "Cancelación",
};
