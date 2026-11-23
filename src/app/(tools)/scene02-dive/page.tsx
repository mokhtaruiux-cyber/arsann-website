'use client';
import { useEffect, useRef, useState } from 'react';
import { Scene03HorseCanvas } from '@/components/experience/Scene03HorseCanvas';

/** Standalone review: ?p=0.5 for the dive, ?heritage=0.5 for the horse camera rail. */
export default function Scene02Page() {
  const pr = useRef(0), landed = useRef(1); const playing = useRef(true); const [p, setP] = useState(0); const [on, setOn] = useState(true); const [heritage, setHeritage] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search); const h = q.get('heritage'); setHeritage(h !== null); const fixed = h ?? q.get('p'); if (fixed !== null) { pr.current = +fixed; playing.current = false; setOn(false); setP(+fixed); } else if (q.get('autoplay') === '0') { playing.current = false; setOn(false); }
    let last = performance.now(), raf = 0; const tick = () => { raf = requestAnimationFrame(tick); const n = performance.now(), dt = (n - last) / 1000; last = n; if (playing.current) { pr.current += dt / 15; if (pr.current > 1.05) pr.current = 0; setP(Math.min(1, pr.current)); } }; tick();
    (window as unknown as { __setP?: (x: number) => void }).__setP = (x: number) => { pr.current = x; playing.current = false; setOn(false); setP(x); };
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1E1E14', color: '#D7D7C8', fontFamily: 'system-ui, sans-serif' }}>
      <Scene03HorseCanvas diveProgressRef={heritage ? landed : pr} heritageProgressRef={heritage ? pr : undefined} standalone />
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(30,30,20,.55)', padding: '8px 12px', borderRadius: 8, zIndex: 5 }}>
        <button onClick={() => { playing.current = !playing.current; setOn(playing.current); }} style={{ width: 70 }}>{on ? 'Pause' : 'Play'}</button>
        <input type="range" min={0} max={1000} value={Math.round(p * 1000)} onChange={e => { pr.current = +e.target.value / 1000; playing.current = false; setOn(false); setP(pr.current); }} style={{ flex: 1 }} />
        <span style={{ width: 120, fontSize: 12 }}>{heritage ? 'Scene 3' : 'Scene 2'} · {Math.round(p * 100)}%</span>
      </div>
    </div>
  );
}
