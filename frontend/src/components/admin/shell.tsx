"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Store,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { HatMark } from "@/components/layout/logo";
import { Sheet } from "@/components/ui/dialog";
import type { AdminOrderList, AdminProductList } from "@/lib/types";
import { ToastProvider } from "./toast";
import { CONTROL, MONO } from "./ui";

export interface AdminCounts {
  /** orders waiting for payment */
  pending: number;
  /** paid orders waiting to be prepared */
  paid: number;
  /** variants at or under the low-stock threshold */
  lowStock: number;
}

const CountsContext = createContext<AdminCounts>({ pending: 0, paid: 0, lowStock: 0 });

export function useAdminCounts() {
  return useContext(CountsContext);
}

const NAV = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package, exact: false },
  { href: "/admin/productos", label: "Productos", icon: Tags, exact: false },
  { href: "/admin/inventario", label: "Inventario", icon: Boxes, exact: false },
] as const;

function sectionLabel(pathname: string): string {
  const hit = NAV.find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href)));
  return hit ? hit.label : "Panel administrativo";
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const counts = useAdminCounts();
  const badge: Record<string, number> = {
    "/admin/pedidos": counts.pending + counts.paid,
    "/admin/inventario": counts.lowStock,
  };
  return (
    <nav aria-label="Panel administrativo" className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const on = exact ? pathname === href : pathname.startsWith(href);
        const n = badge[href] ?? 0;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-field px-2.5 text-sm transition-colors duration-150 lg:h-8",
              on ? "bg-frame-active font-semibold text-ink" : "text-ink-2 hover:bg-frame-active/60 hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{label}</span>
            {n > 0 && (
              <span className="tnum text-xs font-medium text-ink-2">
                {n}
                <span className="sr-only">
                  {href === "/admin/pedidos" ? " pedidos por atender" : " variantes con stock bajo"}
                </span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBottom({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function out() {
    setBusy(true);
    try {
      await logout();
    } finally {
      router.push("/");
      router.refresh();
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-9 items-center gap-2.5 rounded-field px-2.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-frame-active/60 hover:text-ink lg:h-8"
      >
        <Store className="size-4 shrink-0" aria-hidden /> Ver tienda
      </Link>
      <div className="flex items-center gap-2 px-2.5 pt-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.fullName ?? "Administrador"}</p>
          <p className="truncate text-xs text-ink-2">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={out}
          disabled={busy}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="grid size-9 shrink-0 place-items-center rounded-field text-ink-2 transition-colors duration-150 hover:bg-frame-active hover:text-ink lg:size-8"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 px-2.5" aria-label="Casa Guaico, panel administrativo">
      <HatMark className="h-6 w-9 text-shell" />
      <span className="leading-tight">
        <span className="block text-[15px] font-bold tracking-tight text-shell">Casa Guaico</span>
        <span className="block text-xs text-ink-2">Panel administrativo</span>
      </span>
    </Link>
  );
}

/* ---------- global search: jumps to orders / products ---------- */

interface Hit {
  href: string;
  label: string;
  meta: string;
}

function GlobalSearch({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const id = useId();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ q: string; orders: Hit[]; products: Hit[] } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const term = q.trim();

  useEffect(() => {
    if (term.length < 2) return;
    const ac = new AbortController();
    const t = window.setTimeout(() => {
      Promise.all([
        api<AdminOrderList>("/admin/orders", { query: { q: term, pageSize: 4 }, signal: ac.signal }).catch(() => null),
        api<AdminProductList>("/admin/products", { query: { q: term, pageSize: 4 }, signal: ac.signal }).catch(
          () => null,
        ),
      ]).then(([o, p]) => {
        if (ac.signal.aborted) return;
        setState({
          q: term,
          orders: (o?.items ?? []).map((r) => ({
            href: `/admin/pedidos/${r.id}`,
            label: r.number,
            meta: r.customerName,
          })),
          products: (p?.items ?? []).map((r) => ({
            href: `/admin/productos/${r.id}`,
            label: r.name,
            meta: r.sku,
          })),
        });
      });
    }, 250);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [term]);

  useEffect(() => {
    function away(e: PointerEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  const fresh = state && state.q === term ? state : null;
  const showPanel = open && term.length >= 2;

  function go(href: string) {
    setOpen(false);
    setQ("");
    onNavigate?.();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const links = Array.from(wrap.current?.querySelectorAll<HTMLElement>("[data-hit]") ?? []);
      if (!links.length) return;
      e.preventDefault();
      const cur = links.indexOf(document.activeElement as HTMLElement);
      const next = e.key === "ArrowDown" ? cur + 1 : cur - 1;
      if (next < 0) wrap.current?.querySelector<HTMLInputElement>("input")?.focus();
      else links[Math.min(next, links.length - 1)].focus();
    }
  }

  const orderLike = /^(cg-?)?\d+$/i.test(term);
  const hitCls =
    "flex min-h-9 w-full items-center justify-between gap-3 rounded-field px-2.5 text-left text-sm hover:bg-tone focus-visible:bg-tone";

  return (
    <div ref={wrap} className={cn("relative", className)} onKeyDown={onKeyDown}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (term.length === 0) return;
          go(
            orderLike
              ? `/admin/pedidos?q=${encodeURIComponent(term)}`
              : `/admin/productos?q=${encodeURIComponent(term)}`,
          );
        }}
      >
        <label htmlFor={id} className="sr-only">
          Buscar pedidos y productos
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-2" aria-hidden />
        <input
          id={id}
          type="search"
          value={q}
          autoComplete="off"
          placeholder="Buscar pedido, cliente o producto"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={cn(CONTROL, "h-9 w-full pr-2.5 pl-8 placeholder:text-ink-2 lg:h-8")}
        />
      </form>
      {showPanel && (
        <div
          id={`${id}-panel`}
          className="menu-in absolute top-full right-0 left-0 z-50 mt-1.5 max-h-[70dvh] overflow-y-auto rounded-card border border-edge bg-surface p-1.5 shadow-lg" // taste-skill-ignore
        >
          {!fresh && <p className="px-2.5 py-2 text-sm text-ink-2">Buscando…</p>}
          {fresh && (
            <>
              <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-ink-2">Pedidos</p>
              {fresh.orders.map((h) => (
                <button key={h.href} data-hit type="button" onClick={() => go(h.href)} className={hitCls}>
                  <span className="font-medium">{h.label}</span>
                  <span className="truncate text-ink-2">{h.meta}</span>
                </button>
              ))}
              <button
                data-hit
                type="button"
                onClick={() => go(`/admin/pedidos?q=${encodeURIComponent(term)}`)}
                className={cn(hitCls, "text-link")}
              >
                {fresh.orders.length ? "Ver todos los pedidos" : "Sin pedidos. Buscar en pedidos"}
              </button>
              <p className="px-2.5 pt-2.5 pb-1 text-xs font-medium text-ink-2">Productos</p>
              {fresh.products.map((h) => (
                <button key={h.href} data-hit type="button" onClick={() => go(h.href)} className={hitCls}>
                  <span className="truncate font-medium">{h.label}</span>
                  <span className={cn(MONO, "shrink-0 text-xs text-ink-2")}>{h.meta}</span>
                </button>
              ))}
              <button
                data-hit
                type="button"
                onClick={() => go(`/admin/productos?q=${encodeURIComponent(term)}`)}
                className={cn(hitCls, "text-link")}
              >
                {fresh.products.length ? "Ver todos los productos" : "Sin productos. Buscar en productos"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- the shell ---------- */

export function AdminShell({ counts, children }: { counts: AdminCounts; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const close = () => setMenu(false);

  return (
    <CountsContext.Provider value={counts}>
      <ToastProvider>
        <div className="flex min-h-dvh flex-col bg-frame text-sm text-ink lg:grid lg:h-dvh lg:grid-cols-[228px_minmax(0,1fr)] lg:grid-rows-[48px_minmax(0,1fr)]">
          <a
            href="#panel"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-field focus:bg-surface focus:px-3 focus:py-2 focus:font-medium"
          >
            Saltar al contenido
          </a>

          {/* sidebar (desktop) */}
          <aside className="hidden flex-col justify-between px-3 pt-4 pb-3 lg:row-span-2 lg:flex">
            <div className="flex flex-col gap-6">
              <Brand />
              <NavList />
            </div>
            <SidebarBottom />
          </aside>

          {/* top bar: phone = menu button + section, desktop = centred search */}
          <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 bg-frame px-4 lg:static lg:px-6">
            <button
              type="button"
              onClick={() => setMenu(true)}
              aria-label="Abrir menú"
              className="-ml-2 grid size-10 place-items-center rounded-field hover:bg-frame-active lg:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <p className="text-[15px] font-semibold lg:hidden">{sectionLabel(pathname)}</p>
            <div className="mx-auto hidden w-full max-w-[548px] lg:block">
              <GlobalSearch />
            </div>
          </header>

          {/* the white sheet */}
          <main
            id="panel"
            className="min-h-0 flex-1 bg-surface lg:mr-2 lg:mb-2 lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-edge"
          >
            <div className="mx-auto w-full max-w-[1280px] px-4 py-5 lg:p-6">{children}</div>
          </main>
        </div>

        <Sheet open={menu} onClose={close} title="Menú" side="left">
          <div className="flex min-h-[calc(100dvh-8rem)] flex-col justify-between gap-6">
            <div className="flex flex-col gap-5">
              <Brand />
              <GlobalSearch onNavigate={close} />
              <NavList onNavigate={close} />
            </div>
            <SidebarBottom onNavigate={close} />
          </div>
        </Sheet>
      </ToastProvider>
    </CountsContext.Provider>
  );
}
