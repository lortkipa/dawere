import type { Metadata } from "next";
import { currentAccount } from "@/lib/account";
import { MIN_QUERY, search } from "@/lib/search";
import { AppNav } from "@/components/nav/AppNav";
import { SiteFooter } from "@/components/landing/Footer";
import { AuthDialogProvider } from "@/components/landing/AuthDialogProvider";
import { AuthorList } from "@/components/author/AuthorList";
import { FeedList } from "@/components/feed/FeedList";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./page.module.css";

/**
 * What the field in the top bar leads to: authors and articles in one answer,
 * because a reader looking for something does not yet know which of the two it
 * is. Public, like everything it can find — a signed-out visitor searches the
 * same site and gets the same results, with the follow buttons asking them to
 * sign in first, which is why this page carries the sign-in dialog too.
 */

export const metadata: Metadata = {
  title: "ძებნა · dawere",
};

export default async function SearchPage(props: PageProps<"/search">) {
  const { q } = await props.searchParams;
  const term = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  const account = await currentAccount();

  // Nothing typed yet, or too little to narrow anything: the field is the page,
  // so the answer is a line telling them to use it rather than a list of
  // everything.
  const results =
    term.length >= MIN_QUERY ? await search(term, account?.id) : null;

  const found = (results?.authors.length ?? 0) + (results?.posts.length ?? 0);

  return (
    <AuthDialogProvider>
      <div className={styles.page}>
        <AppNav account={account} query={term} />

        <main className={styles.main}>
          <header className={styles.head}>
            <h1 className={styles.title}>ძებნა</h1>
            <p className={styles.note}>
              {results === null
                ? "აკრიფე ავტორის სახელი ან სტატიის სათაური"
                : `„${term}“ — ${found} შედეგი`}
            </p>
          </header>

          {results === null ? (
            <EmptyState
              level={2}
              heading="რას ეძებ?"
              note="ძებნა ეძებს ორივეს: ავტორებსაც და გამოქვეყნებულ სტატიებსაც."
            />
          ) : found === 0 ? (
            <EmptyState
              level={2}
              heading="ვერაფერი მოიძებნა"
              note={`„${term}“-ზე ვერც ავტორი მოიძებნა და ვერც სტატია. სცადე სხვა სიტყვა.`}
            />
          ) : (
            <div className={styles.results}>
              {results.authors.length > 0 && (
                <AuthorList
                  id="found-authors"
                  heading="ავტორები"
                  authors={results.authors}
                  signedIn={account !== null}
                />
              )}

              {results.posts.length > 0 && (
                <section aria-labelledby="found-posts">
                  <h2 id="found-posts" className={styles.section}>
                    სტატიები
                  </h2>
                  <FeedList posts={results.posts} />
                </section>
              )}
            </div>
          )}
        </main>

        <SiteFooter />
      </div>
    </AuthDialogProvider>
  );
}
