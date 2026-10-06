import "server-only";
import { and, desc, eq, ilike, isNotNull, ne, or, sql, type SQL } from "drizzle-orm";
import { likePattern } from "./admin-list";
import { notBanned } from "./bans";
import { db } from "./db";
import { posts, users, type User } from "./db/schema";
import {
  cardFields,
  decodeCursor,
  encodeCursor,
  feedPageSize,
  pgTimestamp,
  postId,
  toFeedPost,
  type FeedPost,
  type Page,
} from "./feed";
import { avatarUrl, imageUrl } from "./user-view";

const maxWords = 5;
const postLimit = 5;
const authorLimit = 3;
const descriptionLength = 120;

function words(query: string) {
  const unique = new Set(
    query
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length >= 2),
  );
  return [...unique].slice(0, maxWords);
}

function patterns(query: string) {
  return words(query).map(likePattern);
}

// A post matches a word in its title, description, author, a tag or that tag's topic name.
function postMatch(pattern: string) {
  return sql`(${or(
    ilike(posts.title, pattern),
    ilike(posts.description, pattern),
    ilike(users.name, pattern),
    ilike(users.handle, pattern),
  )} or exists (select 1 from unnest(${posts.tags}) t left join categories c on c.slug = t where t ilike ${pattern} or c.label ilike ${pattern}))`;
}

function authorMatch(pattern: string) {
  return sql`${or(ilike(users.name, pattern), ilike(users.handle, pattern), ilike(users.bio, pattern))}`;
}

// How many of the words a row matches, for ranking.
function score(matches: SQL[]) {
  return sql<number>`(${sql.join(
    matches.map((match) => sql`(${match})::int`),
    sql` + `,
  )})`;
}

const postCount = sql<number>`(select count(*) from posts p where p.user_id = ${users}.id)::int`;

