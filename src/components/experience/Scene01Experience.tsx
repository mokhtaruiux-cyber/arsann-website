'use client';
import { Component, type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { ScrollController } from './ScrollController';
import { Scene01Content } from './Scene01Content';
import { SceneLabels } from './SceneLabels';
import { SceneProgress } from './SceneProgress';
import { SiteHeader } from './SiteHeader';
import { PerformanceFallback, type FallbackReason } from './PerformanceFallback';
import type { ProjectedCity, ReconStats } from './EarthScene';
import { DICT, type Lang } from '@/content/scene01';
import { scene01Progress, scene02Progress, scene03Progress } from '@/lib/scene01/progress';
import { SCENE3_3D_SHARE } from '@/content/scene03';
import { Scene03Content } from './Scene03Content';
import { Scene02Dive } from './Scene02Dive';
import { readVariant } from '@/lib/recon/variant';

const ExperienceCanvas = dynamic(() => import('./ExperienceCanvas').then(m => m.ExperienceCanvas), { ssr: false });
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
const SCENE1_VH = 700, SCENE2_VH = 380, SCENE3_VH = 450, SCROLL_VH = SCENE1_VH + SCENE2_VH + SCENE3_VH, SPLIT = SCENE1_VH / SCROLL_VH, SPLIT2 = (SCENE1_VH + SCENE2_VH) / SCROLL_VH;
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
  const [ready, setReady] = useState(false); const [earthPaused, setEarthPaused] = useState(false); const [variant] = useState(() => readVariant());
  const projection = useRef<ProjectedCity[]>([]); const lowFps = useRef(0); const d = DICT[lang];
  const onStats = useCallback((s: ReconStats) => {
    if (!document.hidden && s.quality === 'low' && s.tier === 'low' && s.frames >= 30 && s.fps < 20) {
      if (++lowFps.current >= 3) onFallback('perf');
    } else lowFps.current = 0;
  }, [onFallback]);
  const onReady = useCallback(() => setReady(true), []);
  const onLost = useCallback(() => onFallback('webgl'), [onFallback]);
  const onAssetError = useCallback(() => onFallback('assets'), [onFallback]);
  useEffect(() => { (window as unknown as { __scrollTo?: (p: number) => void }).__scrollTo = p => scene01Progress.api?.scrollTo(p, true); return () => { delete (window as unknown as { __scrollTo?: unknown }).__scrollTo; }; }, []);
  const [mount2, setMount2] = useState(false); const s2box = useRef<HTMLDivElement>(null); const s2active = useRef(false); const u3d = useRef(0);   // one 3D timeline (0..1 = 360 frames): Scene 02 is the first two thirds, the Road shot of Scene 03 the last third
  useEffect(() => { // pre-mount the desert dive a couple of seconds after the Earth is ready (idle time), so no scroll position pays the load / shader-compile cost
    if (!ready || !enabled) return; const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    const id = window.setTimeout(() => { if (idle) idle(() => setMount2(true), { timeout: 1500 }); else setMount2(true); }, 2500); return () => clearTimeout(id);
  }, [ready, enabled]);
  useEffect(() => {
    if (!enabled) return; const ss_ = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const off1 = scene01Progress.subscribe(p => { if (p > 0.55) { const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback; if (idle) idle(() => setMount2(true), { timeout: 800 }); else setTimeout(() => setMount2(true), 0); } });
    const root = document.documentElement; root.dataset.sky = 'space';
    const offPause = scene02Progress.subscribe(p => setEarthPaused(prev => { const next = p > 0.06; return prev === next ? prev : next; }));
    const updSky = () => { const next = scene01Progress.ref.current > 0.9 || scene02Progress.ref.current > 0.02 ? 'day' : 'space'; if (root.dataset.sky !== next) root.dataset.sky = next; };   // header flips to daylight tokens as the clouds fill the frame
    const labFade = (p: number) => { const t = Math.min(1, Math.max(0, (p - 0.86) / 0.09)); root.style.setProperty('--labels-o', String(1 - t * t * (3 - 2 * t))); };   // city labels fade out as the clouds cover the globe
    const offLab = scene01Progress.subscribe(labFade);
    const offSky1 = scene01Progress.subscribe(updSky), offSky2 = scene02Progress.subscribe(updSky); const offSky = () => { offSky1(); offSky2(); };
    const off2 = scene02Progress.subscribe(p => { const el = s2box.current; if (!el) return; s2active.current = p > 0 && scene03Progress.ref.current < 0.5; u3d.current = scene03Progress.ref.current > 0 ? 2 / 3 + Math.min(1, scene03Progress.ref.current / SCENE3_3D_SHARE) / 3 : p * 2 / 3; el.style.opacity = String(ss_(0, 0.05, p)); el.style.visibility = p > 0 ? 'visible' : 'hidden'; const st = el.parentElement; st?.setAttribute('data-s2', String(p > 0)); st?.style.setProperty('--s2-scrim', String(1 - ss_(0.02, 0.40, p))); st?.style.setProperty('--s2-text', String(1 - ss_(0, 0.06, p))); });
    const off3 = scene03Progress.subscribe(p3 => { if (p3 <= 0) return; s2active.current = p3 < 0.5; u3d.current = 2 / 3 + Math.min(1, p3 / SCENE3_3D_SHARE) / 3; });   // p3 = 0 means we are still in Scene 02, whose own subscriber drives the timeline
    return () => { off1(); off2(); off3(); offSky(); offLab(); root.style.removeProperty('--labels-o'); offPause(); delete root.dataset.sky; };
  }, [enabled]);
  return (
    <ScrollController lengthVh={SCROLL_VH} split={SPLIT} split2={SPLIT2}>
      <div className="s01-poster" data-hidden={ready} aria-hidden="true" />
      <div className="s01-canvas" data-ready={ready}>
        {enabled && <CanvasBoundary onError={onAssetError}><ExperienceCanvas paused={earthPaused} variant={variant} progressRef={scene01Progress.ref} projection={projection} onReady={onReady} onContextLost={onLost} onAssetError={onAssetError} onStats={onStats} /></CanvasBoundary>}
      </div>
      <div className="s01-sun" aria-hidden="true" />
      {enabled && <div ref={s2box} className="s02-canvas" aria-hidden="true">{mount2 && <Scene02Dive progressRef={u3d} activeRef={s2active} />}</div>}
      {enabled && <Scene03Content lang={lang} />}
      <SceneLabels projection={projection} lang={lang} variant={variant} />
      <Scene01Content lang={lang} />
      <SiteHeader lang={lang} />
      <SceneProgress lang={lang} />
    </ScrollController>
  );
}
