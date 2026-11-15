'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { COL, CITIES, GLB_SECONDS, NOTEX_GLB, R, REGION, TEX_BASE, TIER_SETS, lonLatToVec3, pickTier, type Tier } from '@/lib/recon/config';
import { ATMO_FRAG, BORDER_FRAG, BORDER_VERT, CLOUD_BAKE_FRAG, CLOUD_BAKE_VERT, CLOUD_FRAG, EARTH_FRAG, NIGHT_FRAG, OCEAN_FRAG, VERT } from '@/lib/recon/shaders';
import { drive, fitCamera, playAll } from '@/lib/glbOps';

export type ReconStats = { fps: number; avgMs: number; p95Ms: number; maxMs: number; spikes33: number; frames: number; calls: number; triangles: number; geometries: number; textures: number; programs: number; maxTex: number; gpu: string; camera: string; tier: string; quality: string };
declare global { interface Window { __recon?: { stats: () => ReconStats | null; ready: boolean; timings: Record<string, number>; resetFrames: () => void; log: unknown[]; renderer?: THREE.WebGLRenderer } } }
export type ReconProps = {
  stage?: number; tier?: string | null; progress?: number | null; progressRef?: React.RefObject<number>; still?: boolean; progressive?: boolean; exposure?: number;
  registry?: React.RefObject<Map<string, HTMLElement>>; onReady?: () => void; onStatus?: (s: string) => void; onStats?: (s: ReconStats) => void; sunI?: number;
};
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Mutation helper (kept outside components so refs passed down as props can be updated). */
function setRef<T>(r: { current: T }, v: T) { r.current = v; }
function setUniform(m: THREE.ShaderMaterial, k: string, v: unknown) { m.uniforms[k].value = v; }
function renderHdr(gl: THREE.WebGLRenderer, rt: THREE.WebGLRenderTarget, scene: THREE.Scene, camera: THREE.Camera, pass: { mat: THREE.ShaderMaterial; sc: THREE.Scene; cam: THREE.Camera }) {
  gl.setRenderTarget(rt); gl.render(scene, camera); gl.setRenderTarget(null); setUniform(pass.mat, 'tDiffuse', rt.texture); gl.render(pass.sc, pass.cam);
}
const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

async function loadTex(url: string, gl: THREE.WebGLRenderer, srgb: boolean, flipY: boolean): Promise<THREE.Texture> {
  const img = new Image(); img.decoding = 'async'; img.src = url; await img.decode();
  const t = new THREE.Texture(img); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.flipY = flipY; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy()); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; return t;
}
type Assets = { day: THREE.Texture; night: THREE.Texture; mask: THREE.Texture; region: THREE.Texture | null; cloud: THREE.Texture; quality: Tier };

