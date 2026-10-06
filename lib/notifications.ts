import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";
import { decodeCursor, encodeCursor, pgTimestamp, type Page } from "./feed";
import { avatarUrl, formatRelative } from "./user-view";

export const notificationsPageSize = 20;

export type NotificationKind = "follow" | "comment" | "reply" | "post_like" | "comment_like";

export type Notification = {
  // Stable per row: a follower, a comment, or the post or comment a group of likes is on.
  id: string;
  kind: NotificationKind;
  href: string;
  // The newest person who did it.
  actor: { name: string; handle: string; avatar?: string };
  // Likes are grouped per post or comment; everything else counts 1.
  count: number;
  postTitle: string | null;
  // The comment or reply, or for comment likes the liked comment.
  excerpt: string | null;
  unread: boolean;
  time: string;
  dateTime: string;
};

const key = /^(?:(?:f|c|cl):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|pl:[0-9a-f]{12})$/;

// Actions by banned accounts don't reach anyone, as their posts and comments don't.
const active = (userId: SQL) =>
  sql`not exists (select 1 from users u join bans b on b.email = u.email where u.id = ${userId})`;

// Everything that happened to the reader, one row per notification, read straight from the
// tables that record it. An unlike, unfollow, deleted comment or ban takes its row away by itself.
//  - follow: someone followed the reader.
//  - comment: a top-level comment on the reader's post.
//  - reply: a reply to the reader's comment, on any post. Replies to other people under the
//    reader's post don't count, so the two never overlap.
//  - post_like / comment_like: likes on the reader's post or comment, grouped per target; `at` is
//    the newest like and the actor its author.
function events(userId: string) {
  return sql`(
    select 'follow' as kind, 'f:' || f.follower_id as key, f.created_at as at, f.follower_id as actor_id,
      1 as count, null::text as post_id, null::uuid as comment_id
    from follows f
    where f.following_id = ${userId} and ${active(sql`f.follower_id`)}

    union all
    select 'comment', 'c:' || c.id, c.created_at, c.user_id, 1, c.post_id, c.id
    from comments c join posts p on p.id = c.post_id
    where p.user_id = ${userId} and c.parent_id is null and c.deleted_at is null and c.user_id <> ${userId}
      and ${active(sql`c.user_id`)}

    union all
    select 'reply', 'c:' || c.id, c.created_at, c.user_id, 1, c.post_id, c.id
    from comments c join comments parent on parent.id = c.parent_id
    where parent.user_id = ${userId} and c.deleted_at is null and c.user_id <> ${userId}
      and ${active(sql`c.user_id`)}

    union all
    select 'post_like', 'pl:' || pl.post_id, max(pl.created_at), (array_agg(pl.user_id order by pl.created_at desc))[1],
      count(*)::int, pl.post_id, null::uuid
    from post_likes pl join posts p on p.id = pl.post_id
    where p.user_id = ${userId} and pl.user_id <> ${userId} and ${active(sql`pl.user_id`)}
    group by pl.post_id

    union all
    select 'comment_like', 'cl:' || cl.comment_id, max(cl.created_at), (array_agg(cl.user_id order by cl.created_at desc))[1],
      count(*)::int, c.post_id, cl.comment_id
    from comment_likes cl join comments c on c.id = cl.comment_id
    where c.user_id = ${userId} and c.deleted_at is null and cl.user_id <> ${userId} and ${active(sql`cl.user_id`)}
    group by cl.comment_id, c.post_id
  )`;
}

type Row = {
  kind: NotificationKind;
  key: string;
  // ISO, in UTC; drizzle hands raw timestamps back as Postgres prints them.
  at: string;
  // The exact timestamp, microseconds included, for the cursor and for marking as seen.
  at_text: string;
  count: number;
  post_id: string | null;
  comment_id: string | null;
  name: string | null;
  handle: string;
  avatar: string | null;
  title: string | null;
  post_handle: string | null;
  excerpt: string | null;
  unread: boolean;
};

// Newest first. The first page reads when the reader last looked; later pages carry that in the
// cursor, so a page loaded after the first one marked everything seen still shows what was new.
// `newest` is the first row's exact time, for markNotificationsSeen.
export async function getNotificationsPage(
  userId: string,
  cursor: string | null,
): Promise<Page<Notification> & { newest: string | null }> {
  const after = decodeCursor(cursor);
  if (cursor && !after) return { items: [], next: null, newest: null };
  let seen: string;
  let keyset = sql`true`;

  if (after) {
    if (![after.seen, after.at].every((value) => pgTimestamp.test(String(value))) || !key.test(String(after.key))) {
      return { items: [], next: null, newest: null };
    }
    seen = String(after.seen);
    keyset = sql`(n.at, n.key) < (${String(after.at)}::timestamptz, ${String(after.key)})`;
  } else {
    const [row] = await db.execute<{ seen: string }>(
      sql`select ${users.notificationsSeenAt}::text as seen from ${users} where ${users.id} = ${userId}`,
    );
    if (!row) return { items: [], next: null, newest: null };
    seen = row.seen;
  }

  const rows = await db.execute<Row>(sql`
    select n.kind, n.key, to_char(n.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as at, n.at::text as at_text, n.count, n.post_id, n.comment_id,
      a.name, a.handle, a.avatar, p.title, pa.handle as post_handle, left(c.body, 300) as excerpt,
      n.at > ${seen}::timestamptz as unread
    from ${events(userId)} n
    join users a on a.id = n.actor_id
    left join posts p on p.id = n.post_id
    left join users pa on pa.id = p.user_id
    left join comments c on c.id = n.comment_id
    where ${keyset}
    order by n.at desc, n.key desc
    limit ${notificationsPageSize + 1}
  `);

  const page = rows.slice(0, notificationsPageSize);
  const last = page.at(-1);
  const now = new Date();
  return {
    items: page.map((row) => toNotification(row, now)),
    next:
      rows.length > notificationsPageSize && last
        ? encodeCursor({ seen, at: last.at_text, key: last.key })
        : null,
    newest: after ? null : (page[0]?.at_text ?? null),
  };
}

function toNotification(row: Row, now: Date): Notification {
  const at = new Date(row.at);
  const post = row.post_id && row.post_handle ? `/@${row.post_handle}/${row.post_id}` : null;
  const href =
    row.kind === "follow" || !post
      ? `/@${row.handle}`
      : row.kind === "post_like"
        ? post
        : `${post}#c-${row.comment_id}`;
  return {
    id: row.key,
    kind: row.kind,
    href,
    actor: { name: row.name || `@${row.handle}`, handle: row.handle, avatar: avatarUrl(row.avatar) },
    count: row.count,
    postTitle: row.title,
    excerpt: row.excerpt,
    unread: row.unread,
    time: formatRelative(at, now),
    dateTime: at.toISOString(),
  };
}

// For the header's bell; it shows 99+ past 99.
export async function unreadNotificationCount(userId: string) {
  const [row] = await db.execute<{ count: number }>(sql`
    select count(*)::int as count from (
      select 1 from ${events(userId)} n
      where n.at > (select notifications_seen_at from users where id = ${userId})
      limit 100
    ) unread
  `);
  return row?.count ?? 0;
}

// Never moves back, should an older page of the list ask to mark something seen.
export async function markNotificationsSeen(userId: string, upTo: string) {
  if (!pgTimestamp.test(upTo)) return;
  await db.execute(sql`
    update users set notifications_seen_at = greatest(notifications_seen_at, ${upTo}::timestamptz)
    where id = ${userId}
  `);
}
