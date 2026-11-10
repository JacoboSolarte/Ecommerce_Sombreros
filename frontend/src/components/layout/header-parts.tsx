"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingCart,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { useCart } from "@/context/cart";
import { CITY_KEY } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { useLocalValue } from "@/lib/use-local-value";
import type { Category } from "@/lib/types";
import { Sheet } from "@/components/ui/dialog";
import { Logo } from "./logo";

const MENU_PANEL =
  "menu-in absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-card bg-surface py-2 shadow-xl"; // taste-skill-ignore

export function SearchBar({ categories }: { categories: Category[] }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const q = sp.get("q") ?? "";
  const catFromPath = pathname.startsWith("/categoria/") ? pathname.split("/")[2] : "";
  const category = sp.get("category") ?? catFromPath ?? "";
  return (
    <form
      action="/buscar"
      role="search"
      className="flex h-11 w-full overflow-hidden rounded-full bg-surface lg:h-10"
      key={`${q}|${category}`}
    >
      <div className="relative hidden shrink-0 sm:block">
        <label htmlFor="hdr-cat" className="sr-only">
          Categoría
        </label>
        <select
          id="hdr-cat"
          name="category"
          defaultValue={category}
          className="h-full max-w-44 cursor-pointer appearance-none bg-tone py-0 pr-8 pl-4 text-sm text-ink hover:bg-skeleton"
        >
          <option value="">Todos</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-2"
          aria-hidden
        />
      </div>
      <label htmlFor="hdr-q" className="sr-only">
        Buscar sombreros
      </label>
      <input
        id="hdr-q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Busca sombreros, municipios, tejidos"
        autoComplete="off"
        className="min-w-0 flex-1 bg-surface px-4 text-base text-ink placeholder:text-ink-2/70 focus-visible:outline-offset-[-3px]"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="grid w-14 shrink-0 place-items-center bg-gold text-ink hover:bg-gold-hover active:bg-gold-hover focus-visible:outline-offset-[-3px]"
      >
        <Search className="size-5" aria-hidden />
      </button>
    </form>
  );
}

export function LocationLabel() {
  const city = useLocalValue(CITY_KEY, "");
  return (
    <div className="hidden shrink-0 items-center gap-1.5 text-shell-ink xl:flex">
      <MapPin className="size-5 text-shell-mute" aria-hidden />
      <div className="text-sm leading-tight">
        <p className="text-shell-mute">Enviar a</p>
        <p className="font-semibold">{city || "toda Colombia"}</p>
      </div>
    </div>
  );
}

export function CartLink() {
  const { count, addedTick } = useCart();
  const [bump, setBump] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setBump(true);
    const t = window.setTimeout(() => setBump(false), 260);
    return () => window.clearTimeout(t);
  }, [addedTick]);
  return (
    <Link
      href="/carrito"
      className="on-shell relative flex h-11 items-center gap-1.5 rounded-full px-2 text-shell-ink hover:bg-shell-2"
      aria-label={`Carrito, ${count} ${count === 1 ? "producto" : "productos"}`}
    >
      <span className="relative">
        <ShoppingCart className="size-7" aria-hidden />
        <span
          className={cn(
            "tnum absolute -top-2 -right-2 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-xs leading-5 font-bold text-ink",
            count === 0 && "hidden",
            bump && "bump",
          )}
          aria-hidden
        >
          {count > 99 ? "99+" : count}
        </span>
      </span>
      <span className="hidden text-sm font-semibold lg:inline">Carrito</span>
    </Link>
  );
}

