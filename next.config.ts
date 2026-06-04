import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-cb0e6d81-54ba-42b2-8d89-e06f43dbfaba.space-z.ai",
  ],
};

export default nextConfig;
