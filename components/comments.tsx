"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { addComment, deleteComment } from "@/app/comments/actions";
import { setCommentLike } from "@/app/likes/actions";
import { maxCommentLength } from "@/lib/comment-rules";
import type { CommentNode } from "@/lib/comments";
import { authUrl } from "@/lib/return-to";
import { Avatar } from "./avatar";
import { FollowedIcon } from "./followed-icon";
import { Button } from "./button";
import { Dialog, DialogFooter } from "./dialog";
import { LikeButton, useLike } from "./like-button";
import { ReportMenu } from "./report";
import { Icon, itemClass, MenuItem, menuClass, popoverClass, useDismiss } from "./menu";

const maxLength = maxCommentLength;

type Thread = {
  postId: string;
  // The signed-in reader's photo, or null when signed out.
  viewer: { avatar?: string } | null;
  isOpen: (id: string) => boolean;
  setOpen: (id: string, open: boolean) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  // The comment a #c-<id> link pointed at, highlighted for a moment.
  target: string | null;
};

const ThreadContext = createContext<Thread | null>(null);

function useThread() {
  return useContext(ThreadContext)!;
}

type Sort = "popular" | "newest";

const sorts: { value: Sort; emoji: string; label: string }[] = [
  { value: "popular", emoji: "🔥", label: "პოპულარული" },
  { value: "newest", emoji: "🕒", label: "ახალი" },
];

// Comments arrive newest first. Popular puts the most liked and answered first, newest first
// among equals (the sort is stable).
function rank(comments: CommentNode[], sort: Sort) {
  const list = sort === "popular" ? [...comments].sort((a, b) => score(b) - score(a)) : comments;
  return list.map((comment) => comment.id);
}

function score(comment: CommentNode) {
  return comment.likes + comment.replyCount;
}

// The comments from the top of the list down to `id`, as they are shown, or null if it isn't there.
function pathTo(comments: CommentNode[], id: string): string[] | null {
  for (const comment of comments) {
    if (comment.id === id) return [id];
    const below = pathTo(comment.replies, id);
    if (below) return [comment.id, ...below];
  }
  return null;
}

