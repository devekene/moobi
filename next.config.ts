import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  allowedDevOrigins: ["192.168.1.107"],
};

export default nextConfig;
