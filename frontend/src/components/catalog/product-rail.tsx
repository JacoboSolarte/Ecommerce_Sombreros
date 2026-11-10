"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductCardData } from "@/lib/types";
import { ProductCard } from "./product-card";

/** Horizontal product rail with scroll-snap and arrow buttons on desktop. */
export function ProductRail({
  products,
  label,
}: {
  products: ProductCardData[];
  label: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  const arrow =
    "absolute top-1/3 z-10 hidden size-11 place-items-center rounded-full bg-surface text-ink shadow-lg hover:bg-tone md:grid"; // taste-skill-ignore
  return (
    <div className="relative">
      <button type="button" aria-label={`${label}: anteriores`} onClick={() => scroll(-1)} className={`${arrow} -left-3`}>
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <ul
        ref={ref}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth scroll-px-4 px-4 sm:scroll-px-6 md:scroll-px-0 sm:-mx-6 sm:gap-3 sm:px-6 md:mx-0 md:px-0"
        aria-label={label}
      >
        {products.map((p) => (
          <li key={p.id} className="relative w-[44vw] max-w-56 shrink-0 snap-start md:w-52 xl:w-56">
            <ProductCard product={p} sizes="224px" />
          </li>
        ))}
      </ul>
      <button type="button" aria-label={`${label}: siguientes`} onClick={() => scroll(1)} className={`${arrow} -right-3`}>
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}
