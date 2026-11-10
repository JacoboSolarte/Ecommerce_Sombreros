"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCart } from "@/context/cart";
import { formatCOP, onlyLeft } from "@/lib/format";
import type { CartItem } from "@/lib/types";
import { Alert, EmptyState, Img, Skeleton, Swatch } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/stepper";
import { TotalsBox } from "./totals-box";

function lineIssue(item: CartItem, flag?: number): string | null {
  if (item.stock === 0 || item.availability === "out_of_stock" || flag === 0) return "Este producto se agotó. Elimínalo para continuar.";
  if (flag !== undefined && flag < item.quantity) return `${onlyLeft(flag)}. Ajusta la cantidad para continuar.`;
  if (item.quantity > item.stock) return `${onlyLeft(item.stock)}. Ajusta la cantidad para continuar.`;
  return null;
}

export function CartView() {
  const { cart, loading, setQuantity, remove, stockFlags, lineMessages } = useCart();

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="Tu carrito está vacío"
        action={<Button href="/buscar" size="lg">Ver sombreros</Button>}
      >
        <p>Agrega un sombrero y aparecerá aquí.</p>
      </EmptyState>
    );
  }

  const issues = cart.items.filter((i) => lineIssue(i, stockFlags[i.variantId]));

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-label="Productos en tu carrito">
        <ul className="space-y-2">
          {cart.items.map((item) => {
            const issue = lineIssue(item, stockFlags[item.variantId]);
            const msg = lineMessages[item.variantId];
            return (
              <li key={item.variantId} className="rounded-card bg-surface">
                <article className="grid grid-cols-[88px_1fr] gap-x-4 gap-y-3 p-4 sm:grid-cols-[112px_1fr_auto] sm:p-5">
                  <Link
                    href={`/producto/${item.slug}`}
                    className="relative block aspect-square overflow-hidden rounded-card bg-tile"
                    aria-label={`Ver ${item.name}`}
                  >
                    <Img src={item.imageUrl} alt="" sizes="112px" />
                  </Link>
                  <div className="min-w-0">
                    <h2 className="text-base font-medium">
                      <Link href={`/producto/${item.slug}`} className="hover:text-link hover:underline">
                        {item.name}
                      </Link>
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
                      <Swatch hex={item.colorHex} /> {item.colorName} <span aria-hidden>·</span> Talla {item.sizeCode}
                    </p>
                    <p className="tnum mt-1 text-sm text-ink-2">{formatCOP(item.unitPriceCop)} c/u</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <QuantityStepper
                        value={item.quantity}
                        max={Math.max(1, item.stock)}
                        disabled={item.stock === 0}
                        onChange={(q) => setQuantity(item, q)}
                        label={`Cantidad de ${item.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-link hover:bg-tone"
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Eliminar<span className="sr-only"> {item.name}</span>
                      </button>
                    </div>
                  </div>
                  <p className="tnum col-span-2 text-lg font-semibold sm:col-span-1 sm:text-right">
                    <span className="sr-only">Total de la línea: </span>
                    {formatCOP(item.lineTotalCop)}
                  </p>
                  {(issue || msg) && (
                    <div className="col-span-2 sm:col-span-3">
                      <Alert tone={issue ? "warning" : "error"}>{issue ?? msg}</Alert>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      <aside aria-labelledby="resumen" className="rounded-card bg-surface p-5 lg:sticky lg:top-28">
        <h2 id="resumen" className="mb-4 text-lg font-semibold">
          Resumen del pedido
        </h2>
        <p className="tnum mb-3 text-sm text-ink-2">
          {cart.itemCount} {cart.itemCount === 1 ? "producto" : "productos"}
        </p>
        <TotalsBox totals={cart.totals} />
        {issues.length > 0 && (
          <Alert tone="warning" className="mt-4">
            Revisa los productos marcados antes de continuar.
          </Alert>
        )}
        <div className="mt-5">
          {issues.length > 0 ? (
            <Button full size="lg" disabled>
              Continuar compra
            </Button>
          ) : (
            <Button href="/checkout" full size="lg">
              Continuar compra
            </Button>
          )}
        </div>
        <p className="mt-3 text-center text-sm">
          <Link href="/buscar" className="font-medium text-link hover:underline">
            Seguir comprando
          </Link>
        </p>
      </aside>
    </div>
  );
}
