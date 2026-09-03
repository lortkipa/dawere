"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { currentAccount } from "@/lib/account";

/**
 * Following is one row, and this is both halves of it: `next` is the state the
 * button wants to be in, not a verb, so a double click ends where one click
 * would rather than undoing itself.
 *
 * The session is re-read here rather than taken from the caller. A Server
 * Action is a POST endpoint anybody can call, so the id the button sends is the
 * author being followed — never the follower, which is only ours to decide.
 */

export type FollowResult = {
  /** Where the row now stands, which is what the button paints. */
  following: boolean;
  error: string | null;
};

export async function setFollowing(
  authorId: string,
  next: boolean,
): Promise<FollowResult> {
  const account = await currentAccount();
  if (!account) return { following: false, error: "ჯერ უნდა შეხვიდე." };

  // The table refuses this too; refusing it here is what turns a constraint
  // violation into an answer the button can show.
  if (authorId === account.id) {
    return { following: false, error: "საკუთარ თავს ვერ გამოიწერ." };
  }

  const author = await db.query.users.findFirst({
    columns: { handle: true },
    where: eq(users.id, authorId),
  });

  // An address that stopped answering between the render and the click.
  if (!author) return { following: false, error: "ავტორი ვეღარ მოიძებნა." };

  if (next) {
    await db
      .insert(follows)
      .values({ followerId: account.id, followingId: authorId })
      // Already following: the row is the state, so there is nothing to add.
      .onConflictDoNothing();
  } else {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, account.id),
          eq(follows.followingId, authorId),
        ),
      );
  }

  // Both pages the row is visible from: the author's, where the count moved,
  // and the feed, whose whole content is this set of rows.
  revalidatePath(`/${author.handle}`);
  revalidatePath("/feed");

  return { following: next, error: null };
}
