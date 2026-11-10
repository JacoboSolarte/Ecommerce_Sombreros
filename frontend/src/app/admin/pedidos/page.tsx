import type { Metadata } from "next";
import { OrdersList } from "@/components/admin/orders-list";

export const metadata: Metadata = { title: "Pedidos" };

export default function AdminOrdersPage() {
  return <OrdersList />;
}
