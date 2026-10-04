// Where to go after signing in: the `next` search param, kept to paths on this site so a link
// can't send someone elsewhere ("//evil.example" and "/\evil.example" are other hosts).
export function safeNext(value: unknown) {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : null;
}

export function authUrl(next: string | null) {
  return next ? `/auth?next=${encodeURIComponent(next)}` : "/auth";
}
