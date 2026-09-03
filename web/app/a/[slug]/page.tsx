import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { currentAccount } from "@/lib/account";
import { formatDate } from "@/lib/date";
import { siteOrigin } from "@/lib/url";
import { AppNav } from "@/components/nav/AppNav";
import { AuthorBar } from "@/components/article/AuthorBar";
import { ViewPing } from "@/components/article/ViewPing";
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

  return (
    <div className={styles.page}>
      <AppNav account={viewer} />

      <main className={styles.main}>
        {url && (
          <AuthorBar
            id={article.id}
            title={article.title}
            url={url}
            views={article.views}
            publishedAt={formatDate(published)}
          />
        )}

        <article>
          {/* Who wrote it comes before what it is called: the name and the date
              are how a reader decides whether the title is worth reading. */}
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
                {/* The byline is the way to the rest of what this person wrote;
                    an article with no author row left is only a name. */}
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
      </main>

      {!isAuthor && <ViewPing articleId={article.id} />}

      <SiteFooter />
    </div>
  );
}
