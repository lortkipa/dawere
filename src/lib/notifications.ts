import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type { NotificationType } from '@/db/schema';
import { extractMentions } from '@/lib/mentions';
import type { NotificationView } from '@/lib/notification-copy';
import { excerpt } from '@/lib/utils';

type Target = { postId?: string | null; commentId?: string | null };

/**
 * Tells `recipientId` that `actorId` did something. Nothing happens when they
 * are the same person, when the recipient muted this type, or when an equal
 * notification already exists (the partial unique indexes in db/schema.sql).
 */
export async function notify(recipientId: string, actorId: string, type: NotificationType, target: Target = {}) {
  if (recipientId === actorId) return;
  await db.execute(sql`
    insert into notifications (recipient_id, actor_id, type, post_id, comment_id)
    select u.id, ${actorId}::uuid, ${type}, ${target.postId ?? null}::uuid, ${target.commentId ?? null}::uuid
    from users u
    where u.id = ${recipientId}::uuid and not (${type} = any(u.muted_notifications))
    on conflict do nothing
  `);
}

/** Takes back a like or follow notification when the like or follow is withdrawn. */
export async function withdraw(recipientId: string, actorId: string, type: NotificationType, target: Target = {}) {
  await db.execute(sql`
    delete from notifications
    where recipient_id = ${recipientId}::uuid
      and actor_id = ${actorId}::uuid
      and type = ${type}
      and post_id is not distinct from ${target.postId ?? null}::uuid
      and comment_id is not distinct from ${target.commentId ?? null}::uuid
  `);
}

/** A first publish reaches everyone who follows the author. */
export async function notifyFollowersOfPost(authorId: string, postId: string) {
  await db.execute(sql`
    insert into notifications (recipient_id, actor_id, type, post_id)
    select f.follower_id, ${authorId}::uuid, 'new_post', ${postId}::uuid
    from follows f
    join users u on u.id = f.follower_id
    where f.following_id = ${authorId}::uuid
      and u.suspended_at is null
      and not ('new_post' = any(u.muted_notifications))
    on conflict do nothing
  `);
}

/**
 * A new comment tells, in this order, the author of the comment it answers,
 * the post's author, and anyone it @mentions. Each reader hears about one
 * comment once, under the first of those that applies to them.
 */
export async function notifyComment(input: {
  actorId: string;
  postId: string;
  postAuthorId: string;
  commentId: string;
  parentAuthorId: string | null;
  body: string;
}) {
  const target = { postId: input.postId, commentId: input.commentId };
  if (input.parentAuthorId) await notify(input.parentAuthorId, input.actorId, 'comment_reply', target);
  await notify(input.postAuthorId, input.actorId, 'post_comment', target);
  await notifyMentions(input.actorId, input.body, target);
}

/** Also run after an edit: a name added later still reaches its reader, once. */
export async function notifyMentions(actorId: string, body: string, target: Required<Target>) {
  const usernames = extractMentions(body);
  if (usernames.length === 0) return;
  await db.execute(sql`
    insert into notifications (recipient_id, actor_id, type, post_id, comment_id)
    select u.id, ${actorId}::uuid, 'mention', ${target.postId}::uuid, ${target.commentId}::uuid
    from users u
    where u.username = any(${sql.param(usernames)}::text[])
      and u.id <> ${actorId}::uuid
      and u.suspended_at is null
      and not ('mention' = any(u.muted_notifications))
    on conflict do nothing
  `);
}

/* ------------------------------------------------------------------ reading */

/**
 * The rows a reader can actually open: the actor's account is active, the post
 * is still published, the comment has not been deleted. Everything that counts
 * or lists notifications goes through this, so the badge never promises
 * something the list cannot show.
 */
function visible(userId: string) {
  return sql`
    from notifications n
    join users a on a.id = n.actor_id and a.suspended_at is null
    left join posts p on p.id = n.post_id
    left join comments c on c.id = n.comment_id
    where n.recipient_id = ${userId}::uuid
      and (n.post_id is null or p.status = 'published')
      and (n.comment_id is null or c.deleted_at is null)
  `;
}

export async function unreadCount(userId: string): Promise<number> {
  const [row] = await db.execute<{ count: number }>(
    sql`select count(*)::int as count ${visible(userId)} and n.read_at is null`,
  );
  return row?.count ?? 0;
}

type Row = {
  id: string;
  type: NotificationType;
  read_at: string | null;
  created_at: string;
  actor_name: string;
  actor_username: string;
  actor_avatar_url: string | null;
  post_title: string | null;
  post_slug: string | null;
  comment_id: string | null;
  comment_body: string | null;
};

function toView(row: Row): NotificationView {
  const post = row.post_slug ? { title: row.post_title || 'უსათაურო', slug: row.post_slug } : null;
  const comment = row.comment_id ? { id: row.comment_id, excerpt: excerpt(row.comment_body ?? '', 160) } : null;
  let href = `/u/${row.actor_username}`;
  if (post) href = comment ? `/p/${post.slug}#comment-${comment.id}` : `/p/${post.slug}`;

  return {
    id: row.id,
    type: row.type,
    read: row.read_at !== null,
    createdAt: new Date(row.created_at).toISOString(),
    actor: { name: row.actor_name, username: row.actor_username, avatarUrl: row.actor_avatar_url },
    post,
    comment,
    href,
  };
}

/** Read notifications older than this are cleared the next time the list loads. */
const KEEP_READ_DAYS = 90;

export async function listNotifications(
  userId: string,
  { unreadOnly = false, limit = 20, offset = 0 }: { unreadOnly?: boolean; limit?: number; offset?: number } = {},
): Promise<{ items: NotificationView[]; hasMore: boolean }> {
  const rows = await db.execute<Row>(sql`
    select n.id, n.type, n.read_at, n.created_at,
           a.name as actor_name, a.username as actor_username, a.avatar_url as actor_avatar_url,
           p.title as post_title, p.slug as post_slug,
           c.id as comment_id, c.body as comment_body
    ${visible(userId)}
    ${unreadOnly ? sql`and n.read_at is null` : sql``}
    order by n.created_at desc, n.id
    limit ${limit + 1} offset ${offset}
  `);

  return { items: [...rows].slice(0, limit).map(toView), hasMore: rows.length > limit };
}

export async function pruneOldNotifications(userId: string) {
  await db.execute(sql`
    delete from notifications
    where recipient_id = ${userId}::uuid
      and read_at is not null
      and created_at < now() - make_interval(days => ${KEEP_READ_DAYS})
  `);
}

/* ------------------------------------------------------------------ writing */

/**
 * Marks the given notifications read, or with `ids` omitted every unread one
 * created up to `upTo` — the moment the reader's list was drawn, so "read all"
 * does not swallow something that arrived after they last looked.
 */
export async function markRead(userId: string, { ids, upTo }: { ids?: string[]; upTo?: Date } = {}) {
  await db.execute(sql`
    update notifications set read_at = now()
    where recipient_id = ${userId}::uuid
      and read_at is null
      ${ids ? sql`and id = any(${sql.param(ids)}::uuid[])` : sql``}
      ${upTo ? sql`and created_at <= ${upTo.toISOString()}::timestamptz` : sql``}
  `);
}

export async function markUnread(userId: string, id: string) {
  await db.execute(sql`
    update notifications set read_at = null
    where recipient_id = ${userId}::uuid and id = ${id}::uuid
  `);
}

export async function deleteNotification(userId: string, id: string) {
  await db.execute(sql`
    delete from notifications where recipient_id = ${userId}::uuid and id = ${id}::uuid
  `);
}
