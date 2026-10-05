"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteComment, updateComment } from "@/app/admin/blogs/actions";
import { maxCommentLength } from "@/lib/comment-rules";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { EditForm } from "../edit-form";

export type CommentRow = {
  id: string;
  body: string;
  date: string;
  likes: number;
  replyTo: string | null;
  postId: string;
  postTitle: string;
  authorId: string;
  authorName: string;
  avatar?: string;
  editable: boolean;
};

// Comments as rows: who, where, the text, and edit/delete for the ones this admin may manage.
// `showPost` is off on a blog's own page, where every row is about that blog.
export function CommentList({ comments, showPost = true }: { comments: CommentRow[]; showPost?: boolean }) {
  const [editing, setEditing] = useState<CommentRow | null>(null);
  const [deleting, setDeleting] = useState<CommentRow | null>(null);

  return (
    <>
      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-3 px-4 py-3.5">
            <Link href={`/admin/users/${comment.authorId}`} className="shrink-0">
              <Avatar src={comment.avatar} className="size-9" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <Link href={`/admin/users/${comment.authorId}`} className="font-medium hover:underline">
                  {comment.authorName}
                </Link>
                {comment.replyTo && <span className="text-muted">პასუხი: {comment.replyTo}</span>}
                <span className="text-muted">· {comment.date}</span>
                {comment.likes > 0 && <span className="text-muted tabular-nums">· {comment.likes} მოწონება</span>}
              </div>
              <p className="mt-1 text-[15px] break-words whitespace-pre-line">{comment.body}</p>
              {showPost && (
                <Link
                  href={`/admin/blogs/${comment.postId}`}
                  className="mt-1.5 block truncate text-sm text-muted hover:text-ink hover:underline"
                >
                  {comment.postTitle}
                </Link>
              )}
            </div>
            {comment.editable && (
              <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-start">
                <Button variant="outline" size="sm" onClick={() => setEditing(comment)}>
                  შეცვლა
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleting(comment)}
                  className="text-danger hover:bg-danger-soft"
                >
                  წაშლა
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing && <EditDialog comment={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <Dialog title="კომენტარის წაშლა" art="delete" onClose={() => setDeleting(null)}>
          <EditForm
            canSave
            save={() => deleteComment(deleting.id)}
            onClose={() => setDeleting(null)}
            saveLabel="წაშლა"
            danger
          >
            <p className="text-muted">კომენტარი სამუდამოდ წაიშლება. მასზე პასუხები დარჩება.</p>
          </EditForm>
        </Dialog>
      )}
    </>
  );
}

function EditDialog({ comment, onClose }: { comment: CommentRow; onClose: () => void }) {
  const [value, setValue] = useState(comment.body);
  const body = value.trim();

  return (
    <Dialog title="კომენტარი" art="comment" wide onClose={onClose}>
      <EditForm
        canSave={body.length > 0 && body !== comment.body}
        save={() => updateComment(comment.id, body)}
        onClose={onClose}
        counter={`${value.length}/${maxCommentLength}`}
      >
        <textarea
          autoFocus
          aria-label="კომენტარი"
          rows={6}
          maxLength={maxCommentLength}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="block w-full resize-none rounded-lg border border-line bg-bg px-4 py-3 text-base outline-offset-0 transition-colors focus:border-ink"
        />
      </EditForm>
    </Dialog>
  );
}
