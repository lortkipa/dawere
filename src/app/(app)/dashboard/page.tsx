import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { Eye, Heart, MessageCircle, PenLine, TrendingUp, Users } from 'lucide-react';
import { db } from '@/db';
import { requireUser } from '@/lib/auth';
import { Tabs } from '@/components/feed-tabs';
import { ViewsChart, type DayPoint } from '@/components/views-chart';
import { FlashToast } from '@/components/article-chrome';
import { PostRowActions } from '@/components/post-row-actions';
import { Avatar, Badge, ButtonLink, Card, EmptyState, PageHeader, SectionHeading } from '@/components/ui';
import { cn, formatCount, formatDate, timeAgo } from '@/lib/utils';

export const metadata: Metadata = { title: 'პანელი', robots: { index: false } };

type PostRow = {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string | null;
  updated_at: string;
  has_pending: boolean;
};

function StatCard({
  icon: Icon,
  label,
  value,
  recent,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  /** How much of the total arrived in the last 30 days. */
  recent: number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-xl bg-sunken text-subtle">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-serif text-[2rem] leading-none font-bold text-ink tabular-nums">{formatCount(value)}</p>
      <p
        className={cn(
          'mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium',
          recent > 0 ? 'text-accent' : 'text-subtle',
        )}
      >
        {recent > 0 ? <TrendingUp className="size-3.5" /> : null}
        {recent > 0 ? `+${formatCount(recent)}` : 'ცვლილება არ არის'} · 30 დღე
      </p>
    </Card>
  );
}

