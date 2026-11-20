'use client';
import { CITIES } from '@/lib/recon/config';
import type { Lang } from '@/lib/scene01';
/** Accessible HTML city labels. Positions are written every frame by the Three.js projector (world-space marker -> screen), never hard-coded. */
export function CityLabels({ registry, lang }: { registry: React.RefObject<Map<string, HTMLElement>>; lang: Lang }) {
  return (
    <ul aria-label={lang === 'en' ? 'Provisional city labels (illustrative, not confirmed ARSANN locations)' : 'تسميات مدن مبدئية (توضيحية، ليست مواقع أرسان مؤكدة)'} className="pointer-events-none absolute inset-0 z-10 m-0 list-none overflow-hidden p-0" lang={lang}>
      {CITIES.map(c => (
        <li key={c.id} ref={el => { if (el) registry.current.set(c.id, el); else registry.current.delete(c.id); }} data-city={c.id} className={`absolute left-0 top-0 opacity-0 will-change-transform ${c.pri === 2 ? 'max-sm:hidden' : ''}`} style={{ transform: 'translate3d(-100px,-100px,0)' }}>
          <span className={`absolute top-0 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap ${c.side === 'R' ? 'left-1' : 'right-1 flex-row-reverse'}`}>
            <i className="block h-px w-4 bg-[#C8B9A5] sm:w-10" aria-hidden />
            <span className="rounded px-2 py-1 text-[11px] font-medium sm:text-[13px] tracking-wide text-[#D7D7C8]" style={{ background: 'rgba(30,30,20,0.6)', fontFamily: 'system-ui, sans-serif' }}>{lang === 'en' ? c.en : c.ar}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
