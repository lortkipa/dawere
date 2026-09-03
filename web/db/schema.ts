import { relations, sql } from "drizzle-orm";
import {
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

export const usersRelations = relations(users, ({ many }) => ({
  articles: many(articles),
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

export const articlesRelations = relations(articles, ({ one }) => ({
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
}));

export type Article = typeof articles.$inferSelect;
