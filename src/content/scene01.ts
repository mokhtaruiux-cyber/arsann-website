export type Lang = 'en' | 'ar';
export const LANGS: Lang[] = ['en', 'ar'];
export const isLang = (v: string): v is Lang => v === 'en' || v === 'ar';
/** Scroll checkpoints (percent of the single Scene 01 timeline). They are waypoints on one continuous animation, not slides. */
export const CHECKPOINTS = [0, 15, 40, 65, 85, 100] as const;
export type StateDef = { at: number; head?: string; body?: string; note?: string; zone: 'safe' | 'start'; narrow?: boolean };
type Dict = {
  dir: 'ltr' | 'rtl'; htmlTitle: string; description: string; brand: string; eyebrow: string; scroll: string; cont: string; skip: string;
  nav: { id: string; label: string }[]; menu: string; close: string; langName: string; otherLang: { code: Lang; label: string; name: string };
  progressLabel: string; goTo: string; states: StateDef[]; navNote: string; labelsAria: string; staticNotice: Record<'reduced' | 'webgl' | 'perf' | 'assets', string>; outlineTitle: string;
};
export const DICT: Record<Lang, Dict> = {
  en: {
    dir: 'ltr', htmlTitle: 'ARSANN — Guided arrival', description: 'ARSANN: valet, parking and integrated mobility in Saudi Arabia. Scene 01 of the cinematic site (work in progress).', brand: 'ARSANN', eyebrow: '01 — ORIGIN', scroll: 'Scroll', cont: 'Continue ↓', skip: 'Skip to content',
    nav: [{ id: 'solutions', label: 'Solutions' }, { id: 'technology', label: 'Technology' }, { id: 'projects', label: 'Projects' }, { id: 'about', label: 'About' }, { id: 'contact', label: 'Contact' }], menu: 'Menu', close: 'Close', langName: 'English', otherLang: { code: 'ar', label: 'AR', name: 'العربية' },
    progressLabel: 'Scene progress', goTo: 'Go to', navNote: 'Not part of this milestone', labelsAria: 'City labels — provisional and illustrative, not confirmed ARSANN locations',
    staticNotice: { reduced: 'Reduced motion is on: showing the still version of the scene.', webgl: '3D is unavailable on this device: showing the still version of the scene.', perf: 'This device cannot run the 3D scene smoothly: showing the still version.', assets: 'The 3D scene could not load. Here is the still version.' },
    outlineTitle: 'Scene 01 outline',
    states: [
      { at: 0, head: 'Guided arrival.', body: 'Valet, parking and integrated mobility.', zone: 'safe' }, { at: 15, zone: 'safe' }, { at: 40, head: 'Built in Saudi Arabia.', zone: 'safe' },
      { at: 65, head: 'Across the Kingdom.', body: 'One standard of service, wherever you arrive.', zone: 'start' },
      { at: 85, head: 'Every place, connected.', body: 'A single service network.', zone: 'start', narrow: true },
      { at: 100, head: 'Every arrival, handled.', zone: 'start', narrow: true },
    ],
  },
  ar: {
    dir: 'rtl', htmlTitle: 'أرسان — وصول موجَّه', description: 'أرسان: صف السيارات والمواقف والتنقل المتكامل في المملكة العربية السعودية. المشهد ٠١ من الموقع السينمائي (قيد التنفيذ).', brand: 'أرسان', eyebrow: '٠١ — البداية', scroll: 'مرِّر', cont: 'تابع ↓', skip: 'انتقل إلى المحتوى',
    nav: [{ id: 'solutions', label: 'الحلول' }, { id: 'technology', label: 'التقنية' }, { id: 'projects', label: 'المشاريع' }, { id: 'about', label: 'من نحن' }, { id: 'contact', label: 'تواصل معنا' }], menu: 'القائمة', close: 'إغلاق', langName: 'العربية', otherLang: { code: 'en', label: 'EN', name: 'English' },
    progressLabel: 'تقدّم المشهد', goTo: 'انتقل إلى', navNote: 'ليس ضمن هذه المرحلة', labelsAria: 'تسميات مدن — مبدئية وتوضيحية وليست مواقع أرسان مؤكدة',
    staticNotice: { reduced: 'خيار تقليل الحركة مفعّل: نعرض النسخة الثابتة من المشهد.', webgl: 'الرسوم ثلاثية الأبعاد غير متاحة على هذا الجهاز: نعرض النسخة الثابتة من المشهد.', perf: 'لا يستطيع هذا الجهاز تشغيل المشهد ثلاثي الأبعاد بسلاسة: نعرض النسخة الثابتة.', assets: 'تعذّر تحميل المشهد ثلاثي الأبعاد. نعرض النسخة الثابتة.' },
    outlineTitle: 'مخطط المشهد ٠١',
    states: [
      { at: 0, head: 'وصول موجَّه.', body: 'صف السيارات والمواقف والتنقل المتكامل.', zone: 'safe' }, { at: 15, zone: 'safe' }, { at: 40, head: 'بُني في المملكة العربية السعودية.', zone: 'safe' },
      { at: 65, head: 'في أنحاء المملكة.', body: 'معيار خدمة واحد، أينما وصلت.', zone: 'start' },
      { at: 85, head: 'كل مكان، متصل.', body: 'شبكة خدمة واحدة.', zone: 'start', narrow: true },
      { at: 100, head: 'كل وصول، بعناية.', zone: 'start', narrow: true },
    ],
  },
};
