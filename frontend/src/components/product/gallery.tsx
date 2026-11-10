"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Img } from "@/components/ui/misc";

export function Gallery({
  images,
  name,
}: {
  images: { url: string; alt: string | null }[];
  name: string;
}) {
  const [i, setI] = useState(0);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const n = images.length;
  const cur = images[i];

  const select = (next: number, focus = false) => {
    const k = (next + n) % n;
    setI(k);
    if (focus) thumbs.current[k]?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      select(i + 1, true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      select(i - 1, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      select(n - 1, true);
    }
  };

  if (n === 0) {
    return <div className="relative aspect-square w-full rounded-card bg-tile" role="img" aria-label={name} />;
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row-reverse md:items-start">
      <div
        className="relative aspect-square w-full flex-1 overflow-hidden rounded-card bg-tile"
        role="group"
        aria-roledescription="galería"
        aria-label={`Fotos de ${name}`}
      >
        <Img
          key={cur.url}
          src={cur.url}
          alt={cur.alt ?? `${name}, foto ${i + 1} de ${n}`}
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="animate-[fade-in_200ms_ease-out]"
        />
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => select(i - 1)}
              aria-label="Foto anterior"
              className="absolute top-1/2 left-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink hover:bg-surface"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => select(i + 1)}
              aria-label="Foto siguiente"
              className="absolute top-1/2 right-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink hover:bg-surface"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>
      {n > 1 && (
        <ul
          className="no-scrollbar flex gap-2 overflow-x-auto md:w-16 md:flex-col md:overflow-visible"
          aria-label="Miniaturas"
          onKeyDown={onKey}
        >
          {images.map((im, k) => (
            <li key={im.url} className="shrink-0">
              <button
                type="button"
                ref={(el) => {
                  thumbs.current[k] = el;
                }}
                onClick={() => setI(k)}
                tabIndex={k === i ? 0 : -1}
                aria-label={`Ver foto ${k + 1} de ${n}`}
                aria-current={k === i ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-[6px] bg-tile",
                  k === i ? "ring-2 ring-shell ring-offset-2 ring-offset-ground" : "hover:ring-2 hover:ring-field",
                )}
              >
                <Img src={im.url} alt="" sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
