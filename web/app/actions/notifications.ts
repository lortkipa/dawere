"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { currentAccount } from "@/lib/account";

/**
 * The two ways a reader gets through their news: opening a piece of it, and
 * saying they are done with the rest. Both are the same one-column write, and
 * they are together because between them they are the whole of what a reader
 * can do to a notification.
 *
 * Neither takes a reader as an argument — the session is re-read here instead.
 * Whose news is being cleared is only ever ours to decide, so there is nothing
 * about it for anybody to send.
 */

/**
 * Marks the one notification being opened, on the row's way out: a notification
 * is read by being read, and the click that goes to the article is the moment
 * that happens. Everything the reader has not got to yet stays new, which is
 * the point of the list keeping the two apart at all.
 *
 * The id arrives from the browser, so the reader is matched alongside it: what
 * makes this row markable is that it is one of theirs. Already-read rows are
 * excluded rather than restamped, so a second visit to an old article does not
 * move it to the front of nothing.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const account = await currentAccount();
  if (!account) return;

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.userId, account.id),
        isNull(notifications.readAt),
      ),
    );

  // The list the reader is leaving, so it is right when they come back to it:
  // the row without its tint, and the bell above it a number lighter.
  revalidatePath("/notifications");
}

/**
 * The other way to be done with news, and the one that admits what usually
 * happens: the reader has looked down the list, decided none of it needs
 * opening, and wants the badge to stop saying otherwise. One button over the
 * whole list rather than a checkbox on every row — a column of checkboxes over
 * a list of news is a second inbox to keep.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const account = await currentAccount();
  if (!account) return;

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, account.id),
        // Only what is still unread, so pressing it twice does not restamp a
        // month of news with today.
        isNull(notifications.readAt),
      ),
    );

  // The page the reader is standing on: the button goes, the badge above it
  // goes, and the rows lose the tint that said they were new — under them,
  // while they watch, which is what the press was for.
  revalidatePath("/notifications");
}
