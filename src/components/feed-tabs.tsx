import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { buttonClass } from '@/components/ui';
import { cn } from '@/lib/utils';

export function Tabs({
  tabs,
  active,
  className,
}: {
  tabs: { key: string; label: string; href: string }[];
  active: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* The baseline is an inset shadow rather than a border: a scrolling strip
          clips anything that hangs below it, so a -1px underline overlap would
          vanish. The fade only matters when the strip overflows, on phones. */}
      <div className="no-scrollbar fade-x flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)] sm:[mask-image:none]">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'border-ink text-ink'
                  : 'border-transparent text-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
        <span className="w-6 shrink-0 sm:hidden" aria-hidden />
      </div>
    </div>
  );
}

export function Pagination({
  basePath,
  page,
  hasMore,
  labels = { prev: 'უფრო ახალი', next: 'უფრო ძველი' },
}: {
  basePath: string;
  page: number;
  hasMore: boolean;
  /** Feeds page through time; lists in any other order need neutral labels. */
  labels?: { prev: string; next: string };
}) {
  if (page === 1 && !hasMore) return null;
  const join = (n: number) =>
    n === 1 ? basePath : `${basePath}${basePath.includes('?') ? '&' : '?'}page=${n}`;

  return (
    <nav className="flex items-center justify-between gap-3 border-t border-line pt-6" aria-label="გვერდები">
      {page > 1 ? (
        <Link href={join(page - 1)} className={buttonClass({ variant: 'outline', size: 'sm' })}>
          <ArrowLeft />
          {labels.prev}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-[13px] text-subtle tabular-nums">გვერდი {page}</span>
      {hasMore ? (
        <Link href={join(page + 1)} className={buttonClass({ variant: 'outline', size: 'sm' })}>
          {labels.next}
          <ArrowRight />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
