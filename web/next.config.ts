import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next blocks cross-origin requests to dev assets by default, which leaves the
  // page unhydrated when opened from another device on the LAN. Dev-only.
  allowedDevOrigins: ["192.168.100.148"],
};

export default nextConfig;
