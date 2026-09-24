import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { buttonClass } from '@/components/ui';
import { cn, formatCount } from '@/lib/utils';

/**
 * Pill tabs that are real links, so every tab has its own URL. The strip
 * scrolls sideways on phones rather than wrapping.
 */
export function Tabs({
  tabs,
  active,
  label = 'ჩანართები',
  className,
}: {
  tabs: { key: string; label: string; href: string; count?: number }[];
  active: string;
  label?: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn('no-scrollbar fade-x overflow-x-auto sm:[mask-image:none]', className)}>
      <div className="flex w-max gap-1.5 pr-6 sm:pr-0">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors',
                isActive ? 'bg-primary text-primary-contrast' : 'text-muted hover:bg-hover hover:text-ink',
              )}
            >
              {tab.label}
              {tab.count !== undefined ? (
                <span className={cn('text-[13px] tabular-nums', isActive ? 'opacity-65' : 'text-subtle')}>
                  {formatCount(tab.count)}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** A compact pill switch for small option sets (sort orders, filters). */
export function Segmented({
  options,
  active,
  label,
  className,
}: {
  options: { key: string; label: string; href: string }[];
  active: string;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn('inline-flex rounded-full bg-sunken p-1', className)}>
      {options.map((option) => {
        const isActive = option.key === active;
        return (
          <Link
            key={option.key}
            href={option.href}
            aria-current={isActive ? 'true' : undefined}
            scroll={false}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
              isActive ? 'bg-raised text-ink shadow-soft ring-1 ring-line' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
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
    <nav className="flex items-center justify-between gap-3 pt-4" aria-label="გვერდები">
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
