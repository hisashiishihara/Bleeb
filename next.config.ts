import type { NextConfig } from "next";
const config: NextConfig = {
  async headers() {
    return ["/owner/:path*", "/api/owner/:path*"].map(source => ({
      source,
      headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
        { key: "CDN-Cache-Control", value: "no-store" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }
      ]
    }));
  }
};
export default config;
