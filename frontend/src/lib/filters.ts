export const FILTER_KEYS = [
  "q",
  "category",
  "color",
  "size",
  "weave",
  "minPrice",
  "maxPrice",
  "inStock",
  "sort",
  "page",
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];
export type Filters = Partial<Record<FilterKey, string>>;

type RawParams = Record<string, string | string[] | undefined>;

export function parseFilters(sp: RawParams): Filters {
  const out: Filters = {};
  for (const k of FILTER_KEYS) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s && s.trim() !== "") out[k] = s.trim();
  }
  return out;
}

/** Builds a URL from the current filters with changes applied. `null` removes a key. Resets the page unless set. */
export function hrefWith(
  base: string,
  filters: Filters,
  patch: Partial<Record<FilterKey, string | null>> = {},
): string {
  const next: Filters = { ...filters };
  for (const [k, v] of Object.entries(patch) as [FilterKey, string | null][]) {
    if (v === null || v === "") delete next[k];
    else next[k] = v;
  }
  if (!("page" in patch)) delete next.page;
  if (next.sort === "relevance") delete next.sort;
  if (next.page === "1") delete next.page;
  const sp = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = next[k];
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export function activeFilterCount(f: Filters, ignore: FilterKey[] = []): number {
  const keys: FilterKey[] = ["category", "color", "size", "weave", "minPrice", "maxPrice", "inStock"];
  return keys.filter((k) => !ignore.includes(k) && f[k]).length;
}
