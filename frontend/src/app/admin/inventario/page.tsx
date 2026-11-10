import type { Metadata } from "next";
import { InventoryView } from "@/components/admin/inventory-view";

export const metadata: Metadata = { title: "Inventario" };

export default function AdminInventoryPage() {
  return <InventoryView />;
}
