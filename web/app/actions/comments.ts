"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, comments } from "@/db/schema";
import { currentAccount } from "@/lib/account";
import { notify } from "@/lib/notifications";

/**
 * Both actions re-read the session rather than trust the caller with who is
 * writing: a Server Action is a POST endpoint anybody can reach, so the ids
 * arriving here are the article and the comment, never the person.
 *
 * A comment is stored as the plain text it was typed as. Nothing here calls
 * `cleanArticleHtml`, because nothing renders it as HTML — the page prints the
 * characters, so `<script>` is five words of a sentence and not a tag.
 */

const MAX_BODY = 2000;

export type CommentResult = { ok: true } | { ok: false; error: string };

export async function addComment(
  articleId: string,
  body: string,
  /** The comment being answered, if this is a reply rather than a new thread. */
  parentId?: string,
): Promise<CommentResult> {
  const account = await currentAccount();
  if (!account) return { ok: false, error: "ჯერ უნდა შეხვიდე." };

  if (typeof body !== "string") {
    return { ok: false, error: "კომენტარი ვერ დაიწერა." };
  }

  // Paragraphs are kept — a comment is written in lines — but a wall of blank
  // ones is not a paragraph, and \r is the textarea's, not the writer's.
  const text = body
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) return { ok: false, error: "კომენტარი ცარიელია." };
  if (text.length > MAX_BODY) {
    return { ok: false, error: `კომენტარი ${MAX_BODY} სიმბოლოზე გრძელია.` };
  }

  const article = await db.query.articles.findFirst({
    columns: { authorId: true, slug: true, status: true },
    where: eq(articles.id, articleId),
  });

  // A draft has no address and therefore no readers; only a published article
  // is something anybody is standing under.
  if (!article?.slug || article.status !== "published") {
    return { ok: false, error: "სტატია ვერ მოიძებნა." };
  }

  const parent = parentId ? await findParent(parentId, articleId) : null;

  if (parentId && !parent) {
    return { ok: false, error: "კომენტარი, რომელსაც პასუხობ, ვეღარ მოიძებნა." };
  }

  const [written] = await db
    .insert(comments)
    .values({
      articleId,
      authorId: account.id,
      // Whatever is being answered, and nothing is folded onto anything else: a
      // reply to a reply hangs off the reply, as deep as the conversation runs.
      parentId: parent?.id ?? null,
      body: text,
    })
    .returning({ id: comments.id });

  // One person is told, and it is whoever was answered: a reply answers the
  // comment it sits under and not the conversation at large, so the author of
  // the piece hears about the threads on it and the people in a thread hear
  // about the answers to them. Telling the author of every reply five deep
  // would make a busy article unreadable to the one person who cannot leave
  // it. Neither branch tells you about yourself — `notify` drops that.
  await notify({
    userId: parent ? parent.authorId : article.authorId,
    actorId: account.id,
    kind: parent ? "reply" : "comment",
    articleId,
    commentId: written.id,
  });

  revalidatePath(`/a/${article.slug}`);
  return { ok: true };
}

/**
 * Deleting takes the replies with it, and theirs, all the way down — the
 * cascade on `parent_id` — because a reply to something nobody can read is not
 * worth keeping.
 *
 * Two people may do it: whoever wrote the comment, and whoever wrote the
 * article it sits under. The second is what makes an author's own page theirs
 * to keep; neither can touch anything else.
 */
export async function deleteComment(id: string): Promise<CommentResult> {
  const account = await currentAccount();
  if (!account) return { ok: false, error: "ჯერ უნდა შეხვიდე." };

  const [row] = await db
    .select({
      writerId: comments.authorId,
      articleAuthorId: articles.authorId,
      slug: articles.slug,
    })
    .from(comments)
    .innerJoin(articles, eq(comments.articleId, articles.id))
    .where(eq(comments.id, id));

  // Already gone — someone deleted the thread it hung off, or the page it was
  // read from is older than the comment.
  if (!row) return { ok: true };

  if (row.writerId !== account.id && row.articleAuthorId !== account.id) {
    return { ok: false, error: "ეს კომენტარი შენი წასაშლელი არაა." };
  }

  // The read above is the permission check, so the delete is addressed by the
  // id it just cleared and nothing more.
  await db.delete(comments).where(eq(comments.id, id));

  if (row.slug) revalidatePath(`/a/${row.slug}`);
  return { ok: true };
}

/**
 * The comment a reply names. Scoped to the article as well as the id: answering
 * a comment from somewhere else would file the reply under a conversation it
 * was never part of.
 */
function findParent(parentId: string, articleId: string) {
  return db.query.comments.findFirst({
    // Who wrote it, because they are the one the reply is news to.
    columns: { id: true, authorId: true },
    where: and(eq(comments.id, parentId), eq(comments.articleId, articleId)),
  });
}
