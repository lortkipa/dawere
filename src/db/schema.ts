/**
 * Drizzle mirror of `db/schema.sql`.
 *
 * The SQL file is the source of truth for DDL (it carries the generated tsvector
 * column, the trigram indexes and the counter triggers, none of which Drizzle can
 * express). This file exists so queries are type-safe. Keep the two in sync.
 */
import {
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { NOTIFICATION_TYPES, type NotificationType } from '@/lib/notification-types';

export { NOTIFICATION_TYPES, type NotificationType };

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    username: text('username').notNull().unique(),
    bio: text('bio').notNull().default(''),
    avatarUrl: text('avatar_url'),
    location: text('location').notNull().default(''),
    website: text('website').notNull().default(''),
    /** Onboarding answers. '' throughout means skipped or not asked yet. */
    discoverySource: text('discovery_source').notNull().default(''),
    discoveryNote: text('discovery_note').notNull().default(''),
    role: text('role', { enum: ['', 'reader', 'writer', 'both'] })
      .notNull()
      .default(''),
    /** Staff access; see db/schema.sql. Nothing to do with `role` above. */
    access: text('access', { enum: ['user', 'admin', 'super_admin'] })
      .notNull()
      .default('user'),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspendedReason: text('suspended_reason').notNull().default(''),
    /** Notification types switched off in settings. */
    mutedNotifications: text('muted_notifications').array().$type<NotificationType[]>().notNull().default([]),
    onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('users_name_trgm_idx').on(t.name)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userAgent: text('user_agent').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    isFeatured: boolean('is_featured').notNull().default(false),
    postCount: integer('post_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('topics_featured_idx').on(t.isFeatured, t.postCount)],
);

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull().default(''),
    subtitle: text('subtitle').notNull().default(''),
    contentHtml: text('content_html').notNull().default(''),
    contentText: text('content_text').notNull().default(''),
    coverImageUrl: text('cover_image_url'),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    readingMinutes: integer('reading_minutes').notNull().default(1),
    viewCount: integer('view_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** Unpublished edits to a live post; applied when the author presses "update". */
    pendingRevision: jsonb('pending_revision').$type<PostRevision>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('posts_author_idx').on(t.authorId, t.status, t.updatedAt),
    check('posts_status_check', sql`${t.status} in ('draft', 'published')`),
  ],
);

export const postTopics = pgTable(
  'post_topics',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.topicId] }), index('post_topics_topic_idx').on(t.topicId)],
);

export const postViews = pgTable(
  'post_views',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    viewerKey: text('viewer_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    viewDay: date('view_day'),
  },
  (t) => [index('post_views_post_idx').on(t.postId, t.createdAt)],
);

export const likes = pgTable(
  'likes',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] }), index('likes_user_idx').on(t.userId, t.createdAt)],
);

export const bookmarks = pgTable(
  'bookmarks',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] }), index('bookmarks_user_idx').on(t.userId, t.createdAt)],
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    body: text('body').notNull(),
    likeCount: integer('like_count').notNull().default(0),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    /** Set when a comment with replies is deleted: the row stays as a placeholder. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('comments_post_idx').on(t.postId, t.createdAt), index('comments_parent_idx').on(t.parentId)],
);

export const commentLikes = pgTable(
  'comment_likes',
  {
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.commentId, t.userId] }),
    index('comment_likes_user_idx').on(t.userId, t.createdAt),
  ],
);

export const follows = pgTable(
  'follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index('follows_following_idx').on(t.followingId),
  ],
);

export const topicAffinity = pgTable(
  'topic_affinity',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    score: real('score').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topicId] }), index('topic_affinity_score_idx').on(t.userId, t.score)],
);

export const authorAffinity = pgTable(
  'author_affinity',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: real('score').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.authorId] }), index('author_affinity_score_idx').on(t.userId, t.score)],
);

export const searchEvents = pgTable(
  'search_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    query: text('query').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('search_events_user_idx').on(t.userId, t.createdAt)],
);

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
  count: integer('count').notNull().default(0),
});

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  mimeType: text('mime_type').notNull(),
  byteSize: integer('byte_size').notNull(),
  storagePath: text('storage_path').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adminLog = pgTable(
  'admin_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorName: text('actor_name').notNull(),
    action: text('action').notNull(),
    targetType: text('target_type', { enum: ['user', 'post', 'comment', 'topic'] }).notNull(),
    targetId: text('target_id'),
    targetLabel: text('target_label').notNull().default(''),
    details: jsonb('details').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('admin_log_created_idx').on(t.createdAt)],
);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
    targetType: text('target_type', { enum: ['post', 'comment', 'user'] }).notNull(),
    targetId: uuid('target_id').notNull(),
    targetOwnerId: uuid('target_owner_id').references(() => users.id, { onDelete: 'set null' }),
    targetLabel: text('target_label').notNull().default(''),
    targetExcerpt: text('target_excerpt').notNull().default(''),
    reason: text('reason', {
      enum: ['spam', 'harassment', 'hate', 'violence', 'sexual', 'misinformation', 'impersonation', 'copyright', 'other'],
    }).notNull(),
    details: text('details').notNull().default(''),
    status: text('status', { enum: ['open', 'resolved', 'dismissed'] })
      .notNull()
      .default('open'),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('reports_status_idx').on(t.status, t.createdAt),
    index('reports_target_idx').on(t.targetType, t.targetId),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: NOTIFICATION_TYPES }).notNull(),
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
    commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notifications_recipient_idx').on(t.recipientId, t.createdAt)],
);

export type PostRevision = {
  title: string;
  subtitle: string;
  contentHtml: string;
  coverImageUrl: string | null;
  topics: string[];
};

export type User = typeof users.$inferSelect;
export type Access = User['access'];
export type Post = typeof posts.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type ReportTarget = Report['targetType'];
export type ReportReason = Report['reason'];
export type ReportStatus = Report['status'];
