"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { formatCount } from "@/lib/format-count";
import { authUrl } from "@/lib/return-to";

// Like useFollow: the heart and count change at once, and the page refresh brings the stored
// values; if the action fails, the server values come back.
export function useLike(liked: boolean, count: number, save: (like: boolean) => Promise<void>) {
  const [optimistic, setOptimistic] = useOptimistic({ liked, count });
  const [, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const like = !optimistic.liked;
      setOptimistic({ liked: like, count: optimistic.count + (like ? 1 : -1) });
      await save(like);
    });

  return [optimistic, toggle] as const;
}

export function HeartIcon({ filled, className = "size-5" }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} ${filled ? "fill-red-500 text-red-500" : "fill-none"}`}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5s-8-4.6-8-10.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.9c0 6-8 10.6-8 10.6z" />
    </svg>
  );
}

export const actionClass =
  "flex min-w-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-muted transition-colors hover:bg-surface hover:text-ink";

// Signed-out readers get a link to sign in, which brings them back to this page.
export function LikeButton({
  signedIn,
  liked,
  count,
  onToggle,
  small = false,
}: {
  signedIn: boolean;
  liked: boolean;
  count: number;
  onToggle: () => void;
  small?: boolean;
}) {
  const pathname = usePathname();
  const label = count ? `მოწონება: ${count}` : "მოწონება";
  const className = `${actionClass} ${small ? "h-8" : "h-9"}`;
  const content = (
    <>
      <HeartIcon filled={liked} className={small ? "size-[18px]" : "size-5"} />
      {count > 0 && <span className="text-sm tabular-nums">{formatCount(count)}</span>}
    </>
  );

  if (!signedIn) {
    return (
      <Link href={authUrl(pathname)} aria-label={label} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} aria-pressed={liked} onClick={onToggle} className={className}>
      {content}
    </button>
  );
}
