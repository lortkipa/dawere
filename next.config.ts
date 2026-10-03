import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Lets `next dev` serve phones on the local network (dev only).
  allowedDevOrigins: ["192.168.*.*"],
  experimental: {
    // Profile photos up to 5 MB, plus room for the multipart overhead.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
