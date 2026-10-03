import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "./db";
import { sessions, users } from "./db/schema";

const cookieName = "dawere_session";
const maxAgeSeconds = 60 * 60 * 24 * 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + maxAgeSeconds * 1000),
  });

  // Next fills in x-forwarded-proto (a TLS proxy in front overrides it). Keying `secure` on
  // it rather than NODE_ENV keeps sign-in working on a production build over plain http,
  // e.g. a phone on the LAN, where browsers drop secure cookies.
  const secure = (await headers()).get("x-forwarded-proto") === "https";

  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return row?.user ?? null;
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(cookieName);
}
