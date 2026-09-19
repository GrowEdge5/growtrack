import type { NextConfig } from "next";

// The API origin the app proxies to when NEXT_PUBLIC_API_URL is not set. Point this
// at the deployed API service (or at a Railway private hostname) so the browser only
// ever talks to this app's own origin and no CORS configuration is involved.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    // When NEXT_PUBLIC_API_URL is set the browser calls the API host directly, so
    // proxying would only add a hop. Otherwise /v1 and /health are forwarded.
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [];
    }
    return [
      { source: "/v1/:path*", destination: `${API_PROXY_TARGET}/v1/:path*` },
      { source: "/health/:path*", destination: `${API_PROXY_TARGET}/health/:path*` }
    ];
  }
};

export default nextConfig;
