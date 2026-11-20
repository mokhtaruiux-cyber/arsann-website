'use client';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { pickTier, type Tier } from '@/lib/recon/config';
import { Composer, EarthScene, Probe, type ReconProps } from './EarthScene';

function ContextLossListener({ onLost }: { onLost?: () => void }) {
  const canvas = useThree(state => state.gl.domElement);
  useEffect(() => {
    const handleLoss = (event: Event) => {
      event.preventDefault();
      onLost?.();
    };
    canvas.addEventListener('webglcontextlost', handleLoss);
    return () => canvas.removeEventListener('webglcontextlost', handleLoss);
  }, [canvas, onLost]);
  return null;
}

/** The persistent R3F canvas shell. Future scenes mount their own components inside it; Scene 01 mounts EarthScene.
 *  Picks the quality tier from device capability (GPU limits, pointer, memory, link speed) and reports WebGL context loss. */
export function ExperienceCanvas(props: ReconProps) {
  const [tier, setTier] = useState<Tier | null>(null); const [fmt, setFmt] = useState<string | null>(null); const qualityRef = useRef('loading');
  return (
    <Canvas frameloop={props.paused ? 'never' : 'always'} dpr={tier === 'low' ? [1, 1.5] : [1, 2]} camera={{ position: [0, 6, 26], fov: 35, near: 0.05, far: 500 }} gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !props.projection }} flat
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.AgXToneMapping; gl.toneMappingExposure = 1; gl.setClearColor(new THREE.Color('#1E1E14'), 1);
        const q = new URLSearchParams(window.location.search); const maxTex = q.get('maxtex') ? +(q.get('maxtex') as string) : gl.capabilities.maxTextureSize;
        const nav = navigator as Navigator & { deviceMemory?: number; connection?: { downlink?: number; effectiveType?: string; saveData?: boolean } };
        const override = props.tier ?? q.get('tier');
        const connection = nav.connection;
        const slow = connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '') || (connection?.downlink ?? 10) < 3;
        const conserve = props.projection && slow && override == null;
        setFmt(props.format ?? q.get('fmt') ?? (maxTex < 4096 || conserve ? 'webp' : 'ktx2'));
        setTier(pickTier(maxTex, { coarse: window.matchMedia('(pointer: coarse)').matches, deviceMemory: nav.deviceMemory, downlink: connection?.downlink, override: override ?? (conserve ? 'low' : null) }));
      }}>
      <ContextLossListener onLost={props.onContextLost} />
      <color attach="background" args={['#1E1E14']} />
      {tier && fmt && <Suspense fallback={null}><EarthScene {...props} format={fmt} tier={tier} qualityRef={qualityRef} /></Suspense>}
      {tier && <Composer exposure={props.exposure ?? 1} samples={tier === 'low' ? 0 : 4} />}
      {tier && <Probe onStats={props.onStats} tier={tier} qualityRef={qualityRef} />}
    </Canvas>
  );
}
