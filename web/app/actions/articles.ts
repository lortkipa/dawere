"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles, type ArticleStatus } from "@/db/schema";
import {
  cleanArticleHtml,
  excerptFrom,
  toPlainText,
  wordCount,
} from "@/lib/html";
import { slugFromTitle } from "@/lib/slug";

/**
 * Every action here re-reads the session and scopes its query by `authorId`.
 * A Server Action is a POST endpoint that anyone can call directly, so the fact
 * that the only UI reaching it is the author's own editor proves nothing.
 */

const MAX_TITLE = 200;
const MAX_HTML = 200_000;

export type SaveInput = {
  /** Absent while an article is being written for the first time. */
  id?: string;
  title: string;
  html: string;
  /** Turns a draft public. Ignored once the article already is. */
  publish: boolean;
};

export type SaveResult =
  | { ok: true; id: string; slug: string | null; status: ArticleStatus }
  | { ok: false; error: string };

export async function saveArticle(input: SaveInput): Promise<SaveResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "ჯერ უნდა შეხვიდე." };

  const authorId = session.user.id;

  if (typeof input?.title !== "string" || typeof input?.html !== "string") {
    return { ok: false, error: "სტატია ვერ შეინახა." };
  }

  const title = input.title.trim().replace(/\s+/g, " ");
  if (!title) return { ok: false, error: "სტატიას სათაური სჭირდება." };
  if (title.length > MAX_TITLE) {
    return { ok: false, error: `სათაური ${MAX_TITLE} სიმბოლოზე გრძელია.` };
  }
  if (input.html.length > MAX_HTML) {
    return { ok: false, error: "სტატია ძალიან გრძელია." };
  }

  const html = cleanArticleHtml(input.html);
  const text = toPlainText(html);

  if (input.publish && !text) {
    return { ok: false, error: "ცარიელ სტატიას ვერ გამოაქვეყნებ." };
  }

  const content = {
    title,
    html,
    excerpt: excerptFrom(text),
    words: wordCount(text),
    updatedAt: new Date(),
  };

  const published = {
    status: "published" as const,
    slug: slugFromTitle(title),
    publishedAt: new Date(),
  };

  const returning = {
    id: articles.id,
    slug: articles.slug,
    status: articles.status,
  };

  if (!input.id) {
    const [created] = await db
      .insert(articles)
      .values({ authorId, ...content, ...(input.publish ? published : {}) })
      .returning(returning);

    revalidate(created.slug);
    return { ok: true, ...created };
  }

  const existing = await db.query.articles.findFirst({
    columns: { status: true },
    where: and(eq(articles.id, input.id), eq(articles.authorId, authorId)),
  });

  if (!existing) return { ok: false, error: "სტატია ვერ მოიძებნა." };

  // Only the first publish mints a slug and a date. Every later save leaves
  // both alone, so a retitled article keeps the URL people have shared.
  const goingPublic = input.publish && existing.status === "draft";

  const [saved] = await db
    .update(articles)
    .set({ ...content, ...(goingPublic ? published : {}) })
    .where(and(eq(articles.id, input.id), eq(articles.authorId, authorId)))
    .returning(returning);

  revalidate(saved.slug);
  return { ok: true, ...saved };
}

export async function deleteArticle(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [deleted] = await db
    .delete(articles)
    .where(and(eq(articles.id, id), eq(articles.authorId, session.user.id)))
    .returning({ slug: articles.slug });

  revalidate(deleted?.slug ?? null);
  redirect("/dashboard");
}

/**
 * Counted from the reader's browser rather than from the render, so a link
 * prefetch or a re-render never inflates the number. Deliberately does not
 * revalidate: refreshing the page a reader is sitting on to bump a counter
 * they cannot see would be pure waste.
 */
export async function recordView(id: string): Promise<void> {
  const session = await auth();
  const reader = session?.user?.id;

  await db
    .update(articles)
    .set({ views: sql`${articles.views} + 1` })
    .where(
      and(
        eq(articles.id, id),
        eq(articles.status, "published"),
        // Reading your own article is not a view.
        reader ? ne(articles.authorId, reader) : undefined,
      ),
    );
}

function revalidate(slug: string | null) {
  revalidatePath("/dashboard");
  if (slug) revalidatePath(`/a/${slug}`);
}
