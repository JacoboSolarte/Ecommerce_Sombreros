import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { ArtisanWithProducts } from "@/lib/types";
import { ProductGrid } from "@/components/catalog/product-card";
import { Breadcrumb, EmptyState, Img, PageContainer } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

async function load(id: string): Promise<ArtisanWithProducts> {
  try {
    return await serverApi<ArtisanWithProducts>(`/artisans/${encodeURIComponent(id)}`, { revalidate: 60 });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const a = await serverApi<ArtisanWithProducts>(`/artisans/${encodeURIComponent(id)}`, { revalidate: 60 });
    return { title: `${a.fullName}, artesano de ${a.municipality}`, description: a.bio ?? undefined };
  } catch {
    return { title: "Artesano" };
  }
}

export default async function ArtisanPage({ params }: Props) {
  const { id } = await params;
  const a = await load(id);
  return (
    <PageContainer className="py-4 sm:py-6">
      <Breadcrumb
        items={[{ label: "Inicio", href: "/" }, { label: "Artesanos" }, { label: a.fullName }]}
      />
      <section className="mt-4 grid overflow-hidden rounded-card bg-surface md:grid-cols-[minmax(0,20rem)_1fr]">
        {a.photoUrl && (
          <div className="relative aspect-[4/3] bg-tile md:aspect-auto md:min-h-72">
            <Img src={a.photoUrl} alt={`${a.fullName}, artesano de ${a.municipality}`} sizes="(min-width: 768px) 20rem, 100vw" />
          </div>
        )}
        <div className={`p-5 sm:p-8 ${a.photoUrl ? "" : "md:col-span-2"}`}>
          <h1 className="text-3xl font-semibold text-balance">{a.fullName}</h1>
          <p className="mt-1 text-ink-2">
            {a.craft} · {a.municipality}, {a.department}
            {a.yearsExperience ? ` · ${a.yearsExperience} años tejiendo` : ""}
          </p>
          {a.bio && <p className="mt-4 max-w-[70ch]">{a.bio}</p>}
        </div>
      </section>

      <section aria-labelledby="sus-sombreros" className="mt-10">
        <h2 id="sus-sombreros" className="mb-4 text-xl font-semibold sm:text-2xl">
          Sombreros tejidos por {a.fullName.split(" ")[0]}
        </h2>
        {a.products.length ? (
          <ProductGrid products={a.products} className="md:grid-cols-4 xl:grid-cols-5" />
        ) : (
          <EmptyState
            title="Por ahora no hay sombreros publicados"
            action={<Button href="/buscar" size="lg">Ver todos los sombreros</Button>}
          >
            <p>Vuelve pronto: sus próximos tejidos llegarán a la tienda.</p>
          </EmptyState>
        )}
      </section>
    </PageContainer>
  );
}
