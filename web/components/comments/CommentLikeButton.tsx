"use client";

import { useState, useTransition } from "react";
import { setCommentLiked } from "@/app/actions/likes";
import { AuthTrigger } from "@/components/landing/AuthDialogProvider";
import { HeartIcon } from "@/components/icons/HeartIcon";
import { ResultModal } from "@/components/ui/ResultModal";
import styles from "./Comments.module.css";

type CommentLikeButtonProps = {
  /** The comment being liked. The reader is never sent — the action reads it. */
  commentId: string;
  /** Whether the viewer has liked it already: the state the button opens in. */
  liked: boolean;
  likes: number;
  /** A signed-out reader gets the same button; it asks them to sign in first. */
  signedIn: boolean;
};

/**
 * The article's like button at a comment's size, and the same bargain: it paints
 * the new state and the count before the action answers, because one row is
 * being written and charging every click for the round trip would insure
 * against a wrong answer almost nobody gets. A failure puts both back.
 *
 * The count is only drawn once somebody has liked it — a nought under every
 * line of a long conversation is a column of noise, and the heart alone already
 * says what the button is for.
 *
 * Not rendered on your own comment: the page shows you the tally instead.
 */
export function CommentLikeButton({
  commentId,
  liked: initial,
  likes: initialCount,
  signedIn,
}: CommentLikeButtonProps) {
  const [liked, setLocal] = useState(initial);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <AuthTrigger
        variant="ghost"
        className={styles.like}
        aria-label="მოწონება"
      >
        <HeartIcon />
        {initialCount > 0 && (
          <span className={styles.likeCount}>{initialCount}</span>
        )}
      </AuthTrigger>
    );
  }

  const toggle = () => {
    const next = !liked;
    setLocal(next);
    setCount((current) => current + (next ? 1 : -1));

    startTransition(async () => {
      const result = await setCommentLiked(commentId, next);

      if (!result.ok) {
        setLocal(!next);
        setCount((current) => current + (next ? -1 : 1));
        setError(result.error);
        return;
      }

      // The server's count, not ours: other people were reading this too.
      setLocal(result.liked);
      setCount(result.likes);
    });
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.like} ${liked ? styles.liked : ""}`}
        aria-pressed={liked}
        aria-label={liked ? "მოწონების გაუქმება" : "მოწონება"}
        disabled={pending}
        onClick={toggle}
      >
        <HeartIcon filled={liked} />
        {count > 0 && <span className={styles.likeCount}>{count}</span>}
      </button>

      <ResultModal
        open={error !== null}
        onClose={() => setError(null)}
        tone="failed"
        heading="ვერ მოხერხდა"
        note={error ?? undefined}
      />
    </>
  );
}
