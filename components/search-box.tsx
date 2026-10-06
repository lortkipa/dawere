"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Suggestions } from "@/lib/search";
import { Avatar } from "./avatar";
import { useDismiss } from "./menu";
import { Bone } from "./skeleton";

const debounceMs = 250;

// Search ignores words shorter than two letters (lib/search.ts), so nothing is fetched before one.
export function hasSearchWord(query: string) {
  return /[\p{L}\p{N}]{2}/u.test(query);
}

export function searchUrl(query: string) {
  return `/search?q=${encodeURIComponent(query.trim())}`;
}

type Option = { href: string };

type OptionProps = {
  id: string;
  role: "option";
  "aria-selected": boolean;
  href: string;
  onClick: () => void;
  onMouseMove: () => void;
  className: string;
};

// The header's magnifier. It opens an input whose dropdown shows the best few posts and authors as
// the reader types; Enter opens the full results at /search. On phones the input covers the
// header row.
export function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<{ query: string; suggestions: Suggestions } | null>(null);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();

  // Set when Escape or the back arrow closes the box, so the magnifier gets the focus back.
  const refocus = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);
  useDismiss(open, ref, close);

  const dismiss = () => {
    refocus.current = true;
    close();
  };

  useEffect(() => {
    if (open || !refocus.current) return;
    refocus.current = false;
    trigger.current?.focus();
  }, [open]);

  const searchable = hasSearchWord(query);

  useEffect(() => {
    if (!open || !searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) return;
        setResults({ query, suggestions: await response.json() });
        setActive(-1);
      } catch {
        // Aborted by the next keystroke, or offline: the last results stay.
      }
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, searchable]);

  const suggestions = searchable ? results?.suggestions : undefined;
  const options: Option[] = suggestions
    ? [...suggestions.posts, ...suggestions.authors, { href: searchUrl(query) }]
    : [];

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (options.length === 0) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      // Cycles through the options and back to none, which leaves the typed query in charge.
      setActive((current) => ((current + 1 + step + options.length + 1) % (options.length + 1)) - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (active >= 0 && options[active]) go(options[active].href);
      else if (searchable) go(searchUrl(query));
    } else if (event.key === "Escape") {
      dismiss();
    }
  };

  if (!open) {
    return (
      <button
        ref={trigger}
        type="button"
        aria-label="ძიება"
        onClick={() => setOpen(true)}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface"
      >
        <SearchIcon className="size-5" />
      </button>
    );
  }

  // Options are numbered in the order they show: posts, authors, then all results.
  const optionProps = (index: number, href: string): OptionProps => ({
    id: `${listId}-${index}`,
    role: "option",
    "aria-selected": active === index,
    href,
    onClick: close,
    onMouseMove: () => setActive(index),
    className: `flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${active === index ? "bg-hover" : ""}`,
  });

  return (
    // On phones the whole header row; from sm up, an input among the header's buttons.
    <div
      ref={ref}
      className="absolute inset-0 z-10 flex items-center gap-1 bg-bg px-2 sm:static sm:z-auto sm:bg-transparent sm:px-0"
    >
      <button
        type="button"
        aria-label="დახურვა"
        onClick={dismiss}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface sm:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
        <input
          type="search"
          role="combobox"
          aria-label="ძიება"
          aria-expanded={searchable}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          enterKeyHint="search"
          autoFocus
          autoComplete="off"
          placeholder="მოძებნე ბლოგები და ავტორები"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-lg border border-line bg-bg pl-10 pr-3 text-[15px] text-ink outline-offset-0 transition-colors placeholder:text-faint focus:border-ink [&::-webkit-search-cancel-button]:appearance-none"
        />

        {searchable && (
          <div
            id={listId}
            role="listbox"
            aria-label="ძიების შედეგები"
            className="fixed inset-x-3 top-[4.25rem] z-20 max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-xl border border-line bg-bg p-1.5 shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[26rem]"
          >
            {/* While the next results load, the last ones stay. */}
            {suggestions ? <Results suggestions={suggestions} optionProps={optionProps} query={query} /> : <Loading />}
          </div>
        )}
      </div>
    </div>
  );
}

function Results({
  suggestions,
  optionProps,
  query,
}: {
  suggestions: Suggestions;
  optionProps: (index: number, href: string) => OptionProps;
  query: string;
}) {
  const { posts, authors } = suggestions;
  const nothing = posts.length === 0 && authors.length === 0;
  return (
    <>
      {nothing && <p className="px-3 py-2 text-[15px] text-muted">ვერაფერი მოიძებნა</p>}
      {posts.length > 0 && (
        <div role="group" aria-label="ბლოგები">
          <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">ბლოგები</p>
          {posts.map((post, index) => (
            <Link key={post.href} {...optionProps(index, post.href)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">{post.title}</span>
                <span className="block truncate text-sm text-muted">{post.author}</span>
              </span>
              {post.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.cover} alt="" className="h-9 w-14 shrink-0 rounded bg-surface object-cover" />
              )}
            </Link>
          ))}
        </div>
      )}
      {authors.length > 0 && (
        <div role="group" aria-label="ავტორები">
          <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">ავტორები</p>
          {authors.map((author, index) => (
            <Link key={author.href} {...optionProps(posts.length + index, author.href)}>
              <Avatar src={author.avatar} className="size-8" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">{author.name}</span>
                <span className="block truncate text-sm text-muted">@{author.handle}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
      <div className="mt-1.5 border-t border-line pt-1.5">
        <Link {...optionProps(posts.length + authors.length, searchUrl(query))}>
          <SearchIcon className="size-[18px] shrink-0 text-muted" />
          <span className="text-[15px] text-ink">ყველა შედეგი</span>
        </Link>
      </div>
    </>
  );
}

function Loading() {
  return (
    <div role="status" className="p-1.5">
      <span className="sr-only">იტვირთება</span>
      <div aria-hidden="true" className="flex flex-col gap-3 px-1.5 py-1.5">
        {["w-4/5", "w-3/5", "w-2/3"].map((width) => (
          <div key={width}>
            <Bone className={`h-4 ${width}`} />
            <Bone className="mt-1.5 h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
