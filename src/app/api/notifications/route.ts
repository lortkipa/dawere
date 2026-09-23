import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listNotifications, unreadCount } from '@/lib/notifications';

/**
 * Polled by the badge: the unread count, and the newest unread notification so
 * the page can announce it when it is new since the last poll.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const [count, latest] = await Promise.all([
    unreadCount(user.id),
    listNotifications(user.id, { unreadOnly: true, limit: 1 }),
  ]);

  return NextResponse.json(
    { count, latest: latest.items[0] ?? null },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
