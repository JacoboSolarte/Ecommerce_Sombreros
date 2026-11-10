"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SORT_OPTIONS } from "@/lib/constants";
import { hrefWith, type Filters } from "@/lib/filters";
import { Select } from "@/components/ui/field";

export function SortSelect({ filters, basePath }: { filters: Filters; basePath: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="hidden text-sm text-ink-2 sm:block">
        Ordenar por
      </label>
      <Select
        id="sort"
        ariaLabel="Ordenar por"
        value={filters.sort ?? "relevance"}
        onChange={(e) =>
          start(() => router.push(hrefWith(basePath, filters, { sort: e.target.value }), { scroll: false }))
        }
        className="w-auto min-w-44"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
