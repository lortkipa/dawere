import "server-only";
import { and, desc, eq, ilike, isNotNull, ne, or, sql, type SQL } from "drizzle-orm";
import { likePattern } from "./admin-list";
import { db } from "./db";
import { posts, users } from "./db/schema";

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

// How many of the words a row matches, for ranking.
function score(matches: SQL[]) {
  return sql<number>`(${sql.join(
    matches.map((match) => sql`(${match})::int`),
    sql` + `,
  )})`;
}

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
  const patterns = words(query).map(likePattern);
  if (patterns.length === 0 && !author) return "nothing found";

  const postMatches = patterns.map(
    (pattern) =>
      sql`(${or(
        ilike(posts.title, pattern),
        ilike(posts.description, pattern),
        ilike(users.name, pattern),
        ilike(users.handle, pattern),
      )} or exists (select 1 from unnest(${posts.tags}) t left join categories c on c.slug = t where t ilike ${pattern} or c.label ilike ${pattern}))`,
  );
  // Without words (an author's posts) there is nothing to rank by but date.
  const postScore = patterns.length > 0 ? score(postMatches) : null;

  const postCount = sql<number>`(select count(*) from posts p where p.user_id = ${users}.id)::int`;
  const authorMatches = patterns.map(
    (pattern) => sql`${or(ilike(users.name, pattern), ilike(users.handle, pattern), ilike(users.bio, pattern))}`,
  );
  const authorScore = score(authorMatches);

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
          author ? eq(users.handle, author.replace(/^@/, "").toLowerCase()) : sql`${postScore} > 0`,
        ),
      )
      .orderBy(...(postScore ? [desc(postScore)] : []), desc(posts.createdAt))
      .limit(postLimit),
    author || patterns.length === 0
      ? []
      : db
          .select({ handle: users.handle, name: users.name, posts: postCount })
          .from(users)
          .where(and(isNotNull(users.onboardedAt), sql`${postCount} > 0`, sql`${authorScore} > 0`))
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
