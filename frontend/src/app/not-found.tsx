import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <PageContainer className="py-16">
      <div className="mx-auto max-w-xl rounded-card bg-surface p-8 text-center sm:p-12">
        <h1 className="text-2xl font-semibold text-balance">No encontramos esta página</h1>
        <p className="mt-2 text-ink-2">
          Puede que el enlace esté mal escrito o que el sombrero ya no esté disponible.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/buscar" size="lg">Ver sombreros</Button>
          <Button href="/" variant="outline" size="lg">Ir al inicio</Button>
        </div>
      </div>
    </PageContainer>
  );
}
