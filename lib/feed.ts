import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { notBanned } from "./bans";
import { db } from "./db";
import { postFavorites, posts, users, type User } from "./db/schema";
import { getInterests, isLearnedWeights, learnedWeights, tuneTopics } from "./interests";
import { avatarUrl, formatRelative } from "./user-view";

// The home feed and profiles both load in pages this size; see useWindowedList.
export const feedPageSize = 25;

export type Page<T> = { items: T[]; next: string | null };

export type FeedPost = {
  id: string;
  href: string;
  title: string;
  description: string;
  cover: string | null;
  date: string;
  dateTime: string;
  author: { id: string; name: string; handle: string; avatar?: string };
  likes: number;
  liked: boolean;
  comments: number;
  followed: boolean;
  favorited: boolean;
};

// Cursors are opaque to the browser: base64url JSON, checked field by field on the way back.
function encodeCursor(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeCursor(cursor: string | null): Record<string, unknown> | null {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString());
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

const postId = /^[0-9a-f]{12}$/;
const visitSeed = /^[0-9a-f]{16}$/;
// How Postgres prints a timestamptz: "2026-10-04 09:15:02.123456+04".
const pgTimestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2})?$/;

function floatArray(values: number[]) {
  return values.length
    ? sql`array[${sql.join(
        values.map((value) => sql`${value}`),
        sql`, `,
      )}]::float8[]`
    : sql`'{}'::float8[]`;
}

function textArray(values: string[]) {
  return values.length
    ? sql`array[${sql.join(
        values.map((value) => sql`${value}`),
        sql`, `,
      )}]::text[]`
    : sql`'{}'::text[]`;
}

// Live comments by accounts that aren't banned, the same rule as the count on the post page.
const commentCount = sql<number>`(select count(*) from comments c join users cu on cu.id = c.user_id where c.post_id = ${posts.id} and c.body is not null and not exists (select 1 from bans b where b.email = cu.email))::int`;
const likeCount = sql<number>`(select count(*) from post_likes pl where pl.post_id = ${posts.id})::int`;

// What a post card shows, the same on the home feed and on profiles.
function cardFields(viewerId: string | null) {
  return {
    id: posts.id,
    title: posts.title,
    description: posts.description,
    cover: posts.cover,
    createdAt: posts.createdAt,
    authorId: users.id,
    name: users.name,
    handle: users.handle,
    avatar: users.avatar,
    likes: likeCount,
    liked: viewerId
      ? sql<boolean>`exists (select 1 from post_likes pl where pl.post_id = ${posts.id} and pl.user_id = ${viewerId})`
      : sql<boolean>`false`,
    comments: commentCount,
    followed: viewerId
      ? sql<boolean>`exists (select 1 from follows f where f.follower_id = ${viewerId} and f.following_id = ${posts.userId})`
      : sql<boolean>`false`,
    favorited: viewerId
      ? sql<boolean>`exists (select 1 from post_favorites pf where pf.post_id = ${posts.id} and pf.user_id = ${viewerId})`
      : sql<boolean>`false`,
  };
}

type CardRow = {
  id: string;
  title: string;
  description: string;
  cover: string | null;
  createdAt: Date;
  authorId: string;
  name: string | null;
  handle: string;
  avatar: string | null;
  likes: number;
  liked: boolean;
  comments: number;
  followed: boolean;
  favorited: boolean;
};

function toFeedPost(row: CardRow, now: Date): FeedPost {
  return {
    id: row.id,
    href: `/@${row.handle}/${row.id}`,
    title: row.title,
    description: row.description,
    cover: row.cover,
    date: formatRelative(row.createdAt, now),
    dateTime: row.createdAt.toISOString(),
    author: { id: row.authorId, name: row.name ?? "", handle: row.handle, avatar: avatarUrl(row.avatar) },
    likes: row.likes,
    liked: row.liked,
    comments: row.comments,
    followed: row.followed,
    favorited: row.favorited,
  };
}

