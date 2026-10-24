import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    agentUpgrade: "security",
  },
  partialPrefetching: true,
  poweredByHeader: false,
  // The document CSP is set per request in src/proxy.ts. Static files keep the headers below.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
