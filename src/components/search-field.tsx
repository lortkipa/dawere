'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The search page's own field. It is a plain GET form, so it works before
 * hydration; once hydrated, submitting navigates inside a transition, which is
 * what drives the spinner while the results below are replaced in place.
 *
 * The page remounts it (via `key`) whenever the query in the URL changes, so a
 * "did you mean" link or the back button always leaves the field in sync.
 */
export function SearchField({
  defaultValue = '',
  tab,
  autoFocus,
  className,
}: {
  defaultValue?: string;
  /** Kept across a new search, so refining a query stays on the same tab. */
  tab?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const keepTab = tab && tab !== 'all' ? tab : null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    const params = new URLSearchParams({ q });
    if (keepTab) params.set('tab', keepTab);
    // Blurring drops the on-screen keyboard so the results are visible on phones.
    inputRef.current?.blur();
    startTransition(() => router.push(`/search?${params}`));
  }

  return (
    <form action="/search" role="search" onSubmit={onSubmit} className={cn('relative', className)}>
      {keepTab ? <input type="hidden" name="tab" value={keepTab} /> : null}

      <Search className="pointer-events-none absolute left-4.5 top-1/2 size-5 -translate-y-1/2 text-subtle" />
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoFocus={autoFocus}
        maxLength={200}
        enterKeyHint="search"
        autoComplete="off"
        placeholder="სტატია, ავტორი ან თემა"
        aria-label="ძიება"
        className={cn(
          'h-14 w-full rounded-2xl border border-line bg-raised pl-12.5 text-base',
          value ? 'pr-24' : 'pr-14',
          'text-ink shadow-sm shadow-black/[0.03] transition-[border-color,box-shadow] placeholder:text-subtle hover:border-line-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 [&::-webkit-search-cancel-button]:appearance-none',
        )}
      />

      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {value && !pending ? (
          <button
            type="button"
            onClick={() => {
              setValue('');
              inputRef.current?.focus();
            }}
            aria-label="გასუფთავება"
            className="flex size-9 items-center justify-center rounded-full text-subtle transition-colors hover:bg-hover hover:text-ink"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <button
          type="submit"
          aria-label="ძიება"
          disabled={pending}
          className={cn(
            'flex size-10 items-center justify-center rounded-xl transition-colors',
            value.trim()
              ? 'bg-primary text-primary-contrast hover:bg-primary-hover'
              : 'bg-sunken text-subtle',
          )}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        </button>
      </div>
    </form>
  );
}
