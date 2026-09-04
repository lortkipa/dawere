import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { currentAccount } from "@/lib/account";
import { articleComments } from "@/lib/comments";
import { formatDate } from "@/lib/date";
import { hasLiked, likeCount } from "@/lib/likes";
import { siteOrigin } from "@/lib/url";
import { AppNav } from "@/components/nav/AppNav";
import { AuthorBar } from "@/components/article/AuthorBar";
import { LikeButton } from "@/components/article/LikeButton";
import { ViewPing } from "@/components/article/ViewPing";
import { CommentSection } from "@/components/comments/CommentSection";
import { AuthDialogProvider } from "@/components/landing/AuthDialogProvider";
import { SiteFooter } from "@/components/landing/Footer";
import { Avatar } from "@/components/ui/Avatar";
import prose from "@/components/article/Prose.module.css";
import styles from "./page.module.css";

/** Both generateMetadata and the page need the row; cache makes that one query. */
const findArticle = cache((slug: string) =>
  db.query.articles.findFirst({
    where: eq(articles.slug, slug),
    with: { author: { columns: { name: true, image: true, handle: true } } },
  }),
);

export async function generateMetadata(
  props: PageProps<"/a/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const article = await findArticle(slug);

  if (!article) return { title: "სტატია ვერ მოიძებნა · dawere" };

  return {
    title: `${article.title} · dawere`,
    description: article.excerpt,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt?.toISOString(),
      authors: article.author?.name ? [article.author.name] : undefined,
    },
  };
}

export default async function ArticlePage(props: PageProps<"/a/[slug]">) {
  const { slug } = await props.params;
  const article = await findArticle(slug);

  if (!article) notFound();

  const viewer = await currentAccount();
  const isAuthor = viewer?.id === article.authorId;

  // Only publishing mints a slug, so a draft has no address to reach in the
  // first place. This is what keeps that true if unpublishing ever lands.
  if (article.status !== "published" && !isAuthor) notFound();

  const published = article.publishedAt ?? article.createdAt;
  const authorName = article.author?.name?.trim() || "ავტორი";
  const url = isAuthor ? `${await siteOrigin()}/a/${slug}` : null;

  // What readers have done with the piece. A draft has had none of them, so
  // these three answer empty for one — it is the controls that are withheld
  // below, not the numbers: nobody is standing under a draft to like it.
  const [likes, liked, conversation] = await Promise.all([
    likeCount(article.id),
    hasLiked(viewer?.id, article.id),
    articleComments(article.id, viewer?.id),
  ]);

  const isPublished = article.status === "published";

  return (
    // Liking and commenting are what a signed-out reader reaches for here, so
    // the dialog that signs them in has to be on this page too.
    <AuthDialogProvider>
      <div className={styles.page}>
        <AppNav account={viewer} />

        <main className={styles.main}>
          {url && (
            <AuthorBar
              id={article.id}
              title={article.title}
              url={url}
              views={article.views}
              likes={likes}
              publishedAt={formatDate(published)}
            />
          )}

          <article>
            {/* Who wrote it comes before what it is called: the name and the
                date are how a reader decides whether the title is worth
                reading. */}
            <header className={styles.header}>
              <div className={styles.byline}>
                <Avatar
                  name={article.author?.name ?? ""}
                  image={article.author?.image ?? null}
                  size={40}
                  className={styles.bylineAvatar}
                />
                {/* Name and date share one text column so that, when the row
                    runs out of width, the date wraps under the name instead of
                    under the avatar. */}
                <div className={styles.bylineText}>
                  {/* The byline is the way to the rest of what this person
                      wrote; an article with no author row left is only a
                      name. */}
                  {article.author ? (
                    <Link
                      href={`/${article.author.handle}`}
                      className={styles.author}
                    >
                      {authorName}
                    </Link>
                  ) : (
                    <span className={styles.author}>{authorName}</span>
                  )}
                  <span className={styles.meta}>
                    <time dateTime={published.toISOString()}>
                      {formatDate(published)}
                    </time>
                  </span>
                </div>
              </div>

              <h1 className={styles.title}>{article.title}</h1>
            </header>

            {/* Safe because nothing reaches articles.html without going through
                cleanArticleHtml on the way in — see lib/html.ts. */}
            <div
              className={prose.prose}
              dangerouslySetInnerHTML={{ __html: article.html }}
            />
          </article>

          {/* A draft is nobody's to answer yet: it has no address, so there is
              no reader under it to have liked it or said anything about it. */}
          {isPublished && (
            <>
              {/* The author is not offered the button — their own count is in
                  the panel above the piece, beside the views. */}
              {!isAuthor && (
                <div className={styles.reactions}>
                  <LikeButton
                    articleId={article.id}
                    liked={liked}
                    likes={likes}
                    signedIn={viewer !== null}
                  />
                </div>
              )}

              <CommentSection
                articleId={article.id}
                threads={conversation.threads}
                total={conversation.total}
                viewerId={viewer?.id ?? null}
                articleAuthorId={article.authorId}
              />
            </>
          )}
        </main>

        {!isAuthor && <ViewPing articleId={article.id} />}

        <SiteFooter />
      </div>
    </AuthDialogProvider>
  );
}
