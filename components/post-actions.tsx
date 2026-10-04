"use client";

import { setPostLike } from "@/app/likes/actions";
import { formatCount } from "@/lib/format-count";
import { FavoriteButton, useFavorite } from "./favorite-button";
import { actionClass, LikeButton, useLike } from "./like-button";

export function PostActions({
  postId,
  signedIn,
  liked,
  likes,
  favorited: storedFavorited,
  comments,
}: {
  postId: string;
  signedIn: boolean;
  liked: boolean;
  likes: number;
  favorited: boolean;
  comments: number;
}) {
  const [like, toggle] = useLike(liked, likes, (value) => setPostLike(postId, value));
  const [favorited, toggleFavorite] = useFavorite(postId, storedFavorited);

  return (
    <div className="mt-12 flex items-center gap-1 border-y border-line py-2">
      <LikeButton signedIn={signedIn} liked={like.liked} count={like.count} onToggle={toggle} />
      <a
        href="#comments"
        aria-label={comments ? `კომენტარები: ${comments}` : "კომენტარები"}
        className={`${actionClass} h-9`}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.5 11.5a8.5 8 0 0 1-12.2 7.2L3.5 20l1.4-4.1a8.5 8 0 1 1 15.6-4.4z" />
        </svg>
        {comments > 0 && <span className="text-sm tabular-nums">{formatCount(comments)}</span>}
      </a>
      <FavoriteButton signedIn={signedIn} favorited={favorited} onToggle={toggleFavorite} />
    </div>
  );
}
