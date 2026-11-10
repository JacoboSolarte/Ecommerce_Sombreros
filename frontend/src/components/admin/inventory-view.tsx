"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { api, errorMessage, isApiError } from "@/lib/api";
import { formatDateTime, MOVEMENT_LABELS } from "@/lib/format";
import type { InventoryMovement, InventoryRow } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Dialog, Sheet } from "@/components/ui/dialog";
import { Alert, Swatch } from "@/components/ui/misc";
import { ASelect, ATextarea } from "./fields";
import { useToast } from "./toast";
import { useApi } from "./use-api";
import {
  MONO,
  BlockEmpty,
  BlockError,
  CONTROL,
  PageTitle,
  ROW,
  RowsSkeleton,
  SearchField,
  setParams,
  StockText,
  TD,
  TD_R,
  TH,
  TH_R,
  Toggle,
} from "./ui";

type Mode = "delta" | "set";

function AdjustDialog({
  row,
  onClose,
  onDone,
}: {
  row: InventoryRow | null;
  onClose: () => void;
  onDone: (updated: InventoryRow) => void;
}) {
  return (
    <Dialog open={row !== null} onClose={onClose} title="Ajustar stock">
      {row && <AdjustForm key={row.variantId} row={row} onClose={onClose} onDone={onDone} />}
    </Dialog>
  );
}

