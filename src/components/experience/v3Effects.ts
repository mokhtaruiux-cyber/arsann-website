import * as THREE from 'three';
import { CITIES, R, lonLatToVec3 } from '@/lib/recon/config';

/** Scene 01 v3 live effects, matched to the approved Blender preview (scene01_origin_v3.blend):
 *  1. animated gold technology arcs between every city pair (soft opacity, travelling pulse, glow copy)
 *  2. billowing cloud cover that conquers the frame from the edges inward after the cities were shown */
const ARC_VERT = 'attribute float aPhase; attribute float aStart; varying vec2 vUv; varying float vPhase; varying float vStart; void main(){ vUv = uv; vPhase = aPhase; vStart = aStart; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const ARC_FRAG = `uniform float uTime; uniform float uProg; uniform float uGlow; uniform float uFade; varying vec2 vUv; varying float vPhase; varying float vStart;
void main(){
  float grow = clamp((uProg - vStart) / 0.12, 0.0, 1.0);
  if (vUv.x > grow || grow <= 0.0) discard;
  float f = fract(vUv.x - uTime * 0.288 - vPhase);
  float h = smoothstep(0.88, 1.0, f); h *= h;
  float ends = sin(3.14159265 * vUv.x);
  float a = (uGlow > 0.5 ? (0.07 + 0.25 * h) : (0.30 + 0.60 * h)) * ends * uFade;
  vec3 col = vec3(1.0, 0.62, 0.10) * (1.6 + 10.0 * h);
  gl_FragColor = vec4(col, a);
}`;
const CLOUD_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const CLOUD_FRAG = `uniform float uAmt; uniform float uTime; uniform float uScale; uniform float uSeed; uniform float uAspect; varying vec2 vUv;
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p *= 2.02; a *= 0.5; } return s; }
void main(){
  vec3 p = vec3(vUv * vec2(uAspect * 1.35, 1.1) * 0.8 * uScale + vec2(uSeed, uSeed * 0.7) + vec2(uTime * 0.02, 0.0), uTime * 0.25 + uSeed);   // noise space follows the screen, so clouds keep their shape on any aspect ratio
  float n = fbm(p);
  float st = clamp((n - 0.36) / 0.30, 0.0, 1.0);
  float dens = st + length(vUv - 0.5) * 0.9;          // clouds build from the edges toward the centre
  float th = 1.5 - 1.75 * uAmt;
  float a = smoothstep(th, th + 0.22, dens);
  vec3 col = mix(vec3(0.56, 0.63, 0.76), vec3(1.0), smoothstep(0.35, 0.9, st)) * 2.1;   // matched to Scene 02's opening clouds (hand-off)
  gl_FragColor = vec4(col, a);
}`;
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Linear cloud amount per layer j on the 0..100 scroll scale: 0 at 84+j, 0.5 at 93, 1 at 100. */
const cloudAmt = (j: number, prog: number) => { const k = prog * 100, s = 84 + j; return k <= s ? 0 : k <= 93 ? 0.5 * (k - s) / (93 - s) : 0.5 + 0.5 * Math.min(1, (k - 93) / 7); };

export type V3Fx = { update: (prog: number, time: number, cam: THREE.PerspectiveCamera | undefined, arcsOn: boolean) => void; dispose: () => void };

export function createV3Effects(root: THREE.Object3D, cam: THREE.PerspectiveCamera | undefined): V3Fx {
  // ---- arcs between every pair of cities (28), shared materials, per-vertex phase/start ----
  const group = new THREE.Group(); group.name = 'V3_ARCS';
  const mk = (glow: number) => new THREE.ShaderMaterial({ vertexShader: ARC_VERT, fragmentShader: ARC_FRAG, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uProg: { value: 0 }, uGlow: { value: glow }, uFade: { value: 1 } } });
  const core = mk(0), glow = mk(1); const geos: THREE.BufferGeometry[] = [];
  let k = 0;
  for (let i = 0; i < CITIES.length; i++) for (let j = i + 1; j < CITIES.length; j++, k++) {
    const va = lonLatToVec3(CITIES[i].lon, CITIES[i].lat, 1), vb = lonLatToVec3(CITIES[j].lon, CITIES[j].lat, 1); const ang = va.angleTo(vb); const pts: THREE.Vector3[] = [];
    for (let s = 0; s < 48; s++) { const t = s / 47; pts.push(va.clone().multiplyScalar(1 - t).add(vb.clone().multiplyScalar(t)).normalize().multiplyScalar(R * (1.002 + 0.16 * ang * Math.sin(Math.PI * t)))); }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); const phase = (k * 0.173) % 1, start = (62 + (k % 14) * 2) / 100;
    for (const [mat, r, order] of [[glow, 0.018, 8], [core, 0.0042, 9]] as const) {
      const g = new THREE.TubeGeometry(curve, 47, r, 6, false); const n = g.attributes.position.count;
      g.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(n).fill(phase), 1)); g.setAttribute('aStart', new THREE.BufferAttribute(new Float32Array(n).fill(start), 1));
      const m = new THREE.Mesh(g, mat); m.renderOrder = order; m.frustumCulled = false; group.add(m); geos.push(g);
    }
  }
  group.visible = false; root.add(group);
  // ---- cloud cover: three layers parented to the camera ----
  const layers: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; dist: number }[] = [];
  if (cam) [[1.7, 2.2, 3.1], [1.35, 3.4, 7.7], [1.0, 5.0, 1.9]].forEach(([dist, scale, seed], j) => {
    const mat = new THREE.ShaderMaterial({ vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthTest: false, depthWrite: false, uniforms: { uAmt: { value: 0 }, uTime: { value: 0 }, uScale: { value: scale }, uSeed: { value: seed }, uAspect: { value: 1.78 } } });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); mesh.position.set(0, 0, -dist); mesh.renderOrder = 20 + j; mesh.frustumCulled = false; mesh.visible = false; cam.add(mesh); layers.push({ mesh, mat, dist });
  });
  return {
    update(prog, time, c, arcsOn) {
      group.visible = arcsOn && prog > 0.6;
      if (group.visible) for (const m of [core, glow]) { m.uniforms.uTime.value = time; m.uniforms.uProg.value = prog; m.uniforms.uFade.value = 1 - ss(0.86, 0.95, prog); }
      layers.forEach((l, j) => {
        const a = cloudAmt(j, prog); l.mesh.visible = a > 0.001; if (!l.mesh.visible || !c) return;
        l.mat.uniforms.uAmt.value = a; l.mat.uniforms.uTime.value = time; l.mat.uniforms.uAspect.value = c.aspect;
        const h = 2 * l.dist * Math.tan(THREE.MathUtils.degToRad(c.fov) / 2); l.mesh.scale.set(h * c.aspect * 1.35, h * 1.1, 1);
      });
    },
    dispose() { core.dispose(); glow.dispose(); geos.forEach(g => g.dispose()); root.remove(group); layers.forEach(l => { l.mat.dispose(); l.mesh.geometry.dispose(); l.mesh.removeFromParent(); }); },
  };
}
