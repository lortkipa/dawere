'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { toast } from '@/components/toaster';
import { notificationSummary, type NotificationView } from '@/lib/notification-copy';
import { cn } from '@/lib/utils';

/**
 * The unread count, shared by every badge on the page. A module-level store
 * like the toaster's: the poller, the list and the settings all write to it
 * without a provider. `null` until something writes, so the server-rendered
 * count shows first and hydration matches.
 */
let unread: number | null = null;
const listeners = new Set<() => void>();

export function setUnread(count: number) {
  if (count === unread) return;
  unread = count;
  listeners.forEach((notify) => notify());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useUnread(initial: number) {
  const live = useSyncExternalStore(
    subscribe,
    () => unread,
    () => null,
  );
  return live ?? initial;
}

const POLL_MS = 30_000;

/**
 * Keeps the count current while the tab is open: every 30 seconds when the
 * page is visible, and at once when the reader comes back to it. Something
 * newer than the page (`since`, the server's clock at render) is announced
 * with a toast, or on the notifications page by redrawing it.
 */
export function NotificationPoller({ initial, since }: { initial: number; since: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const sinceRef = useRef(since);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  // A server render (router.refresh, a server action) carries the truth.
  useEffect(() => {
    setUnread(initial);
  }, [initial]);

  useEffect(() => {
    let stopped = false;

    async function poll() {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch('/api/notifications', { cache: 'no-store' });
        if (!response.ok || stopped) return;
        const data = (await response.json()) as { count: number; latest: NotificationView | null };
        if (stopped) return;

        setUnread(data.count);

        // Both sides are toISOString() output, so they compare as strings.
        if (data.latest && data.latest.createdAt > sinceRef.current) {
          sinceRef.current = data.latest.createdAt;
          if (pathRef.current === '/notifications') router.refresh();
          else toast(notificationSummary(data.latest), 'info');
        }
      } catch {
        // Offline or restarting; the next tick tries again.
      }
    }

    void poll();
    const timer = window.setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [router]);

  return null;
}

export function formatUnread(count: number) {
  return count > 99 ? '99+' : String(count);
}

/** The header's way to notifications, with the unread count on its corner. */
export function NotificationBell({ initial, className }: { initial: number; className?: string }) {
  const pathname = usePathname();
  const count = useUnread(initial);
  const active = pathname.startsWith('/notifications');

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `შეტყობინებები, ${formatUnread(count)} წაუკითხავი` : 'შეტყობინებები'}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-hover hover:text-ink',
        active ? 'text-ink' : 'text-muted',
        className,
      )}
    >
      <Bell className="size-[18px]" strokeWidth={active ? 2.25 : 1.75} />
      {count > 0 ? (
        <span className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-none font-semibold text-accent-contrast tabular-nums ring-2 ring-surface">
          {formatUnread(count)}
        </span>
      ) : null}
    </Link>
  );
}
