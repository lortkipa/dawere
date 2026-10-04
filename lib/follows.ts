import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "./db";
import { follows } from "./db/schema";

export async function isFollowing(followerId: string, followingId: string) {
  const [row] = await db
    .select({ id: follows.followerId })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .limit(1);
  return Boolean(row);
}

export async function followerCount(userId: string) {
  const [row] = await db.select({ count: count() }).from(follows).where(eq(follows.followingId, userId));
  return row?.count ?? 0;
}
