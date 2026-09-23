'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bookmarks, commentLikes, comments, follows, likes, notifications, posts, topics, users } from '@/db/schema';
import { closeReports, logAdmin } from '@/lib/admin';
import { getCurrentUser, isStaff } from '@/lib/auth';
import {
  SIGNAL,
  forgetTopics,
  isFollowingTopic,
  recordFollowSignal,
  recordPostSignal,
  recordTopicSignal,
} from '@/lib/interests';
import { notify, notifyComment, notifyMentions, withdraw } from '@/lib/notifications';
import { TOO_MANY, rateLimit } from '@/lib/rate-limit';
import { commentSchema } from '@/lib/validation';
import { isUuid } from '@/lib/utils';

type Toggle = { ok: boolean; active: boolean; count?: number; error?: string };

const UNAUTHENTICATED: Toggle = { ok: false, active: false, error: 'ამისთვის საჭიროა შესვლა.' };
const UNAVAILABLE: Toggle = { ok: false, active: false, error: 'ეს სტატია მიუწვდომელია.' };

/** Likes and bookmarks only make sense on a post readers can see. */
async function publishedPost(postId: string) {
  if (!isUuid(postId)) return null;
  const [post] = await db
    .select({ id: posts.id, slug: posts.slug, authorId: posts.authorId })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.status, 'published')))
    .limit(1);
  return post ?? null;
}

export async function toggleLikeAction(postId: string): Promise<Toggle> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;
  const post = await publishedPost(postId);
  if (!post) return UNAVAILABLE;

  // Delete first: if a row went away this was an unlike, otherwise insert. Two
  // statements with no read in between, so a double click cannot desync them.
  const removed = await db
    .delete(likes)
    .where(and(eq(likes.postId, postId), eq(likes.userId, user.id)))
    .returning({ postId: likes.postId });

  const active = removed.length === 0;
  if (active) {
    await db.insert(likes).values({ postId, userId: user.id }).onConflictDoNothing();
    // Liking is one of the strongest interest signals we get.
    await recordPostSignal(user.id, postId, 'like');
    await notify(post.authorId, user.id, 'post_like', { postId });
  } else {
    await withdraw(post.authorId, user.id, 'post_like', { postId });
  }

  const [fresh] = await db.select({ count: posts.likeCount }).from(posts).where(eq(posts.id, postId)).limit(1);

  revalidatePath(`/p/${post.slug}`);
  return { ok: true, active, count: fresh?.count ?? 0 };
}

export async function toggleBookmarkAction(postId: string): Promise<Toggle> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;
  const post = await publishedPost(postId);
  if (!post) return UNAVAILABLE;

  const removed = await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.postId, postId), eq(bookmarks.userId, user.id)))
    .returning({ postId: bookmarks.postId });

  const active = removed.length === 0;
  if (active) {
    await db.insert(bookmarks).values({ postId, userId: user.id }).onConflictDoNothing();
    await recordPostSignal(user.id, postId, 'bookmark');
  }

  revalidatePath('/bookmarks');
  return { ok: true, active };
}

export async function toggleFollowAction(authorId: string): Promise<Toggle> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;
  if (!isUuid(authorId)) return { ok: false, active: false, error: 'ავტორი ვერ მოიძებნა.' };
  if (user.id === authorId) return { ok: false, active: false, error: 'საკუთარი თავის გამოწერა არ შეიძლება.' };

  const [author] = await db.select({ username: users.username }).from(users).where(eq(users.id, authorId)).limit(1);
  if (!author) return { ok: false, active: false, error: 'ავტორი ვერ მოიძებნა.' };

  const removed = await db
    .delete(follows)
    .where(and(eq(follows.followerId, user.id), eq(follows.followingId, authorId)))
    .returning({ followerId: follows.followerId });

  const active = removed.length === 0;
  if (active) {
    await db.insert(follows).values({ followerId: user.id, followingId: authorId }).onConflictDoNothing();
    await recordFollowSignal(user.id, authorId);
    await notify(authorId, user.id, 'follow');
  } else {
    await withdraw(authorId, user.id, 'follow');
  }

  revalidatePath(`/u/${author.username}`);

  const [{ count }] = await db.execute<{ count: number }>(
    sql`select count(*)::int as count from follows where following_id = ${authorId}::uuid`,
  );

  return { ok: true, active, count };
}

