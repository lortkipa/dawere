"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getReportTarget, reportsOn, type ReportTarget } from "@/lib/admin-reports";
import { maxBanReason } from "@/lib/ban-rules";
import { ban } from "@/lib/bans";
import { retireComments } from "@/lib/comments";
import { db } from "@/lib/db";
import { comments, reports, type User } from "@/lib/db/schema";
import { removePost } from "@/lib/post-save";
import { reportKinds, type ReportKind } from "@/lib/report-rules";
import { closeReportsAbout } from "@/lib/reports";
import { canManage, canRemove } from "@/lib/roles";

type Result = { error: string } | void;

const forbiddenError = "ამის უფლება არ გაქვს";

// The signed-in admin and the reported thing, or an error when it's gone or out of their reach.
async function managedTarget(
  kind: ReportKind,
  id: string,
): Promise<{ actor: User; target: ReportTarget } | { error: string }> {
  const actor = await requireAdmin();
  if (!reportKinds.includes(kind)) return { error: "რაღაც შეცდომაა, სცადე თავიდან" };
  const target = await getReportTarget(kind, id);
  if (!target) return { error: "ეს აღარ არსებობს" };
  if (!canManage(actor, target.author)) return { error: forbiddenError };
  return { actor, target };
}

// Nothing wrong with it: the open reports close and it stays.
export async function dismissReports(kind: ReportKind, id: string): Promise<Result> {
  const access = await managedTarget(kind, id);
  if ("error" in access) return access;

  await db
    .update(reports)
    .set({ status: "dismissed", closedBy: access.actor.id, closedAt: new Date() })
    .where(and(reportsOn(kind, id), eq(reports.status, "open")));
  refresh();
}

// Deleting a post or comment deletes its reports too, so the queue has nothing left to show.
export async function deleteReported(kind: ReportKind, id: string): Promise<Result> {
  const access = await managedTarget(kind, id);
  if ("error" in access) return access;
  const { target } = access;

  if (target.kind === "post") await removePost(target.post);
  else if (target.kind === "comment") await retireComments(eq(comments.id, target.comment.id));
  else return { error: forbiddenError };
  redirect("/admin/reports");
}

// The same ban as on the user's page; every open report about them closes with it.
export async function banReportedAuthor(kind: ReportKind, id: string, reasonValue: string): Promise<Result> {
  const access = await managedTarget(kind, id);
  if ("error" in access) return access;
  const { actor, target } = access;
  if (!canRemove(actor, target.author)) return { error: forbiddenError };
  const reason = reasonValue.trim();
  if (reason.length > maxBanReason) return { error: "რაღაც შეცდომაა, სცადე თავიდან" };

  await ban(target.author.email, reason, actor.id);
  await closeReportsAbout(target.author.id, actor.id);
  refresh();
}