function bakeClouds(gl: THREE.WebGLRenderer, size: number): THREE.Texture {
  const rt = new THREE.WebGLRenderTarget(size, size / 2, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, depthBuffer: false });
  const mat = new THREE.ShaderMaterial({ vertexShader: CLOUD_BAKE_VERT, fragmentShader: CLOUD_BAKE_FRAG, uniforms: { uCover: { value: 0.53 } }, depthTest: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); const sc = new THREE.Scene(); sc.add(quad); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prev = gl.getRenderTarget(); const prevTM = gl.toneMapping; gl.toneMapping = THREE.NoToneMapping; gl.setRenderTarget(rt); gl.render(sc, cam); gl.setRenderTarget(prev); gl.toneMapping = prevTM;
  quad.geometry.dispose(); mat.dispose(); const t = rt.texture; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

function Probe({ onStats, tier, qualityRef }: { onStats?: (s: ReconStats) => void; tier: string; qualityRef: React.RefObject<string> }) {
  const gl = useThree(s => s.gl); const getState = useThree(s => s.get); const dts = useRef<number[]>([]); const maxTex = useRef(0); const gpu = useRef('');
  useEffect(() => {
    const c = gl.getContext(); const ext = c.getExtension('WEBGL_debug_renderer_info'); maxTex.current = c.getParameter(c.MAX_TEXTURE_SIZE) as number; gpu.current = ext ? (c.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : 'n/a';
    const mk = (): ReconStats | null => { const a = dts.current.slice(); if (a.length < 5) return null; const s = [...a].sort((x, y) => x - y); const avg = a.reduce((p, q) => p + q, 0) / a.length; const cam = getState().camera as THREE.PerspectiveCamera;
      return { fps: +(1000 / avg).toFixed(1), avgMs: +avg.toFixed(2), p95Ms: +s[Math.floor(s.length * 0.95)].toFixed(1), maxMs: +s[s.length - 1].toFixed(1), spikes33: a.filter(v => v > 33.4).length, frames: a.length, calls: gl.info.render.calls, triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0, maxTex: maxTex.current, gpu: gpu.current, tier, quality: qualityRef.current ?? '',
        camera: `${cam.name || cam.type} fov=${cam.fov?.toFixed(1)} pos=${cam.getWorldPosition(new THREE.Vector3()).toArray().map(v => v.toFixed(2)).join(',')}` }; };
    const prev = window.__recon; window.__recon = { stats: mk, ready: prev?.ready ?? false, timings: prev?.timings ?? {}, resetFrames: () => { dts.current = []; }, log: prev?.log ?? [], renderer: gl };
    const id = setInterval(() => { const s = mk(); if (s) onStats?.(s); }, 500); return () => clearInterval(id);
  }, [gl, getState, onStats, tier, qualityRef]);
  useFrame((_, d) => { dts.current.push(d * 1000); if (dts.current.length > 900) dts.current.shift(); });
  return null;
}

function Earth(p: ReconProps & { tier: Tier; qualityRef: React.RefObject<string> }) {
  const gltf = useGLTF(NOTEX_GLB); const { actions, mixer, names } = useAnimations(gltf.animations, gltf.scene);
  const gl = useThree(s => s.gl); const scene = useThree(s => s.scene); const set = useThree(s => s.set); const size = useThree(s => s.size); const camState = useThree(s => s.camera);
  const [assets, setAssets] = useState<Assets | null>(null); const mats = useRef<Record<string, THREE.ShaderMaterial>>({}); const shift = useRef<number[] | null>(null);
  const objs = useRef<{ clouds?: THREE.Mesh; border?: THREE.Mesh; outline?: THREE.Mesh; markers?: THREE.Points; sunDir: THREE.Vector3; cam?: THREE.PerspectiveCamera; markerPos: THREE.Vector3[] }>({ sunDir: new THREE.Vector3(0, 0, 1), markerPos: [] });
  const stageRef = useRef(6); const stageProp = p.stage ?? 6; useEffect(() => { setRef(stageRef, stageProp); }, [stageProp]); const timings = useRef<Record<string, number>>({});
  const origCam = useRef<THREE.Camera | null>(null);

  // ---------- assets: low tier first (fast first frame), then upgrade to the device tier ----------
  useEffect(() => {
    let dead = false; const T = TIER_SETS; const t0 = performance.now();
    const load = async (tier: Tier): Promise<Assets> => { const s = T[tier]; const [day, night, mask, region] = await Promise.all([loadTex(TEX_BASE + s.day, gl, true, false), loadTex(TEX_BASE + s.night, gl, true, false), loadTex(TEX_BASE + s.mask, gl, false, false), s.region ? loadTex(TEX_BASE + s.region, gl, true, true) : Promise.resolve(null)]);
      if (region) region.wrapS = THREE.ClampToEdgeWrapping; const tb = performance.now(); const cloud = bakeClouds(gl, s.cloud); timings.current[`bake_${tier}_ms`] = Math.round(performance.now() - tb);
      for (const t of [day, night, mask, region, cloud]) if (t) { gl.initTexture(t); await nextFrame(); } // upload one texture per frame -> no single long frame
      return { day, night, mask, region, cloud, quality: tier }; };
    (async () => {
      const first: Tier = p.progressive === false ? p.tier : 'low'; const a = await load(first); if (dead) return; timings.current.firstAssetsMs = Math.round(performance.now() - t0); setAssets(a); setRef(p.qualityRef, a.quality);
      if (first !== p.tier) { const b = await load(p.tier); if (dead) return; timings.current.upgradeMs = Math.round(performance.now() - t0); setAssets(prev => { if (prev) [prev.day, prev.night, prev.mask, prev.region, prev.cloud].forEach(t => t?.dispose()); return b; }); setRef(p.qualityRef, b.quality); }
    })();
    return () => { dead = true; };
  }, [gl, p.tier, p.progressive, p.qualityRef]);

  // ---------- build materials / hide the incorrectly-opaque layers ----------
  useEffect(() => {
    if (!assets) return; const g = gltf.scene; const o = objs.current; const find = (n: string) => g.getObjectByName(n) as THREE.Mesh | undefined;
    const sun = g.getObjectByName('SUN'); if (sun) { sun.updateWorldMatrix(true, false); o.sunDir.set(0, 0, 1).applyQuaternion(sun.getWorldQuaternion(new THREE.Quaternion())).normalize(); sun.traverse(x => { const l = x as THREE.DirectionalLight; if (l.isLight) l.intensity = 0; }); }
    const common = { uSunDir: { value: o.sunDir }, uSunI: { value: p.sunI ?? 1.0 } };
    const dispose = () => { Object.values(mats.current).forEach(m => m.dispose()); mats.current = {}; };
    if (!mats.current.earth) {
      const rb = [REGION.lon0, REGION.lon1, REGION.lat0, REGION.lat1].map(THREE.MathUtils.degToRad);
      mats.current.earth = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: EARTH_FRAG, uniforms: { ...common, uDay: { value: assets.day }, uRegion: { value: assets.region ?? assets.day }, uStage: { value: 6 }, uRegionMix: { value: 0 }, uRegionBox: { value: new THREE.Vector4(...rb) } } });
      mats.current.night = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: NIGHT_FRAG, transparent: true, depthWrite: false, uniforms: { ...common, uNight: { value: assets.night }, uTint: { value: COL.gold.clone() }, uStrength: { value: 2.2 } } });
      mats.current.ocean = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: OCEAN_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { ...common, uMask: { value: assets.mask }, uRough: { value: 0.12 }, uStrength: { value: 0.6 } } });
      mats.current.cloud = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false, uniforms: { ...common, uCloud: { value: assets.cloud }, uColor: { value: COL.pearl.clone() }, uOpacity: { value: 0.92 } } });
      mats.current.atmo = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: ATMO_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { ...common, uStrength: { value: 2.3 }, uBlue: { value: COL.atmoBlue.clone() }, uWarm: { value: COL.sunset.clone() }, uPow: { value: 5.0 } } });
      const bu = (px: number, color: THREE.Color, alpha: number) => new THREE.ShaderMaterial({ vertexShader: BORDER_VERT, fragmentShader: BORDER_FRAG, transparent: true, depthWrite: false, uniforms: { uPx: { value: px }, uViewH: { value: 1080 }, uFov: { value: 0.5 }, uBase: { value: 0.0045 }, uCenter: { value: lonLatToVec3(45, 24, 1) }, uColor: { value: color }, uReveal: { value: 0 }, uAlpha: { value: alpha } } });
      mats.current.border = bu(2.4, COL.gold.clone(), 1.0); mats.current.outline = bu(5.5, COL.charcoal.clone(), 0.7);
    } else { mats.current.earth.uniforms.uDay.value = assets.day; mats.current.earth.uniforms.uRegion.value = assets.region ?? assets.day; mats.current.night.uniforms.uNight.value = assets.night; mats.current.ocean.uniforms.uMask.value = assets.mask; mats.current.cloud.uniforms.uCloud.value = assets.cloud; }
    const m = mats.current; const setMat = (n: string, mat: THREE.Material, order: number) => { const x = find(n); if (x) { x.material = mat; x.renderOrder = order; x.frustumCulled = false; } return x; };
    setMat('EARTH_SURFACE', m.earth, 0); setMat('OCEANS', m.ocean, 1); setMat('NIGHT_LIGHTS', m.night, 2); o.clouds = setMat('CLOUDS', m.cloud, 3); setMat('ATMOSPHERE', m.atmo, 6);
    o.border = setMat('SAUDI_BORDER', m.border, 5); if (o.border && !o.outline) { o.outline = new THREE.Mesh(o.border.geometry, m.outline); o.outline.renderOrder = 4; o.outline.frustumCulled = false; o.border.parent?.add(o.outline); }
    g.traverse(x => { if (/^(NODE_|LINK_)/.test(x.name)) x.visible = false; }); // old dots-and-links are not part of the new design
    const root = g.getObjectByName('EARTH_GLOBE_ROOT');
    if (root && !o.markers) { // city markers: world-space points on the globe (labels are separate HTML)
      const pts = CITIES.map(c => lonLatToVec3(c.lon, c.lat, R * 1.003)); o.markerPos = pts; const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mk = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPx: { value: 7 }, uA: { value: 0 } }, vertexShader: 'uniform float uPx; void main(){ gl_PointSize = uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; vec3 c = r > 0.34 ? vec3(0.0118, 0.0118, 0.0070) : vec3(0.956, 0.956, 0.913); gl_FragColor = vec4(c, uA);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' });
      o.markers = new THREE.Points(geo, mk); o.markers.renderOrder = 7; o.markers.frustumCulled = false; root.add(o.markers);
    }
    (async () => { const t0 = performance.now(); try { await gl.compileAsync(scene, camState); } catch { /* compileAsync unsupported -> first frame compiles */ } timings.current.compileMs = Math.round(performance.now() - t0);
      if (window.__recon) { window.__recon.timings = { ...window.__recon.timings, ...timings.current }; window.__recon.ready = true; } p.onReady?.(); })();
    return () => { void dispose; };
  }, [assets, gltf, gl, scene, camState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { playAll(actions as never, names); }, [actions, names]);
  useEffect(() => { fetch('/data/camera_path.json').then(r => r.json()).then((j: { keys: { shift_x: number }[] }) => { shift.current = j.keys.map(k => k.shift_x); }); }, []);
  useEffect(() => { // GLB camera becomes the active camera
    const cam = gltf.cameras[0] as THREE.PerspectiveCamera | undefined; if (!cam) return; origCam.current ??= camState; objs.current.cam = cam; fitCamera(cam, size.width, size.height, 0); set({ camera: cam });
    return () => { if (origCam.current) set({ camera: origCam.current as THREE.PerspectiveCamera }); };
  }, [gltf, set]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { // renderer-resource cleanup for this scene
    const g = gltf.scene; g.traverse(x => { const m = x as THREE.Mesh; if (m.isMesh || (x as THREE.Points).isPoints) (x as THREE.Mesh).geometry?.dispose(); }); Object.values(mats.current).forEach(m => m.dispose()); mats.current = {}; useGLTF.clear(NOTEX_GLB);
  }, [gltf]);
  useEffect(() => () => { if (assets) [assets.day, assets.night, assets.mask, assets.region, assets.cloud].forEach(t => t?.dispose()); }, [assets]);

  useFrame((state, dt) => {
    const o = objs.current; const m = mats.current; if (!m.earth) return; const st = stageRef.current; const prog = Math.min(1, Math.max(0, (p.progressRef ? p.progressRef.current : p.progress) ?? 0));
    drive(mixer, actions as never, prog, false, GLB_SECONDS);
    const cam = o.cam; if (cam) { const f = prog * 100, i = Math.min(99, Math.floor(f)), t = f - i; const s2 = st >= 5 && shift.current ? shift.current[i] * (1 - t) + shift.current[i + 1] * t : 0; fitCamera(cam, size.width, size.height, s2); }
    const hh = state.gl.getDrawingBufferSize(new THREE.Vector2()).y; const fov = THREE.MathUtils.degToRad(cam?.fov ?? 28.4);
    const camDist = state.camera.position.length(); // distance of the GLB camera from the Earth centre (world)
    m.earth.uniforms.uStage.value = st >= 2 ? 2 : 1; m.earth.uniforms.uRegionMix.value = assets?.region ? ss(16.0, 11.0, camDist) : 0;
    const earthMesh = gltf.scene.getObjectByName('EARTH_SURFACE'); if (earthMesh) earthMesh.visible = st >= 1;
    const vis = (n: string, on: boolean) => { const x = gltf.scene.getObjectByName(n); if (x) x.visible = on; };
    vis('NIGHT_LIGHTS', st >= 2); vis('CLOUDS', st >= 3); vis('ATMOSPHERE', st >= 3); vis('OCEANS', st >= 4); if (o.border) o.border.visible = st >= 6; if (o.outline) o.outline.visible = st >= 6; if (o.markers) o.markers.visible = st >= 6;
    if (o.clouds && !p.still) o.clouds.rotation.y += dt * 0.004;
    const reveal = ss(0.40, 0.65, prog); for (const k of ['border', 'outline']) { const u = m[k].uniforms; u.uReveal.value = reveal; u.uViewH.value = hh; u.uFov.value = fov; }
    if (o.markers) (o.markers.material as THREE.ShaderMaterial).uniforms.uA.value = ss(0.62, 0.80, prog);
    // HTML label projection (synchronised with the live camera incl. lens shift)
    const reg = p.registry?.current; if (reg && cam) { const v = new THREE.Vector3(), c = cam.getWorldPosition(new THREE.Vector3()); const a = ss(0.62, 0.80, prog) * (st >= 6 ? 1 : 0);
      CITIES.forEach((city, i) => { const el = reg.get(city.id); if (!el) return; v.copy(o.markerPos[i]); const facing = v.clone().normalize().dot(c.clone().sub(v).normalize()); v.project(cam);
        const x = (v.x * 0.5 + 0.5) * size.width, y = (-v.y * 0.5 + 0.5) * size.height; const on = facing > 0.18 && v.z < 1 && x > 8 && x < size.width - 8 && y > 8 && y < size.height - 8;
        el.style.opacity = on ? String(a * ss(0.18, 0.4, facing)) : '0'; el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; }); }
  });
  void scene; return <primitive object={gltf.scene} />;
}


