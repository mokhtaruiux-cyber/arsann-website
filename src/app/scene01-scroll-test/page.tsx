'use client';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Stage, LoadingBar } from '@/components/scene01/Stage';
import type { PerfStats } from '@/components/scene01/stats';
import { COPY, type Lang } from '@/lib/scene01';

export default function ScrollTest() {
  const progress = useRef(0); const wrap = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<Lang>('en'), [pct, setPct] = useState(0), [stats, setStats] = useState<PerfStats | null>(null), [shift, setShift] = useState(true);
  const reduced = useSyncExternalStore(cb => { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); }, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false);
  const c = COPY[lang];
  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ autoRaf: false, smoothWheel: !rm.matches, lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    let last = -1;
    const st = ScrollTrigger.create({ trigger: wrap.current, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: s => { progress.current = s.progress; const k = Math.round(s.progress * 100); if (k !== last) { last = k; setPct(k); } } });
    window.__s01 = { ...(window.__s01 ?? { stats: () => null, setGlbCamera: () => {}, ready: false, disposeLog: [] }), setProgress: (p: number | null) => { if (p !== null) { lenis.scrollTo(p * (document.documentElement.scrollHeight - innerHeight), { immediate: true }); } } } as NonNullable<Window['__s01']>;
    return () => { st.kill(); gsap.ticker.remove(tick); lenis.destroy(); ScrollTrigger.getAll().forEach(t => t.kill()); };
  }, []);
  const stage = useMemo(() => { let s = 0; c.stages.forEach((x, i) => { if (pct / 100 >= x.at) s = i; }); return s; }, [pct, c]);
  const cur = c.stages[stage];
  return (
    <div dir={c.dir} style={{ fontFamily: 'system-ui, sans-serif', color: '#D7D7C8' }}>
      <div className="fixed inset-0 z-0"><Stage progressRef={progress} glbCamera lensShift={shift ? (pr: number) => -0.284 * Math.max(0, 1 - pr / 0.4) : undefined} orbit={false} onStats={setStats} /><LoadingBar /></div>
      <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between p-4 text-xs"><span>ARSANN — scroll test (logo: official master pending)</span>
        <span className="flex gap-2"><button className="rounded border px-2 py-1" onClick={() => setLang(l => (l === 'en' ? 'ar' : 'en'))}>{lang === 'en' ? 'عربي' : 'EN'}</button><button className="rounded border px-2 py-1" onClick={() => setShift(v => !v)}>lens shift {shift ? 'on' : 'off'}</button></span></header>
      <section className="fixed inset-x-0 bottom-0 z-10 p-8"><div className="max-w-xl"><h1 className="text-5xl font-medium leading-tight">{cur.head}</h1>{cur.body && <p className="mt-3 opacity-70">{cur.body}</p>}<p className="mt-6 text-xs opacity-60">{c.limitation}{reduced ? ' · prefers-reduced-motion: smooth scrolling disabled' : ''}</p></div></section>
      <div className="fixed end-3 top-12 z-10 whitespace-pre rounded bg-black/70 p-2 font-mono text-[11px]" data-testid="stats">{`scroll ${pct}%\n` + (stats ? `${stats.fps} fps · p95 ${stats.p95Ms} ms · max ${stats.maxMs} ms\n>33ms: ${stats.spikes33}` : 'measuring…')}</div>
      <div ref={wrap} style={{ height: '700vh' }} />
    </div>
  );
}
