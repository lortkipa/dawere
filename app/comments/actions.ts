"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { maxCommentLength, retireComments } from "@/lib/comments";
import { db } from "@/lib/db";
import { isForeignKeyViolation } from "@/lib/db/errors";
import { comments } from "@/lib/db/schema";
import { postIdPattern, uuidPattern } from "@/lib/ids";
import { getCurrentUser } from "@/lib/session";

type Result = { error: string } | void;

const genericError = "რაღაც შეცდომაა, სცადე თავიდან";

async function requireReader() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (!user.onboardedAt) redirect("/onboarding");
  return user;
}

export async function addComment(postId: string, parentId: string | null, value: string): Promise<Result> {
  const user = await requireReader();
  const body = value.trim();
  if (!postIdPattern.test(postId) || body.length === 0 || body.length > maxCommentLength) {
    return { error: genericError };
  }

  if (parentId) {
    if (!uuidPattern.test(parentId)) return { error: genericError };
    const [parent] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.id, parentId), eq(comments.postId, postId), isNull(comments.deletedAt)))
      .limit(1);
    if (!parent) return { error: "ეს კომენტარი წაშლილია" };
  }

  try {
    await db.insert(comments).values({ postId, parentId, userId: user.id, body });
  } catch (error) {
    // The post or the comment being answered was deleted in the meantime.
    if (isForeignKeyViolation(error)) return { error: genericError };
    throw error;
  }
  refresh();
}

export async function deleteComment(id: string) {
  const user = await requireReader();
  if (!uuidPattern.test(id)) return;

  await retireComments(and(eq(comments.id, id), eq(comments.userId, user.id))!);
  refresh();
}
