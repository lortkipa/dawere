"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useDismiss } from "./menu";
import { SearchIcon } from "./search-box";

export type SearchableTopic = { slug: string; title: string; text: string };

// The first sentence that mentions the first word, so a result shows why it matched.
function snippet(text: string, word: string) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.find((sentence) => sentence.toLowerCase().includes(word)) ?? sentences[0];
}

// Searches the help topics already on the page, so it answers as you type.
export function HelpSearch({ topics }: { topics: SearchableTopic[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  // Topics whose title matches come first.
  const inTitle = (topic: SearchableTopic) => words.some((word) => topic.title.toLowerCase().includes(word));
  const results = words.length
    ? topics
        .filter((topic) => {
          const haystack = `${topic.title} ${topic.text}`.toLowerCase();
          return words.every((word) => haystack.includes(word));
        })
        .sort((a, b) => Number(inTitle(b)) - Number(inTitle(a)))
    : [];

  return (
    <div ref={ref} className="relative text-left">
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
      <input
        type="search"
        aria-label="ძიება დახმარებაში"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="მოძებნე დახმარებაში"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) router.push(`/help/${results[0].slug}`);
          if (event.key === "Escape") setOpen(false);
        }}
        className="h-13 w-full rounded-xl border border-line bg-bg pl-12 pr-4 text-base text-ink shadow-sm outline-offset-0 transition-colors placeholder:text-faint focus:border-ink [&::-webkit-search-cancel-button]:appearance-none"
      />

      {open && words.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-96 overflow-y-auto rounded-xl border border-line bg-bg p-1.5 shadow-lg">
          {results.length > 0 ? (
            <ul>
              {results.map((topic) => (
                <li key={topic.slug}>
                  <Link href={`/help/${topic.slug}`} className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-hover">
                    <span className="block font-medium text-ink">{topic.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{snippet(topic.text, words[0])}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-[15px] text-muted">ვერაფერი მოიძებნა</p>
          )}
        </div>
      )}
    </div>
  );
}
