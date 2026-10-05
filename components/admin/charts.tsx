"use client";

import { useEffect, useRef, useState } from "react";

type Point = { label: string; value: number };

// SVG attributes can't read CSS variables, so the colors go in as classes.

// Up to 4 clean ticks from 0, e.g. 0 / 5 / 10 / 15.
function ticks(max: number) {
  if (max <= 0) return [0, 1];
  const rough = max / 3;
  const power = 10 ** Math.floor(Math.log10(rough));
  // Counts are whole, so a step is never below 1.
  const step = Math.max(1, [1, 2, 5, 10].map((n) => n * power).find((n) => n >= rough) ?? rough);
  const list = [];
  for (let value = 0; value < max + step; value += step) list.push(value);
  return list;
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

// One series over time: a 2px line over a faint wash, a crosshair that snaps to the nearest
// point, and a tooltip with its value.
export function LineChart({ points, height = 180 }: { points: Point[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const left = 36;
  const right = 8;
  const top = 8;
  const bottom = 24;
  const plotWidth = Math.max(0, width - left - right);
  const plotHeight = height - top - bottom;
  const max = Math.max(0, ...points.map((point) => point.value));
  const yTicks = ticks(max);
  const yMax = yTicks.at(-1)!;
  const x = (index: number) => left + (points.length > 1 ? (index / (points.length - 1)) * plotWidth : plotWidth / 2);
  const y = (value: number) => top + plotHeight - (value / yMax) * plotHeight;

  const line = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.value)}`).join("");
  const area = points.length ? `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : "";
  // First, middle and last labels, so they never collide.
  const labelled = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])].filter((n) => n >= 0);

  function onMove(event: React.PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    setActive(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))));
  }

  const point = active !== null ? points[active] : null;

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="გრაფიკი" className="block overflow-visible">
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} strokeWidth="1" className="stroke-line" />
              <text
                x={left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                fontSize="11"
                className="fill-muted tabular-nums"
              >
                {compact.format(tick)}
              </text>
            </g>
          ))}
          {labelled.map((index) => (
            <text
              key={index}
              x={x(index)}
              y={height - 6}
              fontSize="11"
              className="fill-muted"
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
            >
              {points[index].label}
            </text>
          ))}
          <path d={area} fillOpacity="0.06" className="fill-ink" />
          <path d={line} fill="none" strokeWidth="2" className="stroke-ink" strokeLinejoin="round" strokeLinecap="round" />
          {point && active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={top} y2={top + plotHeight} strokeWidth="1" className="stroke-muted" />
              <circle cx={x(active)} cy={y(point.value)} r="5" strokeWidth="2" className="fill-ink stroke-bg" />
            </g>
          )}
          <rect
            x={left}
            y={0}
            width={plotWidth}
            height={height}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}
      {point && active !== null && (
        <div
          className={`pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-bg px-2.5 py-1.5 shadow-sm ${
            x(active) > width / 2 ? "-translate-x-full" : ""
          }`}
          // Beside the crosshair, on the side with more room, so it never covers the point.
          style={{ left: x(active) + (x(active) > width / 2 ? -10 : 10) }}
        >
          <p className="text-sm font-semibold tabular-nums">{point.value.toLocaleString("en-US")}</p>
          <p className="text-xs whitespace-nowrap text-muted">{point.label}</p>
        </div>
      )}
      {width === 0 && <div style={{ height }} />}
    </div>
  );
}

// Categories as horizontal bars with the value at the tip; the longest bar spans the row.
export function BarList({ bars, empty }: { bars: Point[]; empty: string }) {
  if (bars.length === 0) return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(...bars.map((bar) => bar.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {bars.map((bar) => (
        <li key={bar.label} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm">
          <span className="truncate" title={bar.label}>
            {bar.label}
          </span>
          <span className="flex items-center gap-2">
            <span
              className="h-3 rounded-r-[4px] bg-ink"
              style={{ width: `calc((100% - 3rem) * ${max ? bar.value / max : 0})`, minWidth: 2 }}
            />
            <span className="text-muted tabular-nums">{bar.value.toLocaleString("en-US")}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
