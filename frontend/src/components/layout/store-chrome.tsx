"use client";

import { usePathname } from "next/navigation";

/**
 * The storefront header, main landmark and footer. The admin panel (/admin/**)
 * brings its own shell, so there the chrome steps aside and only renders children.
 */
export function StoreChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <>{children}</>;
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:font-semibold focus:text-ink"
      >
        Saltar al contenido
      </a>
      {header}
      <main id="contenido" className="flex-1">
        {children}
      </main>
      {footer}
    </>
  );
}
