"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isForeignKeyViolation } from "@/lib/db/errors";
import { follows } from "@/lib/db/schema";
import { uuidPattern } from "@/lib/ids";
import { getCurrentUser } from "@/lib/session";


export async function setFollow(authorId: string, follow: boolean) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (!user.onboardedAt) redirect("/onboarding");
  if (!uuidPattern.test(authorId) || authorId === user.id) return;

  if (follow) {
    try {
      await db.insert(follows).values({ followerId: user.id, followingId: authorId }).onConflictDoNothing();
    } catch (error) {
      // The author deleted their account in the meantime.
      if (!isForeignKeyViolation(error)) throw error;
    }
  } else {
    await db.delete(follows).where(and(eq(follows.followerId, user.id), eq(follows.followingId, authorId)));
  }
  refresh();
}
