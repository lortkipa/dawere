import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Lets `next dev` serve phones on the local network (dev only).
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
