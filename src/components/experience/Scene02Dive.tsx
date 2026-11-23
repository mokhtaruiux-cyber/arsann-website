'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Scene 02 "The Dive" browser review. Terrain = GLB exported from scenes/scene-02-the-dive/scene02_dive.blend; camera/world keys = /data/scene02_path.json.
 *  Sand, sky, haze, clouds, arcs and the neon name are rebuilt live (same look as the Blender stills). Query: ?p=0.5 fixes progress, ?autoplay=0 stops playback. */
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const noiseGlsl = `float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p *= 2.02; a *= 0.5; } return s; }`;
const SAND_VERT = 'varying vec3 vLocal; varying vec3 vN; varying vec3 vWorld; uniform vec3 uScale; void main(){ vLocal = position; vN = normalize(mat3(modelMatrix) * normal / vec3(uScale.x, uScale.z, uScale.y)); vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const SAND_FRAG = `${noiseGlsl}
uniform sampler2D uCol; uniform sampler2D uNrm; uniform sampler2D uRgh;
uniform vec3 uSun; uniform vec3 uCam; uniform float uDens; uniform float uDusk; varying vec3 vLocal; varying vec3 vN; varying vec3 vWorld;
void main(){
  float dist = length(vWorld - uCam); float detail = 1.0 / (1.0 + dist * 0.0009);
  vec2 uvA = vLocal.xz * 0.5, uvB = vLocal.xz * 0.113;
  vec3 cA = texture2D(uCol, uvA).rgb, cB = texture2D(uCol, uvB).rgb; vec3 tex = mix(cA, cB, 0.5);
  float big = fbm(vLocal * 0.1225 + 3.0); float mid = fbm(vLocal * 0.9 + 11.0);
  vec3 proc = mix(vec3(0.46, 0.30, 0.17), vec3(0.72, 0.52, 0.31), smoothstep(0.28, 0.72, big)) * (0.86 + 0.28 * mid);
  vec3 col = mix(proc, tex * vec3(1.12, 0.94, 0.80), 0.6); col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), 0.1);   // paler, like the Blender render
  vec3 nm = texture2D(uNrm, uvA).xyz * 2.0 - 1.0; vec3 nm2 = texture2D(uNrm, uvB).xyz * 2.0 - 1.0; nm = normalize(nm + nm2 * 0.6);
  vec3 n = normalize(normalize(vN) + vec3(nm.x, 0.0, nm.y) * 0.9 * detail);
  float rough = texture2D(uRgh, uvA).r;
  float ndl = max(dot(n, normalize(uSun)), 0.0); float wrap = max(dot(n, normalize(uSun)) * 0.5 + 0.5, 0.0);
  float sunK = 1.0 - uDusk * 0.74; vec3 light = vec3(1.0, 0.72, 0.46) * (3.0 * ndl + 0.6 * wrap * wrap) * sunK + mix(vec3(0.72, 0.80, 1.0) * 0.55, vec3(0.55, 0.52, 0.85) * 0.62, uDusk) + vec3(1.0, 0.8, 0.6) * 0.25 * (1.0 - uDusk);
  col *= mix(vec3(1.0), vec3(1.02, 0.78, 0.6), uDusk); vec3 lit = col * light * 0.95 + vec3(1.0, 0.85, 0.6) * pow(max(dot(reflect(-normalize(uSun), n), normalize(uCam - vWorld)), 0.0), 24.0) * (1.0 - rough) * 0.25;
  float haze = 1.0 - exp(-dist * uDens); vec3 hz = mix(vec3(1.0, 0.80, 0.60) * 1.7, vec3(0.78, 0.52, 0.58) * 0.9, uDusk);
  gl_FragColor = vec4(mix(lit, hz, haze), 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const SKY_FRAG = `uniform vec3 uSun; uniform float uDusk; varying vec3 vDir;
void main(){ vec3 d = normalize(vDir); float h = clamp(d.y, 0.0, 1.0);
  vec3 top = vec3(0.42, 0.62, 0.95) * 1.0; vec3 hor = vec3(1.0, 0.93, 0.82) * 2.6;
  vec3 c = mix(hor, top, pow(h, 0.45)); float sd = max(dot(d, normalize(uSun)), 0.0); c += vec3(1.0, 0.78, 0.5) * (pow(sd, 6.0) * 0.9 + pow(sd, 60.0) * 2.5) * (1.0 - uDusk);
  // dusk (Figma "The Road"): lilac sky, pink horizon, a thin deep-blue band right at the horizon
  vec3 dTop = vec3(0.20, 0.24, 0.56); vec3 dMid = vec3(0.56, 0.40, 0.64); vec3 dHor = vec3(0.98, 0.52, 0.50) * 1.1; vec3 dBand = vec3(0.07, 0.20, 0.48);
  vec3 dc = mix(dHor, dMid, smoothstep(0.0, 0.18, h)); dc = mix(dc, dTop, smoothstep(0.12, 0.7, h)); dc = mix(dBand, dc, smoothstep(0.0, 0.035, h));
  c = mix(c, dc, uDusk);
  gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const ARC_VERT = 'attribute float aPhase; attribute float aStart; varying vec2 vUv; varying float vPhase; varying float vStart; void main(){ vUv = uv; vPhase = aPhase; vStart = aStart; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const ARC_FRAG = `uniform float uTime; uniform float uProg; uniform float uGlow; uniform float uFade; varying vec2 vUv; varying float vPhase; varying float vStart;
void main(){ float grow = clamp((uProg - vStart) / 0.117, 0.0, 1.0); if (vUv.x > grow || grow <= 0.0 || uFade <= 0.0) discard;
  float f = fract(vUv.x - uTime * 0.288 - vPhase); float h = smoothstep(0.88, 1.0, f); h *= h; float ends = sin(3.14159265 * vUv.x);
  float a = (uGlow > 0.5 ? (0.07 + 0.25 * h) : (0.30 + 0.60 * h)) * ends * uFade; gl_FragColor = vec4(vec3(1.0, 0.62, 0.10) * (1.6 + 10.0 * h), a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const CLOUD_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const CLOUD_FRAG = `${noiseGlsl}
uniform float uAmt; uniform float uTime; uniform float uAspect; varying vec2 vUv;
void main(){ vec3 p = vec3(vUv * vec2(uAspect * 1.4, 1.2) * 5.4 + vec2(3.1, 2.2) + vec2(uTime * 0.02, 0.0), uTime * 0.25 + 3.1); float n = fbm(p); float st = clamp((n - 0.36) / 0.30, 0.0, 1.0);
  float dens = st + length(vUv - 0.5) * 0.5; float th = 1.35 - 1.75 * uAmt; float a = smoothstep(th, th + 0.25, dens);
  vec3 col = mix(vec3(0.50, 0.58, 0.74), vec3(1.0), smoothstep(0.35, 0.9, st)) * 1.5; gl_FragColor = vec4(col, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const CITIES: [string, number, number][] = [['Tabuk', 36.57, 28.38], ['AlUla', 37.92, 26.62], ['Yanbu', 38.06, 24.09], ['Jeddah', 39.17, 21.54], ['Makkah', 39.83, 21.42], ['Riyadh', 46.68, 24.71], ['Abha', 42.5, 18.22]];
type Key = { f: number; pos: number[]; quat: number[]; lens: number; s: number; zs: number };

export function Scene02Dive({ progressRef, activeRef, onReady }: { progressRef: React.RefObject<number>; activeRef?: React.RefObject<boolean>; onReady?: () => void }) {
  const host = useRef<HTMLDivElement>(null); const label = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current!; const maxDpr = Math.min(1.5, devicePixelRatio); let dpr = maxDpr; const renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 1.5, powerPreference: 'high-performance' }); renderer.setPixelRatio(dpr); renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.75; el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.3, 400000); scene.add(cam);
    const az = THREE.MathUtils.degToRad(100), el7 = THREE.MathUtils.degToRad(7); const sunB = new THREE.Vector3(Math.sin(az) * Math.cos(el7), Math.cos(az) * Math.cos(el7), Math.sin(el7)); const sun = new THREE.Vector3(sunB.x, sunB.z, -sunB.y);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uSun: { value: sun }, uDusk: { value: 0 } }, vertexShader: 'varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position, 0.0)).xyz; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }', fragmentShader: SKY_FRAG }));
    sky.scale.setScalar(300000); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
    const world = new THREE.Group(); const fx = new THREE.Group(); scene.add(world, fx);
    const dl = new THREE.DirectionalLight(0xffb878, 3.2); dl.position.copy(sun).multiplyScalar(100); const hemi = new THREE.HemisphereLight(0xb8c8f0, 0xd8a878, 0.9); scene.add(dl, hemi);
    const tl = new THREE.TextureLoader(); const ld = (u: string, srgb: boolean) => { const t = tl.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t; };
    const sandU = { uCol: { value: ld('/textures/scene02/sand_Color.jpg', true) }, uNrm: { value: ld('/textures/scene02/sand_NormalGL.jpg', false) }, uRgh: { value: ld('/textures/scene02/sand_Roughness.jpg', false) }, uSun: { value: sun }, uDusk: { value: 0 }, uCam: { value: new THREE.Vector3() }, uDens: { value: 0.0016 }, uScale: { value: new THREE.Vector3(1, 1, 1) } };
    const sandMat = new THREE.ShaderMaterial({ vertexShader: SAND_VERT, fragmentShader: SAND_FRAG, uniforms: sandU });
    // arcs + node
    const arcCore = new THREE.ShaderMaterial({ vertexShader: ARC_VERT, fragmentShader: ARC_FRAG, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uProg: { value: 0 }, uGlow: { value: 0 }, uFade: { value: 1 } } });
    const arcGlow = arcCore.clone(); arcGlow.uniforms = { uTime: arcCore.uniforms.uTime, uProg: arcCore.uniforms.uProg, uGlow: { value: 1 }, uFade: arcCore.uniforms.uFade };
    const bToT = (x: number, y: number, z: number) => new THREE.Vector3(x, z, -y); const GZ = 0.4;
    CITIES.forEach(([, lo, la], k) => {
      const dx = (lo - 39.61) * Math.cos(24.5 * Math.PI / 180) * 111, dy = (la - 24.47) * 111, n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n; const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 48; i++) { const t = i / 47; pts.push(bToT(ux * 190 * t, uy * 190 * t, GZ + 55 * Math.sin(Math.PI * t * 0.9))); }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); const phase = (k * 0.173) % 1, start = (40 + k * 4) / 240;
      for (const [mat, r] of [[arcGlow, 1.8], [arcCore, 0.36]] as const) { const g = new THREE.TubeGeometry(curve, 47, r, 6, false); const c = g.attributes.position.count; g.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(c).fill(phase), 1)); g.setAttribute('aStart', new THREE.BufferAttribute(new Float32Array(c).fill(start), 1)); const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 5; fx.add(m); }
    });
    // clouds: camera-parented sheet
    const cloudMat = new THREE.ShaderMaterial({ vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthTest: false, depthWrite: false, uniforms: { uAmt: { value: 1 }, uTime: { value: 0 }, uAspect: { value: 1.78 } } });
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cloudMat); cloud.position.z = -1; cloud.renderOrder = 20; cloud.frustumCulled = false; cam.add(cloud);
    // The dive ends at the desert landing. Scene03HorseCanvas owns all character and road shots.
    let keys: Key[] = []; let ready = false; const resize = () => { const w = Math.max(2, el.clientWidth), h = Math.max(2, el.clientHeight); renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); }; resize(); window.addEventListener('resize', resize);
    Promise.all([fetch('/data/scene02_path.json').then(r => r.json()), new GLTFLoader().loadAsync('/models/scene02/terrain.glb')]).then(([path, gltf]) => {
      keys = path.keys; gltf.scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = sandMat; m.frustumCulled = false; } }); world.add(gltf.scene);
      // Warm-up while the canvas is still invisible: compile every shader (async, non-blocking), then draw one frame with everything visible so geometry + textures are uploaded before the first scroll into the dive.
      const idle = () => new Promise<void>(res => { const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }; if (w.requestIdleCallback) w.requestIdleCallback(() => res(), { timeout: 1500 }); else setTimeout(res, 60); });
      const warm = async () => { try { await idle();
        const clv = cloud.visible; cloud.visible = true;
        await renderer.compileAsync(scene, cam); await idle(); for (const t of [sandU.uCol.value, sandU.uNrm.value, sandU.uRgh.value]) renderer.initTexture(t);
        await idle(); renderer.render(scene, cam);
        cloud.visible = clv;
      } catch { /* warm-up is an optimisation only */ } ready = true; onReady?.(); };
      void warm();
    }).catch(() => { /* the poster stays; Scene 2 simply does not appear */ });
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), v = new THREE.Vector3(); let raf = 0; const t0 = performance.now(); const clock = { getElapsedTime: () => (performance.now() - t0) / 1000 };
    let lastRenderedProgress = -1;
    const frame = () => {
      raf = requestAnimationFrame(frame); if (!ready) return;
      const U = Math.min(1, Math.max(0, progressRef.current ?? 0));
      // Even on a fast scroll jump, render the correct landing frame once before pausing.
      if (activeRef && !activeRef.current && (U === 0 || U === lastRenderedProgress)) return;
      const f = U * 240; const u = U; const dk = 0; /* daylight edit: no dusk */ const i = Math.min(keys.length - 2, Math.floor(f / 4)); const t = f / 4 - i; const A = keys[i], B = keys[i + 1];
      v.set(A.pos[0] + (B.pos[0] - A.pos[0]) * t, A.pos[1] + (B.pos[1] - A.pos[1]) * t, A.pos[2] + (B.pos[2] - A.pos[2]) * t); cam.position.copy(v);
      qa.set(A.quat[0], A.quat[1], A.quat[2], A.quat[3]); qb.set(B.quat[0], B.quat[1], B.quat[2], B.quat[3]); cam.quaternion.copy(qa).slerp(qb, t); cam.quaternion.premultiply(qP);
      const portraitZoom = Math.min(2.4, Math.max(1, 0.55 * (16 / 9) / cam.aspect));   // Preserve the dive framing on portrait screens.
      const lens = (A.lens + (B.lens - A.lens) * t) * portraitZoom; const vf = 2 * Math.atan(36 / (2 * lens) / cam.aspect); cam.fov = THREE.MathUtils.radToDeg(vf); cam.updateProjectionMatrix();
      const s = A.s + (B.s - A.s) * t, zs = A.zs + (B.zs - A.zs) * t; world.scale.set(s, zs, s); fx.scale.set(s, s, s); sandU.uScale.value.set(s, s, zs); sandU.uCam.value.copy(cam.position); sandU.uDens.value = 0.6 * 0.0016 / s; sandU.uDusk.value = dk; (sky.material as THREE.ShaderMaterial).uniforms.uDusk.value = dk; dl.intensity = 3.2 * (1 - dk) + 0.05; hemi.intensity = 0.9 + 0.5 * dk; hemi.color.setHex(dk > 0.5 ? 0x8f9cd8 : 0xb8c8f0);
      arcCore.uniforms.uTime.value = clock.getElapsedTime(); arcCore.uniforms.uProg.value = u; arcCore.uniforms.uFade.value = 1 - ss(120 / 240, 165 / 240, u);
      const amtF = f < 24 ? 0.95 : f < 56 ? 0.9 + (0.28 - 0.9) * (f - 24) / 32 : f < 110 ? 0.28 + (0.18 - 0.28) * (f - 56) / 54 : f < 150 ? 0.18 * (1 - (f - 110) / 40) : 0;
      cloudMat.uniforms.uAmt.value = amtF * 0.95 + 0.1; cloudMat.uniforms.uTime.value = clock.getElapsedTime(); cloudMat.uniforms.uAspect.value = cam.aspect; cloud.visible = f < 156;
      const h = 2 * Math.tan(vf / 2); cloud.scale.set(h * cam.aspect * 1.4, h * 1.2, 1); cloud.position.z = -1; sky.position.copy(cam.position);
      const L = label.current; if (L) { const alt = cam.position.y; const wp = new THREE.Vector3(0, GZ * s, 0).project(cam); const vis = ss(0.16, 0.22, u) * ss(120, 520, alt) * (wp.z < 1 ? 1 : 0); L.style.opacity = String(vis); L.style.transform = `translate3d(${((wp.x * 0.5 + 0.5) * el.clientWidth).toFixed(1)}px, ${((-wp.y * 0.5 + 0.5) * el.clientHeight).toFixed(1)}px, 0)`; }
      renderer.render(scene, cam);
      lastRenderedProgress = U;
      // adaptive resolution: keeps the dive near 60 fps on slower GPUs / big screens (drops 0.2 at a time, recovers slowly)
      const now = performance.now(), dt = now - lastT; lastT = now; if (dt < 100) { accT += dt; accN++; if (accN >= 45) { const avg = accT / accN; accT = 0; accN = 0; if (avg > 24 && dpr > 0.85) { dpr = Math.max(0.85, dpr - 0.2); renderer.setPixelRatio(dpr); resize(); } else if (avg < 15 && dpr < maxDpr) { dpr = Math.min(maxDpr, dpr + 0.1); renderer.setPixelRatio(dpr); resize(); } } }
    };
    let lastT = performance.now(), accT = 0, accN = 0;
    frame();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, [progressRef, activeRef, onReady]);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />
      <div ref={label} style={{ position: 'absolute', left: 0, top: 0, opacity: 0, pointerEvents: 'none', willChange: 'transform' }}>
        <i style={{ position: 'absolute', left: -4, top: -4, width: 8, height: 8, borderRadius: 8, background: '#fff0c2', boxShadow: '0 0 6px #c98a10, 0 0 14px #c98a10' }} />
        <span style={{ position: 'absolute', left: 16, top: 0, transform: 'translateY(-50%)', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 18, letterSpacing: '.14em', color: '#ffd978', textShadow: '0 0 2px rgba(70,40,0,.95), 0 1px 3px rgba(70,40,0,.9), 0 0 8px rgba(120,75,0,.6), 0 0 16px rgba(255,200,70,.55)' }}>MADINAH</span>
      </div>
    </div>
  );
}
