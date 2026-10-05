"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { legalVersions } from "@/lib/db/schema";
import { getLegalVersion, parseLegal } from "@/lib/legal";
import { isLegalDoc } from "@/lib/legal-docs";
import { uuidPattern } from "@/lib/ids";

type Result = { error: string } | void;

const genericError = "რაღაც შეცდომაა, სცადე თავიდან";

// Every save is a new version; readers see it at once.
export async function saveLegal(doc: string, input: { title: string; body: string }): Promise<Result> {
  const actor = await requireAdmin();
  if (!isLegalDoc(doc)) return { error: genericError };
  const parsed = parseLegal(input.title, input.body);
  if (!parsed) return { error: genericError };
  await db.insert(legalVersions).values({ doc, ...parsed, editorId: actor.id });
  redirect(`/admin/legal/${doc}`);
}

// Saves an older version again as the newest one, so the history keeps both.
export async function restoreLegal(id: string): Promise<Result> {
  const actor = await requireAdmin();
  if (!uuidPattern.test(id)) return { error: genericError };
  const row = await getLegalVersion(id);
  if (!row) return { error: "ეს ვერსია აღარ არსებობს" };
  const { doc, title, body } = row.version;
  await db.insert(legalVersions).values({ doc, title, body, editorId: actor.id });
  redirect(`/admin/legal/${doc}`);
}
