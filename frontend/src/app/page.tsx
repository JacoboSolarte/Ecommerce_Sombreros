import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Ruler, ShieldCheck, Truck } from "lucide-react";
import { loadManifest } from "@/lib/manifest";
import { serverApiOrNull } from "@/lib/server-api";
import type {
  Artisan,
  Category,
  ProductCardData,
  ProductDetail,
  ProductList,
} from "@/lib/types";
import { BannerCarousel, type Slide } from "@/components/home/banner-carousel";
import { ProductRail } from "@/components/catalog/product-rail";
import { ProductGrid } from "@/components/catalog/product-card";
import { Img, PageContainer, SectionHeading } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { ErrorView } from "@/components/ui/error-view";

export const metadata: Metadata = {
  title: { absolute: "Casa Guaico | Sombreros de iraca tejidos a mano en Nariño" },
};

const SLIDE_COPY = [
  {
    title: "Sombreros de iraca tejidos a mano en Nariño",
    text: "Cada sombrero lleva el nombre de quien lo tejió y el municipio donde vive.",
    cta: "Ver sombreros",
    href: "/buscar",
  },
  {
    title: "Encuentra tu talla antes de comprar",
    text: "Mide tu cabeza en centímetros y elige entre S, M, L y XL.",
    cta: "Ver recién tejidos",
    href: "/buscar?sort=newest",
  },
  {
    title: "Del cogollo de iraca a tu cabeza",
    text: "Tejido fino, superfino o extrafino: elige según las horas de trabajo.",
    cta: "Ver tejido extrafino",
    href: "/buscar?weave=extrafino",
  },
  {
    title: "Más de una forma de llevar iraca",
    text: "De ala ancha, clásicos, para dama, para niños y plegables de viaje.",
    cta: "Explorar categorías",
    href: "/buscar",
  },
];

async function artisansFrom(products: ProductCardData[]): Promise<Artisan[]> {
  const seen = new Set<string>();
  const picks: ProductCardData[] = [];
  for (const p of products) {
    if (!seen.has(p.artisan.fullName)) {
      seen.add(p.artisan.fullName);
      picks.push(p);
    }
    if (picks.length === 4) break;
  }
  // The contract has no artisan list endpoint: read each artisan (with id) from a product detail.
  const details = await Promise.all(
    picks.map((p) => serverApiOrNull<ProductDetail>(`/products/${p.slug}`, { revalidate: 120 })),
  );
  return details.flatMap((d) => (d ? [d.artisan] : []));
}

