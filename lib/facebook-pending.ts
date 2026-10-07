import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

// A Facebook sign-in that came back without an email waits here while the person types one and
// the code sent to it; the code step then links the Facebook account (app/auth/actions.ts).
// Signed with the app secret, so nobody can put someone else's Facebook ID in it.
const cookieName = "dawere_facebook_pending";
const maxAge = 60 * 15;

type Pending = { facebookId: string; name?: string; picture?: string };

function sign(payload: string) {
  return createHmac("sha256", process.env.FACEBOOK_APP_SECRET!).update(payload).digest("base64url");
}

export async function savePendingFacebook(pending: Pending) {
  const payload = Buffer.from(JSON.stringify({ ...pending, expiresAt: Date.now() + maxAge * 1000 })).toString(
    "base64url",
  );
  // Same reasoning as the session cookie in lib/session.ts.
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(cookieName, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge,
    path: "/auth",
  });
}

export async function readPendingFacebook(): Promise<Pending | null> {
  const value = (await cookies()).get(cookieName)?.value;
  const [payload, signature] = value?.split(".") ?? [];
  if (!payload || !signature || !process.env.FACEBOOK_APP_SECRET) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const pending = JSON.parse(Buffer.from(payload, "base64url").toString()) as Pending & { expiresAt?: number };
    if (typeof pending.facebookId !== "string" || !(Number(pending.expiresAt) > Date.now())) return null;
    return { facebookId: pending.facebookId, name: pending.name, picture: pending.picture };
  } catch {
    return null;
  }
}

export async function clearPendingFacebook() {
  (await cookies()).delete({ name: cookieName, path: "/auth" });
}
