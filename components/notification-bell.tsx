"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// The list on /notifications sends this once it has marked everything seen.
export const seenEvent = "notifications-seen";

// Checks again this often while the tab is in front.
const pollMs = 60_000;

// The header's link to /notifications, with the number of unread ones. It asks the server on every
// page change, every minute and whenever the tab comes back to the front.
export function NotificationBell() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  // Bumped when the list marks everything seen, so an answer already on its way can't bring the
  // old number back.
  const generation = useRef(0);

  useEffect(() => {
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      const started = generation.current;
      try {
        const response = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (!response.ok) return;
        const { count } = (await response.json()) as { count: number };
        if (generation.current === started) setCount(count);
      } catch {
        // Offline; the next check tries again.
      }
    };
    const seen = () => {
      generation.current++;
      setCount(0);
    };

    load();
    const timer = setInterval(load, pollMs);
    document.addEventListener("visibilitychange", load);
    window.addEventListener(seenEvent, seen);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
      window.removeEventListener(seenEvent, seen);
    };
  }, [pathname]);

  const label = count > 99 ? "99+" : String(count);

  return (
    <Link
      href="/notifications"
      aria-label={count ? `შეტყობინებები: ${label} ახალი` : "შეტყობინებები"}
      className="relative flex size-10 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface"
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
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-bg bg-ink px-1 text-[10px] leading-none font-bold text-bg"
        >
          {label}
        </span>
      )}
    </Link>
  );
}