function cut(text: string, length: number) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length - 1)}…` : flat;
}

// Keeps the separator out of fields, so every result stays one line.
function field(text: string | null) {
  return (text ?? "").replaceAll("|", "/");
}

/*
  Finds posts and authors for the reading chat's search tool; with `author` (a handle), only that
  author's posts, newest first unless the query ranks them. The result is a few short lines rather
  than JSON, since the model reads every character of it.
*/
export async function searchDawere(query: string, author: string | null, excludePostId: string) {
  const wordPatterns = patterns(query);
  if (wordPatterns.length === 0 && !author) return "nothing found";

  // Without words (an author's posts) there is nothing to rank by but date.
  const postScore = wordPatterns.length > 0 ? score(wordPatterns.map(postMatch)) : null;
  const authorScore = score(wordPatterns.map(authorMatch));

  const [postRows, authorRows] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        description: posts.description,
        handle: users.handle,
        name: users.name,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.userId))
      .where(
        and(
          ne(posts.id, excludePostId),
          notBanned,
          author ? eq(users.handle, author.replace(/^@/, "").toLowerCase()) : sql`${postScore} > 0`,
        ),
      )
      .orderBy(...(postScore ? [desc(postScore)] : []), desc(posts.createdAt))
      .limit(postLimit),
    author || wordPatterns.length === 0
      ? []
      : db
          .select({ handle: users.handle, name: users.name, posts: postCount })
          .from(users)
          .where(and(isNotNull(users.onboardedAt), notBanned, sql`${postCount} > 0`, sql`${authorScore} > 0`))
          .orderBy(desc(authorScore), desc(postCount))
          .limit(authorLimit),
  ]);

  if (postRows.length === 0 && authorRows.length === 0) return "nothing found";
  const lines: string[] = [];
  if (postRows.length > 0) {
    lines.push("posts:");
    for (const post of postRows) {
      lines.push(
        `/@${post.handle}/${post.id} | ${field(post.title)} | ${field(post.name ?? post.handle)} | ${field(cut(post.description, descriptionLength))}`,
      );
    }
  }
  if (authorRows.length > 0) {
    lines.push("authors:");
    for (const author of authorRows) {
      lines.push(`/@${author.handle} | ${field(author.name ?? author.handle)} | ${author.posts} posts`);
    }
  }
  return lines.join("\n");
}

// The search box's dropdown: the best few posts and authors.
export type Suggestions = {
  posts: { href: string; title: string; author: string; cover?: string }[];
  authors: { href: string; name: string; handle: string; avatar?: string }[];
};

const suggestedPosts = 5;
const suggestedAuthors = 3;

export async function getSuggestions(query: string): Promise<Suggestions> {
  const wordPatterns = patterns(query);
  if (wordPatterns.length === 0) return { posts: [], authors: [] };
  const postScore = score(wordPatterns.map(postMatch));
  const authorScore = score(wordPatterns.map(authorMatch));

  const [postRows, authorRows] = await Promise.all([
    db
      .select({ id: posts.id, title: posts.title, cover: posts.cover, handle: users.handle, name: users.name })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.userId))
      .where(and(notBanned, sql`${postScore} > 0`))
      .orderBy(desc(postScore), desc(posts.createdAt))
      .limit(suggestedPosts),
    db
      .select({ handle: users.handle, name: users.name, avatar: users.avatar })
      .from(users)
      .where(and(isNotNull(users.onboardedAt), notBanned, sql`${authorScore} > 0`))
      .orderBy(desc(authorScore), desc(postCount), desc(users.id))
      .limit(suggestedAuthors),
  ]);

  return {
    posts: postRows.map((row) => ({
      href: `/@${row.handle}/${row.id}`,
      title: row.title,
      author: row.name ?? row.handle,
      cover: row.cover ? imageUrl(row.cover) : undefined,
    })),
    authors: authorRows.map((row) => ({
      href: `/@${row.handle}`,
      name: row.name ?? row.handle,
      handle: row.handle,
      avatar: avatarUrl(row.avatar),
    })),
  };
}

// Posts for the search page, as feed cards: those matching the most words first, newest first
// among equals. The reader's own posts are included.
export async function searchPosts(viewer: User | null, query: string, cursor: string | null): Promise<Page<FeedPost>> {
  const wordPatterns = patterns(query);
  const after = decodeCursor(cursor);
  if (wordPatterns.length === 0 || (cursor && !after)) return { items: [], next: null };
  const postScore = score(wordPatterns.map(postMatch));

  let keyset: SQL | undefined;
  if (after) {
    if (
      !Number.isInteger(after.score) ||
      typeof after.createdAt !== "string" ||
      !pgTimestamp.test(after.createdAt) ||
      !postId.test(String(after.id))
    ) {
      return { items: [], next: null };
    }
    const createdAt = sql`${after.createdAt}::timestamptz`;
    keyset = or(
      sql`${postScore} < ${after.score}`,
      and(
        sql`${postScore} = ${after.score}`,
        or(
          sql`${posts.createdAt} < ${createdAt}`,
          and(sql`${posts.createdAt} = ${createdAt}`, sql`${posts.id} < ${after.id}`),
        ),
      ),
    );
  }

  const rows = await db
    .select({ ...cardFields(viewer?.id ?? null), score: postScore, exactCreatedAt: sql<string>`${posts.createdAt}::text` })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(and(notBanned, sql`${postScore} > 0`, keyset))
    .orderBy(desc(postScore), desc(posts.createdAt), desc(posts.id))
    .limit(feedPageSize + 1);

  const page = rows.slice(0, feedPageSize);
  const last = page.at(-1);
  const now = new Date();
  return {
    items: page.map((row) => toFeedPost(row, now)),
    next:
      rows.length > feedPageSize && last
        ? encodeCursor({ score: last.score, createdAt: last.exactCreatedAt, id: last.id })
        : null,
  };
}

export type AuthorResult = {
  id: string;
  href: string;
  name: string;
  handle: string;
  avatar?: string;
  bio: string | null;
  followed: boolean;
};

// Authors for the search page, people without posts too, so readers can find someone to follow.
// Paged by offset: the list is short, and post counts may change between pages.
export async function searchAuthors(
  viewer: User | null,
  query: string,
  cursor: string | null,
): Promise<Page<AuthorResult>> {
  const wordPatterns = patterns(query);
  const after = decodeCursor(cursor);
  if (wordPatterns.length === 0 || (cursor && !after)) return { items: [], next: null };
  const offset = after ? after.offset : 0;
  if (!Number.isInteger(offset) || (offset as number) < 0) return { items: [], next: null };
  const authorScore = score(wordPatterns.map(authorMatch));

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      handle: users.handle,
      avatar: users.avatar,
      bio: users.bio,
      followed: viewer
        ? sql<boolean>`exists (select 1 from follows f where f.follower_id = ${viewer.id} and f.following_id = ${users.id})`
        : sql<boolean>`false`,
    })
    .from(users)
    .where(and(isNotNull(users.onboardedAt), notBanned, sql`${authorScore} > 0`))
    .orderBy(desc(authorScore), desc(postCount), desc(users.id))
    .offset(offset as number)
    .limit(feedPageSize + 1);

  return {
    items: rows.slice(0, feedPageSize).map((row) => ({
      id: row.id,
      href: `/@${row.handle}`,
      name: row.name ?? row.handle,
      handle: row.handle,
      avatar: avatarUrl(row.avatar),
      bio: row.bio,
      followed: row.followed,
    })),
    next: rows.length > feedPageSize ? encodeCursor({ offset: (offset as number) + feedPageSize }) : null,
  };
}