/**
 * Following a topic is the same as picking it in settings: a strong, explicit
 * interest. Unfollowing forgets it outright.
 */
export async function toggleTopicAction(topicId: string): Promise<Toggle> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;
  if (!isUuid(topicId)) return { ok: false, active: false, error: 'თემა ვერ მოიძებნა.' };

  const [topic] = await db.select({ slug: topics.slug }).from(topics).where(eq(topics.id, topicId)).limit(1);
  if (!topic) return { ok: false, active: false, error: 'თემა ვერ მოიძებნა.' };

  const following = await isFollowingTopic(user.id, topicId);
  if (following) await forgetTopics(user.id, [topicId]);
  else await recordTopicSignal(user.id, [topicId], SIGNAL.chosen);

  revalidatePath(`/topic/${topic.slug}`);
  revalidatePath('/settings');
  return { ok: true, active: !following };
}

export async function addCommentAction(
  postId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'კომენტარისთვის საჭიროა შესვლა.' };

  const post = await publishedPost(postId);
  if (!post) return { ok: false, error: 'ეს სტატია მიუწვდომელია.' };

  const parsed = commentSchema.safeParse({
    body: formData.get('body'),
    parentId: formData.get('parentId') || null,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'ეს კომენტარი არასწორია.' };
  }

  if (!(await rateLimit(`comment:${user.id}`, 8, 60))) return { ok: false, error: TOO_MANY };

  // Replies nest under the comment actually answered, at any depth. The parent
  // must belong to this post, or a crafted id could graft threads across posts.
  let parentId: string | null = null;
  let parentAuthorId: string | null = null;
  if (parsed.data.parentId) {
    const [parent] = await db
      .select({ id: comments.id, authorId: comments.authorId, deletedAt: comments.deletedAt })
      .from(comments)
      .where(and(eq(comments.id, parsed.data.parentId), eq(comments.postId, postId)))
      .limit(1);
    if (!parent || parent.deletedAt) return { ok: false, error: 'კომენტარი, რომელსაც პასუხობ, წაშლილია.' };
    parentId = parent.id;
    parentAuthorId = parent.authorId;
  }

  const [created] = await db
    .insert(comments)
    .values({ postId, authorId: user.id, parentId, body: parsed.data.body })
    .returning({ id: comments.id });

  await recordPostSignal(user.id, postId, 'comment');
  await notifyComment({
    actorId: user.id,
    postId,
    postAuthorId: post.authorId,
    commentId: created.id,
    parentAuthorId,
    body: parsed.data.body,
  });
  revalidatePath(`/p/${post.slug}`);
  return { ok: true, id: created.id };
}

/** A comment on a published post that has not been deleted, with its post's slug. */
async function liveComment(commentId: string) {
  if (!isUuid(commentId)) return null;
  const [row] = await db
    .select({
      id: comments.id,
      authorId: comments.authorId,
      body: comments.body,
      postId: comments.postId,
      slug: posts.slug,
      postAuthorId: posts.authorId,
    })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .where(and(eq(comments.id, commentId), isNull(comments.deletedAt), eq(posts.status, 'published')))
    .limit(1);
  return row ?? null;
}

export async function toggleCommentLikeAction(commentId: string): Promise<Toggle> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;
  const comment = await liveComment(commentId);
  if (!comment) return { ok: false, active: false, error: 'ეს კომენტარი წაშლილია.' };

  if (!(await rateLimit(`comment-like:${user.id}`, 60, 60))) return { ok: false, active: false, error: TOO_MANY };

  // Same delete-then-insert as post likes: no read between, so double clicks stay in step.
  const removed = await db
    .delete(commentLikes)
    .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, user.id)))
    .returning({ commentId: commentLikes.commentId });

  const active = removed.length === 0;
  const target = { postId: comment.postId, commentId };
  if (active) {
    await db.insert(commentLikes).values({ commentId, userId: user.id }).onConflictDoNothing();
    await notify(comment.authorId, user.id, 'comment_like', target);
  } else {
    await withdraw(comment.authorId, user.id, 'comment_like', target);
  }

  const [fresh] = await db
    .select({ count: comments.likeCount })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  revalidatePath(`/p/${comment.slug}`);
  return { ok: true, active, count: fresh?.count ?? 0 };
}

