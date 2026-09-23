import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { getCurrentUser, VISITOR_COOKIE } from '@/lib/auth';
import { recordPostSignal } from '@/lib/interests';
import { SECURE_COOKIES } from '@/lib/site';
import { isUuid } from '@/lib/utils';

/**
 * Called once from the article page after it renders. Doing this from the client
 * rather than during render keeps the page cacheable-in-principle, lets us set
 * the visitor cookie, and means prefetches do not inflate the count.
 */
export async function POST(request: Request, ctx: RouteContext<'/api/posts/[id]/view'>) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false }, { status: 400 });

  const user = await getCurrentUser();
  const jar = await cookies();

  let visitorId = jar.get(VISITOR_COOKIE)?.value;
  let mintedVisitor = false;
  if (!visitorId) {
    visitorId = randomBytes(12).toString('base64url');
    mintedVisitor = true;
  }

  const viewerKey = user ? `u:${user.id}` : `v:${visitorId}`;

  // The unique index on (post_id, viewer_key, view_day) makes this idempotent
  // per day, and the insert trigger bumps posts.view_count only when a row lands.
  // Selecting from posts means an unknown or unpublished id inserts nothing
  // instead of tripping the foreign key.
  const inserted = await db.execute<{ id: string }>(sql`
    insert into post_views (post_id, user_id, viewer_key)
    select p.id, ${user?.id ?? null}::uuid, ${viewerKey}
    from posts p
    where p.id = ${id}::uuid and p.status = 'published'
    on conflict do nothing
    returning id
  `);

  const counted = inserted.length > 0;
  if (counted && user) {
    const fromSearch = new URL(request.url).searchParams.get('from') === 'search';
    await recordPostSignal(user.id, id, fromSearch ? 'searchOpen' : 'view');
  }

  const response = NextResponse.json({ ok: true, counted });
  if (mintedVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: SECURE_COOKIES,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
