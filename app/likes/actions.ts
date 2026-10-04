"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { insertIgnoringGone } from "@/lib/db/errors";
import { commentLikes, comments, postLikes } from "@/lib/db/schema";
import { postIdPattern, uuidPattern } from "@/lib/ids";
import { requireReader } from "@/lib/session";

export async function setPostLike(postId: string, like: boolean) {
  const user = await requireReader();
  if (!postIdPattern.test(postId)) return;

  if (like) {
    await insertIgnoringGone(() =>
      db.insert(postLikes).values({ userId: user.id, postId }).onConflictDoNothing(),
    );
  } else {
    await db.delete(postLikes).where(and(eq(postLikes.userId, user.id), eq(postLikes.postId, postId)));
  }
  refresh();
}

export async function setCommentLike(commentId: string, like: boolean) {
  const user = await requireReader();
  if (!uuidPattern.test(commentId)) return;

  if (like) {
    // Placeholders of deleted comments can't be liked.
    const [comment] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.id, commentId), isNull(comments.deletedAt)))
      .limit(1);
    if (comment) {
      await insertIgnoringGone(() =>
        db.insert(commentLikes).values({ userId: user.id, commentId }).onConflictDoNothing(),
      );
    }
  } else {
    await db
      .delete(commentLikes)
      .where(and(eq(commentLikes.userId, user.id), eq(commentLikes.commentId, commentId)));
  }
  refresh();
}
