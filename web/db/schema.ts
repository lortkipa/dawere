import { relations } from "drizzle-orm";
import {
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
 * Name and image are written once, when the row is created, and never touched
 * again on later sign-ins.
 */
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
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
  // The dashboard's only query: this author's articles, newest edit first.
  (article) => [
    index("articles_author_updated_idx").on(article.authorId, article.updatedAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
}));

export type Article = typeof articles.$inferSelect;
