'use client';
import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scene02Progress, scene03Progress, scene04Progress } from '@/lib/scene01/progress';
import { makeDesertDiveAtmosphere } from './DesertDiveAtmosphere';
import { makeHorseHalter } from './HorseHalter';
import { finishOrganicGeometry, makeCharacterEnvironment, makeHorseEyes } from './HeritageCharacterFinish';

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
type View = { at: number; p: THREE.Vector3; target: THREE.Vector3; lens: number };
const VIEWS: View[] = [
  // Establish the horse as the subject, then arc toward its muzzle and the rein.
  { at: 0, p: new THREE.Vector3(6.2, 3.2, 7.2), target: new THREE.Vector3(.72, .85, -.5), lens: 39 },
  { at: .16, p: new THREE.Vector3(5.7, 3.0, 6.4), target: new THREE.Vector3(.75, .95, -.45), lens: 40 },
  // Travel around the back, keeping clear of the horse, to the opposite cheek.
  { at: .28, p: new THREE.Vector3(.2, 2.2, 3.5), target: new THREE.Vector3(.72, 1.0, -.4), lens: 40 },
  { at: .38, p: new THREE.Vector3(-1.8, 1.65, .7), target: new THREE.Vector3(.75, 1.28, -.7), lens: 46 },
  // Figma 28:82: face on the right looking left; negative space on the left.
  { at: .50, p: new THREE.Vector3(-.95, 1.47, -1.35), target: new THREE.Vector3(.78, 1.38, -1.14), lens: 58 },
  { at: .58, p: new THREE.Vector3(-1.02, 1.44, -1.55), target: new THREE.Vector3(.78, 1.36, -1.18), lens: 59 },
  // Orbit in front of the muzzle without passing through either actor.
  { at: .65, p: new THREE.Vector3(-.35, 1.48, -2.05), target: new THREE.Vector3(.69, 1.18, -1.34), lens: 40 },
  // Figma 28:107: horse and snap on the left, the actual hand and rope on the right.
  { at: .74, p: new THREE.Vector3(.65, 1.02, -3.7), target: new THREE.Vector3(.04, .91, -2.35), lens: 25 },
  { at: .84, p: new THREE.Vector3(2.4, 1.05, -1.45), target: new THREE.Vector3(.22, .88, -1.75), lens: 36 },
  // Figma 28:134: show the golden lead, move to the hand, and follow the disappearing line toward the halter.
  { at: .88, p: new THREE.Vector3(1.65, 1.2, -.8), target: new THREE.Vector3(.24, .95, -1.56), lens: 30 },
  { at: .91, p: new THREE.Vector3(1.65, 1.08, -2.85), target: new THREE.Vector3(-.30, .78, -2.72), lens: 44 },
  { at: .94, p: new THREE.Vector3(1.55, 1.10, -2.05), target: new THREE.Vector3(.05, .75, -2.18), lens: 44 },
  { at: .97, p: new THREE.Vector3(1.48, 1.15, -1.41), target: new THREE.Vector3(.56, 1.02, -1.34), lens: 45 },
  { at: 1, p: new THREE.Vector3(1.14, 1.27, -1.11), target: new THREE.Vector3(.86, 1.255, -.94), lens: 83 },
];

function duneHeight(x: number, y: number) {
  const foreground = .025 * Math.sin(x * .19 + y * .13) + .018 * Math.sin(x * .09 - y * .16);
  const a = 1.35 * Math.exp(-(((y - (17 + 7 * Math.sin(x * .052))) / 8.5) ** 2));
  const b = Math.exp(-(((y - (34 - 10 * Math.sin(x * .043 + .6))) / 12) ** 2));
  const c = .55 * Math.exp(-(((y - (53 + 8 * Math.sin(x * .035))) / 15) ** 2));
  return foreground + a + b + c + .1 * Math.sin(x * .25 + y * .11) * Math.sin(y * .17);
}

