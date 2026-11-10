"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef } from "react";
import { addDays, formatCOP, formatDayShort, STATUS_LABELS, todayBogota } from "@/lib/format";
import type { AdminSummary, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Img, Skeleton } from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/pill";
import { SeriesChart, compactCOP, type ChartPoint } from "./charts";
import { useAdminCounts } from "./shell";
import { useApi } from "./use-api";
import { BlockEmpty, BlockError, CONTROL, DateField, PageTitle, StockText, TextLink, TH, TH_R, ROW, setParams } from "./ui";

type Period = "7" | "30" | "mes" | "custom";

const PERIODS: { key: Period; label: string }[] = [
  { key: "7", label: "Últimos 7 días" },
  { key: "30", label: "Últimos 30 días" },
  { key: "mes", label: "Este mes" },
  { key: "custom", label: "Personalizado" },
];

type Metric = "revenue" | "orders" | "average";

const STATUS_ORDER: OrderStatus[] = ["pending", "paid", "preparing", "shipped", "delivered", "cancelled"];

function resolveRange(period: Period, from: string, to: string, today: string) {
  if (period === "7") return { from: addDays(today, -6), to: today };
  if (period === "mes") return { from: `${today.slice(0, 8)}01`, to: today };
  if (period === "custom" && from && to && from <= to) return { from, to };
  return { from: addDays(today, -29), to: today };
}

