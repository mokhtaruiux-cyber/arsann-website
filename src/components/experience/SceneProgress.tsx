'use client';
import { useEffect, useRef } from 'react';
import { CHECKPOINTS, DICT, type Lang } from '@/content/scene01';
import { nearestCheckpoint, scene01Progress } from '@/lib/scene01/progress';

/** Six checkpoint buttons (44px touch targets) + numeric label. Active state is written straight to the DOM from the progress store (no React re-render while scrolling). */
export function SceneProgress({ lang }: { lang: Lang }) {
  const d = DICT[lang]; const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const apply = (p: number) => { const a = nearestCheckpoint(p); box.current?.querySelectorAll<HTMLButtonElement>('button').forEach((b, i) => { b.dataset.active = String(i === a); if (i === a) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }); };
    apply(scene01Progress.ref.current); return scene01Progress.subscribe(apply);
  }, []);
  return (
    <nav ref={box} className="s01-progress" aria-label={d.progressLabel}>
      <span className="s01-progress-num" aria-hidden="true">{lang === 'ar' ? '٠١' : '01'}</span>
      <div className="s01-ticks">{CHECKPOINTS.map((c, i) => <button key={c} type="button" data-active={i === 0} aria-label={`${d.goTo} ${lang === 'ar' ? new Intl.NumberFormat('ar').format(c) : c}%`} onClick={() => scene01Progress.api?.scrollTo(c / 100)}><i /></button>)}</div>
    </nav>
  );
}
