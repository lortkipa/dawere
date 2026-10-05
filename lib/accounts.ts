import "server-only";
import { eq } from "drizzle-orm";
import { retireComments } from "./comments";
import { db } from "./db";
import { comments, posts, users } from "./db/schema";
import { deleteAvatar, deleteImages } from "./uploads";

// Sessions, posts and likes go with the row through ON DELETE CASCADE; photos live on disk.
// Comments are retired first, so the ones with replies stay as placeholders.
export async function deleteUserAndFiles(user: { id: string; avatar: string | null }) {
  await retireComments(eq(comments.userId, user.id));
  const owned = await db.select({ images: posts.images }).from(posts).where(eq(posts.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));
  await deleteAvatar(user.avatar);
  await deleteImages(owned.flatMap((post) => post.images));
}
