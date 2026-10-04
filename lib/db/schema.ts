import { sql } from "drizzle-orm";
import { type AnyPgColumn, check, index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { JSONContent } from "@tiptap/core";

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  // Random until users can pick their own. A volatile default also backfills existing rows.
  handle: text()
    .notNull()
    .unique()
    .default(sql`substr(md5(random()::text), 1, 10)`),
  name: text(),
  bio: text(),
  // File name under UPLOAD_DIR/avatars; a new upload always gets a new name.
  avatar: text(),
  topics: text().array(),
  referral: text(),
  // What the user typed when they picked "other" as the referral.
  referralOther: text(),
  onboardedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  // sha256 hex of the token in the cookie, so a leaked table can't sign anyone in.
  id: text().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable(
  "posts",
  {
    // 12 random hex characters, made by the publish action; the URL is /@handle/<id>.
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text().notNull(),
    // File name under UPLOAD_DIR/images.
    cover: text(),
    // The TipTap document, with image srcs already pointing at /images/….
    body: jsonb().$type<JSONContent>().notNull(),
    // Every file the post owns (cover and body), so deleting it can remove them from disk.
    images: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    // Onboarding topic slugs plus the author's own tags, normalized by lib/tags.ts.
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index().on(table.userId, table.createdAt.desc()),
    // Matches posts against a reader's topics with `&&`.
    index().using("gin", table.tags),
  ],
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    // Counts a profile's followers.
    index().on(table.followingId),
    check("follows_not_self", sql`${table.followerId} <> ${table.followingId}`),
  ],
);

export const postLikes = pgTable(
  "post_likes",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.postId] }), index().on(table.postId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid().primaryKey().defaultRandom(),
    postId: text()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    // Null once the comment is deleted but kept as a placeholder for its replies.
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    // Null for a comment on the post itself; otherwise the comment it replies to.
    parentId: uuid().references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    body: text(),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.postId, table.createdAt), index().on(table.parentId)],
);

export const commentLikes = pgTable(
  "comment_likes",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    commentId: uuid()
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.commentId] }), index().on(table.commentId)],
);

// What a reader has already come across, so the feed can lead with posts they haven't.
export const postViews = pgTable(
  "post_views",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    // The first time the post's card was on screen in the feed.
    seenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // The last time the reader opened the post itself.
    openedAt: timestamp({ withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.postId] })],
);

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
