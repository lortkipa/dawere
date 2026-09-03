import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { follows } from "@/db/schema";

/**
 * The two questions every author's page asks about following, kept together
 * because they are asked together and neither is worth a file of its own.
 */

/** How many people read this author. */
export async function followerCount(authorId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(follows)
    .where(eq(follows.followingId, authorId));

  return row?.total ?? 0;
}

/**
 * Whether the viewer already follows this author — the state the button opens
 * in. A signed-out viewer follows nobody, and nobody follows themselves, so
 * both of those answer without a query.
 */
export async function isFollowing(
  viewerId: string | undefined,
  authorId: string,
): Promise<boolean> {
  if (!viewerId || viewerId === authorId) return false;

  const row = await db.query.follows.findFirst({
    columns: { followerId: true },
    where: and(
      eq(follows.followerId, viewerId),
      eq(follows.followingId, authorId),
    ),
  });

  return row !== undefined;
}
