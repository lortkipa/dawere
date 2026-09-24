import Link from 'next/link';
import type { ReactNode } from 'react';
import { Avatar, Badge } from '@/components/ui';
import type { Access } from '@/db/schema';
import { cn, formatCount, formatDate, timeAgo } from '@/lib/utils';

/** Every admin page sits in the same frame; lists want the width. */
export function AdminMain({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return (
    <main className={cn('mx-auto w-full flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-14', narrow ? 'max-w-4xl' : 'max-w-6xl')}>
      {children}
    </main>
  );
}

export function StatTile({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: number;
  note?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-3 font-serif text-[1.9rem] leading-none font-semibold tracking-tight text-ink tabular-nums">
        {formatCount(value)}
      </p>
      {note ? <p className="mt-2 text-[12px] text-subtle">{note}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="block bg-raised p-5 transition-colors hover:bg-hover sm:p-6">
      {body}
    </Link>
  ) : (
    <div className="bg-raised p-5 sm:p-6">{body}</div>
  );
}

export function AccessBadge({ access }: { access: Access }) {
  if (access === 'super_admin') return <Badge tone="accent">სუპერადმინი</Badge>;
  if (access === 'admin') return <Badge tone="accent">ადმინი</Badge>;
  return null;
}

export function SuspendedBadge({ since }: { since: Date | string | null }) {
  if (!since) return null;
  return <Badge tone="danger">შეჩერებული</Badge>;
}

export function PersonCell({
  id,
  name,
  username,
  avatarUrl,
  sub,
}: {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  sub?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} src={avatarUrl} size="sm" />
      <div className="min-w-0">
        <Link href={`/admin/users/${id}`} className="block truncate font-medium text-ink hover:underline">
          {name}
        </Link>
        <p className="truncate text-[12px] text-subtle">{sub ?? `@${username}`}</p>
      </div>
    </div>
  );
}

/** "12 სექ. 2026", with the relative time on hover. */
export function When({ date }: { date: Date | string | null }) {
  if (!date) return <span className="text-subtle">—</span>;
  const value = typeof date === 'string' ? new Date(date) : date;
  return (
    <time dateTime={value.toISOString()} title={timeAgo(value)} className="whitespace-nowrap text-muted">
      {formatDate(value)}
    </time>
  );
}
