"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { notBanned } from "@/lib/bans";
import { db } from "@/lib/db";
import { comments, posts, reports, users } from "@/lib/db/schema";
import { postIdPattern, uuidPattern } from "@/lib/ids";
import { maxReportDetails, reasonsFor, reportKinds, type ReportKind } from "@/lib/report-rules";
import { requireReader } from "@/lib/session";

type Result = { error: string } | void;

const genericError = "რაღაც შეცდომაა, სცადე თავიდან";

// The author of a post, comment or user readers can still see, or null.
async function visibleAuthor(kind: ReportKind, id: string) {
  if (kind === "post") {
    if (!postIdPattern.test(id)) return null;
    const [row] = await db
      .select({ authorId: posts.userId })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.userId))
      .where(and(eq(posts.id, id), notBanned))
      .limit(1);
    return row?.authorId ?? null;
  }
  if (!uuidPattern.test(id)) return null;
  if (kind === "comment") {
    const [row] = await db
      .select({ authorId: users.id })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(and(eq(comments.id, id), isNotNull(comments.body), notBanned))
      .limit(1);
    return row?.authorId ?? null;
  }
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, id), isNotNull(users.onboardedAt), notBanned))
    .limit(1);
  return row?.id ?? null;
}

const targetColumn = { post: reports.postId, comment: reports.commentId, user: reports.userId };

// Reporting the same thing again while the first report is still open replaces it.
export async function report(kind: ReportKind, id: string, reason: string, value: string): Promise<Result> {
  const reader = await requireReader();
  const details = value.trim();
  if (
    !reportKinds.includes(kind) ||
    !reasonsFor(kind).some((option) => option.slug === reason) ||
    details.length > maxReportDetails ||
    (reason === "other" && !details)
  ) {
    return { error: genericError };
  }

  const authorId = await visibleAuthor(kind, id);
  if (!authorId) return { error: "ეს აღარ არსებობს" };
  if (authorId === reader.id) return { error: genericError };

  const fields = { reason, details: details || null, createdAt: new Date() };
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.reporterId, reader.id), eq(targetColumn[kind], id), eq(reports.status, "open")))
    .limit(1);
  if (existing) {
    await db.update(reports).set(fields).where(eq(reports.id, existing.id));
  } else {
    const target = kind === "post" ? { postId: id } : kind === "comment" ? { commentId: id } : { userId: id };
    await db.insert(reports).values({ reporterId: reader.id, kind, ...target, ...fields });
  }
}
