import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { requireUser, serverApi } from "@/lib/server-api";
import type { Order } from "@/lib/types";
import { TotalsBox } from "@/components/cart/totals-box";
import { OrderItemsList, ShippingBlock } from "@/components/orders/order-parts";
import { Button } from "@/components/ui/button";
import { Alert, PageContainer } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Pedido confirmado" };

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/pedido/${id}/confirmacion`);
  let order: Order;
  try {
    order = await serverApi<Order>(`/orders/${encodeURIComponent(id)}`, { auth: true });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
  const paid = order.status !== "pending" && order.status !== "cancelled";

  return (
    <PageContainer className="max-w-4xl py-6 sm:py-10">
      <section className="rounded-card bg-surface p-6 sm:p-8">
        {paid ? (
          <CheckCircle2 className="size-10 text-ok" aria-hidden />
        ) : (
          <Clock className="size-10 text-low" aria-hidden />
        )}
        <h1 className="mt-3 text-2xl font-semibold text-balance sm:text-3xl">
          {paid ? `¡Gracias por tu compra, ${user.fullName.split(" ")[0]}!` : "Tu pedido aún no está pagado"}
        </h1>
        <p className="mt-2 text-lg">
          Pedido <span className="tnum font-semibold">{order.number}</span>
          <span className="text-ink-2"> · {formatDate(order.createdAt)}</span>
        </p>
        {!paid && (
          <Alert tone="warning" className="mt-4">
            {order.status === "cancelled"
              ? "Este pedido fue cancelado."
              : "El pago todavía no se confirma. Puedes completarlo desde el detalle del pedido."}
          </Alert>
        )}
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="productos" className="rounded-card bg-surface p-5 sm:p-6">
          <h2 id="productos" className="mb-4 text-lg font-semibold">Productos</h2>
          <OrderItemsList items={order.items} />
        </section>
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

      {paid && (
        <section aria-labelledby="siguientes" className="mt-4 rounded-card bg-surface p-5 sm:p-6">
          <h2 id="siguientes" className="mb-3 text-lg font-semibold">Qué sigue</h2>
          <ul className="max-w-[70ch] list-disc space-y-1.5 pl-5">
            <li>El taller prepara tu sombrero y lo empaca con cuidado.</li>
            <li>Cuando salga, el estado del pedido cambia a Enviado.</li>
            <li>Sigue cada cambio en Mis pedidos.</li>
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button href={`/cuenta/pedidos/${order.id}`} size="lg">
          {paid ? "Ver mi pedido" : "Ir al detalle del pedido"}
        </Button>
        <Button href="/buscar" variant="outline" size="lg">
          Seguir comprando
        </Button>
      </div>
    </PageContainer>
  );
}
