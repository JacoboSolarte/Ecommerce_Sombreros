"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/** Quantity stepper, bounded by min and max (stock). */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label = "Cantidad",
  disabled,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max: number;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const atMin = value <= min;
  const atMax = value >= max;
  const btn =
    "grid size-10 place-items-center text-ink hover:bg-tone disabled:text-ink-2/50 disabled:hover:bg-transparent";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center rounded-full border border-field bg-surface", className)}
    >
      <button
        type="button"
        className={cn(btn, "rounded-l-full")}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || atMin}
        aria-label={`Disminuir ${label.toLowerCase()}`}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span className="tnum min-w-8 text-center text-base font-semibold" aria-live="polite">
        {value}
        <span className="sr-only"> unidades</span>
      </span>
      <button
        type="button"
        className={cn(btn, "rounded-r-full")}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || atMax}
        aria-label={`Aumentar ${label.toLowerCase()}`}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
