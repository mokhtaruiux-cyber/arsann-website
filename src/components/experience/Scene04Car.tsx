'use client';
import { useEffect, useRef } from 'react';
import { scene02Progress, scene03Progress, scene04Progress } from '@/lib/scene01/progress';
import { CAR_FRAMES as N } from '@/content/scene03';
import { asset } from '@/lib/asset';
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const url = (i: number) => asset(`/frames/car/f_${String(1 + 2 * i).padStart(4, '0')}.webp`);

/** Scene 04: the Blender drive, scrubbed by scroll. Frames are fetched as small WebP blobs (about 5 MB in all, coarse frames first) and only a short window around the current frame is decoded,
 *  so memory stays low on phones. Neighbouring frames are cross-blended only around the half-way point (short, to avoid ghosting while the camera moves fast). */
export function Scene04Car() {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = cv.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    const blobs: (Blob | undefined)[] = new Array(N).fill(undefined); const bmps = new Map<number, ImageBitmap>(); const pending = new Set<number>();
    let cur = 0, vis = 0, started = false, dead = false, raf = 0, w = 0, h = 0;
    const draw = () => {
      raf = 0; if (!vis || !w) return; const i0 = Math.min(N - 1, Math.max(0, Math.floor(cur))), t = cur - i0;
      const get = (i: number) => { if (bmps.has(i)) return bmps.get(i); for (let d = 1; d < 40; d++) { const a = bmps.get(i - d) ?? bmps.get(i + d); if (a) return a; } return undefined; };
      const paint = (b: ImageBitmap, alpha: number) => { const s = Math.max(w / b.width, h / b.height); const dw = b.width * s, dh = b.height * s; ctx.globalAlpha = alpha; ctx.drawImage(b, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh); };
      const a = get(i0); if (!a) return; ctx.clearRect(0, 0, w, h); paint(a, 1); const bt = ss(0.4, 0.6, t); if (bt > 0.01 && i0 + 1 < N) { const b = get(i0 + 1); if (b && b !== a) paint(b, bt); } ctx.globalAlpha = 1;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const ensure = () => {
      const c = Math.round(cur); for (let i = c - 3; i <= c + 7; i++) { if (i < 0 || i >= N || bmps.has(i) || pending.has(i) || !blobs[i]) continue; pending.add(i); createImageBitmap(blobs[i] as Blob).then(b => { pending.delete(i); if (dead || Math.abs(i - Math.round(cur)) > 12) { b.close(); return; } bmps.set(i, b); schedule(); }).catch(() => pending.delete(i)); }
      for (const [i, b] of bmps) if (i < c - 8 || i > c + 14) { b.close(); bmps.delete(i); }
    };
    const resize = () => { const dpr = Math.min(1.5, window.devicePixelRatio || 1); w = Math.max(2, Math.round(canvas.clientWidth * dpr)); h = Math.max(2, Math.round(canvas.clientHeight * dpr)); canvas.width = w; canvas.height = h; schedule(); };
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
    const load = async () => {
      if (started) return; started = true; const order = [...Array(N).keys()].sort((a, b) => ((a % 6 === 0 ? 0 : 1) - (b % 6 === 0 ? 0 : 1)) || a - b); let k = 0;
      const worker = async () => { while (!dead && k < order.length) { const i = order[k++]; try { const r = await fetch(url(i)); if (r.ok) { blobs[i] = await r.blob(); if (Math.abs(i - cur) < 12) { ensure(); } } } catch { /* a missing frame is skipped */ } } };
      await Promise.all([worker(), worker(), worker(), worker()]); ensure(); schedule();
    };
    const onP4 = (p: number) => { cur = p * (N - 1); vis = ss(0, 0.1, p); canvas.style.opacity = String(vis); canvas.style.visibility = vis > 0 ? 'visible' : 'hidden'; if (vis > 0) { void load(); ensure(); schedule(); } };
    const early = () => { if (scene02Progress.ref.current > 0.4 || scene03Progress.ref.current > 0) void load(); };
    const off1 = scene04Progress.subscribe(onP4), off2 = scene02Progress.subscribe(early), off3 = scene03Progress.subscribe(early); onP4(scene04Progress.ref.current); early();
    return () => { dead = true; off1(); off2(); off3(); ro.disconnect(); if (raf) cancelAnimationFrame(raf); bmps.forEach(b => b.close()); bmps.clear(); };
  }, []);
  return <canvas ref={cv} className="s04-car" aria-hidden="true" style={{ opacity: 0, visibility: 'hidden' }} />;
}
