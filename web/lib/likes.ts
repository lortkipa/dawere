import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { commentLikes, likes } from "@/db/schema";

/**
 * The two questions an article page asks about likes, kept together because
 * they are asked together — the same pair `lib/follows.ts` holds for following.
 *
 * The conversation's likes are not asked one comment at a time and so are not
 * here: `lib/comments.ts` counts every comment's in the grouped scan that
 * builds the threads. Only the count a click hands back lives below.
 */

/** How many people liked this article. The number the button carries. */
export async function likeCount(articleId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(likes)
    .where(eq(likes.articleId, articleId));

  return row?.total ?? 0;
}

/**
 * Whether the viewer already liked it — the state the button opens in. A
 * signed-out reader has liked nothing, which answers without a query.
 */
export async function hasLiked(
  viewerId: string | undefined,
  articleId: string,
): Promise<boolean> {
  if (!viewerId) return false;

  const row = await db.query.likes.findFirst({
    columns: { userId: true },
    where: and(eq(likes.articleId, articleId), eq(likes.userId, viewerId)),
  });

  return row !== undefined;
}

/**
 * How many liked one comment — what `setCommentLiked` returns to the button
 * that just wrote a row. The page's own counts arrive with the threads.
 */
export async function commentLikeCount(commentId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(commentLikes)
    .where(eq(commentLikes.commentId, commentId));

  return row?.total ?? 0;
}
