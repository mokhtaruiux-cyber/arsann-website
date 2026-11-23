'use client';
import { useRef, useState } from 'react';
import { Stage, type StageHandle, LoadingBar } from '@/components/scene01/Stage';
import type { PerfStats } from '@/components/scene01/stats';
import { COPY, type Lang } from '@/lib/scene01';
import { LAYERS } from '@/lib/glbOps';

export default function Scene01Test() {
  const stage = useRef<StageHandle>(null);
  const [wire, setWire] = useState(false), [sun, setSun] = useState(1), [amb, setAmb] = useState(0), [tone, setTone] = useState<'default' | 'none' | 'agx' | 'neutral'>('default');
  const [playing, setPlaying] = useState(false), [glbCam, setGlbCam] = useState(false), [scrub, setScrub] = useState<number | null>(null), [shift, setShift] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [stats, setStats] = useState<PerfStats | null>(null), [clips, setClips] = useState<{ names: string[]; cams: number }>({ names: [], cams: 0 }), [lang, setLang] = useState<Lang>('en');
  const c = COPY[lang];
  return (
    <main dir={c.dir} className="relative h-screen w-screen overflow-hidden bg-[#1E1E14] text-[#D7D7C8]" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <Stage ref={stage} wireframe={wire} sunScale={sun} ambient={amb} tone={tone} playing={playing} progress={scrub} hide={hidden} glbCamera={glbCam} lensShift={shift ? () => -0.284 : undefined} onStats={setStats} onClips={(n, k) => setClips({ names: n, cams: k })} />
      <LoadingBar />
      <aside className="absolute start-3 top-3 z-10 w-[310px] space-y-2 rounded bg-black/70 p-3 text-xs">
        <div className="text-sm font-medium">{c.title} · /scene01-test</div>
        <div className="opacity-70">GLB shown as exported (no effects). {c.limitation}</div>
        <div className="flex flex-wrap gap-1">
          <button className="rounded border px-2 py-1" onClick={() => stage.current?.resetCamera()}>Reset camera</button>
          <button className="rounded border px-2 py-1" onClick={() => setWire(w => !w)}>Wireframe: {wire ? 'on' : 'off'}</button>
          <button className="rounded border px-2 py-1" onClick={() => setLang(l => (l === 'en' ? 'ar' : 'en'))}>{lang === 'en' ? 'عربي' : 'EN'}</button>
        </div>
        <label className="block">Sun (GLB lux ×) {sun.toExponential(1)}<input className="w-full" type="range" min={-4} max={0} step={0.1} value={Math.log10(sun)} onChange={e => setSun(10 ** +e.target.value)} /></label>
        <label className="block">Ambient {amb.toFixed(2)}<input className="w-full" type="range" min={0} max={2} step={0.05} value={amb} onChange={e => setAmb(+e.target.value)} /></label>
        <label className="block">Tone mapping <select className="ms-2 text-black" value={tone} onChange={e => setTone(e.target.value as never)}><option value="default">R3F default (ACES)</option><option value="none">None</option><option value="agx">AgX</option><option value="neutral">Neutral</option></select></label>
        <div className="border-t border-white/20 pt-2">Layers (diagnostic visibility)<div className="flex flex-wrap gap-x-2">{LAYERS.map(l => <label key={l}><input type="checkbox" checked={!hidden.includes(l)} onChange={e => setHidden(h => (e.target.checked ? h.filter(x => x !== l) : [...h, l]))} /> {l}</label>)}</div></div>
        <div className="border-t border-white/20 pt-2">GLB animation clips: {clips.names.length} · cameras: {clips.cams}</div>
        <div className="flex flex-wrap gap-1">
          <button className="rounded border px-2 py-1" disabled={!clips.names.length} onClick={() => { setScrub(null); setPlaying(p => !p); }}>{playing ? 'Pause' : 'Play'} clips</button>
          <button className="rounded border px-2 py-1" disabled={!clips.cams} onClick={() => setGlbCam(v => !v)}>GLB camera: {glbCam ? 'on' : 'off'}</button>
          <button className="rounded border px-2 py-1" disabled={!glbCam} onClick={() => setShift(v => !v)}>Lens shift (Blender, not in GLB): {shift ? 'on' : 'off'}</button>
        </div>
        <label className="block">Scrub progress {scrub === null ? '—' : (scrub * 100).toFixed(0) + '%'}<input className="w-full" type="range" min={0} max={1} step={0.01} value={scrub ?? 0} onChange={e => { setPlaying(false); setScrub(+e.target.value); }} /></label>
        <div className="flex gap-1">{[0, 0.15, 0.4, 0.65, 0.85, 1].map(p => <button key={p} className="rounded border px-1.5 py-0.5" onClick={() => { setPlaying(false); setGlbCam(true); setScrub(p); }}>{p * 100}%</button>)}</div>
      </aside>
      <div className="absolute end-3 top-3 z-10 whitespace-pre rounded bg-black/70 p-2 font-mono text-[11px]" data-testid="stats">
        {stats ? `${stats.fps} fps · avg ${stats.avgMs} ms\np95 ${stats.p95Ms} ms · max ${stats.maxMs} ms · >33ms: ${stats.spikes33}\ndraw calls ${stats.calls} · tris ${stats.triangles}\ngeometries ${stats.geometries} · textures ${stats.textures}\nmax tex ${stats.maxTex} · ${stats.gpu}` : 'measuring…'}
      </div>
    </main>
  );
}
