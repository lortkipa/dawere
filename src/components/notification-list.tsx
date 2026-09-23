'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AtSign,
  Bell,
  Check,
  CheckCheck,
  Circle,
  FileText,
  Heart,
  MessageCircle,
  Reply,
  Settings,
  Trash2,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationUnreadAction,
} from '@/app/actions/notifications';
import type { NotificationType } from '@/lib/notification-types';
import { RowMenu } from '@/components/admin/controls';
import { Tabs } from '@/components/feed-tabs';
import { setUnread } from '@/components/notification-bell';
import { toast } from '@/components/toaster';
import { Avatar, Button, ButtonLink, EmptyState, PageHeader } from '@/components/ui';
import { NOTIFICATION_COPY, type NotificationView } from '@/lib/notification-copy';
import { cn, formatCount, timeAgo } from '@/lib/utils';

const ICONS: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  post_like: { icon: Heart, tone: 'bg-danger text-danger-contrast' },
  comment_like: { icon: Heart, tone: 'bg-danger text-danger-contrast' },
  post_comment: { icon: MessageCircle, tone: 'bg-accent text-accent-contrast' },
  comment_reply: { icon: Reply, tone: 'bg-accent text-accent-contrast' },
  mention: { icon: AtSign, tone: 'bg-accent text-accent-contrast' },
  follow: { icon: UserPlus, tone: 'bg-primary text-primary-contrast' },
  new_post: { icon: FileText, tone: 'bg-primary text-primary-contrast' },
};

type ActionResult = { ok: boolean; unread: number; error?: string };

function settle(result: ActionResult) {
  setUnread(result.unread);
  if (!result.ok) toast(result.error ?? 'ვერ მოხერხდა.', 'error');
}

/**
 * The notifications page below its title: filter tabs, "read all", and the
 * list. Changes apply here at once and the server catches up behind them; the
 * page remounts this (keyed by render time) whenever the server redraws it.
 */
