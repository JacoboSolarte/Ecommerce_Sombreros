import { copParts, formatCOP, percentOff } from "@/lib/format";
import { cn } from "@/lib/cn";

const SIZES = {
  sm: { amount: "text-base", sign: "text-xs" },
  md: { amount: "text-xl", sign: "text-sm" },
  lg: { amount: "text-3xl", sign: "text-lg" },
} as const;

/** `$ 189.000` with a smaller currency sign, tabular figures, weight 600. */
export function Price({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { sign, amount } = copParts(value);
  const s = SIZES[size];
  return (
    <span
      className={cn("tnum inline-flex items-baseline gap-1 font-semibold text-ink", className)}
    >
      <span className="sr-only">{formatCOP(value)}</span>
      <span className={cn(s.sign, "font-semibold")} aria-hidden>
        {sign}
      </span>
      <span className={s.amount} aria-hidden>
        {amount}
      </span>
    </span>
  );
}

/** Price + struck compare-at price + % off. */
export function PriceBlock({
  price,
  compareAt,
  size = "md",
}: {
  price: number;
  compareAt: number | null;
  size?: keyof typeof SIZES;
}) {
  const off = percentOff(price, compareAt);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
      <Price value={price} size={size} />
      {off !== null && compareAt && (
        <>
          <span className="tnum text-sm text-ink-2 line-through">
            <span className="sr-only">Antes </span>
            {formatCOP(compareAt)}
          </span>
          <span className="tnum text-sm font-semibold text-ok">{off}% menos</span>
        </>
      )}
    </div>
  );
}
