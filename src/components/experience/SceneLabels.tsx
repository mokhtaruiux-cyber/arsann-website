'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { CITIES } from '@/lib/recon/config';
import { DICT, type Lang } from '@/content/scene01';
import { scene01Progress } from '@/lib/scene01/progress';
import type { ProjectedCity } from './EarthScene';
import type { Variant } from '@/lib/recon/variant';

const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
type R = { l: number; t: number; r: number; b: number };
const hit = (a: R, b: R) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

/** City labels are PROVISIONAL, illustrative text positioned from real lon/lat projected by the Earth camera each frame.
 *  The DOM layer only decides visibility: priority order, no label overlaps another, none overlaps the headline/copy, header or progress indicator. Nothing here implies an ARSANN location. */
export function SceneLabels({ projection, lang, variant = 'v3' }: { projection: React.RefObject<ProjectedCity[]>; lang: Lang; variant?: Variant }) {
  const d = DICT[lang]; const box = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const root = box.current; if (!root) return; const els = new Map<string, HTMLElement>(); root.querySelectorAll<HTMLElement>('[data-city]').forEach(e => els.set(e.dataset.city as string, e));
    const size = new Map<string, { w: number; h: number }>(); const shown = new Set<string>(); let excl: R[] = []; let tick = 0;
    const measure = () => { els.forEach((e, id) => {
      const label = e.querySelector('span');
      if (label) size.set(id, { w: label.offsetWidth + (window.innerWidth <= 640 ? 12 : 20), h: label.offsetHeight });
    }); };
    const collect = () => { const sel = ['.s01-header', '.s01-progress', '.s01-block[data-state="85"] > *']; excl = []; sel.forEach(s => document.querySelectorAll(s).forEach(n => { const b = n.getBoundingClientRect(); if (b.width > 0) excl.push({ l: b.left - 8, t: b.top - 8, r: b.right + 8, b: b.bottom + 8 }); })); };
    measure(); collect(); document.fonts?.ready.then(() => { measure(); }); const onResize = () => { measure(); collect(); }; window.addEventListener('resize', onResize);
    const loop = () => {
      const p = scene01Progress.ref.current; const a = variant === 'v3' ? ss(0.64, 0.72, p) * (1 - ss(0.86, 0.95, p)) : ss(0.80, 0.87, p) * (1 - ss(0.93, 0.97, p)); const proj = projection.current;
      if (a < 0.01 || !proj.length) { if (shown.size) els.forEach(e => { e.style.opacity = '0'; }); shown.clear(); tick = 0; return; }
      if ((tick++ & 3) === 0) collect();
      const W = window.innerWidth, H = window.innerHeight; const placed: R[] = []; const vis = new Map<string, number>();
      const order = [...CITIES].sort((x, y) => (x.pri - y.pri) || (Number(shown.has(y.id)) - Number(shown.has(x.id))));
      for (const c of order) {
        const pc = proj.find(q => q.id === c.id); const e = els.get(c.id); const s = size.get(c.id); if (!pc || !e || !s) continue;
        const ok = pc.inFront && pc.facing > 0.18 && pc.x > 12 && pc.x < W - 12 && pc.y > 12 && pc.y < H - 12;
        const r: R = c.side === 'R' ? { l: pc.x - 4, r: pc.x + s.w, t: pc.y - s.h / 2, b: pc.y + s.h / 2 } : { l: pc.x - s.w, r: pc.x + 4, t: pc.y - s.h / 2, b: pc.y + s.h / 2 };
        if (ok && r.l > 4 && r.r < W - 4 && !placed.some(q => hit(q, r)) && !excl.some(q => hit(q, r))) { placed.push(r); vis.set(c.id, ss(0.18, 0.4, pc.facing)); e.style.transform = `translate3d(${pc.x.toFixed(1)}px, ${pc.y.toFixed(1)}px, 0)`; }
      }
      shown.clear(); els.forEach((e, id) => { const v = vis.get(id); if (v === undefined) { e.style.opacity = '0'; } else { shown.add(id); e.style.opacity = String(a * v); } });
    };
    gsap.ticker.add(loop);
    return () => { gsap.ticker.remove(loop); window.removeEventListener('resize', onResize); };
  }, [projection, d.dir, variant]);
  return (
    <ul ref={box} className="s01-labels" data-variant={variant} suppressHydrationWarning aria-label={d.labelsAria} lang={lang}>
      {CITIES.map(c => (
        <li key={c.id} data-city={c.id} data-side={c.side} dir={d.dir} style={{ opacity: 0 }}><i aria-hidden="true" /><span>{lang === 'en' ? c.en : c.ar}</span></li>
      ))}
    </ul>
  );
}
