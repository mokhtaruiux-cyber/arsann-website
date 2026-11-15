'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { ReconCanvas, type ReconStats } from '@/components/recon/ReconScene';
import { CityLabels } from '@/components/recon/CityLabels';
import { COPY, type Lang } from '@/lib/scene01';

/** Reconstructed real-time Scene 01. Scroll = progress 0..1 driving the exported Blender camera clips. ?p=0.65 fixes progress; ?stage=1..6, ?tier=low|medium|high, ?debug=1, ?still=1 */
export default function ReconPage() {
  const search = useSyncExternalStore(() => () => {}, () => window.location.search, () => '');
  const q = new URLSearchParams(search); const fixed = q.get('p') !== null ? +(q.get('p') as string) : null; const stage = q.get('stage') ? +(q.get('stage') as string) : 6; const debug = q.get('debug') === '1', clean = q.get('clean') === '1', nolabels = q.get('nolabels') === '1';
  const progress = useRef(fixed ?? 0); const wrap = useRef<HTMLDivElement>(null); const registry = useRef(new Map<string, HTMLElement>());
  const [lang, setLang] = useState<Lang>('en'), [pct, setPct] = useState(0), [ready, setReady] = useState(false), [stats, setStats] = useState<ReconStats | null>(null);
  const c = COPY[lang];
  useEffect(() => {
    if (fixed !== null) { progress.current = fixed; return; }
    gsap.registerPlugin(ScrollTrigger); const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const lenis = new Lenis({ autoRaf: false, smoothWheel: !rm.matches, lerp: 0.1 }); lenis.on('scroll', ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0); let last = -1;
    const st = ScrollTrigger.create({ trigger: wrap.current, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => { progress.current = s.progress; const k = Math.round(s.progress * 100); if (k !== last) { last = k; setPct(k); } } });
    (window as unknown as { __scrollTo?: (p: number) => void }).__scrollTo = (p: number) => lenis.scrollTo(p * (document.documentElement.scrollHeight - innerHeight), { immediate: true });
    return () => { st.kill(); gsap.ticker.remove(tick); lenis.destroy(); ScrollTrigger.getAll().forEach(t => t.kill()); };
  }, [fixed]);
  const p = (fixed ?? pct / 100); let si = 0; c.stages.forEach((x, i) => { if (p >= x.at) si = i; }); const cur = c.stages[si];
  return (
    <div dir={c.dir} style={{ fontFamily: 'system-ui, sans-serif', color: '#D7D7C8', background: '#1E1E14' }}>
      <div className="fixed inset-0 z-0">
        <ReconCanvas stage={stage} tier={q.get('tier')} progressRef={progress} still={q.get('still') === '1'} progressive={q.get('progressive') !== '0'} registry={registry} onReady={() => setReady(true)} onStats={setStats} exposure={q.get('exp') ? +(q.get('exp') as string) : 1} />
        {!nolabels && <CityLabels registry={registry} lang={lang} />}
      </div>
      {!ready && <div className="fixed inset-0 z-20 grid place-items-center bg-[#1E1E14] text-sm" role="status" aria-live="polite">{lang === 'en' ? 'Preparing Earth…' : 'جارٍ تجهيز الأرض…'}</div>}
      {!clean && <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between p-4 text-xs"><span>ARSANN — Scene 01 (logo: official master pending)</span><button className="rounded border px-2 py-1" onClick={() => setLang(l => (l === 'en' ? 'ar' : 'en'))}>{lang === 'en' ? 'عربي' : 'EN'}</button></header>}
      {!clean && <section className="fixed inset-x-0 bottom-0 z-10 p-8"><div className="max-w-xl"><h1 className="text-5xl font-medium leading-tight">{cur.head}</h1>{cur.body && <p className="mt-3 opacity-70">{cur.body}</p>}
        <p className="mt-6 text-xs opacity-60">{c.limitation} · {lang === 'en' ? 'City labels are provisional and illustrative.' : 'تسميات المدن مبدئية وتوضيحية.'}</p></div></section>}
      {debug && <div data-testid="stats" className="fixed end-3 top-12 z-10 whitespace-pre rounded bg-black/70 p-2 font-mono text-[11px]">{`scroll ${pct}%\n` + (stats ? `${stats.fps} fps p95 ${stats.p95Ms} max ${stats.maxMs}\n>33ms ${stats.spikes33} · calls ${stats.calls} · progs ${stats.programs}\ngeo ${stats.geometries} tex ${stats.textures} · tier ${stats.tier}/${stats.quality}` : '…')}</div>}
      {fixed === null && <div ref={wrap} style={{ height: '700vh' }} />}
    </div>
  );
}
