"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Page } from "@/lib/feed";

// A fast page still shows the skeleton this long, so it never flashes for a single frame.
const minLoadingMs = 600;
const wait = () => new Promise((resolve) => setTimeout(resolve, minLoadingMs));

// Which groups are on the page, and the height of the empty space standing in for the rest.
type Shown = { from: number; to: number; above: number; below: number };

// Starts from the page the server rendered and fetches the next one from `endpoint` only once the
// reader scrolls all the way to the end (`after` says one is still to come, so the caller can keep
// a skeleton there). Items are kept in groups of `step`, the server's page size. Only the groups
// within a screen of what the reader sees are on the page; every other group is replaced by empty
// space of the height it had, so the page never moves and the scrollbar stays true. All items stay
// in memory, and a group comes back before the reader reaches it.
//
// The caller renders `above` px of space, then each of `groups` in an element with
// `ref={groupRef}` and `data-group={index}`, then `below` px of space, all inside `list`.
export function useWindowedList<T extends { id: string }>(first: Page<T>, endpoint: string, step: number) {
  const [all, setAll] = useState(first.items);
  const [next, setNext] = useState(first.next);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState<Shown>({ from: 0, to: 1, above: 0, below: 0 });
  const list = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  // The last measured height of every group that has been on the page, by group index.
  const heights = useRef(new Map<number, number>());
  const resizes = useRef<ResizeObserver | null>(null);

  const count = Math.ceil(all.length / step);

  // Puts on the page the groups that overlap the screen or the screen above or below it.
  const update = useCallback(() => {
    const element = list.current;
    if (!element) return;
    const origin = element.getBoundingClientRect().top + window.scrollY;
    const low = window.scrollY - window.innerHeight;
    const high = window.scrollY + 2 * window.innerHeight;
    let from = -1;
    let to = -1;
    let top = origin;
    for (let index = 0; index < count; index++) {
      const height = heights.current.get(index);
      // A group that hasn't been measured yet is new at the end; it goes on the page.
      if (height === undefined || (top < high && top + height > low)) {
        if (from < 0) from = index;
        to = index + 1;
      }
      if (height === undefined) break;
      top += height;
    }
    // Only if stale heights put the screen past every group.
    if (from < 0) [from, to] = [count - 1, count];
    let above = 0;
    let below = 0;
    for (let index = 0; index < count; index++) {
      if (index < from) above += heights.current.get(index) ?? 0;
      else if (index >= to) below += heights.current.get(index) ?? 0;
    }
    setShown((current) =>
      current.from === from && current.to === to && current.above === above && current.below === below
        ? current
        : { from, to, above, below },
    );
  }, [count]);

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => ((frame = 0), update()));
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [update]);

  // Keeps every group's height current while it's on the page. A group coming back can measure
  // differently from when it left (the window was resized meanwhile); if it sits above the screen,
  // the difference is scrolled away so what the reader sees doesn't move.
  const groupRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    resizes.current ??= new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        const index = Number(target.dataset.group);
        const height = entry.borderBoxSize[0]?.blockSize ?? target.offsetHeight;
        const before = heights.current.get(index);
        heights.current.set(index, height);
        if (before !== undefined && height !== before && target.getBoundingClientRect().bottom <= 0) {
          window.scrollBy(0, height - before);
        }
      }
    });
    resizes.current.observe(element);
    return () => resizes.current?.unobserve(element);
  }, []);

  const showLater = useCallback(async () => {
    if (busy.current || !next) return;
    busy.current = true;
    setFailed(false);
    try {
      const [response] = await Promise.all([
        fetch(`${endpoint}${endpoint.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(next)}`),
        wait(),
      ]);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const page: Page<T> = await response.json();
      // A follow while scrolling can move a post across a page boundary; never show it twice.
      const seen = new Set(all.map((item) => item.id));
      const merged = [...all, ...page.items.filter((item) => !seen.has(item.id))];
      setAll(merged);
      // The new posts go on the page at once, in place of the skeleton.
      setShown((current) => ({ ...current, to: Math.ceil(merged.length / step) }));
      setNext(page.next);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
    }
  }, [all, endpoint, next, step]);

  // A new observer after every page reports at once if the end is still on screen.
  useEffect(() => {
    const element = bottom.current;
    if (!element || !next || failed) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && showLater());
    observer.observe(element);
    return () => observer.disconnect();
  }, [next, failed, showLater]);

  useEffect(() => () => resizes.current?.disconnect(), []);

  const groups = [];
  for (let index = shown.from; index < Math.min(shown.to, count); index++) {
    groups.push({ index, items: all.slice(index * step, (index + 1) * step) });
  }

  return {
    groups,
    above: shown.above,
    below: shown.below,
    empty: all.length === 0,
    after: !!next && !failed,
    done: !next,
    failed,
    retry: showLater,
    list,
    groupRef,
    bottom,
  };
}
