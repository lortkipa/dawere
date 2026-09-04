"use client";

import { useState, useTransition } from "react";
import { addComment } from "@/app/actions/comments";
import { Button } from "@/components/ui/Button";
import { ResultModal } from "@/components/ui/ResultModal";
import styles from "./Comments.module.css";

type CommentFormProps = {
  articleId: string;
  /** Set when this is the reply form at the foot of a thread. */
  parentId?: string;
  placeholder: string;
  submitLabel: string;
  /** A reply form has a way out, and takes it once the reply has landed. */
  onClose?: () => void;
  autoFocus?: boolean;
};

/**
 * The field, for a new thread and for a reply alike — the only difference
 * between the two is the `parentId` it carries and the way out beside its
 * button.
 *
 * Nothing is painted early here, unlike the like button: a comment is a whole
 * paragraph rather than one row's worth of state, and showing it as posted
 * before it is would mean putting the text back in the field afterwards. It
 * appears when the server says it exists — the action revalidates this page,
 * which is what brings it back with the comment in it.
 */
export function CommentForm({
  articleId,
  parentId,
  placeholder,
  submitLabel,
  onClose,
  autoFocus,
}: CommentFormProps) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const empty = body.trim() === "";

  const send = () => {
    if (empty || pending) return;

    startTransition(async () => {
      const result = await addComment(articleId, body, parentId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setBody("");
      onClose?.();
    });
  };

  return (
    <>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <textarea
          className={styles.field}
          value={body}
          placeholder={placeholder}
          disabled={pending}
          autoFocus={autoFocus}
          onChange={(event) => setBody(event.target.value)}
          // The button is right there, but a field this shape invites the
          // shortcut every other comment box on the web answers to.
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              send();
            }
          }}
        />

        <div className={styles.actions}>
          {onClose && (
            <Button
              variant="ghost"
              className={styles.cancel}
              disabled={pending}
              onClick={onClose}
            >
              გაუქმება
            </Button>
          )}

          <Button
            type="submit"
            className={styles.submit}
            disabled={empty || pending}
          >
            {pending ? "იგზავნება…" : submitLabel}
          </Button>
        </div>
      </form>

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
