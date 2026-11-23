import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() { return [{ source: '/', destination: '/en', permanent: false }]; },
  /* config options here */
  // cacheComponents/partialPrefetching DISABLED for the 3D routes: with them ON, Next 16 keeps the previous route mounted (Activity) so the WebGL context is never released.
  cacheComponents: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