export function NotificationCenter({
  initialItems,
  unread: initialUnread,
  filter,
  renderedAt,
}: {
  initialItems: NotificationView[];
  unread: number;
  filter: 'all' | 'unread';
  renderedAt: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [unread, setUnreadLocal] = useState(initialUnread);
  const [pending, startTransition] = useTransition();

  function update(id: string, change: Partial<NotificationView> | null) {
    setItems((current) =>
      change === null
        ? current.filter((item) => item.id !== id)
        : current.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );
  }

  function apply(result: ActionResult) {
    settle(result);
    setUnreadLocal(result.unread);
  }

  function readAll() {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    startTransition(async () => {
      const result = await markAllNotificationsReadAction(renderedAt);
      apply(result);
      if (result.ok) toast('ყველა შეტყობინება წაკითხულად მოინიშნა');
    });
  }

  function setRead(item: NotificationView, read: boolean) {
    if (item.read === read) return;
    update(item.id, { read });
    setUnreadLocal((n) => Math.max(0, n + (read ? -1 : 1)));
    startTransition(async () => {
      apply(await (read ? markNotificationReadAction(item.id) : markNotificationUnreadAction(item.id)));
    });
  }

  function remove(item: NotificationView) {
    update(item.id, null);
    if (!item.read) setUnreadLocal((n) => Math.max(0, n - 1));
    startTransition(async () => {
      apply(await deleteNotificationAction(item.id));
    });
  }

  const hasUnreadHere = items.some((item) => !item.read);

  return (
    <>
      <PageHeader
        title="შეტყობინებები"
        className="mb-2"
        action={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={readAll}
              disabled={pending || (unread === 0 && !hasUnreadHere)}
            >
              <CheckCheck />
              ყველას წაკითხვა
            </Button>
            <ButtonLink
              href="/settings#notifications"
              variant="ghost"
              size="icon"
              aria-label="შეტყობინებების პარამეტრები"
              title="შეტყობინებების პარამეტრები"
            >
              <Settings />
            </ButtonLink>
          </div>
        }
      />

      <Tabs
        className="mb-2"
        active={filter}
        tabs={[
          { key: 'all', label: 'ყველა', href: '/notifications' },
          {
            key: 'unread',
            label: unread > 0 ? `წაუკითხავი · ${formatCount(unread)}` : 'წაუკითხავი',
            href: '/notifications?filter=unread',
          },
        ]}
      />

      {items.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={filter === 'unread' ? <Check /> : <Bell />}
          title={filter === 'unread' ? 'ყველაფერი წაკითხული გაქვს' : 'შეტყობინებები ჯერ არ არის'}
          description={
            filter === 'unread'
              ? 'ახალი მოწონებები, კომენტარები და გამომწერები აქ გამოჩნდება.'
              : 'როცა ვინმე შენს სტატიას მოიწონებს, დააკომენტარებს ან გამოგიწერს, აქ ნახავ.'
          }
          action={
            filter === 'unread' ? (
              <ButtonLink href="/notifications" variant="outline">
                ყველა შეტყობინება
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onOpen={() => setRead(item, true)}
              onToggleRead={() => setRead(item, !item.read)}
              onDelete={() => remove(item)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function NotificationRow({
  item,
  onOpen,
  onToggleRead,
  onDelete,
}: {
  item: NotificationView;
  onOpen: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}) {
  const { icon: Icon, tone } = ICONS[item.type];
  const copy = NOTIFICATION_COPY[item.type];

  return (
    <li
      className={cn(
        'group relative -mx-3 flex gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-hover/60 sm:-mx-4 sm:px-4',
        !item.read && 'bg-accent-soft/50',
      )}
    >
      <div className="relative shrink-0 self-start">
        <Avatar name={item.actor.name} src={item.actor.avatarUrl} size="md" />
        <span
          className={cn(
            'absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-2 ring-surface',
            tone,
          )}
          aria-hidden
        >
          <Icon className="size-[11px]" strokeWidth={2.5} fill={Icon === Heart ? 'currentColor' : 'none'} />
        </span>
      </div>

      <div className="min-w-0 flex-1 pr-8">
        <p className="flex min-w-0 items-baseline gap-1.5 text-[13px] text-subtle">
          {/* The whole row opens the notification; the menu sits above this link. */}
          <Link
            href={item.href}
            onClick={onOpen}
            className="truncate text-[15px] font-semibold text-ink after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
          >
            {item.actor.name}
          </Link>
          <span aria-hidden>·</span>
          <time dateTime={item.createdAt} className="shrink-0" suppressHydrationWarning>
            {timeAgo(item.createdAt)}
          </time>
          {item.read ? null : (
            <>
              <span className="ml-0.5 size-2 shrink-0 self-center rounded-full bg-accent" aria-hidden />
              <span className="sr-only">წაუკითხავი</span>
            </>
          )}
        </p>

        <p className={cn('mt-0.5 text-[15px] leading-snug', item.read ? 'text-muted' : 'text-ink')}>
          {copy.action}
          {item.post && item.type !== 'follow' ? (
            <>
              {' '}
              <span className="font-medium text-ink">„{item.post.title}“</span>
            </>
          ) : null}
        </p>

        {item.comment ? (
          <p className="mt-2 line-clamp-2 border-l-2 border-line-strong pl-2.5 text-sm leading-relaxed text-muted">
            {item.comment.excerpt}
          </p>
        ) : null}
      </div>

      <div className="absolute top-3 right-1 z-10 sm:right-2">
        <RowMenu
          label="შეტყობინების მოქმედებები"
          items={[
            item.read
              ? { label: 'წაუკითხავად', icon: <Circle />, onSelect: onToggleRead }
              : { label: 'წაკითხულად', icon: <Check />, onSelect: onToggleRead },
            { label: 'წაშლა', icon: <Trash2 />, onSelect: onDelete, danger: true },
            null,
            { label: 'პარამეტრები', icon: <Settings />, href: '/settings#notifications' },
          ]}
        />
      </div>
    </li>
  );
}
