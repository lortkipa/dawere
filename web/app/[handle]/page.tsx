import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, users } from "@/db/schema";
import { currentAccount } from "@/lib/account";
import { followerCount, isFollowing } from "@/lib/follows";
import { AppNav } from "@/components/nav/AppNav";
import { SiteFooter } from "@/components/landing/Footer";
import { PostList, type Post } from "@/components/author/PostList";
import { AuthDialogProvider } from "@/components/landing/AuthDialogProvider";
import { FollowButton } from "@/components/follow/FollowButton";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import styles from "./page.module.css";

/**
 * An author's own page, at the first segment of the site — `/nikoloz-9f2c40a1`.
 * The only list of an author's writing there is, and a strictly public one:
 * everything here is what a reader sees, so drafts are absent even for the
 * person who wrote them.
 */

/** generateMetadata and the page both need the row; cache makes that one query. */
const findAuthor = cache((handle: string) =>
  db.query.users.findFirst({
    columns: {
      id: true,
      name: true,
      image: true,
      bio: true,
      handle: true,
    },
    where: eq(users.handle, handle),
  }),
);

export async function generateMetadata(
  props: PageProps<"/[handle]">,
): Promise<Metadata> {
  const { handle } = await props.params;
  const author = await findAuthor(handle);

  if (!author) return { title: "გვერდი ვერ მოიძებნა · dawere" };

  const name = author.name?.trim() || "ავტორი";

  return {
    title: `${name} · dawere`,
    description: author.bio || `${name} dawere-ზე`,
  };
}

export default async function AuthorPage(props: PageProps<"/[handle]">) {
  const { handle } = await props.params;
  const author = await findAuthor(handle);

  // This route is the last one the router tries, so an unknown address of any
  // shape — a typo, a deleted account, a handle since changed — ends here.
  if (!author) notFound();

  const [viewer, rows] = await Promise.all([
    currentAccount(),
    db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(
        and(
          eq(articles.authorId, author.id),
          eq(articles.status, "published"),
        ),
      )
      .orderBy(desc(articles.publishedAt)),
  ]);

  // Second pass rather than a third branch of the one above: whether the viewer
  // already follows this author is only answerable once we know who they are.
  const [followers, following] = await Promise.all([
    followerCount(author.id),
    isFollowing(viewer?.id, author.id),
  ]);

  // Publishing is what mints a slug, so a published row always has one; this
  // narrows the column's type rather than dropping anything.
  const posts = rows.filter((row): row is Post => row.slug !== null);

  const isMe = viewer?.id === author.id;
  const name = author.name?.trim() || "ავტორი";

  return (
    // The follow button is the one control here a signed-out visitor can reach
    // for, so the dialog that signs them in has to be on this page too.
    <AuthDialogProvider>
      <div className={styles.page}>
        <AppNav account={viewer} />

        <main className={styles.main}>
          <header className={styles.head}>
            <div className={styles.identity}>
              <Avatar
                name={name}
                image={author.image}
                size={88}
                className={styles.avatar}
              />

              <div className={styles.who}>
                <h1 className={styles.name}>{name}</h1>
                <p className={styles.meta}>
                  {posts.length} სტატია · {followers} გამომწერი
                </p>
              </div>
            </div>

            {author.bio && <p className={styles.bio}>{author.bio}</p>}

            <div className={styles.actions}>
              {isMe ? (
                <ButtonLink
                  variant="outline"
                  href="/settings"
                  className={styles.edit}
                >
                  გვერდის რედაქტირება
                </ButtonLink>
              ) : (
                // Nobody is offered their own page: the row the table refuses is
                // the row the button never asks for.
                <FollowButton
                  authorId={author.id}
                  following={following}
                  signedIn={viewer !== null}
                />
              )}
            </div>
          </header>

          {posts.length === 0 ? (
            <EmptyState
              level={2}
              heading={
                isMe
                  ? "ჯერ არაფერი გამოგიქვეყნებია"
                  : "ამ ავტორს ჯერ არაფერი გამოუქვეყნებია"
              }
              action={isMe ? { href: "/write", label: "სტატიის დაწერა" } : undefined}
            />
          ) : (
            <PostList
              posts={posts}
              owner={isMe}
              returnTo={`/${author.handle}`}
            />
          )}
        </main>

        <SiteFooter />
      </div>
    </AuthDialogProvider>
  );
}
