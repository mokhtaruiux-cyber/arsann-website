import * as THREE from 'three';
export const R = 6.371;
export const NOTEX_GLB = '/models/scene01/scene01_origin.notex.glb';
export const GLB_SECONDS = 10; // exported clips: progress 0..1 == 10 s
export const TEX_BASE = '/textures/scene01/';
export type Tier = 'low' | 'medium' | 'high';
export type TexFormat = 'ktx2' | 'webp';
type TexSet = { day: string; night: string; mask: string; region: string | null; cloud: number };
/** KTX2 (Basis Universal) sets: GPU-compressed (~4x less VRAM, no RGBA expansion/upload stall). ETC1S = smallest, UASTC = higher quality. */
export const TIER_SETS_KTX2: Record<Tier, TexSet> = {
  low: { day: 'day_global_4096.etc1s.ktx2', night: 'night_global_4096.etc1s.ktx2', mask: 'landmask_2048.webp', region: null, cloud: 1024 },
  medium: { day: 'day_global_4096.ktx2', night: 'night_global_4096.etc1s.ktx2', mask: 'landmask_2048.webp', region: 'day_region_2048.ktx2', cloud: 2048 },
  high: { day: 'day_global_4096.ktx2', night: 'night_global_4096.ktx2', mask: 'landmask_4096.webp', region: 'day_region_3584.ktx2', cloud: 4096 },
};
/** WebP sets (decoded to RGBA on the GPU) — kept for comparison and as a no-KTX2 fallback. */
export const TIER_SETS_WEBP: Record<Tier, TexSet> = {
  low: { day: 'day_global_2048.webp', night: 'night_global_2048.webp', mask: 'landmask_2048.webp', region: null, cloud: 1024 },
  medium: { day: 'day_global_4096.webp', night: 'night_global_4096.webp', mask: 'landmask_4096.webp', region: 'day_region_2048.webp', cloud: 2048 },
  high: { day: 'day_global_5400.webp', night: 'night_global_8192.webp', mask: 'landmask_4096.webp', region: 'day_region_4096.webp', cloud: 4096 },
};
/** Regional texture footprint (lon/lat degrees) — cropped from NASA BMNG tile C1. */
export const REGION = { lon0: 30, lon1: 62, lat0: 8, lat1: 38 };
export function pickTier(maxTex: number, opts: { coarse: boolean; deviceMemory?: number; downlink?: number; override?: string | null }): Tier {
  if (opts.override === 'low' || opts.override === 'medium' || opts.override === 'high') return opts.override;
  if (maxTex < 4096) return 'low';                                   // cannot hold the 4096 global textures
  if (opts.coarse || (opts.deviceMemory ?? 8) <= 4 || maxTex < 8192) return 'low';
  if ((opts.deviceMemory ?? 8) <= 6 || (opts.downlink ?? 10) < 10) return 'medium';   // high = ~18 MB of textures: needs memory AND a fast link
  return 'high';
}
/** Brand colours (linear-light working space). */
const lin = (h: string) => new THREE.Color(h); // hex strings are interpreted as sRGB and stored linear by three's ColorManagement
export const COL = { gold: lin('#C8B9A5'), pearl: lin('#FAFAF5'), charcoal: lin('#1E1E14'), stone: lin('#D7D7C8'), warm: lin('#D69A6C'), sunset: lin('#D8A070'), atmoBlue: lin('#7E9AC4') };
/** Provisional city list (from the PM site; NOT validated, NOT ARSANN locations). */
export const CITIES = [
  { id: 'tabuk', pri: 1, en: 'TABUK', ar: 'تبوك', lon: 36.57, lat: 28.38, side: 'R' }, { id: 'alula', pri: 2, en: 'ALULA', ar: 'العلا', lon: 37.92, lat: 26.61, side: 'R' },
  { id: 'madinah', pri: 2, en: 'MADINAH', ar: 'المدينة المنورة', lon: 39.61, lat: 24.47, side: 'R' }, { id: 'yanbu', pri: 2, en: 'YANBU', ar: 'ينبع', lon: 38.06, lat: 24.09, side: 'L' },
  { id: 'jeddah', pri: 1, en: 'JEDDAH', ar: 'جدة', lon: 39.17, lat: 21.54, side: 'L' }, { id: 'makkah', pri: 2, en: 'MAKKAH', ar: 'مكة المكرمة', lon: 39.86, lat: 21.39, side: 'R' },
  { id: 'riyadh', pri: 1, en: 'RIYADH', ar: 'الرياض', lon: 46.68, lat: 24.71, side: 'R' }, { id: 'abha', pri: 1, en: 'ABHA', ar: 'أبها', lon: 42.5, lat: 18.22, side: 'R' },
] as const;
/** lon/lat (deg) -> position in the GLB's Y-up globe frame (Blender (x,y,z) -> glTF (x,z,-y)). */
export function lonLatToVec3(lon: number, lat: number, r: number, out = new THREE.Vector3()) {
  const lo = THREE.MathUtils.degToRad(lon), la = THREE.MathUtils.degToRad(lat);
  const bx = r * Math.cos(la) * Math.cos(lo), by = r * Math.cos(la) * Math.sin(lo), bz = r * Math.sin(la); return out.set(bx, bz, -by);
}
