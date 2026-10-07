import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { authorizeUrl, facebookConfigured } from "@/lib/facebook";
import { savePending } from "@/lib/oauth-state";
import { authUrl, safeNext } from "@/lib/return-to";

// The "continue with Facebook" button on /auth comes here, and this sends the browser to Facebook.
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!facebookConfigured()) redirect(authUrl(next, "facebook-off"));

  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  await savePending("facebook", { state, verifier, next });
  redirect(authorizeUrl(request.nextUrl.origin, state, challenge).toString());
}