export default async function DashboardPage(props: PageProps<'/dashboard'>) {
  const searchParams = await props.searchParams;
  const user = await requireUser('/dashboard');
  const tab = searchParams.tab === 'drafts' ? 'drafts' : 'published';

  const [totals, daily, posts, topPosts, recentFollowers] = await Promise.all([
    db.execute<{
      views: number;
      likes: number;
      comments: number;
      published: number;
      drafts: number;
      followers: number;
      views_30: number;
      likes_30: number;
      comments_30: number;
      followers_30: number;
    }>(sql`
      with mine as (select id from posts where author_id = ${user.id}::uuid and status = 'published')
      select
        coalesce(sum(p.view_count) filter (where p.status = 'published'), 0)::int as views,
        coalesce(sum(p.like_count) filter (where p.status = 'published'), 0)::int as likes,
        coalesce(sum(p.comment_count) filter (where p.status = 'published'), 0)::int as comments,
        count(*) filter (where p.status = 'published')::int as published,
        count(*) filter (where p.status = 'draft')::int as drafts,
        (select count(*)::int from follows where following_id = ${user.id}::uuid) as followers,
        (select count(*)::int from post_views where post_id in (select id from mine)
           and created_at > now() - interval '30 days') as views_30,
        (select count(*)::int from likes where post_id in (select id from mine)
           and created_at > now() - interval '30 days') as likes_30,
        (select count(*)::int from comments where post_id in (select id from mine)
           and author_id <> ${user.id}::uuid and created_at > now() - interval '30 days') as comments_30,
        (select count(*)::int from follows where following_id = ${user.id}::uuid
           and created_at > now() - interval '30 days') as followers_30
      from posts p
      where p.author_id = ${user.id}::uuid
    `),

    // A dense 30-day series: generate_series supplies the zero days that a plain
    // group-by would silently drop, which would distort the bar spacing.
    db.execute<{ day: string; views: number }>(sql`
      select to_char(d.day, 'YYYY-MM-DD') as day,
             coalesce(count(pv.id), 0)::int as views
      from generate_series(
        (now() at time zone 'UTC')::date - interval '29 days',
        (now() at time zone 'UTC')::date,
        interval '1 day'
      ) as d(day)
      left join post_views pv
        on pv.view_day = d.day::date
       and pv.post_id in (select id from posts where author_id = ${user.id}::uuid)
      group by d.day
      order by d.day
    `),

    db.execute<PostRow>(sql`
      select id, slug, title, status, view_count, like_count, comment_count, published_at, updated_at,
             (pending_revision is not null) as has_pending
      from posts
      where author_id = ${user.id}::uuid and status = ${tab === 'drafts' ? 'draft' : 'published'}
      order by coalesce(published_at, updated_at) desc
      limit 50
    `),

    db.execute<PostRow>(sql`
      select id, slug, title, status, view_count, like_count, comment_count, published_at, updated_at,
             false as has_pending
      from posts
      where author_id = ${user.id}::uuid and status = 'published'
      order by (view_count + like_count * 5 + comment_count * 8) desc
      limit 5
    `),

    db.execute<{
      id: string;
      name: string;
      username: string;
      avatar_url: string | null;
      created_at: string;
    }>(sql`
      select u.id, u.name, u.username, u.avatar_url, f.created_at
      from follows f join users u on u.id = f.follower_id
      where f.following_id = ${user.id}::uuid
      order by f.created_at desc
      limit 5
    `),
  ]);

  const t = totals[0];
  const chartData: DayPoint[] = daily.map((d) => ({ day: d.day, views: d.views }));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      {searchParams.deleted === '1' ? <FlashToast message="სტატია წაიშალა" /> : null}

      <PageHeader
        title="პანელი"
        description="როგორ კითხულობენ შენს ტექსტებს."
        action={
          <ButtonLink href="/write" prefetch={false}>
            <PenLine />
            ახალი სტატია
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Eye} label="ნახვები" value={t?.views ?? 0} recent={t?.views_30 ?? 0} />
        <StatCard icon={Heart} label="მოწონებები" value={t?.likes ?? 0} recent={t?.likes_30 ?? 0} />
        <StatCard icon={MessageCircle} label="კომენტარები" value={t?.comments ?? 0} recent={t?.comments_30 ?? 0} />
        <StatCard icon={Users} label="გამომწერები" value={t?.followers ?? 0} recent={t?.followers_30 ?? 0} />
      </div>

      {(t?.published ?? 0) > 0 ? (
        <Card className="mt-4 p-5 sm:p-6">
          <ViewsChart data={chartData} />
        </Card>
      ) : null}

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          <Tabs
            className="mb-2"
            active={tab}
            tabs={[
              { key: 'published', label: `გამოქვეყნებული (${t?.published ?? 0})`, href: '/dashboard' },
              { key: 'drafts', label: `მონახაზები (${t?.drafts ?? 0})`, href: '/dashboard?tab=drafts' },
            ]}
          />

          {posts.length === 0 ? (
            <EmptyState
              className="mt-6"
              icon={<PenLine />}
              title={tab === 'drafts' ? 'მონახაზები არ არის' : 'ჯერ არაფერია გამოქვეყნებული'}
              description="პირველი ტექსტი ყველაზე რთულია. მერე უფრო ადვილდება."
              action={
                <ButtonLink href="/write" prefetch={false}>
                  დაიწყე წერა
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {posts.map((post) => {
                const published = post.status === 'published';
                return (
                  <li key={post.id} className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={published ? `/p/${post.slug}` : `/write/${post.id}`}
                        className="block truncate text-[15px] font-semibold text-ink hover:text-accent"
                      >
                        {post.title || 'უსათაურო'}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-subtle">
                        <span>
                          {published ? formatDate(post.published_at) : `შეიცვალა ${timeAgo(post.updated_at)}`}
                        </span>
                        {post.has_pending ? <Badge tone="warning">გამოუქვეყნებელი ცვლილებები</Badge> : null}
                        {published ? (
                          <span className="flex items-center gap-3 text-muted sm:hidden">
                            <span className="inline-flex items-center gap-1">
                              <Eye className="size-3.5" /> {formatCount(post.view_count)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Heart className="size-3.5" /> {formatCount(post.like_count)}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {published ? (
                      <dl className="hidden shrink-0 items-center gap-5 text-[13px] text-muted sm:flex">
                        <div className="flex items-center gap-1.5">
                          <dt className="sr-only">ნახვები</dt>
                          <Eye className="size-4 text-subtle" />
                          <dd className="tabular-nums">{formatCount(post.view_count)}</dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <dt className="sr-only">მოწონებები</dt>
                          <Heart className="size-4 text-subtle" />
                          <dd className="tabular-nums">{formatCount(post.like_count)}</dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <dt className="sr-only">კომენტარები</dt>
                          <MessageCircle className="size-4 text-subtle" />
                          <dd className="tabular-nums">{formatCount(post.comment_count)}</dd>
                        </div>
                      </dl>
                    ) : null}

                    <PostRowActions postId={post.id} slug={post.slug} published={published} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-10">
          {topPosts.length > 0 ? (
            <section>
              <SectionHeading>ყველაზე კითხვადი</SectionHeading>
              <ol className="space-y-4">
                {topPosts.map((post, index) => (
                  <li key={post.id} className="flex gap-3">
                    <span className="w-6 shrink-0 font-serif text-xl leading-none font-bold text-line-strong tabular-nums">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/p/${post.slug}`}
                        className="line-clamp-2 text-sm leading-snug font-semibold text-ink hover:text-accent"
                      >
                        {post.title || 'უსათაურო'}
                      </Link>
                      <p className="mt-1 text-[13px] text-subtle">{formatCount(post.view_count)} ნახვა</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {recentFollowers.length > 0 ? (
            <section>
              <SectionHeading>ახალი გამომწერები</SectionHeading>
              <ul className="space-y-3.5">
                {recentFollowers.map((follower) => (
                  <li key={follower.id} className="flex items-center gap-3">
                    <Link href={`/u/${follower.username}`}>
                      <Avatar name={follower.name} src={follower.avatar_url} size="sm" />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={`/u/${follower.username}`}
                        className="block truncate text-sm font-medium text-ink hover:text-accent"
                      >
                        {follower.name}
                      </Link>
                      <span className="text-[13px] text-subtle">{timeAgo(follower.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
