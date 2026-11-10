import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { ProductDetail } from "@/lib/types";
import { ProductRail } from "@/components/catalog/product-rail";
import { BuyBox } from "@/components/product/buy-box";
import { Gallery } from "@/components/product/gallery";
import { WeaveSheet } from "@/components/product/weave-sheet";
import { buttonClasses } from "@/components/ui/button";
import { Breadcrumb, Img, PageContainer } from "@/components/ui/misc";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function load(slug: string): Promise<ProductDetail> {
  try {
    return await serverApi<ProductDetail>(`/products/${encodeURIComponent(slug)}`, { revalidate: 20 });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await serverApi<ProductDetail>(`/products/${encodeURIComponent(slug)}`, { revalidate: 20 });
    return {
      title: p.name,
      description: p.shortDescription,
      openGraph: { title: p.name, description: p.shortDescription, images: p.imageUrl ? [p.imageUrl] : undefined },
    };
  } catch {
    return { title: "Sombrero" };
  }
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = await load(slug);
  const a = p.artisan;

  return (
    <PageContainer className="py-4 pb-28 sm:py-6 lg:pb-10">
      <Breadcrumb
        items={[
          { label: "Inicio", href: "/" },
          { label: p.category.name, href: `/categoria/${p.category.slug}` },
          { label: p.name },
        ]}
      />

      <div className="mt-4 grid gap-x-8 gap-y-4 lg:grid-cols-12">
        <div className="lg:col-span-5 lg:col-start-8 lg:row-start-1">
          <h1 className="text-2xl leading-tight font-semibold text-balance sm:text-3xl">{p.name}</h1>
          <p className="mt-1 text-ink-2">
            Tejido por{" "}
            <Link href={`/artesanos/${a.id}`} className="font-medium text-link hover:underline">
              {a.fullName}
            </Link>{" "}
            en {a.municipality}
          </p>
          <p className="mt-2 max-w-prose">{p.shortDescription}</p>
        </div>

        <div className="lg:col-span-7 lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <Gallery images={p.images.length ? p.images : p.imageUrl ? [{ url: p.imageUrl, alt: p.imageAlt }] : []} name={p.name} />
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <BuyBox product={p} initialColor={first(sp.color)} initialSize={first(sp.size)} />
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <WeaveSheet product={p} />
        </div>
      </div>

      <section aria-labelledby="descripcion" className="mt-10 rounded-card bg-surface p-5 sm:p-8">
        <h2 id="descripcion" className="text-xl font-semibold sm:text-2xl">
          Sobre este sombrero
        </h2>
        <div className="mt-3 max-w-[70ch] space-y-3 whitespace-pre-line">{p.description}</div>
        <p className="mt-4 text-sm text-ink-2">Código {p.sku}</p>
      </section>

      <section aria-labelledby="artesano" className="mt-4 grid overflow-hidden rounded-card bg-surface md:grid-cols-[minmax(0,18rem)_1fr]">
        {a.photoUrl && (
          <div className="relative aspect-[4/3] bg-tile md:aspect-auto md:min-h-64">
            <Img src={a.photoUrl} alt={`${a.fullName}, artesano de ${a.municipality}`} sizes="(min-width: 768px) 18rem, 100vw" />
          </div>
        )}
        <div className={`p-5 sm:p-8 ${a.photoUrl ? "" : "md:col-span-2"}`}>
          <h2 id="artesano" className="text-xl font-semibold sm:text-2xl">
            Conoce a {a.fullName}
          </h2>
          <p className="mt-1 text-ink-2">
            {a.craft} · {a.municipality}, {a.department}
            {a.yearsExperience ? ` · ${a.yearsExperience} años tejiendo` : ""}
          </p>
          {a.bio && <p className="mt-3 max-w-[70ch]">{a.bio}</p>}
          <div className="mt-5">
            <Link href={`/artesanos/${a.id}`} className={buttonClasses({ variant: "secondary", size: "lg" })}>
              Ver sus sombreros
            </Link>
          </div>
        </div>
      </section>

      {p.related.length > 0 && (
        <section aria-labelledby="relacionados" className="mt-10">
          <h2 id="relacionados" className="mb-4 text-xl font-semibold sm:text-2xl">
            Otros sombreros de {p.category.name.toLowerCase()}
          </h2>
          <ProductRail products={p.related} label="Sombreros relacionados" />
        </section>
      )}
    </PageContainer>
  );
}
