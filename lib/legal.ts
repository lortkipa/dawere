import "server-only";
import { getSchema, type JSONContent } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { desc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "./db";
import { legalVersions, users } from "./db/schema";
import { defaultLegal, defaultsDate } from "./legal-defaults";
import { maxLegalBodyLength, maxLegalTitleLength, type LegalDoc } from "./legal-docs";
import { legalExtensions } from "./legal-schema";

const schema = getSchema(legalExtensions);

// The newest saved version, or the built-in text while there is none.
export const getLegal = cache(async (doc: LegalDoc) => {
  const [row] = await db
    .select({ title: legalVersions.title, body: legalVersions.body, createdAt: legalVersions.createdAt })
    .from(legalVersions)
    .where(eq(legalVersions.doc, doc))
    .orderBy(desc(legalVersions.createdAt))
    .limit(1);
  if (row) return { ...row, saved: true };
  return { ...defaultLegal(doc), createdAt: defaultsDate, saved: false };
});

// Newest first, with whoever saved each one.
export async function getLegalHistory(doc: LegalDoc) {
  return db
    .select({
      id: legalVersions.id,
      title: legalVersions.title,
      createdAt: legalVersions.createdAt,
      editorName: users.name,
      editorEmail: users.email,
    })
    .from(legalVersions)
    .leftJoin(users, eq(users.id, legalVersions.editorId))
    .where(eq(legalVersions.doc, doc))
    .orderBy(desc(legalVersions.createdAt));
}

export async function getLegalVersion(id: string) {
  const [row] = await db
    .select({ version: legalVersions, editorName: users.name, editorEmail: users.email })
    .from(legalVersions)
    .leftJoin(users, eq(users.id, legalVersions.editorId))
    .where(eq(legalVersions.id, id))
    .limit(1);
  return row ?? null;
}

// The title and body the editor sent, checked against the same schema the pages render with.
export function parseLegal(title: string, body: string): { title: string; body: JSONContent } | null {
  const cleanTitle = title.trim().replace(/\s+/g, " ");
  if (!cleanTitle || cleanTitle.length > maxLegalTitleLength) return null;
  let doc: Node;
  try {
    doc = Node.fromJSON(schema, JSON.parse(body));
    doc.check();
  } catch {
    return null;
  }
  const length = doc.textContent.trim().length;
  if (length === 0 || length > maxLegalBodyLength) return null;
  return { title: cleanTitle, body: doc.toJSON() };
}
