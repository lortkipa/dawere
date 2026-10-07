import "server-only";
import { normalizeEmail } from "./profile-rules";

// Sign-in with Google: OAuth's authorization code flow with PKCE, see app/auth/google.

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// Has to match a redirect URI on the OAuth client in Google Cloud Console exactly. Without
// SITE_URL (local dev) it's the address the request came to, so any dev port works.
function redirectUri(origin: string) {
  const site = (process.env.SITE_URL || origin).replace(/\/+$/, "");
  return `${site}/auth/google/callback`;
}

export function authorizeUrl(origin: string, state: string, codeChallenge: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url;
}

type Profile = { email: string; name?: string; picture?: string };

// Trades the code from the callback for the account's details. Null unless Google vouches for
// the email, since the email is what the account is.
export async function fetchGoogleProfile(origin: string, code: string, codeVerifier: string): Promise<Profile | null> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenResponse.ok) return null;
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };
  if (!accessToken) return null;

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!profileResponse.ok) return null;
  const profile = (await profileResponse.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!profile.email || profile.email_verified !== true) return null;

  return { email: normalizeEmail(profile.email), name: profile.name, picture: profile.picture && biggerPicture(profile.picture) };
}

// The photo URL ends in a size like "=s96-c"; ask for one as big as our avatars.
function biggerPicture(url: string) {
  return url.replace(/=s\d+(-c)?$/, "=s400-c");
}
