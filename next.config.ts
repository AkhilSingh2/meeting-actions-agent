import type { NextConfig } from "next";

// STATIC_DEMO=true builds a browser-only demo for GitHub Pages (see lib/demo).
const staticDemo = process.env.STATIC_DEMO === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(staticDemo
    ? {
        output: "export",
        basePath: "/meeting-actions-agent",
        trailingSlash: true,
        images: { unoptimized: true },
        env: { NEXT_PUBLIC_STATIC_DEMO: "true" },
      }
    : {}),
};

export default nextConfig;
