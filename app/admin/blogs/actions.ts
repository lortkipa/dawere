"use server";

import { and, desc, eq, ilike, isNotNull, or } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { likePattern } from "@/lib/admin-list";
import { maxCommentLength, retireComments } from "@/lib/comments";
import { db } from "@/lib/db";
import { comments, posts, users, type User } from "@/lib/db/schema";
import { postIdPattern, uuidPattern } from "@/lib/ids";
import { genericError, savePost } from "@/lib/post-save";
import { canManage } from "@/lib/roles";
import { deleteImages } from "@/lib/uploads";

type Result = { error: string } | void;

const forbiddenError = "ამის უფლება არ გაქვს";

async function managedAuthor(authorId: string): Promise<User | { error: string }> {
  const actor = await requireAdmin();
  if (!uuidPattern.test(authorId)) return { error: genericError };
  const [author] = await db.select().from(users).where(eq(users.id, authorId)).limit(1);
  if (!author) return { error: "ეს მომხმარებელი აღარ არსებობს" };
  if (!canManage(actor, author)) return { error: forbiddenError };
  return author;
}

async function managedPost(id: string) {
  const actor = await requireAdmin();
  if (!postIdPattern.test(id)) return { error: genericError };
  const [row] = await db
    .select({ post: posts, author: users })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(eq(posts.id, id))
    .limit(1);
  if (!row) return { error: "ეს ბლოგი აღარ არსებობს" };
  if (!canManage(actor, row.author)) return { error: forbiddenError };
  return row;
}

// Authors an admin may publish as, for the picker before writing.
export async function searchAuthors(query: string) {
  const actor = await requireAdmin();
  const pattern = likePattern(query.trim());
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      handle: users.handle,
      email: users.email,
      avatar: users.avatar,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        isNotNull(users.onboardedAt),
        or(ilike(users.name, pattern), ilike(users.handle, pattern), ilike(users.email, pattern)),
      ),
    )
    .orderBy(desc(users.createdAt))
    .limit(20);
  return rows.filter((row) => canManage(actor, { role: row.role, email: row.email })).slice(0, 8);
}

export async function createPostAs(authorId: string, formData: FormData): Promise<Result> {
  const author = await managedAuthor(authorId);
  if ("error" in author) return author;
  if (!author.onboardedAt) return { error: genericError };

  const result = await savePost(formData, { authorId: author.id });
  if ("error" in result) return result;
  redirect(`/admin/blogs/${result.id}`);
}

export async function updatePost(id: string, formData: FormData): Promise<Result> {
  const row = await managedPost(id);
  if ("error" in row) return row;

  const result = await savePost(formData, { authorId: row.author.id, existing: row.post });
  if ("error" in result) return result;
  redirect(`/admin/blogs/${id}`);
}

// Comments, likes, favorites and views go with the row through ON DELETE CASCADE.
export async function deletePost(id: string): Promise<Result> {
  const row = await managedPost(id);
  if ("error" in row) return row;

  await db.delete(posts).where(eq(posts.id, id));
  await deleteImages(row.post.images);
  redirect("/admin/blogs");
}

async function managedComment(id: string) {
  const actor = await requireAdmin();
  if (!uuidPattern.test(id)) return { error: genericError };
  const [row] = await db
    .select({ comment: comments, author: users })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.id, id))
    .limit(1);
  if (!row || row.comment.body === null) return { error: "ეს კომენტარი წაშლილია" };
  if (!canManage(actor, row.author)) return { error: forbiddenError };
  return row;
}

export async function updateComment(id: string, value: string): Promise<Result> {
  const row = await managedComment(id);
  if ("error" in row) return row;
  const body = value.trim();
  if (body.length === 0 || body.length > maxCommentLength) return { error: genericError };

  await db.update(comments).set({ body }).where(eq(comments.id, id));
  refresh();
}

// The same rule as a reader deleting their own: one with replies stays as a placeholder.
export async function deleteComment(id: string): Promise<Result> {
  const row = await managedComment(id);
  if ("error" in row) return row;

  await retireComments(eq(comments.id, id));
  refresh();
}
