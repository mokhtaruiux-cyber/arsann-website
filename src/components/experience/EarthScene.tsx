'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { COL, CITIES, CAMERA_JSON, GLB_SECONDS, NOTEX_GLB, NOTEX_GLB_V3, R, REGION, TEX_BASE, TIER_SETS_KTX2, TIER_SETS_WEBP, lonLatToVec3, type Tier } from '@/lib/recon/config';
import { ATMO_FRAG, BORDER_FRAG, BORDER_VERT, CLOUD_BAKE_FRAG, CLOUD_BAKE_VERT, CLOUD_FRAG, EARTH_FRAG, NIGHT_FRAG, OCEAN_FRAG, SHELL_FRAG, VERT } from '@/lib/recon/shaders';
import { drive, fitCamera, playAll } from '@/lib/glbOps';
import { createV3Effects, type V3Fx } from './v3Effects';
import type { Variant } from '@/lib/recon/variant';
import { asset } from '@/lib/asset';

export type ReconStats = { fps: number; avgMs: number; p95Ms: number; maxMs: number; spikes33: number; frames: number; calls: number; triangles: number; geometries: number; textures: number; programs: number; maxTex: number; gpu: string; camera: string; tier: string; quality: string };
declare global { interface Window { __recon?: { stats: () => ReconStats | null; ready: boolean; timings: Record<string, number>; resetFrames: () => void; log: unknown[]; renderer?: THREE.WebGLRenderer } } }
/** One projected city marker in canvas CSS pixels (written every frame by the Earth; consumed by the HTML label layer). */
export type ProjectedCity = { id: string; x: number; y: number; facing: number; inFront: boolean };
export type ReconProps = {
  stage?: number; tier?: string | null; format?: string | null; progress?: number | null; progressRef?: React.RefObject<number>; still?: boolean; progressive?: boolean; exposure?: number; /** the planet shell is on screen (before any texture is ready) */ onShell?: () => void; /** stop rendering (Scene 02 fully covers the Earth canvas) */ paused?: boolean;
  registry?: React.RefObject<Map<string, HTMLElement>>; /** New: raw projection output for the HTML label layer. */ projection?: React.RefObject<ProjectedCity[]>; onContextLost?: () => void; onAssetError?: () => void; onReady?: () => void; onStatus?: (s: string) => void; onStats?: (s: ReconStats) => void; sunI?: number; /** Look variant: v3 (default) or legacy fallback. */ variant?: Variant;
};
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Mutation helper (kept outside components so refs passed down as props can be updated). */
function setRef<T>(r: { current: T }, v: T) { r.current = v; }
function setUniform(m: THREE.ShaderMaterial, k: string, v: unknown) { m.uniforms[k].value = v; }
export const sceneInfo = { calls: 0, triangles: 0 };
function renderHdr(gl: THREE.WebGLRenderer, rt: THREE.WebGLRenderTarget, scene: THREE.Scene, camera: THREE.Camera, pass: { mat: THREE.ShaderMaterial; sc: THREE.Scene; cam: THREE.Camera }) {
  gl.info.autoReset = false; gl.info.reset(); gl.setRenderTarget(rt); gl.render(scene, camera); sceneInfo.calls = gl.info.render.calls; sceneInfo.triangles = gl.info.render.triangles; gl.setRenderTarget(null); setUniform(pass.mat, 'tDiffuse', rt.texture); gl.render(pass.sc, pass.cam);
}
const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

/** WebP/PNG via ImageBitmap (decoded off the main thread, cheap upload). Textures are NOT Y-flipped (glTF convention: v=0 is the top/north). */
async function loadBitmapTex(url: string, gl: THREE.WebGLRenderer, srgb: boolean): Promise<THREE.Texture> {
  let src: ImageBitmap | HTMLImageElement;
  try { src = await createImageBitmap(await (await fetch(url)).blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }); } catch { const img = new Image(); img.decoding = 'async'; img.src = url; await img.decode(); src = img; }
  const t = new THREE.Texture(src as unknown as HTMLImageElement); t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy()); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; return t;
}
async function loadTex(url: string, gl: THREE.WebGLRenderer, srgb: boolean, ktx2: KTX2Loader): Promise<THREE.Texture> {
  if (url.endsWith('.ktx2')) { const t = await ktx2.loadAsync(url); t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy()); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; return t; }
  return loadBitmapTex(url, gl, srgb);
}
type Assets = { day: THREE.Texture; night: THREE.Texture; mask: THREE.Texture; region: THREE.Texture | null; cloud: THREE.WebGLRenderTarget; quality: Tier };

