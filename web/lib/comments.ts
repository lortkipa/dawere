import { asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commentLikes, comments, users } from "@/db/schema";

/** One comment, with the person who wrote it, as the page renders it. */
export type CommentView = {
  id: string;
  body: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    image: string | null;
    handle: string;
  };
  /**
   * Whoever wrote the comment this one answers, or null on a thread. The page
   * only prints it once the indent has stopped growing — until then, where the
   * reply sits already says who it is talking to.
   */
  replyingTo: string | null;
  /** How many liked this comment, and whether the reader is one of them. */
  likes: number;
  liked: boolean;
  /** The replies to this comment, oldest first — each with replies of its own. */
  replies: CommentView[];
};

export type CommentThreads = {
  /** Top-level comments, newest first, each holding its own replies. */
  threads: CommentView[];
  /** Everything said under the article, replies counted too. */
  total: number;
};

/**
 * Every comment on one article in one query, and the shape the page draws.
 *
 * A chain of replies can run as deep as the conversation does, and depth costs
 * nothing here: a reply is always written after the comment it answers, so one
 * indexed scan in that order hands back every parent before the rows that name
 * it, and the tree is built by pushing each row onto a parent already in hand.
 *
 * Every level comes back ordered by likes — see `rank` at the foot of the file.
 */
export async function articleComments(
  articleId: string,
  /** Who is reading, so their own likes come back with the counts. */
  viewerId?: string,
): Promise<CommentThreads> {
  const [rows, tallies] = await Promise.all([
    db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        body: comments.body,
        createdAt: comments.createdAt,
        authorId: users.id,
        authorName: users.name,
        authorImage: users.image,
        authorHandle: users.handle,
      })
      .from(comments)
      // Inner, not left: `author_id` is NOT NULL and cascades, so a comment
      // whose writer deleted their account is gone rather than authorless.
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.articleId, articleId))
      .orderBy(asc(comments.createdAt)),

    // Every comment's likes in one grouped scan rather than a query per
    // comment, and the reader's own state folded into the same pass: whether
    // one of the rows behind a count is theirs is a question about the group.
    // A signed-out reader compares against null, which matches nothing.
    db
      .select({
        commentId: commentLikes.commentId,
        total: count(),
        mine: sql<boolean>`
          coalesce(bool_or(${commentLikes.userId} = ${viewerId ?? null}), false)
        `,
      })
      .from(commentLikes)
      .innerJoin(comments, eq(commentLikes.commentId, comments.id))
      .where(eq(comments.articleId, articleId))
      .groupBy(commentLikes.commentId),
  ]);

  const tallyById = new Map(tallies.map((row) => [row.commentId, row]));
  const byId = new Map<string, CommentView>();
  const threads: CommentView[] = [];

  for (const row of rows) {
    const tally = tallyById.get(row.id);

    byId.set(row.id, {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      author: {
        id: row.authorId,
        name: row.authorName?.trim() || "ავტორი",
        image: row.authorImage,
        handle: row.authorHandle,
      },
      // Filled on the second pass, once every author is in the map: a parent is
      // always there by then, but only the first pass guarantees it.
      replyingTo: null,
      likes: tally?.total ?? 0,
      liked: tally?.mine ?? false,
      replies: [],
    });
  }

  for (const row of rows) {
    const comment = byId.get(row.id)!;

    if (!row.parentId) {
      threads.push(comment);
      continue;
    }

    // The parent is always already in the map: it is a comment on this same
    // article, and it was written before the reply that names it.
    const parent = byId.get(row.parentId);
    if (!parent) continue;

    comment.replyingTo = parent.author.name;
    parent.replies.push(comment);
  }

  // The scan is oldest first because a reply has to land after the comment it
  // hangs off; the threads themselves are read the other way round.
  threads.reverse();
  rank(threads);

  return { threads, total: rows.length };
}

/**
 * Most liked first, at every level of the thread.
 *
 * The sort is stable and the count is its only key, so everything nobody has
 * liked keeps the order the scan gave it: threads newest first, the way a page
 * of comments is read, and the replies inside one oldest first, the way a
 * conversation is. Until somebody likes something the order is the one it
 * always was — which is the point. A like lifts a comment out of that order
 * rather than replacing it.
 */
function rank(comments: CommentView[]) {
  comments.sort((a, b) => b.likes - a.likes);
  for (const comment of comments) rank(comment.replies);
}