export default async function HomePage() {
  const [categories, featured, newest, manifest] = await Promise.all([
    serverApiOrNull<Category[]>("/categories", { revalidate: 300 }),
    serverApiOrNull<ProductCardData[]>("/products/featured", { revalidate: 60 }),
    serverApiOrNull<ProductList>("/products", {
      query: { sort: "newest", pageSize: 12 },
      revalidate: 60,
    }),
    loadManifest(),
  ]);

  if (!categories && !featured && !newest) {
    return (
      <PageContainer className="py-16">
        <ErrorView
          title="No pudimos cargar la tienda"
          message="Nuestro catálogo no responde en este momento. Inténtalo de nuevo en unos segundos."
        />
      </PageContainer>
    );
  }

  const region = manifest.filter((m) => m.group === "region");
  const processImgs = manifest.filter((m) => m.group === "process");
  const slideImages = region.length ? region.slice(0, 4) : [];
  const slides: Slide[] = (slideImages.length ? slideImages : [null]).map((img, i) => {
    const copy = SLIDE_COPY[i % SLIDE_COPY.length];
    return {
      src: img?.src ?? null,
      alt: img?.alt ?? "",
      caption: img ? [img.title || img.alt, img.author && `Foto: ${img.author}`].filter(Boolean).join(". ") : "",
      ...copy,
    };
  });

  const cats = categories ?? [];
  const pool = [...(featured ?? []), ...(newest?.items ?? [])];
  const tileImage = (c: Category) =>
    c.imageUrl ?? pool.find((p) => p.category.slug === c.slug)?.imageUrl ?? null;
  const artisans = await artisansFrom(pool);
  const bandPhoto = processImgs[0] ?? region[1] ?? region[0] ?? null;
  const lonely = cats.length % 4 === 1;
  const lonelyMobile = cats.length % 2 === 1;

  return (
    <>
      <BannerCarousel slides={slides} />

      {cats.length > 0 && (
        <PageContainer className="relative z-10 -mt-12 lg:-mt-24">
          <h2 className="sr-only">Comprar por categoría</h2>
          <ul className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            {cats.map((c, i) => {
              const last = i === cats.length - 1;
              return (
                <li
                  key={c.slug}
                  className={
                    last && (lonely || lonelyMobile)
                      ? `${lonelyMobile ? "max-lg:col-span-2" : ""} ${lonely ? "lg:col-span-2" : ""}`
                      : undefined
                  }
                >
                  <Link
                    href={`/categoria/${c.slug}`}
                    className="group flex h-full flex-col rounded-card bg-surface p-4 hover:bg-white"
                  >
                    <h3 className="line-clamp-2 min-h-[2.75rem] text-lg leading-snug font-semibold group-hover:text-link">
                      {c.name}
                    </h3>
                    <div className="relative mt-2 aspect-[4/3] w-full overflow-hidden rounded-[6px] bg-tile lg:aspect-[16/10]">
                      <Img
                        src={tileImage(c)}
                        alt=""
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-link group-hover:underline">
                      Ver {c.productCount} {c.productCount === 1 ? "sombrero" : "sombreros"}
                      <ArrowRight className="size-4" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </PageContainer>
      )}

      {featured && featured.length > 0 && (
        <PageContainer className="mt-14 lg:mt-20">
          <section className="rounded-card bg-surface p-4 sm:p-6" aria-labelledby="destacados">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 id="destacados" className="text-xl font-semibold sm:text-2xl">
                Destacados
              </h2>
              <Link href="/buscar" className="text-sm font-medium text-link hover:underline">
                Ver todos
              </Link>
            </div>
            <ProductRail products={featured} label="Destacados" />
          </section>
        </PageContainer>
      )}

      {artisans.length > 0 && (
        <PageContainer className="mt-14 lg:mt-20">
          <section aria-labelledby="tejidos" className="grid overflow-hidden rounded-card bg-shell text-shell-ink lg:grid-cols-5">
            {bandPhoto && (
              <figure className="relative min-h-64 lg:col-span-2 lg:min-h-[26rem]">
                <Img src={bandPhoto.src} alt={bandPhoto.alt} sizes="(min-width: 1024px) 40vw, 100vw" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-black/55 px-4 py-2 text-xs text-white">
                  {[bandPhoto.title || bandPhoto.alt, bandPhoto.author && `Foto: ${bandPhoto.author}`]
                    .filter(Boolean)
                    .join(". ")}
                </figcaption>
              </figure>
            )}
            <div className={`on-shell p-6 sm:p-8 ${bandPhoto ? "lg:col-span-3" : "lg:col-span-5"}`}>
              <h2 id="tejidos" className="text-2xl font-semibold text-balance sm:text-3xl">
                Tejidos en Nariño
              </h2>
              <p className="mt-2 max-w-xl text-shell-mute">
                Estas son algunas de las personas que tejen los sombreros de la tienda. Entra a su página y mira todo lo que han hecho.
              </p>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {artisans.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/artesanos/${a.id}`}
                      className="flex h-full items-center gap-4 rounded-card bg-shell-2 p-3 hover:bg-shell-3"
                    >
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-full bg-shell-3">
                        {a.photoUrl ? (
                          <Img src={a.photoUrl} alt="" sizes="64px" />
                        ) : (
                          <span className="grid size-full place-items-center text-xl font-semibold text-gold" aria-hidden>
                            {a.fullName
                              .split(" ")
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join("")}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{a.fullName}</span>
                        <span className="block text-sm text-shell-mute">
                          {a.municipality}
                          {a.yearsExperience ? ` · ${a.yearsExperience} años tejiendo` : ""}
                        </span>
                        <span className="mt-0.5 block text-sm font-medium text-gold">Ver sus sombreros</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </PageContainer>
      )}

      {newest && newest.items.length > 0 && (
        <PageContainer className="mt-14 lg:mt-20">
          <SectionHeading
            action={
              <Link href="/buscar?sort=newest" className="text-sm font-medium text-link hover:underline">
                Ver más
              </Link>
            }
          >
            Recién tejidos
          </SectionHeading>
          <ProductGrid
            products={newest.items}
            className="md:grid-cols-4 xl:grid-cols-6"
          />
        </PageContainer>
      )}

      <PageContainer className="mt-14 lg:mt-20">
        <section aria-labelledby="servicio" className="rounded-card bg-surface p-6 sm:p-8">
          <h2 id="servicio" className="sr-only">
            Compra con tranquilidad
          </h2>
          <ul className="grid gap-6 md:grid-cols-3">
            <li className="flex gap-3">
              <Truck className="mt-0.5 size-6 shrink-0 text-link" aria-hidden />
              <div>
                <p className="font-semibold">Envío a toda Colombia</p>
                <p className="text-ink-2">Llega en 3 a 5 días hábiles. Gratis desde $ 250.000.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-6 shrink-0 text-link" aria-hidden />
              <div>
                <p className="font-semibold">Pago seguro</p>
                <p className="text-ink-2">Nunca guardamos datos de tu tarjeta.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Ruler className="mt-0.5 size-6 shrink-0 text-link" aria-hidden />
              <div>
                <p className="font-semibold">Cambios de talla</p>
                <p className="text-ink-2">Si no te queda, te ayudamos a cambiarlo.</p>
              </div>
            </li>
          </ul>
          <div className="mt-6">
            <Link href="/buscar" className={buttonClasses({ variant: "secondary", size: "lg" })}>
              Ver todos los sombreros
            </Link>
          </div>
        </section>
      </PageContainer>
    </>
  );
}
