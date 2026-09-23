import 'server-only';

import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { POST_CARD_COLUMNS, postCardJoins, mapPostCard, type PostCard } from './posts';

/**
 * Search is three cooperating strategies over one Postgres index set:
 *
 *  1. `websearch_to_tsquery` — honours quoted phrases, OR and -exclusions.
 *  2. A prefix tsquery (`word:*`) — so results appear before the word is finished.
 *  3. Trigram similarity — catches typos ("ჯავასკიპტი") that no tsquery will match.
 *
 * The 'simple' configuration is deliberate: Postgres has no Georgian dictionary,
 * so there is no stemming to inherit and the English one would only mislead.
 *
 * Results are ranked by relevance, then nudged by engagement, freshness and how
 * much the searcher already likes the post's topics.
 */

export const HL_START = '[[hl]]';
export const HL_END = '[[/hl]]';

const HEADLINE_OPTIONS =
  'StartSel=[[hl]], StopSel=[[/hl]], MaxFragments=2, FragmentDelimiter=" … ", MinWords=10, MaxWords=26';

export type SearchSort = 'relevance' | 'recent' | 'popular';

export type PostHit = PostCard & { headline: string; score: number };

export type PersonHit = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
  postCount: number;
  followerCount: number;
  followedByMe: boolean;
};

export type TopicHit = { id: string; slug: string; name: string; postCount: number };

export type SearchResults = {
  query: string;
  posts: PostHit[];
  people: PersonHit[];
  topics: TopicHit[];
  totalPosts: number;
  hasMore: boolean;
  didYouMean: string | null;
};

/** Strips tsquery operators so user input can never be injected into `to_tsquery`. */
function tokenize(raw: string): string[] {
  return raw
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
}

/**
 * True when the reader used search syntax: a quoted phrase, a -exclusion or OR.
 * Those queries mean something precise, and OR-ing a prefix query onto them would
 * quietly undo it — `-postgres` would match the very posts it excludes.
 */
