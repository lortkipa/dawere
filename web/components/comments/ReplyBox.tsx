"use client";

import { useState } from "react";
import { AuthTrigger } from "@/components/landing/AuthDialogProvider";
import { Button } from "@/components/ui/Button";
import { ReplyIcon } from "@/components/icons/ReplyIcon";
import { CommentForm } from "./CommentForm";
import styles from "./Comments.module.css";

type ReplyBoxProps = {
  articleId: string;
  /** The comment being answered — any comment, at any depth of the thread. */
  parentId: string;
  /** A signed-out reader gets the same button; it asks them to sign in first. */
  signedIn: boolean;
};

/**
 * One reply control per comment rather than one per thread, because a reply now
 * answers the comment it sits under and not the conversation at large: the
 * button is where the thing being answered is.
 *
 * Closed it is a word; open it is the composer, in the same place. The form
 * shuts itself once the reply has landed — the action revalidates the page, and
 * the reply comes back on it as part of the conversation.
 */
export function ReplyBox({ articleId, parentId, signedIn }: ReplyBoxProps) {
  const [open, setOpen] = useState(false);

  if (!signedIn) {
    return (
      <AuthTrigger variant="ghost" className={styles.tool}>
        <ReplyIcon />
        პასუხი
      </AuthTrigger>
    );
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        className={styles.tool}
        onClick={() => setOpen(true)}
      >
        <ReplyIcon />
        პასუხი
      </Button>
    );
  }

  return (
    <CommentForm
      articleId={articleId}
      parentId={parentId}
      placeholder="დაწერე პასუხი…"
      submitLabel="პასუხის გაგზავნა"
      onClose={() => setOpen(false)}
      autoFocus
    />
  );
}
