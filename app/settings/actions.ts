"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { retireComments } from "@/lib/comments";
import { deleteAvatar, deleteImages, saveAvatar } from "@/lib/uploads";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { comments, posts, users } from "@/lib/db/schema";
import { maxNameLength, minTopics, topics } from "@/lib/onboarding-options";
import {
  emailPattern,
  handleTakenError,
  isValidHandle,
  maxAvatarBytes,
  maxBioLength,
  normalizeEmail,
  normalizeHandle,
} from "@/lib/profile-rules";
import { deleteSession, getCurrentUser } from "@/lib/session";

type Result = { error: string } | void;

const genericError = "რაღაც შეცდომაა, სცადე თავიდან";
const emailTakenError = "ეს ელფოსტა უკვე გამოყენებულია";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  return user;
}

// Email codes aren't sent yet, so the address changes without confirming it.
export async function updateEmail(value: string): Promise<Result> {
  const user = await requireUser();
  const email = normalizeEmail(value);
  if (!emailPattern.test(email)) return { error: "ელფოსტა არასწორია" };
  if (email === user.email) return;

  try {
    await db.update(users).set({ email }).where(eq(users.id, user.id));
  } catch (error) {
    if (isUniqueViolation(error)) return { error: emailTakenError };
    throw error;
  }
  refresh();
}

export async function checkHandle(value: string): Promise<boolean> {
  const user = await requireUser();
  const handle = normalizeHandle(value);
  if (!isValidHandle(handle)) return false;

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.handle, handle), ne(users.id, user.id)))
    .limit(1);
  return !taken;
}

export async function updateHandle(value: string): Promise<Result> {
  const user = await requireUser();
  const handle = normalizeHandle(value);
  if (!isValidHandle(handle)) return { error: genericError };
  if (handle === user.handle) return;

  // The unique constraint settles two people saving the same handle at once.
  try {
    await db.update(users).set({ handle }).where(eq(users.id, user.id));
  } catch (error) {
    if (isUniqueViolation(error)) return { error: handleTakenError };
    throw error;
  }
  refresh();
}

export async function updateName(value: string): Promise<Result> {
  const user = await requireUser();
  const name = value.trim();
  if (name.length === 0 || name.length > maxNameLength) return { error: genericError };

  await db.update(users).set({ name }).where(eq(users.id, user.id));
  refresh();
}

export async function updateBio(value: string): Promise<Result> {
  const user = await requireUser();
  const bio = value.trim();
  if (bio.length > maxBioLength) return { error: genericError };

  await db
    .update(users)
    .set({ bio: bio || null })
    .where(eq(users.id, user.id));
  refresh();
}

export async function updateTopics(slugs: string[]): Promise<Result> {
  const user = await requireUser();
  const chosen = [...new Set(slugs)];
  const valid = chosen.length >= minTopics && chosen.every((slug) => topics.some((topic) => topic.slug === slug));
  if (!valid) return { error: genericError };

  // Topics taken out by hand stay out of the automatic adjustments in lib/interests.ts.
  const removed = (user.topics ?? []).filter((slug) => !chosen.includes(slug));
  const dismissedTopics = [...new Set([...user.dismissedTopics, ...removed])].filter((slug) => !chosen.includes(slug));
  await db
    .update(users)
    .set({ topics: chosen, dismissedTopics, topicsEditedAt: new Date() })
    .where(eq(users.id, user.id));
  refresh();
}

export async function updateFavoritesPublic(value: boolean): Promise<Result> {
  const user = await requireUser();
  if (typeof value !== "boolean") return { error: genericError };

  await db.update(users).set({ favoritesPublic: value }).where(eq(users.id, user.id));
  refresh();
}

export async function updateAvatar(formData: FormData): Promise<Result> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: genericError };
  if (file.size > maxAvatarBytes) return { error: "ფოტო 5 მბ-ზე დიდი არ უნდა იყოს" };

  let avatar: string;
  try {
    avatar = await saveAvatar(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { error: "ამ ფაილს ვერ ვკითხულობთ, სცადე სხვა ფოტო" };
  }

  await db.update(users).set({ avatar }).where(eq(users.id, user.id));
  await deleteAvatar(user.avatar);
  refresh();
}

export async function removeAvatar(): Promise<Result> {
  const user = await requireUser();
  await db.update(users).set({ avatar: null }).where(eq(users.id, user.id));
  await deleteAvatar(user.avatar);
  refresh();
}

// Sessions, posts and likes go with the row through ON DELETE CASCADE; photos live on disk.
// Comments are retired first, so the ones with replies stay as placeholders.
export async function deleteAccount() {
  const user = await requireUser();
  await retireComments(eq(comments.userId, user.id));
  const owned = await db.select({ images: posts.images }).from(posts).where(eq(posts.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));
  await deleteAvatar(user.avatar);
  await deleteImages(owned.flatMap((post) => post.images));
  await deleteSession();
  redirect("/");
}
