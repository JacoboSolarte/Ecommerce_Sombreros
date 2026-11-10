import Link from "next/link";
import { formatCOP, formatDateTime, PAYMENT_LABELS, STATUS_LABELS } from "@/lib/format";
import type { Order, OrderHistoryEntry } from "@/lib/types";
import { Img } from "@/components/ui/misc";
import { PaymentPill } from "@/components/ui/pill";

export function OrderItemsList({ items }: { items: Order["items"] }) {
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-card bg-tile">
            <Img src={it.imageUrl} alt="" sizes="80px" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-medium">
              <Link href={`/producto/${it.productSlug}`} className="hover:text-link hover:underline">
                {it.productName}
              </Link>
            </p>
            <p className="text-sm text-ink-2">
              {it.colorName} · Talla {it.sizeCode}
            </p>
            <p className="tnum text-sm text-ink-2">
              {it.quantity} × {formatCOP(it.unitPriceCop)}
            </p>
          </div>
          <p className="tnum font-semibold">{formatCOP(it.lineTotalCop)}</p>
        </li>
      ))}
    </ul>
  );
}

export function ShippingBlock({ shipping: s }: { shipping: Order["shipping"] }) {
  return (
    <address className="text-[15px] not-italic">
      {s.fullName}
      <br />
      {s.addressLine}
      {s.addressExtra ? `, ${s.addressExtra}` : ""}
      <br />
      {s.city}, {s.department} · {s.postalCode}
      <br />
      Tel. {s.phone}
      {s.notes && (
        <>
          <br />
          <span className="text-ink-2">Indicaciones: {s.notes}</span>
        </>
      )}
    </address>
  );
}

export function StatusTimeline({ history }: { history: OrderHistoryEntry[] }) {
  const sorted = [...history].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <ol className="space-y-4">
      {sorted.map((h, i) => {
        const last = i === sorted.length - 1;
        return (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden
              className={`mt-1.5 size-3 shrink-0 rounded-full ${last ? "bg-shell" : "bg-field"}`}
            />
            <div>
              <p className={last ? "font-semibold" : "text-ink-2"}>{STATUS_LABELS[h.toStatus]}</p>
              <p className="text-sm text-ink-2">{formatDateTime(h.createdAt)}</p>
              {h.note && <p className="text-sm">{h.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PaymentsList({ payments }: { payments: Order["payments"] }) {
  if (!payments.length) return <p className="text-ink-2">Todavía no hay intentos de pago.</p>;
  return (
    <ul className="space-y-2">
      {[...payments]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((p) => (
          <li key={p.reference} className="flex flex-wrap items-center justify-between gap-2 text-[15px]">
            <span>
              <span className="tnum font-medium">{p.reference}</span>
              <span className="block text-sm text-ink-2">{formatDateTime(p.createdAt)}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="tnum">{formatCOP(p.amountCop)}</span>
              <PaymentPill status={p.status} />
              <span className="sr-only">{PAYMENT_LABELS[p.status]}</span>
            </span>
          </li>
        ))}
    </ul>
  );
}
