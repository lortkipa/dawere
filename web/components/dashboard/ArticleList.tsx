import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { DeleteArticleButton } from "@/components/article/DeleteArticleButton";
import { formatDate } from "@/lib/date";
import { readingMinutes } from "@/lib/html";
import styles from "./ArticleList.module.css";

type ArticleRow = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string;
  words: number;
  views: number;
  status: "draft" | "published";
  publishedAt: Date | null;
  updatedAt: Date;
};

export function ArticleList({ articles }: { articles: ArticleRow[] }) {
  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>ჩემი სტატიები</h1>

      <ul className={styles.list}>
        {articles.map((article) => (
          <li key={article.id} className={styles.item}>
            <ArticleCard article={article} />
          </li>
        ))}
      </ul>
    </main>
  );
}

function ArticleCard({ article }: { article: ArticleRow }) {
  const published = article.status === "published";
  // A draft has no public address yet, so its only heading link is the editor.
  const href = published && article.slug ? `/a/${article.slug}` : `/write/${article.id}`;

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          <Link href={href}>{article.title}</Link>
        </h2>
        {!published && <span className={styles.draft}>მონახაზი</span>}
      </div>

      {article.excerpt && <p className={styles.excerpt}>{article.excerpt}</p>}

      <div className={styles.foot}>
        <p className={styles.stats}>
          {published
            ? `${formatDate(article.publishedAt ?? article.updatedAt)} · ${article.views} ნახვა · ${readingMinutes(article.words)} წუთი`
            : `ბოლო ცვლილება ${formatDate(article.updatedAt)} · ${article.words} სიტყვა`}
        </p>

        <div className={styles.actions}>
          {published && article.slug && (
            <ButtonLink
              variant="ghost"
              href={`/a/${article.slug}`}
              className={styles.action}
            >
              ნახვა
            </ButtonLink>
          )}
          <ButtonLink
            variant="ghost"
            href={`/write/${article.id}`}
            className={styles.action}
          >
            რედაქტირება
          </ButtonLink>
          <DeleteArticleButton
            id={article.id}
            title={article.title}
            className={styles.action}
          />
        </div>
      </div>
    </article>
  );
}
