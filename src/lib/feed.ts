import 'server-only';

import { cache } from 'react';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { POST_CARD_COLUMNS, postCardJoins, runPostCardQuery, type PostCard } from './posts';

export type FeedKind = 'for-you' | 'latest' | 'trending' | 'following';

export type FeedPage = { posts: PostCard[]; hasMore: boolean };

const DECAY_DAYS = 60;
/** Inlined rather than bound: a bound parameter cannot sit inside a numeric literal. */
const DECAY_SECONDS = sql.raw(`${DECAY_DAYS * 86400}.0`);

/** Engagement pressure, log-damped so one viral post cannot own the feed. */
const ENGAGEMENT = sql`ln(1 + p.like_count * 3 + p.comment_count * 4 + p.view_count * 0.3)`;

/** Freshness, halving roughly every five days. */
const FRESHNESS = sql`exp(-extract(epoch from (now() - p.published_at)) / 604800.0)`;

async function paginate(build: (limit: number, offset: number) => Promise<PostCard[]>, limit: number, offset: number) {
  const posts = await build(limit + 1, offset);
  return { posts: posts.slice(0, limit), hasMore: posts.length > limit } satisfies FeedPage;
}

/**
 * The personalised feed.
 *
 * Ranking blends five terms: topic affinity, author affinity, an explicit-follow
 * bonus, engagement and freshness — minus a penalty for posts the reader has
 * already opened. Affinity scores are decayed at read time to match the lazy
 * decay applied on write (see interests.ts).
 */
export async function forYouFeed(viewerId: string, limit = 12, offset = 0): Promise<FeedPage> {
  return paginate(
    (take, skip) =>
      runPostCardQuery(sql`
        select ${POST_CARD_COLUMNS},
          (
              3.0 * ln(1 + aff.topic_score)
            + 2.5 * ln(1 + coalesce(aa.decayed_score, 0))
            + 2.0 * (case when fl.follower_id is not null then 1 else 0 end)
            + 1.2 * ${ENGAGEMENT}
            + 4.0 * ${FRESHNESS}
            - 3.0 * (case when seen.post_id is not null then 1 else 0 end)
          ) as rank
        from posts p
        ${postCardJoins(viewerId)}
        left join lateral (
          select coalesce(sum(
            ta.score * exp(-extract(epoch from (now() - ta.updated_at)) / ${DECAY_SECONDS})
          ), 0) as topic_score
          from post_topics pt
          join topic_affinity ta on ta.topic_id = pt.topic_id and ta.user_id = ${viewerId}::uuid
          where pt.post_id = p.id
        ) aff on true
        left join lateral (
          select aa.score * exp(-extract(epoch from (now() - aa.updated_at)) / ${DECAY_SECONDS}) as decayed_score
          from author_affinity aa
          where aa.user_id = ${viewerId}::uuid and aa.author_id = p.author_id
        ) aa on true
        left join follows fl on fl.follower_id = ${viewerId}::uuid and fl.following_id = p.author_id
        left join lateral (
          select pv.post_id from post_views pv
          where pv.post_id = p.id and pv.user_id = ${viewerId}::uuid
          limit 1
        ) seen on true
        where p.status = 'published'
          and p.author_id <> ${viewerId}::uuid
          and p.published_at > now() - interval '365 days'
        order by rank desc, p.published_at desc
        limit ${take} offset ${skip}
      `),
    limit,
    offset,
  );
}

export async function latestFeed(viewerId: string | null, limit = 12, offset = 0): Promise<FeedPage> {
  return paginate(
    (take, skip) =>
      runPostCardQuery(sql`
        select ${POST_CARD_COLUMNS}
        from posts p
        ${postCardJoins(viewerId)}
        where p.status = 'published'
        order by p.published_at desc
        limit ${take} offset ${skip}
      `),
    limit,
    offset,
  );
}

/** What is moving right now: engagement weighted hard against freshness. */
export async function trendingFeed(viewerId: string | null, limit = 12, offset = 0): Promise<FeedPage> {
  return paginate(
    (take, skip) =>
      runPostCardQuery(sql`
        select ${POST_CARD_COLUMNS},
          (${ENGAGEMENT} * 1.0 + 5.0 * ${FRESHNESS}) as rank
        from posts p
        ${postCardJoins(viewerId)}
        where p.status = 'published'
          and p.published_at > now() - interval '60 days'
        order by rank desc, p.published_at desc
        limit ${take} offset ${skip}
      `),
    limit,
    offset,
  );
}