export async function editCommentAction(
  commentId: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'ამისთვის საჭიროა შესვლა.' };

  const comment = await liveComment(commentId);
  if (!comment) return { ok: false, error: 'ეს კომენტარი წაშლილია.' };
  if (comment.authorId !== user.id) return { ok: false, error: 'სხვის კომენტარს ვერ შეცვლი.' };

  const parsed = commentSchema.shape.body.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'ეს კომენტარი არასწორია.' };
  if (parsed.data === comment.body) return { ok: true };

  if (!(await rateLimit(`comment-edit:${user.id}`, 20, 60))) return { ok: false, error: TOO_MANY };

  await db.update(comments).set({ body: parsed.data, editedAt: new Date() }).where(eq(comments.id, commentId));
  await notifyMentions(user.id, parsed.data, { postId: comment.postId, commentId });
  revalidatePath(`/p/${comment.slug}`);
  return { ok: true };
}

/**
 * Removes a comment. One with replies becomes a "deleted" placeholder so the
 * answers under it keep their context; one without goes entirely, and so does
 * any placeholder above it that is left with nothing to hold up.
 */
export async function deleteCommentAction(commentId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'ამისთვის საჭიროა შესვლა.' };
  if (!isUuid(commentId)) return { ok: false, error: 'ეს კომენტარი უკვე წაშლილია.' };

  const [row] = await db.execute<{
    author_id: string;
    post_author_id: string;
    slug: string;
    body: string;
    parent_id: string | null;
    has_replies: boolean;
  }>(sql`
    select c.author_id, p.author_id as post_author_id, p.slug, c.body, c.parent_id,
           exists (select 1 from comments r where r.parent_id = c.id) as has_replies
    from comments c join posts p on p.id = c.post_id
    where c.id = ${commentId}::uuid and c.deleted_at is null
  `);

  if (!row) return { ok: false, error: 'ეს კომენტარი უკვე წაშლილია.' };

  // Its author, the post's author, or an admin (whose removal is logged).
  const asStaff = row.author_id !== user.id && row.post_author_id !== user.id;
  if (asStaff && !isStaff(user)) return { ok: false, error: 'ამ კომენტარის წაშლა არ შეგიძლია.' };

  if (row.has_replies) {
    await db.update(comments).set({ body: '', deletedAt: new Date() }).where(eq(comments.id, commentId));
    await db.delete(commentLikes).where(eq(commentLikes.commentId, commentId));
    // The placeholder row stays, so the cascade that clears these on a real delete does not fire.
    await db.delete(notifications).where(eq(notifications.commentId, commentId));
  } else {
    await db.delete(comments).where(eq(comments.id, commentId));
    await pruneEmptyPlaceholders(row.parent_id);
  }

  if (asStaff) {
    await logAdmin(user, 'comment.delete', { type: 'comment', id: commentId, label: row.body.slice(0, 120) }, {
      authorId: row.author_id,
    });
    await closeReports(user, 'comment', [commentId], 'resolved');
  }

  revalidatePath(`/p/${row.slug}`);
  return { ok: true };
}

/** Walks up from `parentId`, deleting deleted placeholders that no longer have replies. */
async function pruneEmptyPlaceholders(parentId: string | null) {
  let current = parentId;
  while (current) {
    const [removed] = await db.execute<{ parent_id: string | null }>(sql`
      delete from comments c
      where c.id = ${current}::uuid
        and c.deleted_at is not null
        and not exists (select 1 from comments r where r.parent_id = c.id)
      returning c.parent_id
    `);
    current = removed?.parent_id ?? null;
  }
}
