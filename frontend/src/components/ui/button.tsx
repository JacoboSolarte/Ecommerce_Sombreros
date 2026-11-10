import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gold text-ink hover:bg-gold-hover active:bg-gold-hover font-semibold disabled:bg-tone disabled:text-ink-2",
  secondary:
    "bg-shell text-white hover:bg-shell-2 active:bg-shell-3 font-semibold disabled:bg-tone disabled:text-ink-2",
  outline:
    "bg-surface text-ink border border-border hover:bg-tile active:bg-tone font-medium disabled:text-ink-2 disabled:bg-tone",
  ghost: "bg-transparent text-link hover:bg-tone active:bg-tone font-medium disabled:text-ink-2",
  danger:
    "bg-surface text-out border border-out/40 hover:bg-out-bg font-medium disabled:text-ink-2 disabled:bg-tone",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-10 px-5 text-[15px]",
  lg: "h-11 px-6 text-base sm:h-10 sm:text-[15px]",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  full,
  className,
}: {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full whitespace-nowrap",
    "transition-[background-color,transform,color] duration-150 ease-out active:scale-[0.98]",
    "disabled:active:scale-100 aria-disabled:pointer-events-none",
    VARIANTS[variant],
    SIZES[size],
    full && "w-full",
    className,
  );
}

type CommonProps = {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
};

type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

export function Button(props: ButtonProps | LinkProps) {
  const { variant, size, full, loading, className, children, ...rest } = props;
  const cls = buttonClasses({ variant, size, full, className });
  if ("href" in props && props.href !== undefined) {
    const { href, ...anchorRest } = rest as Omit<LinkProps, "variant" | "size" | "full" | "loading">;
    return (
      <Link href={href} className={cls} {...anchorRest}>
        {children}
      </Link>
    );
  }
  const btn = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type="button"
      {...btn}
      disabled={btn.disabled || loading}
      aria-busy={loading || undefined}
      className={cls}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
