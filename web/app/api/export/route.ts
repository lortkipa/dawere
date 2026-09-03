import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles, users } from "@/db/schema";
import { siteOrigin } from "@/lib/url";

/**
 * Everything the platform holds about one person, as a file they can keep.
 * Drafts included, article HTML included — the point is that deleting the
 * account never has to mean losing the writing.
 *
 * A route handler rather than a Server Action because the answer is a download:
 * the browser needs a real response with a filename on it.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("ჯერ უნდა შეხვიდე.", { status: 401 });
  }

  const authorId = session.user.id;

  const [author] = await db
    .select({
      name: users.name,
      email: users.email,
      handle: users.handle,
      bio: users.bio,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, authorId));

  // The cookie outlived the row it names.
  if (!author) return new Response("ანგარიში ვერ მოიძებნა.", { status: 401 });

  const [mine, origin] = await Promise.all([
    db
      .select({
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
        excerpt: articles.excerpt,
        html: articles.html,
        words: articles.words,
        views: articles.views,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(eq(articles.authorId, authorId))
      .orderBy(desc(articles.createdAt)),
    siteOrigin(),
  ]);

  const file = {
    exportedAt: new Date().toISOString(),
    author: {
      name: author.name,
      email: author.email,
      bio: author.bio,
      url: `${origin}/${author.handle}`,
      joinedAt: author.createdAt.toISOString(),
    },
    articles: mine.map(({ slug, ...article }) => ({
      ...article,
      // A draft has no address, which is exactly what null says here.
      url: slug ? `${origin}/a/${slug}` : null,
      publishedAt: article.publishedAt?.toISOString() ?? null,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
    })),
  };

  const day = new Date().toISOString().slice(0, 10);

  // Indented, because a backup nobody can read is not much of a backup.
  return new Response(JSON.stringify(file, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="dawere-${day}.json"`,
      "cache-control": "no-store",
    },
  });
}
