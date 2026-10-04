"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { insertIgnoringGone } from "@/lib/db/errors";
import { postFavorites } from "@/lib/db/schema";
import { postIdPattern } from "@/lib/ids";
import { requireReader } from "@/lib/session";

export async function setPostFavorite(postId: string, favorite: boolean) {
  const user = await requireReader();
  if (!postIdPattern.test(postId)) return;

  if (favorite) {
    await insertIgnoringGone(() =>
      db.insert(postFavorites).values({ userId: user.id, postId }).onConflictDoNothing(),
    );
  } else {
    await db.delete(postFavorites).where(and(eq(postFavorites.userId, user.id), eq(postFavorites.postId, postId)));
  }
  refresh();
}