function bakeClouds(gl: THREE.WebGLRenderer, size: number) {
  const rt = new THREE.WebGLRenderTarget(size, size / 2, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, depthBuffer: false });
  const mat = new THREE.ShaderMaterial({ vertexShader: CLOUD_BAKE_VERT, fragmentShader: CLOUD_BAKE_FRAG, uniforms: { uCover: { value: 0.60 } }, depthTest: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); const sc = new THREE.Scene(); sc.add(quad); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prev = gl.getRenderTarget(); const prevTM = gl.toneMapping; gl.toneMapping = THREE.NoToneMapping; gl.setRenderTarget(rt); gl.render(sc, cam); gl.setRenderTarget(prev); gl.toneMapping = prevTM;
  quad.geometry.dispose(); mat.dispose(); const t = rt.texture; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return rt;
}

export function Probe({ onStats, tier, qualityRef }: { onStats?: (s: ReconStats) => void; tier: string; qualityRef: React.RefObject<string> }) {
  const gl = useThree(s => s.gl); const getState = useThree(s => s.get); const dts = useRef<number[]>([]); const maxTex = useRef(0); const gpu = useRef('');
  useEffect(() => {
    const c = gl.getContext(); const ext = c.getExtension('WEBGL_debug_renderer_info'); maxTex.current = c.getParameter(c.MAX_TEXTURE_SIZE) as number; gpu.current = ext ? (c.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : 'n/a';
    const mk = (): ReconStats | null => { const a = dts.current.slice(); if (a.length < 5) return null; const s = [...a].sort((x, y) => x - y); const avg = a.reduce((p, q) => p + q, 0) / a.length; const cam = getState().camera as THREE.PerspectiveCamera;
      return { fps: +(1000 / avg).toFixed(1), avgMs: +avg.toFixed(2), p95Ms: +s[Math.floor(s.length * 0.95)].toFixed(1), maxMs: +s[s.length - 1].toFixed(1), spikes33: a.filter(v => v > 33.4).length, frames: a.length, calls: sceneInfo.calls, triangles: sceneInfo.triangles,
        geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0, maxTex: maxTex.current, gpu: gpu.current, tier, quality: qualityRef.current ?? '',
        camera: `${cam.name || cam.type} fov=${cam.fov?.toFixed(1)} pos=${cam.getWorldPosition(new THREE.Vector3()).toArray().map(v => v.toFixed(2)).join(',')}` }; };
    const prev = window.__recon?.renderer === gl ? window.__recon : undefined; window.__recon = { stats: mk, ready: prev?.ready ?? false, timings: prev?.timings ?? {}, resetFrames: () => { dts.current = []; }, log: prev?.log ?? [], renderer: gl };
    const id = setInterval(() => { const s = mk(); if (s) onStats?.(s); }, 500); return () => clearInterval(id);
  }, [gl, getState, onStats, tier, qualityRef]);
  useFrame((_, d) => { dts.current.push(d * 1000); if (dts.current.length > 900) dts.current.shift(); });
  return null;
}

export function EarthScene(p: ReconProps & { tier: Tier; qualityRef: React.RefObject<string> }) {
  const variant: Variant = p.variant ?? 'v3'; const glbUrl = variant === 'legacy' ? NOTEX_GLB : NOTEX_GLB_V3; const gltf = useGLTF(glbUrl); const { actions, mixer, names } = useAnimations(gltf.animations, gltf.scene);
  const gl = useThree(s => s.gl); const scene = useThree(s => s.scene); const set = useThree(s => s.set); const size = useThree(s => s.size); const camState = useThree(s => s.camera);
  const [assets, setAssets] = useState<Assets | null>(null); const mats = useRef<Record<string, THREE.ShaderMaterial>>({}); const shift = useRef<number[] | null>(null);
  const objs = useRef<{ clouds?: THREE.Mesh; border?: THREE.Mesh; outline?: THREE.Mesh; markers?: THREE.Points; sunDir: THREE.Vector3; cam?: THREE.PerspectiveCamera; markerPos: THREE.Vector3[]; fx?: V3Fx; shell?: THREE.ShaderMaterial; fadeT0?: number }>({ sunDir: new THREE.Vector3(0, 0, 1), markerPos: [] });
  const stageRef = useRef(6); const stageProp = p.stage ?? 6; useEffect(() => { setRef(stageRef, stageProp); }, [stageProp]); const timings = useRef<Record<string, number>>({});
  const origCam = useRef<THREE.Camera | null>(null);
  const { onAssetError, onReady, format, progressive, qualityRef, tier } = p;

  useEffect(() => {
    let active = true;
    const set = format === 'webp' ? TIER_SETS_WEBP : TIER_SETS_KTX2;
    const t0 = performance.now();
    const ktx2 = new KTX2Loader().setTranscoderPath(asset('/basis/')).detectSupport(gl);
    const textures = new Map<string, Promise<THREE.Texture>>();
    const loadSharedTexture = (name: string, srgb: boolean) => {
      const existing = textures.get(name);
      if (existing) return existing;
      const texture = loadTex(TEX_BASE + name, gl, srgb, ktx2).then(async tex => {
        if (active) { gl.initTexture(tex); await nextFrame(); }
        return tex;
      });
      textures.set(name, texture);
      return texture;
    };
    const load = async (quality: Tier) => {
      const spec = set[quality];
      const [day, night, mask, region] = await Promise.all([
        loadSharedTexture(spec.day, true), loadSharedTexture(spec.night, true),
        loadSharedTexture(spec.mask, false), spec.region ? loadSharedTexture(spec.region, true) : null,
      ]);
      if (!active) return;
      if (region) { region.wrapS = THREE.ClampToEdgeWrapping; region.needsUpdate = true; }
      timings.current[`tex_${quality}_ms`] = Math.round(performance.now() - t0);
      const cloudStart = performance.now();
      const cloud = bakeClouds(gl, spec.cloud);
      timings.current[`bake_${quality}_ms`] = Math.round(performance.now() - cloudStart);
      setAssets({ day, night, mask, region, cloud, quality });
    };
    const first = progressive === false ? tier : 'low';
    void (async () => {
      try { await load(first); } catch { if (active) onAssetError?.(); return; }
      if (!active) return;
      timings.current.firstAssetsMs = Math.round(performance.now() - t0);
      if (first !== tier) {
        try {
          await load(tier);
          timings.current.upgradeMs = Math.round(performance.now() - t0);
        } catch { /* Keep the usable low tier when the optional upgrade fails. */ }
      }
    })();
    return () => {
      active = false;
      void Promise.allSettled(textures.values()).then(results => {
        for (const result of results) if (result.status === 'fulfilled') {
          result.value.dispose();
          if (typeof ImageBitmap !== 'undefined' && result.value.image instanceof ImageBitmap) result.value.image.close();
        }
        ktx2.dispose();
      });
    };
  }, [gl, tier, progressive, onAssetError, format]);

  // ---------- build materials / hide the incorrectly-opaque layers ----------
  useEffect(() => {
    if (!assets) return; const g = gltf.scene; const o = objs.current; const find = (n: string) => g.getObjectByName(n) as THREE.Mesh | undefined;
    const sun = g.getObjectByName('SUN'); if (sun) { sun.updateWorldMatrix(true, false); o.sunDir.set(0, 0, 1).applyQuaternion(sun.getWorldQuaternion(new THREE.Quaternion())).normalize(); sun.traverse(x => { const l = x as THREE.DirectionalLight; if (l.isLight) l.intensity = 0; }); }
    const common = { uSunDir: { value: o.sunDir }, uSunI: { value: p.sunI ?? 1.0 } };
    if (!mats.current.earth) {
      const rb = [REGION.lon0, REGION.lon1, REGION.lat0, REGION.lat1].map(THREE.MathUtils.degToRad);
      mats.current.earth = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: EARTH_FRAG, uniforms: { ...common, uFade: { value: 0 }, uDay: { value: assets.day }, uRegion: { value: assets.region ?? assets.day }, uStage: { value: 6 }, uRegionMix: { value: 0 }, uRegionBox: { value: new THREE.Vector4(...rb) } } });
      mats.current.night = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: NIGHT_FRAG, transparent: true, depthWrite: false, uniforms: { ...common, uNight: { value: assets.night }, uTint: { value: COL.gold.clone() }, uStrength: { value: 2.2 } } });
      mats.current.ocean = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: OCEAN_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { ...common, uMask: { value: assets.mask }, uRough: { value: 0.12 }, uStrength: { value: 0.6 } } });
      mats.current.cloud = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false, uniforms: { ...common, uCloud: { value: assets.cloud.texture }, uColor: { value: COL.pearl.clone() }, uOpacity: { value: 0.92 } } });
      mats.current.atmo = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: ATMO_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { ...common, uStrength: { value: 2.3 }, uBlue: { value: COL.atmoBlue.clone() }, uWarm: { value: COL.sunset.clone() }, uPow: { value: 5.0 } } });
      const bu = (px: number, color: THREE.Color, alpha: number) => new THREE.ShaderMaterial({ vertexShader: BORDER_VERT, fragmentShader: BORDER_FRAG, transparent: true, depthWrite: false, uniforms: { uPx: { value: px }, uViewH: { value: 1080 }, uFov: { value: 0.5 }, uBase: { value: 0.0045 }, uCenter: { value: lonLatToVec3(45, 24, 1) }, uColor: { value: color }, uReveal: { value: 0 }, uAlpha: { value: alpha } } });
      mats.current.border = bu(2.4, COL.gold.clone(), 1.0); mats.current.outline = bu(5.5, COL.charcoal.clone(), 0.7);
    } else { mats.current.earth.uniforms.uDay.value = assets.day; mats.current.earth.uniforms.uRegion.value = assets.region ?? assets.day; mats.current.night.uniforms.uNight.value = assets.night; mats.current.ocean.uniforms.uMask.value = assets.mask; mats.current.cloud.uniforms.uCloud.value = assets.cloud.texture; }
    const m = mats.current; const setMat = (n: string, mat: THREE.Material, order: number) => { const x = find(n); if (x) { x.material = mat; x.renderOrder = order; x.frustumCulled = false; } return x; };
    setMat('EARTH_SURFACE', m.earth, 0); setMat('OCEANS', m.ocean, 1); setMat('NIGHT_LIGHTS', m.night, 2); o.clouds = setMat('CLOUDS', m.cloud, 3); setMat('ATMOSPHERE', m.atmo, 6);
    o.border = setMat('SAUDI_BORDER', m.border, 5); if (o.border && !o.outline) { o.outline = new THREE.Mesh(o.border.geometry, m.outline); o.outline.renderOrder = 4; o.outline.frustumCulled = false; o.border.parent?.add(o.outline); }
    g.traverse(x => { if (/^(NODE_|LINK_)/.test(x.name)) x.visible = false; }); // old dots-and-links are not part of the new design
    const root = g.getObjectByName('EARTH_GLOBE_ROOT');
    if (root && !o.markers) { // city markers: world-space points on the globe (labels are separate HTML)
      const pts = CITIES.map(c => lonLatToVec3(c.lon, c.lat, R * 1.003)); o.markerPos = pts; const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mk = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPx: { value: 7 }, uA: { value: 0 } }, vertexShader: 'uniform float uPx; void main(){ gl_PointSize = uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; vec3 c = r > 0.34 ? vec3(0.30, 0.17, 0.01) : vec3(1.0, 0.78, 0.25); /* gold marker (daylight edit) */ gl_FragColor = vec4(c, uA);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' });
      o.markers = new THREE.Points(geo, mk); o.markers.renderOrder = 7; o.markers.frustumCulled = false; root.add(o.markers);
    }
    if (variant === 'v3' && root && !o.fx) o.fx = createV3Effects(root, gltf.cameras[0] as THREE.PerspectiveCamera | undefined);
    let active = true;
    void (async () => {
      const t0 = performance.now();
      try { await gl.compileAsync(scene, camState); } catch { /* The first frame compiles the shaders. */ }
      if (!active) return;
      timings.current.compileMs = Math.round(performance.now() - t0);
      setRef(qualityRef, assets.quality);
      if (window.__recon?.renderer === gl) {
        window.__recon.timings = { ...timings.current };
        if (!window.__recon.ready) window.__recon.resetFrames();
        window.__recon.ready = true;
      }
      onReady?.();
    })();
    return () => { active = false; };
  }, [assets, gltf, gl, scene, camState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { playAll(actions as never, names); }, [actions, names]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(CAMERA_JSON[variant], { signal: controller.signal }).then(r => r.json()).then((j: { keys: { shift_x: number }[] }) => { shift.current = j.keys.map(k => k.shift_x); }).catch(() => { if (!controller.signal.aborted) onAssetError?.(); });
    return () => controller.abort();
  }, [onAssetError, variant]);
  useEffect(() => { // GLB camera becomes the active camera
    const cam = gltf.cameras[0] as THREE.PerspectiveCamera | undefined; if (!cam) return; origCam.current ??= camState; objs.current.cam = cam; fitCamera(cam, size.width, size.height, 0); set({ camera: cam });
    return () => { if (origCam.current) set({ camera: origCam.current as THREE.PerspectiveCamera }); };
  }, [gltf, set]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { // release only resources owned by this component
    // useGLTF.scene and its geometry come from drei's shared cache. Disposing or
    // clearing them here breaks React Strict Mode's development effect replay:
    // the component stays mounted, but its cached mesh geometry is already dead.
    Object.values(mats.current).forEach(m => m.dispose()); mats.current = {};
    objs.current.fx?.dispose(); objs.current.fx = undefined;
    if (objs.current.markers) {
      objs.current.markers.parent?.remove(objs.current.markers);
      objs.current.markers.geometry.dispose();
      (objs.current.markers.material as THREE.Material).dispose();
      objs.current.markers = undefined;
    }
    objs.current.outline?.parent?.remove(objs.current.outline);
    objs.current.outline = undefined; objs.current.border = undefined; objs.current.clouds = undefined;
  }, [gltf, glbUrl]);
  useEffect(() => () => { assets?.cloud.dispose(); }, [assets]);

  useFrame((state, dt) => {
    const o = objs.current; const m = mats.current;
    if (!m.earth) { // SHELL: GLB camera + a dark sun-lit sphere at exactly the final size, so the first live frame already shows the planet while the textures are still downloading
      const g = gltf.scene; const earth = g.getObjectByName('EARTH_SURFACE') as THREE.Mesh | undefined; if (!earth) return; if (!shift.current) return;   // wait for the camera-path lens shift (6 KB): the shell must sit exactly where the finished globe will
      if (!o.shell) {
        const sun = g.getObjectByName('SUN'); if (sun) { sun.updateWorldMatrix(true, false); o.sunDir.set(0, 0, 1).applyQuaternion(sun.getWorldQuaternion(new THREE.Quaternion())).normalize(); sun.traverse(x => { const l = x as THREE.DirectionalLight; if (l.isLight) l.intensity = 0; }); }
        o.shell = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: SHELL_FRAG, uniforms: { uSunDir: { value: o.sunDir } } });
        earth.material = o.shell; earth.renderOrder = 0; earth.frustumCulled = false; earth.visible = true;
        for (const n of ['OCEANS', 'NIGHT_LIGHTS', 'CLOUDS', 'ATMOSPHERE', 'SAUDI_BORDER']) { const x = g.getObjectByName(n); if (x) x.visible = false; }
        p.onShell?.();
      }
      const prog0 = Math.min(1, Math.max(0, (p.progressRef ? p.progressRef.current : p.progress) ?? 0)); drive(mixer, actions as never, prog0, false, GLB_SECONDS);
      const cam0 = o.cam; if (cam0) { const z0 = size.width / size.height < 0.8 ? 1 + 1.1 * Math.min(1, Math.max(0.3, (size.height - 520) / 300)) * (1 - ss(0.1, 0.42, prog0)) : 1; const f0 = prog0 * 100, i0 = Math.min(99, Math.floor(f0)), t0 = f0 - i0; const s0 = shift.current[i0] * (1 - t0) + shift.current[i0 + 1] * t0; fitCamera(cam0, size.width, size.height, s0, z0); }
      return;
    }
    if (!o.fadeT0) o.fadeT0 = performance.now(); m.earth.uniforms.uFade.value = ss(0, 900, performance.now() - o.fadeT0); const st = stageRef.current; const prog = Math.min(1, Math.max(0, (p.progressRef ? p.progressRef.current : p.progress) ?? 0));
    drive(mixer, actions as never, prog, false, GLB_SECONDS);
    const cam = o.cam; if (cam) { const f = prog * 100, i = Math.min(99, Math.floor(f)), t = f - i; const s2 = st >= 5 && shift.current ? shift.current[i] * (1 - t) + shift.current[i + 1] * t : 0; const portraitZoom = size.width / size.height < 0.8 && st >= 6 ? 1 + 1.1 * Math.min(1, Math.max(0.3, (size.height - 520) / 300)) * (1 - ss(0.1, 0.42, prog)) : 1; fitCamera(cam, size.width, size.height, s2, portraitZoom); }
    const hh = state.gl.getDrawingBufferSize(new THREE.Vector2()).y; const fov = THREE.MathUtils.degToRad(cam?.fov ?? 28.4);
    const camDist = state.camera.position.length(); // distance of the GLB camera from the Earth centre (world)
    m.earth.uniforms.uStage.value = st >= 2 ? 2 : 1; m.earth.uniforms.uRegionMix.value = assets?.region ? ss(16.0, 11.0, camDist) : 0;
    const earthMesh = gltf.scene.getObjectByName('EARTH_SURFACE'); if (earthMesh) earthMesh.visible = st >= 1;
    const vis = (n: string, on: boolean) => { const x = gltf.scene.getObjectByName(n); if (x) x.visible = on; };
    vis('NIGHT_LIGHTS', st >= 2); vis('CLOUDS', st >= 3); vis('ATMOSPHERE', st >= 3); vis('OCEANS', st >= 4); if (o.border) o.border.visible = st >= 6; if (o.outline) o.outline.visible = st >= 6; if (o.markers) o.markers.visible = st >= 6;
    if (o.clouds && !p.still) o.clouds.rotation.y += dt * 0.004;
    const reveal = ss(0.40, 0.65, prog); for (const k of ['border', 'outline']) { const u = m[k].uniforms; u.uReveal.value = reveal; u.uViewH.value = hh; u.uFov.value = fov; }
    if (o.markers) (o.markers.material as THREE.ShaderMaterial).uniforms.uA.value = ss(0.62, 0.80, prog) * (o.fx ? 1 - ss(0.86, 0.95, prog) : 1);
    o.fx?.update(prog, state.clock.elapsedTime, cam, st >= 6);
    // HTML label projection (synchronised with the live camera incl. lens shift)
    if (p.projection && cam) { const v2 = new THREE.Vector3(), c2 = cam.getWorldPosition(new THREE.Vector3()); const out: ProjectedCity[] = CITIES.map((city, i) => { v2.copy(o.markerPos[i]); const facing = v2.clone().normalize().dot(c2.clone().sub(v2).normalize()); v2.project(cam); return { id: city.id, x: (v2.x * 0.5 + 0.5) * size.width, y: (-v2.y * 0.5 + 0.5) * size.height, facing, inFront: v2.z < 1 }; }); setRef(p.projection, out); }
    const reg = p.registry?.current; if (reg && cam) { const v = new THREE.Vector3(), c = cam.getWorldPosition(new THREE.Vector3()); const a = ss(0.62, 0.80, prog) * (st >= 6 ? 1 : 0);
      CITIES.forEach((city, i) => { const el = reg.get(city.id); if (!el) return; v.copy(o.markerPos[i]); const facing = v.clone().normalize().dot(c.clone().sub(v).normalize()); v.project(cam);
        const x = (v.x * 0.5 + 0.5) * size.width, y = (-v.y * 0.5 + 0.5) * size.height; const on = facing > 0.18 && v.z < 1 && x > 8 && x < size.width - 8 && y > 8 && y < size.height - 8;
        el.style.opacity = on ? String(a * ss(0.18, 0.4, facing)) : '0'; el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; }); }
  });
  void scene; return <primitive object={gltf.scene} />;
}


/** Scene-referred pipeline like Blender: render every layer in linear HDR (additive glows sum correctly), then ONE AgX tone-map + sRGB pass to the screen. */
export function Composer({ exposure, samples }: { exposure: number; samples: number }) {
  const gl = useThree(s => s.gl); const size = useThree(s => s.size); const dpr = useThree(s => s.viewport.dpr);
  const rt = useMemo(() => new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }), [samples]);
  const pass = useMemo(() => { const mat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uExp: { value: 1 } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float uExp; varying vec2 vUv; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb * uExp; gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; const sc = new THREE.Scene(); sc.add(quad); return { mat, sc, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) }; }, []);
  useEffect(() => { rt.setSize(Math.max(2, Math.floor(size.width * dpr)), Math.max(2, Math.floor(size.height * dpr))); }, [rt, size, dpr]);
  useEffect(() => { setUniform(pass.mat, 'uExp', exposure); }, [pass, exposure]);
  useEffect(() => () => { rt.dispose(); pass.mat.dispose(); pass.sc.children.forEach(c => (c as THREE.Mesh).geometry.dispose()); }, [rt, pass]);
  useFrame(({ scene, camera }) => { renderHdr(gl, rt, scene, camera, pass); }, 1);
  return null;
}
