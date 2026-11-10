"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { Img } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";

export interface Slide {
  src: string | null;
  alt: string;
  caption: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}

function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

const SCRIM = "absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/5"; // taste-skill-ignore

export function BannerCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(true);
  const [hover, setHover] = useState(false);
  const reduced = useReducedMotion();
  const count = slides.length;
  const auto = !paused && !hover && !reduced && count > 1;

  const go = useCallback((i: number) => setIndex((i + count) % count), [count]);

  useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => window.clearInterval(t);
  }, [auto, count]);

  const ctrl =
    "on-shell grid size-11 place-items-center rounded-full bg-black/45 text-white hover:bg-black/65";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Novedades de Casa Guaico"
      className="relative h-[300px] overflow-hidden bg-shell-3 sm:h-[380px] lg:h-[430px]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      {slides.map((s, i) => {
        const active = i === index;
        const Heading = i === 0 ? "h1" : "h2";
        return (
          <div
            key={i}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${count}`}
            aria-hidden={!active}
            className={cn(
              "absolute inset-0 transition-opacity duration-500 ease-out",
              active ? "visible opacity-100" : "invisible opacity-0",
            )}
          >
            {s.src && <Img src={s.src} alt={s.alt} priority={i === 0} sizes="100vw" />}
            <div className={SCRIM} />
            <div className="relative mx-auto flex h-full max-w-[1400px] flex-col justify-center px-4 pb-16 sm:px-20 lg:pb-28">
              <Heading className="max-w-2xl text-3xl leading-[1.08] font-bold tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
                {s.title}
              </Heading>
              <p className="mt-3 max-w-xl text-base text-white sm:text-lg">{s.text}</p>
              <div className="mt-5">
                <Link
                  href={s.href}
                  tabIndex={active ? 0 : -1}
                  className={buttonClasses({ variant: "primary", size: "lg" })}
                >
                  {s.cta}
                </Link>
              </div>
            </div>
            <p className="absolute right-4 bottom-2 left-4 truncate text-right text-xs text-white/85 sm:left-auto sm:right-6 sm:bottom-[4.25rem] sm:max-w-[60%] lg:bottom-[8.25rem]">
              {s.caption}
            </p>
          </div>
        );
      })}

      {count > 1 && (
        <>
          <div className="absolute inset-x-2 top-[38%] hidden justify-between sm:flex">
            <button type="button" className={ctrl} onClick={() => go(index - 1)} aria-label="Diapositiva anterior">
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button type="button" className={ctrl} onClick={() => go(index + 1)} aria-label="Diapositiva siguiente">
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </div>
          <div className="absolute bottom-[3.75rem] left-4 flex items-center gap-1 sm:left-20 lg:bottom-[7.5rem]">
            <button
              type="button"
              className={cn(
                "on-shell size-11 place-items-center rounded-full text-white hover:bg-black/40",
                reduced ? "hidden" : "grid",
              )}
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Reanudar el cambio automático" : "Pausar el cambio automático"}
            >
              {paused ? <Play className="size-5" aria-hidden /> : <Pause className="size-5" aria-hidden />}
            </button>
            <div className="flex items-center" role="group" aria-label="Elegir diapositiva">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Ir a la diapositiva ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className="on-shell grid size-8 place-items-center"
                >
                  <span
                    className={cn(
                      "block h-2.5 rounded-full transition-[width,background-color] duration-200",
                      i === index ? "w-6 bg-gold" : "w-2.5 bg-white/70",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <div aria-live={auto ? "off" : "polite"} className="sr-only">
        Diapositiva {index + 1} de {count}: {slides[index]?.title}
      </div>
    </section>
  );
}
