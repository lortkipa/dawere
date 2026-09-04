"use client";

import { useState, useTransition } from "react";
import { setLiked } from "@/app/actions/likes";
import { AuthTrigger } from "@/components/landing/AuthDialogProvider";
import { HeartIcon } from "@/components/icons/HeartIcon";
import { ResultModal } from "@/components/ui/ResultModal";
import styles from "./LikeButton.module.css";

type LikeButtonProps = {
  /** The article being liked. The reader is never sent — the action reads it. */
  articleId: string;
  /** Whether the viewer has liked it already: the state the button opens in. */
  liked: boolean;
  /** How many have, which is the only place this number is shown to a reader. */
  likes: number;
  /** A signed-out reader gets the same button; it asks them to sign in first. */
  signedIn: boolean;
};

/**
 * One button for both directions, because there is one row and it is either
 * there or it is not — the article's half of `FollowButton`. It paints the new
 * state before the action answers, and the count with it: one row is being
 * written, and charging every click for the round trip would insure against a
 * wrong answer almost nobody gets. A failure puts both back and says why.
 *
 * The author of the article is not shown this at all — their own count sits in
 * the panel above the piece, with the views.
 */
export function LikeButton({
  articleId,
  liked: initial,
  likes: initialCount,
  signedIn,
}: LikeButtonProps) {
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
        <span className={styles.count}>{initialCount}</span>
      </AuthTrigger>
    );
  }

  const toggle = () => {
    const next = !liked;
    setLocal(next);
    setCount((current) => current + (next ? 1 : -1));

    startTransition(async () => {
      const result = await setLiked(articleId, next);

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
        <span className={styles.count}>{count}</span>
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
