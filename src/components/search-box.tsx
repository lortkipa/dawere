'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, Hash, Loader2, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type Suggestions = {
  posts: { slug: string; title: string; author: string; readingMinutes: number }[];
  people: { username: string; name: string; avatarUrl: string | null }[];
  topics: { slug: string; name: string }[];
};

const EMPTY: Suggestions = { posts: [], people: [], topics: [] };

type Item = { href: string; label: string; meta: string; icon: 'post' | 'person' | 'topic' };

function flatten(s: Suggestions): Item[] {
  return [
    ...s.posts.map((p) => ({
      href: `/p/${p.slug}`,
      label: p.title,
      meta: `${p.author} · ${p.readingMinutes} წთ`,
      icon: 'post' as const,
    })),
    ...s.people.map((p) => ({
      href: `/u/${p.username}`,
      label: p.name,
      meta: `@${p.username}`,
      icon: 'person' as const,
    })),
    ...s.topics.map((t) => ({
      href: `/topic/${t.slug}`,
      label: t.name,
      meta: 'თემა',
      icon: 'topic' as const,
    })),
  ];
}

const ICONS = { post: FileText, person: User, topic: Hash };

export function SearchBox({ initialQuery = '', className }: { initialQuery?: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  // Results are stored with the query that produced them, so a stale response
  // is simply ignored rather than cleared by an extra render.
  const [results, setResults] = useState<{ query: string; data: Suggestions }>({
    query: '',
    data: EMPTY,
  });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const items = results.query === trimmed ? flatten(results.data) : [];

  // Debounced lookup. The abort controller stops an older, slower response from
  // overwriting a newer one.
  useEffect(() => {
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (res.ok) setResults({ query: trimmed, data: await res.json() });
      } catch {
        // Aborted or offline — leave the previous suggestions in place.
      } finally {
        setLoading(false);
      }
    }, 160);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmed]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    setHighlighted(-1);
    inputRef.current?.blur();
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlighted((i) => (i + 1) % Math.max(items.length, 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((i) => (i <= 0 ? items.length - 1 : i - 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const picked = items[highlighted];
      if (picked) go(picked.href);
      else if (trimmed) go(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  const showDropdown = open && trimmed.length >= 2;

  // The search page has its own, larger field; a second one up here would only
  // compete with it. The placeholder keeps the header's middle column in place.
  if (pathname === '/search') return <span />;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlighted(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="ძიება…"
          aria-label="ძიება"
          className="h-9 w-full rounded-full border border-transparent bg-sunken pl-9 pr-9 text-sm text-ink placeholder:text-subtle transition-colors hover:border-line-strong focus:border-accent focus:bg-raised focus:outline-none focus:ring-2 focus:ring-accent/20 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-subtle" />
        ) : query ? null : (
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-md border border-line bg-raised px-1.5 py-0.5 font-sans text-[11px] text-subtle lg:block">
            Ctrl K
          </kbd>
        )}
      </div>

      {showDropdown ? (
        <div className="animate-pop-in absolute top-11 right-0 z-50 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-raised shadow-lift">
          {items.length === 0 && !loading ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              „{trimmed}“ ჯერ ვერაფერს დაემთხვა.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {items.map((item, index) => {
                const Icon = ICONS[item.icon];
                return (
                  <li key={`${item.icon}-${item.href}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => go(item.href)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors',
                        index === highlighted ? 'bg-hover' : 'bg-transparent',
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-subtle" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{item.label}</span>
                        <span className="block truncate text-[13px] text-subtle">{item.meta}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={() => go(`/search?q=${encodeURIComponent(trimmed)}`)}
            className="flex w-full items-center gap-2 border-t border-line px-3.5 py-2.5 text-left text-sm text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <Search className="size-4" />
            ყველა შედეგი „{trimmed}“-ისთვის
          </button>
        </div>
      ) : null}
    </div>
  );
}