function hasOperators(raw: string): boolean {
  return /["“”]/.test(raw) || /(^|\s)-\S/.test(raw) || /(^|\s)OR(\s|$)/.test(raw);
}

const MKHEDRULI = /^[ა-ჿ]+$/;

/**
 * Georgian declines: "ტიპოგრაფია" is stored, but a reader types "ტიპოგრაფიის".
 * A plain prefix query cannot help — the typed word is the longer one — and with
 * no Georgian dictionary there is no stemmer to fall back on. Dropping the last
 * two characters covers the common case endings (-ის, -ში, -ზე, -მა, -ებ) and
 * turns the query back into a prefix of the indexed token.
 *
 * Latin tokens are left alone: English suffixes are not this regular, and
 * truncating "search" to "sear:*" would only add noise.
 */
function searchStem(token: string): string {
  return MKHEDRULI.test(token) && token.length >= 6 ? token.slice(0, -2) : token;
}

/** The combined tsquery described above. */
function buildTsQuery(raw: string): SQL {
  const tokens = tokenize(raw);
  if (tokens.length === 0 || hasOperators(raw)) {
    return sql`websearch_to_tsquery('simple', ${raw})`;
  }
  const prefix = tokens.map((t) => `${t}:*`).join(' & ');
  const stemmed = tokens.map((t) => `${searchStem(t)}:*`).join(' & ');
  return sql`(
    websearch_to_tsquery('simple', ${raw})
    || to_tsquery('simple', ${prefix})
    || to_tsquery('simple', ${stemmed})
  )`;
}

function orderBy(sort: SearchSort): SQL {
  if (sort === 'recent') return sql`p.published_at desc`;
  if (sort === 'popular') return sql`(p.like_count * 3 + p.comment_count * 4 + p.view_count) desc, p.published_at desc`;
  return sql`score desc, p.published_at desc`;
}

type PostHitRow = Parameters<typeof mapPostCard>[0] & { headline: string; score: number };

export async function searchPosts(
  viewerId: string | null,
  raw: string,
  { sort = 'relevance' as SearchSort, limit = 10, offset = 0, topic = null as string | null } = {},
): Promise<{ hits: PostHit[]; hasMore: boolean }> {
  const query = raw.trim();
  if (!query) return { hits: [], hasMore: false };

  const tsq = buildTsQuery(query);
  const take = limit + 1;

  const rows = await db.execute<PostHitRow>(sql`
    with q as (select ${tsq} as tsq, ${query}::text as raw)
    select ${POST_CARD_COLUMNS},
      ts_headline('simple', left(p.content_text, 4000), q.tsq, ${HEADLINE_OPTIONS}) as headline,
      (
          10.0 * ts_rank_cd(p.search_vector, q.tsq, 32)
        +  6.0 * similarity(p.title, q.raw)
        +  2.0 * (case when lower(p.title) = lower(q.raw) then 1 else 0 end)
        +  1.5 * (case when p.title ilike '%' || q.raw || '%' then 1 else 0 end)
        +  0.6 * ln(1 + p.like_count * 3 + p.comment_count * 4 + p.view_count * 0.3)
        +  0.8 * exp(-extract(epoch from (now() - p.published_at)) / 2592000.0)
        +  1.5 * ln(1 + coalesce(aff.topic_score, 0))
      ) as score
    from posts p
    cross join q
    ${postCardJoins(viewerId)}
    left join lateral (
      select coalesce(sum(ta.score), 0) as topic_score
      from post_topics pt
      join topic_affinity ta on ta.topic_id = pt.topic_id and ta.user_id = ${viewerId}::uuid
      where pt.post_id = p.id
    ) aff on true
    where p.status = 'published'
      and (
        p.search_vector @@ q.tsq
        or similarity(p.title, q.raw) > 0.25
        or p.title ilike '%' || q.raw || '%'
      )
      and (
        ${topic}::text is null
        or exists (
          select 1 from post_topics pt2
          join topics t2 on t2.id = pt2.topic_id
          where pt2.post_id = p.id and t2.slug = ${topic}
        )
      )
    order by ${orderBy(sort)}
    limit ${take} offset ${offset}
  `);

  const hits = rows.slice(0, limit).map((row) => ({
    ...mapPostCard(row),
    headline: row.headline ?? '',
    score: Number(row.score ?? 0),
  }));

  return { hits, hasMore: rows.length > limit };
}

export async function countPosts(raw: string, topic: string | null = null): Promise<number> {
  const query = raw.trim();
  if (!query) return 0;
  const tsq = buildTsQuery(query);
  const rows = await db.execute<{ count: number }>(sql`
    with q as (select ${tsq} as tsq, ${query}::text as raw)
    select count(*)::int as count
    from posts p
    cross join q
    where p.status = 'published'
      and (
        p.search_vector @@ q.tsq
        or similarity(p.title, q.raw) > 0.25
        or p.title ilike '%' || q.raw || '%'
      )
      and (
        ${topic}::text is null
        or exists (
          select 1 from post_topics pt2
          join topics t2 on t2.id = pt2.topic_id
          where pt2.post_id = p.id and t2.slug = ${topic}
        )
      )
  `);
  return rows[0]?.count ?? 0;
}

export async function searchPeople(viewerId: string | null, raw: string, limit = 8): Promise<PersonHit[]> {
  const query = raw.trim();
  if (!query) return [];
  const rows = await db.execute<{
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
    bio: string;
    post_count: number;
    follower_count: number;
    followed_by_me: boolean;
  }>(sql`
    select u.id, u.name, u.username, u.avatar_url, u.bio,
      (select count(*)::int from posts p where p.author_id = u.id and p.status = 'published') as post_count,
      (select count(*)::int from follows f where f.following_id = u.id) as follower_count,
      exists (select 1 from follows f2 where f2.following_id = u.id and f2.follower_id = ${viewerId}::uuid) as followed_by_me
    from users u
    where u.name ilike '%' || ${query} || '%'
       or u.username ilike '%' || ${query} || '%'
       or similarity(u.name, ${query}) > 0.3
       or similarity(u.username, ${query}) > 0.3
    order by
      (case when lower(u.username) = lower(${query}) then 2 else 0 end)
      + greatest(similarity(u.name, ${query}), similarity(u.username, ${query})) desc,
      follower_count desc
    limit ${limit}
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    username: r.username,
    avatarUrl: r.avatar_url,
    bio: r.bio,
    postCount: r.post_count,
    followerCount: r.follower_count,
    followedByMe: Boolean(r.followed_by_me),
  }));
}

export async function searchTopics(raw: string, limit = 8): Promise<TopicHit[]> {
  const query = raw.trim();
  if (!query) return [];
  const rows = await db.execute<{ id: string; slug: string; name: string; post_count: number }>(sql`
    select id, slug, name, post_count
    from topics
    where name ilike '%' || ${query} || '%'
       or slug ilike '%' || ${query} || '%'
       or similarity(name, ${query}) > 0.3
    order by
      (case when lower(name) = lower(${query}) then 1 else 0 end) desc,
      similarity(name, ${query}) desc,
      post_count desc
    limit ${limit}
  `);
  return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, postCount: r.post_count }));
}

/**
 * Corrects each word of a failed query against the harvested vocabulary.
 * Returns null unless at least one word actually changed.
 */
export async function didYouMean(raw: string): Promise<string | null> {
  const tokens = tokenize(raw);
  if (tokens.length === 0 || tokens.length > 4) return null;

  const corrected = await Promise.all(
    tokens.map(async (token) => {
      if (token.length < 4) return token;
      // Edit distance beats trigram similarity here: transposed letters
      // ("დიზნაი") wreck a trigram score but stay one or two edits away.
      const maxDistance = token.length <= 5 ? 1 : 2;
      const rows = await db.execute<{ term: string }>(sql`
        select term from search_terms
        where length(term) between ${token.length - maxDistance} and ${token.length + maxDistance}
          and levenshtein_less_equal(term, ${token}, ${maxDistance}) <= ${maxDistance}
        order by levenshtein(term, ${token}), length(term)
        limit 1
      `);
      return rows[0]?.term ?? token;
    }),
  );

  const suggestion = corrected.join(' ');
  return suggestion.toLowerCase() === tokens.join(' ').toLowerCase() ? null : suggestion;
}

/** Everything the search page needs, in parallel. */
export async function searchEverything(
  viewerId: string | null,
  raw: string,
  opts: { sort?: SearchSort; limit?: number; offset?: number; topic?: string | null } = {},
): Promise<SearchResults> {
  const query = raw.trim();
  const [posts, people, topics, totalPosts] = await Promise.all([
    searchPosts(viewerId, query, {
      sort: opts.sort ?? 'relevance',
      limit: opts.limit ?? 10,
      offset: opts.offset ?? 0,
      topic: opts.topic ?? null,
    }),
    searchPeople(viewerId, query, 6),
    searchTopics(query, 8),
    countPosts(query, opts.topic ?? null),
  ]);

  // Only worth suggesting a correction when nothing at all came back.
  const suggestion =
    posts.hits.length === 0 && people.length === 0 && topics.length === 0 ? await didYouMean(query) : null;

  return {
    query,
    posts: posts.hits,
    hasMore: posts.hasMore,
    people,
    topics,
    totalPosts,
    didYouMean: suggestion,
  };
}

/** Fast path for the header's type-ahead dropdown. */
export async function quickSearch(viewerId: string | null, raw: string) {
  const query = raw.trim();
  if (query.length < 2) return { posts: [], people: [], topics: [] };
  const [posts, people, topics] = await Promise.all([
    searchPosts(viewerId, query, { limit: 5 }),
    searchPeople(viewerId, query, 3),
    searchTopics(query, 4),
  ]);
  return {
    posts: posts.hits.map((p) => ({
      slug: p.slug,
      title: p.title,
      author: p.author.name,
      readingMinutes: p.readingMinutes,
    })),
    people: people.map((p) => ({ username: p.username, name: p.name, avatarUrl: p.avatarUrl })),
    topics: topics.map((t) => ({ slug: t.slug, name: t.name })),
  };
}
