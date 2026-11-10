"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useCart } from "@/context/cart";
import { formatCOP } from "@/lib/format";
import type { PaymentInfo, PaymentStatus, SimulateResult } from "@/lib/types";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

type Outcome = "approved" | "declined" | "failed";

function toPath(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export function PaymentSimulator({ info }: { info: PaymentInfo }) {
  const router = useRouter();
  const { refresh } = useCart();
  const [busy, setBusy] = useState<Outcome | "retry" | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ status: PaymentStatus; message?: string } | null>(null);

  const settled = info.status !== "pending";

  const simulate = async (outcome: Outcome) => {
    setBusy(outcome);
    setError("");
    try {
      const res = await api<SimulateResult>(`/payments/${encodeURIComponent(info.reference)}/simulate`, {
        method: "POST",
        body: { outcome },
      });
      const status = res.payment.status;
      if (status === "approved") {
        void refresh();
        router.push(`/pedido/${info.orderId}/confirmacion`);
        return;
      }
      if (res.order.status === "cancelled") {
        setResult({ status: "failed", message: "El pedido se canceló porque ya no había stock al confirmar el pago." });
      } else {
        setResult({ status });
      }
      setBusy(null);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  };

  const retry = async () => {
    setBusy("retry");
    setError("");
    try {
      const res = await api<{ reference: string; redirectUrl: string }>(`/orders/${info.orderId}/pay`, {
        method: "POST",
      });
      router.push(toPath(res.redirectUrl));
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  };

  const status = result?.status ?? (settled ? info.status : null);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:py-14">
      <div className="rounded-card bg-surface p-6 sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-info-bg px-3 py-1 text-sm font-medium text-[#124666]">
          <FlaskConical className="size-4" aria-hidden /> Entorno de pruebas
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-balance">Pasarela de pagos simulada (entorno de pruebas)</h1>
        <p className="mt-2 text-ink-2">
          Aquí no se cobra nada ni se piden datos de tarjeta. Elige qué resultado quieres simular para este pago.
        </p>

        <dl className="tnum mt-6 grid grid-cols-2 gap-4 rounded-card bg-tile p-4">
          <div>
            <dt className="text-sm text-ink-2">Pedido</dt>
            <dd className="text-lg font-semibold">{info.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-2">Valor a pagar</dt>
            <dd className="text-lg font-semibold">{formatCOP(info.amountCop)}</dd>
          </div>
        </dl>

        {error && <Alert tone="error" className="mt-4">{error}</Alert>}

        {status === "approved" && (
          <div className="mt-6">
            <Alert tone="success" title="Este pago ya fue aprobado.">
              Tu pedido {info.orderNumber} está confirmado.
            </Alert>
            <Button href={`/pedido/${info.orderId}/confirmacion`} full size="lg" className="mt-4">
              Ver confirmación
            </Button>
          </div>
        )}

        {(status === "declined" || status === "failed") && (
          <div className="mt-6">
            <Alert tone="error" title={status === "declined" ? "Pago rechazado" : "El pago falló"}>
              {result?.message ??
                (status === "declined"
                  ? "La pasarela rechazó el pago. Tu pedido sigue pendiente y puedes intentarlo de nuevo."
                  : "Hubo un fallo al procesar el pago. Tu pedido sigue pendiente y puedes intentarlo de nuevo.")}
            </Alert>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {!result?.message && (
                <Button size="lg" full loading={busy === "retry"} onClick={retry}>
                  Intentar de nuevo
                </Button>
              )}
              <Button href={`/cuenta/pedidos/${info.orderId}`} variant="outline" size="lg" full>
                Ver mi pedido
              </Button>
            </div>
          </div>
        )}

        {status === null && (
          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" full loading={busy === "approved"} disabled={busy !== null} onClick={() => simulate("approved")}>
              Aprobar pago
            </Button>
            <Button variant="outline" size="lg" full loading={busy === "declined"} disabled={busy !== null} onClick={() => simulate("declined")}>
              Rechazar pago
            </Button>
            <Button variant="outline" size="lg" full loading={busy === "failed"} disabled={busy !== null} onClick={() => simulate("failed")}>
              Simular fallo
            </Button>
            <p className="mt-2 text-center text-sm">
              <Link href={`/cuenta/pedidos/${info.orderId}`} className="font-medium text-link hover:underline">
                Pagar después y ver mi pedido
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
