"use client";

import { useEffect, useRef, useState } from "react";
import { formatDayLong, formatDayShort } from "@/lib/format";

export interface ChartPoint {
  date: string;
  /** null = no value that day (shown as a gap, not as zero) */
  value: number | null;
}

/** "$ 1,5 M" / "$ 200 mil" / "$ 800" for axis ticks. */
export function compactCOP(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `$ ${(Math.round(m * 10) / 10).toString().replace(".", ",")} M`;
  }
  if (n >= 1_000) return `$ ${Math.round(n / 1_000)} mil`;
  return `$ ${n}`;
}

/** Round axis maximum and step so the ticks land on friendly numbers. */
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: ticks, step: 1 };
  const raw = max / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  const step = nice * pow;
  return { max: step * ticks, step };
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const M = { top: 10, right: 8, bottom: 24, left: 52 };

/**
 * One series over days. A single hue; zero days are honest (no bar, line on the baseline),
 * days without a value break the line. Hover or arrow keys read a day in the line above.
 */
export function SeriesChart({
  points,
  kind,
  format,
  tick,
  unitLabel,
  title,
}: {
  points: ChartPoint[];
  kind: "line" | "bar";
  format: (n: number) => string;
  tick: (n: number) => string;
  /** appended to the readout, e.g. "pedidos" */
  unitLabel?: string;
  title: string;
}) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const height = width > 0 && width < 480 ? 180 : 220;
  const n = points.length;
  const values = points.map((p) => p.value ?? 0);
  const total = values.reduce((a, b) => a + b, 0);
  const { max, step } = niceScale(Math.max(...values, 0));
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const x = (i: number) =>
    kind === "bar" || n === 1 ? M.left + (innerW * (i + 0.5)) / n : M.left + (innerW * i) / (n - 1);
  const y = (v: number) => M.top + innerH - (v / max) * innerH;
  const gridValues = [0, 1, 2, 3, 4].map((k) => k * step);

  const labelCount = width < 480 ? 3 : 6;
  const labelIdx = new Set<number>();
  if (n > 0) {
    const gap = Math.max(1, Math.floor((n - 1) / (labelCount - 1)) || 1);
    for (let i = 0; i < n; i += gap) labelIdx.add(i);
    if (n > labelCount) {
      // keep the last label from colliding with its neighbour
      const last = n - 1;
      const prev = Array.from(labelIdx).filter((i) => i !== last).pop();
      if (prev !== undefined && last - prev < gap * 0.6) labelIdx.delete(prev);
      labelIdx.add(last);
    }
  }

  // line segments, broken where the value is missing
  const segments: { i: number; v: number }[][] = [];
  if (kind === "line") {
    let cur: { i: number; v: number }[] = [];
    points.forEach((p, i) => {
      if (p.value === null) {
        if (cur.length) segments.push(cur);
        cur = [];
      } else cur.push({ i, v: p.value });
    });
    if (cur.length) segments.push(cur);
  }

  function indexAt(clientX: number, el: SVGSVGElement) {
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left - M.left;
    if (kind === "bar") return Math.min(n - 1, Math.max(0, Math.floor((px / innerW) * n)));
    return n <= 1 ? 0 : Math.min(n - 1, Math.max(0, Math.round((px / innerW) * (n - 1))));
  }

  const a = active !== null && active < n ? points[active] : null;
  const readout = a
    ? `${formatDayLong(a.date)}: ${a.value === null ? "sin pedidos" : format(a.value)}${a.value !== null && unitLabel ? ` ${unitLabel}` : ""}`
    : "Pasa el cursor o usa las flechas para leer cada día.";
  const allZero = total === 0;

  return (
    <div>
      <p aria-live="polite" className="tnum mb-1 min-h-5 text-xs text-ink-2">
        {readout}
      </p>
      <div ref={ref} className="w-full" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${title}, ${n} días${allZero ? ", sin movimiento en el periodo" : ""}`}
            tabIndex={0}
            className="block rounded-field"
            onPointerMove={(e) => setActive(indexAt(e.clientX, e.currentTarget))}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                setActive((c) => (c === null ? 0 : Math.min(n - 1, c + 1)));
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                setActive((c) => (c === null ? n - 1 : Math.max(0, c - 1)));
              } else if (e.key === "Escape") setActive(null);
            }}
          >
            {gridValues.map((g) => (
              <g key={g}>
                <line
                  x1={M.left}
                  x2={width - M.right}
                  y1={y(g)}
                  y2={y(g)}
                  stroke={g === 0 ? "#cdd3cd" : "#e8ece8"}
                  strokeWidth={1}
                />
                <text x={M.left - 8} y={y(g) + 4} textAnchor="end" fontSize={12} fill="#4a5550" className="tnum">
                  {allZero && g > 0 ? "" : tick(g)}
                </text>
              </g>
            ))}

            {points.map((p, i) =>
              labelIdx.has(i) ? (
                <text
                  key={p.date}
                  x={x(i)}
                  y={height - 6}
                  fontSize={12}
                  fill="#4a5550"
                  textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                >
                  {formatDayShort(p.date)}
                </text>
              ) : null,
            )}

            {kind === "bar" &&
              points.map((p, i) => {
                const v = p.value ?? 0;
                if (v <= 0) return null;
                const bw = Math.max(1, Math.min(32, (innerW / n) * 0.7));
                return (
                  <rect
                    key={p.date}
                    x={x(i) - bw / 2}
                    y={y(v)}
                    width={bw}
                    height={Math.max(1, y(0) - y(v))}
                    rx={bw > 6 ? 2 : 0}
                    fill="#1d6b52"
                    opacity={active === null || active === i ? 1 : 0.45}
                  />
                );
              })}

            {kind === "line" &&
              segments.map((seg, k) =>
                seg.length === 1 ? (
                  <circle key={k} cx={x(seg[0].i)} cy={y(seg[0].v)} r={2.5} fill="#1d6b52" />
                ) : (
                  <path
                    key={k}
                    d={seg.map((s, j) => `${j ? "L" : "M"}${x(s.i).toFixed(1)} ${y(s.v).toFixed(1)}`).join(" ")}
                    fill="none"
                    stroke="#1d6b52"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ),
              )}

            {active !== null && a && (
              <g pointerEvents="none">
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={M.top}
                  y2={y(0)}
                  stroke="#9aa39b"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {kind === "line" && a.value !== null && (
                  <circle cx={x(active)} cy={y(a.value)} r={4} fill="#fff" stroke="#1d6b52" strokeWidth={2} />
                )}
              </g>
            )}
          </svg>
        )}
      </div>
      {allZero && <p className="mt-1 text-xs text-ink-2">Sin movimiento en este periodo.</p>}
    </div>
  );
}
