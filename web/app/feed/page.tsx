import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, follows, users } from "@/db/schema";
import { currentAccount } from "@/lib/account";
import { AppNav } from "@/components/nav/AppNav";
import { SiteFooter } from "@/components/landing/Footer";
import { FeedList, type FeedPost } from "@/components/feed/FeedList";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./page.module.css";

/**
 * Where signing in lands: the newest piece from each person this reader
 * follows, newest first. It is the only page on dawere assembled from more than
 * one author, and the only one that is nobody's address — a feed is a view of a
 * reader, not a page anybody could hand out, so it is private and
 * signed-in-only.
 *
 * One article per author, not everything they have written. A feed of every
 * article would be a feed of whoever published most that week; one row each
 * makes it a list of the people instead, and their page is one click away for
 * the rest.
 */

export const metadata: Metadata = {
  title: "სიახლეები · dawere",
};

/** More followed authors than anyone has yet. Paging arrives with the reader who needs it. */
const FEED_LIMIT = 50;

export default async function FeedPage() {
  const account = await currentAccount();

  // A feed belongs to a reader, so there is nothing here to show a visitor —
  // `/` is what speaks to them.
  if (!account) redirect("/");

  /**
   * The join is the whole filter: an article is a candidate exactly when a row
   * says its author is followed by this reader. `distinct on` then keeps the
   * first row per author, which the ordering makes their latest — so the cut to
   * one each happens in the index scan rather than over rows already fetched.
   */
  const latest = db
    .selectDistinctOn([articles.authorId], {
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
      authorName: users.name,
      authorEmail: users.email,
      authorHandle: users.handle,
      authorImage: users.image,
    })
    .from(articles)
    .innerJoin(follows, eq(follows.followingId, articles.authorId))
    .innerJoin(users, eq(users.id, articles.authorId))
    .where(
      and(eq(follows.followerId, account.id), eq(articles.status, "published")),
    )
    // `distinct on` can only keep the first row of each author, so the author
    // has to lead the ordering; the page's own order is the layer above.
    .orderBy(articles.authorId, desc(articles.publishedAt))
    .as("latest");

  const [rows, [followingRow]] = await Promise.all([
    db
      .select()
      .from(latest)
      .orderBy(desc(latest.publishedAt))
      .limit(FEED_LIMIT),
    db
      .select({ total: count() })
      .from(follows)
      .where(eq(follows.followerId, account.id)),
  ]);

  // Two different empties, and the count is what tells them apart: nobody
  // followed yet, or followed authors who have not published.
  const followingCount = followingRow?.total ?? 0;

  const posts: FeedPost[] = rows
    .filter((row) => row.slug !== null)
    .map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug as string,
      excerpt: row.excerpt,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      author: {
        // Same fallback as everywhere else the platform names somebody.
        name: row.authorName?.trim() || row.authorEmail,
        handle: row.authorHandle,
        image: row.authorImage,
      },
    }));

  return (
    <div className={styles.page}>
      <AppNav account={account} />

      <main className={styles.main}>
        <header className={styles.head}>
          <h1 className={styles.title}>სიახლეები</h1>
          <p className={styles.note}>
            {followingCount > 0
              ? `${followingCount} გამოწერილი ავტორი · თითოეულის უახლესი სტატია`
              : "ავტორები, რომლებსაც გამოიწერ, აქ გამოჩნდებიან"}
          </p>
        </header>

        {posts.length === 0 ? (
          <EmptyState
            level={2}
            heading="შენი ფიდი ჯერ ცარიელია"
            note={
              followingCount === 0
                ? "იპოვე ავტორები ძებნით და გამოიწერე — მათი უახლესი სტატიები აქ გამოჩნდება."
                : "გამოწერილ ავტორებს ჯერ არაფერი გამოუქვეყნებიათ."
            }
            // Nobody followed yet: searching is the way out of that, so the
            // field itself is here to type into. When they have followed
            // somebody and that person simply has not written, there is
            // nothing to do but wait — so nothing is offered.
            search={followingCount === 0}
          />
        ) : (
          <FeedList posts={posts} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