// Open threads and the open reply box live here, keyed by comment id, so they survive the
// page refresh that brings in a new comment.
export function Comments({
  postId,
  viewer,
  comments,
  total,
}: {
  postId: string;
  viewer: { avatar?: string } | null;
  comments: CommentNode[];
  total: number;
}) {
  const [open, setOpenIds] = useState<Set<string>>(() => new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("popular");
  // The order is fixed when the sort is picked, so a comment doesn't jump away when someone
  // likes it. Comments added since then go on top, so a new one shows where it was written.
  const [order, setOrder] = useState(() => rank(comments, "popular"));
  const sorted = useMemo(() => {
    const byId = new Map(comments.map((comment) => [comment.id, comment]));
    const known = new Set(order);
    return [
      ...comments.filter((comment) => !known.has(comment.id)),
      ...order.flatMap((id) => byId.get(id) ?? []),
    ];
  }, [comments, order]);

  // A notification links to /@handle/post#c-<id>: open the threads the comment is in, then bring it
  // into view. Only once per visit, not when a new comment refreshes the list.
  const [target, setTarget] = useState<string | null>(null);
  const linked = useRef(false);
  useEffect(() => {
    if (linked.current) return;
    const id = window.location.hash.startsWith("#c-") ? window.location.hash.slice(3) : "";
    const path = id ? pathTo(comments, id) : null;
    if (!path) return;
    // After the first paint, so the server-rendered list hydrates as it was.
    const frame = requestAnimationFrame(() => {
      linked.current = true;
      setOpenIds((current) => new Set([...current, ...path.slice(0, -1)]));
      setTarget(id);
    });
    return () => cancelAnimationFrame(frame);
  }, [comments]);

  useEffect(() => {
    if (!target) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(`c-${target}`)?.scrollIntoView({ block: "center" }),
    );
    const timer = setTimeout(() => setTarget(null), 2500);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [target]);

  const changeSort = (value: Sort) => {
    setSort(value);
    setOrder(rank(comments, value));
  };

  const setOpen = useCallback(
    (id: string, value: boolean) =>
      setOpenIds((current) => {
        if (current.has(id) === value) return current;
        const next = new Set(current);
        if (value) next.add(id);
        else next.delete(id);
        return next;
      }),
    [],
  );

  return (
    <ThreadContext value={{ postId, viewer, isOpen: (id) => open.has(id), setOpen, replyingTo, setReplyingTo, target }}>
      <section id="comments" className="mt-10 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <h2 className="text-lg font-bold">{total ? `${total} კომენტარი` : "კომენტარები"}</h2>
          {comments.length > 1 && <SortMenu sort={sort} onChange={changeSort} />}
        </div>
        <div className="mt-5">
          <TopComposer />
        </div>
        <div className="mt-8 flex flex-col gap-6">
          {sorted.map((comment) => (
            <CommentThread key={comment.id} comment={comment} level={1} holderId={comment.id} />
          ))}
        </div>
      </section>
    </ThreadContext>
  );
}

/*
  The lines, as on YouTube. A comment with replies draws a line down from under its avatar.
  Each row under it (the toggle, then every reply) draws an elbow from that line into its
  avatar or into the toggle, and every row but the last carries the line on past itself, so
  the line ends at the last elbow. `--rail` is how far left of a row that line runs.
*/
const railLine = "pointer-events-none absolute left-(--rail) border-l border-thread";
const elbow = `${railLine} top-0 w-[calc(-1*var(--rail)-4px)] rounded-bl-xl border-b`;

const levels = {
  1: {
    avatar: "size-8 sm:size-10",
    // From under the avatar to the bottom of the comment, at the avatar's centre.
    stem: "left-4 top-9 sm:left-5 sm:top-11",
    // Replies start where this comment's text does.
    replies: "pl-11 [--rail:-28px] sm:pl-[52px] sm:[--rail:-32px]",
  },
  2: { avatar: "size-6", stem: "left-3 top-7", replies: "pl-9 [--rail:-24px]" },
  3: { avatar: "size-6", stem: "", replies: "" },
};

// `holderId` is the thread a reply to this comment shows up in: the comment itself, or for
// the third level, the second-level comment whose list it's in.
function CommentThread({ comment, level, holderId }: { comment: CommentNode; level: 1 | 2 | 3; holderId: string }) {
  const { isOpen, setOpen } = useThread();
  const hasReplies = level < 3 && comment.replies.length > 0;
  const open = hasReplies && isOpen(comment.id);
  const style = levels[level];

  return (
    <div>
      <CommentRow comment={comment} level={level} holderId={holderId} stem={hasReplies} />
      {hasReplies && (
        <ul className={`relative ${style.replies}`}>
          <li className="relative pt-1">
            <span aria-hidden="true" className={`${elbow} h-[22px]`} />
            {open && <span aria-hidden="true" className={`${railLine} top-0 bottom-0`} />}
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(comment.id, !open)}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-hover"
            >
              {open ? "დამალვა" : `${comment.replyCount} პასუხი`}
              <Chevron up={open} />
            </button>
          </li>
          {open &&
            comment.replies.map((reply, index) => (
              <li key={reply.id} className="relative pt-4">
                <span aria-hidden="true" className={`${elbow} h-7`} />
                {index < comment.replies.length - 1 && (
                  <span aria-hidden="true" className={`${railLine} top-0 bottom-0`} />
                )}
                <CommentThread
                  comment={reply}
                  level={level === 1 ? 2 : 3}
                  holderId={level === 1 ? reply.id : comment.id}
                />
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  level,
  holderId,
  stem,
}: {
  comment: CommentNode;
  level: 1 | 2 | 3;
  holderId: string;
  stem: boolean;
}) {
  const { viewer, replyingTo, setReplyingTo, target } = useThread();
  const style = levels[level];
  const { author } = comment;

  return (
    <div
      id={`c-${comment.id}`}
      className={`relative flex scroll-mt-20 gap-3 ${
        target === comment.id
          ? "isolate before:pointer-events-none before:absolute before:-inset-x-2 before:-inset-y-1 before:-z-10 before:animate-flash before:rounded-xl before:bg-hover"
          : ""
      }`}
    >
      {stem && <span aria-hidden="true" className={`absolute bottom-0 border-l border-thread ${style.stem}`} />}

      {author ? (
        <Link href={`/@${author.handle}`} className="shrink-0 self-start rounded-full">
          <Avatar src={author.avatar} className={style.avatar} />
        </Link>
      ) : (
        <Avatar className={style.avatar} />
      )}

      <div className="min-w-0 flex-1">
        {author ? (
          <>
            <div className="flex min-h-6 items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Link href={`/@${author.handle}`} className="truncate font-medium text-ink hover:underline">
                    {author.name || `@${author.handle}`}
                  </Link>
                  {author.followed && <FollowedIcon className="flex shrink-0" />}
                </div>
                <time dateTime={comment.dateTime} className="shrink-0 text-muted">
                  {comment.time}
                </time>
              </div>
              {comment.mine ? (
                <CommentMenu id={comment.id} />
              ) : (
                viewer && (
                  <ReportMenu
                    kind="comment"
                    id={comment.id}
                    label="კომენტარზე ჩივილი"
                    vertical
                    className="-my-1 -mr-2 shrink-0"
                  />
                )
              )}
            </div>
            <p className="mt-0.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap">
              {comment.replyTo && (
                <>
                  <Link href={`/@${comment.replyTo.handle}`} className="font-medium hover:underline">
                    @{comment.replyTo.name || comment.replyTo.handle}
                  </Link>{" "}
                </>
              )}
              {comment.body}
            </p>
            <div className="mt-0.5 -ml-2 flex items-center gap-1">
              <CommentLike comment={comment} />
              {viewer ? (
                <button type="button" onClick={() => setReplyingTo(comment.id)} className={replyClass}>
                  პასუხი
                </button>
              ) : (
                <SignInPrompt className={replyClass}>პასუხი</SignInPrompt>
              )}
            </div>
            {replyingTo === comment.id && (
              <div className="mt-2">
                <Composer parentId={comment.id} holderId={holderId} onDone={() => setReplyingTo(null)} />
              </div>
            )}
          </>
        ) : (
          <p className="flex min-h-6 items-center text-sm text-muted">კომენტარი წაშლილია</p>
        )}
      </div>
    </div>
  );
}

const replyClass =
  "h-8 cursor-pointer rounded-full px-3 text-sm font-medium text-ink transition-colors hover:bg-surface";

// What a signed-out reader gets instead of a comment or reply box: the same-looking trigger,
// which opens a card with a sign-in button that brings them back to this page.
function SignInPrompt({ className, children }: { className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const pathname = usePathname();
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={className}
      >
        {children}
      </button>
      {open && (
        <div role="dialog" aria-label="შესვლა" className={`${popoverClass} left-0 w-72 max-w-[calc(100vw-2rem)] p-5`}>
          <p className="text-center font-semibold text-ink">გინდა კომენტარის დაწერა?</p>
          <Button href={authUrl(pathname)} className="mt-4 w-full">
            შესვლა
          </Button>
        </div>
      )}
    </div>
  );
}

function CommentLike({ comment }: { comment: CommentNode }) {
  const { viewer } = useThread();
  const [like, toggle] = useLike(comment.liked, comment.likes, (value) => setCommentLike(comment.id, value));
  return <LikeButton small signedIn={Boolean(viewer)} liked={like.liked} count={like.count} onToggle={toggle} />;
}

function TopComposer() {
  const { viewer } = useThread();

  if (!viewer) {
    return (
      <div className="flex gap-3">
        <Avatar className="size-8 sm:size-10" />
        <div className="min-w-0 flex-1">
          <SignInPrompt className="block w-full cursor-text border-b border-line py-1.5 text-left text-[15px] leading-relaxed text-muted transition-colors hover:border-ink">
            დაწერე კომენტარი
          </SignInPrompt>
        </div>
      </div>
    );
  }

  return <Composer parentId={null} holderId={null} />;
}

// The top box is always there and shows its buttons once used; a reply box opens with them.
function Composer({
  parentId,
  holderId,
  onDone,
}: {
  parentId: string | null;
  holderId: string | null;
  onDone?: () => void;
}) {
  const { postId, viewer, setOpen } = useThread();
  const isReply = parentId !== null;
  const [text, setText] = useState("");
  const [active, setActive] = useState(isReply);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const field = useRef<HTMLTextAreaElement>(null);

  // Grows with the text instead of scrolling inside.
  const fit = () => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  const reset = () => {
    setText("");
    setError("");
    requestAnimationFrame(fit);
    if (isReply) onDone?.();
    else setActive(false);
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!text.trim() || pending) return;
    setError("");
    startTransition(async () => {
      const result = await addComment(postId, parentId, text);
      if (result?.error) return setError(result.error);
      if (holderId) setOpen(holderId, true);
      reset();
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
    if (event.key === "Escape" && isReply) onDone?.();
  };

  return (
    <form onSubmit={submit} className="flex gap-3">
      <Avatar src={viewer?.avatar} className={isReply ? "size-6" : "size-8 sm:size-10"} />
      <div className="min-w-0 flex-1">
        <textarea
          ref={field}
          rows={1}
          value={text}
          maxLength={maxLength}
          autoFocus={isReply}
          placeholder={isReply ? "დაწერე პასუხი" : "დაწერე კომენტარი"}
          aria-label={isReply ? "პასუხი" : "კომენტარი"}
          onFocus={() => setActive(true)}
          onKeyDown={onKeyDown}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
            fit();
          }}
          className="block w-full resize-none overflow-hidden border-b border-line bg-transparent py-1.5 text-[15px] leading-relaxed outline-none transition-colors placeholder:text-muted focus:border-ink focus-visible:outline-none"
        />
        {error && (
          <p aria-live="polite" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
        {active && (
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              გაუქმება
            </Button>
            <Button type="submit" size="sm" disabled={!text.trim() || pending}>
              გაგზავნა
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

function CommentMenu({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className="relative -my-1 -mr-2 shrink-0">
      <button
        type="button"
        aria-label="მეტი"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>

      {open && (
        <div role="menu" className={`${menuClass} w-44`}>
          <MenuItem
            icon={<TrashIcon />}
            danger
            onClick={() => {
              close();
              setConfirming(true);
            }}
          >
            წაშლა
          </MenuItem>
        </div>
      )}

      {confirming && <DeleteDialog id={id} onClose={() => setConfirming(false)} />}
    </div>
  );
}

function DeleteDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  return (
    <Dialog title="კომენტარის წაშლა" art="delete" onClose={onClose}>
      <p className="text-muted">კომენტარი სამუდამოდ წაიშლება.</p>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          გაუქმება
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteComment(id);
              onClose();
            })
          }
        >
          წაშლა
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// Opens under the button, from its left edge, like the heading next to it.
function SortMenu({ sort, onChange }: { sort: Sort; onChange: (sort: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="-mx-2 flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-[15px] font-medium text-ink transition-colors hover:bg-surface"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h11M4 18h6" />
        </svg>
        დალაგება
      </button>

      {open && (
        <div role="menu" className={`${popoverClass} left-0 w-52 p-1.5`}>
          {sorts.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={sort === option.value}
              onClick={() => {
                onChange(option.value);
                close();
              }}
              className={`${itemClass} ${sort === option.value ? "bg-surface font-medium" : ""}`}
            >
              <span aria-hidden="true" className="w-[18px] text-center">
                {option.emoji}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TrashIcon() {
  return (
    <Icon>
      <path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2l1-12M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" />
    </Icon>
  );
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-4 transition-transform ${up ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
