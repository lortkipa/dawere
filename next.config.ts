import type { NextConfig } from "next";

// Sent with every response. The Content Security Policy is set per request in proxy.ts.
const securityHeaders = [
  // Browsers that have seen the site over HTTPS refuse plain http for a year (ignored over http).
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  // No other site may show ours in a frame (clickjacking); frame-ancestors in the CSP says the same.
  { key: "X-Frame-Options", value: "DENY" },
  // Other sites see only our address as the referrer, not which post or search a reader came from.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Lets `next dev` serve phones on the local network (dev only).
  allowedDevOrigins: ["192.168.*.*"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // Publishing sends a post with all its photos (up to 20, shrunk in the browser) at once.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
