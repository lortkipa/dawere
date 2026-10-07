import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { siteTexts, users } from "./db/schema";

export type SiteTextKey = "code-email-footer";

// The saved text, or null while it's still the built-in one.
export async function getSiteText(key: SiteTextKey) {
  const [row] = await db
    .select({ value: siteTexts.value, updatedAt: siteTexts.updatedAt, editorName: users.name, editorEmail: users.email })
    .from(siteTexts)
    .leftJoin(users, eq(users.id, siteTexts.editorId))
    .where(eq(siteTexts.key, key))
    .limit(1);
  return row ?? null;
}

export async function setSiteText(key: SiteTextKey, value: string, editorId: string) {
  const set = { value, editorId, updatedAt: new Date() };
  await db.insert(siteTexts).values({ key, ...set }).onConflictDoUpdate({ target: siteTexts.key, set });
}

// Back to the built-in text.
export async function resetSiteText(key: SiteTextKey) {
  await db.delete(siteTexts).where(eq(siteTexts.key, key));
}
