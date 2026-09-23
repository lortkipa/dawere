'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Flag, Heart, Link2, Loader2, MessageCircle, Pencil, Reply, Trash2 } from 'lucide-react';
import {
  addCommentAction,
  deleteCommentAction,
  editCommentAction,
  toggleCommentLikeAction,
} from '@/app/actions/engage';
import { RowMenu, type MenuItem } from '@/components/admin/controls';
import { Avatar, Badge, Button, ButtonLink, FormError, Textarea } from '@/components/ui';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ReportDialog } from '@/components/report-dialog';
import { toast } from '@/components/toaster';
import type { CommentNode } from '@/lib/posts';
import { cn, formatCount, timeAgo } from '@/lib/utils';

type Viewer = { id: string; name: string; username: string; avatarUrl: string | null } | null;
type Sort = 'new' | 'old' | 'top';

/**
 * Indentation per reply level. Phones stop indenting after a few levels and
 * wider screens a few more; past that a reply says whom it answers instead,
 * so a long back-and-forth never squeezes the text into a sliver.
 */
const INDENT_ALWAYS = 3;
const INDENT_WIDE = 6;
/** Deeper threads start folded; a reader opens them on purpose. */
const OPEN_DEPTH = 4;

type ThreadContext = {
  postId: string;
  postAuthorId: string;
  viewer: Viewer;
  canModerate: boolean;
  canComment: boolean;
  /** The comment to scroll to and flash: from the URL hash, or one just written. */
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  /** Comments whose threads must be open for `focusId` to be visible. */
  focusPath: Set<string>;
};

const Thread = createContext<ThreadContext | null>(null);

function useThread() {
  return useContext(Thread)!;
}

