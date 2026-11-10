import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { hrefWith, activeFilterCount, type Filters } from "@/lib/filters";
import { formatCOP, WEAVE_LABELS } from "@/lib/format";
import { serverApi } from "@/lib/server-api";
import type { Category, ProductList, WeaveGrade } from "@/lib/types";
import { Breadcrumb, EmptyState, PageContainer } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { ErrorView } from "@/components/ui/error-view";
import { FilterSidebar, MobileFilters } from "./filter-panel";
import { ProductGrid } from "./product-card";
import { SortSelect } from "./sort-select";

const PAGE_SIZE = 24;

function pageList(page: number, last: number): (number | "gap")[] {
  const set = new Set([1, last, page - 1, page, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

export async function SearchResults({
  filters,
  basePath,
  fixedCategory,
  categories,
}: {
  filters: Filters;
  basePath: string;
  fixedCategory?: { slug: string; name: string; description?: string | null };
  categories: Category[];
}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const query = { ...filters, page, pageSize: PAGE_SIZE, category: fixedCategory?.slug ?? filters.category };
  let data: ProductList;
  try {
    data = await serverApi<ProductList>("/products", { query, revalidate: 20 });
  } catch (e) {
    return (
      <PageContainer className="py-12">
        <ErrorView
          title="No pudimos cargar los sombreros"
          message={e instanceof Error ? e.message : undefined}
        />
      </PageContainer>
    );
  }

  const lastPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const categoryName = fixedCategory?.name ?? categories.find((c) => c.slug === filters.category)?.name;
  const colorName = data.facets.colors.find((c) => String(c.id) === filters.color)?.name ?? "Color";

  const chips: { label: string; href: string }[] = [];
  if (filters.category && !fixedCategory)
    chips.push({ label: categoryName ?? filters.category, href: hrefWith(basePath, filters, { category: null }) });
  if (filters.color)
    chips.push({ label: `Color: ${colorName}`, href: hrefWith(basePath, filters, { color: null }) });
  if (filters.size) chips.push({ label: `Talla ${filters.size}`, href: hrefWith(basePath, filters, { size: null }) });
  if (filters.weave)
    chips.push({
      label: `Tejido ${WEAVE_LABELS[filters.weave as WeaveGrade]?.toLowerCase() ?? filters.weave}`,
      href: hrefWith(basePath, filters, { weave: null }),
    });
  if (filters.minPrice || filters.maxPrice) {
    const a = filters.minPrice ? formatCOP(Number(filters.minPrice)) : "";
    const b = filters.maxPrice ? formatCOP(Number(filters.maxPrice)) : "";
    chips.push({
      label: a && b ? `${a} a ${b}` : a ? `Desde ${a}` : `Hasta ${b}`,
      href: hrefWith(basePath, filters, { minPrice: null, maxPrice: null }),
    });
  }
  if (filters.inStock === "true")
    chips.push({ label: "Solo disponibles", href: hrefWith(basePath, filters, { inStock: null }) });

  const clearHref = hrefWith(basePath, filters.q ? { q: filters.q } : {}, {});
  const nFilters = activeFilterCount(filters, fixedCategory ? ["category"] : []);

  const total = data.total;
  const countText = `${total.toLocaleString("es-CO")} ${total === 1 ? "resultado" : "resultados"}`;
  const heading = fixedCategory
    ? fixedCategory.name
    : filters.q
      ? `${countText} para «${filters.q}»`
      : categoryName
        ? categoryName
        : "Todos los sombreros";

  const crumbs = fixedCategory
    ? [{ label: "Inicio", href: "/" }, { label: fixedCategory.name }]
    : [{ label: "Inicio", href: "/" }, { label: filters.q ? "Búsqueda" : "Sombreros" }];

  return (
    <PageContainer className="py-4 sm:py-6">
      <Breadcrumb items={crumbs} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-2xl font-semibold text-balance sm:text-3xl">{heading}</h1>
          {fixedCategory?.description && (
            <p className="mt-1 max-w-2xl text-ink-2">{fixedCategory.description}</p>
          )}
          {(fixedCategory || !filters.q) && (
            <p className="mt-1 text-ink-2" aria-live="polite">{countText}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MobileFilters
            facets={data.facets}
            filters={filters}
            basePath={basePath}
            categoryFixed={!!fixedCategory}
            total={total}
          />
          <SortSelect filters={filters} basePath={basePath} />
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
          {chips.map((c) => (
            <li key={c.label}>
              <Link
                href={c.href}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface pr-2.5 pl-3.5 text-sm font-medium hover:bg-tone"
              >
                {c.label}
                <X className="size-4 text-ink-2" aria-hidden />
                <span className="sr-only">Quitar filtro</span>
              </Link>
            </li>
          ))}
          {nFilters > 1 && (
            <li>
              <Link href={clearHref} className="px-2 text-sm font-medium text-link hover:underline">
                Limpiar filtros
              </Link>
            </li>
          )}
        </ul>
      )}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
        <FilterSidebar
          facets={data.facets}
          filters={filters}
          basePath={basePath}
          categoryFixed={!!fixedCategory}
        />
        <div className="min-w-0">
          {data.items.length === 0 ? (
            <EmptyState
              title={
                filters.q
                  ? `No encontramos sombreros para «${filters.q}»`
                  : "No encontramos sombreros con estos filtros"
              }
              action={
                <>
                  {nFilters > 0 && (
                    <Link href={clearHref} className={buttonClasses({ variant: "primary", size: "lg" })}>
                      Limpiar filtros
                    </Link>
                  )}
                  <Link href="/buscar" className={buttonClasses({ variant: "outline", size: "lg" })}>
                    Ver todos los sombreros
                  </Link>
                </>
              }
            >
              <p>Revisa que esté bien escrito, usa menos palabras o prueba con un municipio como Sandoná.</p>
              {categories.length > 0 && (
                <ul className="mt-4 flex flex-wrap justify-center gap-2">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/categoria/${c.slug}`}
                        className="inline-flex h-9 items-center rounded-full bg-tone px-4 text-sm font-medium text-ink hover:bg-skeleton"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </EmptyState>
          ) : (
            <>
              <ProductGrid
                products={data.items}
                priorityCount={4}
                className="lg:grid-cols-3 2xl:grid-cols-4"
              />
              {lastPage > 1 && (
                <nav aria-label="Paginación" className="mt-8 flex flex-wrap items-center justify-center gap-1">
                  {page > 1 && (
                    <Link
                      href={hrefWith(basePath, filters, { page: String(page - 1) })}
                      className="inline-flex h-10 items-center gap-1 rounded-full px-3 font-medium text-link hover:bg-tone"
                    >
                      <ChevronLeft className="size-4" aria-hidden /> Anterior
                    </Link>
                  )}
                  {pageList(page, lastPage).map((n, i) =>
                    n === "gap" ? (
                      <span key={`g${i}`} aria-hidden className="px-1 text-ink-2">…</span>
                    ) : (
                      <Link
                        key={n}
                        href={hrefWith(basePath, filters, { page: String(n) })}
                        aria-current={n === page ? "page" : undefined}
                        aria-label={`Página ${n}`}
                        className={cn(
                          "tnum grid size-10 place-items-center rounded-full font-medium",
                          n === page ? "bg-shell text-white" : "hover:bg-tone",
                        )}
                      >
                        {n}
                      </Link>
                    ),
                  )}
                  {page < lastPage && (
                    <Link
                      href={hrefWith(basePath, filters, { page: String(page + 1) })}
                      className="inline-flex h-10 items-center gap-1 rounded-full px-3 font-medium text-link hover:bg-tone"
                    >
                      Siguiente <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
