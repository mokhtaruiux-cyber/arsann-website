export const GLB_URL = '/models/scene01/scene01_origin.glb';
/** Export (Scene animation mode) samples the 240-frame remapped timeline at 24 fps => 10 s for progress 0..1. */
export const GLB_ANIM_SECONDS = 240 / 24;
export const BRAND = { charcoal: '#1E1E14', slate: '#5A5A50', stone: '#D7D7C8', pearl: '#FAFAF5', burgundy: '#281414', copper: '#64412D', rosewood: '#D2BEBE', lightGold: '#C8B9A5' } as const;
export type Lang = 'en' | 'ar';
export const COPY: Record<Lang, { dir: 'ltr' | 'rtl'; title: string; stages: { at: number; head: string; body?: string }[]; limitation: string; scroll: string }> = {
  en: { dir: 'ltr', title: 'Scene 01 — technical baseline', scroll: 'Scroll', limitation: 'Placeholder UI typography: General Sans is not bundled yet.',
    stages: [ { at: 0, head: 'Guided arrival.', body: 'Valet, parking and integrated mobility.' }, { at: 0.38, head: 'Built in Saudi Arabia.' }, { at: 0.62, head: 'Across the Kingdom.' }, { at: 0.82, head: 'Every place, connected.' }, { at: 0.96, head: 'Every arrival, handled.' } ] },
  ar: { dir: 'rtl', title: 'المشهد ٠١ — اختبار تقني', scroll: 'مرِّر', limitation: 'خط مؤقت للواجهة: خط 29LT Zarid Slab المعتمد غير متوفر بعد.',
    stages: [ { at: 0, head: 'وصول موجَّه.', body: 'صف السيارات والمواقف والتنقل المتكامل.' }, { at: 0.38, head: 'بُني في المملكة العربية السعودية.' }, { at: 0.62, head: 'في أنحاء المملكة.' }, { at: 0.82, head: 'كل مكان، متصل.' }, { at: 0.96, head: 'كل وصول، بعناية.' } ] },
};
