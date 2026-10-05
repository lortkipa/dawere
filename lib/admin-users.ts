import "server-only";
import { and, asc, count, desc, eq, gte, ilike, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { adminPageSize, choice, dayParam, likePattern, pageParam, param, type SearchParams } from "./admin-list";
import { isBannedSql } from "./bans";
import { db } from "./db";
import { roles, sessions, users } from "./db/schema";

export const userSorts = ["new", "old", "posts", "followers", "comments"] as const;
export const userStatuses = ["", "onboarded", "pending", "banned"] as const;
export const userRoles = ["", ...roles] as const;
export const userPostFilters = ["", "with", "without"] as const;

export function userFilters(params: SearchParams) {
  return {
    q: param(params, "q"),
    role: choice(params, "role", userRoles),
    status: choice(params, "status", userStatuses),
    posts: choice(params, "posts", userPostFilters),
    from: dayParam(params, "from"),
    to: dayParam(params, "to"),
    sort: choice(params, "sort", userSorts),
    page: pageParam(params),
  };
}

export type UserFilters = ReturnType<typeof userFilters>;

// Spelled out with the table: in a single-table select Drizzle leaves column names unqualified,
// and inside the subquery "id" would mean the subquery's own table.
const userId = sql`${users}.id`;

const postCount = sql<number>`(select count(*) from posts p where p.user_id = ${userId})::int`;
// Live comments only, as everywhere else on the site.
const commentCount = sql<number>`(select count(*) from comments c where c.user_id = ${userId} and c.body is not null)::int`;
const followerCount = sql<number>`(select count(*) from follows f where f.following_id = ${userId})::int`;

export async function listUsers(filters: UserFilters) {
  const conditions: (SQL | undefined)[] = [];
  if (filters.q) {
    const pattern = likePattern(filters.q);
    conditions.push(or(ilike(users.name, pattern), ilike(users.email, pattern), ilike(users.handle, pattern)));
  }
  if (filters.role) conditions.push(eq(users.role, filters.role));
  if (filters.status === "onboarded") conditions.push(isNotNull(users.onboardedAt));
  if (filters.status === "pending") conditions.push(isNull(users.onboardedAt));
  if (filters.status === "banned") conditions.push(isBannedSql);
  if (filters.posts === "with") conditions.push(sql`exists (select 1 from posts p where p.user_id = ${userId})`);
  if (filters.posts === "without") conditions.push(sql`not exists (select 1 from posts p where p.user_id = ${userId})`);
  if (filters.from) conditions.push(gte(users.createdAt, sql`${filters.from}::date`));
  if (filters.to) conditions.push(lt(users.createdAt, sql`${filters.to}::date + 1`));
  const where = and(...conditions);

  const order = {
    new: [desc(users.createdAt)],
    old: [asc(users.createdAt)],
    posts: [desc(postCount), desc(users.createdAt)],
    followers: [desc(followerCount), desc(users.createdAt)],
    comments: [desc(commentCount), desc(users.createdAt)],
  }[filters.sort];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        handle: users.handle,
        avatar: users.avatar,
        role: users.role,
        onboardedAt: users.onboardedAt,
        createdAt: users.createdAt,
        banned: isBannedSql,
        posts: postCount,
        comments: commentCount,
        followers: followerCount,
      })
      .from(users)
      .where(where)
      .orderBy(...order, desc(users.id))
      .limit(adminPageSize)
      .offset((filters.page - 1) * adminPageSize),
    db.select({ total: count() }).from(users).where(where),
  ]);
  return { rows, total };
}

export async function getUserDetail(id: string) {
  const [row] = await db
    .select({
      user: users,
      posts: postCount,
      comments: commentCount,
      followers: followerCount,
      following: sql<number>`(select count(*) from follows f where f.follower_id = ${userId})::int`,
      likes: sql<number>`(select count(*) from post_likes l where l.user_id = ${userId})::int`,
      favorites: sql<number>`(select count(*) from post_favorites f where f.user_id = ${userId})::int`,
      opened: sql<number>`(select count(*) from post_views v where v.user_id = ${userId} and v.opened_at is not null)::int`,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!row) return null;

  const [session] = await db
    .select({
      active: count(),
      lastSignIn: sql<Date | null>`max(${sessions.createdAt})`.mapWith((value) => (value ? new Date(value) : null)),
    })
    .from(sessions)
    .where(and(eq(sessions.userId, id), gte(sessions.expiresAt, sql`now()`)));
  return { ...row, sessions: session.active, lastSignIn: session.lastSignIn };
}
