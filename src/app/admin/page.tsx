import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { Flag } from 'lucide-react';
import { db } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { actionLabel, pick, readParams } from '@/lib/admin';
import { AdminMain, PersonCell, StatTile } from '@/components/admin/bits';
import { Segmented } from '@/components/feed-tabs';
import { ViewsChart, type Bucket, type DayPoint } from '@/components/views-chart';
import { Badge, Card, PageHeader, SectionHeading } from '@/components/ui';
import { timeAgo } from '@/lib/utils';

export const metadata: Metadata = { title: 'მიმოხილვა' };

const RANGES = ['30d', '3m', '1y', 'all'] as const;
type Range = (typeof RANGES)[number];

const RANGE_OPTIONS: { key: Range; label: string }[] = [
  { key: '30d', label: '30 დღე' },
  { key: '3m', label: '3 თვე' },
  { key: '1y', label: '1 წელი' },
  { key: 'all', label: 'სულ' },
];

/** Chart titles end with the period; tile notes say what the "+N" covers. */
const RANGE_TITLE: Record<Range, string> = {
  '30d': 'ბოლო 30 დღე',
  '3m': 'ბოლო 3 თვე',
  '1y': 'ბოლო 12 თვე',
  all: 'მთელი პერიოდი',
};
const RANGE_NOTE: Record<Range, string> = {
  '30d': 'ბოლო 30 დღეში',
  '3m': 'ბოლო 3 თვეში',
  '1y': 'ბოლო 12 თვეში',
  all: '',
};

const STEP: Record<Bucket, string> = { day: '1 day', week: '7 days', month: '1 month' };

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

/**
 * Where the range starts (a UTC day) and how its bars are grouped. Weeks are
 * counted back from today, so the last bar is always the last seven days.
 * "All time" picks its grouping from how old the site is.
 */
function rangeWindow(range: Range, siteStart: Date): { from: string; bucket: Bucket } {
  const today = new Date(isoDay(new Date()));
  if (range === '30d') return { from: isoDay(addDays(today, -29)), bucket: 'day' };
  if (range === '3m') return { from: isoDay(addDays(today, -90)), bucket: 'week' };
  if (range === '1y') {
    return { from: isoDay(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1))), bucket: 'month' };
  }
  const start = new Date(isoDay(siteStart));
  const span = Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1;
  if (span <= 30) return { from: isoDay(addDays(today, -29)), bucket: 'day' };
  if (span <= 182) return { from: isoDay(addDays(today, -(Math.ceil(span / 7) * 7 - 1))), bucket: 'week' };
  return { from: isoDay(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))), bucket: 'month' };
}

/** `table`'s rows per bucket from `from` to today, empty buckets included. */
function bucketCounts(table: 'users' | 'post_views', from: string, bucket: Bucket) {
  const source = table === 'users' ? sql`users` : sql`post_views`;
  const step = STEP[bucket];
  return db.execute<{ day: string; views: number }>(sql`
    select to_char(b.start, 'YYYY-MM-DD') as day, count(s.day)::int as views
    from generate_series(
      ${from}::timestamp,
      (now() at time zone 'UTC')::date::timestamp,
      ${step}::interval
    ) as b(start)
    left join (
      select (created_at at time zone 'UTC')::date as day from ${source}
      where created_at >= ${from}::timestamp at time zone 'UTC'
    ) s on s.day >= b.start and s.day < b.start + ${step}::interval
    group by b.start
    order by b.start
  `);
}

