"use client";

import { useEffect, useRef } from "react";
import { recordView } from "@/app/actions/articles";

/**
 * Records one view, from the browser, once the article is actually on screen.
 * Counting during the render would credit link prefetches and re-renders too;
 * this fires on mount and nothing else. The ref survives React's double effect
 * invocation in development, so a dev page load still counts once.
 */
export function ViewPing({ articleId }: { articleId: string }) {
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;

    void recordView(articleId);
  }, [articleId]);

  return null;
}
