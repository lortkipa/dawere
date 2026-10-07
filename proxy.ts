import { NextResponse, type NextRequest } from "next/server";

// A Content Security Policy with a fresh nonce for every page: Next.js reads the nonce from the
// request's header and puts it on its own scripts, so injected scripts can't run. Every page is
// rendered per request already (the layout reads the session), which nonces need.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const https = request.headers.get("x-forwarded-proto") === "https";
  const csp = [
    "default-src 'self'",
    // React needs eval in development only, for its error overlays.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Components set style attributes (list heights, chart bars), which nonces can't cover.
    "style-src 'self' 'unsafe-inline'",
    // blob: shows photos picked in the writer before they're uploaded.
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Only over HTTPS: on plain http (a phone on the LAN) it would ask for the photos over https.
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not static files, uploaded photos or link prefetches.
      source: "/((?!_next/static|_next/image|avatars/|images/|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
