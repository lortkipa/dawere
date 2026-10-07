import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { fetchGoogleProfile, googleConfigured } from "@/lib/google";
import { takePending } from "@/lib/oauth-state";
import { authUrl, safeNext } from "@/lib/return-to";
import { afterSignIn, signIn } from "@/lib/sign-in";

// Google sends the browser back here with a code, or with an error when the person cancelled.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pending = await takePending("google");
  const next = safeNext(pending?.next);
  const code = params.get("code");
  if (!googleConfigured() || !pending || !code || params.get("state") !== pending.state) {
    redirect(authUrl(next, "google"));
  }

  const profile = await fetchGoogleProfile(request.nextUrl.origin, code, pending.verifier).catch(() => null);
  if (!profile) redirect(authUrl(next, "google"));

  const user = await signIn(profile.email, { name: profile.name, picture: profile.picture });
  if (user === "banned") redirect(authUrl(next, "banned"));
  redirect(afterSignIn(user, next));
}