function makeDunes(segmentsX: number, segmentsZ: number) {
  const g = new THREE.BufferGeometry(), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  // One continuous mesh: dense local dunes under the actors, increasingly wide cells
  // out to the aerial horizon. The camera never swaps terrain or rescales the actors.
  const axis = (n: number) => {
    const outer = Array.from({ length: 48 }, (_, i) => 70 * Math.pow(45000 / 70, (i + 1) / 48));
    return [...outer.map(x => -x).reverse(), ...Array.from({ length: n + 1 }, (_, i) => -70 + 140 * i / n), ...outer];
  };
  const xs = axis(segmentsX), zs = axis(segmentsZ).reverse();
  for (const z of zs) {
    const sourceY = -z;
    for (const x of xs) {
      const t = smooth((Math.hypot(x, z) - 55) / 180);
      const macro = 10 * Math.sin(x * .0013 + z * .0017) + 7 * Math.cos(x * .0021 - z * .0011) + 3 * Math.sin(x * .004 - z * .003);
      pos.push(x, mix(duneHeight(x, sourceY), macro, t), z); uv.push(x * .14, sourceY * .14);
    }
  }
  for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) { const a = j * xs.length + i, b = a + xs.length; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xd9bd96, roughness: .94, metalness: 0 })); m.receiveShadow = true; return m;
}

function skyMaterial() {
  return new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: 'varying vec3 vDir; void main(){ vDir=normalize((modelMatrix*vec4(position,0.0)).xyz); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }', fragmentShader: 'varying vec3 vDir; void main(){ float h=clamp(vDir.y*.5+.5,0.0,1.0); vec3 low=vec3(.72,.75,.77); vec3 mid=vec3(.48,.65,.77); vec3 high=vec3(.18,.37,.58); vec3 c=mix(low,mid,smoothstep(.34,.61,h)); c=mix(c,high,smoothstep(.60,.94,h)); float sun=pow(max(dot(normalize(vDir),normalize(vec3(-.45,.74,.5))),0.0),160.0); c+=vec3(1.0,.78,.48)*sun*.45; gl_FragColor=vec4(c,1.0); }' });
}

function leatherTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'); if (!ctx) return null;
  ctx.fillStyle = '#baa18b'; ctx.fillRect(0, 0, 256, 256);
  // Fine, repeatable leather grain; the helically braided strands provide the larger woven pattern.
  let seed = 93817;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 5200; i++) {
    const v = rand(), a = .025 + rand() * .10;
    ctx.fillStyle = v > .55 ? `rgba(210,178,148,${a})` : `rgba(0,0,0,${a})`;
    const x = rand() * 256, y = rand() * 256, r = .25 + rand() * .8;
    ctx.fillRect(x, y, r, r * (1.2 + rand()));
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(2, 1); map.anisotropy = 6;
  const bump = map.clone(); bump.colorSpace = THREE.NoColorSpace; bump.needsUpdate = true;
  return { map, bump };
}

