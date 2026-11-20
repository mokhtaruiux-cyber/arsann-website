/** Prefixes a public/ path with the deployment base path (GitHub Pages project sites live under /<repo>/).
 *  NEXT_PUBLIC_BASE_PATH is '' for local dev and for a root deployment. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const asset = (path: string) => `${BASE_PATH}${path}`;
