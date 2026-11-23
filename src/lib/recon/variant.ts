/** Scene 01 look variant. `v3` = PM edits of 17 Nov 2026 (default). `legacy` = the previous look, kept as a fallback: open with `?v=1` (or `?v=legacy`). */
export type Variant = 'v3' | 'legacy';
export function readVariant(): Variant {
  if (typeof window === 'undefined') return 'v3';
  const v = new URLSearchParams(window.location.search).get('v');
  return v === '1' || v === 'legacy' ? 'legacy' : 'v3';
}
