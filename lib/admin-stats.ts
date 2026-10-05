import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { referrals, topics } from "./onboarding-options";
import { tagView } from "./tags";

// The overview's time range: the last N days, or everything since the first sign-up.
export const statRanges = ["30", "7", "180", "all"] as const;
export type StatRange = (typeof statRanges)[number];

type Unit = "day" | "week" | "month";

export type Point = { label: string; value: number };
export type Bar = { label: string; value: number };

const dayFormat = new Intl.DateTimeFormat("ka-GE", { day: "numeric", month: "short" });
const monthFormat = new Intl.DateTimeFormat("ka-GE", { month: "short", year: "numeric" });

function bucketLabel(date: Date, unit: Unit) {
  return unit === "month" ? monthFormat.format(date) : dayFormat.format(date);
}

// Each event source gives `at` (and `who` where distinct people are counted).
const sources = {
  signups: sql`select created_at as at, id as who from users`,
  posts: sql`select created_at as at, id::text as who from posts`,
  comments: sql`select created_at as at, id as who from comments where body is not null`,
  likes: sql`select created_at as at, user_id as who from post_likes`,
  favorites: sql`select created_at as at, user_id as who from post_favorites`,
  follows: sql`select created_at as at, follower_id as who from follows`,
  opens: sql`select opened_at as at, user_id as who from post_views where opened_at is not null`,
  readers: sql`select seen_at as at, user_id as who from post_views`,
} satisfies Record<string, SQL>;

type Source = keyof typeof sources;

// Readers count people, everything else counts events.
const counted = (source: Source) => (source === "readers" ? sql`count(distinct e.who)` : sql`count(e.at)`);

async function series(source: Source, start: Date, unit: Unit): Promise<Point[]> {
  const step = `1 ${unit}`;
  const rows = await db.execute<{ bucket: string; value: number }>(sql`
    with b as (
      select generate_series(date_trunc(${unit}, ${start.toISOString()}::timestamptz), date_trunc(${unit}, now()), ${step}::interval) as bucket
    )
    select b.bucket, ${counted(source)}::int as value
    from b left join (${sources[source]}) e on date_trunc(${unit}, e.at) = b.bucket
    group by b.bucket
    order by b.bucket
  `);
  return rows.map((row) => ({ label: bucketLabel(new Date(row.bucket), unit), value: Number(row.value) }));
}

// The count in the range and, for the last-N-days ranges, in the N days before it.
async function total(source: Source, days: number | null) {
  if (days === null) {
    const [row] = await db.execute<{ value: number }>(
      sql`select ${counted(source)}::int as value from (${sources[source]}) e`,
    );
    return { value: Number(row.value), previous: null };
  }
  const span = `${days} days`;
  const [row] = await db.execute<{ value: number; previous: number }>(sql`
    select
      (select ${counted(source)} from (${sources[source]}) e where e.at >= now() - ${span}::interval)::int as value,
      (select ${counted(source)} from (${sources[source]}) e
        where e.at >= now() - 2 * ${span}::interval and e.at < now() - ${span}::interval)::int as previous
  `);
  return { value: Number(row.value), previous: Number(row.previous) };
}

export async function getOverview(range: StatRange) {
  const days = range === "all" ? null : Number(range);
  const now = new Date();
  let start: Date;
  if (days === null) {
    const [first] = await db.execute<{ at: string | null }>(sql`select min(created_at) as at from users`);
    start = first.at ? new Date(first.at) : now;
  } else {
    start = new Date(now.getTime() - (days - 1) * 86400_000);
  }
  const spanDays = (now.getTime() - start.getTime()) / 86400_000;
  const unit: Unit = spanDays <= 31 ? "day" : spanDays <= 200 ? "week" : "month";
  const since = days === null ? sql`true` : sql`at >= now() - ${`${days} days`}::interval`;

  const tileSources: Source[] = ["signups", "posts", "comments", "likes", "favorites", "follows", "opens", "readers"];
  const chartSources: Source[] = ["signups", "readers", "posts", "opens", "comments", "likes"];

  const [tiles, charts, totals, topicRows, tagRows, referralRows, topPosts, topAuthors] = await Promise.all([
    Promise.all(tileSources.map(async (source) => [source, await total(source, days)] as const)),
    Promise.all(chartSources.map(async (source) => [source, await series(source, start, unit)] as const)),
    db.execute<{ users: number; onboarded: number; admins: number; posts: number }>(sql`
      select
        (select count(*) from users)::int as users,
        (select count(*) from users where onboarded_at is not null)::int as onboarded,
        (select count(*) from users where role <> 'user')::int as admins,
        (select count(*) from posts)::int as posts
    `),
    // Readers' current topics, whenever they joined.
    db.execute<{ slug: string; value: number }>(sql`
      select slug, count(*)::int as value from users, unnest(topics) as slug group by slug order by value desc
    `),
    db.execute<{ tag: string; value: number }>(sql`
      select tag, count(*)::int as value from (select created_at as at, tags from posts) p, unnest(p.tags) as tag
      where ${since} group by tag order by value desc limit 10
    `),
    db.execute<{ referral: string; value: number }>(sql`
      select referral, count(*)::int as value from (select created_at as at, referral from users) u
      where referral is not null and ${since} group by referral order by value desc
    `),
    db.execute<{ id: string; title: string; handle: string; opens: number }>(sql`
      select p.id, p.title, u.handle, count(*)::int as opens
      from (select post_id, opened_at as at from post_views where opened_at is not null) v
      join posts p on p.id = v.post_id join users u on u.id = p.user_id
      where ${since} group by p.id, p.title, u.handle order by opens desc limit 5
    `),
    db.execute<{ id: string; name: string | null; handle: string; followers: number }>(sql`
      select u.id, u.name, u.handle, count(*)::int as followers
      from (select following_id, created_at as at from follows) f join users u on u.id = f.following_id
      where ${since} group by u.id, u.name, u.handle order by followers desc limit 5
    `),
  ]);

  return {
    unit,
    tiles: Object.fromEntries(tiles) as Record<Source, { value: number; previous: number | null }>,
    charts: Object.fromEntries(charts) as Record<Source, Point[]>,
    totals: totals[0],
    topics: topicRows.map((row) => {
      const topic = topics.find((item) => item.slug === row.slug);
      return { label: topic ? `${topic.emoji} ${topic.label}` : row.slug, value: Number(row.value) };
    }),
    tags: tagRows.map((row) => {
      const view = tagView(row.tag);
      return { label: view.emoji ? `${view.emoji} ${view.label}` : `#${view.label}`, value: Number(row.value) };
    }),
    referrals: referralRows.map((row) => {
      const option = referrals.find((item) => item.slug === row.referral);
      return { label: option ? `${option.emoji} ${option.label}` : row.referral, value: Number(row.value) };
    }),
    topPosts: topPosts.map((row) => ({ ...row, opens: Number(row.opens) })),
    topAuthors: topAuthors.map((row) => ({ ...row, followers: Number(row.followers) })),
  };
}
