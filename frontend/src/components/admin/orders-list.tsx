"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatCOP, formatDateShort, STATUS_LABELS } from "@/lib/format";
import type { AdminOrderList, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/pill";
import { useApi } from "./use-api";
import {
  BlockEmpty,
  BlockError,
  DateField,
  PageTitle,
  Pagination,
  ROW,
  RowsSkeleton,
  SearchField,
  setParams,
  TD,
  TD_R,
  TH,
  TH_R,
  Tabs,
  type TabItem,
} from "./ui";

const PAGE_SIZE = 20;
const STATUSES: OrderStatus[] = ["pending", "paid", "preparing", "shipped", "delivered", "cancelled"];
const TABS: TabItem[] = [
  { key: "all", label: "Todos" },
  ...STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s] })),
];

export function OrdersList() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawStatus = sp.get("status") ?? "all";
  const status = TABS.some((t) => t.key === rawStatus) ? rawStatus : "all";
  const q = sp.get("q") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const page = Math.max(1, Number(sp.get("page")) || 1);

  const { data, error, loading, refreshing, reload } = useApi<AdminOrderList>("/admin/orders", {
    status: status === "all" ? undefined : status,
    q: q || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  function patch(p: Record<string, string | number | null>) {
    router.replace(`${pathname}${setParams(sp, p)}`, { scroll: false });
  }
  const filtered = status !== "all" || !!q || !!from || !!to;
  const dateBad = !!from && !!to && from > to;

  return (
    <div>
      <PageTitle title="Pedidos" />
      <Tabs
        label="Filtrar por estado"
        items={TABS}
        value={status}
        onChange={(k) => patch({ status: k === "all" ? null : k })}
        panelId="orders-panel"
      />

      <div className="mt-4 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <SearchField
          label="Buscar por número o cliente"
          placeholder="Número o cliente"
          value={q}
          onCommit={(v) => patch({ q: v || null })}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <DateField label="Desde" value={from} max={to || undefined} onChange={(v) => patch({ from: v || null })} />
          <DateField label="Hasta" value={to} min={from || undefined} onChange={(v) => patch({ to: v || null })} />
        </div>
        <p className="tnum ml-auto text-sm text-ink-2" aria-live="polite">
          {data ? `${data.total} ${data.total === 1 ? "pedido" : "pedidos"}` : ""}
        </p>
      </div>
      {dateBad && (
        <p role="alert" className="mb-3 text-sm text-out">
          La fecha inicial no puede ser posterior a la final.
        </p>
      )}

      <div id="orders-panel" role="tabpanel" className={cn("transition-opacity duration-150", refreshing && "opacity-60")}>
        {error && !data ? (
          <BlockError error={error} onRetry={reload} what="los pedidos" />
        ) : loading ? (
          <RowsSkeleton rows={8} />
        ) : data && data.items.length === 0 ? (
          <BlockEmpty
            action={
              filtered ? (
                <Button variant="outline" size="sm" onClick={() => router.replace(pathname)}>
                  Quitar filtros
                </Button>
              ) : undefined
            }
          >
            {filtered
              ? "Ningún pedido coincide con estos filtros."
              : "Todavía no hay pedidos. Cuando un cliente complete una compra, aparecerá aquí."}
          </BlockEmpty>
        ) : (
          data && (
            <>
              <table className="hidden w-full sm:table">
                <caption className="sr-only">Lista de pedidos</caption>
                <thead>
                  <tr>
                    <th scope="col" className={TH}>
                      Pedido
                    </th>
                    <th scope="col" className={TH}>
                      Fecha
                    </th>
                    <th scope="col" className={TH}>
                      Cliente
                    </th>
                    <th scope="col" className={TH_R}>
                      Artículos
                    </th>
                    <th scope="col" className={TH_R}>
                      Total
                    </th>
                    <th scope="col" className={TH}>
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr
                      key={o.id}
                      className={cn(ROW, "cursor-pointer")}
                      onClick={() => router.push(`/admin/pedidos/${o.id}`)}
                    >
                      <td className={cn(TD, "font-medium")}>
                        <Link
                          href={`/admin/pedidos/${o.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="tnum text-link hover:underline"
                        >
                          {o.number}
                        </Link>
                      </td>
                      <td className={cn(TD, "tnum whitespace-nowrap")}>{formatDateShort(o.createdAt)}</td>
                      <td className={TD}>
                        <span className="block font-medium">{o.customerName}</span>
                        <span className="block text-xs text-ink-2">{o.customerEmail}</span>
                      </td>
                      <td className={TD_R}>{o.itemCount}</td>
                      <td className={cn(TD_R, "whitespace-nowrap")}>{formatCOP(o.totalCop)}</td>
                      <td className={TD}>
                        <StatusPill status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="sm:hidden">
                {data.items.map((o) => (
                  <li key={o.id} className="border-t border-rule">
                    <Link href={`/admin/pedidos/${o.id}`} className="block py-3">
                      <span className="flex items-center justify-between gap-3">
                        <span className="tnum font-medium">{o.number}</span>
                        <span className="tnum">{formatCOP(o.totalCop)}</span>
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-3 text-[13px] text-ink-2">
                        <span className="min-w-0 truncate">
                          {o.customerName} · {o.itemCount} {o.itemCount === 1 ? "artículo" : "artículos"} ·{" "}
                          {formatDateShort(o.createdAt)}
                        </span>
                        <StatusPill status={o.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <Pagination page={page} total={data.total} pageSize={PAGE_SIZE} onPage={(p) => patch({ page: p })} />
            </>
          )
        )}
      </div>
    </div>
  );
}
