"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
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
import { currentAccount } from "@/lib/account";
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
  const account = await currentAccount();
  if (!account) return { ok: false, error: "ჯერ უნდა შეხვიდე." };

  const authorId = account.id;

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

    revalidate(account.handle, created.slug);
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

  revalidate(account.handle, saved.slug);
  return { ok: true, ...saved };
}

/**
 * Always ends in a redirect, because the page that called this may be the
 * article's own and has to leave. A list that survives its own row passes
 * `returnTo` to come back to itself instead — checked here rather than trusted,
 * since a Server Action is a POST endpoint anyone can call.
 */
export async function deleteArticle(
  id: string,
  returnTo?: string,
): Promise<void> {
  const account = await currentAccount();
  if (!account) redirect("/");

  const [deleted] = await db
    .delete(articles)
    .where(and(eq(articles.id, id), eq(articles.authorId, account.id)))
    .returning({ slug: articles.slug });

  revalidate(account.handle, deleted?.slug ?? null);

  const back = sitePath(returnTo);
  // A Server Action pushes by default, which on the way back to the page the
  // author is already on would leave a second entry for it in their history —
  // one that looks, from the back button, like nothing happened.
  if (back) redirect(back, RedirectType.replace);

  redirect(`/${account.handle}`);
}

/** A path on this site and nothing else: no scheme, no host, no `//evil.com`. */
function sitePath(candidate: string | undefined): string | null {
  return candidate && /^\/[^/\\]/.test(candidate) ? candidate : null;
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

/** The two pages an article appears on: its author's, and its own. */
function revalidate(handle: string, slug: string | null) {
  revalidatePath(`/${handle}`);
  if (slug) revalidatePath(`/a/${slug}`);
}
