"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Page } from "@/lib/feed";

// Starts from the page the server rendered and fetches the next one from `endpoint` well before
// the reader reaches the end of the list.
export function useInfiniteList<T extends { id: string }>(first: Page<T>, endpoint: string) {
  const [items, setItems] = useState(first.items);
  const [next, setNext] = useState(first.next);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!next || busy.current) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch(
        `${endpoint}${endpoint.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(next)}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const page: Page<T> = await response.json();
      // A follow while scrolling can move a post across a page boundary; never show it twice.
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !seen.has(item.id))];
      });
      setNext(page.next);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [endpoint, next]);

  // A new observer after every page reports at once if the end is still in reach, so short pages
  // keep loading until the screen is full.
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !next || failed) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && load(), {
      rootMargin: "800px 0px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [next, failed, load]);

  return { items, done: !next, loading, failed, retry: load, sentinel };
}
