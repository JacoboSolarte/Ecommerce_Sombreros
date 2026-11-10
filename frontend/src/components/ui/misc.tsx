import Link from "next/link";
import Image from "next/image";
import { AlertCircle, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-card bg-skeleton", className)} />;
}

/** Product / content image that fills its (positioned) parent. Local images only. */
export function Img({
  src,
  alt,
  className,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) {
    return <div aria-hidden className={cn("absolute inset-0 bg-tone", className)} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized
      className={cn("object-cover", className)}
    />
  );
}

type AlertTone = "error" | "warning" | "success" | "info";
const ALERT: Record<AlertTone, { cls: string; Icon: typeof Info }> = {
  error: { cls: "bg-out-bg text-[#7a1913]", Icon: AlertCircle },
  warning: { cls: "bg-low-bg text-[#5e3700]", Icon: AlertCircle },
  success: { cls: "bg-ok-bg text-[#0f4d29]", Icon: CheckCircle2 },
  info: { cls: "bg-info-bg text-[#0f3f5e]", Icon: Info },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  live = true,
}: {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  live?: boolean;
}) {
  const { cls, Icon } = ALERT[tone];
  return (
    <div
      role={live ? (tone === "error" ? "alert" : "status") : undefined}
      className={cn("flex gap-3 rounded-card p-3 text-sm", cls, className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card bg-surface p-8 text-center sm:p-12", className)}>
      <h2 className="mx-auto max-w-xl text-xl font-semibold text-balance">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-xl text-ink-2">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="text-sm text-ink-2">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {it.href ? (
              <Link href={it.href} className="py-1 text-link hover:underline">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="py-1 text-ink">
                {it.label}
              </span>
            )}
            {i < items.length - 1 && <ChevronRight className="size-3.5" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Swatch({
  hex,
  size = 14,
  className,
}: {
  hex: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full ring-1 ring-black/20", className)}
      style={{ width: size, height: size, backgroundColor: hex }}
    />
  );
}

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-[1400px] px-4 sm:px-6", className)}>{children}</div>;
}

export function SectionHeading({
  children,
  action,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <Tag className="text-xl font-semibold text-balance sm:text-2xl">{children}</Tag>
      {action}
    </div>
  );
}
