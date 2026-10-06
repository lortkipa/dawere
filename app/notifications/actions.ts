"use server";

import { markNotificationsSeen } from "@/lib/notifications";
import { requireReader } from "@/lib/session";

// `upTo` is the newest notification the reader was shown, so one that arrives meanwhile stays unread.
export async function markSeen(upTo: string) {
  const user = await requireReader();
  await markNotificationsSeen(user.id, upTo);
}
