'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, CornerDownLeft, FileText, Hash, Loader2, Search, User } from 'lucide-react';
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

/** Triggers and the dialog talk through one window event, so any number of
    buttons can open the single dialog mounted in the layout. */
const OPEN_EVENT = 'dawere:open-search';

export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** The button that opens search: a field-shaped one for the sidebar, or an icon. */
export function SearchTrigger({ variant = 'icon', className }: { variant?: 'field' | 'icon'; className?: string }) {
  if (variant === 'field') {
    return (
      <button
        type="button"
        onClick={openSearch}
        className={cn(
          'flex h-9 w-full items-center gap-2.5 rounded-lg border border-line bg-sunken px-3 text-sm text-subtle transition-colors hover:border-line-strong hover:text-muted',
          className,
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 text-left">ძიება</span>
        <kbd className="rounded border border-line bg-raised px-1.5 font-sans text-[11px] leading-5">Ctrl K</kbd>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label="ძიება"
      className={cn(
        'flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink',
        className,
      )}
    >
      <Search className="size-[18px]" />
    </button>
  );
}

/**
 * Site-wide search as a command palette: Ctrl/⌘ K or any SearchTrigger opens
 * it, suggestions arrive as you type, Enter goes to the highlighted result or
 * to the full results page.
 */
export function SearchDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  // Results are stored with the query that produced them, so a stale response
  // is simply ignored rather than cleared by an extra render.
  const [results, setResults] = useState<{ query: string; data: Suggestions }>({ query: '', data: EMPTY });
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const trimmed = query.trim();
  const items = results.query === trimmed ? flatten(results.data) : [];

  useEffect(() => {
    function open() {
      const dialog = dialogRef.current;
      if (!dialog || dialog.open) return;
      dialog.showModal();
      inputRef.current?.select();
    }
    function onKey(event: KeyboardEvent) {
      // The search page has its own field and its own Ctrl K.
      if ((event.metaKey || event.ctrlKey) && event.key === 'k' && window.location.pathname !== '/search') {
        event.preventDefault();
        open();
      }
    }
    window.addEventListener(OPEN_EVENT, open);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, open);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Navigating anywhere closes the palette.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

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

  function go(href: string) {
    dialogRef.current?.close();
    setHighlighted(-1);
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
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

  const searching = trimmed.length >= 2;

  return (
    <dialog
      ref={dialogRef}
      aria-label="ძიება"
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
      className="mx-auto mt-[10vh] w-[min(38rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-raised p-0 text-ink shadow-lift"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        {loading ? (
          <Loader2 className="size-[18px] shrink-0 animate-spin text-subtle" />
        ) : (
          <Search className="size-[18px] shrink-0 text-subtle" />
        )}
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(-1);
          }}
          onKeyDown={onKeyDown}
          placeholder="სტატია, ავტორი ან თემა…"
          aria-label="ძიება"
          autoComplete="off"
          enterKeyHint="search"
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-subtle focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        <kbd className="hidden rounded border border-line bg-sunken px-1.5 font-sans text-[11px] leading-5 text-subtle sm:block">
          Esc
        </kbd>
      </div>

      {!searching ? (
        <p className="px-4 py-8 text-center text-sm text-subtle">ჩაწერე მინიმუმ ორი ასო.</p>
      ) : items.length === 0 && !loading && results.query === trimmed ? (
        <p className="px-4 py-8 text-center text-sm text-muted">„{trimmed}“ ჯერ ვერაფერს დაემთხვა.</p>
      ) : items.length > 0 ? (
        <ul className="max-h-[min(24rem,55vh)] overflow-y-auto p-1.5">
          {items.map((item, index) => {
            const Icon = ICONS[item.icon];
            const active = index === highlighted;
            return (
              <li key={`${item.icon}-${item.href}`}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => go(item.href)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                    active ? 'bg-hover' : 'bg-transparent',
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-sunken text-muted">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{item.label}</span>
                    <span className="block truncate text-[12px] text-subtle">{item.meta}</span>
                  </span>
                  {active ? <CornerDownLeft className="size-3.5 shrink-0 text-subtle" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="h-24" aria-hidden />
      )}

      {searching ? (
        <button
          type="button"
          onClick={() => go(`/search?q=${encodeURIComponent(trimmed)}`)}
          className="flex w-full items-center gap-2 border-t border-line bg-sunken/60 px-4 py-3 text-left text-sm text-muted transition-colors hover:bg-hover hover:text-ink"
        >
          <span className="min-w-0 flex-1 truncate">ყველა შედეგი „{trimmed}“-ისთვის</span>
          <ArrowRight className="size-4 shrink-0" />
        </button>
      ) : null}
    </dialog>
  );
}
