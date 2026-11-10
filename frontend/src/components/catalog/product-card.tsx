import Link from "next/link";
import { cn } from "@/lib/cn";
import { deliveryText, weaveLine } from "@/lib/format";
import type { ProductCardData } from "@/lib/types";
import { Img } from "@/components/ui/misc";
import { AvailabilityText } from "@/components/ui/pill";
import { PriceBlock } from "@/components/ui/price";

export function ProductCard({
  product: p,
  priority,
  className,
  sizes,
}: {
  product: ProductCardData;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const soldOut = p.availability === "out_of_stock";
  return (
    <Link
      href={`/producto/${p.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-card bg-surface p-3 transition-colors duration-150 hover:bg-white focus-visible:outline-offset-0",
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[6px] bg-tile">
        <Img
          src={p.imageUrl}
          alt={p.imageAlt ?? p.name}
          priority={priority}
          sizes={sizes ?? "(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw"}
          className={cn(
            "transition-transform duration-200 ease-out group-hover:scale-[1.03]",
            soldOut && "opacity-60",
          )}
        />
      </div>
      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-[15px] leading-snug font-medium text-ink group-hover:text-link group-hover:underline">
          {p.name}
        </h3>
        <p className="mt-1 text-sm text-ink-2">
          {p.artisan.municipality} · {weaveLine(p.weaveGrade)}
        </p>
        <div className="mt-2">
          <PriceBlock price={p.priceCop} compareAt={p.compareAtPriceCop} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          {p.colors.length > 0 && (
            <>
              <span className="flex -space-x-0.5" aria-hidden>
                {p.colors.slice(0, 5).map((c) => (
                  <span
                    key={c.id}
                    className="size-4 rounded-full ring-1 ring-black/25"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </span>
              <span className="sr-only">Colores: {p.colors.map((c) => c.name).join(", ")}.</span>
              {p.colors.length > 5 && <span className="text-xs text-ink-2">+{p.colors.length - 5}</span>}
            </>
          )}
          <AvailabilityText availability={p.availability} className="ml-auto" />
        </div>
        {!soldOut && (
          <p className="mt-1 text-sm text-ink-2">{deliveryText(p.deliveryDaysMin, p.deliveryDaysMax)}</p>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({
  products,
  className,
  priorityCount = 0,
}: {
  products: ProductCardData[];
  className?: string;
  priorityCount?: number;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3", className)}>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
