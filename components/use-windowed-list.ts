"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Page } from "@/lib/feed";

// A fast page still shows the skeleton this long, so it never flashes for a single frame.
const minLoadingMs = 600;
const wait = () => new Promise((resolve) => setTimeout(resolve, minLoadingMs));

type Window<T> = { all: T[]; start: number; end: number };

// Starts from the page the server rendered and keeps at most `max` items on the page. Past that,
// `step` items at the far end are taken off; they stay in memory. Both ends work the same way:
// while there is more beyond an end (`before`, `after`), the caller shows a skeleton there, and
// only once the reader scrolls all the way to it do the next `step` items come back, from memory
// or as a new page from `endpoint`. Each item's element needs a `data-post-id`, which keeps the
// scroll position steady while items above the screen come and go.
export function useWindowedList<T extends { id: string }>(
  first: Page<T>,
  endpoint: string,
  { step, max }: { step: number; max: number },
) {
  const [list, setList] = useState<Window<T>>({ all: first.items, start: 0, end: first.items.length });
  const [next, setNext] = useState(first.next);
  const [failed, setFailed] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  // An item on screen both before and after the window moves, and where it was on screen.
  const anchor = useRef<{ id: string; top: number } | null>(null);

  const move = useCallback((from: Window<T>, to: Window<T>) => {
    if (to.start !== from.start) {
      const id = to.all[Math.max(from.start, to.start)]?.id;
      const element = id && document.querySelector(`[data-post-id="${CSS.escape(id)}"]`);
      anchor.current = element ? { id, top: element.getBoundingClientRect().top } : null;
    }
    setList(to);
  }, []);

  // Items added or removed above the anchor would push it around; scroll it back to where it was.
  useLayoutEffect(() => {
    const saved = anchor.current;
    if (!saved) return;
    anchor.current = null;
    const element = document.querySelector(`[data-post-id="${CSS.escape(saved.id)}"]`);
    if (element) window.scrollBy(0, element.getBoundingClientRect().top - saved.top);
  }, [list.start]);

  const showLater = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setFailed(false);
    try {
      let { all } = list;
      if (list.end < all.length) {
        await wait();
      } else {
        if (!next) return;
        const [response] = await Promise.all([
          fetch(`${endpoint}${endpoint.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(next)}`),
          wait(),
        ]);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const page: Page<T> = await response.json();
        // A follow while scrolling can move a post across a page boundary; never show it twice.
        const seen = new Set(all.map((item) => item.id));
        all = [...all, ...page.items.filter((item) => !seen.has(item.id))];
        setNext(page.next);
      }
      const end = Math.min(list.end + step, all.length);
      move(list, { all, start: Math.max(list.start, end - max), end });
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
    }
  }, [endpoint, list, max, move, next, step]);

  const showEarlier = useCallback(async () => {
    if (busy.current || list.start === 0) return;
    busy.current = true;
    await wait();
    const start = Math.max(0, list.start - step);
    move(list, { all: list.all, start, end: Math.min(list.end, start + max) });
    busy.current = false;
  }, [list, max, move, step]);

  const before = list.start > 0;
  const after = list.end < list.all.length || !!next;

  // A new observer after every change reports at once if its edge is still on screen.
  useEffect(() => {
    const element = bottom.current;
    if (!element || !after || failed) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && showLater());
    observer.observe(element);
    return () => observer.disconnect();
  }, [after, failed, showLater]);

  useEffect(() => {
    const element = top.current;
    if (!element || !before) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && showEarlier());
    observer.observe(element);
    return () => observer.disconnect();
  }, [before, showEarlier]);

  return {
    items: list.all.slice(list.start, list.end),
    before,
    after: after && !failed,
    done: !after,
    failed,
    retry: showLater,
    top,
    bottom,
  };
}
