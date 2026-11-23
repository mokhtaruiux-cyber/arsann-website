'use client';
import { Component, type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArsannLoader } from './ArsannLoader';
import { ExperienceCanvas } from './ExperienceCanvas';   // static import: three.js + the canvas ride in the first parallel JS download instead of a second, later request (the canvas only ever renders on the client: `enabled` is false on the server)
import { ScrollController } from './ScrollController';
import { Scene01Content } from './Scene01Content';
import { SceneLabels } from './SceneLabels';
import { SceneProgress } from './SceneProgress';
import { SiteHeader } from './SiteHeader';
import { PerformanceFallback, type FallbackReason } from './PerformanceFallback';
import type { ProjectedCity, ReconStats } from './EarthScene';
import type { Lang } from '@/content/scene01';
import { scene01Progress, scene02Progress, scene04Progress } from '@/lib/scene01/progress';
import { Scene03Content } from './Scene03Content';
import { Scene02Content } from './Scene02Content';
import { Scene03HorseCanvas } from './Scene03HorseCanvas';
import { readVariant } from '@/lib/recon/variant';

let webglOk: boolean | null = null;
function hasWebGL() {
  if (webglOk === null) {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      webglOk = !!gl && gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 2048;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch { webglOk = false; }
  }
  return webglOk;
}
/** Scroll length per scene in vh. Phones get ~55 % of the desktop length: a normal swipe then moves the story a clear step instead of needing very long drags. */
const lengths = (compact: boolean) => { const k = compact ? 0.55 : 1, a = 700 * k, b = 260 * k, c = 450 * k, d = 700 * k, t = a + b + c + d; return { total: t, split: a / t, split2: (a + b) / t, split3: (a + b + c) / t }; };
const isCompact = () => window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
const subscribeCompact = (cb: () => void) => { const m = window.matchMedia('(max-width: 820px), (pointer: coarse)'); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };
type Mode = 'pending' | 'live' | FallbackReason;
const subscribeMotion = (cb: () => void) => { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };
function envSnapshot(): Mode {
  const q = new URLSearchParams(window.location.search);
  if (q.get('motion') === 'reduce' || (q.get('motion') !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return 'reduced';
  if (q.get('webgl') === 'off' || !hasWebGL()) return 'webgl';
  return 'live';
}

class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Orchestrates Scene 01: persistent canvas + scroll owner + HTML layers. Decides live vs still-image fallback from device capability (never from user-agent sniffing). */
export function Scene01Experience({ lang }: { lang: Lang }) {
  const env = useSyncExternalStore(subscribeMotion, envSnapshot, (): Mode => 'pending');
  const [forced, setForced] = useState<FallbackReason | null>(null);
  const onFallback = useCallback((reason: FallbackReason) => setForced(current => current ?? reason), []);
  const mode = forced ?? env;
  if (mode !== 'pending' && mode !== 'live') return <PerformanceFallback lang={lang} reason={mode} />;
  return <Scene01Live lang={lang} enabled={mode === 'live'} onFallback={onFallback} />;
}

function Scene01Live({ lang, enabled, onFallback }: { lang: Lang; enabled: boolean; onFallback: (reason: FallbackReason) => void }) {
  const compact = useSyncExternalStore(subscribeCompact, isCompact, () => false); const L = lengths(compact); const [ready, setReady] = useState(false); const [shell, setShell] = useState(false); const [earthPaused, setEarthPaused] = useState(false); const [variant] = useState(() => readVariant());
  const projection = useRef<ProjectedCity[]>([]); const lowFps = useRef(0);
  const onStats = useCallback((s: ReconStats) => {
    if (!document.hidden && s.quality === 'low' && s.tier === 'low' && s.frames >= 30 && s.fps < 20) {
      if (++lowFps.current >= 3) onFallback('perf');
    } else lowFps.current = 0;
  }, [onFallback]);
  const onReady = useCallback(() => setReady(true), []); const onShell = useCallback(() => setShell(true), []);
  const [loading, setLoading] = useState(true);
  const dismissLoader = useCallback(() => setLoading(false), []);
  // Run after ScrollController creates/recreates Lenis (including compact layout changes).
  useLayoutEffect(() => {
    if (loading) scene01Progress.api?.stop();
    else scene01Progress.api?.start();
  }, [loading, compact]);
  const onLost = useCallback(() => onFallback('webgl'), [onFallback]);
  const onAssetError = useCallback(() => onFallback('assets'), [onFallback]);
  useEffect(() => { (window as unknown as { __scrollTo?: (p: number) => void }).__scrollTo = p => scene01Progress.api?.scrollTo(p, true); return () => { delete (window as unknown as { __scrollTo?: unknown }).__scrollTo; }; }, []);
  const [mount2, setMount2] = useState(false); const s2box = useRef<HTMLDivElement>(null); // Scenes 02 and 03 share one desert renderer.
  useEffect(() => {
    if (!ready || !enabled || loading) return;
    const c = (navigator as Navigator & { connection?: { downlink?: number; effectiveType?: string; saveData?: boolean } }).connection;
    const slow = c?.saveData || ['slow-2g', '2g', '3g'].includes(c?.effectiveType ?? '') || (c?.downlink ?? 10) < 3;
    let idleId: number | undefined;
    const mount = () => setMount2(true);
    // On constrained links skip eager loading; approaching the next scene still mounts it.
    const timer = slow ? undefined : window.setTimeout(() => {
      if (window.requestIdleCallback) idleId = window.requestIdleCallback(mount, { timeout: 1500 });
      else mount();
    }, 2500);
    const approaching = (p: number) => { if (p > 0.55) mount(); };
    const off = scene01Progress.subscribe(approaching);
    approaching(scene01Progress.ref.current);
    return () => { clearTimeout(timer); if (idleId !== undefined) window.cancelIdleCallback(idleId); off(); };
  }, [ready, enabled, loading]);
  useEffect(() => {
    if (!enabled) return; const ss_ = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const root = document.documentElement; root.dataset.sky = 'space';
    const offPause = scene02Progress.subscribe(p => setEarthPaused(prev => { const next = p > 0.06; return prev === next ? prev : next; }));
    const updSky = () => { const next = scene04Progress.ref.current > 0.66 ? 'space' : scene01Progress.ref.current > 0.9 || scene02Progress.ref.current > 0.02 ? 'day' : 'space'; /* the last third of the car drive is the dark Smart Parking garage: light text again */ if (root.dataset.sky !== next) root.dataset.sky = next; };   // header flips to daylight tokens as the clouds fill the frame
    const labFade = (p: number) => { const t = Math.min(1, Math.max(0, (p - 0.86) / 0.09)); root.style.setProperty('--labels-o', String(1 - t * t * (3 - 2 * t))); };   // city labels fade out as the clouds cover the globe
    const offLab = scene01Progress.subscribe(labFade);
    const offSky1 = scene01Progress.subscribe(updSky), offSky2 = scene02Progress.subscribe(updSky), offSky3 = scene04Progress.subscribe(updSky); const offSky = () => { offSky1(); offSky2(); offSky3(); };
    const off2 = scene02Progress.subscribe(p => { const el = s2box.current; if (!el) return; el.style.opacity = String(ss_(0, 0.05, p)); el.style.visibility = p > 0 ? 'visible' : 'hidden'; const st = el.parentElement; st?.setAttribute('data-s2', String(p > 0)); st?.style.setProperty('--s2-scrim', String(1 - ss_(0.02, 0.40, p))); st?.style.setProperty('--s2-text', String(1 - ss_(0, 0.06, p))); });
    return () => { off2(); offSky(); offLab(); root.style.removeProperty('--labels-o'); offPause(); delete root.dataset.sky; };
  }, [enabled]);
  return (
    <>
    {loading && <ArsannLoader lang={lang} ready={ready} onDismiss={dismissLoader} />}
    <ScrollController lengthVh={L.total} split={L.split} split2={L.split2} split3={L.split3} touch={compact} locked={loading}>
      <div className="s01-poster" data-hidden={ready} aria-hidden="true" />
      <div className="s01-canvas" data-ready={ready} data-shell={shell}>
        {enabled && <CanvasBoundary onError={onAssetError}><ExperienceCanvas onShell={onShell} paused={earthPaused} variant={variant} progressRef={scene01Progress.ref} projection={projection} onReady={onReady} onContextLost={onLost} onAssetError={onAssetError} onStats={onStats} /></CanvasBoundary>}
      </div>
      <div className="s01-sun" aria-hidden="true" />
      {enabled && <div ref={s2box} className="s02-canvas" aria-hidden="true">{mount2 && <Scene03HorseCanvas />}</div>}
      {enabled && <Scene02Content lang={lang} />}
      {enabled && ready && !loading && mount2 && <Scene03Content lang={lang} />}
      <SceneLabels projection={projection} lang={lang} variant={variant} />
      <Scene01Content lang={lang} />
      <SiteHeader lang={lang} />
      <SceneProgress lang={lang} />
    </ScrollController>
    </>
  );
}
