'use client';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { scene01Progress, scene02Progress, scene03Progress } from '@/lib/scene01/progress';

/** Owns smooth scrolling (Lenis), the pinned ScrollTrigger and the progress publication. One scroll owner: Lenis is driven by gsap.ticker and feeds ScrollTrigger.
 *  Everything is created inside a gsap.context and torn down on unmount (route change / language switch / fallback). */
export function ScrollController({ lengthVh, split = 1, split2 = 1, children, onTimelineProgress }: { lengthVh: number; /** end of Scene 02's share (Scene 03 takes the rest) */ split2?: number; /** share of the scroll length that belongs to Scene 01 (the rest drives Scene 02) */ split?: number; children: ReactNode; onTimelineProgress?: (p: number) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = stage.current; if (!el) return; gsap.registerPlugin(ScrollTrigger);
    const prevRestoration = history.scrollRestoration; history.scrollRestoration = 'manual';
    const lenis = new Lenis({ autoRaf: false, lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    const tick = (t: number) => lenis.raf(t * 1000); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0); lenis.on('scroll', ScrollTrigger.update);
    let st: ScrollTrigger | null = null; const timers: number[] = [];
    // Extra damping on the published progress: the scenes follow a critically-damped version of the scroll, so wheel notches and trackpad flicks never step the camera.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; let target = 0, cur = 0, started = false, lastPub = -1;
    const cl = (x: number) => Math.min(1, Math.max(0, x)); const publishAll = (P: number) => { scene01Progress.publish(Math.min(1, P / split)); scene02Progress.publish(split < 1 ? cl((P - split) / (split2 - split)) : 0); scene03Progress.publish(split2 < 1 ? cl((P - split2) / (1 - split2)) : 0); onTimelineProgress?.(Math.min(1, P / split)); lastPub = P; };
    const damp = (_t: number, dtMs: number) => { if (!started || reduce) return; const k = 1 - Math.exp(-Math.min(0.05, dtMs / 1000) * 9); const nxt = cur + (target - cur) * k; cur = Math.abs(target - nxt) < 2e-5 ? target : nxt; if (cur !== lastPub) publishAll(cur); };
    gsap.ticker.add(damp);
    const ctx = gsap.context(() => { st = ScrollTrigger.create({ trigger: el, start: 'top top', end: `+=${lengthVh}%`, pin: true, scrub: true, anticipatePin: 1, onUpdate: s => { target = s.progress; if (!started) { started = true; cur = target; } if (reduce) { cur = target; publishAll(cur); } } }); }, el);
    scene01Progress.api = { scrollTo: (p, immediate = false) => { if (!st) return; lenis.scrollTo(st.start + p * split * (st.end - st.start), { immediate, force: true }); }, stop: () => lenis.stop(), start: () => lenis.start() };
    scene01Progress.publish(0); scene02Progress.publish(0); scene03Progress.publish(0);
    (window as unknown as { __scrollToTotal?: (P: number) => void }).__scrollToTotal = P => { if (st) lenis.scrollTo(st.start + P * (st.end - st.start), { immediate: true, force: true }); };
    try {
      const saved = sessionStorage.getItem('arsann-p');
      sessionStorage.removeItem('arsann-p');
      const [path, value] = saved?.split(':') ?? [];
      const target = Math.min(1, Math.max(0, Number(value)));
      if (path === location.pathname && target > 0) {
        for (const ms of [0, 80, 250, 600]) timers.push(window.setTimeout(() => { if (Math.abs(scene01Progress.ref.current - target) > 0.01) scene01Progress.api?.scrollTo(target, true); }, ms));
      }
    } catch { /* Continue when storage is unavailable. */ }
    return () => { timers.forEach(clearTimeout); ctx.revert(); gsap.ticker.remove(tick); gsap.ticker.remove(damp); lenis.destroy(); history.scrollRestoration = prevRestoration; scene01Progress.api = null; };
  }, [lengthVh, split, split2, onTimelineProgress]);
  return <div className="s01-root"><div ref={stage} className="s01-stage">{children}</div></div>;
}
