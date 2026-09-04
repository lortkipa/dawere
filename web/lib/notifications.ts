import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  articles,
  comments,
  follows,
  notifications,
  users,
  type NotificationKind,
} from "@/db/schema";

/**
 * Everything the platform does with news: the two writes the actions make, the
 * count the top bar carries, and the list the page draws. They are together
 * because they are one feature, and it is small enough to read at once.
 */

/** More news than anyone has waiting. Paging arrives with the reader who needs it. */
const NOTIFICATION_LIMIT = 60;

/** A quoted comment is a reminder of what was said, not the thing itself. */
const QUOTE = 160;

/**
 * Tells somebody what just happened to something of theirs — unless it was
 * their own doing, which is not news and which the table refuses outright.
 * Every caller is a Server Action that has already decided the thing happened;
 * this only writes it down.
 */
export async function notify(news: {
  /** Who is being told. */
  userId: string;
  /** Who did it. Never the same person — see above. */
  actorId: string;
  kind: NotificationKind;
  articleId: string;
  commentId?: string | null;
}): Promise<void> {
  if (news.userId === news.actorId) return;

  await db.insert(notifications).values(news);
}

/**
 * Tells everybody who follows an author that they have published. The one kind
 * of news with more than one person to tell, and the only one that was not done
 * to whoever reads it: what happened is that there is something to read.
 *
 * Written at the moment the slug is minted and at no other, because that is the
 * moment the article becomes something anybody could open. Retitling it or
 * editing it afterwards is the same piece, not a second one.
 *
 * One read and one insert rather than an `insert … select` over `follows`,
 * which would be the single statement but would have to mint the ids in SQL —
 * a second way of making an id, for a list that is one person's followers.
 * Nothing here has to refuse the author their own news: `follows_not_self`
 * means nobody is in their own list to begin with.
 */
export async function notifyFollowers(
  actorId: string,
  articleId: string,
): Promise<void> {
  const followers = await db
    .select({ id: follows.followerId })
    .from(follows)
    .where(eq(follows.followingId, actorId));

  // Published to nobody, which is most first articles.
  if (followers.length === 0) return;

  await db.insert(notifications).values(
    followers.map(({ id }) => ({
      userId: id,
      actorId,
      kind: "published" as const,
      articleId,
    })),
  );
}

/**
 * Takes the news back, because the thing it reported has been undone.
 *
 * Only a like needs this. Everything else a notification reports is a row that
 * this one references — a comment, a reply, the article itself — so deleting it
 * cascades the news away, and there is nothing left of a like to cascade off:
 * the row it wrote about was `likes`, which the notification does not point at.
 * Addressed by what the button already knows, which is what
 * `notifications_actor_idx` is for.
 */
export async function withdraw(like: {
  actorId: string;
  kind: "article_like" | "comment_like";
  articleId: string;
  /** The comment liked, when it was a comment that was. */
  commentId?: string | null;
}): Promise<void> {
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.actorId, like.actorId),
        eq(notifications.kind, like.kind),
        eq(notifications.articleId, like.articleId),
        // The kind already separates a liked comment from a liked article, so
        // this only picks one liked comment out of several under one piece.
        like.commentId ? eq(notifications.commentId, like.commentId) : undefined,
      ),
    );
}

/**
 * How much is waiting — the number on the bell in the top bar, asked on every
 * page a signed-in person loads. A prefix of the same index the page reads.
 */
export async function unreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );

  return row?.total ?? 0;
}

/** One piece of news, as the page draws it. */
export type NotificationView = {
  id: string;
  kind: NotificationKind;
  createdAt: Date;
  /** Whether the reader has got to it yet — opened it, or cleared the list. */
  unread: boolean;
  actor: { name: string; handle: string; image: string | null };
  /** The article it happened under — where the row leads, and its context. */
  articleTitle: string;
  /** The article, and the comment inside it when the news names one. */
  href: string;
  /** What was said, on one line. Null when the news is about the piece itself. */
  quote: string | null;
};

/**
 * This reader's news, newest first, in one query: the row, whoever caused it,
 * the article it happened under and the comment it names. The comment is a left
 * join because a like on the article names none.
 *
 * Not grouped — three people liking one piece is three lines, not "3 people".
 * Grouping is worth writing when somebody has enough news for it to be worth
 * reading, and the shape here does not stand in the way of it.
 */
export async function notificationFeed(
  userId: string,
): Promise<NotificationView[]> {
  const rows = await db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
      commentId: notifications.commentId,
      actorName: users.name,
      actorEmail: users.email,
      actorHandle: users.handle,
      actorImage: users.image,
      title: articles.title,
      slug: articles.slug,
      body: comments.body,
    })
    .from(notifications)
    // Inner on both: an actor and an article are NOT NULL and cascade, so news
    // whose author deleted their account is gone rather than anonymous.
    .innerJoin(users, eq(notifications.actorId, users.id))
    .innerJoin(articles, eq(notifications.articleId, articles.id))
    .leftJoin(comments, eq(notifications.commentId, comments.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(NOTIFICATION_LIMIT);

  return (
    rows
      // Only a published article can be liked or commented on, so a row without
      // a slug is one nothing could have written. Dropped rather than drawn as
      // a line that leads nowhere.
      .filter((row) => row.slug !== null)
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        createdAt: row.createdAt,
        unread: row.readAt === null,
        actor: {
          // The same fallback as everywhere else the platform names somebody.
          name: row.actorName?.trim() || row.actorEmail,
          handle: row.actorHandle,
          image: row.actorImage,
        },
        articleTitle: row.title,
        // The comment is an anchor on the article's own page: news about a
        // conversation lands in it rather than at the top of the piece.
        href: row.commentId
          ? `/a/${row.slug}#c-${row.commentId}`
          : `/a/${row.slug}`,
        quote: row.body === null ? null : oneLine(row.body),
      }))
  );
}

/**
 * A comment as a notification shows it: the paragraphs it was written in are
 * the article page's business, and here it is one line of a list.
 */
function oneLine(body: string): string {
  const text = body.replace(/\s+/g, " ").trim();

  return text.length > QUOTE ? `${text.slice(0, QUOTE).trimEnd()}…` : text;
}
