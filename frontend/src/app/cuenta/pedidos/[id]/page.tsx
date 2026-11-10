import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { requireUser, serverApi } from "@/lib/server-api";
import type { Order } from "@/lib/types";
import { TotalsBox } from "@/components/cart/totals-box";
import { OrderItemsList, PaymentsList, ShippingBlock, StatusTimeline } from "@/components/orders/order-parts";
import { PayNow } from "@/components/orders/pay-now";
import { Breadcrumb } from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/pill";

export const metadata: Metadata = { title: "Detalle del pedido" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/cuenta/pedidos/${id}`);
  let order: Order;
  try {
    order = await serverApi<Order>(`/orders/${encodeURIComponent(id)}`, { auth: true });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Mi cuenta", href: "/cuenta" },
          { label: "Mis pedidos", href: "/cuenta/pedidos" },
          { label: order.number },
        ]}
      />
      <div className="mt-3 mb-4 flex flex-wrap items-center gap-3">
        <h1 className="tnum text-2xl font-semibold sm:text-3xl">Pedido {order.number}</h1>
        <StatusPill status={order.status} />
      </div>
      <p className="mb-4 text-ink-2">Hecho el {formatDateTime(order.createdAt)}</p>

      {order.status === "pending" && (
        <section aria-labelledby="pagar" className="mb-4 rounded-card bg-low-bg p-5">
          <h2 id="pagar" className="text-lg font-semibold text-[#5e3700]">Este pedido está pendiente de pago</h2>
          <p className="mt-1 mb-4 text-[#5e3700]">Completa el pago para que lo preparemos.</p>
          <PayNow orderId={order.id} />
        </section>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <section aria-labelledby="items" className="rounded-card bg-surface p-5 sm:p-6">
            <h2 id="items" className="mb-4 text-lg font-semibold">Productos</h2>
            <OrderItemsList items={order.items} />
          </section>
          <section aria-labelledby="estado" className="rounded-card bg-surface p-5 sm:p-6">
            <h2 id="estado" className="mb-4 text-lg font-semibold">Estado del pedido</h2>
            <StatusTimeline history={order.history} />
          </section>
          <section aria-labelledby="pagos" className="rounded-card bg-surface p-5 sm:p-6">
            <h2 id="pagos" className="mb-4 text-lg font-semibold">Pagos</h2>
            <PaymentsList payments={order.payments} />
          </section>
        </div>
        <div className="space-y-4">
          <section aria-labelledby="totales" className="rounded-card bg-surface p-5">
            <h2 id="totales" className="mb-3 text-lg font-semibold">Total</h2>
            <TotalsBox totals={order.totals} showFreeHint={false} />
          </section>
          <section aria-labelledby="envio" className="rounded-card bg-surface p-5">
            <h2 id="envio" className="mb-2 text-lg font-semibold">Dirección de envío</h2>
            <ShippingBlock shipping={order.shipping} />
          </section>
        </div>
      </div>
    </>
  );
}
