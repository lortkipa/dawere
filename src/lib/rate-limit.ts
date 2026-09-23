import 'server-only';

import { headers } from 'next/headers';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

/**
 * Fixed-window rate limiting backed by the `rate_limits` table, so limits hold
 * across restarts and across several app instances behind one database.
 *
 * Returns true while the caller is within `limit` hits per `windowSeconds`.
 * A database error fails open: a hiccup in the limiter must not lock everyone
 * out of signing in.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const rows = await db.execute<{ count: number }>(sql`
      insert into rate_limits (key, window_start, count)
      values (${key}, now(), 1)
      on conflict (key) do update set
        count = case
          when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
          then 1 else rate_limits.count + 1 end,
        window_start = case
          when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
          then now() else rate_limits.window_start end
      returning count
    `);

    // Keys carry IP addresses, and the privacy policy promises they are gone
    // within a day. An indexed delete that usually matches nothing is cheap
    // enough to run every time, which keeps that true even on a quiet site.
    await db.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);

    return (rows[0]?.count ?? 0) <= limit;
  } catch (error) {
    console.error('[rate-limit] failed, allowing request', error);
    return true;
  }
}

/**
 * The caller's address as reported by the reverse proxy. Behind no proxy these
 * headers are client-controlled, so limits keyed on IP are a speed bump, not a
 * wall — which is why sign-in is also limited per account.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || h.get('x-real-ip') || 'unknown';
}

export const TOO_MANY = 'ძალიან ბევრი მცდელობაა. სცადე რამდენიმე წუთში.';
