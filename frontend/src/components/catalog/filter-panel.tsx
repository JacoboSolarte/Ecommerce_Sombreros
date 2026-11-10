"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { hrefWith, activeFilterCount, type Filters } from "@/lib/filters";
import { formatCOP, WEAVE_LABELS } from "@/lib/format";
import type { ProductFacets } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Swatch } from "@/components/ui/misc";

interface PanelProps {
  facets: ProductFacets;
  filters: Filters;
  basePath: string;
  /** true on /categoria/[slug], where the category is part of the path */
  categoryFixed?: boolean;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 pt-5 first:pt-0">
      <legend className="mb-2 text-base font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

const rowBase =
  "flex min-h-9 w-full items-center gap-2 rounded-field px-2 py-1 text-left text-[15px] hover:bg-tone";

function FilterPanel({ facets, filters, basePath, categoryFixed }: PanelProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [min, setMin] = useState(filters.minPrice ?? "");
  const [max, setMax] = useState(filters.maxPrice ?? "");

  const go = (patch: Parameters<typeof hrefWith>[2]) =>
    start(() => router.push(hrefWith(basePath, filters, patch), { scroll: false }));
  const toggle = (key: "color" | "size" | "weave", value: string) =>
    go({ [key]: filters[key] === value ? null : value });

  const applyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    go({ minPrice: min.replace(/\D/g, "") || null, maxPrice: max.replace(/\D/g, "") || null });
  };

  return (
    <div className={cn("space-y-0", pending && "opacity-70 transition-opacity")} aria-busy={pending}>
      {!categoryFixed && facets.categories.length > 0 && (
        <Group title="Categoría">
          <ul>
            <li>
              <Link
                href={hrefWith(basePath, filters, { category: null })}
                aria-current={!filters.category ? "true" : undefined}
                className={cn(rowBase, !filters.category && "font-semibold")}
              >
                Todas
              </Link>
            </li>
            {facets.categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={hrefWith(basePath, filters, { category: c.slug })}
                  aria-current={filters.category === c.slug ? "true" : undefined}
                  className={cn(rowBase, filters.category === c.slug && "font-semibold")}
                >
                  <span className="flex-1">{c.name}</span>
                  <span className="tnum text-sm text-ink-2">({c.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </Group>
      )}

      <Group title="Disponibilidad">
        <label className={cn(rowBase, "cursor-pointer")}>
          <input
            type="checkbox"
            checked={filters.inStock === "true"}
            onChange={(e) => go({ inStock: e.target.checked ? "true" : null })}
            className="size-4 accent-[#1d6b52]"
          />
          Solo disponibles
        </label>
      </Group>

      {facets.colors.length > 0 && (
        <Group title="Color">
          <ul>
            {facets.colors.map((c) => {
              const on = filters.color === String(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle("color", String(c.id))}
                    className={cn(rowBase, on && "bg-tone font-semibold")}
                  >
                    <Swatch hex={c.hex} size={18} />
                    <span className="flex-1">{c.name}</span>
                    <span className="tnum text-sm text-ink-2">({c.count})</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Group>
      )}

      {facets.sizes.length > 0 && (
        <Group title="Talla">
          <ul className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => {
              const on = filters.size === s.code;
              return (
                <li key={s.code}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle("size", s.code)}
                    className={cn(
                      "tnum h-10 min-w-12 rounded-full border px-3 text-[15px] font-medium",
                      on
                        ? "border-shell bg-shell text-white"
                        : "border-border bg-surface text-ink hover:bg-tone",
                    )}
                  >
                    {s.code} <span className={cn("text-xs", on ? "text-shell-mute" : "text-ink-2")}>({s.count})</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Group>
      )}

      {facets.weaves.length > 0 && (
        <Group title="Tipo de tejido">
          <ul>
            {facets.weaves.map((w) => {
              const on = filters.weave === w.value;
              return (
                <li key={w.value}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle("weave", w.value)}
                    className={cn(rowBase, on && "bg-tone font-semibold")}
                  >
                    <span className="flex-1">{WEAVE_LABELS[w.value] ?? w.value}</span>
                    <span className="tnum text-sm text-ink-2">({w.count})</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Group>
      )}

      <Group title="Precio">
        <form onSubmit={applyPrice} className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="f-min">Precio mínimo en pesos</label>
            <input
              id="f-min"
              inputMode="numeric"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder={facets.priceMin ? String(facets.priceMin) : "Mín."}
              className="tnum h-10 w-full min-w-0 rounded-field border border-field bg-surface px-2.5 text-[15px]"
            />
            <span aria-hidden className="text-ink-2">–</span>
            <label className="sr-only" htmlFor="f-max">Precio máximo en pesos</label>
            <input
              id="f-max"
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder={facets.priceMax ? String(facets.priceMax) : "Máx."}
              className="tnum h-10 w-full min-w-0 rounded-field border border-field bg-surface px-2.5 text-[15px]"
            />
          </div>
          {facets.priceMin != null && facets.priceMax != null && (
            <p className="tnum text-sm text-ink-2">
              Entre {formatCOP(facets.priceMin)} y {formatCOP(facets.priceMax)}
            </p>
          )}
          <Button type="submit" variant="outline" size="sm">
            Aplicar precio
          </Button>
        </form>
      </Group>
    </div>
  );
}

export function FilterSidebar(props: PanelProps) {
  return (
    <aside aria-label="Filtros" className="hidden rounded-card bg-surface p-4 lg:block">
      <h2 className="mb-4 text-lg font-semibold">Filtros</h2>
      <FilterPanel {...props} />
    </aside>
  );
}

export function MobileFilters(props: PanelProps & { total: number }) {
  const [open, setOpen] = useState(false);
  const n = activeFilterCount(props.filters, props.categoryFixed ? ["category"] : []);
  return (
    <div className="lg:hidden">
      <Button variant="outline" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <SlidersHorizontal className="size-4" aria-hidden />
        Filtros{n > 0 ? ` (${n})` : ""}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filtros"
        footer={
          <Button full size="lg" onClick={() => setOpen(false)}>
            Ver {props.total} {props.total === 1 ? "resultado" : "resultados"}
          </Button>
        }
      >
        <FilterPanel {...props} />
      </Sheet>
    </div>
  );
}
