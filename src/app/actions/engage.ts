'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bookmarks, comments, follows, likes, posts, topics, users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import {
  SIGNAL,
  forgetTopics,
  isFollowingTopic,
  recordFollowSignal,
  recordPostSignal,
  recordTopicSignal,
} from '@/lib/interests';
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
    .select({ id: posts.id, slug: posts.slug })
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
): Promise<{ ok: boolean; error?: string }> {
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

  // Threads are one level deep: a reply to a reply joins its root. The parent
  // must also belong to this post, or a crafted id could graft threads across.
  let parentId: string | null = null;
  if (parsed.data.parentId) {
    const [parent] = await db
      .select({ id: comments.id, parentId: comments.parentId })
      .from(comments)
      .where(and(eq(comments.id, parsed.data.parentId), eq(comments.postId, postId)))
      .limit(1);
    if (!parent) return { ok: false, error: 'კომენტარი, რომელსაც პასუხობ, წაშლილია.' };
    parentId = parent.parentId ?? parent.id;
  }

  await db.insert(comments).values({
    postId,
    authorId: user.id,
    parentId,
    body: parsed.data.body,
  });

  await recordPostSignal(user.id, postId, 'comment');
  revalidatePath(`/p/${post.slug}`);
  return { ok: true };
}

export async function deleteCommentAction(commentId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'ამისთვის საჭიროა შესვლა.' };
  if (!isUuid(commentId)) return { ok: false, error: 'ეს კომენტარი უკვე წაშლილია.' };

  // A comment can be removed by its author, or by the author of the post.
  const [row] = await db.execute<{ author_id: string; post_author_id: string; slug: string }>(sql`
    select c.author_id, p.author_id as post_author_id, p.slug
    from comments c join posts p on p.id = c.post_id
    where c.id = ${commentId}::uuid
  `);

  if (!row) return { ok: false, error: 'ეს კომენტარი უკვე წაშლილია.' };
  if (row.author_id !== user.id && row.post_author_id !== user.id) {
    return { ok: false, error: 'ამ კომენტარის წაშლა არ შეგიძლია.' };
  }

  await db.delete(comments).where(eq(comments.id, commentId));
  revalidatePath(`/p/${row.slug}`);
  return { ok: true };
}
