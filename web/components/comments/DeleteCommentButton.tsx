"use client";

import { useState, useTransition } from "react";
import { deleteComment } from "@/app/actions/comments";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ResultModal } from "@/components/ui/ResultModal";
import styles from "./Comments.module.css";

type DeleteCommentButtonProps = {
  id: string;
  /** A thread takes its replies with it, and says so before it does. */
  replies: number;
};

/**
 * Offered to whoever wrote the comment and to whoever wrote the article it sits
 * under. Deleting has no undo here either, so it asks first — the article's own
 * dialog, at a comment's size.
 */
export function DeleteCommentButton({ id, replies }: DeleteCommentButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = () =>
    startTransition(async () => {
      const result = await deleteComment(id);

      if (!result.ok) {
        setConfirming(false);
        setError(result.error);
        return;
      }

      // Nothing closes the dialog on the way out: the action revalidates the
      // page, and this component goes with the row it belonged to.
      setConfirming(false);
    });

  return (
    <>
      <Button
        variant="ghost"
        className={`${styles.tool} ${styles.remove}`}
        onClick={() => setConfirming(true)}
      >
        <TrashIcon />
        {/* Its own element so a narrow screen can drop the word and keep the
            mark — hidden there rather than removed, so the button is still
            called something. */}
        <span className={styles.removeLabel}>წაშლა</span>
      </Button>

      <Modal
        open={confirming}
        onClose={() => {
          if (!pending) setConfirming(false);
        }}
        label="კომენტარის წაშლა"
      >
        <h2 className={styles.confirmHeading}>წაიშალოს კომენტარი?</h2>
        <p className={styles.confirmNote}>
          {replies > 0
            ? `პასუხებიც (${replies}) მასთან ერთად ქრება. დაბრუნება აღარ იქნება შესაძლებელი.`
            : "დაბრუნება აღარ იქნება შესაძლებელი."}
        </p>

        <div className={styles.confirmButtons}>
          <Button
            variant="outline"
            className={styles.confirmCancel}
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            გაუქმება
          </Button>
          <Button
            className={styles.confirmDelete}
            disabled={pending}
            onClick={remove}
          >
            {pending ? "იშლება…" : "წაშლა"}
          </Button>
        </div>
      </Modal>

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
