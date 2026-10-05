import "server-only";
import { and, asc, count, desc, eq, gte, ilike, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { adminPageSize, choice, dayParam, likePattern, pageParam, param, type SearchParams } from "./admin-list";
import { db } from "./db";
import { comments, posts, users, type User } from "./db/schema";
import { postIdPattern, uuidPattern } from "./ids";
import { topics } from "./onboarding-options";
import { canManage } from "./roles";
import { avatarUrl, formatShortDate } from "./user-view";

// Blogs ---------------------------------------------------------------------------------------

export const postSorts = ["new", "old", "likes", "comments", "opens"] as const;
const coverFilters = ["", "with", "without"] as const;

export function postFilters(params: SearchParams) {
  const author = param(params, "author");
  const tag = param(params, "tag");
  return {
    q: param(params, "q"),
    author: uuidPattern.test(author) ? author : "",
    tag: topics.some((topic) => topic.slug === tag) ? tag : "",
    cover: choice(params, "cover", coverFilters),
    from: dayParam(params, "from"),
    to: dayParam(params, "to"),
    sort: choice(params, "sort", postSorts),
    page: pageParam(params),
  };
}

export type PostFilters = ReturnType<typeof postFilters>;

// Spelled out with the table, so inside a subquery "id" can't mean the subquery's own table.
const postId = sql`${posts}.id`;
const likeCount = sql<number>`(select count(*) from post_likes l where l.post_id = ${postId})::int`;
const commentCount = sql<number>`(select count(*) from comments c where c.post_id = ${postId} and c.body is not null)::int`;
const openCount = sql<number>`(select count(*) from post_views v where v.post_id = ${postId} and v.opened_at is not null)::int`;

export async function listPosts(filters: PostFilters, pageSize = adminPageSize) {
  const conditions: (SQL | undefined)[] = [];
  if (filters.q) {
    const pattern = likePattern(filters.q);
    conditions.push(
      or(
        ilike(posts.title, pattern),
        ilike(posts.description, pattern),
        ilike(users.name, pattern),
        ilike(users.handle, pattern),
      ),
    );
  }
  if (filters.author) conditions.push(eq(posts.userId, filters.author));
  if (filters.tag) conditions.push(sql`${filters.tag} = any(${posts.tags})`);
  if (filters.cover === "with") conditions.push(isNotNull(posts.cover));
  if (filters.cover === "without") conditions.push(isNull(posts.cover));
  if (filters.from) conditions.push(gte(posts.createdAt, sql`${filters.from}::date`));
  if (filters.to) conditions.push(lt(posts.createdAt, sql`${filters.to}::date + 1`));
  const where = and(...conditions);

  const order = {
    new: [desc(posts.createdAt)],
    old: [asc(posts.createdAt)],
    likes: [desc(likeCount), desc(posts.createdAt)],
    comments: [desc(commentCount), desc(posts.createdAt)],
    opens: [desc(openCount), desc(posts.createdAt)],
  }[filters.sort];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        cover: posts.cover,
        tags: posts.tags,
        createdAt: posts.createdAt,
        authorId: users.id,
        authorName: users.name,
        authorHandle: users.handle,
        authorRole: users.role,
        likes: likeCount,
        comments: commentCount,
        opens: openCount,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.userId))
      .where(where)
      .orderBy(...order, desc(posts.id))
      .limit(pageSize)
      .offset((filters.page - 1) * pageSize),
    db.select({ total: count() }).from(posts).innerJoin(users, eq(users.id, posts.userId)).where(where),
  ]);
  return { rows, total };
}

