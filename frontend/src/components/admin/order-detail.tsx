"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api, errorMessage, isApiError } from "@/lib/api";
import { formatCOP, formatDateTime } from "@/lib/format";
import type { AdminOrder, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Img, Skeleton } from "@/components/ui/misc";
import { PaymentPill, StatusPill } from "@/components/ui/pill";
import { Alert } from "@/components/ui/misc";
import { Textarea } from "@/components/ui/field";
import { useToast } from "./toast";
import { useApi } from "./use-api";
import { BlockError, MONO, TD, TD_R, TH, TH_R } from "./ui";

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  preparing: "Marcar como preparando",
  shipped: "Marcar como enviado",
  delivered: "Marcar como entregado",
  cancelled: "Cancelar pedido",
};

const DONE_TOAST: Partial<Record<OrderStatus, string>> = {
  preparing: "Pedido marcado como preparando.",
  shipped: "Pedido marcado como enviado.",
  delivered: "Pedido marcado como entregado.",
  cancelled: "Pedido cancelado.",
};

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card border border-edge p-4", className)}>
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 py-1 text-sm">
      <dt className="text-ink-2">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden className="grid gap-4">
      <span className="sr-only" role="status">
        Cargando pedido…
      </span>
      <Skeleton className="h-24" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data: order, error, loading, reload } = useApi<AdminOrder>(`/admin/orders/${encodeURIComponent(id)}`);
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState("");

  async function change(status: OrderStatus, noteText?: string) {
    setBusy(status);
    setProblem(null);
    try {
      await api(`/admin/orders/${encodeURIComponent(id)}/status`, {
        method: "POST",
        body: { status, ...(noteText?.trim() ? { note: noteText.trim() } : {}) },
      });
      toast(DONE_TOAST[status] ?? "Estado actualizado.");
      setCancelOpen(false);
      setNote("");
      reload();
      router.refresh();
    } catch (e) {
      setCancelOpen(false);
      if (isApiError(e) && e.code === "INVALID_TRANSITION") {
        setProblem(`${e.message} El pedido cambió mientras lo mirabas; mostramos su estado actual.`);
        reload();
      } else {
        setProblem(errorMessage(e));
      }
    } finally {
      setBusy(null);
    }
  }

  if (error && !order) {
    return (
      <div>
        <BackLink />
        <BlockError error={error} onRetry={reload} what="el pedido" />
      </div>
    );
  }
  if (loading || !order) {
    return (
      <div>
        <BackLink />
        <DetailSkeleton />
      </div>
    );
  }

  const actions = order.allowedTransitions.filter((s) => ACTION_LABEL[s]);
  const forward = actions.filter((s) => s !== "cancelled");
  const canCancel = actions.includes("cancelled");
  const t = order.totals;
  const sh = order.shipping;
  const history = [...order.history].reverse();

  return (
    <div>
      <BackLink />

      <header className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-4 rounded-card border border-edge p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="tnum text-lg font-semibold">{order.number}</h1>
            <StatusPill status={order.status} />
          </div>
          <p className="mt-1 text-sm text-ink-2">
            {formatDateTime(order.createdAt)} · {order.customer.fullName} · {order.customer.email}
          </p>
        </div>
        {(forward.length > 0 || canCancel) && (
          <div className="flex flex-wrap items-center gap-2">
            {forward.map((s, i) => (
              <Button
                key={s}
                size="sm"
                variant={i === 0 ? "secondary" : "outline"}
                loading={busy === s}
                disabled={busy !== null}
                onClick={() => change(s)}
              >
                {ACTION_LABEL[s]}
              </Button>
            ))}
            {canCancel && (
              <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => setCancelOpen(true)}>
                Cancelar pedido
              </Button>
            )}
          </div>
        )}
      </header>

      {problem && (
        <Alert tone="error" className="mb-4">
          {problem}
        </Alert>
      )}
      {actions.length === 0 && (
        <p className="mb-4 text-sm text-ink-2">
          {order.status === "pending"
            ? "Este pedido espera el pago del cliente; pasa a Pagado cuando el pago sea aprobado."
            : "Este pedido ya no admite cambios de estado."}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-4">
          <Section title="Artículos">
            <table className="w-full">
              <caption className="sr-only">Artículos del pedido {order.number}</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Producto
                  </th>
                  <th scope="col" className={cn(TH_R, "hidden sm:table-cell")}>
                    Precio
                  </th>
                  <th scope="col" className={TH_R}>
                    Cant.
                  </th>
                  <th scope="col" className={TH_R}>
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={`${it.productSlug}-${it.sizeCode}-${it.colorName}-${i}`} className="border-t border-rule">
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-field bg-tone">
                          <Img src={it.imageUrl} alt="" sizes="48px" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium">{it.productName}</span>
                          <span className="block text-xs text-ink-2">
                            Talla {it.sizeCode} · {it.colorName}
                            <span className="sm:hidden tnum"> · {formatCOP(it.unitPriceCop)}</span>
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className={cn(TD_R, "hidden whitespace-nowrap sm:table-cell")}>{formatCOP(it.unitPriceCop)}</td>
                    <td className={TD_R}>{it.quantity}</td>
                    <td className={cn(TD_R, "whitespace-nowrap")}>{formatCOP(it.lineTotalCop)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="tnum mt-3 ml-auto grid max-w-xs gap-1 border-t border-rule pt-3 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-ink-2">Subtotal</dt>
                <dd>{formatCOP(t.subtotalCop)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-ink-2">IVA incluido</dt>
                <dd>{formatCOP(t.taxCop)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-ink-2">Envío</dt>
                <dd>{t.shippingCop === 0 ? "Gratis" : formatCOP(t.shippingCop)}</dd>
              </div>
              <div className="flex justify-between gap-6 border-t border-edge pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatCOP(t.totalCop)}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Pagos">
            {order.payments.length === 0 ? (
              <p className="text-sm text-ink-2">Este pedido no tiene intentos de pago.</p>
            ) : (
              <table className="w-full">
                <caption className="sr-only">Pagos del pedido</caption>
                <thead>
                  <tr>
                    <th scope="col" className={TH}>
                      Referencia
                    </th>
                    <th scope="col" className={TH}>
                      Fecha
                    </th>
                    <th scope="col" className={TH_R}>
                      Monto
                    </th>
                    <th scope="col" className={TH}>
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.payments.map((p) => (
                    <tr key={p.reference} className="border-t border-rule">
                      <td className={cn(TD, MONO, "text-xs break-all")}>{p.reference}</td>
                      <td className={cn(TD, "tnum whitespace-nowrap")}>{formatDateTime(p.createdAt)}</td>
                      <td className={cn(TD_R, "whitespace-nowrap")}>{formatCOP(p.amountCop)}</td>
                      <td className={TD}>
                        <PaymentPill status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>

        <div className="grid gap-4">
          <Section title="Cliente y envío">
            <dl>
              <Detail label="Cliente">
                {order.customer.fullName}
                <br />
                <a className="text-link hover:underline" href={`mailto:${order.customer.email}`}>
                  {order.customer.email}
                </a>
              </Detail>
              <Detail label="Teléfono">{sh.phone || order.customer.phone || "–"}</Detail>
              <Detail label="Recibe">{sh.fullName}</Detail>
              <Detail label="Dirección">
                {sh.addressLine}
                {sh.addressExtra ? `, ${sh.addressExtra}` : ""}
              </Detail>
              <Detail label="Ciudad">
                {sh.city}, {sh.department}
              </Detail>
              <Detail label="Código postal">
                <span className="tnum">{sh.postalCode}</span>
              </Detail>
              {sh.notes && <Detail label="Indicaciones">{sh.notes}</Detail>}
            </dl>
          </Section>

          <Section title="Historial de estados">
            <ol className="relative">
              {history.map((h, i) => (
                <li key={`${h.createdAt}-${i}`} className="relative pb-4 pl-5 last:pb-0">
                  <span
                    aria-hidden
                    className={cn("absolute top-1.5 left-0 size-2 rounded-full", i === 0 ? "bg-chart" : "bg-field")}
                  />
                  {i < history.length - 1 && (
                    <span aria-hidden className="absolute top-4 bottom-0 left-[3px] w-px bg-edge" />
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={h.toStatus} />
                    <span className="tnum text-xs text-ink-2">{formatDateTime(h.createdAt)}</span>
                  </div>
                  {h.note && <p className="mt-1 text-sm">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>

      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="¿Cancelar este pedido?"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCancelOpen(false)}>
              Volver
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={busy === "cancelled"}
              onClick={() => change("cancelled", note)}
            >
              Cancelar pedido
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-2">
          El pedido {order.number} pasará a Cancelado.
          {order.status === "paid" || order.status === "preparing"
            ? " Como ya estaba pagado, las unidades vuelven al inventario."
            : ""}{" "}
          Esta acción no se puede deshacer.
        </p>
        <Textarea
          label="Nota (opcional)"
          hint="Queda en el historial del pedido."
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          wrapperClassName="mt-4"
          className="text-sm"
        />
      </Dialog>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/pedidos"
      className="mb-3 inline-flex items-center gap-1.5 text-sm text-link hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden /> Pedidos
    </Link>
  );
}
