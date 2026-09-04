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

/**
 * Five things worth telling somebody about. Four are what another person did to
 * something of theirs — liked the article, liked a comment on it, opened a
 * thread under it, answered something they said — and the fifth is the one that
 * was not done to them at all: an author they follow published.
 *
 * A follow is still not among them: that is the follower's business, and their
 * name is already on the page they followed. Nor is a view, which is a number
 * rather than an event and has nobody's name on it to tell.
 */
export type NotificationKind =
  | "article_like"
  | "comment_like"
  | "comment"
  | "reply"
  | "published";

/**
 * One row per piece of news, and one table for all five kinds, because they are
 * one list to whoever reads them: an inbox is not five inboxes.
 *
 * `user_id` is who is being told and `actor_id` is who gave them something to
 * be told about — the same two sides `follows` has, and the same constraint
 * across them, because news of your own doing is not news. A publish is the one
 * kind that is told to more than one person, and it is this same row once per
 * follower rather than a shape of its own.
 *
 * `article_id` is on every row, not only the ones about an article: all five
 * happen to one, and it is the address the notification leads to. The comment,
 * when there is one, is the anchor inside that page.
 *
 * Nothing here is written twice and nothing is stale, because every row hangs
 * off the thing it reports: a deleted comment takes the news of it with it, a
 * deleted article takes the whole conversation's and the news of its own
 * publishing, and a deleted account takes both what it was told and what it
 * did. What has no cascade to hang off is the like taken back — no row is
 * deleted there that this one references — so `setLiked` withdraws it by hand.
 * `notifications_actor_idx` is how it finds it. An unfollow withdraws nothing,
 * because the article was still published and they were still there for it.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** Who is being told. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Who did the thing. */
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<NotificationKind>().notNull(),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    /**
     * The comment liked, written or answered. Null where the news is about the
     * article itself: a like of it, or its publication.
     */
    commentId: text("comment_id").references((): AnyPgColumn => comments.id, {
      onDelete: "cascade",
    }),
    /**
     * When the reader got to this piece of news — by opening it, or by clearing
     * the list it was in, which stamps everything still unread at once. Null
     * until then, which is what the tint and the badge are counting. A
     * timestamp rather than a flag because it costs the same and says when.
     */
    readAt: timestamp("read_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (notification) => [
    // The page's only question: this reader's news, newest first. The badge in
    // the bar asks the same rows how many are unread, off the same prefix.
    index("notifications_user_created_idx").on(
      notification.userId,
      notification.createdAt,
    ),
    // The other direction — what one person did — which is how a like taken
    // back finds the row it wrote.
    index("notifications_actor_idx").on(
      notification.actorId,
      notification.kind,
      notification.articleId,
    ),
    // `notify` refuses it too; this is the guarantee rather than the check.
    check(
      "notifications_not_self",
      sql`${notification.userId} <> ${notification.actorId}`,
    ),
  ],
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
  // And two over the notifications table for the same reason: a row is this
  // user's `news` when they are the one being told, and one of their `doings`
  // when they are the one who gave somebody else something to read.
  news: many(notifications, { relationName: "recipient" }),
  doings: many(notifications, { relationName: "actor" }),
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

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "recipient",
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: "actor",
  }),
  article: one(articles, {
    fields: [notifications.articleId],
    references: [articles.id],
  }),
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id],
  }),
}));

export type Article = typeof articles.$inferSelect;
