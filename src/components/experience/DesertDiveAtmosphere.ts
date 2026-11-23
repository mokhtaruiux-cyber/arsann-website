import * as THREE from 'three';

const noiseGlsl = `float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p *= 2.02; a *= 0.5; } return s; }`;
const cloudVert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const cloudFrag = `${noiseGlsl}
uniform float uAmt; uniform float uTime; uniform float uAspect; varying vec2 vUv;
void main(){ vec3 p = vec3(vUv * vec2(uAspect * 1.4, 1.2) * 5.4 + vec2(3.1, 2.2) + vec2(uTime * 0.02, 0.0), uTime * 0.25 + 3.1); float n = fbm(p); float st = clamp((n - 0.36) / 0.30, 0.0, 1.0);
  float dens = st + length(vUv - 0.5) * 0.5; float th = 1.35 - 1.75 * uAmt; float a = smoothstep(th, th + 0.25, dens);
  vec3 col = mix(vec3(0.50, 0.58, 0.74), vec3(1.0), smoothstep(0.35, 0.9, st)) * 1.5; gl_FragColor = vec4(col, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const arcVert = 'attribute float aPhase; attribute float aStart; varying vec2 vUv; varying float vPhase; varying float vStart; void main(){ vUv = uv; vPhase = aPhase; vStart = aStart; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const arcFrag = `uniform float uTime; uniform float uProg; uniform float uGlow; uniform float uFade; varying vec2 vUv; varying float vPhase; varying float vStart;
void main(){ float grow = clamp((uProg - vStart) / 0.117, 0.0, 1.0); if (vUv.x > grow || grow <= 0.0 || uFade <= 0.0) discard;
  float f = fract(vUv.x - uTime * 0.288 - vPhase); float h = smoothstep(0.88, 1.0, f); h *= h; float ends = sin(3.14159265 * vUv.x);
  float a = (uGlow > 0.5 ? (0.07 + 0.25 * h) : (0.30 + 0.60 * h)) * ends * uFade; gl_FragColor = vec4(vec3(1.0, 0.62, 0.10) * (1.6 + 10.0 * h), a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const cities = [[36.57,28.38],[37.92,26.62],[38.06,24.09],[39.17,21.54],[39.83,21.42],[46.68,24.71],[42.5,18.22]];
const ss = (a: number, b: number, p: number) => THREE.MathUtils.smoothstep(p, a, b);

/** The aerial overlays live in the same world as the actors; they never switch the sand or camera. */
export function makeDesertDiveAtmosphere(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
  const arcs = new THREE.Group(); scene.add(arcs);
  const core = new THREE.ShaderMaterial({ vertexShader: arcVert, fragmentShader: arcFrag, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uProg: { value: 0 }, uGlow: { value: 0 }, uFade: { value: 1 } } });
  const glow = core.clone(); glow.uniforms = { ...core.uniforms, uGlow: { value: 1 } };
  cities.forEach(([lo, la], k) => {
    const dx = (lo - 39.61) * Math.cos(24.5 * Math.PI / 180), dy = la - 24.47, n = Math.hypot(dx, dy);
    const points = Array.from({ length: 48 }, (_, i) => { const t = i / 47; return new THREE.Vector3(dx / n * 7600 * t, 12 + 380 * Math.sin(Math.PI * t * .9), -dy / n * 7600 * t); });
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    for (const [mat, radius] of [[glow, 36], [core, 9]] as const) {
      const geo = new THREE.TubeGeometry(curve, 47, radius, 6, false), count = geo.attributes.position.count;
      geo.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(count).fill(k * .173 % 1), 1));
      geo.setAttribute('aStart', new THREE.BufferAttribute(new Float32Array(count).fill((40 + k * 4) / 240), 1));
      const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 5; arcs.add(mesh);
    }
  });
  const cloudMat = new THREE.ShaderMaterial({ vertexShader: cloudVert, fragmentShader: cloudFrag, transparent: true, depthTest: false, depthWrite: false, uniforms: { uAmt: { value: 1 }, uTime: { value: 0 }, uAspect: { value: 1.78 } } });
  const cloud = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cloudMat); cloud.renderOrder = 20; cloud.frustumCulled = false; camera.add(cloud);
  const labelPoint = new THREE.Vector3();
  return {
    update(p: number, time: number, label: HTMLDivElement | null, width: number, height: number) {
      core.uniforms.uTime.value = time; core.uniforms.uProg.value = p; core.uniforms.uFade.value = 1 - ss(.50, .69, p); arcs.visible = p < .69;
      const f = p * 240, amt = f < 24 ? .95 : f < 56 ? .9 + (.28 - .9) * (f - 24) / 32 : f < 110 ? .28 + (.18 - .28) * (f - 56) / 54 : f < 150 ? .18 * (1 - (f - 110) / 40) : 0;
      cloudMat.uniforms.uAmt.value = amt * .95 + .1; cloudMat.uniforms.uTime.value = time; cloudMat.uniforms.uAspect.value = camera.aspect; cloud.visible = p < .65;
      const distance = Math.max(1, camera.near * 2), h = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      cloud.position.z = -distance; cloud.scale.set(h * camera.aspect * 1.4, h * 1.2, 1);
      if (label) {
        camera.updateMatrixWorld(true); labelPoint.set(0, 12, 0).project(camera);
        label.style.opacity = String(ss(.16, .22, p) * (1 - ss(.50, .69, p)) * (labelPoint.z < 1 ? 1 : 0));
        label.style.transform = `translate3d(${(labelPoint.x * .5 + .5) * width}px, ${(-labelPoint.y * .5 + .5) * height}px, 0)`;
      }
    },
  };
}
