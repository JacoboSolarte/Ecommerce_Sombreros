import type { Metadata } from "next";
import { loadManifest } from "@/lib/manifest";
import { Breadcrumb, EmptyState, Img, PageContainer } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Créditos de imágenes",
  description: "Autores, licencias y fuentes de las fotografías que se muestran en Casa Guaico.",
};

const GROUPS: Record<string, string> = {
  region: "Región",
  process: "Proceso de tejido",
  products: "Sombreros",
  other: "Otras",
};

export default async function CreditsPage() {
  const images = await loadManifest();
  return (
    <PageContainer className="py-4 sm:py-6">
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Créditos de imágenes" }]} />
      <h1 className="mt-3 text-2xl font-semibold text-balance sm:text-3xl">Créditos de imágenes</h1>
      <p className="mt-2 max-w-[70ch] text-ink-2">
        Las fotografías de la tienda son de colecciones abiertas y pertenecen a sus autores. Ninguna muestra el taller ni al equipo de Casa Guaico.
      </p>

      {images.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Todavía no hay créditos para mostrar"
          action={<Button href="/" size="lg">Volver al inicio</Button>}
        >
          <p>Cuando se publique la lista de imágenes, aparecerá aquí con sus autores y licencias.</p>
        </EmptyState>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-card bg-surface">
          <table className="w-full min-w-[40rem] text-left text-[15px]">
            <caption className="sr-only">Autor, licencia y fuente de cada imagen</caption>
            <thead className="bg-tile text-sm text-ink-2">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Imagen</th>
                <th scope="col" className="px-4 py-3 font-medium">Descripción</th>
                <th scope="col" className="px-4 py-3 font-medium">Autor</th>
                <th scope="col" className="px-4 py-3 font-medium">Licencia</th>
                <th scope="col" className="px-4 py-3 font-medium">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {images.map((im) => (
                <tr key={im.src} className="odd:bg-surface even:bg-tile/60">
                  <td className="px-4 py-3">
                    <div className="relative size-16 overflow-hidden rounded-[6px] bg-tile">
                      <Img src={im.src} alt={im.alt || ""} sizes="64px" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{im.title || im.alt || "Sin título"}</p>
                    <p className="text-sm text-ink-2">{GROUPS[im.group]}</p>
                  </td>
                  <td className="px-4 py-3">{im.author || "No indicado"}</td>
                  <td className="px-4 py-3">{im.license || "No indicada"}</td>
                  <td className="px-4 py-3">
                    {im.sourceUrl ? (
                      <a
                        href={im.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-link hover:underline"
                      >
                        Ver fuente<span className="sr-only"> de {im.title || "la imagen"} (se abre en otra pestaña)</span>
                      </a>
                    ) : (
                      "No indicada"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
