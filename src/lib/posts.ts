import 'server-only';

import { cache } from 'react';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { excerpt } from './utils';

export type PostCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  preview: string;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  readingMinutes: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  bookmarked: boolean;
  author: { id: string; name: string; username: string; avatarUrl: string | null };
  topics: { slug: string; name: string }[];
};

type PostCardRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  content_text: string;
  cover_image_url: string | null;
  published_at: Date | string | null;
  reading_minutes: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  liked: boolean;
  bookmarked: boolean;
  author_id: string;
  author_name: string;
  author_username: string;
  author_avatar: string | null;
  topics: { slug: string; name: string }[] | null;
};

/** Columns every post card needs. Joined against `p` (posts) and `u` (users). */
export const POST_CARD_COLUMNS = sql`
  p.id, p.slug, p.title, p.subtitle, p.cover_image_url, p.published_at,
  p.reading_minutes, p.view_count, p.like_count, p.comment_count,
  left(p.content_text, 400) as content_text,
  u.id as author_id, u.name as author_name, u.username as author_username, u.avatar_url as author_avatar,
  coalesce(tp.list, '[]'::json) as topics,
  (ml.user_id is not null) as liked,
  (mb.user_id is not null) as bookmarked
`;

/** Joins that hydrate author, topics and the viewer's own like/bookmark state. */
export function postCardJoins(viewerId: string | null): SQL {
  return sql`
    join users u on u.id = p.author_id
    left join lateral (
      select json_agg(json_build_object('slug', t.slug, 'name', t.name) order by t.name) as list
      from post_topics pt
      join topics t on t.id = pt.topic_id
      where pt.post_id = p.id
    ) tp on true
    left join likes ml on ml.post_id = p.id and ml.user_id = ${viewerId}::uuid
    left join bookmarks mb on mb.post_id = p.id and mb.user_id = ${viewerId}::uuid
  `;
}

/** Raw `db.execute` results hand back timestamps as strings, not Dates. */
export function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export function mapPostCard(row: PostCardRow): PostCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    preview: row.subtitle?.trim() ? row.subtitle : excerpt(row.content_text ?? '', 180),
    coverImageUrl: row.cover_image_url,
    publishedAt: toDate(row.published_at),
    readingMinutes: row.reading_minutes,
    viewCount: row.view_count,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    liked: Boolean(row.liked),
    bookmarked: Boolean(row.bookmarked),
    author: {
      id: row.author_id,
      name: row.author_name,
      username: row.author_username,
      avatarUrl: row.author_avatar,
    },
    topics: row.topics ?? [],
  };
}

/** Runs a `select <POST_CARD_COLUMNS> from posts p <joins> where … order by …` query. */
export async function runPostCardQuery(query: SQL): Promise<PostCard[]> {
  const rows = await db.execute<PostCardRow>(query);
  return rows.map(mapPostCard);
}

export type PostDetail = PostCard & {
  contentHtml: string;
  status: 'draft' | 'published';
  updatedAt: Date | null;
  /** Edits the author has saved but not yet pushed live. */
  hasPendingRevision: boolean;
  author: PostCard['author'] & {
    bio: string;
    followerCount: number;
    followedByViewer: boolean;
  };
};

/**
 * One article, with everything the reading page needs. Memoised per request:
 * generateMetadata and the page both ask for it.
 */
export const getPostBySlug = cache(async (viewerId: string | null, slug: string): Promise<PostDetail | null> => {
  const rows = await db.execute<
    PostCardRow & {
      content_html: string;
      status: 'draft' | 'published';
      updated_at: Date | string | null;
      has_pending: boolean;
      author_bio: string;
      follower_count: number;
      followed_by_viewer: boolean;
    }
  >(sql`
    select ${POST_CARD_COLUMNS},
      p.content_html, p.status, p.updated_at,
      (p.pending_revision is not null) as has_pending,
      u.bio as author_bio,
      (select count(*)::int from follows f where f.following_id = u.id) as follower_count,
      exists (
        select 1 from follows f2
        where f2.following_id = u.id and f2.follower_id = ${viewerId}::uuid
      ) as followed_by_viewer
    from posts p
    ${postCardJoins(viewerId)}
    where p.slug = ${slug}
    limit 1
  `);

  const row = rows[0];
  if (!row) return null;

  const card = mapPostCard(row);
  return {
    ...card,
    contentHtml: row.content_html,
    status: row.status,
    updatedAt: toDate(row.updated_at),
    hasPendingRevision: Boolean(row.has_pending),
    author: {
      ...card.author,
      bio: row.author_bio ?? '',
      followerCount: row.follower_count ?? 0,
      followedByViewer: Boolean(row.followed_by_viewer),
    },
  };
});

export type CommentAuthor = { id: string; name: string; username: string; avatarUrl: string | null };

export type CommentNode = {
  id: string;
  body: string;
  createdAt: Date | null;
  editedAt: Date | null;
  /** A deleted comment kept as a placeholder because it has replies. */
  deleted: boolean;
  likeCount: number;
  liked: boolean;
  author: CommentAuthor;
  /** Replies at every depth below this one. */
  replyCount: number;
  replies: CommentNode[];
};

/**
 * Every comment on a post as a tree of any depth: top-level comments newest
 * first, replies oldest first so a conversation reads down the page.
 */
export async function getComments(viewerId: string | null, postId: string): Promise<CommentNode[]> {
  const rows = await db.execute<{
    id: string;
    body: string;
    created_at: Date | string;
    edited_at: Date | string | null;
    deleted_at: Date | string | null;
    parent_id: string | null;
    like_count: number;
    liked: boolean;
    author_id: string;
    author_name: string;
    author_username: string;
    author_avatar: string | null;
  }>(sql`
    select c.id, c.body, c.created_at, c.edited_at, c.deleted_at, c.parent_id, c.like_count,
           exists (
             select 1 from comment_likes cl
             where cl.comment_id = c.id and cl.user_id = ${viewerId}::uuid
           ) as liked,
           u.id as author_id, u.name as author_name, u.username as author_username,
           u.avatar_url as author_avatar
    from comments c
    join users u on u.id = c.author_id
    where c.post_id = ${postId}::uuid
    order by c.created_at asc
  `);

  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const row of rows) {
    const deleted = row.deleted_at !== null;
    nodes.set(row.id, {
      id: row.id,
      body: deleted ? '' : row.body,
      createdAt: toDate(row.created_at),
      editedAt: row.edited_at ? toDate(row.edited_at) : null,
      deleted,
      likeCount: deleted ? 0 : row.like_count,
      liked: !deleted && Boolean(row.liked),
      author: {
        id: row.author_id,
        name: row.author_name,
        username: row.author_username,
        avatarUrl: row.author_avatar,
      },
      replyCount: 0,
      replies: [],
    });
  }

  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parent_id ? nodes.get(row.parent_id) : null;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  // Counts replies and drops placeholders with nothing left under them.
  function settle(list: CommentNode[]): CommentNode[] {
    return list.filter((node) => {
      node.replies = settle(node.replies);
      node.replyCount = node.replies.reduce((sum, reply) => sum + 1 + reply.replyCount, 0);
      return !node.deleted || node.replies.length > 0;
    });
  }

  return settle(roots).reverse();
}
