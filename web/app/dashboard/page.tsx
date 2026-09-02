import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { accountFrom } from "@/lib/account";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { ArticleList } from "@/components/dashboard/ArticleList";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { EmptyState } from "@/components/dashboard/EmptyState";
import styles from "./page.module.css";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/");

  // `html` is deliberately absent: the list shows the stored excerpt, and the
  // bodies of every article an author has written add up fast.
  const mine = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      words: articles.words,
      views: articles.views,
      status: articles.status,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(eq(articles.authorId, session.user.id))
    .orderBy(desc(articles.updatedAt));

  return (
    <div className={styles.page}>
      <DashboardNav account={accountFrom(session)} />
      {mine.length === 0 ? <EmptyState /> : <ArticleList articles={mine} />}
    </div>
  );
}
