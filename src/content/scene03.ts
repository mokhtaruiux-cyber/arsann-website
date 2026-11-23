import type { Lang } from './scene01';
/** Figma copy is timed to the visible 3D actions: landing → road → horse face → hand/lead → gold lead dissolves toward the halter → steering wheel.
 *  `arLeft` = the Arabic block sits on the physical left (The Guide); every other Arabic block sits on the right, like the Arabic Figma frames. */
export type Scene03Shot = { id: 'guide' | 'rein' | 'road' | 'line'; /** which progress channel drives it */ scene: 3 | 4; at: [number, number, number, number]; /** independent reveal for the concluding subline */ subAt?: [number, number]; subScene?: 3 | 4; en: { head: string; sub?: string }; ar: { head: string; sub?: string }; arLeft?: boolean };
/** `at` = [fade-in start, fully in, start fading out, fully out] on the shot's own 0..1 progress. */
export const SCENE3_SHOTS: Scene03Shot[] = [
  { id: 'road', scene: 3, at: [0.16, 0.21, 0.34, 0.40], en: { head: 'Where the horse walked, the corridor runs.' }, ar: { head: 'حيث سار الحصان، يمتدّ الممرّ.' } },
  { id: 'guide', scene: 3, at: [0.43, 0.50, 0.58, 0.64], en: { head: 'From horses to intelligent mobility.' }, ar: { head: 'من الخيل إلى التنقّل الذكي.' }, arLeft: true },
  { id: 'rein', scene: 3, at: [0.66, 0.74, 0.84, 0.89], en: { head: 'From movement to mobility intelligence.', sub: 'ARSANN' }, ar: { head: 'من الحركة إلى ذكاء التنقّل.', sub: 'أرسان' } },
  { id: 'line', scene: 3, at: [0.89, 0.93, 1.2, 1.3], subScene: 4, subAt: [0.80, 0.87], en: { head: '2026 — The same road.', sub: 'ARSANN — Saudi Arabia.' }, ar: { head: '٢٠٢٦ — الطريق نفسه.', sub: 'أرسان — المملكة العربية السعودية.' } },
];
/** Landing (Figma 28:28): the first copy of the story, over the start of the desert dive. Driven by Scene 02's own 0..1 progress. */
export const SCENE2_LANDING = { at: [0.04, 0.09, 0.17, 0.23] as [number, number, number, number], en: { head: 'A journey begins.', sub: '2017' }, ar: { head: 'تبدأ الرحلة.', sub: '٢٠١٧' } };
export const SCENE2_EYEBROW: Record<Lang, string> = { en: '02 — THE DIVE', ar: '٠٢ — البداية' };
export const SCENE3_EYEBROW: Record<Lang, string> = { en: '03 — HERITAGE', ar: '٠٣ — البداية' };
export const SCENE3_NUM: Record<Lang, string> = { en: '03', ar: '٠٣' };
/** Tesla drive: Blender scene03_corridor (v5 daylight) rendered to a WebP sequence (every 2nd frame of 348 @ 24 fps) in public/frames/car. */
export const CAR_FRAMES = 174;
