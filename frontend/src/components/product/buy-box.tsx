"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Truck } from "lucide-react";
import { useCart } from "@/context/cart";
import { cn } from "@/lib/cn";
import { deliveryText, onlyLeft } from "@/lib/format";
import type { ProductDetail } from "@/lib/types";
import { Alert, Swatch } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { AvailabilityText } from "@/components/ui/pill";
import { PriceBlock } from "@/components/ui/price";
import { QuantityStepper } from "@/components/ui/stepper";
import { matchSize, SizeCalculator } from "./size-calculator";

const STICKY_BAR =
  "fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 bg-surface px-4 py-3 shadow-[0_-4px_16px_rgb(0_0_0/0.12)] lg:hidden"; // taste-skill-ignore

interface Props {
  product: ProductDetail;
  initialColor?: string;
  initialSize?: string;
}

export function BuyBox({ product: p, initialColor, initialSize }: Props) {
  const { add, dismissLastAdded } = useCart();
  const router = useRouter();

  const colors = useMemo(() => {
    const map = new Map<number, { id: number; name: string; hex: string; stock: number }>();
    for (const v of p.variants) {
      const c = map.get(v.colorId) ?? { id: v.colorId, name: v.colorName, hex: v.colorHex, stock: 0 };
      c.stock += v.stock;
      map.set(v.colorId, c);
    }
    return [...map.values()];
  }, [p.variants]);

  const [colorId, setColorId] = useState<number>(() => {
    const fromUrl = colors.find((c) => String(c.id) === initialColor);
    return (fromUrl ?? colors.find((c) => c.stock > 0) ?? colors[0])?.id ?? 0;
  });
  const [sizeCode, setSizeCode] = useState<string | null>(() =>
    p.sizes.some((s) => s.code === initialSize) ? (initialSize as string) : null,
  );
  const [qty, setQty] = useState(1);
  const [cm, setCm] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: "error" | "warning"; text: string } | null>(null);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);
  const sizeRef = useRef<HTMLDivElement>(null);

  const stockOf = useCallback(
    (size: string, color = colorId) =>
      p.variants.find((v) => v.sizeCode === size && v.colorId === color)?.stock ?? 0,
    [p.variants, colorId],
  );
  const variant = sizeCode
    ? (p.variants.find((v) => v.sizeCode === sizeCode && v.colorId === colorId) ?? null)
    : null;
  const color = colors.find((c) => c.id === colorId);
  const maxQty = variant ? Math.max(1, variant.stock) : 1;
  const qtyShown = Math.min(qty, maxQty);

  const syncUrl = (c: number, s: string | null) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set("color", String(c));
    if (s) sp.set("size", s);
    else sp.delete("size");
    window.history.replaceState(null, "", `${window.location.pathname}?${sp.toString()}`);
  };

  const pickColor = (id: number) => {
    setColorId(id);
    setNotice(null);
    // keep the size only if it still has stock in the new color
    const keep = sizeCode && stockOf(sizeCode, id) > 0 ? sizeCode : null;
    setSizeCode(keep);
    setQty(1);
    syncUrl(id, keep);
  };
  const pickSize = (code: string) => {
    setSizeCode(code);
    setNotice(null);
    setQty(1);
    syncUrl(colorId, code);
  };

  const suggested = matchSize(cm, p.sizes);
  const onCm = (value: number | null) => {
    setCm(value);
    const m = matchSize(value, p.sizes);
    if (m && stockOf(m.code) > 0) pickSize(m.code);
  };

  let resultText = "Escribe tu medida o mueve el deslizador.";
  if (cm !== null) {
    const first = p.sizes[0];
    const last = p.sizes[p.sizes.length - 1];
    if (suggested) {
      const out = stockOf(suggested.code) === 0;
      resultText = out
        ? `Con ${String(cm).replace(".", ",")} cm te queda la talla ${suggested.code}, pero está agotada en ${color?.name ?? "este color"}.`
        : `Con ${String(cm).replace(".", ",")} cm te queda la talla ${suggested.code}.`;
    } else if (first && cm < first.headCmMin) {
      resultText = `Tu medida es menor que la talla ${first.code} (desde ${first.headCmMin} cm).`;
    } else if (last && cm > last.headCmMax + 1) {
      resultText = `Tu medida supera la talla ${last.code} (hasta ${last.headCmMax} cm).`;
    }
  }

  const needSize = () => {
    setNotice({ tone: "error", text: "Elige una talla para continuar." });
    sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    sizeRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
  };

  const submit = async (mode: "add" | "buy") => {
    if (!variant) return needSize();
    if (variant.stock === 0) {
      setNotice({ tone: "error", text: "Esta combinación está agotada. Prueba con otra talla o color." });
      return;
    }
    setBusy(mode);
    setNotice(null);
    const res = await add(variant.id, qtyShown);
    setBusy(null);
    if (!res.ok) {
      setNotice({ tone: "error", text: res.message });
      return;
    }
    if (mode === "buy") {
      dismissLastAdded();
      router.push("/checkout");
    }
  };

  const availability = variant ? (
    <p className="flex flex-wrap items-center gap-x-2" aria-live="polite">
      <AvailabilityText availability={variant.availability} className="text-base" />
      {variant.availability === "low_stock" && <span className="text-sm text-low">{onlyLeft(variant.stock)}</span>}
      {variant.availability === "in_stock" && <span className="text-sm text-ink-2">Talla {variant.sizeCode}, {color?.name}</span>}
    </p>
  ) : (
    <p className="text-ink-2" aria-live="polite">
      {p.availability === "out_of_stock" ? "Agotado por ahora" : "Elige una talla para ver la disponibilidad"}
    </p>
  );

  const soldOutAll = p.availability === "out_of_stock";

  return (
    <div>
      <div className="rounded-card bg-surface p-4 sm:p-5">
        <PriceBlock price={p.priceCop} compareAt={p.compareAtPriceCop} size="lg" />
        <p className="mt-1 text-sm text-ink-2">Precio con IVA incluido</p>

        <div className="mt-5">
          <p className="text-[15px]">
            <span className="font-semibold">Color:</span> {color?.name}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Colores disponibles">
            {colors.map((c) => {
              const on = c.id === colorId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pickColor(c.id)}
                    aria-pressed={on}
                    aria-label={`${c.name}${c.stock === 0 ? ", agotado" : ""}`}
                    title={c.name}
                    className={cn(
                      "grid size-11 place-items-center rounded-full",
                      on ? "ring-2 ring-shell ring-offset-2 ring-offset-surface" : "hover:ring-2 hover:ring-field hover:ring-offset-2 hover:ring-offset-surface",
                    )}
                  >
                    <span className="relative grid place-items-center">
                      <Swatch hex={c.hex} size={32} className={cn(c.stock === 0 && "opacity-40")} />
                      {on && (
                        <Check
                          className={cn("absolute size-4", ["#1E1E1E", "#6B4A2E", "#5B6B3A"].includes(c.hex.toUpperCase()) ? "text-white" : "text-ink")}
                          aria-hidden
                        />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-5" ref={sizeRef}>
          <p className="text-[15px]">
            <span className="font-semibold">Talla:</span> {sizeCode ?? "elige una"}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Tallas">
            {p.sizes.map((s) => {
              const out = stockOf(s.code) === 0;
              const on = sizeCode === s.code;
              const mine = suggested?.code === s.code;
              return (
                <li key={s.code} className="relative">
                  <button
                    type="button"
                    disabled={out}
                    onClick={() => pickSize(s.code)}
                    aria-pressed={on}
                    aria-label={`Talla ${s.code}, ${s.headCmMin} a ${s.headCmMax} centímetros${out ? ", agotada" : ""}${mine ? ", tu talla" : ""}`}
                    className={cn(
                      "flex h-14 min-w-16 flex-col items-center justify-center rounded-card border px-3 transition-colors duration-150",
                      on
                        ? "border-shell bg-shell text-white"
                        : "border-border bg-surface text-ink hover:border-ink-2",
                      mine && !on && "border-gold bg-gold/15 ring-2 ring-gold",
                      out && "border-border bg-tone text-ink-2 hover:border-border",
                    )}
                  >
                    <span className={cn("text-base font-semibold", out && "line-through")}>{s.code}</span>
                    <span className={cn("tnum text-xs", on ? "text-shell-mute" : "text-ink-2", out && "line-through")}>
                      {s.headCmMin}–{s.headCmMax} cm
                    </span>
                  </button>
                  {mine && (
                    <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2 text-xs font-semibold whitespace-nowrap text-ink">
                      Tu talla
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-3">
            <SizeCalculator cm={cm} onChange={onCm} resultText={resultText} />
          </div>
        </div>

        <div className="mt-5">{availability}</div>

        {!soldOutAll && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[15px] font-semibold">Cantidad</span>
            <QuantityStepper value={qtyShown} onChange={setQty} max={maxQty} disabled={!variant} />
            {variant && <span className="text-sm text-ink-2">{variant.stock} disponibles</span>}
          </div>
        )}

        {notice && (
          <Alert tone={notice.tone} className="mt-4">
            {notice.text}
          </Alert>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            size="lg"
            full
            loading={busy === "add"}
            disabled={soldOutAll || busy === "buy"}
            onClick={() => submit("add")}
          >
            Agregar al carrito
          </Button>
          <Button
            size="lg"
            full
            variant="secondary"
            loading={busy === "buy"}
            disabled={soldOutAll || busy === "add"}
            onClick={() => submit("buy")}
          >
            Comprar ahora
          </Button>
        </div>

        {!soldOutAll && (
          <p className="mt-4 flex items-center gap-2 text-[15px]">
            <Truck className="size-5 shrink-0 text-ok" aria-hidden />
            <span>
              <span className="font-semibold text-ok">{deliveryText(p.deliveryDaysMin, p.deliveryDaysMax)}</span> a toda Colombia
            </span>
          </p>
        )}
      </div>

      {/* sticky buy bar, phones only */}
      <div className={STICKY_BAR} data-sticky-buy>
        <div className="min-w-0 flex-1">
          <PriceBlock price={p.priceCop} compareAt={null} size="md" />
          <p className="truncate text-xs text-ink-2">
            {variant ? `Talla ${variant.sizeCode} · ${color?.name}` : "Elige talla y color"}
          </p>
        </div>
        <Button size="lg" loading={busy === "add"} disabled={soldOutAll} onClick={() => submit("add")}>
          Agregar al carrito
        </Button>
      </div>
    </div>
  );
}
