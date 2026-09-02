"use client";

import { useState, useTransition } from "react";
import { deleteArticle } from "@/app/actions/articles";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import styles from "./DeleteArticleButton.module.css";

type DeleteArticleButtonProps = {
  id: string;
  /** Shown back to the author so they can see what they are about to lose. */
  title: string;
  /** Optional mark before the label, for callers that pair it with an icon button. */
  icon?: React.ReactNode;
  className?: string;
};

/** Deleting is the one thing here with no undo, so it asks first. */
export function DeleteArticleButton({
  id,
  title,
  icon,
  className,
}: DeleteArticleButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      // Ends in a redirect to /dashboard, so nothing here has to close the
      // dialog — the page it belongs to goes away.
      await deleteArticle(id);
    });

  return (
    <>
      <Button
        variant="ghost"
        className={className ? `${styles.trigger} ${className}` : styles.trigger}
        onClick={() => setConfirming(true)}
      >
        {icon}
        წაშლა
      </Button>

      <Modal
        open={confirming}
        onClose={() => {
          // Closing mid-delete would leave the author staring at a row that is
          // already on its way out.
          if (!pending) setConfirming(false);
        }}
        label="სტატიის წაშლა"
      >
        <h2 className={styles.heading}>წაიშალოს „{title}“?</h2>
        <p className={styles.note}>
          სტატია და მისი ბმული სამუდამოდ ქრება. დაბრუნება აღარ იქნება შესაძლებელი.
        </p>

        <div className={styles.buttons}>
          <Button
            variant="outline"
            className={styles.cancel}
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            გაუქმება
          </Button>
          <Button
            className={styles.confirm}
            disabled={pending}
            onClick={remove}
          >
            {pending ? "იშლება…" : "წაშლა"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
