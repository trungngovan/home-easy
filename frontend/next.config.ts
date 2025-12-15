import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Suppress false positive warnings about searchParams in dev mode
  onDemandEntries: {
    // Keep pages in memory for longer to reduce serialization issues
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  async rewrites() {
    const apiBase = process.env.API_BASE_URL;
    if (!apiBase) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiBase.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
