'use client';
import { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Stage, LoadingBar } from '@/components/scene01/Stage';

const STATES = [0, 15, 40, 65, 85, 100];
export default function Compare() {
  const search = useSyncExternalStore(() => () => {}, () => window.location.search, () => '');
  const q = new URLSearchParams(search); const [pSel, setP] = useState<number | null>(null), [shiftSel, setShift] = useState<boolean | null>(null);
  const p = pSel ?? (q.get('p') ? +(q.get('p') as string) : 65), shift = shiftSel ?? q.get('shift') === '1', sun = q.get('sun') ? +(q.get('sun') as string) : 1, tone = (q.get('tone') ?? 'default') as 'default' | 'none' | 'agx' | 'neutral', amb = q.get('amb') ? +(q.get('amb') as string) : 0, hide = q.get('hide') ? (q.get('hide') as string).split(',') : [];
  return (
    <main className="min-h-screen bg-[#1E1E14] p-4 text-[#D7D7C8]" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm"><b>/scene01-compare</b> Blender (Cycles, approved) vs. exported GLB in the browser, same progress:
        {STATES.map(s => <button key={s} className={`rounded border px-2 py-1 ${s === p ? 'bg-white/20' : ''}`} onClick={() => setP(s)}>{s}%</button>)}
        <button className="rounded border px-2 py-1" onClick={() => setShift(!shift)}>Blender lens shift (not in GLB): {shift ? 'on' : 'off'}</button></div>
      <div className="grid grid-cols-2 gap-3">
        <figure><div className="relative aspect-video overflow-hidden"><Image unoptimized fill alt={`Blender ${p}%`} src={`/reference/blender_review_p${String(p).padStart(3, '0')}.png`} className="object-cover" /></div><figcaption className="mt-1 text-xs">Blender Cycles review frame — {p}%</figcaption></figure>
        <figure><div className="relative aspect-video overflow-hidden" data-testid="glb-box"><Stage progress={p / 100} sunScale={sun} tone={tone} ambient={amb} hide={hide} glbCamera lensShift={shift ? (pr: number) => -0.284 * Math.max(0, 1 - pr / 0.4) : undefined} orbit={false} /><LoadingBar /></div><figcaption className="mt-1 text-xs">GLB in React Three Fiber (as exported; lens shift is the Blender key from camera_path.json, optional)</figcaption></figure>
      </div>
    </main>
  );
}
