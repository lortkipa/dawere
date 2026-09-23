'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { NOTIFICATION_TYPES, users, type NotificationType } from '@/db/schema';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { deleteNotification, markRead, markUnread, unreadCount } from '@/lib/notifications';
import { isUuid } from '@/lib/utils';
import type { FormState } from '@/lib/validation';

/** Every change answers with the fresh unread count, so the badge can follow along. */
type Result = { ok: boolean; unread: number; error?: string };

const UNAUTHENTICATED: Result = { ok: false, unread: 0, error: 'ამისთვის საჭიროა შესვლა.' };
const NOT_FOUND = 'შეტყობინება ვერ მოიძებნა.';

async function run(id: string | null, change: (userId: string) => Promise<void>): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;
  if (id !== null && !isUuid(id)) return { ok: false, unread: await unreadCount(user.id), error: NOT_FOUND };
  await change(user.id);
  return { ok: true, unread: await unreadCount(user.id) };
}

export async function markNotificationReadAction(id: string) {
  return run(id, (userId) => markRead(userId, { ids: [id] }));
}

export async function markNotificationUnreadAction(id: string) {
  return run(id, (userId) => markUnread(userId, id));
}

/** `upTo` is when the reader's list was drawn; anything newer stays unread. */
export async function markAllNotificationsReadAction(upTo?: string) {
  const cutoff = upTo ? new Date(upTo) : undefined;
  return run(null, (userId) =>
    markRead(userId, { upTo: cutoff && !Number.isNaN(cutoff.getTime()) ? cutoff : undefined }),
  );
}

export async function deleteNotificationAction(id: string) {
  return run(id, (userId) => deleteNotification(userId, id));
}

/** The form lists the types left switched on; everything else is muted. */
export async function updateNotificationSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const enabled = new Set(formData.getAll('enabled'));
  const muted: NotificationType[] = NOTIFICATION_TYPES.filter((type) => !enabled.has(type));

  await db.update(users).set({ mutedNotifications: muted }).where(eq(users.id, user.id));
  revalidatePath('/settings');
  return { ok: true };
}
