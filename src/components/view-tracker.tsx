'use client';

import { useEffect } from 'react';

/**
 * Records one view per reader per day. Runs after paint so it never delays the
 * article, and the server enforces the de-duplication.
 */
export function ViewTracker({ postId, fromSearch }: { postId: string; fromSearch: boolean }) {
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch(`/api/posts/${postId}/view${fromSearch ? '?from=search' : ''}`, {
        method: 'POST',
        signal: controller.signal,
        keepalive: true,
      }).catch(() => {
        // A failed view count is not worth surfacing to the reader.
      });
    }, 900);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [postId, fromSearch]);

  return null;
}