function Card({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-edge p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-hidden className="grid gap-4">
      <span className="sr-only" role="status">
        Cargando resumen…
      </span>
      <div className="rounded-card border border-edge p-4">
        <div className="flex gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="min-w-36 flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-2 h-7 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-[220px] w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export function OverviewView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const counts = useAdminCounts();
  const today = useMemo(() => todayBogota(), []);

  const period = (PERIODS.some((p) => p.key === sp.get("p")) ? sp.get("p") : "30") as Period;
  const customFrom = sp.get("from") ?? "";
  const customTo = sp.get("to") ?? "";
  const metric = (["revenue", "orders", "average"].includes(sp.get("m") ?? "") ? sp.get("m") : "revenue") as Metric;
  const range = resolveRange(period, customFrom, customTo, today);
  const customInvalid =
    period === "custom" && (!customFrom || !customTo || customFrom > customTo || addDays(customFrom, 366) < customTo);

  const { data, error, loading, refreshing, reload } = useApi<AdminSummary>("/admin/summary", range);

  function patch(p: Record<string, string | null>) {
    router.replace(`${pathname}${setParams(sp, p)}`, { scroll: false });
  }

  const salesByDay = data?.salesByDay ?? [];
  const points: ChartPoint[] = salesByDay.map((d) => ({
    date: d.date,
    value:
      metric === "revenue" ? d.revenueCop : metric === "orders" ? d.orders : d.orders > 0 ? Math.round(d.revenueCop / d.orders) : null,
  }));
  const rangeText = `${formatDayShort(range.from)} al ${formatDayShort(range.to)}`;

  const finding =
    counts.paid > 0
      ? {
          text: `${counts.paid} ${counts.paid === 1 ? "pedido pagado espera" : "pedidos pagados esperan"} preparación`,
          href: "/admin/pedidos?status=paid",
          cta: "Preparar pedidos",
        }
      : counts.lowStock > 0
        ? {
            text: `${counts.lowStock} ${counts.lowStock === 1 ? "variante tiene" : "variantes tienen"} stock bajo`,
            href: "/admin/inventario?bajo=1",
            cta: "Ver inventario",
          }
        : counts.pending > 0
          ? {
              text: `${counts.pending} ${counts.pending === 1 ? "pedido espera" : "pedidos esperan"} el pago del cliente`,
              href: "/admin/pedidos?status=pending",
              cta: "Ver pedidos",
            }
          : { text: "Todo al día: no hay pedidos por preparar ni stock bajo.", href: "", cta: "" };

  const kpis: { key: Metric; label: string; value: string; unit?: string }[] = [
    { key: "revenue", label: "Ingresos", value: data ? formatCOP(data.revenueCop) : "" },
    { key: "orders", label: "Pedidos pagados", value: data ? String(data.paidOrdersCount) : "" },
    { key: "average", label: "Ticket promedio", value: data ? (data.paidOrdersCount ? formatCOP(data.averageOrderCop) : "–") : "" },
  ];

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  function onTabKey(e: React.KeyboardEvent, i: number) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + kpis.length) % kpis.length;
    tabRefs.current[n]?.focus();
    patch({ m: kpis[n].key === "revenue" ? null : kpis[n].key });
  }

  const chartCfg =
    metric === "revenue"
      ? { kind: "line" as const, format: formatCOP, tick: compactCOP, unit: undefined, title: "Ingresos por día" }
      : metric === "orders"
        ? { kind: "bar" as const, format: (n: number) => String(n), tick: (n: number) => String(n), unit: "pedidos", title: "Pedidos pagados por día" }
        : { kind: "line" as const, format: formatCOP, tick: compactCOP, unit: undefined, title: "Ticket promedio por día" };

  const statusTotal = data ? STATUS_ORDER.reduce((s, k) => s + (data.ordersByStatus[k] ?? 0), 0) : 0;

  return (
    <div>
      <PageTitle title="Resumen" subline={rangeText}>
        <div className="flex items-center gap-2">
          <label htmlFor="period" className="sr-only">
            Periodo
          </label>
          <select
            id="period"
            value={period}
            onChange={(e) => patch({ p: e.target.value === "30" ? null : e.target.value, from: null, to: null })}
            className={cn(CONTROL, "cursor-pointer pr-7")}
          >
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </PageTitle>

      {period === "custom" && (
        <div className="-mt-2 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <DateField label="Desde" value={customFrom} max={customTo || today} onChange={(v) => patch({ p: "custom", from: v })} />
          <DateField label="Hasta" value={customTo} min={customFrom} max={today} onChange={(v) => patch({ p: "custom", to: v })} />
          {customInvalid && (
            <p role="alert" className="text-sm text-out">
              Elige un rango válido de hasta un año.
            </p>
          )}
        </div>
      )}

      <p className="mb-5 flex flex-wrap items-baseline gap-x-3 text-[15px]" aria-live="polite">
        <span>{finding.text}</span>
        {finding.href && <TextLink href={finding.href}>{finding.cta}</TextLink>}
      </p>

      {error && !data && <BlockError error={error} onRetry={reload} what="el resumen" />}
      {loading && !error && <OverviewSkeleton />}

      {data && (
        <div className={cn("grid gap-4 transition-opacity duration-150", refreshing && "opacity-60")}>
          <section aria-label="Ventas del periodo" className="rounded-card border border-edge p-4">
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div role="tablist" aria-label="Indicador del gráfico" className="flex min-w-max gap-x-8 sm:min-w-0 sm:gap-x-0">
                {kpis.map((k, i) => {
                  const on = metric === k.key;
                  return (
                    <button
                      key={k.key}
                      ref={(el) => {
                        tabRefs.current[i] = el;
                      }}
                      role="tab"
                      type="button"
                      id={`kpi-${k.key}`}
                      aria-selected={on}
                      aria-controls="kpi-panel"
                      tabIndex={on ? 0 : -1}
                      onClick={() => patch({ m: k.key === "revenue" ? null : k.key })}
                      onKeyDown={(e) => onTabKey(e, i)}
                      className={cn(
                        "-mb-px min-w-36 border-b-2 pb-3 text-left transition-colors duration-150 sm:min-w-0 sm:flex-1 sm:pr-6",
                        on ? "border-link" : "border-edge hover:border-field",
                      )}
                    >
                      <span className={cn("block text-sm", on ? "font-semibold text-ink" : "text-ink-2")}>{k.label}</span>
                      <span className="tnum mt-0.5 block text-[28px] leading-9 font-normal">{k.value}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div id="kpi-panel" role="tabpanel" aria-labelledby={`kpi-${metric}`} className="pt-4">
              <SeriesChart
                key={metric}
                points={points}
                kind={chartCfg.kind}
                format={chartCfg.format}
                tick={chartCfg.tick}
                unitLabel={chartCfg.unit}
                title={chartCfg.title}
              />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card title="Más vendidos">
              {data.topProducts.length === 0 ? (
                <BlockEmpty>Aún no hay ventas en este periodo. Cuando se pague un pedido, sus productos aparecen aquí.</BlockEmpty>
              ) : (
                <table className="w-full">
                  <caption className="sr-only">Productos más vendidos del periodo</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>
                        Producto
                      </th>
                      <th scope="col" className={TH_R}>
                        Unidades
                      </th>
                      <th scope="col" className={TH_R}>
                        Ingresos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p) => (
                      <tr key={p.productId} className={ROW}>
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/productos/${p.productId}`} className="flex items-center gap-3 hover:underline">
                            <span className="relative size-10 shrink-0 overflow-hidden rounded-field bg-tone">
                              <Img src={p.imageUrl} alt="" sizes="40px" />
                            </span>
                            <span className="min-w-0 font-medium">{p.name}</span>
                          </Link>
                        </td>
                        <td className="tnum px-3 py-2.5 text-right text-sm">{p.unitsSold}</td>
                        <td className="tnum px-3 py-2.5 text-right text-sm">{formatCOP(p.revenueCop)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <div className="grid content-start gap-4">
              <Card
                title="Stock bajo"
                action={
                  data.lowStock.length > 0 ? <TextLink href="/admin/inventario?bajo=1">Ver inventario</TextLink> : undefined
                }
              >
                {data.lowStock.length === 0 ? (
                  <BlockEmpty>Ninguna variante está por agotarse.</BlockEmpty>
                ) : (
                  <>
                    <ul>
                      {data.lowStock.slice(0, 6).map((l) => (
                        <li key={l.variantId} className="border-t border-rule first:border-t-0">
                          <Link
                            href={`/admin/inventario?q=${encodeURIComponent(l.productName)}`}
                            className="flex min-h-11 items-center justify-between gap-3 py-1.5 hover:underline"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{l.productName}</span>
                              <span className="block text-xs text-ink-2">
                                Talla {l.sizeCode} · {l.colorName}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm">
                              <StockText stock={l.stock} low />{" "}
                              <span className="text-xs text-ink-2">{l.stock === 1 ? "unidad" : "unidades"}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {data.lowStock.length > 6 && (
                      <p className="mt-2 text-xs text-ink-2">
                        Y {data.lowStock.length - 6} más en el inventario.
                      </p>
                    )}
                  </>
                )}
              </Card>

              <Card title="Pedidos por estado">
                {statusTotal === 0 ? (
                  <BlockEmpty>No hubo pedidos en este periodo.</BlockEmpty>
                ) : (
                  <ul>
                    {STATUS_ORDER.map((s) => (
                      <li key={s} className="border-t border-rule first:border-t-0">
                        <Link
                          href={`/admin/pedidos?status=${s}`}
                          className="flex min-h-9 items-center justify-between gap-3 py-1 hover:underline"
                          aria-label={`${STATUS_LABELS[s]}: ${data.ordersByStatus[s] ?? 0}`}
                        >
                          <StatusPill status={s} />
                          <span className="tnum text-sm">{data.ordersByStatus[s] ?? 0}</span>
                        </Link>
                      </li>
                    ))}
                    <li className="flex min-h-9 items-center justify-between gap-3 border-t border-edge pt-1 text-sm font-semibold">
                      <span>Total</span>
                      <span className="tnum">{statusTotal}</span>
                    </li>
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
