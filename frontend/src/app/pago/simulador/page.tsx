import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentSimulator } from "@/components/payment/simulator";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { PaymentInfo } from "@/lib/types";
import { requireUser } from "@/lib/server-api";

export const metadata: Metadata = { title: "Pasarela de pagos simulada" };

export default async function SimulatorPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  if (!ref) notFound();
  await requireUser(`/pago/simulador?ref=${encodeURIComponent(ref)}`);
  let info: PaymentInfo;
  try {
    info = await serverApi<PaymentInfo>(`/payments/${encodeURIComponent(ref)}`, { auth: true });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }
  // key: a retry creates a new reference and must reset the client state
  return <PaymentSimulator key={info.reference} info={info} />;
}
