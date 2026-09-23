import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq, gt, lt, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { sessions, users, type User } from '@/db/schema';
import { SESSION_COOKIE } from './session-cookie';
import { SECURE_COOKIES } from './site';

export { SESSION_COOKIE, VISITOR_COOKIE } from './session-cookie';
const SESSION_DAYS = 30;
const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/**
 * A real hash of nothing in particular. Comparing against it when an email has
 * no account makes a miss cost as much as a wrong password, so response time
 * does not reveal which addresses are registered.
 */
const DECOY_HASH = bcrypt.hashSync('dawere-decoy-password', BCRYPT_ROUNDS);

export async function burnPasswordCheck(password: string) {
  await bcrypt.compare(password, DECOY_HASH);
}

/** The cookie holds the raw token; the database only ever stores its digest. */
function digest(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const userAgent = (await headers()).get('user-agent') ?? '';

  // Expired rows are useless; clear this user's while we are here.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));

  await db.insert(sessions).values({
    id: digest(token),
    userId,
    userAgent: userAgent.slice(0, 255),
    expiresAt,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: SECURE_COOKIES,
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, digest(token)));
  jar.delete(SESSION_COOKIE);
}

/**
 * Current user, or null. Cached for the lifetime of one request so that a page
 * plus its layouts and components share a single query.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, digest(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0]?.user ?? null;
});

/**
 * The signed-in user, or a redirect to sign in. Pages pass their own path as
 * `next` so the reader lands back where they were.
 */
export async function requireUser(next?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  return user;
}

/** Signs the user out everywhere except this browser. Returns how many sessions ended. */
export async function revokeOtherSessions(userId: string): Promise<number> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const keep = token ? digest(token) : '';
  const removed = await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keep)))
    .returning({ id: sessions.id });
  return removed.length;
}

/** Live sessions other than the current one, for the settings page. */
export async function countOtherSessions(userId: string): Promise<number> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const keep = token ? digest(token) : '';
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        ne(sessions.id, keep),
        gt(sessions.expiresAt, new Date()),
      ),
    );
  return rows.length;
}

/** Drops the session cookie without touching the database (the rows are gone already). */
export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
