import { formatCOP } from "@/lib/format";
import type { Totals } from "@/lib/types";
import { cn } from "@/lib/cn";

export function TotalsBox({
  totals,
  className,
  showFreeHint = true,
}: {
  totals: Totals;
  className?: string;
  showFreeHint?: boolean;
}) {
  const missing =
    totals.freeShippingFromCop && totals.shippingCop > 0
      ? totals.freeShippingFromCop - totals.totalItemsCop
      : 0;
  return (
    <div className={className}>
      <dl className="tnum space-y-2 text-[15px]">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-2">Subtotal (sin IVA)</dt>
          <dd>{formatCOP(totals.subtotalCop)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-2">IVA (19%)</dt>
          <dd>{formatCOP(totals.taxCop)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-2">Envío</dt>
          <dd className={cn(totals.shippingCop === 0 && totals.totalItemsCop > 0 && "font-semibold text-ok")}>
            {totals.totalItemsCop === 0 ? "—" : totals.shippingCop === 0 ? "Gratis" : formatCOP(totals.shippingCop)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 bg-tile -mx-3 rounded-card px-3 py-3 text-lg font-semibold">
          <dt>Total</dt>
          <dd>{formatCOP(totals.totalCop)}</dd>
        </div>
      </dl>
      {showFreeHint && missing > 0 && (
        <p className="tnum mt-3 text-sm text-ink-2">
          Te faltan <span className="font-semibold text-ink">{formatCOP(missing)}</span> para envío gratis.
        </p>
      )}
    </div>
  );
}
