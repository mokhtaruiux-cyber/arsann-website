'use client';
import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import animationData from '../../../public/brand/arsann-loader.json';

const MIN_VISIBLE = 900, SAFETY = 25_000, FADE = 500;

export function ArsannLoader({ ready, lang, onDismiss }: { ready: boolean; lang: 'en' | 'ar'; onDismiss: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const animation = useRef<AnimationItem | null>(null);
  const eligible = useRef(false);
  const staticOnly = useRef(false);
  const fade = useRef<() => void>(() => {});
  const mountedAt = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    mountedAt.current = performance.now();
    let disposed = false, exiting = false, endTimer = 0;
    const finish = () => {
      if (disposed || exiting) return;
      exiting = true;
      animation.current?.pause();
      setFading(true);
      endTimer = window.setTimeout(onDismiss, FADE);
    };
    fade.current = finish;
    const safetyTimer = window.setTimeout(finish, SAFETY - FADE);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onLoop = () => { if (eligible.current) finish(); };
    if (motion.matches) staticOnly.current = true;
    else void import('lottie-web/build/player/lottie_light').then(({ default: lottie }) => {
      if (disposed || exiting || !host.current) return;
      const item = lottie.loadAnimation({ container: host.current, renderer: 'svg', loop: true, autoplay: true, animationData: structuredClone(animationData) });
      animation.current = item;
      item.addEventListener('DOMLoaded', () => { if (!disposed) setPlaying(true); });
      item.addEventListener('loopComplete', onLoop);
    }).catch(() => {
      staticOnly.current = true;
      if (eligible.current) finish();
    });
    return () => {
      disposed = true;
      clearTimeout(safetyTimer);
      clearTimeout(endTimer);
      animation.current?.destroy();
      animation.current = null;
      eligible.current = false;
      staticOnly.current = false;
    };
  }, [onDismiss]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => {
      eligible.current = true;
      if (staticOnly.current) fade.current();
    }, Math.max(0, MIN_VISIBLE - (performance.now() - mountedAt.current)));
    return () => clearTimeout(id);
  }, [ready]);

  return (
    <div className="arsann-loader" data-fading={fading} role="status" aria-label={lang === 'ar' ? 'جارٍ التحميل' : 'Loading'} data-lenis-prevent>
      <div className="arsann-loader-mark" aria-hidden="true">
        {/* Exact ghost layer paths/transform from the supplied Lottie JSON. Server-rendered before JS. */}
        <svg className="arsann-loader-ghost" data-playing={playing} viewBox="0 0 512 512">
          <g fill="#C8B9A5" transform="translate(256 256) scale(1.15) translate(-46 -124)">
            <path d="M36.2 1 C36.2 1 36.1 80.5 36.1 80.5 C37.247 93.809 42.054 105.009 52.5 114.3 C52.5 114.3 92 146.6 92 146.6 L92 135.2 L74.6 120.6 C65.694 112.129 57.046 98.876 56.1 80 L56.1 28.4 C55.663 15.616 45.404 7.218 36.2 1 Z" />
            <path d="M55.8 247 C55.8 247 55.9 167.5 55.9 167.5 C54.753 154.191 49.946 142.991 39.5 133.7 L0 101.4 L0 112.8 L17.4 127.4 C26.306 135.871 34.954 149.124 35.9 168 L35.9 219.6 C36.337 232.384 46.596 240.782 55.8 247 Z" />
          </g>
        </svg>
        <div ref={host} className="arsann-loader-player" />
      </div>
    </div>
  );
}