export async function followingFeed(viewerId: string, limit = 12, offset = 0): Promise<FeedPage> {
  return paginate(
    (take, skip) =>
      runPostCardQuery(sql`
        select ${POST_CARD_COLUMNS}
        from posts p
        ${postCardJoins(viewerId)}
        join follows fl on fl.following_id = p.author_id and fl.follower_id = ${viewerId}::uuid
        where p.status = 'published'
        order by p.published_at desc
        limit ${take} offset ${skip}
      `),
    limit,
    offset,
  );
}

export async function topicFeed(
  viewerId: string | null,
  topicSlug: string,
  limit = 12,
  offset = 0,
): Promise<FeedPage> {
  return paginate(
    (take, skip) =>
      runPostCardQuery(sql`
        select ${POST_CARD_COLUMNS}
        from posts p
        ${postCardJoins(viewerId)}
        join post_topics pt on pt.post_id = p.id
        join topics t on t.id = pt.topic_id and t.slug = ${topicSlug}
        where p.status = 'published'
        order by p.published_at desc
        limit ${take} offset ${skip}
      `),
    limit,
    offset,
  );
}

export async function authorFeed(
  viewerId: string | null,
  authorId: string,
  status: 'published' | 'draft',
  limit = 12,
  offset = 0,
): Promise<FeedPage> {
  return paginate(
    (take, skip) =>
      runPostCardQuery(sql`
        select ${POST_CARD_COLUMNS}
        from posts p
        ${postCardJoins(viewerId)}
        where p.author_id = ${authorId}::uuid and p.status = ${status}
        order by coalesce(p.published_at, p.updated_at) desc
        limit ${take} offset ${skip}
      `),
    limit,
    offset,
  );
}

export async function bookmarkedFeed(viewerId: string, limit = 24, offset = 0): Promise<FeedPage> {
  return paginate(
    (take, skip) =>
      runPostCardQuery(sql`
        select ${POST_CARD_COLUMNS}
        from posts p
        ${postCardJoins(viewerId)}
        where p.status = 'published' and mb.user_id is not null
        order by mb.created_at desc
        limit ${take} offset ${skip}
      `),
    limit,
    offset,
  );
}

/** Posts related to the one being read: shared topics first, then same author. */
export async function relatedPosts(viewerId: string | null, postId: string, limit = 3): Promise<PostCard[]> {
  return runPostCardQuery(sql`
    select ${POST_CARD_COLUMNS},
      (shared.count * 3 + (case when p.author_id = src.author_id then 2 else 0 end) + ${FRESHNESS}) as rank
    from posts p
    ${postCardJoins(viewerId)}
    cross join (select author_id from posts where id = ${postId}::uuid) src
    left join lateral (
      select count(*)::int as count
      from post_topics a
      join post_topics b on b.topic_id = a.topic_id and b.post_id = ${postId}::uuid
      where a.post_id = p.id
    ) shared on true
    where p.status = 'published'
      and p.id <> ${postId}::uuid
      and (shared.count > 0 or p.author_id = src.author_id)
    order by rank desc, p.published_at desc
    limit ${limit}
  `);
}

/**
 * The curated topic list. `is_featured` is the editorial set inserted by
 * db/schema.sql — tags people invent while writing get their own pages but
 * never appear in topic rails, which would otherwise fill up with one-off tags.
 * Empty topics are skipped unless `includeEmpty` is set; on a young site that
 * would hide nearly everything, so most rails pass it.
 */
export async function featuredTopics(limit = 12, { includeEmpty = false } = {}) {
  return db.execute<{ id: string; slug: string; name: string; post_count: number }>(sql`
    select id, slug, name, post_count
    from topics
    where is_featured and (post_count > 0 or ${includeEmpty}::boolean)
    order by post_count desc, name asc
    limit ${limit}
  `);
}

export async function suggestedAuthors(viewerId: string | null, limit = 5) {
  return db.execute<{
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
    bio: string;
    post_count: number;
    follower_count: number;
  }>(sql`
    select u.id, u.name, u.username, u.avatar_url, u.bio,
           count(distinct p.id)::int as post_count,
           count(distinct f.follower_id)::int as follower_count
    from users u
    join posts p on p.author_id = u.id and p.status = 'published'
    left join follows f on f.following_id = u.id
    where u.id <> coalesce(${viewerId}::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
      and not exists (
        select 1 from follows me
        where me.follower_id = ${viewerId}::uuid and me.following_id = u.id
      )
    group by u.id
    order by follower_count desc, post_count desc
    limit ${limit}
  `);
}

/**
 * How many posts are live. Early on, some rails only repeat the feed and are
 * hidden. Memoised per request: the page and its sidebar both ask.
 */
export const publishedPostCount = cache(async (): Promise<number> => {
  const [row] = await db.execute<{ count: number }>(
    sql`select count(*)::int as count from posts where status = 'published'`,
  );
  return row?.count ?? 0;
});
