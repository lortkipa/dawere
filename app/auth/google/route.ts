import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { authorizeUrl, googleConfigured } from "@/lib/google";
import { authUrl, safeNext } from "@/lib/return-to";
import { savePending } from "./state";

// The "continue with Google" button on /auth comes here, and this sends the browser to Google.
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!googleConfigured()) redirect(authUrl(next, "google-off"));

  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  await savePending({ state, verifier, next });
  redirect(authorizeUrl(request.nextUrl.origin, state, challenge).toString());
}