// Every post except the reader's own, in one list. Nothing is filtered out: a post in one of the
// reader's topics counts as 4× fresher, one by an author they follow as 6×, both as 9×. With
// few posts that means their topics first and then everything else; with many, fresh posts in
// their topics lead without old ones sticking to the top.
//
// On top of that, tags the reader has been reading lately (lib/interests.ts) add up to 3 more,
// half their learned weight. The first page also lets lib/interests.ts adjust the topics.
//
// Posts the reader already scrolled past count a quarter, opened ones a twentieth, so each visit
// leads with what they haven't seen; on a small site the seen ones still follow. A ±20% shuffle,
// seeded per visit, keeps close scores from always coming out in the same order.
//
// The first page fixes `asOf` and the seed, and every later page scores against them (views from
// before `asOf` only), so the order can't shift while the reader scrolls. Posts published since
// then wait for the next visit.
export async function getFeedPage(viewer: User, cursor: string | null): Promise<Page<FeedPost>> {
  const after = decodeCursor(cursor);
  if (cursor && !after) return { items: [], next: null };
  let asOf = new Date();
  let seed = randomBytes(8).toString("hex");
  let learned: Record<string, number>;
  let topics = viewer.topics ?? [];
  let keyset: SQL | undefined;

  if (after) {
    const date = new Date(String(after.asOf));
    if (
      Number.isNaN(date.getTime()) ||
      !visitSeed.test(String(after.seed)) ||
      typeof after.score !== "number" ||
      !postId.test(String(after.id)) ||
      !isLearnedWeights(after.learned)
    ) {
      return { items: [], next: null };
    }
    asOf = date;
    seed = String(after.seed);
    learned = after.learned;
  } else {
    const interests = await getInterests(viewer.id, asOf);
    topics = await tuneTopics(viewer, interests, asOf);
    learned = learnedWeights(interests);
  }

  const followed = sql<boolean>`exists (select 1 from follows f where f.follower_id = ${viewer.id} and f.following_id = ${posts.userId})`;
  const inTopics = sql`${posts.tags} && ${textArray(topics)}`;
  const learnedBoost = sql`least(3, coalesce((select sum(l.weight) from unnest(${textArray(Object.keys(learned))}, ${floatArray(Object.values(learned))}) as l(tag, weight) where l.tag = any(${posts.tags})), 0) / 2)`;

  const at = sql`${asOf.toISOString()}::timestamptz`;
  const ageInDays = sql`extract(epoch from (${at} - ${posts.createdAt})) / 86400`;
  const seenFactor = sql`coalesce((select case when pv.opened_at < ${at} then 0.05 when pv.seen_at < ${at} then 0.25 else 1 end from post_views pv where pv.user_id = ${viewer.id} and pv.post_id = ${posts.id}), 1)`;
  // 0.8–1.2, from the first 32 bits of md5(id + seed).
  const shuffle = sql`(0.8 + 0.4 * ('x' || substr(md5(${posts.id} || ${seed}), 1, 8))::bit(32)::bigint / 4294967296.0)`;
  // float8, so the score survives the trip through the cursor exactly.
  const score = sql<number>`((1 + 3 * (${inTopics})::int + ${learnedBoost} + 5 * (${followed})::int) / (${ageInDays} + 1) * ${seenFactor} * ${shuffle})::float8`;

  if (after) {
    keyset = or(
      sql`${score} < ${after.score}::float8`,
      and(sql`${score} = ${after.score}::float8`, sql`${posts.id} < ${after.id}`),
    );
  }

  const rows = await db
    .select({ ...cardFields(viewer.id), score })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(and(ne(posts.userId, viewer.id), lte(posts.createdAt, asOf), notBanned, keyset))
    .orderBy(desc(score), desc(posts.id))
    .limit(feedPageSize + 1);

  const page = rows.slice(0, feedPageSize);
  const last = page.at(-1);
  const now = new Date();
  return {
    items: page.map((row) => toFeedPost(row, now)),
    next:
      rows.length > feedPageSize && last
        ? encodeCursor({ asOf: asOf.toISOString(), seed, learned, score: last.score, id: last.id })
        : null,
  };
}

// An author's posts, newest first, as the same cards as the home feed. Signed-out readers have
// no likes or follows.
export async function getProfilePage(
  viewer: User | null,
  authorId: string,
  cursor: string | null,
): Promise<Page<FeedPost>> {
  const after = decodeCursor(cursor);
  if (cursor && !after) return { items: [], next: null };
  let keyset: SQL | undefined;
  if (after) {
    // The time goes through the cursor as Postgres text, which keeps the microseconds a JS Date
    // would drop.
    if (typeof after.createdAt !== "string" || !pgTimestamp.test(after.createdAt) || !postId.test(String(after.id))) {
      return { items: [], next: null };
    }
    const createdAt = sql`${after.createdAt}::timestamptz`;
    keyset = or(
      sql`${posts.createdAt} < ${createdAt}`,
      and(sql`${posts.createdAt} = ${createdAt}`, sql`${posts.id} < ${after.id}`),
    );
  }

  const rows = await db
    .select({ ...cardFields(viewer?.id ?? null), exactCreatedAt: sql<string>`${posts.createdAt}::text` })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(and(eq(posts.userId, authorId), notBanned, keyset))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(feedPageSize + 1);

  const page = rows.slice(0, feedPageSize);
  const last = page.at(-1);
  const now = new Date();
  return {
    items: page.map((row) => toFeedPost(row, now)),
    next: rows.length > feedPageSize && last ? encodeCursor({ createdAt: last.exactCreatedAt, id: last.id }) : null,
  };
}

// The posts a user added to favorites, the last added first, as the same cards. Whether the
// viewer may see them is up to the caller.
export async function getFavoritesPage(
  viewer: User | null,
  ownerId: string,
  cursor: string | null,
): Promise<Page<FeedPost>> {
  const after = decodeCursor(cursor);
  if (cursor && !after) return { items: [], next: null };
  let keyset: SQL | undefined;
  if (after) {
    if (typeof after.addedAt !== "string" || !pgTimestamp.test(after.addedAt) || !postId.test(String(after.id))) {
      return { items: [], next: null };
    }
    const addedAt = sql`${after.addedAt}::timestamptz`;
    keyset = or(
      sql`${postFavorites.createdAt} < ${addedAt}`,
      and(sql`${postFavorites.createdAt} = ${addedAt}`, sql`${posts.id} < ${after.id}`),
    );
  }

  const rows = await db
    .select({ ...cardFields(viewer?.id ?? null), exactAddedAt: sql<string>`${postFavorites.createdAt}::text` })
    .from(postFavorites)
    .innerJoin(posts, eq(posts.id, postFavorites.postId))
    .innerJoin(users, eq(users.id, posts.userId))
    .where(and(eq(postFavorites.userId, ownerId), notBanned, keyset))
    .orderBy(desc(postFavorites.createdAt), desc(posts.id))
    .limit(feedPageSize + 1);

  const page = rows.slice(0, feedPageSize);
  const last = page.at(-1);
  const now = new Date();
  return {
    items: page.map((row) => toFeedPost(row, now)),
    next: rows.length > feedPageSize && last ? encodeCursor({ addedAt: last.exactAddedAt, id: last.id }) : null,
  };
}
