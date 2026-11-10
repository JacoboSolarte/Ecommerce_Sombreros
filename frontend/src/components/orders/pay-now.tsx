"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export function PayNow({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ reference: string; redirectUrl: string }>(`/orders/${orderId}/pay`, {
        method: "POST",
      });
      let target = res.redirectUrl;
      try {
        const u = new URL(res.redirectUrl, window.location.origin);
        target = u.pathname + u.search;
      } catch {
        /* keep as given */
      }
      router.push(target);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };
  return (
    <div>
      {error && <Alert tone="error" className="mb-3">{error}</Alert>}
      <Button size="lg" loading={busy} onClick={pay}>
        Pagar ahora
      </Button>
    </div>
  );
}
