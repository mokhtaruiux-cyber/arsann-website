'use client';
import { useEffect, useRef } from 'react';
import { DICT, type Lang } from '@/content/scene01';
import { SCENE2_EYEBROW, SCENE2_LANDING } from '@/content/scene03';
import { scene02Progress } from '@/lib/scene01/progress';

const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Landing copy (Figma "00 Landing"): "A journey begins." / "2017", over the start of the desert dive. */
export function Scene02Content({ lang }: { lang: Lang }) {
  const box = useRef<HTMLElement>(null); const t = SCENE2_LANDING[lang]; const d = DICT[lang];
  useEffect(() => {
    const el = box.current; if (!el) return; const [a, b, c, e] = SCENE2_LANDING.at;
    const apply = (p: number) => { const v = ss(a, b, p) * (1 - ss(c, e, p)); el.style.opacity = String(v); el.style.visibility = v > 0.01 ? 'visible' : 'hidden'; el.style.transform = `translate3d(0, ${((1 - ss(a, b, p)) * 18 + ss(c, e, p) * -10).toFixed(1)}px, 0)`; };
    apply(scene02Progress.ref.current); return scene02Progress.subscribe(apply);
  }, []);
  return (
    <div className="s02-copy" dir={d.dir} lang={lang}>
      <section ref={box} className="s03-block" style={{ opacity: 0, visibility: 'hidden' }}>
        <p className="t-caption s01-eyebrow">{SCENE2_EYEBROW[lang]}</p>
        <h2 className="t-h1">{t.head}</h2>
        <p className="t-body s01-body">{t.sub}</p>
      </section>
    </div>
  );
}
