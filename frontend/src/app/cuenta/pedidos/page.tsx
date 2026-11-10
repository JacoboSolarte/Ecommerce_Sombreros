import type { Metadata } from "next";
import Link from "next/link";
import { formatCOP, formatDate } from "@/lib/format";
import { requireUser, serverApi } from "@/lib/server-api";
import type { OrderSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EmptyState, Img } from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/pill";
import { ErrorView } from "@/components/ui/error-view";

export const metadata: Metadata = { title: "Mis pedidos" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  await requireUser("/cuenta/pedidos");
  const { sort } = await searchParams;
  const dir = sort === "date_asc" ? "date_asc" : "date_desc";
  let orders: OrderSummary[];
  try {
    orders = await serverApi<OrderSummary[]>("/orders", { auth: true, query: { sort: dir } });
  } catch (e) {
    return <ErrorView title="No pudimos cargar tus pedidos" message={e instanceof Error ? e.message : undefined} />;
  }
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">Mis pedidos</h1>
        {orders.length > 1 && (
          <Link
            href={dir === "date_desc" ? "/cuenta/pedidos?sort=date_asc" : "/cuenta/pedidos"}
            className="inline-flex h-10 items-center rounded-full bg-surface px-4 text-sm font-medium hover:bg-tone"
          >
            {dir === "date_desc" ? "Más recientes primero" : "Más antiguos primero"}
          </Link>
        )}
      </div>
      {orders.length === 0 ? (
        <EmptyState title="Aún no tienes pedidos" action={<Button href="/buscar" size="lg">Ver sombreros</Button>}>
          <p>Cuando compres, tus pedidos aparecerán aquí con su estado.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/cuenta/pedidos/${o.id}`}
                className="flex items-center gap-4 rounded-card bg-surface p-4 hover:bg-white"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-[6px] bg-tile sm:size-20">
                  <Img src={o.firstItemImageUrl} alt="" sizes="80px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="tnum font-semibold">Pedido {o.number}</p>
                  <p className="text-sm text-ink-2">
                    {formatDate(o.createdAt)} · {o.itemCount} {o.itemCount === 1 ? "producto" : "productos"}
                  </p>
                  <div className="mt-1 sm:hidden">
                    <StatusPill status={o.status} />
                  </div>
                </div>
                <div className="hidden sm:block">
                  <StatusPill status={o.status} />
                </div>
                <p className="tnum text-right font-semibold">{formatCOP(o.totalCop)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
