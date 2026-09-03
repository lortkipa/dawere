"use client";

import { useState, useTransition } from "react";
import { setFollowing } from "@/app/actions/follow";
import { AuthTrigger } from "@/components/landing/AuthDialogProvider";
import { Button } from "@/components/ui/Button";
import { ResultModal } from "@/components/ui/ResultModal";
import styles from "./FollowButton.module.css";

type FollowButtonProps = {
  /** The author being followed. The follower is never sent — the action reads it. */
  authorId: string;
  /** Whether the viewer follows them already: the state the button opens in. */
  following: boolean;
  /** A signed-out visitor gets the same button; it asks them to sign in first. */
  signedIn: boolean;
  className?: string;
};

/**
 * One button for both directions, because there is one row and it is either
 * there or it is not. It paints the new state before the action answers — the
 * write is a single row and the wrong answer is a rare one, so waiting for the
 * round trip would cost every click to insure against almost none of them.
 *
 * A signed-out visitor is not shown a different control: following is what the
 * button is for, and signing in is only what has to happen first.
 */
export function FollowButton({
  authorId,
  following: initial,
  signedIn,
  className,
}: FollowButtonProps) {
  const [following, setLocal] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <AuthTrigger className={`${styles.follow} ${className ?? ""}`}>
        გამოწერა
      </AuthTrigger>
    );
  }

  const toggle = () => {
    const next = !following;
    setLocal(next);

    startTransition(async () => {
      const result = await setFollowing(authorId, next);

      // The optimistic paint was wrong: put the button back where it was and
      // say why, rather than leaving it claiming a row that was never written.
      if (result.error) {
        setLocal(!next);
        setError(result.error);
        return;
      }

      setLocal(result.following);
    });
  };

  return (
    <>
      <Button
        variant={following ? "outline" : "solid"}
        className={[
          styles.follow,
          following ? styles.following : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={following}
        disabled={pending}
        onClick={toggle}
      >
        {following ? "გამოწერილია" : "გამოწერა"}
      </Button>

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
