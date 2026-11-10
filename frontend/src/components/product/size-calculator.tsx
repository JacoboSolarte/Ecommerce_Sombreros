"use client";

import { useId } from "react";
import { Ruler } from "lucide-react";

export interface SizeRange {
  code: string;
  headCmMin: number;
  headCmMax: number;
}

export function matchSize(cm: number | null, sizes: SizeRange[]): SizeRange | null {
  if (cm === null || Number.isNaN(cm)) return null;
  const whole = Math.floor(cm);
  return sizes.find((s) => whole >= s.headCmMin && whole <= s.headCmMax) ?? null;
}

/** "¿Cuál es mi talla?": centimeters in, matching size chip highlighted live. */
export function SizeCalculator({
  cm,
  onChange,
  resultText,
}: {
  cm: number | null;
  onChange: (cm: number | null) => void;
  /** Computed by the parent (it knows stock for the chosen color). */
  resultText: string;
}) {
  const id = useId();
  const slideMin = 52;
  const slideMax = 63;
  return (
    <div className="rounded-card bg-tile p-3">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <Ruler className="size-4 text-link" aria-hidden /> ¿Cuál es mi talla?
      </p>
      <p className="mt-0.5 text-sm text-ink-2">Mide el contorno de tu cabeza, justo encima de las cejas.</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <label htmlFor={`${id}-cm`} className="sr-only">
            Contorno de tu cabeza en centímetros
          </label>
          <input
            id={`${id}-cm`}
            type="number"
            inputMode="decimal"
            min={40}
            max={80}
            step={0.5}
            value={cm ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            placeholder="57"
            className="tnum h-10 w-20 rounded-field border border-field bg-surface px-2.5 text-base"
          />
          <span className="text-sm text-ink-2">cm</span>
        </div>
        <div className="flex-1">
          <label htmlFor={`${id}-range`} className="sr-only">
            Deslizador del contorno de cabeza, de {slideMin} a {slideMax} centímetros
          </label>
          <input
            id={`${id}-range`}
            type="range"
            min={slideMin}
            max={slideMax}
            step={0.5}
            value={cm !== null ? Math.min(slideMax, Math.max(slideMin, cm)) : 57}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-10 w-full cursor-pointer"
          />
        </div>
      </div>
      <p aria-live="polite" role="status" className="mt-2 min-h-5 text-sm font-medium text-ink">
        {resultText}
      </p>
    </div>
  );
}
