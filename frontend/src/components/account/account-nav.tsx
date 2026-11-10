"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/cuenta", label: "Mi cuenta", exact: true },
  { href: "/cuenta/pedidos", label: "Mis pedidos", exact: false },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Cuenta">
      <ul className="flex gap-2 lg:flex-col lg:gap-1">
        {LINKS.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center rounded-full px-4 font-medium lg:rounded-card",
                  active ? "bg-shell text-white" : "bg-surface text-ink hover:bg-tone",
                )}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