function AdjustForm({
  row,
  onClose,
  onDone,
}: {
  row: InventoryRow;
  onClose: () => void;
  onDone: (updated: InventoryRow) => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("delta");
  const [raw, setRaw] = useState("1");
  const [reason, setReason] = useState<"restock" | "adjustment">("restock");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const typed = raw.trim() === "" || !/^-?\d+$/.test(raw.trim()) ? null : Number(raw.trim());
  const delta = typed === null ? null : mode === "delta" ? typed : typed - row.stock;
  const result = delta === null ? null : row.stock + delta;
  const invalid =
    typed === null
      ? "Escribe un número entero."
      : mode === "set" && typed < 0
        ? "La cantidad no puede ser negativa."
        : result !== null && result < 0
          ? `No puedes restar más de lo que hay: quedan ${row.stock}.`
          : delta === 0
            ? "Este cambio no modifica el stock."
            : null;

  function step(d: number) {
    const base = typed ?? 0;
    setRaw(String(mode === "set" ? Math.max(0, base + d) : base + d));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || delta === null) return;
    setBusy(true);
    setProblem(null);
    try {
      const updated = await api<InventoryRow>(`/admin/inventory/${row.variantId}/adjust`, {
        method: "POST",
        body: { delta, reason, note: note.trim() || null },
      });
      toast(`Stock actualizado: ${row.productName}, talla ${row.sizeCode}, ${updated.stock} unidades.`);
      onDone(updated);
      router.refresh();
      onClose();
    } catch (err) {
      setProblem(isApiError(err) && err.status === 409 ? `${err.message} Revisa la cantidad.` : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <p className="text-sm">
        <span className="font-medium">{row.productName}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-ink-2">
          Talla {row.sizeCode} · <Swatch hex={row.colorHex} /> {row.colorName} ·{" "}
          <span className={cn(MONO, "text-xs")}>{row.sku}</span>
        </span>
      </p>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Tipo de ajuste</legend>
        <div className="inline-flex rounded-field bg-tone p-0.5">
          {(
            [
              ["delta", "Sumar o restar"],
              ["set", "Establecer cantidad"],
            ] as const
          ).map(([k, label]) => (
            <label
              key={k}
              className={cn(
                "cursor-pointer rounded-[5px] px-3 py-1.5 text-sm transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-link",
                mode === k ? "bg-surface font-semibold" : "text-ink-2",
              )}
            >
              <input
                type="radio"
                name="mode"
                value={k}
                checked={mode === k}
                onChange={() => {
                  setMode(k);
                  setRaw(k === "set" ? String(row.stock) : "1");
                }}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="adj-qty" className="mb-1 block text-sm font-medium">
          {mode === "delta" ? "Unidades a sumar (o restar con signo −)" : "Nueva cantidad en stock"}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Restar una unidad"
            className="grid size-10 place-items-center rounded-field border border-field hover:bg-tone"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <input
            id="adj-qty"
            inputMode="numeric"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            aria-invalid={invalid ? true : undefined}
            aria-describedby="adj-preview"
            className={cn(CONTROL, "tnum h-10 w-24 text-center text-base")}
          />
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Sumar una unidad"
            className="grid size-10 place-items-center rounded-field border border-field hover:bg-tone"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <p id="adj-preview" aria-live="polite" className={cn("tnum mt-2 text-sm", invalid ? "text-out" : "text-ink-2")}>
          {invalid ?? ""}
          {!invalid && result !== null && (
            <>
              Stock: {row.stock} → <strong className="font-semibold text-ink">{result}</strong>{" "}
              {delta !== null && `(${delta > 0 ? "+" : "−"}${Math.abs(delta)})`}
            </>
          )}
        </p>
      </div>

      <ASelect label="Motivo" value={reason} onChange={(e) => setReason(e.target.value as "restock" | "adjustment")}>
        <option value="restock">Reposición</option>
        <option value="adjustment">Ajuste</option>
      </ASelect>

      <ATextarea
        label="Nota (opcional)"
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
        className="min-h-20"
        hint="Por ejemplo: llegó un lote del taller de Sandoná."
      />

      {problem && <Alert tone="error">{problem}</Alert>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="secondary" size="sm" loading={busy} disabled={!!invalid}>
          Guardar ajuste
        </Button>
      </div>
    </form>
  );
}

function MovementsBody({ row }: { row: InventoryRow }) {
  const { data, error, loading, reload } = useApi<InventoryMovement[]>(`/admin/inventory/${row.variantId}/movements`);
  if (error) return <BlockError error={error} onRetry={reload} what="los movimientos" />;
  if (loading) return <RowsSkeleton rows={5} height={56} />;
  if (!data || data.length === 0) return <BlockEmpty>Esta variante aún no tiene movimientos.</BlockEmpty>;
  return (
    <ol>
      {data.map((m) => (
        <li key={m.id} className="border-t border-rule py-3 first:border-t-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">{MOVEMENT_LABELS[m.reason] ?? m.reason}</span>
            <span className={cn("tnum text-sm font-semibold", m.delta < 0 ? "text-out" : "text-ok")}>
              {m.delta > 0 ? "+" : "−"}
              {Math.abs(m.delta)}
            </span>
          </div>
          <p className="tnum mt-0.5 text-xs text-ink-2">
            {formatDateTime(m.createdAt)}
            {m.userName ? ` · ${m.userName}` : ""}
            {m.orderNumber && (
              <>
                {" · "}
                <Link href={`/admin/pedidos/${m.orderId}`} className="text-link hover:underline">
                  {m.orderNumber}
                </Link>
              </>
            )}
          </p>
          {m.note && <p className="mt-1 text-sm">{m.note}</p>}
        </li>
      ))}
    </ol>
  );
}

export function InventoryView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = sp.get("q") ?? "";
  const low = sp.get("bajo") === "1";

  const { data, error, loading, refreshing, reload } = useApi<InventoryRow[]>("/admin/inventory", {
    q: q || undefined,
    lowStock: low ? true : undefined,
  });
  const [overrides, setOverrides] = useState<Record<number, InventoryRow>>({});
  const [adjust, setAdjust] = useState<InventoryRow | null>(null);
  const [moves, setMoves] = useState<InventoryRow | null>(null);

  function patch(p: Record<string, string | null>) {
    router.replace(`${pathname}${setParams(sp, p)}`, { scroll: false });
  }
  const rows = (data ?? []).map((r) => overrides[r.variantId] ?? r);
  const lowCount = rows.filter((r) => r.isLow).length;

  const actions = (r: InventoryRow) => (
    <span className="flex items-center gap-3 text-sm font-medium">
      <button type="button" onClick={() => setAdjust(r)} className="text-link hover:underline">
        Ajustar<span className="sr-only"> stock de {r.productName}, talla {r.sizeCode}, {r.colorName}</span>
      </button>
      <button type="button" onClick={() => setMoves(r)} className="text-ink-2 hover:underline">
        Movimientos<span className="sr-only"> de {r.productName}, talla {r.sizeCode}, {r.colorName}</span>
      </button>
    </span>
  );

  return (
    <div>
      <PageTitle
        title="Inventario"
        subline={data ? (lowCount > 0 ? `${lowCount} ${lowCount === 1 ? "variante con stock bajo" : "variantes con stock bajo"}` : "Sin variantes con stock bajo") : undefined}
      />
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <SearchField
          label="Buscar por producto o SKU"
          placeholder="Producto o SKU"
          value={q}
          onCommit={(v) => patch({ q: v || null })}
        />
        <Toggle checked={low} onChange={(v) => patch({ bajo: v ? "1" : null })}>
          Solo stock bajo
        </Toggle>
        <p className="tnum ml-auto text-sm text-ink-2" aria-live="polite">
          {data ? `${rows.length} ${rows.length === 1 ? "variante" : "variantes"}` : ""}
        </p>
      </div>

      <div className={cn("transition-opacity duration-150", refreshing && "opacity-60")}>
        {error && !data ? (
          <BlockError error={error} onRetry={reload} what="el inventario" />
        ) : loading ? (
          <RowsSkeleton rows={9} />
        ) : data && rows.length === 0 ? (
          <BlockEmpty
            action={
              q || low ? (
                <Button variant="outline" size="sm" onClick={() => router.replace(pathname)}>
                  Quitar filtros
                </Button>
              ) : (
                <Button href="/admin/productos/nuevo" size="sm" variant="secondary">
                  Crear un producto
                </Button>
              )
            }
          >
            {low && !q
              ? "Ninguna variante está con stock bajo."
              : q
                ? `Ninguna variante coincide con "${q}".`
                : "Todavía no hay variantes. Se crean al registrar un producto con sus tallas y colores."}
          </BlockEmpty>
        ) : (
          <>
            <table className="hidden w-full sm:table">
              <caption className="sr-only">Stock por producto, talla y color</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Producto
                  </th>
                  <th scope="col" className={TH}>
                    Talla
                  </th>
                  <th scope="col" className={TH}>
                    Color
                  </th>
                  <th scope="col" className={TH}>
                    SKU
                  </th>
                  <th scope="col" className={TH_R}>
                    Stock
                  </th>
                  <th scope="col" className={TH}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.variantId} className={ROW}>
                    <td className={cn(TD, "font-medium")}>
                      <Link href={`/admin/productos/${r.productId}`} className="hover:underline">
                        {r.productName}
                      </Link>
                    </td>
                    <td className={TD}>{r.sizeCode}</td>
                    <td className={TD}>
                      <span className="inline-flex items-center gap-2">
                        <Swatch hex={r.colorHex} size={14} /> {r.colorName}
                      </span>
                    </td>
                    <td className={cn(TD, MONO, "text-xs text-ink-2")}>{r.sku}</td>
                    <td className={TD_R}>
                      <StockText stock={r.stock} low={r.isLow} />
                    </td>
                    <td className={TD}>{actions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="sm:hidden">
              {rows.map((r) => (
                <li key={r.variantId} className="border-t border-rule py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{r.productName}</span>
                    <span className="shrink-0">
                      <StockText stock={r.stock} low={r.isLow} />
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
                    Talla {r.sizeCode} · <Swatch hex={r.colorHex} /> {r.colorName} ·{" "}
                    <span className={cn(MONO, "text-xs")}>{r.sku}</span>
                  </p>
                  <div className="mt-1.5">{actions(r)}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <AdjustDialog
        row={adjust}
        onClose={() => setAdjust(null)}
        onDone={(u) => setOverrides((o) => ({ ...o, [u.variantId]: u }))}
      />
      <Sheet
        open={moves !== null}
        onClose={() => setMoves(null)}
        side="right"
        title={moves ? `Movimientos · ${moves.productName}` : "Movimientos"}
      >
        {moves && (
          <>
            <p className="mb-3 flex items-center gap-1.5 text-sm text-ink-2">
              Talla {moves.sizeCode} · <Swatch hex={moves.colorHex} /> {moves.colorName} · Stock actual{" "}
              <StockText stock={(overrides[moves.variantId] ?? moves).stock} low={(overrides[moves.variantId] ?? moves).isLow} />
            </p>
            <MovementsBody key={`${moves.variantId}-${(overrides[moves.variantId] ?? moves).stock}`} row={moves} />
          </>
        )}
      </Sheet>
    </div>
  );
}
