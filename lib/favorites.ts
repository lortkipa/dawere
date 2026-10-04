import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { postFavorites } from "./db/schema";

export async function isFavorite(postId: string, viewerId: string) {
  const [row] = await db
    .select({ id: postFavorites.userId })
    .from(postFavorites)
    .where(and(eq(postFavorites.postId, postId), eq(postFavorites.userId, viewerId)))
    .limit(1);
  return Boolean(row);
}
