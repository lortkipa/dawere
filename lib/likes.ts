import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "./db";
import { postLikes } from "./db/schema";

export async function postLikeState(postId: string, viewerId: string | undefined) {
  const [[total], [own]] = await Promise.all([
    db.select({ count: count() }).from(postLikes).where(eq(postLikes.postId, postId)),
    viewerId
      ? db
          .select({ id: postLikes.userId })
          .from(postLikes)
          .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, viewerId)))
          .limit(1)
      : [],
  ]);
  return { count: total?.count ?? 0, liked: Boolean(own) };
}
