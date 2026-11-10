"use client";

import { ErrorView } from "@/components/ui/error-view";
import { PageContainer } from "@/components/ui/misc";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageContainer className="py-16">
      <ErrorView
        title="Algo salió mal"
        message="No pudimos cargar esta página. Inténtalo de nuevo; si sigue fallando, vuelve al inicio."
        reset={reset}
      />
    </PageContainer>
  );
}
