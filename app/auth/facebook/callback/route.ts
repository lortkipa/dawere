import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { facebookConfigured, fetchFacebookProfile } from "@/lib/facebook";
import { savePendingFacebook } from "@/lib/facebook-pending";
import { takePending } from "@/lib/oauth-state";
import { authUrl, safeNext } from "@/lib/return-to";
import { afterSignIn, linkFacebook, signIn } from "@/lib/sign-in";

// Facebook sends the browser back here with a code, or with an error when the person cancelled.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pending = await takePending("facebook");
  const next = safeNext(pending?.next);
  const code = params.get("code");
  if (!facebookConfigured() || !pending || !code || params.get("state") !== pending.state) {
    redirect(authUrl(next, "facebook"));
  }

  const profile = await fetchFacebookProfile(request.nextUrl.origin, code, pending.verifier).catch(() => null);
  if (!profile) redirect(authUrl(next, "facebook"));

  // A Facebook account signed in with before goes to the same user, whatever email it has now.
  const [linked] = await db.select({ email: users.email }).from(users).where(eq(users.facebookId, profile.id));
  const email = linked?.email ?? profile.email;
  const extras = { name: profile.name, picture: profile.picture };
  if (!email) {
    // No email from Facebook: /auth asks for one, and its code step finishes the sign-in.
    await savePendingFacebook({ facebookId: profile.id, ...extras });
    const query = new URLSearchParams({ facebook: "email" });
    if (next) query.set("next", next);
    redirect(`/auth?${query}`);
  }

  const user = await signIn(email, extras);
  if (user === "banned") redirect(authUrl(next, "banned"));
  await linkFacebook(user.id, profile.id);
  redirect(afterSignIn(user, next));
}