/** Scene-referred pipeline like Blender: render every layer in linear HDR (additive glows sum correctly), then ONE AgX tone-map + sRGB pass to the screen. */
function Composer({ exposure, samples }: { exposure: number; samples: number }) {
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

export function ReconCanvas(props: ReconProps) {
  const [tier, setTier] = useState<Tier | null>(null); const qualityRef = useRef('loading');
  const [probeKey] = useState(0);
  return (
    <Canvas dpr={tier === 'low' ? [1, 1.5] : [1, 2]} camera={{ position: [0, 6, 26], fov: 35, near: 0.05, far: 500 }} gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }} flat
      onCreated={({ gl }) => { gl.toneMapping = THREE.AgXToneMapping; gl.toneMappingExposure = 1; gl.setClearColor(COL.charcoal.clone(), 1); const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const maxTex = gl.capabilities.maxTextureSize; setTier(pickTier(maxTex, { coarse: window.matchMedia('(pointer: coarse)').matches, deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory, override: props.tier ?? q?.get('tier') })); }}>
      <color attach="background" args={['#1E1E14']} />
      {tier && <Suspense fallback={null}><Earth {...props} tier={tier} qualityRef={qualityRef} /></Suspense>}
      {tier && <Composer exposure={props.exposure ?? 1} samples={tier === 'low' ? 0 : 4} />}
      {tier && <Probe key={probeKey} onStats={props.onStats} tier={tier} qualityRef={qualityRef} />}
    </Canvas>
  );
}
