/**
 * The public origin, used for absolute URLs in metadata, the sitemap and
 * robots.txt. Set SITE_URL in production; the fallback suits `next dev`.
 */
export const SITE_URL = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

/**
 * Cookies are Secure only when the site is served over https. Browsers drop
 * Secure cookies on plain http (localhost aside), so tying this to NODE_ENV
 * would make sign-in impossible on a LAN deployment like http://nas:8000.
 */
export const SECURE_COOKIES = SITE_URL.startsWith('https://');

/**
 * Where people write for help, a forgotten password above all (there is no
 * email-based reset; see db/reset-password.mts). Empty hides every mention.
 */
export const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL ?? '').trim();

export function supportMailto(subject: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/**
 * The site-wide share card (src/app/opengraph-image.png). A page that sets its
 * own `openGraph` replaces the inherited one wholesale, image included, so such
 * pages name this as their fallback.
 */
export const DEFAULT_SHARE_IMAGE = '/opengraph-image.png';
