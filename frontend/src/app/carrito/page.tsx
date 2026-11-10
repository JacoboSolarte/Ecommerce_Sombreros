import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { PageContainer } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Carrito" };

export default function CartPage() {
  return (
    <PageContainer className="py-4 sm:py-6">
      <h1 className="mb-4 text-2xl font-semibold sm:text-3xl">Tu carrito</h1>
      <CartView />
    </PageContainer>
  );
}
