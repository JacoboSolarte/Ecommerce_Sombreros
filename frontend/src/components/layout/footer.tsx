import Link from "next/link";
import type { Category } from "@/lib/types";
import { HatMark } from "./logo";

export function Footer({ categories }: { categories: Category[] }) {
  const link = "inline-block py-1 text-shell-mute hover:text-white hover:underline";
  return (
    <footer className="on-shell mt-16 bg-shell text-shell-ink">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 pt-12 pb-8 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold">Casa Guaico</h2>
          <p className="mt-2 max-w-xs text-shell-mute">
            Sombreros de iraca tejidos a mano en Nariño, Colombia. Cada uno sale con el nombre de quien lo tejió.
          </p>
        </div>
        <nav aria-label="Categorías en el pie de página">
          <h2 className="text-lg font-semibold">Comprar</h2>
          <ul className="mt-2">
            <li><Link href="/buscar" className={link}>Todos los sombreros</Link></li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/categoria/${c.slug}`} className={link}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Cuenta en el pie de página">
          <h2 className="text-lg font-semibold">Tu cuenta</h2>
          <ul className="mt-2">
            <li><Link href="/cuenta" className={link}>Mi cuenta</Link></li>
            <li><Link href="/cuenta/pedidos" className={link}>Mis pedidos</Link></li>
            <li><Link href="/carrito" className={link}>Carrito</Link></li>
          </ul>
        </nav>
        <nav aria-label="Información">
          <h2 className="text-lg font-semibold">Información</h2>
          <ul className="mt-2">
            <li><Link href="/creditos" className={link}>Créditos de imágenes</Link></li>
          </ul>
          <p className="mt-4 text-sm text-shell-mute">
            Los precios incluyen IVA. El pago se hace en una pasarela de pruebas: no se pide ningún dato de tarjeta.
          </p>
        </nav>
      </div>
      <div className="bg-shell-2">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 overflow-hidden px-4 py-6 sm:px-6">
          <HatMark className="h-[clamp(2rem,6vw,5rem)] w-auto shrink-0 text-gold" />
          <p className="text-[clamp(2.25rem,9vw,7rem)] leading-none font-bold tracking-tight whitespace-nowrap">
            Casa Guaico
          </p>
        </div>
      </div>
    </footer>
  );
}
