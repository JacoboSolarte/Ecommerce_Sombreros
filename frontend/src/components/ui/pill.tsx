import { cn } from "@/lib/cn";
import { AVAILABILITY_LABELS, PAYMENT_LABELS, STATUS_LABELS } from "@/lib/format";
import type { Availability, OrderStatus, PaymentStatus } from "@/lib/types";

type Tone = "neutral" | "ok" | "low" | "out" | "info" | "teal";

const TONES: Record<Tone, string> = {
  neutral: "bg-tone text-ink",
  ok: "bg-ok-bg text-[#12552f]",
  low: "bg-low-bg text-[#6e4000]",
  out: "bg-out-bg text-[#8a1c16]",
  info: "bg-info-bg text-[#124666]",
  teal: "bg-teal-bg text-[#0f4a45]",
};

export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] leading-5 font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<OrderStatus, Tone> = {
  pending: "low",
  paid: "info",
  preparing: "neutral",
  shipped: "teal",
  delivered: "ok",
  cancelled: "out",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Pill>;
}

const PAY_TONE: Record<PaymentStatus, Tone> = {
  pending: "low",
  approved: "ok",
  declined: "out",
  failed: "out",
};

export function PaymentPill({ status }: { status: PaymentStatus }) {
  return <Pill tone={PAY_TONE[status]}>{PAYMENT_LABELS[status]}</Pill>;
}

const AVAIL_TEXT: Record<Availability, string> = {
  in_stock: "text-ok",
  low_stock: "text-low",
  out_of_stock: "text-out",
};

/** Plain colored text, marketplace style ("Disponible", "Últimas unidades"). */
export function AvailabilityText({
  availability,
  className,
}: {
  availability: Availability;
  className?: string;
}) {
  return (
    <span className={cn("text-sm font-semibold", AVAIL_TEXT[availability], className)}>
      {AVAILABILITY_LABELS[availability]}
    </span>
  );
}
