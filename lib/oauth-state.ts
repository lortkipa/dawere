import "server-only";
import { cookies, headers } from "next/headers";

// Between leaving for Google or Facebook and coming back: the state that ties the two together,
// the PKCE verifier, and the page to return to. One cookie per provider, sent only to its routes.
export type Provider = "google" | "facebook";

type Pending = { state: string; verifier: string; next: string | null };

export async function savePending(provider: Provider, pending: Pending) {
  // Same reasoning as the session cookie in lib/session.ts.
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(`dawere_${provider}`, JSON.stringify(pending), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 60 * 10,
    path: `/auth/${provider}`,
  });
}

// Read once: the cookie goes either way.
export async function takePending(provider: Provider): Promise<Pending | null> {
  const store = await cookies();
  const value = store.get(`dawere_${provider}`)?.value;
  store.delete({ name: `dawere_${provider}`, path: `/auth/${provider}` });
  if (!value) return null;
  try {
    const pending = JSON.parse(value) as Partial<Pending>;
    if (typeof pending.state !== "string" || typeof pending.verifier !== "string") return null;
    return { state: pending.state, verifier: pending.verifier, next: typeof pending.next === "string" ? pending.next : null };
  } catch {
    return null;
  }
}
