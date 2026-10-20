import type { NextConfig } from "next";
const config: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "CDN-Cache-Control", value: "no-store" }
        ]
      },
      // Public pages use their own robots metadata. Keep private surfaces blocked.
      ...["/owner/:path*", "/api/:path*", "/mcp", "/mcp/:path*", "/account/:path*", "/media/:path*"].map(source => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]
      }))
    ];
  }
};
export default config;
