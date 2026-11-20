'use client';
import { useEffect, useRef } from 'react';
import { DICT, type Lang } from '@/content/scene01';
import { SCENE3_EYEBROW, SCENE3_NUM, SCENE3_SHOTS } from '@/content/scene03';
import { scene03Progress, scene04Progress } from '@/lib/scene01/progress';
import { Scene04Car } from './Scene04Car';
import { asset } from '@/lib/asset';
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Scene 03 + 04 overlay. The horse photos (The Guide, The Rein) crossfade over the live 3D Road shot with a slow push-in; at the end of Scene 03 the Tesla drive (Blender image sequence) fades in over the last photo while
 *  "Where the horse walked, the corridor runs." is on screen; "2026 — The same road." follows the car, and ARSANN appears when it parks. One block per shot, one set of ticks for the whole story.
 *  Everything is written straight to the DOM from the progress stores (no React re-render while scrolling). */
export function Scene03Content({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null); const d = DICT[lang];
  useEffect(() => {
    const el = root.current; if (!el) return;
    const photos = Array.from(el.querySelectorAll<HTMLElement>('[data-photo]')); const blocks = Array.from(el.querySelectorAll<HTMLElement>('[data-shot]')); const ticks = Array.from(el.querySelectorAll<HTMLElement>('[data-tick]'));
    const scrim = el.querySelector<HTMLElement>('[data-scrim]'); const sun = el.querySelector<HTMLElement>('[data-sun]'); const ui = el.querySelector<HTMLElement>('[data-ui]');
    const apply = () => {
      const p3 = scene03Progress.ref.current, p4 = scene04Progress.ref.current;
      el.style.visibility = p3 > 0 ? 'visible' : 'hidden';
      SCENE3_SHOTS.forEach((sh, i) => {
        const p = sh.scene === 3 ? p3 : p4; const [a, b, c, e] = sh.at; const ph = photos.find(x => x.dataset.photo === sh.id);
        if (ph) { const o = ss(a - 0.04, b - 0.04, p) * (p4 > 0.12 ? 0 : 1); ph.style.opacity = String(o); ph.style.visibility = o > 0 ? 'visible' : 'hidden'; const k = 1 + 0.09 * Math.min(1, Math.max(0, (p - (a - 0.04)) / 0.34)); ph.style.transform = `scale(${k.toFixed(4)})`; }
        const bl = blocks[i]; if (bl) {
          const v = ss(a, b, p) * (1 - ss(c, e, p)); bl.style.opacity = String(v); bl.style.visibility = v > 0.01 ? 'visible' : 'hidden'; bl.style.transform = `translate3d(0, ${((1 - ss(a, b, p)) * 18 + ss(c, e, p) * -10).toFixed(1)}px, 0)`;
          if (sh.subAt) { const sub = bl.querySelector<HTMLElement>('[data-sub]'); if (sub) { const so = ss(sh.subAt[0], sh.subAt[1], p); sub.style.opacity = String(so); sub.style.transform = `translate3d(0, ${((1 - so) * 12).toFixed(1)}px, 0)`; } }
        }
      });
      el.dataset.car = p4 > 0 ? 'true' : 'false'; if (scrim) scrim.style.opacity = String(Math.max(ss(0.16, 0.3, p3) * (1 - ss(0, 0.06, p4)), ss(0, 0.06, p4) * 0.34));
      if (sun) sun.style.opacity = String(ss(0, 0.1, p4) * (1 - ss(0.58, 0.68, p4)));   // warm midday sun over the daylight part of the drive, gone inside the garage
      let cur = 0; SCENE3_SHOTS.forEach((sh, i) => { const p = sh.scene === 3 ? p3 : p4; if (p >= sh.at[0] && (sh.scene === 3 || p4 > 0)) cur = i; }); ticks.forEach((t, i) => { t.dataset.active = String(i === cur); });
      if (ui) ui.style.opacity = String(ss(0.0, 0.08, p3));
    };
    apply(); const o1 = scene03Progress.subscribe(apply), o2 = scene04Progress.subscribe(apply); return () => { o1(); o2(); };
  }, []);
  useEffect(() => { // decode the photos one at a time in idle time (after the Earth + dive have settled), so the first cross-fade never stalls on JPEG decoding
    let dead = false; const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
    const idle = () => new Promise<void>(res => { if (w.requestIdleCallback) w.requestIdleCallback(() => res(), { timeout: 2000 }); else setTimeout(res, 80); });
    const run = async () => { await new Promise(res => setTimeout(res, 6000)); for (const x of SCENE3_SHOTS) { if (dead || !x.img) continue; await idle(); const i = new Image(); i.decoding = 'async'; i.src = asset(x.img as string); try { await i.decode(); } catch { /* ignore */ } } };
    void run(); return () => { dead = true; };
  }, []);
  return (
    <div ref={root} className="s03-root" dir={d.dir} lang={lang} style={{ visibility: 'hidden' }}>
      {SCENE3_SHOTS.filter(s => s.img).map(s => <div key={s.id} data-photo={s.id} className="s03-photo" style={{ backgroundImage: `url(${asset(s.img as string)})`, backgroundPosition: s.pos, opacity: 0, visibility: 'hidden' }} aria-hidden="true" />)}
      <Scene04Car />
      <div data-sun className="s04-sun" aria-hidden="true" style={{ opacity: 0 }} />
      <div data-scrim className="s03-scrim" aria-hidden="true" />
      {SCENE3_SHOTS.map(s => {
        const t = s[lang]; return (
          <section key={s.id} data-shot={s.id} data-left={lang === 'ar' && s.arLeft ? 'true' : 'false'} className="s03-block" style={{ opacity: 0, visibility: 'hidden' }}>
            <p className="t-caption s01-eyebrow">{SCENE3_EYEBROW[lang]}</p>
            <h2 className="t-h1">{t.head}</h2>
            {t.sub && <p className="t-body s01-body" data-sub={s.subAt ? '' : undefined} style={s.subAt ? { opacity: 0 } : undefined}>{t.sub}</p>}
          </section>
        );
      })}
      <nav data-ui className="s03-ui" aria-hidden="true"><span className="s01-progress-num">{SCENE3_NUM[lang]}</span><div className="s03-ticks">{SCENE3_SHOTS.map(s => <i key={s.id} data-tick={s.id} data-active="false" />)}</div></nav>
    </div>
  );
}
