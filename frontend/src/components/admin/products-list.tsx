"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { formatCOP, formatDateShort } from "@/lib/format";
import type { AdminProductList, AdminProductRow } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert, Img } from "@/components/ui/misc";
import { Pill } from "@/components/ui/pill";
import { useToast } from "./toast";
import { useApi } from "./use-api";
import {
  MONO,
  BlockEmpty,
  BlockError,
  PageTitle,
  Pagination,
  ROW,
  RowsSkeleton,
  SearchField,
  setParams,
  StockText,
  TD,
  TD_R,
  TH,
  TH_R,
  Tabs,
} from "./ui";

const PAGE_SIZE = 20;
const LOW_TOTAL = 3;
const TABS = [
  { key: "active", label: "Activos" },
  { key: "inactive", label: "Inactivos" },
  { key: "all", label: "Todos" },
];

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="relative block size-12 shrink-0 overflow-hidden rounded-field bg-tone">
      <Img src={src} alt="" sizes="48px" />
    </span>
  );
}

export function ProductsList() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const rawStatus = sp.get("status") ?? "active";
  const status = TABS.some((t) => t.key === rawStatus) ? rawStatus : "active";
  const q = sp.get("q") ?? "";
  const page = Math.max(1, Number(sp.get("page")) || 1);

  const { data, error, loading, refreshing, reload } = useApi<AdminProductList>("/admin/products", {
    status,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const [target, setTarget] = useState<AdminProductRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function patch(p: Record<string, string | number | null>) {
    router.replace(`${pathname}${setParams(sp, p)}`, { scroll: false });
  }

  async function toggle() {
    if (!target) return;
    setBusy(true);
    setProblem(null);
    try {
      await api(`/admin/products/${target.id}/${target.isActive ? "deactivate" : "activate"}`, { method: "POST" });
      toast(target.isActive ? `${target.name} se desactivó.` : `${target.name} está activo de nuevo.`);
      setTarget(null);
      reload();
      router.refresh();
    } catch (e) {
      setProblem(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const rowActions = (p: AdminProductRow) => {
    return (
      <span className="flex items-center gap-3 text-sm font-medium">
        <Link href={`/admin/productos/${p.id}`} className="text-link hover:underline">
          Editar<span className="sr-only"> {p.name}</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            setProblem(null);
            setTarget(p);
          }}
          className={cn("hover:underline", p.isActive ? "text-ink-2" : "text-link")}
        >
          {p.isActive ? "Desactivar" : "Activar"}
          <span className="sr-only"> {p.name}</span>
        </button>
      </span>
    );
  }

  return (
    <div>
      <PageTitle title="Productos">
        <Button href="/admin/productos/nuevo" size="sm" variant="secondary">
          <Plus className="size-4" aria-hidden /> Nuevo producto
        </Button>
      </PageTitle>
      <Tabs
        label="Filtrar por estado del producto"
        items={TABS}
        value={status}
        onChange={(k) => patch({ status: k === "active" ? null : k })}
        panelId="products-panel"
      />
      <div className="mt-4 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <SearchField
          label="Buscar producto por nombre o SKU"
          placeholder="Nombre o SKU"
          value={q}
          onCommit={(v) => patch({ q: v || null })}
        />
        <p className="tnum ml-auto text-sm text-ink-2" aria-live="polite">
          {data ? `${data.total} ${data.total === 1 ? "producto" : "productos"}` : ""}
        </p>
      </div>

      <div id="products-panel" role="tabpanel" className={cn("transition-opacity duration-150", refreshing && "opacity-60")}>
        {error && !data ? (
          <BlockError error={error} onRetry={reload} what="los productos" />
        ) : loading ? (
          <RowsSkeleton rows={7} height={72} />
        ) : data && data.items.length === 0 ? (
          <BlockEmpty
            action={
              q ? (
                <Button variant="outline" size="sm" onClick={() => patch({ q: null })}>
                  Quitar búsqueda
                </Button>
              ) : status === "inactive" ? undefined : (
                <Button href="/admin/productos/nuevo" size="sm" variant="secondary">
                  Crear el primer producto
                </Button>
              )
            }
          >
            {q
              ? `No hay productos que coincidan con "${q}".`
              : status === "inactive"
                ? "No hay productos inactivos."
                : "Todavía no hay productos en el catálogo."}
          </BlockEmpty>
        ) : (
          data && (
            <>
              <table className="hidden w-full sm:table">
                <caption className="sr-only">Lista de productos</caption>
                <thead>
                  <tr>
                    <th scope="col" className={TH}>
                      Producto
                    </th>
                    <th scope="col" className={TH}>
                      Categoría
                    </th>
                    <th scope="col" className={TH_R}>
                      Precio
                    </th>
                    <th scope="col" className={TH_R}>
                      Stock
                    </th>
                    <th scope="col" className={TH_R}>
                      Variantes
                    </th>
                    <th scope="col" className={TH}>
                      Estado
                    </th>
                    <th scope="col" className={TH}>
                      Actualizado
                    </th>
                    <th scope="col" className={TH}>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.id} className={ROW}>
                      <td className={cn(TD, "min-w-56")}>
                        <div className="flex items-center gap-3">
                          <Thumb src={p.imageUrl} />
                          <div className="min-w-0">
                            <Link href={`/admin/productos/${p.id}`} className="block font-medium hover:underline">
                              {p.name}
                            </Link>
                            <span className={cn(MONO, "block text-xs text-ink-2")}>{p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className={TD}>{p.categoryName}</td>
                      <td className={cn(TD_R, "whitespace-nowrap")}>{formatCOP(p.priceCop)}</td>
                      <td className={TD_R}>
                        <StockText stock={p.totalStock} low={p.totalStock <= LOW_TOTAL} />
                      </td>
                      <td className={TD_R}>{p.variantCount}</td>
                      <td className={TD}>
                        <Pill tone={p.isActive ? "ok" : "neutral"}>{p.isActive ? "Activo" : "Inactivo"}</Pill>
                      </td>
                      <td className={cn(TD, "tnum whitespace-nowrap text-ink-2")}>{formatDateShort(p.updatedAt)}</td>
                      <td className={TD}>
                        {rowActions(p)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="sm:hidden">
                {data.items.map((p) => (
                  <li key={p.id} className="flex gap-3 border-t border-rule py-3">
                    <Thumb src={p.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/admin/productos/${p.id}`} className="font-medium">
                          {p.name}
                        </Link>
                        <span className="tnum shrink-0">{formatCOP(p.priceCop)}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-ink-2">
                        <span className={cn(MONO, "text-xs")}>{p.sku}</span> · Stock <StockText stock={p.totalStock} low={p.totalStock <= LOW_TOTAL} /> ·{" "}
                        {p.isActive ? "Activo" : "Inactivo"}
                      </p>
                      <div className="mt-1.5">
                        {rowActions(p)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={page} total={data.total} pageSize={PAGE_SIZE} onPage={(p) => patch({ page: p })} />
            </>
          )
        )}
      </div>

      <Dialog
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target?.isActive ? "¿Desactivar este producto?" : "¿Activar este producto?"}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setTarget(null)}>
              Volver
            </Button>
            <Button variant="secondary" size="sm" loading={busy} onClick={toggle}>
              {target?.isActive ? "Desactivar producto" : "Activar producto"}
            </Button>
          </div>
        }
      >
        {target && (
          <div className="grid gap-3 text-sm">
            {target.isActive ? (
              <p className="text-ink-2">
                <strong className="font-semibold text-ink">{target.name}</strong> dejará de mostrarse en la tienda y no se
                podrá comprar. No se borra: sus pedidos anteriores conservan el historial y puedes activarlo de nuevo
                cuando quieras.
              </p>
            ) : (
              <p className="text-ink-2">
                <strong className="font-semibold text-ink">{target.name}</strong> volverá a mostrarse en la tienda con su
                stock actual.
              </p>
            )}
            {problem && <Alert tone="error">{problem}</Alert>}
          </div>
        )}
      </Dialog>
    </div>
  );
}
