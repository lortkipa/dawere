"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { cleanCodeEmailFooter, maxCodeEmailFooterLength } from "@/lib/code-email";
import { resetSiteText, setSiteText } from "@/lib/site-texts";

type Result = { error: string } | void;

// The next code email uses it at once. An empty text is allowed: the email then ends at the code.
export async function saveCodeEmailFooter(value: string): Promise<Result> {
  const actor = await requireAdmin();
  const footer = cleanCodeEmailFooter(value);
  if (footer.length > maxCodeEmailFooterLength) return { error: "ტექსტი ძალიან გრძელია" };
  await setSiteText("code-email-footer", footer, actor.id);
  refresh();
}

export async function resetCodeEmailFooter() {
  await requireAdmin();
  await resetSiteText("code-email-footer");
  refresh();
}
