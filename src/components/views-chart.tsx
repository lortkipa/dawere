'use client';

import { useState } from 'react';
import { cn, formatCount, formatDayShort } from '@/lib/utils';

export type DayPoint = { day: string; views: number };

/** A tidy axis top: 1, 2, 5 × 10ⁿ at or above the peak, so gridlines land on round numbers. */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

/**
 * Daily views, one series. The title names the series, so there is no legend;
 * bars are anchored to the baseline with rounded data-ends and a 2px gap, and
 * every bar has a hover tooltip placed over it. The same numbers are available
 * as a table for screen readers and for anyone who wants the values.
 */
export function ViewsChart({ data, className }: { data: DayPoint[]; className?: string }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const peak = Math.max(0, ...data.map((d) => d.views));
  const top = niceMax(peak);
  const total = data.reduce((sum, d) => sum + d.views, 0);
  const lastWeek = data.slice(-7).reduce((sum, d) => sum + d.views, 0);
  const weekBefore = data.slice(-14, -7).reduce((sum, d) => sum + d.views, 0);
  const active = hovered === null ? null : data[hovered];

  // Keep the tooltip inside the plot near either edge.
  const tooltipLeft = hovered === null ? 0 : ((hovered + 0.5) / data.length) * 100;
  const tooltipShift = tooltipLeft < 12 ? '0%' : tooltipLeft > 88 ? '-100%' : '-50%';

  return (
    <figure className={cn('relative', className)}>
      <figcaption className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <span className="text-sm font-semibold text-ink">ნახვები, ბოლო 30 დღე</span>
          <p className="mt-0.5 text-[13px] text-subtle">
            ეს კვირა: {formatCount(lastWeek)} · წინა: {formatCount(weekBefore)}
          </p>
        </div>
        <span className="font-serif text-2xl font-bold text-ink tabular-nums">{formatCount(total)}</span>
      </figcaption>

      <div className="relative pl-8">
        {/* Recessive gridlines at the top, the middle and the baseline. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 left-8" aria-hidden>
          {[1, 0.5, 0].map((fraction) => (
            <div
              key={fraction}
              className={cn(
                'absolute inset-x-0 border-t',
                fraction === 0 ? 'border-line' : 'border-dashed border-chart-grid',
              )}
              style={{ bottom: `${fraction * 100}%` }}
            >
              <span className="absolute -top-2 -left-8 w-6 text-right text-[11px] text-subtle tabular-nums">
                {formatCount(Math.round(top * fraction))}
              </span>
            </div>
          ))}
        </div>

        <div className="relative flex h-40 items-end gap-0.5" role="presentation">
          {data.map((point, index) => {
            const height = point.views === 0 ? 0 : Math.max(3, (point.views / top) * 100);
            return (
              <button
                key={point.day}
                type="button"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                className="relative flex h-full flex-1 items-end focus-visible:outline-offset-0"
                aria-label={`${formatDayShort(point.day)}: ${point.views} ნახვა`}
              >
                <span
                  className={cn(
                    'w-full rounded-t-[4px] bg-chart-1 transition-opacity',
                    hovered !== null && hovered !== index ? 'opacity-40' : 'opacity-100',
                  )}
                  style={{ height: `${height}%` }}
                />
              </button>
            );
          })}
        </div>

        {active ? (
          <div
            className="pointer-events-none absolute -top-3 z-10 rounded-xl border border-line bg-raised px-3 py-2 text-[13px] whitespace-nowrap shadow-lift"
            style={{ left: `calc(2rem + (100% - 2rem) * ${tooltipLeft / 100})`, transform: `translate(${tooltipShift}, -100%)` }}
          >
            <span className="font-semibold text-ink tabular-nums">{formatCount(active.views)} ნახვა</span>
            <span className="ml-1.5 text-subtle">{formatDayShort(active.day)}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-2.5 flex justify-between pl-8 text-[12px] text-subtle">
        <span>{data.length > 0 ? formatDayShort(data[0].day) : ''}</span>
        <span>{data.length > 15 ? formatDayShort(data[Math.floor(data.length / 2)].day) : ''}</span>
        <span>{data.length > 0 ? formatDayShort(data[data.length - 1].day) : ''}</span>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-[13px] text-subtle transition-colors hover:text-muted">
          ცხრილის სახით
        </summary>
        <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-sunken">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-medium text-muted">დღე</th>
                <th scope="col" className="px-3 py-1.5 text-right font-medium text-muted">ნახვები</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.day} className="border-t border-line">
                  <td className="px-3 py-1.5 text-muted">{formatDayShort(point.day)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink">{point.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