export async function getPostDetail(id: string) {
  if (!postIdPattern.test(id)) return null;
  const [row] = await db
    .select({
      post: posts,
      author: users,
      likes: likeCount,
      comments: commentCount,
      opens: openCount,
      seen: sql<number>`(select count(*) from post_views v where v.post_id = ${postId})::int`,
      favorites: sql<number>`(select count(*) from post_favorites f where f.post_id = ${postId})::int`,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(eq(posts.id, id))
    .limit(1);
  return row ?? null;
}

// Comments ------------------------------------------------------------------------------------

export const commentSorts = ["new", "old", "likes"] as const;
const commentKinds = ["", "top", "reply"] as const;

export function commentFilters(params: SearchParams) {
  const author = param(params, "author");
  const post = param(params, "post");
  return {
    q: param(params, "q"),
    author: uuidPattern.test(author) ? author : "",
    post: postIdPattern.test(post) ? post : "",
    kind: choice(params, "kind", commentKinds),
    from: dayParam(params, "from"),
    to: dayParam(params, "to"),
    sort: choice(params, "sort", commentSorts),
    page: pageParam(params),
  };
}

export type CommentFilters = ReturnType<typeof commentFilters>;

const commentId = sql`${comments}.id`;
const commentLikeCount = sql<number>`(select count(*) from comment_likes l where l.comment_id = ${commentId})::int`;

// Live comments only; a deleted one kept for its replies has nothing to manage.
export async function listComments(filters: CommentFilters, pageSize = adminPageSize) {
  const conditions: (SQL | undefined)[] = [isNotNull(comments.body), isNotNull(comments.userId)];
  if (filters.q) conditions.push(ilike(comments.body, likePattern(filters.q)));
  if (filters.author) conditions.push(eq(comments.userId, filters.author));
  if (filters.post) conditions.push(eq(comments.postId, filters.post));
  if (filters.kind === "top") conditions.push(isNull(comments.parentId));
  if (filters.kind === "reply") conditions.push(isNotNull(comments.parentId));
  if (filters.from) conditions.push(gte(comments.createdAt, sql`${filters.from}::date`));
  if (filters.to) conditions.push(lt(comments.createdAt, sql`${filters.to}::date + 1`));
  const where = and(...conditions);

  const order = {
    new: [desc(comments.createdAt)],
    old: [asc(comments.createdAt)],
    likes: [desc(commentLikeCount), desc(comments.createdAt)],
  }[filters.sort];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: comments.id,
        body: comments.body,
        createdAt: comments.createdAt,
        parentId: comments.parentId,
        likes: commentLikeCount,
        postId: posts.id,
        postTitle: posts.title,
        authorId: users.id,
        authorName: users.name,
        authorHandle: users.handle,
        authorAvatar: users.avatar,
        authorRole: users.role,
        // The comment it answers, for context.
        replyTo: sql<
          string | null
        >`(select coalesce(pu.name, '@' || pu.handle) from comments pc join users pu on pu.id = pc.user_id where pc.id = ${comments.parentId})`,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .innerJoin(posts, eq(posts.id, comments.postId))
      .where(where)
      .orderBy(...order, desc(comments.id))
      .limit(pageSize)
      .offset((filters.page - 1) * pageSize),
    db.select({ total: count() }).from(comments).where(where),
  ]);
  return { rows, total };
}

export type AdminComment = Awaited<ReturnType<typeof listComments>>["rows"][number];

// The label of an author or blog a list is narrowed to, for its filter chip.
export async function scopeLabels(author: string, post: string) {
  const [authorRow] = author
    ? await db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, author)).limit(1)
    : [];
  const [postRow] = post ? await db.select({ title: posts.title }).from(posts).where(eq(posts.id, post)).limit(1) : [];
  return {
    author: authorRow ? authorRow.name || `@${authorRow.handle}` : null,
    post: postRow?.title ?? null,
  };
}

// What the comment list shows, with edit/delete only where `actor` may act.
export function commentRows(rows: AdminComment[], actor: Pick<User, "role" | "email">) {
  return rows.map((row) => ({
    id: row.id,
    body: row.body ?? "",
    date: formatShortDate(row.createdAt),
    likes: row.likes,
    replyTo: row.replyTo,
    postId: row.postId,
    postTitle: row.postTitle,
    authorId: row.authorId,
    authorName: row.authorName || `@${row.authorHandle}`,
    avatar: avatarUrl(row.authorAvatar),
    // The author's email isn't selected; canManage only needs it for the superadmin check.
    editable: canManage(actor, { role: row.authorRole, email: "" }),
  }));
}
