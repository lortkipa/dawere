import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Identity is keyed on `email`, not on the OAuth provider. One person signing in
 * with Google today and Facebook tomorrow lands on the same `users` row and picks
 * up a second `accounts` row — see `allowDangerousEmailAccountLinking` in auth.ts.
 *
 * OAuth fills `name` and `image` once, when the row is created, and never touches
 * them again: from then on they are the author's to change in /settings.
 *
 * `handle` is the author's own address — `/nikoloz-e722ded8`, the public page at
 * app/[handle]. Nobody chooses it: it is the first word of `name` plus the head
 * of `id`, minted at sign-up in auth.ts and recomputed whenever the name
 * changes. Unique all the same, because two people would have to share both
 * halves to collide.
 */
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  handle: text("handle").notNull().unique(),
  bio: text("bio").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** One row per provider a user has signed in with. Shape is fixed by Auth.js. */
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type")
      .$type<"oauth" | "oidc" | "email" | "webauthn">()
      .notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

// No `sessions` or `verification_tokens` table: sessions live in a signed JWT
// cookie, so the adapter never reaches for them.

/** A draft is private; publishing is what gives an article its public URL. */
export type ArticleStatus = "draft" | "published";

/**
 * Publishing mints the `slug`, and with it the public URL at `/a/[slug]`. The
 * slug is never recomputed afterwards, so retitling a published piece does not
 * break the links people have already shared.
 *
 * `html` is the editor's output *after* server-side sanitising (lib/html.ts) —
 * the reader renders it verbatim, so nothing unsanitised may ever land here.
 * `excerpt` and `words` are derived from it on save so that listing pages and
 * the author's stats row never have to re-parse the body.
 */
export const articles = pgTable(
  "articles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").unique(),
    html: text("html").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    words: integer("words").notNull().default(0),
    views: integer("views").notNull().default(0),
    status: text("status").$type<ArticleStatus>().notNull().default("draft"),
    publishedAt: timestamp("published_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  // The author page's only query: this author's articles, newest first.
  (article) => [
    index("articles_author_updated_idx").on(article.authorId, article.updatedAt),
  ],
);

/**
 * One row per "A reads B". The pair is the key, so following twice is the same
 * row rather than a second one, and unfollowing is a delete of a row addressed
 * by exactly what the button knows.
 *
 * Both sides cascade off `users`: a deleted account leaves nobody following a
 * page that no longer exists, and disappears from everyone else's feed with the
 * articles it took with it.
 *
 * The primary key already answers "who does A follow", which is the feed's
 * question and the button's. `follows_following_idx` answers the other
 * direction — "how many follow B" — which the author's page asks.
 */
export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (follow) => [
    primaryKey({ columns: [follow.followerId, follow.followingId] }),
    index("follows_following_idx").on(follow.followingId),
    // The action refuses it too; this is the guarantee rather than the check —
    // a self-follow would put an author's own articles in their own feed.
    check(
      "follows_not_self",
      sql`${follow.followerId} <> ${follow.followingId}`,
    ),
  ],
);

/**
 * One row per "this reader liked this article". Like a follow, the pair is the
 * key: liking twice is the same row rather than a second one, and unliking is a
 * delete of a row addressed by exactly what the button already knows.
 *
 * The key is also both questions the article page asks — how many liked it, and
 * whether this reader is one of them — because the first is a prefix of it and
 * the second is a point lookup on the whole of it.
 *
 * There is no `likes_not_self` to match `follows_not_self`: whose article this
 * is lives in another table, so the action is the only place that can refuse it.
 */
export const likes = pgTable(
  "likes",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (like) => [primaryKey({ columns: [like.articleId, like.userId] })],
);

/**
 * A comment is plain text, never HTML: unlike an article it is rendered as the
 * characters it holds, so there is nothing here for `lib/html.ts` to clean and
 * nothing a crafted body could reach.
 *
 * `parentId` is what makes a reply a reply, and it may point at any comment on
 * the same article — a reply to a reply to a reply is a chain of them, as deep
 * as the conversation goes. What bounds the thread is the page, not the column:
 * the indent stops after a few levels and the rest of the chain hangs at that
 * one, which is where `replyingTo` in lib/comments.ts starts saying who is
 * being answered.
 *
 * It cascades onto itself: deleting a comment takes the replies to it, and
 * theirs, all the way down — a reply to something nobody can read is not worth
 * keeping.
 */
export const comments = pgTable(
  "comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): AnyPgColumn => comments.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  // The article page's only question: everything said under this article, in
  // the order it was said. However deep the chains run they come back in that
  // one scan, because a reply is written after the comment it answers — so the
  // tree is built from rows already in hand, in lib/comments.ts.
  (comment) => [
    index("comments_article_created_idx").on(
      comment.articleId,
      comment.createdAt,
    ),
  ],
);

/**
 * One row per "this reader liked this comment" — `likes` for the conversation
 * rather than the piece, and the same shape: the pair is the key, so liking
 * twice is the same row and unliking is a delete of a row addressed by exactly
 * what the button already knows.
 *
 * A separate table rather than a nullable `comment_id` on `likes`, because they
 * are two different things being liked and a key over both would have to say
 * "exactly one of these is null" to stay honest about it.
 *
 * The key answers the count and the reader's own state together; the page asks
 * them of every comment at once, grouped by `comment_id` — see lib/comments.ts.
 */
export const commentLikes = pgTable(
  "comment_likes",
  {
    commentId: text("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (like) => [primaryKey({ columns: [like.commentId, like.userId] })],
);

export const usersRelations = relations(users, ({ many }) => ({
  articles: many(articles),
  likes: many(likes),
  commentLikes: many(commentLikes),
  comments: many(comments),
  // Two relations over one table, so each names the side it stands on: a row is
  // this user's `following` when they are the follower, and one of their
  // `followers` when they are the followed.
  following: many(follows, { relationName: "follower" }),
  followers: many(follows, { relationName: "following" }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
  likes: many(likes),
  comments: many(comments),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  article: one(articles, {
    fields: [likes.articleId],
    references: [articles.id],
  }),
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  article: one(articles, {
    fields: [comments.articleId],
    references: [articles.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  likes: many(commentLikes),
}));

export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
  comment: one(comments, {
    fields: [commentLikes.commentId],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [commentLikes.userId],
    references: [users.id],
  }),
}));

export type Article = typeof articles.$inferSelect;