function useSignIn() {
  const router = useRouter();
  const pathname = usePathname();
  return () => router.push(`/login?next=${encodeURIComponent(`${pathname}#comments`)}`);
}

/* ---------------------------------------------------------------- composer */

function CommentForm({
  parentId,
  placeholder,
  autoFocus,
  onDone,
}: {
  parentId?: string;
  placeholder: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const { postId, viewer, setFocusId } = useThread();
  // Controlled on purpose: a form action would reset the field even when the
  // server refuses the comment, throwing away what was typed.
  const [body, setBody] = useState('');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!viewer) return null;

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
        if (result.id) setFocusId(result.id);
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
            if (event.key === 'Escape' && onDone && !body.trim()) onDone();
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

function EditForm({ comment, onDone }: { comment: CommentNode; onDone: () => void }) {
  const router = useRouter();
  const [body, setBody] = useState(comment.body);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save() {
    if (!body.trim() || pending) return;
    startTransition(async () => {
      const result = await editCommentAction(comment.id, body);
      if (result.ok) {
        onDone();
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
        save();
      }}
      className="mt-1.5 space-y-2.5"
    >
      <Textarea
        rows={3}
        maxLength={2000}
        required
        value={body}
        autoFocus
        onFocus={(event) => event.currentTarget.setSelectionRange(body.length, body.length)}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            save();
          }
          if (event.key === 'Escape') onDone();
        }}
        aria-label="კომენტარის რედაქტირება"
      />
      {error ? <FormError>{error}</FormError> : null}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          შენახვა
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={pending}>
          გაუქმება
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------- heart */

function CommentLike({ comment }: { comment: CommentNode }) {
  const { viewer } = useThread();
  const signIn = useSignIn();
  const [state, setState] = useState({ liked: comment.liked, count: comment.likeCount });
  const [optimistic, applyOptimistic] = useOptimistic(state, (current) => ({
    liked: !current.liked,
    count: current.count + (current.liked ? -1 : 1),
  }));
  const [, startTransition] = useTransition();
  const [pops, setPops] = useState(0);

  // A refresh (after a reply elsewhere, say) brings the server's numbers.
  const [seen, setSeen] = useState(comment);
  if (seen !== comment) {
    setSeen(comment);
    setState({ liked: comment.liked, count: comment.likeCount });
  }

  function onClick() {
    if (!viewer) return signIn();
    if (!optimistic.liked) setPops((n) => n + 1);
    startTransition(async () => {
      applyOptimistic(null);
      const result = await toggleCommentLikeAction(comment.id);
      if (result.ok) setState({ liked: result.active, count: result.count ?? 0 });
      else toast(result.error ?? 'ვერ მოხერხდა.', 'error');
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic.liked}
      aria-label={optimistic.liked ? 'მოწონების მოხსნა' : 'კომენტარის მოწონება'}
      className={cn(
        '-ml-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[13px] font-medium transition-colors hover:bg-hover',
        optimistic.liked ? 'text-rose-600 dark:text-rose-400' : 'text-subtle hover:text-ink',
      )}
    >
      <Heart key={pops} className={cn('size-3.5', optimistic.liked && 'animate-heart-pop fill-current')} />
      {optimistic.count > 0 ? <span className="tabular-nums">{formatCount(optimistic.count)}</span> : null}
    </button>
  );
}

/* ------------------------------------------------------------------ comment */

const ACTION_CLASS =
  'inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[13px] font-medium text-subtle transition-colors hover:bg-hover hover:text-ink';

function replyWord(count: number) {
  return count === 1 ? '1 პასუხი' : `${formatCount(count)} პასუხი`;
}

function Comment({
  comment,
  depth,
  parent,
}: {
  comment: CommentNode;
  depth: number;
  /** The comment this one answers, for the "↳ name" line once indentation stops. */
  parent: CommentNode | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const signIn = useSignIn();
  const { viewer, canModerate, canComment, postAuthorId, focusId, setFocusId, focusPath } = useThread();

  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [open, setOpen] = useState(depth < OPEN_DEPTH);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLLIElement>(null);

  const mine = viewer?.id === comment.author.id;
  const focused = focusId === comment.id;
  // Opened for a linked reply below, and left open once the flash is over.
  if (!open && focusPath.has(comment.id)) setOpen(true);
  const expanded = open || focusPath.has(comment.id);

  useEffect(() => {
    if (!focused || !ref.current) return;
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setFocusId(null), 2400);
    return () => clearTimeout(timer);
  }, [focused, setFocusId]);

  function onDelete() {
    startTransition(async () => {
      const result = await deleteCommentAction(comment.id);
      setConfirming(false);
      if (result.ok) {
        toast('კომენტარი წაიშალა');
        router.refresh();
      } else {
        toast(result.error ?? 'წაშლა ვერ მოხერხდა.', 'error');
      }
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${pathname}#comment-${comment.id}`);
      toast('ბმული დაკოპირდა');
    } catch {
      toast('ბმული ვერ დაკოპირდა.', 'error');
    }
  }

  const menu: (MenuItem | null)[] = comment.deleted
    ? []
    : [
        { label: 'ბმულის კოპირება', icon: <Link2 />, onSelect: copyLink },
        ...(mine ? [{ label: 'რედაქტირება', icon: <Pencil />, onSelect: () => setEditing(true) }] : []),
        ...(!mine
          ? [{ label: 'დარღვევის შეტყობინება', icon: <Flag />, onSelect: () => (viewer ? setReporting(true) : signIn()) }]
          : []),
        ...(mine || canModerate
          ? [null, { label: 'წაშლა', icon: <Trash2 />, danger: true, onSelect: () => setConfirming(true) }]
          : []),
      ];

  // Indentation for this comment's replies: always, on wide screens only, or none.
  const childDepth = depth + 1;
  const indent =
    childDepth <= INDENT_ALWAYS
      ? 'ml-4 pl-3 sm:pl-5'
      : childDepth <= INDENT_WIDE
        ? 'sm:ml-4 sm:pl-5'
        : '';
  // Once a reply is no longer indented under its parent, it names whom it answers.
  const showReplyTo = parent && !parent.deleted && depth > INDENT_ALWAYS;
  const replyToWideOnly = depth <= INDENT_WIDE;

  return (
    <li id={`comment-${comment.id}`} ref={ref} className="min-w-0 scroll-mt-24">
      <div
        className={cn(
          '-mx-2 flex min-w-0 gap-3 rounded-lg px-2 py-1 transition-colors duration-700',
          focused && 'bg-accent-soft',
        )}
      >
        {comment.deleted ? (
          <span className="mt-0.5 size-8 shrink-0 rounded-full border border-dashed border-line-strong" aria-hidden />
        ) : (
          <Link href={`/u/${comment.author.username}`} className="mt-0.5 shrink-0">
            <Avatar name={comment.author.name} src={comment.author.avatarUrl} size="sm" />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          {comment.deleted ? (
            <p className="pt-1.5 text-[14px] text-subtle italic">ეს კომენტარი წაიშალა.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-2">
                <Link
                  href={`/u/${comment.author.username}`}
                  className="text-sm font-medium text-ink hover:underline"
                >
                  {comment.author.name}
                </Link>
                {comment.author.id === postAuthorId ? <Badge tone="accent">ავტორი</Badge> : null}
                <a
                  href={`#comment-${comment.id}`}
                  onClick={() => setFocusId(comment.id)}
                  className="text-[12px] text-subtle hover:underline"
                >
                  <time dateTime={comment.createdAt?.toISOString()}>{timeAgo(comment.createdAt)}</time>
                </a>
                {comment.editedAt ? (
                  <span className="text-[12px] text-subtle" title={timeAgo(comment.editedAt)}>
                    · რედაქტირებული
                  </span>
                ) : null}
              </div>

              {showReplyTo ? (
                <a
                  href={`#comment-${parent.id}`}
                  onClick={() => setFocusId(parent.id)}
                  className={cn(
                    'mt-0.5 inline-flex max-w-full items-center gap-1 text-[12px] text-subtle hover:text-ink',
                    replyToWideOnly && 'sm:hidden',
                  )}
                >
                  <Reply className="size-3 shrink-0 rotate-180" aria-hidden />
                  <span className="truncate">{parent.author.name}</span>
                </a>
              ) : null}

              {editing ? (
                <EditForm comment={comment} onDone={() => setEditing(false)} />
              ) : (
                // wrap-anywhere: a pasted URL or an unbroken 300-character "word" must
                // wrap here, not widen the article and give the page a scrollbar.
                <p className="wrap-anywhere mt-0.5 text-[15px] leading-relaxed whitespace-pre-wrap text-ink/90">
                  {comment.body}
                </p>
              )}
            </>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1">
            {comment.deleted ? null : (
              <>
                <CommentLike comment={comment} />
                {canComment ? (
                  <button
                    type="button"
                    onClick={() => (viewer ? setReplying((v) => !v) : signIn())}
                    aria-expanded={replying}
                    className={ACTION_CLASS}
                  >
                    <Reply className="size-3.5" />
                    პასუხი
                  </button>
                ) : null}
              </>
            )}
            {comment.replyCount > 0 ? (
              <button
                type="button"
                onClick={() => setOpen(!expanded)}
                aria-expanded={expanded}
                className={ACTION_CLASS}
              >
                <MessageCircle className="size-3.5" />
                {expanded ? 'დამალვა' : replyWord(comment.replyCount)}
              </button>
            ) : null}
            {menu.length > 0 ? (
              <div className="ml-auto">
                <RowMenu items={menu} label="კომენტარის მოქმედებები" />
              </div>
            ) : null}
          </div>

          {replying && viewer ? (
            <div className="mt-3 mb-2">
              <CommentForm
                parentId={comment.id}
                placeholder={`პასუხი ${comment.author.name}-ს…`}
                autoFocus
                onDone={() => {
                  setReplying(false);
                  setOpen(true);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {comment.replies.length > 0 && expanded ? (
        <div className={cn('relative mt-2', indent)}>
          {/* The thread line doubles as a fold button, as on most forums. */}
          {indent ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="პასუხების დამალვა"
              title="პასუხების დამალვა"
              className={cn(
                'group absolute inset-y-0 left-0 w-3 -translate-x-1/2',
                childDepth > INDENT_ALWAYS && 'hidden sm:block',
              )}
            >
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line transition-colors group-hover:bg-line-strong group-hover:w-0.5" />
            </button>
          ) : null}
          <ul className="min-w-0 space-y-3">
            {comment.replies.map((reply) => (
              <Comment key={reply.id} comment={reply} depth={childDepth} parent={comment} />
            ))}
          </ul>
        </div>
      ) : null}

      {/* Mounted on demand: a long thread should not carry a dialog per comment. */}
      {confirming ? (
        <ConfirmDialog
          open
          title="წავშალოთ კომენტარი?"
          description={
            comment.replyCount > 0
              ? 'პასუხები დარჩება; კომენტარის ადგილას ეწერება, რომ წაიშალა.'
              : 'კომენტარი სამუდამოდ წაიშლება.'
          }
          confirmLabel="წაშლა"
          pending={pending}
          onConfirm={onDelete}
          onClose={() => setConfirming(false)}
        />
      ) : null}
      {reporting ? (
        <ReportDialog targetType="comment" targetId={comment.id} onClose={() => setReporting(false)} />
      ) : null}
    </li>
  );
}

/* --------------------------------------------------------------------- root */

const SORTS: { key: Sort; label: string }[] = [
  { key: 'new', label: 'ახალი' },
  { key: 'top', label: 'პოპულარული' },
  { key: 'old', label: 'ძველი' },
];

function sortRoots(list: CommentNode[], sort: Sort): CommentNode[] {
  if (sort === 'new') return list;
  if (sort === 'old') return [...list].reverse();
  // Most liked, then most discussed; ties keep the newest first.
  return [...list].sort((a, b) => b.likeCount - a.likeCount || b.replyCount - a.replyCount);
}

/** Ids from the root down to `id`, excluding `id` itself; empty if it is not in the tree. */
function pathTo(list: CommentNode[], id: string): string[] | null {
  for (const node of list) {
    if (node.id === id) return [];
    const below = pathTo(node.replies, id);
    if (below) return [node.id, ...below];
  }
  return null;
}

export function Comments({
  postId,
  postAuthorId,
  total,
  comments,
  viewer,
  canModerate,
  canComment,
}: {
  postId: string;
  postAuthorId: string;
  /** From posts.comment_count, which counts replies at every depth. */
  total: number;
  comments: CommentNode[];
  viewer: Viewer;
  /** The post's author and admins may remove anyone's comment. */
  canModerate: boolean;
  /** Drafts cannot be commented on. */
  canComment: boolean;
}) {
  const pathname = usePathname();
  const [sort, setSort] = useState<Sort>('new');
  const [focusId, setFocusId] = useState<string | null>(null);

  // A link to #comment-… opens every fold above that comment, then flashes it.
  useEffect(() => {
    function read() {
      const match = /^#comment-([0-9a-f-]{36})$/i.exec(window.location.hash);
      if (match) setFocusId(match[1]);
    }
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const focusPath = useMemo(
    () => new Set(focusId ? (pathTo(comments, focusId) ?? []) : []),
    [comments, focusId],
  );
  const sorted = useMemo(() => sortRoots(comments, sort), [comments, sort]);

  const context = useMemo<ThreadContext>(
    () => ({ postId, postAuthorId, viewer, canModerate, canComment, focusId, setFocusId, focusPath }),
    [postId, postAuthorId, viewer, canModerate, canComment, focusId, focusPath],
  );

  return (
    <Thread.Provider value={context}>
      <section id="comments" className="min-w-0 scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            კომენტარები
            {total > 0 ? (
              <span className="rounded-md bg-sunken px-2 py-0.5 text-[13px] font-medium text-muted tabular-nums">
                {total}
              </span>
            ) : null}
          </h2>
          {comments.length > 1 ? (
            <div role="group" aria-label="დალაგება" className="flex rounded-lg bg-sunken p-0.5">
              {SORTS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSort(key)}
                  aria-pressed={sort === key}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
                    sort === key ? 'bg-raised text-ink shadow-soft' : 'text-muted hover:text-ink',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {!canComment ? null : viewer ? (
          <div className="mb-10">
            <CommentForm placeholder="რას ფიქრობ?" />
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
          <ul className="min-w-0 space-y-6">
            {sorted.map((comment) => (
              <Comment key={comment.id} comment={comment} depth={0} parent={null} />
            ))}
          </ul>
        )}
      </section>
    </Thread.Provider>
  );
}
