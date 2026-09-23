import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Uploaded images are the covers in share cards, and card crawlers
      // (Twitterbot among them) obey robots.txt; the longer rule wins over /api/.
      allow: ['/', '/api/media/'],
      // Private or per-user pages: nothing there for a search index.
      disallow: ['/api/', '/write', '/dashboard', '/settings', '/bookmarks', '/onboarding'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
