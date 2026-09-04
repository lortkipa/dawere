"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, commentLikes, comments, likes } from "@/db/schema";
import { currentAccount } from "@/lib/account";
import { commentLikeCount, likeCount } from "@/lib/likes";

/**
 * Liking is one row, and each of these is both halves of it: `next` is the
 * state the button wants to be in rather than a verb, so a double click ends
 * where one click would rather than undoing itself — the same shape
 * `setFollowing` has. An article is liked below, a comment under it after that.
 *
 * The reader is re-read from the session rather than taken from the caller. A
 * Server Action is a POST endpoint anybody can call, so the id the button sends
 * is the article; who is liking it is never theirs to say.
 *
 * Deliberately does not revalidate. The count lives on this page alone, and the
 * only person whose view of it just changed is the reader who clicked — their
 * button has already painted it. Re-rendering the article underneath them to
 * move a number they are looking at would be pure waste.
 */

export type LikeResult =
  | { ok: true; liked: boolean; likes: number }
  | { ok: false; error: string };

export async function setLiked(
  articleId: string,
  next: boolean,
): Promise<LikeResult> {
  const account = await currentAccount();
  if (!account) return { ok: false, error: "ჯერ უნდა შეხვიდე." };

  const article = await db.query.articles.findFirst({
    columns: { authorId: true, status: true },
    where: eq(articles.id, articleId),
  });

  // Deleted between the render and the click, or never public in the first
  // place: a draft has no address, so nobody is standing on one to like it.
  if (!article || article.status !== "published") {
    return { ok: false, error: "სტატია ვერ მოიძებნა." };
  }

  // The reader's button is the only one there is — the author is shown their
  // own count instead. This is the guarantee behind that, not a second check.
  if (article.authorId === account.id) {
    return { ok: false, error: "საკუთარ სტატიას ვერ მოიწონებ." };
  }

  if (next) {
    await db
      .insert(likes)
      .values({ articleId, userId: account.id })
      // Already liked: the row is the state, so there is nothing to add.
      .onConflictDoNothing();
  } else {
    await db
      .delete(likes)
      .where(and(eq(likes.articleId, articleId), eq(likes.userId, account.id)));
  }

  // Counted after the write rather than adjusted by one, so a reader who was
  // not alone on the page gets the number as it now stands.
  return { ok: true, liked: next, likes: await likeCount(articleId) };
}

/**
 * The same row for a comment, refused on the same ground: whose comment this is
 * lives in another table, so this is the only place a self-like can be turned
 * down. The page does not draw the button on your own comment either — that is
 * the reason, this is the guarantee.
 *
 * Does not revalidate, for the reason above: the reader who clicked has already
 * painted it, and re-rendering a page of comments to move one number under one
 * of them would throw the conversation away to redraw it unchanged.
 */
export async function setCommentLiked(
  commentId: string,
  next: boolean,
): Promise<LikeResult> {
  const account = await currentAccount();
  if (!account) return { ok: false, error: "ჯერ უნდა შეხვიდე." };

  const [row] = await db
    .select({ writerId: comments.authorId, status: articles.status })
    .from(comments)
    .innerJoin(articles, eq(comments.articleId, articles.id))
    .where(eq(comments.id, commentId));

  // Deleted between the render and the click — or the thread it hung off was.
  if (!row || row.status !== "published") {
    return { ok: false, error: "კომენტარი ვეღარ მოიძებნა." };
  }

  if (row.writerId === account.id) {
    return { ok: false, error: "საკუთარ კომენტარს ვერ მოიწონებ." };
  }

  if (next) {
    await db
      .insert(commentLikes)
      .values({ commentId, userId: account.id })
      // Already liked: the row is the state, so there is nothing to add.
      .onConflictDoNothing();
  } else {
    await db
      .delete(commentLikes)
      .where(
        and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.userId, account.id),
        ),
      );
  }

  return { ok: true, liked: next, likes: await commentLikeCount(commentId) };
}
