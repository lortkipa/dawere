import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { reports } from "./db/schema";

// Who wrote what a report points at: the user itself, or the post's or comment's author.
// Spelled out with the table, so inside the subqueries the columns can't mean their own tables.
export const reportAuthor = sql<
  string | null
>`coalesce(${reports}.user_id, (select p.user_id from posts p where p.id = ${reports}.post_id), (select c.user_id from comments c where c.id = ${reports}.comment_id))`;

// After a ban: whatever was reported about the user and their writing has been dealt with.
export async function closeReportsAbout(userId: string, actorId: string) {
  await db
    .update(reports)
    .set({ status: "actioned", closedBy: actorId, closedAt: new Date() })
    .where(and(eq(reports.status, "open"), sql`${reportAuthor} = ${userId}`));
}

// Posts, comments and users with at least one open report, for the admin nav.
export async function openReportTargets() {
  const [row] = await db
    .select({
      count: sql<number>`count(distinct (${reports.kind}, ${reports.postId}, ${reports.commentId}, ${reports.userId}))::int`,
    })
    .from(reports)
    .where(eq(reports.status, "open"));
  return row.count;
}
