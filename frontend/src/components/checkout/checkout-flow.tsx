"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useCart } from "@/context/cart";
import { api, errorMessage, fieldErrors, isApiError } from "@/lib/api";
import { CITY_KEY, DEPARTMENTS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatCOP } from "@/lib/format";
import { setLocalValue } from "@/lib/use-local-value";
import type { CheckoutResult, ShippingInput } from "@/lib/types";
import { TotalsBox } from "@/components/cart/totals-box";
import { Alert, EmptyState, Img, Skeleton, Swatch } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";

type Form = Required<ShippingInput>;
const EMPTY: Form = {
  fullName: "",
  phone: "",
  addressLine: "",
  addressExtra: "",
  city: "",
  department: "",
  postalCode: "",
  notes: "",
};

export function validateShipping(f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {};
  if (f.fullName.trim().length < 3) e.fullName = "Escribe el nombre completo de quien recibe.";
  const phone = f.phone.replace(/[\s-]/g, "");
  if (!phone) e.phone = "Escribe un teléfono de contacto.";
  else if (!/^(3\d{9}|\d{7,10})$/.test(phone))
    e.phone = "Usa un celular de 10 dígitos que empiece por 3, o un fijo de 7 a 10 dígitos.";
  if (f.addressLine.trim().length < 5) e.addressLine = "Escribe la dirección, por ejemplo Calle 10 # 5-20.";
  if (!f.department) e.department = "Elige el departamento.";
  if (f.city.trim().length < 2) e.city = "Escribe la ciudad o el municipio.";
  if (!/^\d{6}$/.test(f.postalCode.trim())) e.postalCode = "El código postal tiene 6 dígitos.";
  return e;
}

/** Turns an absolute redirect URL into an in-app path when it points to this site. */
function toPath(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin || u.hostname === "localhost" ? u.pathname + u.search : url;
  } catch {
    return url;
  }
}

