import type { MetadataRoute } from 'next';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { SITE_URL } from '@/lib/site';

// Built per request from the database, never at build time.
export const dynamic = 'force-dynamic';

/** The public pages, every published post, every author with one, every topic in use. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, authors, topics] = await Promise.all([
    db.execute<{ slug: string; updated_at: string }>(sql`
      select slug, updated_at from posts where status = 'published'
      order by published_at desc limit 45000
    `),
    db.execute<{ username: string; updated_at: string }>(sql`
      select u.username, max(p.updated_at) as updated_at
      from users u join posts p on p.author_id = u.id and p.status = 'published'
      group by u.username
    `),
    db.execute<{ slug: string }>(sql`select slug from topics where post_count > 0`),
  ]);

  return [
    { url: SITE_URL, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    ...posts.map((p) => ({
      url: `${SITE_URL}/p/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...authors.map((a) => ({
      url: `${SITE_URL}/u/${a.username}`,
      lastModified: new Date(a.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    ...topics.map((t) => ({
      url: `${SITE_URL}/topic/${t.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ];
}
