import type { Lang } from './scene01';
/** Scene 03 — Heritage. Copy is taken from the Figma frames (page "Scene 03 — Screens"): The Road (28:202), The Guide (28:82), The Rein (28:107), Line of Light (28:134). PM-site copy, to be validated by ARSANN.
 *  `arLeft` = the Arabic block sits on the physical left (The Guide); every other Arabic block sits on the right, like the Arabic Figma frames. */
export type Scene03Shot = { id: 'road' | 'guide' | 'rein' | 'line'; at: [number, number, number, number]; img?: string; pos?: string; /** the Figma frame shows this photo mirrored */ flip?: boolean; en: { head: string; sub?: string; note?: string }; ar: { head: string; sub?: string; note?: string }; arLeft?: boolean };
/** `at` = [fade-in start, fully in, start fading out, fully out] on Scene 03's own 0..1 progress. */
export const SCENE3_SHOTS: Scene03Shot[] = [
  { id: 'road', at: [0.10, 0.20, 0.30, 0.35], en: { head: 'Where the horse walked, the corridor runs.' }, ar: { head: 'حيث سار الحصان، يمتدّ الممرّ.' } },
  { id: 'guide', at: [0.40, 0.50, 0.58, 0.63], img: '/images/scene03/guide.jpg', pos: '30% 50%', en: { head: 'From horses to intelligent mobility.' }, ar: { head: 'من الخيل إلى التنقّل الذكي.' }, arLeft: true },
  { id: 'rein', at: [0.66, 0.74, 0.80, 0.85], img: '/images/scene03/rein.jpg', pos: '50% 50%', en: { head: 'From movement to mobility intelligence.', sub: 'ARSANN', }, ar: { head: 'من الحركة إلى ذكاء التنقّل.', sub: 'أرسان', } },
  { id: 'line', at: [0.88, 0.94, 1.1, 1.2], img: '/images/scene03/line.jpg', pos: '50% 50%', flip: true, en: { head: '2026 — The same road.', sub: 'ARSANN — Saudi Arabia.', }, ar: { head: '٢٠٢٦ — الطريق نفسه.', sub: 'أرسان — المملكة العربية السعودية.', } },
];
export const SCENE3_EYEBROW: Record<Lang, string> = { en: '03 — ORIGIN', ar: '٠٣ — البداية' };
export const SCENE3_NUM: Record<Lang, string> = { en: '03', ar: '٠٣' };
/** Share of Scene 03's scroll that drives the live 3D Road shot (the photo shots take over after it). */
export const SCENE3_3D_SHARE = 0.30;
