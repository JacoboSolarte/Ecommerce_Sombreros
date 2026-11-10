"use client";

import { Check } from "lucide-react";
import { useCart } from "@/context/cart";
import { formatCOP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Img, Swatch } from "@/components/ui/misc";

/** Confirmation shown after "Agregar al carrito". */
export function AddedSheet() {
  const { lastAdded, dismissLastAdded, count, cart } = useCart();
  return (
    <Dialog
      open={!!lastAdded}
      onClose={dismissLastAdded}
      title="Agregado al carrito"
      side="right"
      footer={
        <div className="flex flex-col gap-2">
          <Button href="/carrito" size="lg" full onClick={dismissLastAdded}>
            Ir al carrito
          </Button>
          <Button variant="outline" size="lg" full onClick={dismissLastAdded}>
            Seguir comprando
          </Button>
        </div>
      }
    >
      {lastAdded && (
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-ok">
            <Check className="size-4" aria-hidden /> Listo, ya está en tu carrito
          </p>
          <div className="mt-4 flex gap-3">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-card bg-tile">
              <Img src={lastAdded.imageUrl} alt={lastAdded.name} sizes="96px" />
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 font-medium">{lastAdded.name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink-2">
                <Swatch hex={lastAdded.colorHex} /> {lastAdded.colorName} · Talla {lastAdded.sizeCode}
              </p>
              <p className="tnum mt-1 text-sm text-ink-2">
                {lastAdded.quantity} {lastAdded.quantity === 1 ? "unidad" : "unidades"} ·{" "}
                <span className="font-semibold text-ink">{formatCOP(lastAdded.unitPriceCop)}</span>
              </p>
            </div>
          </div>
          <p className="tnum mt-6 flex justify-between rounded-card bg-tile p-3 text-sm">
            <span>
              Tu carrito ({count} {count === 1 ? "producto" : "productos"})
            </span>
            <span className="font-semibold">{formatCOP(cart.totals.totalItemsCop)}</span>
          </p>
        </div>
      )}
    </Dialog>
  );
}
