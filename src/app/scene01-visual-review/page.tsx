'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { ReconCanvas } from '@/components/recon/ReconScene';
import { CityLabels } from '@/components/recon/CityLabels';
import { useRef } from 'react';

const STATES = [0, 40, 65, 85, 100];
/** Left: Blender Cycles reference (brand v2, 1920x1080, AgX). Right: reconstructed real-time scene at the identical progress/camera. Same 16:9 box, same AgX tone mapping, exposure 1. */
export default function VisualReview() {
  const search = useSyncExternalStore(() => () => {}, () => window.location.search, () => '');
  const q = new URLSearchParams(search); const [sel, setSel] = useState<number | null>(null); const p = sel ?? (q.get('p') ? +(q.get('p') as string) : 65);
  const progress = useRef(0.65); useEffect(() => { progress.current = p / 100; }, [p]); const registry = useRef(new Map<string, HTMLElement>());
  return (
    <main className="min-h-screen bg-[#1E1E14] p-4 text-[#D7D7C8]" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm"><b>/scene01-visual-review</b> Blender Cycles (left) vs real-time Three.js (right) — same progress:
        {STATES.map(s => <button key={s} className={`rounded border px-2 py-1 ${s === p ? 'bg-white/20' : ''}`} onClick={() => setSel(s)}>{s}%</button>)}
        <span className="opacity-60">Reference frames contain no city labels; the right side shows the provisional HTML labels (add &amp;nolabels=1 to hide).</span></div>
      <div className="grid grid-cols-2 gap-3">
        <figure><div className="relative aspect-video overflow-hidden bg-black"><Image unoptimized fill alt={`Blender ${p}%`} src={`/reference/brand_p${String(p).padStart(3, '0')}.png`} className="object-cover" /></div><figcaption className="mt-1 text-xs">Blender Cycles reference — {p}%</figcaption></figure>
        <figure><div className="relative aspect-video overflow-hidden" data-testid="recon-box"><ReconCanvas stage={6} tier={q.get('tier')} progressRef={progress} still progressive={false} registry={registry} />{q.get('nolabels') !== '1' && <CityLabels registry={registry} lang="en" />}</div><figcaption className="mt-1 text-xs">Reconstructed real-time scene — {p}% (tier {q.get('tier') ?? 'auto'})</figcaption></figure>
      </div>
    </main>
  );
}
