"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { postIdPattern } from "@/lib/ids";
import { removePost, savePost } from "@/lib/post-save";
import { getCurrentUser } from "@/lib/session";

type Result = { error: string } | void;

const goneError = "ეს ბლოგი აღარ არსებობს";

export async function publishPost(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (!user.onboardedAt) redirect("/onboarding");

  const result = await savePost(formData, { authorId: user.id });
  if ("error" in result) return result;
  redirect(`/@${user.handle}/${result.id}`);
}

// The post with this id, if the signed-in user wrote it.
async function ownPost(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (!postIdPattern.test(id)) return null;
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
    .limit(1);
  return post ? { user, post } : null;
}

export async function updateOwnPost(id: string, formData: FormData): Promise<Result> {
  const own = await ownPost(id);
  if (!own) return { error: goneError };

  const result = await savePost(formData, { authorId: own.user.id, existing: own.post });
  if ("error" in result) return result;
  redirect(`/@${own.user.handle}/${id}`);
}

// The caller decides where to go next: the post page leaves for the profile, a list drops the card.
export async function deleteOwnPost(id: string): Promise<Result> {
  const own = await ownPost(id);
  if (!own) return { error: goneError };
  await removePost(own.post);
}
