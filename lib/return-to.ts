// Where to go after signing in: the `next` search param, kept to paths on this site so a link
// can't send someone elsewhere ("//evil.example" and "/\evil.example" are other hosts).
export function safeNext(value: unknown) {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : null;
}

// `error` is a sign-in that failed on the way back from Google; see components/auth-form.tsx.
export function authUrl(next: string | null, error?: "google" | "google-off" | "banned") {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (next) params.set("next", next);
  return params.size ? `/auth?${params}` : "/auth";
}
