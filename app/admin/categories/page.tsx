import { asc, sql } from "drizzle-orm";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

export default async function AdminCategories() {
  await requireAdmin();
  const rows = await db
    .select({
      slug: categories.slug,
      label: categories.label,
      emoji: categories.emoji,
      readers: sql<number>`(select count(*) from users u where ${categories.slug} = any(u.topics))::int`,
      posts: sql<number>`(select count(*) from posts p where ${categories.slug} = any(p.tags))::int`,
    })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.slug));

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="კატეგორიები" count={rows.length} />
      <CategoryManager categories={rows} />
    </div>
  );
}
