import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { posts, users, type User } from "./db/schema";
import { avatarUrl, formatDate, formatRelative } from "./user-view";

export const pageSize = 10;

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
};

export type ProfilePost = {
  id: string;
  href: string;
  title: string;
  description: string;
  cover: string | null;
  date: string;
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

function textArray(values: string[]) {
  return values.length
    ? sql`array[${sql.join(
        values.map((value) => sql`${value}`),
        sql`, `,
      )}]::text[]`
    : sql`'{}'::text[]`;
}

// Live comments only, the same rule as the count on the post page.
const commentCount = sql<number>`(select count(*) from comments c where c.post_id = ${posts.id} and c.body is not null and c.user_id is not null)::int`;
const likeCount = sql<number>`(select count(*) from post_likes pl where pl.post_id = ${posts.id})::int`;

// Every post except the reader's own, in one list. Nothing is filtered out: a post in one of the
// reader's topics counts as 4× fresher, one by an author they follow as 6×, both as 9×. With
// few posts that means their topics first and then everything else; with many, fresh posts in
// their topics lead without old ones sticking to the top.
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
  let keyset: SQL | undefined;

  const followed = sql<boolean>`exists (select 1 from follows f where f.follower_id = ${viewer.id} and f.following_id = ${posts.userId})`;
  const inTopics = sql`${posts.tags} && ${textArray(viewer.topics ?? [])}`;

  if (after) {
    const date = new Date(String(after.asOf));
    if (
      Number.isNaN(date.getTime()) ||
      !visitSeed.test(String(after.seed)) ||
      typeof after.score !== "number" ||
      !postId.test(String(after.id))
    ) {
      return { items: [], next: null };
    }
    asOf = date;
    seed = String(after.seed);
  }

  const at = sql`${asOf.toISOString()}::timestamptz`;
  const ageInDays = sql`extract(epoch from (${at} - ${posts.createdAt})) / 86400`;
  const seenFactor = sql`coalesce((select case when pv.opened_at < ${at} then 0.05 when pv.seen_at < ${at} then 0.25 else 1 end from post_views pv where pv.user_id = ${viewer.id} and pv.post_id = ${posts.id}), 1)`;
  // 0.8–1.2, from the first 32 bits of md5(id + seed).
  const shuffle = sql`(0.8 + 0.4 * ('x' || substr(md5(${posts.id} || ${seed}), 1, 8))::bit(32)::bigint / 4294967296.0)`;
  // float8, so the score survives the trip through the cursor exactly.
  const score = sql<number>`((1 + 3 * (${inTopics})::int + 5 * (${followed})::int) / (${ageInDays} + 1) * ${seenFactor} * ${shuffle})::float8`;

  if (after) {
    keyset = or(
      sql`${score} < ${after.score}::float8`,
      and(sql`${score} = ${after.score}::float8`, sql`${posts.id} < ${after.id}`),
    );
  }

  const rows = await db
    .select({
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
      liked: sql<boolean>`exists (select 1 from post_likes pl where pl.post_id = ${posts.id} and pl.user_id = ${viewer.id})`,
      comments: commentCount,
      followed,
      score,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(and(ne(posts.userId, viewer.id), lte(posts.createdAt, asOf), keyset))
    .orderBy(desc(score), desc(posts.id))
    .limit(pageSize + 1);

  const page = rows.slice(0, pageSize);
  const last = page.at(-1);
  const now = new Date();
  return {
    items: page.map((row) => ({
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
    })),
    next:
      rows.length > pageSize && last
        ? encodeCursor({ asOf: asOf.toISOString(), seed, score: last.score, id: last.id })
        : null,
  };
}

// An author's posts, newest first.
export async function getProfilePage(authorId: string, cursor: string | null): Promise<Page<ProfilePost>> {
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
    .select({
      id: posts.id,
      title: posts.title,
      description: posts.description,
      cover: posts.cover,
      createdAt: posts.createdAt,
      exactCreatedAt: sql<string>`${posts.createdAt}::text`,
      handle: users.handle,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(and(eq(posts.userId, authorId), keyset))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(pageSize + 1);

  const page = rows.slice(0, pageSize);
  const last = page.at(-1);
  return {
    items: page.map((row) => ({
      id: row.id,
      href: `/@${row.handle}/${row.id}`,
      title: row.title,
      description: row.description,
      cover: row.cover,
      date: formatDate(row.createdAt),
    })),
    next: rows.length > pageSize && last ? encodeCursor({ createdAt: last.exactCreatedAt, id: last.id }) : null,
  };
}
