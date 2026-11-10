import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseFilters } from "@/lib/filters";
import { serverApiOrNull } from "@/lib/server-api";
import type { Category } from "@/lib/types";
import { SearchResults } from "@/components/catalog/search-results";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function getCategory(slug: string) {
  const categories = (await serverApiOrNull<Category[]>("/categories", { revalidate: 300 })) ?? [];
  return { categories, category: categories.find((c) => c.slug === slug) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await getCategory(slug);
  return { title: category?.name ?? "Categoría", description: category?.description ?? undefined };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { categories, category } = await getCategory(slug);
  if (!category) notFound();
  const filters = parseFilters(await searchParams);
  delete filters.category;
  return (
    <SearchResults
      filters={filters}
      basePath={`/categoria/${slug}`}
      fixedCategory={{ slug, name: category.name, description: category.description }}
      categories={categories}
    />
  );
}
