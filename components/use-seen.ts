"use client";

import { useCallback, useEffect, useRef } from "react";

// How long a card has to stay mostly on screen to count as seen.
const dwellMs = 1000;
const flushMs = 4000;

// Reports feed cards the reader actually had on screen to /api/seen, in batches. Returns a ref
// callback for each card; the card's element needs a `data-post-id`. Signed-out readers have
// nothing to record, so `enabled` is false for them.
export function useSeen(enabled = true) {
  const queue = useRef(new Set<string>());
  const reported = useRef(new Set<string>());
  const timers = useRef(new Map<string, number>());
  const observer = useRef<IntersectionObserver | null>(null);
  // Every card on the page. Refs attach before the effect makes the observer, so it picks them up.
  const elements = useRef(new Set<HTMLElement>());

  const flush = useCallback((beacon = false) => {
    if (queue.current.size === 0) return;
    const ids = [...queue.current].slice(0, 50);
    ids.forEach((id) => queue.current.delete(id));
    const body = JSON.stringify(ids);
    if (beacon) navigator.sendBeacon("/api/seen", new Blob([body], { type: "application/json" }));
    else
      fetch("/api/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const pending = timers.current;
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.postId;
          if (!id || reported.current.has(id)) continue;
          if (entry.isIntersecting) {
            if (pending.has(id)) continue;
            pending.set(
              id,
              window.setTimeout(() => {
                pending.delete(id);
                reported.current.add(id);
                queue.current.add(id);
                observer.current?.unobserve(entry.target);
              }, dwellMs),
            );
          } else {
            window.clearTimeout(pending.get(id));
            pending.delete(id);
          }
        }
      },
      { threshold: 0.6 },
    );
    elements.current.forEach((element) => observer.current!.observe(element));
    const interval = window.setInterval(() => flush(), flushMs);
    const onHide = () => flush(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      observer.current?.disconnect();
      observer.current = null;
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
      window.clearInterval(interval);
      window.removeEventListener("pagehide", onHide);
      flush(true);
    };
  }, [enabled, flush]);

  return useCallback((element: HTMLElement | null) => {
    if (!element) return;
    elements.current.add(element);
    observer.current?.observe(element);
    return () => {
      elements.current.delete(element);
      observer.current?.unobserve(element);
      // A card taken off the page before its dwell time is up doesn't count as seen.
      const id = element.dataset.postId;
      if (id) {
        window.clearTimeout(timers.current.get(id));
        timers.current.delete(id);
      }
    };
  }, []);
}
