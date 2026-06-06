import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/sync/rescan': ['./upload/**/*'],
    },
  } as any,
};

export default nextConfig;