export function CheckoutFlow() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, loading, refresh, setStockFlags } = useCart();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<Form>({
    ...EMPTY,
    fullName: user?.fullName ?? "",
    phone: user?.phone ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const go = (s: 1 | 2) => {
    setStep(s);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="Tu carrito está vacío"
        action={<Button href="/buscar" size="lg">Ver sombreros</Button>}
      >
        <p>Agrega un sombrero para continuar con la compra.</p>
      </EmptyState>
    );
  }

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateShipping(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(`ship-${first}`)?.focus();
      return;
    }
    go(2);
  };

  const pay = async () => {
    setBusy(true);
    setFormError("");
    const shipping: ShippingInput = {
      fullName: form.fullName.trim(),
      phone: form.phone.replace(/[\s-]/g, ""),
      addressLine: form.addressLine.trim(),
      addressExtra: form.addressExtra.trim() || undefined,
      city: form.city.trim(),
      department: form.department,
      postalCode: form.postalCode.trim(),
      notes: form.notes.trim() || undefined,
    };
    try {
      const res = await api<CheckoutResult>("/checkout", { method: "POST", body: { shipping } });
      setLocalValue(CITY_KEY, shipping.city);
      void refresh();
      router.push(toPath(res.payment.redirectUrl));
    } catch (e) {
      setBusy(false);
      if (isApiError(e) && e.code === "OUT_OF_STOCK") {
        const items = (e.details as { items?: { variantId: number; available: number }[] } | null)?.items ?? [];
        setStockFlags(Object.fromEntries(items.map((i) => [i.variantId, i.available])));
        await refresh();
        router.push("/carrito");
        return;
      }
      if (isApiError(e) && e.code === "CART_EMPTY") {
        await refresh();
        router.push("/carrito");
        return;
      }
      if (isApiError(e) && (e.code === "VALIDATION_ERROR" || e.status === 422)) {
        const fe = fieldErrors(e) as Partial<Record<keyof Form, string>>;
        if (Object.keys(fe).length) {
          setErrors(fe);
          go(1);
        }
        setFormError(e.message);
        return;
      }
      setFormError(errorMessage(e));
    }
  };

  const stepLabel = (n: 1 | 2, label: string) => (
    <li
      aria-current={step === n ? "step" : undefined}
      className={cn(
        "rounded-full px-4 py-1.5 text-[15px] font-medium",
        step === n ? "bg-shell text-white" : "bg-tone text-ink-2",
      )}
    >
      {label}
    </li>
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="rounded-card bg-surface p-5 sm:p-8">
        <ol className="mb-6 flex gap-2" aria-label="Pasos de la compra">
          {stepLabel(1, "Envío")}
          {stepLabel(2, "Resumen y pago")}
        </ol>

        {step === 1 ? (
          <form onSubmit={next} noValidate>
            <h2 ref={headingRef} tabIndex={-1} className="mb-4 text-xl font-semibold outline-none">
              ¿A dónde enviamos tu pedido?
            </h2>
            {formError && <Alert tone="error" className="mb-4">{formError}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="ship-fullName" label="Nombre completo de quien recibe" autoComplete="name" value={form.fullName} onChange={set("fullName")} error={errors.fullName} required wrapperClassName="sm:col-span-2" />
              <Input id="ship-phone" label="Teléfono de contacto" type="tel" inputMode="tel" autoComplete="tel-national" value={form.phone} onChange={set("phone")} error={errors.phone} hint="Celular de 10 dígitos, por ejemplo 3001234567." required />
              <Select id="ship-department" label="Departamento" autoComplete="address-level1" value={form.department} onChange={set("department")} error={errors.department} required>
                <option value="">Elige uno</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
              <Input id="ship-city" label="Ciudad o municipio" autoComplete="address-level2" value={form.city} onChange={set("city")} error={errors.city} required />
              <Input id="ship-postalCode" label="Código postal" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={form.postalCode} onChange={set("postalCode")} error={errors.postalCode} hint="6 dígitos." required />
              <Input id="ship-addressLine" label="Dirección" autoComplete="address-line1" value={form.addressLine} onChange={set("addressLine")} error={errors.addressLine} hint="Calle, carrera y número." required wrapperClassName="sm:col-span-2" />
              <Input id="ship-addressExtra" label="Apartamento, torre, barrio (opcional)" autoComplete="address-line2" value={form.addressExtra} onChange={set("addressExtra")} error={errors.addressExtra} wrapperClassName="sm:col-span-2" />
              <Textarea id="ship-notes" label="Indicaciones para la entrega (opcional)" value={form.notes} onChange={set("notes")} error={errors.notes} rows={3} wrapperClassName="sm:col-span-2" />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <Link href="/carrito" className="inline-flex items-center gap-1 font-medium text-link hover:underline">
                <ArrowLeft className="size-4" aria-hidden /> Volver al carrito
              </Link>
              <Button type="submit" size="lg">Continuar al resumen</Button>
            </div>
          </form>
        ) : (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="mb-4 text-xl font-semibold outline-none">
              Revisa tu pedido
            </h2>
            {formError && <Alert tone="error" className="mb-4">{formError}</Alert>}

            <section aria-labelledby="sum-addr" className="rounded-card bg-tile p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 id="sum-addr" className="font-semibold">Dirección de envío</h3>
                <button type="button" onClick={() => go(1)} className="text-sm font-medium text-link hover:underline">
                  Editar<span className="sr-only"> dirección de envío</span>
                </button>
              </div>
              <address className="mt-1 text-[15px] not-italic">
                {form.fullName}
                <br />
                {form.addressLine}
                {form.addressExtra && <>, {form.addressExtra}</>}
                <br />
                {form.city}, {form.department} · {form.postalCode}
                <br />
                Tel. {form.phone}
                {form.notes && (
                  <>
                    <br />
                    <span className="text-ink-2">Indicaciones: {form.notes}</span>
                  </>
                )}
              </address>
            </section>

            <section aria-labelledby="sum-items" className="mt-4 rounded-card bg-tile p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 id="sum-items" className="font-semibold">Productos ({cart.itemCount})</h3>
                <Link href="/carrito" className="text-sm font-medium text-link hover:underline">
                  Editar<span className="sr-only"> productos</span>
                </Link>
              </div>
              <ul className="mt-3 space-y-3">
                {cart.items.map((i) => (
                  <li key={i.variantId} className="flex gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-[6px] bg-surface">
                      <Img src={i.imageUrl} alt="" sizes="64px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[15px] font-medium">{i.name}</p>
                      <p className="flex items-center gap-1.5 text-sm text-ink-2">
                        <Swatch hex={i.colorHex} /> {i.colorName} · Talla {i.sizeCode} · {i.quantity} {i.quantity === 1 ? "unidad" : "unidades"}
                      </p>
                    </div>
                    <p className="tnum text-[15px] font-semibold">{formatCOP(i.lineTotalCop)}</p>
                  </li>
                ))}
              </ul>
            </section>

            <p className="mt-4 text-sm text-ink-2">
              Al confirmar te llevamos a la pasarela de pagos. En este entorno de pruebas no se pide ningún dato de tarjeta.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => go(1)} className="inline-flex items-center gap-1 font-medium text-link hover:underline">
                <ArrowLeft className="size-4" aria-hidden /> Volver al envío
              </button>
              <Button size="lg" loading={busy} onClick={pay}>
                Confirmar y pagar {formatCOP(cart.totals.totalCop)}
              </Button>
            </div>
          </div>
        )}
      </div>

      <aside aria-labelledby="co-resumen" className="rounded-card bg-surface p-5 lg:sticky lg:top-28">
        <h2 id="co-resumen" className="mb-4 text-lg font-semibold">Resumen</h2>
        <TotalsBox totals={cart.totals} />
      </aside>
    </div>
  );
}
