import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { listNotifications, pruneOldNotifications, unreadCount } from '@/lib/notifications';
import { NotificationCenter } from '@/components/notification-list';
import { Pagination } from '@/components/feed-tabs';
import { pageParam } from '@/lib/utils';

export const metadata: Metadata = { title: 'შეტყობინებები', robots: { index: false } };

const PAGE_SIZE = 20;

export default async function NotificationsPage(props: PageProps<'/notifications'>) {
  const searchParams = await props.searchParams;
  const user = await requireUser('/notifications');
  const filter = searchParams.filter === 'unread' ? 'unread' : 'all';
  const page = pageParam(searchParams.page);

  if (page === 1) await pruneOldNotifications(user.id);
  const [list, unread] = await Promise.all([
    listNotifications(user.id, { unreadOnly: filter === 'unread', limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    unreadCount(user.id),
  ]);
  const renderedAt = new Date().toISOString();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-12 pb-20 sm:px-6 sm:pt-20">
      {/* Keyed by render time: a server redraw (a new notification, a refresh) replaces local edits. */}
      <NotificationCenter
        key={renderedAt}
        initialItems={list.items}
        unread={unread}
        filter={filter}
        renderedAt={renderedAt}
      />

      {list.items.length > 0 ? (
        <div className="mt-6">
          <Pagination
            basePath={filter === 'unread' ? '/notifications?filter=unread' : '/notifications'}
            page={page}
            hasMore={list.hasMore}
          />
        </div>
      ) : null}
    </main>
  );
}
