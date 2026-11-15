'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useAnimations, useGLTF, useProgress } from '@react-three/drei';
import { Suspense, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import * as THREE from 'three';
import { GLB_ANIM_SECONDS, GLB_URL } from '@/lib/scene01';
import { applyHidden, disposeScene, applySun, applyTone, applyWireframe, drive, fitCamera, playAll, type Tone } from '@/lib/glbOps';
import type { PerfStats } from './stats';

export type StageProps = {
  wireframe?: boolean; sunScale?: number; ambient?: number; tone?: Tone; playing?: boolean;
  /** Fixed progress (0..1) or null for free-running clips. */
  progress?: number | null; /** Live progress source (scroll). Takes precedence over `progress`. */ progressRef?: React.RefObject<number>;
  glbCamera?: boolean; /** Blender lens shift as a function of progress (NOT stored in glTF). */ lensShift?: (p: number) => number;
  hide?: string[];
  onStats?: (s: PerfStats) => void; onClips?: (names: string[], cameraCount: number) => void; orbit?: boolean;
};
export type StageHandle = { resetCamera: () => void };

function Probe({ onStats }: { onStats?: (s: PerfStats) => void }) {
  const { gl } = useThree(); const getState = useThree(st => st.get); const dts = useRef<number[]>([]); const info = useRef<{ maxTex: number; gpu: string }>({ maxTex: 0, gpu: '' });
  useEffect(() => {
    const c = gl.getContext(); const ext = c.getExtension('WEBGL_debug_renderer_info');
    info.current = { maxTex: c.getParameter(c.MAX_TEXTURE_SIZE) as number, gpu: ext ? (c.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : 'n/a' };
    const mk = (): PerfStats | null => { const a = dts.current.slice(); if (a.length < 5) return null; const s = [...a].sort((x, y) => x - y); const avg = a.reduce((p, q) => p + q, 0) / a.length;
      return { fps: +(1000 / avg).toFixed(1), avgMs: +avg.toFixed(2), p95Ms: +s[Math.floor(s.length * 0.95)].toFixed(1), maxMs: +s[s.length - 1].toFixed(1), spikes33: a.filter(v => v > 33.4).length, frames: a.length,
        calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, maxTex: info.current.maxTex, gpu: info.current.gpu, camera: (() => { const c = getState().camera as THREE.PerspectiveCamera; const v = c.getWorldPosition(new THREE.Vector3()); return `${c.name || c.type} fov=${c.fov?.toFixed(1)} pos=${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`; })() }; };
    const prev = window.__s01; const log = prev?.disposeLog ?? [];
    window.__s01 = { setProgress: prev?.setProgress ?? (() => {}), setGlbCamera: () => {}, stats: mk, ready: true, disposeLog: log };
    const id = setInterval(() => { const s = mk(); if (s && onStats) onStats(s); }, 500);
    return () => { clearInterval(id); log.push({ t: Date.now(), phase: 'canvas-unmount-before-dispose', memory: { ...gl.info.memory } }); setTimeout(() => log.push({ t: Date.now(), phase: 'after-1s', memory: { ...gl.info.memory }, contextLost: gl.getContext().isContextLost() }), 1000); };
  }, [gl, onStats, getState]);
  useFrame((_, d) => { dts.current.push(d * 1000); if (dts.current.length > 600) dts.current.shift(); });
  return null;
}

function Model(p: StageProps) {
  const gltf = useGLTF(GLB_URL); const { actions, mixer, names } = useAnimations(gltf.animations, gltf.scene);
  const set = useThree(s => s.set); const size = useThree(s => s.size); const gl = useThree(s => s.gl); const current = useThree(s => s.camera); const original = useRef<THREE.Camera | null>(null);
  const glbCam = gltf.cameras[0] as THREE.PerspectiveCamera | undefined; const { onClips } = p;
  useEffect(() => { onClips?.(gltf.animations.map(a => a.name), gltf.cameras.length); playAll(actions as never, names); }, [gltf, actions, names, onClips]);
  // Free GPU resources of the cached GLTF when the canvas goes away (primitives are not auto-disposed by R3F).
  useEffect(() => () => { disposeScene(gltf.scene); useGLTF.clear(GLB_URL); }, [gltf]);
  useEffect(() => { applySun(gltf.scene, p.sunScale ?? 1); }, [gltf, p.sunScale]);
  useEffect(() => { applyWireframe(gltf.scene, !!p.wireframe); }, [gltf, p.wireframe]);
  const hideKey = (p.hide ?? []).join(',');
  useEffect(() => { applyHidden(gltf.scene, hideKey ? hideKey.split(',') : []); }, [gltf, hideKey]);
  useEffect(() => { applyTone(gl, gltf.scene, p.tone ?? 'default'); }, [gl, gltf, p.tone]);
  useEffect(() => {
    if (!glbCam) return;
    if (p.glbCamera) { original.current ??= current; fitCamera(glbCam, size.width, size.height, 0); set({ camera: glbCam }); }
    else if (original.current) set({ camera: original.current as THREE.PerspectiveCamera });
  }, [p.glbCamera, glbCam, set]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    const prog = p.progressRef ? p.progressRef.current : p.progress;
    drive(mixer, actions as never, prog, !!p.playing, GLB_ANIM_SECONDS);
    if (glbCam && p.glbCamera) fitCamera(glbCam, size.width, size.height, p.lensShift ? p.lensShift(prog ?? 0) : 0);
  });
  return <primitive object={gltf.scene} />;
}

export const Stage = forwardRef<StageHandle, StageProps>(function Stage(props, ref) {
  const controls = useRef<{ reset: () => void } | null>(null);
  useImperativeHandle(ref, () => ({ resetCamera: () => controls.current?.reset() }));
  return (
    <Canvas camera={{ position: [0, 6, 26], fov: 35, near: 0.05, far: 500 }} dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }} style={{ background: '#1E1E14' }}>
      <ambientLight intensity={props.ambient ?? 0} />
      <Suspense fallback={null}><Model {...props} /></Suspense>
      <Probe onStats={props.onStats} />
      {props.orbit !== false && !props.glbCamera && <OrbitControls ref={controls as never} makeDefault />}
    </Canvas>
  );
});
export function LoadingBar() { const { progress, active, loaded, total } = useProgress(); return active ? <div className="absolute inset-x-0 top-0 z-20 bg-black/70 p-2 text-xs text-white">Loading GLB… {progress.toFixed(0)}% ({loaded}/{total} items)</div> : null; }
