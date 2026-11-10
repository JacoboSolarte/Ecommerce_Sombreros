import type { Metadata } from "next";
import { parseFilters } from "@/lib/filters";
import { serverApiOrNull } from "@/lib/server-api";
import type { Category } from "@/lib/types";
import { SearchResults } from "@/components/catalog/search-results";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  return { title: f.q ? `Resultados para «${f.q}»` : "Todos los sombreros" };
}

export default async function SearchPage({ searchParams }: Props) {
  const filters = parseFilters(await searchParams);
  const categories = (await serverApiOrNull<Category[]>("/categories", { revalidate: 300 })) ?? [];
  return <SearchResults filters={filters} basePath="/buscar" categories={categories} />;
}
