import "server-only";
import { and, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { adminPageSize, choice, likePattern, pageParam, param, type SearchParams } from "./admin-list";
import { isBannedSql } from "./bans";
import { db } from "./db";
import { comments, posts, reports, users } from "./db/schema";
import { postIdPattern, uuidPattern } from "./ids";
import { reportKinds, type ReportKind } from "./report-rules";
import { reportAuthor } from "./reports";

export const reportViews = ["open", "closed"] as const;
export const reportSorts = ["new", "most"] as const;
const kindFilters = ["", ...reportKinds] as const;

export function reportFilters(params: SearchParams) {
  const author = param(params, "author");
  return {
    q: param(params, "q"),
    status: choice(params, "status", reportViews),
    kind: choice(params, "kind", kindFilters),
    author: uuidPattern.test(author) ? author : "",
    sort: choice(params, "sort", reportSorts),
    page: pageParam(params),
  };
}

export type ReportFilters = ReturnType<typeof reportFilters>;

export const kindLabels: Record<ReportKind, string> = {
  post: "ბლოგი",
  comment: "კომენტარი",
  user: "მომხმარებელი",
};

export function isTargetId(kind: ReportKind, id: string) {
  return kind === "post" ? postIdPattern.test(id) : uuidPattern.test(id);
}

const targetColumn = { post: reports.postId, comment: reports.commentId, user: reports.userId };

export function reportsOn(kind: ReportKind, id: string) {
  return and(eq(reports.kind, kind), eq(targetColumn[kind], id));
}

// One row per reported post, comment or user, with how many reports it has and why.
export async function listReportGroups(filters: ReportFilters, pageSize = adminPageSize) {
  const conditions: (SQL | undefined)[] = [
    filters.status === "open" ? eq(reports.status, "open") : ne(reports.status, "open"),
  ];
  if (filters.kind) conditions.push(eq(reports.kind, filters.kind));
  if (filters.author) conditions.push(sql`${reportAuthor} = ${filters.author}`);
  if (filters.q) {
    // The reported text or name, or what the reader wrote about it.
    const pattern = likePattern(filters.q);
    conditions.push(
      sql`(${reports}.details ilike ${pattern}
        or exists (select 1 from posts p where p.id = ${reports}.post_id and p.title ilike ${pattern})
        or exists (select 1 from comments c where c.id = ${reports}.comment_id and c.body ilike ${pattern})
        or exists (select 1 from users u where u.id = ${reportAuthor} and (u.name ilike ${pattern} or u.handle ilike ${pattern})))`,
    );
  }
  const where = and(...conditions);

  const latest = sql<Date>`max(${reports.createdAt})`.mapWith((value) => new Date(value));
  const total = sql<number>`count(*)::int`;
  const order = filters.sort === "most" ? [desc(total), desc(latest)] : [desc(latest)];

  const [groups, [{ count }]] = await Promise.all([
    db
      .select({
        kind: reports.kind,
        postId: reports.postId,
        commentId: reports.commentId,
        userId: reports.userId,
        count: total,
        latest,
        reasons: sql<string[]>`array_agg(distinct ${reports.reason})`,
        statuses: sql<string[]>`array_agg(distinct ${reports.status})`,
      })
      .from(reports)
      .where(where)
      .groupBy(reports.kind, reports.postId, reports.commentId, reports.userId)
      .orderBy(...order)
      .limit(pageSize)
      .offset((filters.page - 1) * pageSize),
    db
      .select({
        count: sql<number>`count(distinct (${reports.kind}, ${reports.postId}, ${reports.commentId}, ${reports.userId}))::int`,
      })
      .from(reports)
      .where(where),
  ]);

  const postIds = groups.flatMap((group) => (group.postId ? [group.postId] : []));
  const commentIds = groups.flatMap((group) => (group.commentId ? [group.commentId] : []));
  const userIds = groups.flatMap((group) => (group.userId ? [group.userId] : []));
  const [postRows, commentRows, userRows] = await Promise.all([
    postIds.length
      ? db
          .select({ id: posts.id, title: posts.title, name: users.name, handle: users.handle, avatar: users.avatar })
          .from(posts)
          .innerJoin(users, eq(users.id, posts.userId))
          .where(inArray(posts.id, postIds))
      : [],
    commentIds.length
      ? db
          .select({
            id: comments.id,
            body: comments.body,
            postTitle: posts.title,
            name: users.name,
            handle: users.handle,
            avatar: users.avatar,
          })
          .from(comments)
          .innerJoin(posts, eq(posts.id, comments.postId))
          .innerJoin(users, eq(users.id, comments.userId))
          .where(inArray(comments.id, commentIds))
      : [],
    userIds.length
      ? db
          .select({ id: users.id, name: users.name, handle: users.handle, avatar: users.avatar })
          .from(users)
          .where(inArray(users.id, userIds))
      : [],
  ]);
  const postsById = new Map(postRows.map((row) => [row.id, row]));
  const commentsById = new Map(commentRows.map((row) => [row.id, row]));
  const usersById = new Map(userRows.map((row) => [row.id, row]));

  const rows = groups.map((group) => {
    const base = {
      kind: group.kind,
      count: group.count,
      latest: group.latest,
      reasons: group.reasons,
      statuses: group.statuses,
    };
    if (group.kind === "post") {
      const post = postsById.get(group.postId!);
      return { ...base, id: group.postId!, text: post?.title ?? "", context: null, author: post ?? null };
    }
    if (group.kind === "comment") {
      const comment = commentsById.get(group.commentId!);
      return {
        ...base,
        id: group.commentId!,
        text: comment?.body ?? "",
        context: comment?.postTitle ?? null,
        author: comment ?? null,
      };
    }
    const user = usersById.get(group.userId!);
    return { ...base, id: group.userId!, text: user ? user.name || `@${user.handle}` : "", context: null, author: user ?? null };
  });
  return { rows, total: count };
}

export type ReportGroup = Awaited<ReturnType<typeof listReportGroups>>["rows"][number];

const reporter = alias(users, "reporter");
const closer = alias(users, "closer");

// Every report about one post, comment or user, newest first.
export async function listReportsOn(kind: ReportKind, id: string) {
  return db
    .select({
      id: reports.id,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      createdAt: reports.createdAt,
      closedAt: reports.closedAt,
      reporterId: reporter.id,
      reporterName: reporter.name,
      reporterHandle: reporter.handle,
      reporterAvatar: reporter.avatar,
      closerName: closer.name,
      closerHandle: closer.handle,
    })
    .from(reports)
    .leftJoin(reporter, eq(reporter.id, reports.reporterId))
    .leftJoin(closer, eq(closer.id, reports.closedBy))
    .where(reportsOn(kind, id))
    .orderBy(desc(reports.createdAt));
}

// What a report points at, with its author; null once it's gone.
export async function getReportTarget(kind: ReportKind, id: string) {
  if (!isTargetId(kind, id)) return null;
  if (kind === "post") {
    const [row] = await db
      .select({ post: posts, author: users, banned: isBannedSql })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.userId))
      .where(eq(posts.id, id))
      .limit(1);
    return row ? { kind, ...row } : null;
  }
  if (kind === "comment") {
    const postAuthor = alias(users, "post_author");
    const [row] = await db
      .select({
        comment: comments,
        postTitle: posts.title,
        postHandle: postAuthor.handle,
        author: users,
        banned: isBannedSql,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .innerJoin(posts, eq(posts.id, comments.postId))
      .innerJoin(postAuthor, eq(postAuthor.id, posts.userId))
      .where(eq(comments.id, id))
      .limit(1);
    return row && row.comment.body !== null ? { kind, ...row } : null;
  }
  const [row] = await db.select({ author: users, banned: isBannedSql }).from(users).where(eq(users.id, id)).limit(1);
  return row ? { kind, ...row } : null;
}

// Open reports about a user and their writing, for the tile on their admin page.
export async function openReportsAbout(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(and(eq(reports.status, "open"), sql`${reportAuthor} = ${userId}`));
  return row.count;
}

export type ReportTarget = NonNullable<Awaited<ReturnType<typeof getReportTarget>>>;