export function AccountMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const first = user?.fullName.split(" ")[0] ?? "";
  const item =
    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] text-ink hover:bg-tone focus-visible:outline-offset-[-2px]";

  return (
    <div ref={wrap} className="relative hidden lg:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="on-shell flex h-11 items-center gap-1.5 rounded-full px-3 text-left text-shell-ink hover:bg-shell-2"
      >
        <span className="text-sm leading-tight">
          <span className="block text-shell-mute">{user ? `Hola, ${first}` : "Hola, ingresa"}</span>
          <span className="block font-semibold">Cuenta y pedidos</span>
        </span>
        <ChevronDown className="size-4 text-shell-mute" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className={MENU_PANEL}
        >
          {user ? (
            <>
              <p className="px-4 pb-2 text-sm text-ink-2">{user.email}</p>
              <Link role="menuitem" href="/cuenta" className={item} onClick={() => setOpen(false)}>
                <UserIcon className="size-4 text-ink-2" aria-hidden /> Mi cuenta
              </Link>
              <Link role="menuitem" href="/cuenta/pedidos" className={item} onClick={() => setOpen(false)}>
                <Package className="size-4 text-ink-2" aria-hidden /> Mis pedidos
              </Link>
              {user.role === "admin" && (
                <Link role="menuitem" href="/admin" className={item} onClick={() => setOpen(false)}>
                  <LayoutDashboard className="size-4 text-ink-2" aria-hidden /> Panel administrativo
                </Link>
              )}
              <button
                role="menuitem"
                type="button"
                className={item}
                onClick={async () => {
                  setOpen(false);
                  await logout();
                  router.push("/");
                  router.refresh();
                }}
              >
                <LogOut className="size-4 text-ink-2" aria-hidden /> Cerrar sesión
              </button>
            </>
          ) : (
            <div className="px-4 pb-1">
              <Link
                href="/ingresar"
                onClick={() => setOpen(false)}
                className="flex h-10 items-center justify-center rounded-full bg-gold font-semibold text-ink hover:bg-gold-hover"
              >
                Ingresar
              </Link>
              <p className="mt-3 text-sm text-ink-2">
                ¿Eres nuevo?{" "}
                <Link href="/registro" className="font-medium text-link hover:underline" onClick={() => setOpen(false)}>
                  Crea tu cuenta
                </Link>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OrdersLink() {
  return (
    <Link
      href="/cuenta/pedidos"
      className="on-shell hidden h-11 items-center rounded-full px-3 text-sm leading-tight font-semibold text-shell-ink hover:bg-shell-2 lg:flex"
    >
      Mis pedidos
    </Link>
  );
}

export function MobileMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const link = "flex min-h-11 items-center rounded-card px-3 text-base text-ink hover:bg-tone";
  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-haspopup="dialog"
        className="on-shell grid size-11 place-items-center rounded-full text-shell-ink hover:bg-shell-2 lg:hidden"
      >
        <Menu className="size-6" aria-hidden />
      </button>
      <Sheet open={open} onClose={close} title="Menú" side="left">
        <nav aria-label="Menú principal" className="-mx-2">
          <p className="px-3 pt-1 pb-1 text-sm font-semibold text-ink-2">
            {user ? `Hola, ${user.fullName.split(" ")[0]}` : "Tu cuenta"}
          </p>
          {user ? (
            <>
              <Link href="/cuenta" className={link} onClick={close}>Mi cuenta</Link>
              <Link href="/cuenta/pedidos" className={link} onClick={close}>Mis pedidos</Link>
              {user.role === "admin" && (
                <Link href="/admin" className={link} onClick={close}>Panel administrativo</Link>
              )}
              <button
                type="button"
                className={cn(link, "w-full text-left")}
                onClick={async () => {
                  close();
                  await logout();
                  router.push("/");
                  router.refresh();
                }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link href="/ingresar" className={link} onClick={close}>Ingresar</Link>
              <Link href="/registro" className={link} onClick={close}>Crear cuenta</Link>
            </>
          )}
          <p className="mt-4 px-3 pb-1 text-sm font-semibold text-ink-2">Categorías</p>
          <Link href="/buscar" className={link} onClick={close}>Todos los sombreros</Link>
          {categories.map((c) => (
            <Link key={c.slug} href={`/categoria/${c.slug}`} className={link} onClick={close}>
              {c.name}
            </Link>
          ))}
        </nav>
      </Sheet>
    </>
  );
}

export function CategoryStrip({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const link =
    "on-shell inline-flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-medium text-shell-ink hover:bg-shell-3";
  return (
    <nav aria-label="Categorías" className="bg-shell-2">
      <div className="mx-auto flex max-w-[1400px] items-center gap-1 overflow-x-auto px-2 no-scrollbar after:w-2 after:shrink-0 after:content-[''] sm:px-4">
        <Link href="/buscar" className={cn(link, pathname === "/buscar" && "bg-shell-3")}>
          Todos los sombreros
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/categoria/${c.slug}`}
            aria-current={pathname === `/categoria/${c.slug}` ? "page" : undefined}
            className={cn(link, pathname === `/categoria/${c.slug}` && "bg-shell-3")}
          >
            {c.name}
          </Link>
        ))}
        <Link href="/creditos" className={cn(link, "ml-auto text-shell-mute")}>
          Créditos de imágenes
        </Link>
      </div>
    </nav>
  );
}

export function HeaderMain({ categories }: { categories: Category[] }) {
  return (
    <div className="on-shell mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4 lg:flex-nowrap lg:gap-x-4">
      <MobileMenu categories={categories} />
      <Logo className="mr-auto lg:mr-0" />
      <LocationLabel />
      <div className="order-last w-full lg:order-none lg:flex-1">
        <SearchBar categories={categories} />
      </div>
      <AccountMenu />
      <OrdersLink />
      <CartLink />
    </div>
  );
}
