"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { setPostFavorite } from "@/app/favorites/actions";
import { authUrl } from "@/lib/return-to";
import { actionClass } from "./like-button";

// Like useLike: the bookmark fills at once and the page refresh brings the stored value.
export function useFavorite(postId: string, favorited: boolean) {
  const [optimistic, setOptimistic] = useOptimistic(favorited);
  const [, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      setOptimistic(!optimistic);
      await setPostFavorite(postId, !optimistic);
    });

  return [optimistic, toggle] as const;
}

// Signed-out readers get a link to sign in, which brings them back to this page.
export function FavoriteButton({
  signedIn,
  favorited,
  onToggle,
}: {
  signedIn: boolean;
  favorited: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const label = favorited ? "რჩეულებიდან ამოღება" : "რჩეულებში დამატება";
  const className = `${actionClass} h-9`;
  const icon = (
    <svg
      viewBox="0 0 24 24"
      className={`size-5 ${favorited ? "fill-yellow-400 text-yellow-500" : "fill-none"}`}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3.5h12a.5.5 0 0 1 .5.5v16.5L12 16l-6.5 4.5V4a.5.5 0 0 1 .5-.5z" />
    </svg>
  );

  if (!signedIn) {
    return (
      <Link href={authUrl(pathname)} aria-label={label} className={className}>
        {icon}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} aria-pressed={favorited} onClick={onToggle} className={className}>
      {icon}
    </button>
  );
}
