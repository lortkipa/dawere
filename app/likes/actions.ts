"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isForeignKeyViolation } from "@/lib/db/errors";
import { commentLikes, comments, postLikes } from "@/lib/db/schema";
import { postIdPattern, uuidPattern } from "@/lib/ids";
import { getCurrentUser } from "@/lib/session";

async function requireReader() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (!user.onboardedAt) redirect("/onboarding");
  return user;
}

// A post or comment deleted in the meantime makes the insert fail; there is nothing to like then.
async function insertIgnoringGone(insert: () => Promise<unknown>) {
  try {
    await insert();
  } catch (error) {
    if (!isForeignKeyViolation(error)) throw error;
  }
}

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
