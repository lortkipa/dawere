import "server-only";
import { createHmac } from "node:crypto";
import { normalizeEmail } from "./profile-rules";

// Sign-in with Facebook: OAuth's authorization code flow with PKCE, see app/auth/facebook.

// The Graph API version the Meta app was made with.
const version = "v26.0";

export function facebookConfigured() {
  return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
}

// Has to be one of the app's "Valid OAuth Redirect URIs" in the Meta developer dashboard, which
// takes only https; localhost passes on its own while the app is in development mode. Without
// SITE_URL (local dev) it's the address the request came to, so any dev port works.
function redirectUri(origin: string) {
  const site = (process.env.SITE_URL || origin).replace(/\/+$/, "");
  return `${site}/auth/facebook/callback`;
}

export function authorizeUrl(origin: string, state: string, codeChallenge: string) {
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
  url.search = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "email,public_profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return url;
}

type Profile = { id: string; email?: string; name?: string; picture?: string };

// Trades the code from the callback for the account's details. Facebook only hands over a
// confirmed email, and often none at all: accounts made with a phone number have none to give.
export async function fetchFacebookProfile(origin: string, code: string, codeVerifier: string): Promise<Profile | null> {
  const tokenUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  tokenUrl.search = new URLSearchParams({
    code,
    code_verifier: codeVerifier,
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    redirect_uri: redirectUri(origin),
  }).toString();
  const tokenResponse = await fetch(tokenUrl, { signal: AbortSignal.timeout(10_000) });
  if (!tokenResponse.ok) return null;
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };
  if (!accessToken) return null;

  const profileUrl = new URL(`https://graph.facebook.com/${version}/me`);
  profileUrl.search = new URLSearchParams({
    fields: "id,name,email,picture.width(400).height(400)",
    // Proves the call comes from us, not from someone holding a leaked token.
    appsecret_proof: createHmac("sha256", process.env.FACEBOOK_APP_SECRET!).update(accessToken).digest("hex"),
  }).toString();
  const profileResponse = await fetch(profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!profileResponse.ok) return null;
  const profile = (await profileResponse.json()) as {
    id?: string;
    email?: string;
    name?: string;
    picture?: { data?: { url?: string; is_silhouette?: boolean } };
  };
  if (!profile.id) return null;

  // The grey silhouette is Facebook's stand-in for no photo; we'd rather have none.
  const picture = profile.picture?.data;
  return {
    id: profile.id,
    email: profile.email ? normalizeEmail(profile.email) : undefined,
    name: profile.name,
    picture: picture?.is_silhouette ? undefined : picture?.url,
  };
}
