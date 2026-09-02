import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next blocks cross-origin requests to dev assets by default, which leaves the
  // page unhydrated when opened from another device on the LAN. Dev-only.
  allowedDevOrigins: ["192.168.100.148"],
  images: {
    // OAuth avatars. Facebook's host (platform-lookaside.fbsbx.com) joins this
    // list when that provider is wired up.
    remotePatterns: [new URL("https://lh3.googleusercontent.com/**")],
  },
};

export default nextConfig;
