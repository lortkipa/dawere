import { sql } from "drizzle-orm";
import { type AnyPgColumn, boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { JSONContent } from "@tiptap/core";
import type { Theme } from "../theme-options";

export const roles = ["user", "admin", "superadmin"] as const;
export type Role = (typeof roles)[number];

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
  // When the reader last picked topics by hand; automatic removals wait a while after that.
  topicsEditedAt: timestamp({ withTimezone: true }),
  // When lib/interests.ts last changed the topics, so it changes them at most once a day.
  topicsTunedAt: timestamp({ withTimezone: true }),
  // Topics the reader removed by hand, which are never added back automatically.
  dismissedTopics: text()
    .array()
    .notNull()
    .default(sql`'{}'`),
  referral: text(),
  // What the user typed when they picked "other" as the referral.
  referralOther: text(),
  // Whether other people can open the favorites tab on this user's profile.
  favoritesPublic: boolean().notNull().default(true),
  // "system" follows the device's own light or dark setting.
  theme: text().$type<Theme>().notNull().default("system"),
  onboardedAt: timestamp({ withTimezone: true }),
  // Who can open /admin; see lib/admin.ts. Only signing in with SUPERADMIN_EMAIL makes a superadmin.
  role: text().$type<Role>().notNull().default("user"),
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

// Posts a reader keeps in the favorites tab of their profile.
export const postFavorites = pgTable(
  "post_favorites",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.postId] }), index().on(table.userId, table.createdAt.desc())],
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

// The topics readers pick in onboarding and settings and authors tag posts with. Posts and
// readers store the slug, so it never changes; admins edit the rest on /admin/categories.
export const categories = pgTable("categories", {
  slug: text().primaryKey(),
  label: text().notNull(),
  emoji: text().notNull(),
  // Order in pickers, lowest first.
  position: integer().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// A reader's conversation with the reading chat about one post. Kept so admins can read them on
// /admin/chats.
export const aiChats = pgTable(
  "ai_chats",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: text()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.userId, table.createdAt.desc()), index().on(table.postId, table.createdAt.desc())],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    chatId: uuid()
      .notNull()
      .references(() => aiChats.id, { onDelete: "cascade" }),
    role: text().$type<"user" | "ai">().notNull(),
    // For an answer that failed or was stopped: whatever arrived before that, possibly nothing.
    text: text().notNull(),
    failed: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.chatId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
