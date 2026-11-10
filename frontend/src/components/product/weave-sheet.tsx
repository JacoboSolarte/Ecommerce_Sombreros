import Link from "next/link";
import { cn } from "@/lib/cn";
import { WEAVE_LABELS, WEAVE_ORDER } from "@/lib/format";
import type { ProductDetail } from "@/lib/types";
import { HatMark } from "@/components/layout/logo";

/** "Ficha de tejido": the workshop tag every hat carries. */
export function WeaveSheet({ product: p }: { product: ProductDetail }) {
  const idx = WEAVE_ORDER.indexOf(p.weaveGrade);
  return (
    <section aria-labelledby="ficha" className="overflow-hidden rounded-card bg-tile">
      <div className="on-shell flex items-center gap-2 bg-shell px-4 py-2.5 text-shell-ink">
        <HatMark className="h-5 w-7 text-gold" />
        <h2 id="ficha" className="text-base font-semibold">
          Ficha de tejido
        </h2>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4">
        <div className="col-span-2">
          <dt className="text-sm text-ink-2">Tejido por</dt>
          <dd className="text-lg font-semibold">
            <Link href={`/artesanos/${p.artisan.id}`} className="text-link hover:underline">
              {p.artisan.fullName}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-2">Municipio</dt>
          <dd className="font-semibold">
            {p.artisan.municipality}, {p.artisan.department}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-2">Horas de tejido</dt>
          <dd className="tnum font-semibold">{p.weavingHours} horas</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-2">Fibra</dt>
          <dd className="font-semibold">{p.fiber}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-2">Ala</dt>
          <dd className="tnum font-semibold">{String(p.brimCm).replace(".", ",")} cm</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-sm text-ink-2">Grado de tejido</dt>
          <dd className="mt-1.5">
            <div role="img" aria-label={`Tejido ${p.weaveGrade}, nivel ${idx + 1} de 3`} className="grid grid-cols-3 gap-1.5">
              {WEAVE_ORDER.map((g, k) => (
                <div key={g}>
                  <div className={cn("h-2.5 rounded-full", k <= idx ? "bg-shell" : "bg-skeleton")} />
                  <p className={cn("mt-1 text-sm", k === idx ? "font-semibold text-ink" : "text-ink-2")}>
                    {WEAVE_LABELS[g]}
                  </p>
                </div>
              ))}
            </div>
          </dd>
        </div>
      </dl>
    </section>
  );
}
