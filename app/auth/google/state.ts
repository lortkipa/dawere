import "server-only";
import { cookies, headers } from "next/headers";

// Between leaving for Google and coming back: the state that ties the two together, the PKCE
// verifier, and the page to return to.
const cookieName = "dawere_google";

type Pending = { state: string; verifier: string; next: string | null };

export async function savePending(pending: Pending) {
  // Same reasoning as the session cookie in lib/session.ts.
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(cookieName, JSON.stringify(pending), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 60 * 10,
    path: "/auth/google",
  });
}

// Read once: the cookie goes either way.
export async function takePending(): Promise<Pending | null> {
  const store = await cookies();
  const value = store.get(cookieName)?.value;
  store.delete({ name: cookieName, path: "/auth/google" });
  if (!value) return null;
  try {
    const pending = JSON.parse(value) as Partial<Pending>;
    if (typeof pending.state !== "string" || typeof pending.verifier !== "string") return null;
    return { state: pending.state, verifier: pending.verifier, next: typeof pending.next === "string" ? pending.next : null };
  } catch {
    return null;
  }
}
