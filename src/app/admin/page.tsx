import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { Flag } from 'lucide-react';
import { db } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { actionLabel } from '@/lib/admin';
import { AdminMain, PersonCell, StatTile } from '@/components/admin/bits';
import { ViewsChart, type DayPoint } from '@/components/views-chart';
import { Badge, Card, PageHeader, SectionHeading } from '@/components/ui';
import { timeAgo } from '@/lib/utils';

export const metadata: Metadata = { title: 'მიმოხილვა' };

/** A dense 30-day series of `table`'s rows per day, zero days included. */
function dailyCounts(table: 'users' | 'post_views' | 'comments') {
  const from = table === 'users' ? sql`users` : table === 'comments' ? sql`comments` : sql`post_views`;
  const source = sql`select created_at from ${from} where created_at > now() - interval '31 days'`;
  return db.execute<{ day: string; views: number }>(sql`
    select to_char(d.day, 'YYYY-MM-DD') as day, count(s.created_at)::int as views
    from generate_series(
      (now() at time zone 'UTC')::date - interval '29 days',
      (now() at time zone 'UTC')::date,
      interval '1 day'
    ) as d(day)
    left join (${source}) s on (s.created_at at time zone 'UTC')::date = d.day::date
    group by d.day
    order by d.day
  `);
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [totals, signups, views, recentUsers, recentPosts, recentLog] = await Promise.all([
    db.execute<{
      users: number;
      users_7: number;
      admins: number;
      suspended: number;
      published: number;
      published_7: number;
      drafts: number;
      comments: number;
      comments_7: number;
      topics: number;
      reports: number;
      reported: number;
    }>(sql`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from users where created_at > now() - interval '7 days') as users_7,
        (select count(*)::int from users where access <> 'user') as admins,
        (select count(*)::int from users where suspended_at is not null) as suspended,
        (select count(*)::int from posts where status = 'published') as published,
        (select count(*)::int from posts where status = 'published' and published_at > now() - interval '7 days') as published_7,
        (select count(*)::int from posts where status = 'draft') as drafts,
        (select count(*)::int from comments where deleted_at is null) as comments,
        (select count(*)::int from comments where deleted_at is null and created_at > now() - interval '7 days') as comments_7,
        (select count(*)::int from topics) as topics,
        (select count(*)::int from reports where status = 'open') as reports,
        (select count(distinct (target_type, target_id))::int from reports where status = 'open') as reported
    `),
    dailyCounts('users'),
    dailyCounts('post_views'),
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
  const toPoints = (rows: { day: string; views: number }[]): DayPoint[] =>
    rows.map((r) => ({ day: r.day, views: r.views }));

  return (
    <AdminMain>
      <PageHeader title="მიმოხილვა" description="რა ხდება საიტზე." />

      {t.reported > 0 ? (
        <Link
          href="/admin/reports"
          className="mb-4 flex items-center gap-3 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 transition-colors hover:border-warning-text/40"
        >
          <Flag className="size-4 shrink-0 text-warning-text" />
          <p className="min-w-0 flex-1 text-sm text-warning-text">
            <span className="font-semibold">{t.reported} განსახილველი საჩივარი</span>
            {t.reports > t.reported ? ` (${t.reports} შეტყობინება)` : ''}
          </p>
          <span className="shrink-0 text-[13px] font-medium text-warning-text">განხილვა →</span>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        <StatTile
          label="მომხმარებლები"
          value={t.users}
          note={`+${t.users_7} ამ კვირაში`}
          href="/admin/users"
        />
        <StatTile
          label="გამოქვეყნებული სტატიები"
          value={t.published}
          note={`+${t.published_7} ამ კვირაში · ${t.drafts} მონახაზი`}
          href="/admin/posts?status=published"
        />
        <StatTile
          label="კომენტარები"
          value={t.comments}
          note={`+${t.comments_7} ამ კვირაში`}
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
        <Card className="p-4 sm:p-6">
          <ViewsChart
            data={toPoints(signups)}
            title="რეგისტრაციები, ბოლო 30 დღე"
            unit="რეგისტრაცია"
            column="რეგისტრაციები"
          />
        </Card>
        <Card className="p-4 sm:p-6">
          <ViewsChart data={toPoints(views)} title="ნახვები მთელ საიტზე, ბოლო 30 დღე" />
        </Card>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
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
