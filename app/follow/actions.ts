"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { follows } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";

// Drizzle wraps the postgres.js error, which carries the SQLSTATE code.
function isForeignKeyViolation(error: unknown) {
  const { code, cause } = (error ?? {}) as { code?: string; cause?: { code?: string } };
  return code === "23503" || cause?.code === "23503";
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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
