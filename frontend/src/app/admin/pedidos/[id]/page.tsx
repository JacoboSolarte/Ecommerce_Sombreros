import type { Metadata } from "next";
import { OrderDetail } from "@/components/admin/order-detail";

export const metadata: Metadata = { title: "Pedido" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
