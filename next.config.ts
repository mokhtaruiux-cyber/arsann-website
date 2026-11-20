import type { NextConfig } from "next";

/** `EXPORT=1 npm run build` produces a fully static site in ./out for GitHub Pages.
 *  NEXT_PUBLIC_BASE_PATH is '/<repo-name>' for a project site, '' for a user/custom-domain site. */
const isExport = process.env.EXPORT === '1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  ...(isExport ? { output: 'export' as const, trailingSlash: true, images: { unoptimized: true }, ...(basePath ? { basePath, assetPrefix: basePath } : {}) } : {}),
  // redirects are not supported by static export: public/index.html forwards '/' to '/en/' there.
  ...(isExport ? {} : { async redirects() { return [{ source: '/', destination: '/en', permanent: false }]; } }),
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
