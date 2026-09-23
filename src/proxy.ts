import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * Private pages send signed-out visitors to sign in before anything renders.
 *
 * The pages check again with a real session lookup; this only looks for the
 * cookie. It exists so the common case gets a proper 307 — once a page starts
 * streaming behind a loading skeleton, its own redirect can no longer set the
 * status and degrades to a client-side hop.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const login = new URL('/login', request.url);
  login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/bookmarks/:path*', '/write/:path*', '/onboarding'],
};
