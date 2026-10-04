import "server-only";
import { and, asc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { commentLikes, comments, users } from "./db/schema";
import { avatarUrl, formatRelative } from "./user-view";

export const maxCommentLength = 2000;

type Author = { name: string; handle: string; avatar?: string };

export type CommentNode = {
  id: string;
  // Null for a deleted comment kept as a placeholder for its replies.
  author: Author | null;
  body: string | null;
  time: string;
  dateTime: string;
  likes: number;
  liked: boolean;
  mine: boolean;
  // Set on replies deeper than the third level, which are shown at the third level.
  replyTo?: { name: string; handle: string };
  // Live comments anywhere under this one, for the toggle.
  replyCount: number;
  replies: CommentNode[];
};

// Comment → reply → reply to a reply. Replies below that join the second level's list.
const maxDepth = 3;

export async function getPostComments(postId: string, viewerId: string | undefined) {
  const rows = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      userId: comments.userId,
      body: comments.body,
      createdAt: comments.createdAt,
      name: users.name,
      handle: users.handle,
      avatar: users.avatar,
      likes: sql<number>`(select count(*) from comment_likes cl where cl.comment_id = ${comments.id})`.mapWith(
        Number,
      ),
      liked: viewerId
        ? sql<boolean>`exists (select 1 from comment_likes cl where cl.comment_id = ${comments.id} and cl.user_id = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));

  const now = new Date();
  const nodes = new Map<string, CommentNode>();
  const parentOf = new Map<string, string | null>();
  for (const row of rows) {
    const live = row.body !== null && row.handle !== null;
    parentOf.set(row.id, row.parentId);
    nodes.set(row.id, {
      id: row.id,
      author: live ? { name: row.name ?? "", handle: row.handle!, avatar: avatarUrl(row.avatar) } : null,
      body: live ? row.body : null,
      time: formatRelative(row.createdAt, now),
      dateTime: row.createdAt.toISOString(),
      likes: live ? row.likes : 0,
      liked: live && row.liked,
      mine: live && row.userId === viewerId,
      replyCount: 0,
      replies: [],
    });
  }

  const depthOf = new Map<string, number>();
  const depth = (id: string): number => {
    const known = depthOf.get(id);
    if (known) return known;
    const parentId = parentOf.get(id);
    const value = parentId ? depth(parentId) + 1 : 1;
    depthOf.set(id, value);
    return value;
  };

  // Rows come oldest first, so every list fills in conversation order.
  const top: CommentNode[] = [];
  for (const node of nodes.values()) {
    const parentId = parentOf.get(node.id);
    if (!parentId) {
      top.push(node);
      continue;
    }
    const parent = nodes.get(parentId);
    if (!parent) continue;

    let holder = parent;
    if (depth(node.id) > maxDepth) {
      while (depth(holder.id) >= maxDepth) holder = nodes.get(parentOf.get(holder.id)!)!;
      if (parent.author) node.replyTo = { name: parent.author.name, handle: parent.author.handle };
    }
    holder.replies.push(node);
  }

  const countReplies = (node: CommentNode): number => {
    node.replyCount = node.replies.reduce((sum, reply) => sum + (reply.author ? 1 : 0) + countReplies(reply), 0);
    return node.replyCount;
  };
  top.forEach(countReplies);

  // Newest comments first (the page can sort them by popularity); replies stay in the order
  // they were written.
  top.reverse();
  const total = [...nodes.values()].filter((node) => node.author).length;
  return { comments: top, total };
}

// Deletes the matching comments. One with replies stays as an empty placeholder so the replies
// keep their place; placeholders left without replies go too, all the way up the thread.
export async function retireComments(where: SQL) {
  await db.transaction(async (tx) => {
    const targets = await tx.select({ id: comments.id, postId: comments.postId }).from(comments).where(where);
    if (targets.length === 0) return;
    const ids = targets.map((target) => target.id);
    const postIds = [...new Set(targets.map((target) => target.postId))];

    await tx
      .update(comments)
      .set({ body: null, userId: null, deletedAt: new Date() })
      .where(inArray(comments.id, ids));
    await tx.delete(commentLikes).where(inArray(commentLikes.commentId, ids));

    for (;;) {
      const removed = await tx
        .delete(comments)
        .where(
          and(
            inArray(comments.postId, postIds),
            isNotNull(comments.deletedAt),
            sql`not exists (select 1 from comments child where child.parent_id = ${comments.id})`,
          ),
        )
        .returning({ id: comments.id });
      if (removed.length === 0) break;
    }
  });
}
