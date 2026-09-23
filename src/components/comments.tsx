'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, MessageCircle, Reply, Trash2 } from 'lucide-react';
import { addCommentAction, deleteCommentAction } from '@/app/actions/engage';
import { Avatar, Button, ButtonLink, FormError, Textarea } from '@/components/ui';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from '@/components/toaster';
import type { CommentNode } from '@/lib/posts';
import { timeAgo } from '@/lib/utils';

type Viewer = { id: string; name: string; username: string; avatarUrl: string | null } | null;

function CommentForm({
  postId,
  parentId,
  viewer,
  placeholder,
  autoFocus,
  onDone,
}: {
  postId: string;
  parentId?: string;
  viewer: NonNullable<Viewer>;
  placeholder: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  // Controlled on purpose: a form action would reset the field even when the
  // server refuses the comment, throwing away what was typed.
  const [body, setBody] = useState('');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!body.trim() || pending) return;
    const formData = new FormData();
    formData.set('body', body);
    if (parentId) formData.set('parentId', parentId);
    startTransition(async () => {
      const result = await addCommentAction(postId, formData);
      if (result.ok) {
        setBody('');
        setError(undefined);
        onDone?.();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex min-w-0 gap-3"
    >
      <Avatar name={viewer.name} src={viewer.avatarUrl} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <Textarea
          name="body"
          rows={parentId ? 2 : 3}
          maxLength={2000}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submit();
            }
          }}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {error ? <FormError>{error}</FormError> : null}
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending || !body.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {parentId ? 'პასუხი' : 'გამოქვეყნება'}
          </Button>
          {onDone ? (
            <Button type="button" size="sm" variant="ghost" onClick={onDone}>
              გაუქმება
            </Button>
          ) : null}
          <span className="ml-auto hidden text-[12px] text-subtle sm:inline">Ctrl + Enter</span>
        </div>
      </div>
    </form>
  );
}

function Comment({
  comment,
  postId,
  viewer,
  canModerate,
  canReply,
  isReply = false,
}: {
  comment: CommentNode;
  postId: string;
  viewer: Viewer;
  canModerate: boolean;
  canReply: boolean;
  isReply?: boolean;
}) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [pending, startTransition] = useTransition();

  const mine = viewer?.id === comment.author.id;

  function onDelete() {
    startTransition(async () => {
      const result = await deleteCommentAction(comment.id);
      setConfirming(false);
      if (result.ok) {
        setRemoved(true);
        toast('კომენტარი წაიშალა');
        router.refresh();
      } else {
        toast(result.error ?? 'წაშლა ვერ მოხერხდა.', 'error');
      }
    });
  }

  if (removed) return null;

  return (
    <li className="flex min-w-0 gap-3">
      <Link href={`/u/${comment.author.username}`} className="mt-0.5 shrink-0">
        <Avatar name={comment.author.name} src={comment.author.avatarUrl} size="sm" />
      </Link>

      <div className="min-w-0 flex-1">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link
              href={`/u/${comment.author.username}`}
              className="text-sm font-medium text-ink hover:underline"
            >
              {comment.author.name}
            </Link>
            <time dateTime={comment.createdAt?.toISOString()} className="text-[12px] text-subtle">
              {timeAgo(comment.createdAt)}
            </time>
          </div>

          {/* wrap-anywhere: a pasted URL or an unbroken 300-character "word" must
              wrap here, not widen the article and give the page a scrollbar. */}
          <p className="wrap-anywhere mt-0.5 text-[15px] leading-relaxed whitespace-pre-wrap text-ink/90">
            {comment.body}
          </p>
        </div>

        <div className="mt-1.5 flex items-center gap-4">
          {viewer && canReply && !isReply ? (
            <button
              type="button"
              onClick={() => setReplying((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-subtle transition-colors hover:text-ink"
            >
              <Reply className="size-3.5" />
              პასუხი
            </button>
          ) : null}
          {mine || canModerate ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-subtle transition-colors hover:text-danger"
            >
              <Trash2 className="size-3.5" />
              წაშლა
            </button>
          ) : null}
        </div>

        {replying && viewer ? (
          <div className="mt-4">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              viewer={viewer}
              placeholder={`პასუხი ${comment.author.name}-ს…`}
              autoFocus
              onDone={() => setReplying(false)}
            />
          </div>
        ) : null}

        {comment.replies.length > 0 ? (
          <ul className="mt-5 min-w-0 space-y-5 border-l border-line pl-4">
            {comment.replies.map((reply) => (
              <Comment
                key={reply.id}
                comment={reply}
                postId={postId}
                viewer={viewer}
                canModerate={canModerate}
                canReply={canReply}
                isReply
              />
            ))}
          </ul>
        ) : null}
      </div>

      {/* Mounted on demand: a long thread should not carry a dialog per comment. */}
      {confirming ? (
        <ConfirmDialog
          open
          title="წავშალოთ კომენტარი?"
          description={comment.replies.length > 0 ? 'მასზე დაწერილი პასუხებიც წაიშლება.' : undefined}
          confirmLabel="წაშლა"
          pending={pending}
          onConfirm={onDelete}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </li>
  );
}

export function Comments({
  postId,
  total,
  comments,
  viewer,
  canModerate,
  canComment,
}: {
  postId: string;
  /** From posts.comment_count, which counts replies at every depth. */
  total: number;
  comments: CommentNode[];
  viewer: Viewer;
  canModerate: boolean;
  /** Drafts cannot be commented on. */
  canComment: boolean;
}) {
  const pathname = usePathname();

  return (
    <section id="comments" className="min-w-0 scroll-mt-24">
      <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold tracking-tight">
        კომენტარები
        {total > 0 ? (
          <span className="rounded-md bg-sunken px-2 py-0.5 text-[13px] font-medium text-muted tabular-nums">
            {total}
          </span>
        ) : null}
      </h2>

      {!canComment ? null : viewer ? (
        <div className="mb-10">
          <CommentForm postId={postId} viewer={viewer} placeholder="რას ფიქრობ?" />
        </div>
      ) : (
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-sunken px-4 py-3">
          <p className="text-sm text-muted">შედი, რომ კომენტარი დაწერო.</p>
          <ButtonLink href={`/login?next=${encodeURIComponent(`${pathname}#comments`)}`} size="sm" variant="outline">
            შესვლა
          </ButtonLink>
        </div>
      )}

      {comments.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong py-10 text-center">
          <MessageCircle className="size-5 text-subtle" />
          <p className="mt-2.5 text-sm text-muted">ჯერ არავის დაუწერია. იყავი პირველი.</p>
        </div>
      ) : (
        <ul className="min-w-0 space-y-7">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              postId={postId}
              viewer={viewer}
              canModerate={canModerate}
              canReply={canComment}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
