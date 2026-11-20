import type { Lang } from './scene01';
/** The horse → car story. Copy comes from the Figma section "S03 · English / Arabic" (Landing 28:28, The Road 28:202, The Guide 28:82, The Rein 28:107, Line of Light 28:134), re-ordered to follow the Blender motion:
 *  Landing (dive start) → The Guide + The Rein (horse photos) → The Road (hand-off from the horse to the car: the cockpit fades in) → Line of Light (the car on the same road, ARSANN revealed when it parks in the Smart Parking bay).
 *  `arLeft` = the Arabic block sits on the physical left (The Guide); every other Arabic block sits on the right, like the Arabic Figma frames. */
export type Scene03Shot = { id: 'guide' | 'rein' | 'road' | 'line'; /** which progress channel drives it: 3 = horse photos, 4 = Tesla drive */ scene: 3 | 4; at: [number, number, number, number]; img?: string; pos?: string; /** the sub line fades in on its own, [from, to] on the same progress */ subAt?: [number, number]; en: { head: string; sub?: string }; ar: { head: string; sub?: string }; arLeft?: boolean };
/** `at` = [fade-in start, fully in, start fading out, fully out] on the shot's own 0..1 progress. */
export const SCENE3_SHOTS: Scene03Shot[] = [
  { id: 'guide', scene: 3, at: [0.40, 0.50, 0.58, 0.63], img: '/images/scene03/guide.jpg', pos: '30% 50%', en: { head: 'From horses to intelligent mobility.' }, ar: { head: 'من الخيل إلى التنقّل الذكي.' }, arLeft: true },
  { id: 'rein', scene: 3, at: [0.66, 0.74, 0.86, 0.92], img: '/images/scene03/rein.jpg', pos: '50% 50%', en: { head: 'From movement to mobility intelligence.', sub: 'ARSANN' }, ar: { head: 'من الحركة إلى ذكاء التنقّل.', sub: 'أرسان' } },
  { id: 'road', scene: 4, at: [0.03, 0.09, 0.20, 0.27], en: { head: 'Where the horse walked, the corridor runs.' }, ar: { head: 'حيث سار الحصان، يمتدّ الممرّ.' } },
  { id: 'line', scene: 4, at: [0.36, 0.44, 1.2, 1.3], subAt: [0.80, 0.87], en: { head: '2026 — The same road.', sub: 'ARSANN — Saudi Arabia.' }, ar: { head: '٢٠٢٦ — الطريق نفسه.', sub: 'أرسان — المملكة العربية السعودية.' } },
];
/** Landing (Figma 28:28): the first copy of the story, over the start of the desert dive. Driven by Scene 02's own 0..1 progress. */
export const SCENE2_LANDING = { at: [0.04, 0.09, 0.17, 0.23] as [number, number, number, number], en: { head: 'A journey begins.', sub: '2017' }, ar: { head: 'تبدأ الرحلة.', sub: '٢٠١٧' } };
export const SCENE2_EYEBROW: Record<Lang, string> = { en: '02 — ORIGIN', ar: '٠٢ — البداية' };
export const SCENE3_EYEBROW: Record<Lang, string> = { en: '03 — ORIGIN', ar: '٠٣ — البداية' };
export const SCENE3_NUM: Record<Lang, string> = { en: '03', ar: '٠٣' };
/** Share of Scene 03's scroll that drives the live 3D Road shot (the photo shots take over after it). */
export const SCENE3_3D_SHARE = 0.30;
/** Tesla drive: Blender scene03_corridor (v5 daylight) rendered to a WebP sequence (every 2nd frame of 348 @ 24 fps) in public/frames/car. */
export const CAR_FRAMES = 174;
