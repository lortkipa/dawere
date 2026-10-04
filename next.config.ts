import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Lets `next dev` serve phones on the local network (dev only).
  allowedDevOrigins: ["192.168.*.*"],
  experimental: {
    // Publishing sends a post with all its photos (up to 20, shrunk in the browser) at once.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
