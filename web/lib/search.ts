import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, follows, users } from "@/db/schema";
import type { AuthorRow } from "@/components/author/AuthorList";
import type { FeedPost } from "@/components/feed/FeedList";

/**
 * The one search on dawere, and it looks in both places there is anything to
 * find: the people and what they published. Nothing else is searchable — a
 * draft has no address and no reader, so it is not a result.
 *
 * Substring rather than full-text: the corpus is small, Georgian stemming is
 * not something Postgres ships, and a reader searching a name or half a title
 * is what the field is actually for.
 */

/** A few names above the articles, not a directory. */
const AUTHOR_LIMIT = 6;

/** One screenful, matching the feed. Paging arrives when anyone scrolls past it. */
const ARTICLE_LIMIT = 20;

/** The shortest term worth a query: one letter matches most of the site. */
export const MIN_QUERY = 2;

export type SearchResults = {
  authors: AuthorRow[];
  posts: FeedPost[];
};

/**
 * `%` and `_` mean something to ILIKE and nothing to the person typing them, so
 * they are escaped into themselves rather than left to match everything.
 */
function contains(term: string): string {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

export async function search(
  term: string,
  viewerId: string | undefined,
): Promise<SearchResults> {
  const pattern = contains(term);

  const [authors, posts] = await Promise.all([
    searchAuthors(pattern, viewerId),
    searchArticles(pattern),
  ]);

  return { authors, posts };
}

/**
 * People, by the two things they are addressed as — the name they show and the
 * handle their page lives at. The viewer is left out: their own page is a door
 * in the avatar menu, and following themselves is the one thing the button
 * cannot do.
 */
async function searchAuthors(
  pattern: string,
  viewerId: string | undefined,
): Promise<AuthorRow[]> {
  const published = and(
    eq(articles.authorId, users.id),
    eq(articles.status, "published"),
  );

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      handle: users.handle,
      image: users.image,
      bio: users.bio,
      // Both correlated rather than joined: one row per author is the answer,
      // and a join to articles would multiply it by their output.
      posts: sql<number>`(select count(*) from ${articles} where ${published})`
        .mapWith(Number)
        .as("posts"),
      following: viewerId
        ? sql<boolean>`exists (select 1 from ${follows} where ${follows.followerId} = ${viewerId} and ${follows.followingId} = ${users.id})`.mapWith(
            Boolean,
          )
        : sql<boolean>`false`.mapWith(Boolean),
    })
    .from(users)
    .where(
      and(
        or(ilike(users.name, pattern), ilike(users.handle, pattern)),
        viewerId ? ne(users.id, viewerId) : undefined,
      ),
    )
    // The people writing most are the people worth finding first.
    .orderBy(desc(sql`posts`), users.name)
    .limit(AUTHOR_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    // Same fallback as everywhere else the platform names somebody.
    name: row.name?.trim() || row.email,
    handle: row.handle,
    image: row.image,
    bio: row.bio,
    posts: row.posts,
    following: row.following,
  }));
}

/** Published articles, by title and by the excerpt already derived from them. */
async function searchArticles(pattern: string): Promise<FeedPost[]> {
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
      authorName: users.name,
      authorEmail: users.email,
      authorHandle: users.handle,
      authorImage: users.image,
    })
    .from(articles)
    .innerJoin(users, eq(users.id, articles.authorId))
    .where(
      and(
        eq(articles.status, "published"),
        or(ilike(articles.title, pattern), ilike(articles.excerpt, pattern)),
      ),
    )
    .orderBy(desc(articles.publishedAt))
    .limit(ARTICLE_LIMIT);

  return rows
    // A published row always has one; the column is nullable because a draft
    // does not, and the type is what says so.
    .filter((row) => row.slug !== null)
    .map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug as string,
      excerpt: row.excerpt,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      author: {
        name: row.authorName?.trim() || row.authorEmail,
        handle: row.authorHandle,
        image: row.authorImage,
      },
    }));
}
