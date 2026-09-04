import Link from "next/link";
import type { CommentView } from "@/lib/comments";
import { formatSince } from "@/lib/date";
import { HeartIcon } from "@/components/icons/HeartIcon";
import { AuthTrigger } from "@/components/landing/AuthDialogProvider";
import { Avatar } from "@/components/ui/Avatar";
import { CommentForm } from "./CommentForm";
import { CommentLikeButton } from "./CommentLikeButton";
import { DeleteCommentButton } from "./DeleteCommentButton";
import { ReplyBox } from "./ReplyBox";
import styles from "./Comments.module.css";

type CommentSectionProps = {
  articleId: string;
  /** Top-level comments, newest first, each holding its own replies. */
  threads: CommentView[];
  /** Replies counted too — what the heading says there is to read. */
  total: number;
  /** Who is reading, or nobody. Decides which comments carry a delete. */
  viewerId: string | null;
  /** Whoever wrote the article may delete any comment under it. */
  articleAuthorId: string;
};

/**
 * How far the indent follows a chain of replies before giving up. Replies run
 * as deep as the conversation does, but the column does not: past this the
 * thread stops stepping right and each reply says whom it answers instead —
 * a page of comments a screen wide is worth more than a perfect diagram.
 */
const MAX_INDENT = 4;

/**
 * Everything said under one article. Rendered on the server like the article
 * above it — the only parts that ship as JavaScript are the field, the reply
 * control, the like and the delete, because they are the only parts that do
 * anything.
 */
export function CommentSection({
  articleId,
  threads,
  total,
  viewerId,
  articleAuthorId,
}: CommentSectionProps) {
  const signedIn = viewerId !== null;

  return (
    <section className={styles.section} aria-labelledby="comments-heading">
      <h2 id="comments-heading" className={styles.heading}>
        კომენტარები
        {total > 0 && <span className={styles.total}>{total}</span>}
      </h2>

      {signedIn ? (
        <CommentForm
          articleId={articleId}
          placeholder="დაწერე კომენტარი…"
          submitLabel="გამოქვეყნება"
        />
      ) : (
        <div className={styles.prompt}>
          <p className={styles.promptText}>
            კომენტარის დასაწერად ჯერ უნდა შეხვიდე.
          </p>
          <AuthTrigger className={styles.signIn}>შესვლა</AuthTrigger>
        </div>
      )}

      {threads.length === 0 ? (
        <p className={styles.empty}>
          ჯერ არავის უთქვამს არაფერი — პირველი შენ იყავი.
        </p>
      ) : (
        <ul className={styles.threads}>
          {threads.map((thread) => (
            <li key={thread.id}>
              <Comment
                comment={thread}
                depth={0}
                articleId={articleId}
                viewerId={viewerId}
                articleAuthorId={articleAuthorId}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * One comment and everything hanging off it, whether it opened the thread or
 * answers the answer to it: the two are the same row, and only how far in it
 * sits says which is which.
 */
function Comment({
  comment,
  depth,
  articleId,
  viewerId,
  articleAuthorId,
}: {
  comment: CommentView;
  /** 0 for a thread, one more for every reply below it. */
  depth: number;
  articleId: string;
  viewerId: string | null;
  articleAuthorId: string;
}) {
  const signedIn = viewerId !== null;
  const mine = signedIn && comment.author.id === viewerId;
  const myArticle = signedIn && articleAuthorId === viewerId;
  const byAuthor = comment.author.id === articleAuthorId;

  // Anything but the comment that opened the thread is drawn a size down, and
  // the class carries the measures its own replies line up against too.
  const nested = depth > 0;

  // Its parent was the last comment to be indented, so this one sits level with
  // it and the name is the only thing left saying what it is a reply to.
  const adrift = depth > MAX_INDENT;

  return (
    <div
      className={nested ? `${styles.thread} ${styles.nested}` : styles.thread}
    >
      {/* The address of one comment inside the page holding the conversation.
          A notification about something said here leads to this, rather than
          to the top of the article and a hunt down the thread for it. */}
      <article id={`c-${comment.id}`} className={styles.comment}>
        <Avatar
          name={comment.author.name}
          image={comment.author.image}
          size={nested ? 26 : 32}
          className={styles.avatar}
        />

        {/* Who and when, and the one thing to be done about it. They share a row
            rather than stacking, so the comment below is two lines of the page
            and not four. */}
        <header className={styles.head}>
          <Link href={`/${comment.author.handle}`} className={styles.name}>
            {comment.author.name}
          </Link>

          {byAuthor && <span className={styles.badge}>ავტორი</span>}

          {adrift && comment.replyingTo && (
            <span className={styles.replyingTo}>↳ {comment.replyingTo}</span>
          )}

          {/* How long ago, not which day: every comment on a piece published
              this morning would otherwise carry the same date. */}
          <time
            className={styles.date}
            dateTime={comment.createdAt.toISOString()}
          >
            {formatSince(comment.createdAt)}
          </time>

          {(mine || myArticle) && (
            <DeleteCommentButton
              id={comment.id}
              replies={descendants(comment)}
            />
          )}
        </header>

        <p className={styles.body}>{comment.body}</p>

        {/* What can be done with what was said. The reply control opens into
            this row rather than beside it, so the composer lands under the
            comment it answers however deep that is. */}
        <div className={styles.tools}>
          {mine ? (
            // Your own comment has no button — the same rule the article keeps
            // for its author. The tally still stands, when there is one.
            comment.likes > 0 && (
              <span className={styles.tally}>
                <HeartIcon />
                <span className={styles.likeCount}>{comment.likes}</span>
              </span>
            )
          ) : (
            <CommentLikeButton
              commentId={comment.id}
              liked={comment.liked}
              likes={comment.likes}
              signedIn={signedIn}
            />
          )}

          <ReplyBox
            articleId={articleId}
            parentId={comment.id}
            signedIn={signedIn}
          />
        </div>
      </article>

      {comment.replies.length > 0 && (
        <ul className={depth < MAX_INDENT ? styles.replies : styles.level}>
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <Comment
                comment={reply}
                depth={depth + 1}
                articleId={articleId}
                viewerId={viewerId}
                articleAuthorId={articleAuthorId}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Everything that would go with this comment if it were deleted — the whole
 * chain below it, not just the replies directly to it, because `parent_id`
 * cascades all the way down.
 */
function descendants(comment: CommentView): number {
  return comment.replies.reduce(
    (total, reply) => total + 1 + descendants(reply),
    0,
  );
}
