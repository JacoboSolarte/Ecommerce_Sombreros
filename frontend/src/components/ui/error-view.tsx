"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "./button";

/** Shared error panel: what happened and how to recover. */
export function ErrorView({
  title = "Algo salió mal",
  message = "No pudimos cargar esta página. Inténtalo de nuevo en un momento.",
  reset,
}: {
  title?: string;
  message?: string;
  reset?: () => void;
}) {
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-card bg-surface p-8 text-center sm:p-12">
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <p className="mt-2 text-ink-2">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {reset ? (
          <Button onClick={reset} size="lg">
            <RotateCcw className="size-4" aria-hidden /> Intentar de nuevo
          </Button>
        ) : (
          <Button href="/" size="lg">
            Recargar
          </Button>
        )}
        <Button href="/" variant="outline" size="lg">
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}