function dissolveLeather(material: THREE.MeshPhysicalMaterial, progress: { value: number }, gold: { value: number }) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uReinDissolve = progress;
    shader.uniforms.uReinGold = gold;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aReinPath;\nvarying float vReinPath;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvReinPath = aReinPath;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uReinDissolve;\nuniform float uReinGold;\nvarying float vReinPath;')
      .replace('#include <opaque_fragment>', `
        float reinNoise = fract(sin(vReinPath * 113.17 + 12.9898) * 43758.5453);
        float breakup = smoothstep(0.0, 0.1, uReinDissolve);
        float reinCut = clamp(1.0 - uReinDissolve + (reinNoise - 0.5) * 0.055 * breakup, 0.0, 1.0);
        if (uReinDissolve >= .999 || vReinPath > reinCut) discard;
        float reinEdge = smoothstep(reinCut - 0.028, reinCut + 0.012, vReinPath);
        float goldRim = pow(1.0 - abs(normalize(normal).z), 2.5);
        outgoingLight = mix(outgoingLight, outgoingLight * vec3(1.34, 1.12, .70) + vec3(.76, .34, .035) * (.08 + goldRim * .18), uReinGold);
        outgoingLight += vec3(1.15, 0.57, 0.16) * reinEdge * breakup * 1.65;
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'arsann-braided-rein-dissolve-v2';
}

function dissolveShadow(progress: { value: number }) {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.onBeforeCompile = shader => {
    shader.uniforms.uReinDissolve=progress;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float aReinPath; varying float vReinPath;').replace('#include <begin_vertex>','#include <begin_vertex>\nvReinPath=aReinPath;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uReinDissolve; varying float vReinPath;').replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nfloat n=fract(sin(vReinPath*113.17+12.9898)*43758.5453); float edge=clamp(1.0-uReinDissolve+(n-.5)*.055*smoothstep(0.0,.1,uReinDissolve),0.0,1.0); if(uReinDissolve>=.999 || vReinPath>edge) discard;');
  }; mat.customProgramCacheKey=()=> 'arsann-rein-shadow-v2'; return mat;
}

function makeBraidedRein(curve: THREE.CatmullRomCurve3, material: THREE.MeshPhysicalMaterial, dissolve: { value: number }, gold: { value: number }) {
  const group = new THREE.Group(); const length = curve.getLength(), samples = Math.max(64, Math.ceil(length * 220)), turns = Math.max(4, Math.round(length / .047)); const frames = curve.computeFrenetFrames(samples, false);
  const coreGeometry = new THREE.TubeGeometry(curve, samples, .008, 8, false); addReinPathAttribute(coreGeometry);
  const core = new THREE.Mesh(coreGeometry, material.clone());
  dissolveLeather(core.material as THREE.MeshPhysicalMaterial, dissolve, gold); core.customDepthMaterial=dissolveShadow(dissolve); core.castShadow = true; group.add(core);
  for (let strand = 0; strand < 3; strand++) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples, phase = t * Math.PI * 2 * turns + strand * Math.PI * 2 / 3;
      const radial = frames.normals[i].clone().multiplyScalar(Math.cos(phase)).addScaledVector(frames.binormals[i], Math.sin(phase));
      points.push(curve.getPointAt(t).addScaledVector(radial, .008));
    }
    const strandCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal', .5);
    const geometry = new THREE.TubeGeometry(strandCurve, samples * 2, .0068, 7, false);
    addReinPathAttribute(geometry);
    const strandMaterial = material.clone(); dissolveLeather(strandMaterial, dissolve, gold);
    const mesh = new THREE.Mesh(geometry, strandMaterial); mesh.customDepthMaterial=dissolveShadow(dissolve); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
  return group;
}

function addReinPathAttribute(geometry: THREE.BufferGeometry) {
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute; const path = new Float32Array(uv.count);
  for (let i = 0; i < uv.count; i++) path[i] = uv.getX(i);
  geometry.setAttribute('aReinPath', new THREE.BufferAttribute(path, 1));
}

function addLeatherCurve(parent: THREE.Object3D, points: THREE.Vector3[], radius: number, material: THREE.Material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal', .5);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(32, points.length * 10), radius, 10, closed), material);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

/** A single desert world and camera for the aerial dive and the six heritage views. */
export function Scene03HorseCanvas({ diveProgressRef = scene02Progress.ref, heritageProgressRef, standalone = false }: { diveProgressRef?: RefObject<number>; heritageProgressRef?: RefObject<number>; standalone?: boolean } = {}) {
  const host = useRef<HTMLDivElement>(null), label = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current; if (!el) return;
    const coarse = window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    // Render the same new characters at a reduced resolution and terrain density on phones.
    const renderer = new THREE.WebGLRenderer({ antialias: !coarse, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(coarse ? 1 : 1.35, window.devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.15; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    // CSS dimensions must match the camera viewport, independent of the physical rendering resolution.
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' }); el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xaec5d4);
    const fog = new THREE.FogExp2(0x9bb4c5, .0014); scene.fog = fog;
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 650); scene.add(camera);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMaterial()); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
    const atmosphere = makeDesertDiveAtmosphere(scene, camera);
    const characterEnvironment = makeCharacterEnvironment(renderer);
    const hemi = new THREE.HemisphereLight(0xd8e6f3, 0x9c7750, 1.35); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffedcf, 3.0); sun.position.set(-16, 24, 8); sun.castShadow = true; sun.shadow.mapSize.set(coarse ? 768 : 1280, coarse ? 768 : 1280); sun.shadow.camera.left = -20; sun.shadow.camera.right = 20; sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20; sun.shadow.bias = -.00022; sun.shadow.normalBias = .035; sun.target.position.set(0, 0, -5); scene.add(sun, sun.target);
    const ground = makeDunes(coarse ? 84 : 150, coarse ? 68 : 122); scene.add(ground);
    const loader = new THREE.TextureLoader().setPriority('low');
    const textures: THREE.Texture[] = [];
    const tex = (name: string, srgb: boolean) => { const path = `/textures/scene03/Ground097_2K-JPG_${name}.jpg`; const t = loader.load(path); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = coarse ? 2 : 6; textures.push(t); return t; };
    const groundMat = ground.material as THREE.MeshStandardMaterial; groundMat.map = tex('Color', true); groundMat.normalMap = tex('NormalGL', false); groundMat.roughnessMap = tex('Roughness', false); groundMat.normalScale.set(.42, .42); groundMat.needsUpdate = true;
    groundMat.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vDesertXZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvDesertXZ = position.xz;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vDesertXZ;').replace('#include <map_fragment>', `#include <map_fragment>
        float macro = sin(vDesertXZ.x * .0013 + sin(vDesertXZ.y * .0017) * 1.8) * .5 + cos(vDesertXZ.y * .0031 - vDesertXZ.x * .0011) * .3;
        diffuseColor.rgb *= 1.0 + macro * .19 * smoothstep(55.0, 250.0, length(vDesertXZ));`);
    };
    const actors = new THREE.Group(); scene.add(actors); let ready = false, dead = false, loading = false; let horseRoot: THREE.Group | null = null, manRoot: THREE.Group | null = null; const paths: THREE.Mesh[] = [];
    const reinDissolve = { value: 0 }, tailDissolve = { value: 0 }, reinGold = { value: 1 }; let leatherMaps: { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } | null = null; let eyeTexture: THREE.Texture | null = null;
    const load = async () => {
      if (loading || ready || dead) return; loading = true;
      try {
        const [h, m] = await Promise.all([new GLTFLoader().setPriority('low').loadAsync('/models/scene03/horse.glb'), new GLTFLoader().setPriority('low').loadAsync('/models/scene03/man.glb')]);
        if (dead) return;
        horseRoot = h.scene; horseRoot.scale.setScalar(2); horseRoot.position.set(.78, .84, -.05); horseRoot.rotation.y = Math.PI;
        // Keep the handler behind and left of the horse so the close shot reads as horse + hand,
        // not a portrait of the man. The lead terminates at the visible right-hand grip.
        manRoot = m.scene; manRoot.scale.setScalar(1.8); manRoot.position.set(-.72, .9, -2.85); manRoot.rotation.y = Math.PI;
        for (const [root,kind] of [[horseRoot,'horse'],[manRoot,'man']] as const) root.traverse(o => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
          finishOrganicGeometry(mesh.geometry,kind);
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; for (const mat of mats) { const std = mat as THREE.MeshStandardMaterial; if (std.isMeshStandardMaterial) {
            std.envMap = characterEnvironment.texture; std.envMapIntensity = kind==='horse' ? .78 : .48; std.metalness = 0; std.flatShading = false; std.roughness = kind==='horse' ? .69 : .93;
            if(kind==='horse' && std.map){
              std.emissive.setHex(0xffffff);std.emissiveMap=std.map;std.emissiveIntensity=.09;std.roughness=.56;
              // A restrained sun-coloured grazing highlight on the coat, not a scene-wide exposure change.
              // Keep the shared landing/dune lighting exactly as approved.
              std.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>', `
                vec3 coatSun = normalize(mat3(viewMatrix) * vec3(-.75,.65,-.45));
                float coatRim = pow(1.0 - max(dot(normal,normalize(vViewPosition)),0.0), 2.4);
                float coatBack = max(dot(normal,coatSun),0.0);
                outgoingLight += diffuseColor.rgb * vec3(1.0,.65,.28) * coatRim * coatBack * .95;
                #include <opaque_fragment>`);};
              std.customProgramCacheKey=()=> 'heritage-coat-rim-v1';
            }
            std.needsUpdate = true;
          } } });
        actors.add(horseRoot, manRoot);
        const eyes = makeHorseEyes(horseRoot, characterEnvironment.texture); actors.add(eyes.group); eyeTexture=eyes.map;
        leatherMaps = leatherTexture();
        const leather = new THREE.MeshPhysicalMaterial({ color: 0x985b38, map: leatherMaps?.map, bumpMap: leatherMaps?.bump, bumpScale: .0012, roughness: .47, metalness: 0, clearcoat: .25, clearcoatRoughness: .33, envMap:characterEnvironment.texture,envMapIntensity:.65 });
        const strapLeather = leather.clone(); strapLeather.color.setHex(0x895639); strapLeather.side = THREE.DoubleSide;
        const { tack, leadStart } = makeHorseHalter(horseRoot, strapLeather); actors.add(tack);
        tack.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.isMesh){const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const mat of mats){const m=mat as THREE.MeshStandardMaterial;if(m.isMeshStandardMaterial){m.envMap=characterEnvironment.texture;m.envMapIntensity=.9;m.needsUpdate=true;}}}});
        // Actual hand surface is at (-.46, .79, -2.96), measured from the imported man mesh and skin texture.
        const handGrip = new THREE.Vector3(-.472, .765, -2.955);
        const reinCurve = new THREE.CatmullRomCurve3([leadStart, new THREE.Vector3(.70, 1.05, -1.14), new THREE.Vector3(.37, .83, -1.65), new THREE.Vector3(-.09, .68, -2.28), new THREE.Vector3(-.36, .73, -2.78), handGrip], false, 'centripetal', .5);
        const goldLeather = leather.clone(); goldLeather.color.setHex(0xe7a43a); goldLeather.metalness=.44; goldLeather.roughness=.36; goldLeather.envMapIntensity=1.15; goldLeather.clearcoat=.32;
        actors.add(makeBraidedRein(reinCurve, goldLeather, reinDissolve, reinGold));
        // The loose end exits the same palm and hangs naturally instead of stopping in mid-air.
        const tail = new THREE.CatmullRomCurve3([handGrip, new THREE.Vector3(-.45,.70,-2.95), new THREE.Vector3(-.42,.53,-2.91), new THREE.Vector3(-.44,.34,-2.87)], false, 'centripetal');
        actors.add(makeBraidedRein(tail, goldLeather, tailDissolve, reinGold));
        goldLeather.dispose();
        const pathMat = new THREE.MeshStandardMaterial({ color: 0xffe7b4, emissive: 0xc59749, emissiveIntensity: .22, roughness: .48 });
        for (const x of [-2.2, -5.2]) { const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x + 1.4, .17, 20), new THREE.Vector3(x + .5, .12, 8), new THREE.Vector3(x, .08, -8), new THREE.Vector3(x + .8, .28, -34)]); const path = new THREE.Mesh(new THREE.TubeGeometry(curve, 112, .055, 8, false), pathMat.clone()); path.castShadow = true; paths.push(path); scene.add(path); }
        ready = true; el.dataset.glbReady = 'true';
      } catch { loading = false; /* keep the scene shell; browser fallback owns WebGL failures */ }
    };
    const resize = () => { const w = Math.max(2, el.clientWidth), h = Math.max(2, el.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let raf = 0; const startedAt = performance.now();
    // Preload the new subjects while still behind the Earth; their positions never change during the dive.
    void load();
    const desired = new THREE.Vector3(), target = new THREE.Vector3();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dive = clamp(diveProgressRef.current), u = clamp(heritageProgressRef?.current ?? (standalone ? 0 : scene03Progress.ref.current)), car = standalone ? 0 : clamp(scene04Progress.ref.current);
      if (!standalone && (dive <= 0 || car >= .08)) return;
      if (!ready && !loading) void load();
      let lens: number;
      if (dive < 1 && u === 0) {
        const start = VIEWS[0], descent = smooth((dive - .05) / .95), approach = smooth((dive - .43) / .57);
        // Start vertically above Madinah, then descend to the exact position and viewing direction of the first heritage shot.
        desired.set(mix(.01, start.p.x, approach), start.p.y + (12000 - start.p.y) * Math.pow(1 - descent, 2.7), mix(.01, start.p.z, approach));
        target.set(start.target.x * approach, start.target.y * approach, start.target.z * approach);
        lens = mix(24, start.lens, smooth((dive - .58) / .42));
      } else {
        let i = 0; while (i < VIEWS.length - 2 && u > VIEWS[i + 1].at) i++;
        const a = VIEWS[i], b = VIEWS[i + 1], t = smooth((u - a.at) / (b.at - a.at));
        desired.lerpVectors(a.p, b.p, t); target.lerpVectors(a.target, b.target, t); lens = mix(a.lens, b.lens, t);
      }
      const fov = 2 * Math.atan(24 / (2 * lens) * Math.max(1, 1.3 / camera.aspect)) * 180 / Math.PI;
      camera.position.copy(desired); camera.lookAt(target); camera.fov = fov;
      camera.near = Math.max(.1, desired.y * .001); camera.far = Math.max(950, desired.y * 5); camera.updateProjectionMatrix();
      // Preserve the approved landing's desktop crop while correcting the canvas size for the close-ups.
      // Ease out of the crop before the first Figma close-up, without moving either character.
      const crop = 1 + (renderer.getPixelRatio() - 1) * smooth((dive - .7) / .3) * (1 - smooth((u - .16) / .22));
      if (crop > 1.001) camera.setViewOffset(el.clientWidth * crop, el.clientHeight * crop, 0, 0, el.clientWidth, el.clientHeight);
      else if (camera.view?.enabled) camera.clearViewOffset();
      sky.position.copy(camera.position); sky.scale.setScalar(camera.far * .8 / 500);
      fog.density = .0014 / (1 + desired.y / 300); renderer.toneMappingExposure = mix(1.15, 1.55, smooth(desired.y / 1000));
      atmosphere.update(dive, (now - startedAt) / 1000, label.current, el.clientWidth, el.clientHeight);
      // The loose end vanishes first, then the lead retracts from hand (t=1) toward the halter (t=0).
      tailDissolve.value = smooth((u - .89) / .035);
      reinDissolve.value = smooth((u - .915) / .08);
      reinGold.value = 1;
      const glow = smooth((u - .84) / .12); for (const path of paths) (path.material as THREE.MeshStandardMaterial).emissiveIntensity = .12 + glow * .28;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);
    return () => { dead = true; delete el.dataset.glbReady; ro.disconnect(); cancelAnimationFrame(raf); renderer.dispose(); ground.geometry.dispose(); (ground.material as THREE.Material).dispose(); textures.forEach(t => t.dispose()); leatherMaps?.map.dispose(); leatherMaps?.bump.dispose(); eyeTexture?.dispose(); characterEnvironment.dispose(); scene.traverse(o => { const mesh = o as THREE.Mesh; if (mesh !== ground) mesh.geometry?.dispose(); mesh.customDepthMaterial?.dispose(); const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; ms.forEach(m => m?.dispose()); }); renderer.domElement.remove(); };
  }, [diveProgressRef, heritageProgressRef, standalone]);
  return <div style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
    <div ref={host} className="s03-horse-canvas" style={{ position: 'absolute', inset: 0 }} />
    <div ref={label} style={{ position: 'absolute', left: 0, top: 0, opacity: 0, pointerEvents: 'none', willChange: 'transform' }}>
      <i style={{ position: 'absolute', left: -4, top: -4, width: 8, height: 8, borderRadius: 8, background: '#fff0c2', boxShadow: '0 0 6px #c98a10, 0 0 14px #c98a10' }} />
      <span style={{ position: 'absolute', left: 16, top: 0, transform: 'translateY(-50%)', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 18, letterSpacing: '.14em', color: '#ffd978', textShadow: '0 0 2px rgba(70,40,0,.95), 0 1px 3px rgba(70,40,0,.9), 0 0 8px rgba(120,75,0,.6), 0 0 16px rgba(255,200,70,.55)' }}>MADINAH</span>
    </div>
  </div>;
}