export default async function AdminOverviewPage(props: PageProps<'/admin'>) {
  await requireAdmin();
  const range = pick(readParams(await props.searchParams).range, RANGES);

  let siteStart = new Date();
  if (range === 'all') {
    const [first] = await db.execute<{ start: string | null }>(sql`select min(created_at) as start from users`);
    if (first?.start) siteStart = new Date(first.start);
  }
  const { from, bucket } = rangeWindow(range, siteStart);
  const since = sql`${from}::timestamp at time zone 'UTC'`;

  const [totals, signups, views, recentUsers, recentPosts, recentLog] = await Promise.all([
    db.execute<{
      users: number;
      users_new: number;
      admins: number;
      suspended: number;
      published: number;
      published_new: number;
      drafts: number;
      comments: number;
      comments_new: number;
      topics: number;
      reports: number;
      reported: number;
    }>(sql`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from users where created_at >= ${since}) as users_new,
        (select count(*)::int from users where access <> 'user') as admins,
        (select count(*)::int from users where suspended_at is not null) as suspended,
        (select count(*)::int from posts where status = 'published') as published,
        (select count(*)::int from posts where status = 'published' and published_at >= ${since}) as published_new,
        (select count(*)::int from posts where status = 'draft') as drafts,
        (select count(*)::int from comments where deleted_at is null) as comments,
        (select count(*)::int from comments where deleted_at is null and created_at >= ${since}) as comments_new,
        (select count(*)::int from topics) as topics,
        (select count(*)::int from reports where status = 'open') as reports,
        (select count(distinct (target_type, target_id))::int from reports where status = 'open') as reported
    `),
    bucketCounts('users', from, bucket),
    bucketCounts('post_views', from, bucket),
    db.execute<{ id: string; name: string; username: string; avatar_url: string | null; created_at: string }>(sql`
      select id, name, username, avatar_url, created_at from users order by created_at desc limit 6
    `),
    db.execute<{ id: string; title: string; author_name: string; published_at: string }>(sql`
      select p.id, p.title, u.name as author_name, p.published_at
      from posts p join users u on u.id = p.author_id
      where p.status = 'published'
      order by p.published_at desc
      limit 6
    `),
    db.execute<{ id: number; actor_name: string; action: string; target_label: string; created_at: string }>(sql`
      select id, actor_name, action, target_label, created_at from admin_log order by created_at desc limit 8
    `),
  ]);

  const t = totals[0];
  const recent = (n: number) => (range === 'all' ? null : `+${n} ${RANGE_NOTE[range]}`);
  const toPoints = (rows: { day: string; views: number }[]): DayPoint[] =>
    rows.map((r) => ({ day: r.day, views: r.views }));

  return (
    <AdminMain>
      <PageHeader
        title="მიმოხილვა"
        description="რა ხდება საიტზე."
        action={
          <Segmented
            label="პერიოდი"
            active={range}
            options={RANGE_OPTIONS.map((option) => ({
              ...option,
              href: option.key === '30d' ? '/admin' : `/admin?range=${option.key}`,
            }))}
          />
        }
      />

      {t.reported > 0 ? (
        <Link
          href="/admin/reports"
          className="mb-4 flex items-center gap-3 rounded-2xl border border-warning-border bg-warning-soft px-4 py-3 transition-colors hover:border-warning-text/40"
        >
          <Flag className="size-4 shrink-0 text-warning-text" />
          <p className="min-w-0 flex-1 text-sm text-warning-text">
            <span className="font-semibold">{t.reported} განსახილველი საჩივარი</span>
            {t.reports > t.reported ? ` (${t.reports} შეტყობინება)` : ''}
          </p>
          <span className="shrink-0 text-[13px] font-medium text-warning-text">განხილვა →</span>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
        <StatTile
          label="მომხმარებლები"
          value={t.users}
          note={recent(t.users_new)}
          href="/admin/users"
        />
        <StatTile
          label="გამოქვეყნებული სტატიები"
          value={t.published}
          note={[recent(t.published_new), `${t.drafts} მონახაზი`].filter(Boolean).join(' · ')}
          href="/admin/posts?status=published"
        />
        <StatTile
          label="კომენტარები"
          value={t.comments}
          note={recent(t.comments_new)}
          href="/admin/comments"
        />
        <StatTile
          label="შეჩერებული ანგარიშები"
          value={t.suspended}
          note={`${t.admins} ადმინი · ${t.topics} თემა`}
          href="/admin/users?status=suspended"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-7">
          <ViewsChart
            data={toPoints(signups)}
            bucket={bucket}
            title={`რეგისტრაციები, ${RANGE_TITLE[range]}`}
            unit="რეგისტრაცია"
            column="რეგისტრაციები"
          />
        </Card>
        <Card className="p-5 sm:p-7">
          <ViewsChart
            data={toPoints(views)}
            bucket={bucket}
            title={`ნახვები მთელ საიტზე, ${RANGE_TITLE[range]}`}
          />
        </Card>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-3">
        <section>
          <SectionHeading
            action={
              <Link href="/admin/users" className="text-[12px] font-medium text-muted hover:text-ink">
                ყველა
              </Link>
            }
          >
            ახალი წევრები
          </SectionHeading>
          <ul className="space-y-3">
            {recentUsers.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 text-sm">
                <PersonCell id={user.id} name={user.name} username={user.username} avatarUrl={user.avatar_url} />
                <span className="shrink-0 text-[12px] text-subtle">{timeAgo(user.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading
            action={
              <Link href="/admin/posts" className="text-[12px] font-medium text-muted hover:text-ink">
                ყველა
              </Link>
            }
          >
            ახლახან გამოქვეყნებული
          </SectionHeading>
          {recentPosts.length === 0 ? (
            <p className="text-[13px] text-subtle">ჯერ არაფერია გამოქვეყნებული.</p>
          ) : (
            <ul className="space-y-3">
              {recentPosts.map((post) => (
                <li key={post.id} className="min-w-0">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="line-clamp-1 text-sm font-medium text-ink hover:underline"
                  >
                    {post.title || 'უსათაურო'}
                  </Link>
                  <p className="text-[12px] text-subtle">
                    {post.author_name} · {timeAgo(post.published_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionHeading
            action={
              <Link href="/admin/log" className="text-[12px] font-medium text-muted hover:text-ink">
                ჟურნალი
              </Link>
            }
          >
            ადმინების ბოლო ქმედებები
          </SectionHeading>
          {recentLog.length === 0 ? (
            <p className="text-[13px] text-subtle">აქ გამოჩნდება ყველა ცვლილება, რომელსაც ადმინები აკეთებენ.</p>
          ) : (
            <ul className="space-y-3">
              {recentLog.map((entry) => (
                <li key={entry.id} className="text-sm leading-snug">
                  <span className="font-medium text-ink">{entry.actor_name}</span>{' '}
                  <span className="text-muted">{actionLabel(entry.action)}</span>
                  {entry.target_label ? (
                    <>
                      {' '}
                      <Badge className="max-w-full truncate align-middle">{entry.target_label}</Badge>
                    </>
                  ) : null}
                  <p className="mt-0.5 text-[12px] text-subtle">{timeAgo(entry.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminMain>
  );
}
