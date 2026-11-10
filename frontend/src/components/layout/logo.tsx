import Link from "next/link";
import { cn } from "@/lib/cn";

/** Hand-drawn hat mark: dome + brim, single stroke weight. */
export function HatMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 28" fill="none" aria-hidden className={cn("h-7 w-10", className)}>
      <path
        d="M10 17c0-6 4-12 10-12s10 6 10 12"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M11.4 15.6c2.8 1.2 5.6 1.6 8.6 1.6s5.8-.4 8.6-1.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 21.5c0-2.6 6.4-4.5 17-4.5s17 1.9 17 4.5-6.4 4.5-17 4.5S3 24.100 3 21.5Z"
        stroke="currentColor"
        strokeWidth="2.4"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Casa Guaico, ir al inicio"
      className={cn("inline-flex items-center gap-2 text-shell-ink", className)}
    >
      <HatMark className="text-gold" />
      <span className="text-xl font-bold tracking-tight">Casa Guaico</span>
    </Link>
  );
}
