'use client';

import { useState } from 'react';
import { cn, formatCount, formatDayShort, formatMonthYear } from '@/lib/utils';

/** `day` is the first day of the bar's bucket. */
export type DayPoint = { day: string; views: number };
export type Bucket = 'day' | 'week' | 'month';

/** What one bar covers, for the tooltip and the table. */
function bucketLabel(day: string, bucket: Bucket): string {
  if (bucket === 'month') return formatMonthYear(day);
  if (bucket === 'week') return `${formatDayShort(day)} – ${formatDayShort(new Date(new Date(day).getTime() + 6 * 86_400_000))}`;
  return formatDayShort(day);
}

/** The axis names only where a bar starts. */
const axisLabel = (day: string, bucket: Bucket) => (bucket === 'month' ? formatMonthYear(day) : formatDayShort(day));

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
export function ViewsChart({
  data,
  className,
  title = 'ნახვები, ბოლო 30 დღე',
  unit = 'ნახვა',
  column = 'ნახვები',
  bucket = 'day',
}: {
  data: DayPoint[];
  /** How many days each bar sums; weekly bars end today, monthly ones are calendar months. */
  bucket?: Bucket;
  className?: string;
  /** The same bars serve other daily counts (sign-ups in the admin overview). */
  title?: string;
  unit?: string;
  column?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const peak = Math.max(0, ...data.map((d) => d.views));
  const top = niceMax(peak);
  const total = data.reduce((sum, d) => sum + d.views, 0);
  // Daily bars compare the last seven days; wider bars compare the last two bars.
  const span = bucket === 'day' ? 7 : 1;
  const current = data.slice(-span).reduce((sum, d) => sum + d.views, 0);
  const previous = data.slice(-2 * span, -span).reduce((sum, d) => sum + d.views, 0);
  const active = hovered === null ? null : data[hovered];

  // Keep the tooltip inside the plot near either edge.
  const tooltipLeft = hovered === null ? 0 : ((hovered + 0.5) / data.length) * 100;
  const tooltipShift = tooltipLeft < 12 ? '0%' : tooltipLeft > 88 ? '-100%' : '-50%';

  return (
    <figure className={cn('relative', className)}>
      <figcaption className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <span className="headline text-[1.15rem] text-ink">{title}</span>
          <p className="mt-1 text-[13px] text-subtle">
            {bucket === 'month' ? 'ეს თვე' : 'ეს კვირა'}: {formatCount(current)} · წინა: {formatCount(previous)}
          </p>
        </div>
        <span className="font-serif text-[1.9rem] leading-none font-semibold tracking-tight text-ink tabular-nums">{formatCount(total)}</span>
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
                aria-label={`${bucketLabel(point.day, bucket)}: ${point.views} ${unit}`}
              >
                <span
                  className={cn(
                    'w-full rounded-t-[3px] bg-chart-1 transition-opacity',
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
            className="pointer-events-none absolute -top-3 z-10 rounded-lg border border-line bg-raised px-2.5 py-1.5 text-[13px] whitespace-nowrap shadow-lift"
            style={{ left: `calc(2rem + (100% - 2rem) * ${tooltipLeft / 100})`, transform: `translate(${tooltipShift}, -100%)` }}
          >
            <span className="font-semibold text-ink tabular-nums">{formatCount(active.views)} {unit}</span>
            <span className="ml-1.5 text-subtle">{bucketLabel(active.day, bucket)}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-2.5 flex justify-between pl-8 text-[12px] text-subtle">
        <span>{data.length > 0 ? axisLabel(data[0].day, bucket) : ''}</span>
        <span>{data.length > 15 ? axisLabel(data[Math.floor(data.length / 2)].day, bucket) : ''}</span>
        <span>{data.length > 0 ? axisLabel(data[data.length - 1].day, bucket) : ''}</span>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-[13px] text-subtle transition-colors hover:text-muted">
          ცხრილის სახით
        </summary>
        <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-sunken">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-medium text-muted">{bucket === 'month' ? 'თვე' : bucket === 'week' ? 'კვირა' : 'დღე'}</th>
                <th scope="col" className="px-3 py-1.5 text-right font-medium text-muted">{column}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.day} className="border-t border-line">
                  <td className="px-3 py-1.5 text-muted">{bucketLabel(point.day, bucket)}</td>
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
