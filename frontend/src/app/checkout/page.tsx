import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { PageContainer } from "@/components/ui/misc";
import { requireUser } from "@/lib/server-api";

export const metadata: Metadata = { title: "Finalizar compra" };

export default async function CheckoutPage() {
  await requireUser("/checkout");
  return (
    <PageContainer className="py-4 sm:py-6">
      <h1 className="mb-4 text-2xl font-semibold sm:text-3xl">Finalizar compra</h1>
      <CheckoutFlow />
    </PageContainer>
  );
}
