import * as THREE from 'three';
/** Imperative helpers (kept outside React components: they mutate three.js objects owned by the GLTF cache). */
export type Tone = 'default' | 'none' | 'agx' | 'neutral';
const meshes = (root: THREE.Object3D, fn: (m: THREE.Mesh, mats: THREE.Material[]) => void) => root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) fn(m, Array.isArray(m.material) ? m.material : [m.material]); });
export function applyWireframe(root: THREE.Object3D, on: boolean) { meshes(root, (_m, mats) => mats.forEach(x => ((x as THREE.MeshStandardMaterial).wireframe = on))); }
export function applySun(root: THREE.Object3D, scale: number) { root.traverse(o => { const l = o as THREE.DirectionalLight; if (l.isLight) { l.userData.base ??= l.intensity; l.intensity = (l.userData.base as number) * scale; } }); }
export function applyTone(gl: THREE.WebGLRenderer, root: THREE.Object3D, tone: Tone) {
  gl.toneMapping = { default: THREE.ACESFilmicToneMapping, none: THREE.NoToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping }[tone]; gl.toneMappingExposure = 1;
  meshes(root, (_m, mats) => mats.forEach(x => (x.needsUpdate = true)));
}
export function drive(mixer: THREE.AnimationMixer, actions: Record<string, THREE.AnimationAction | null>, progress: number | null | undefined, playing: boolean, seconds: number) {
  if (progress !== null && progress !== undefined) {
    // AnimationMixer.setTime() multiplies by timeScale, so for scrubbing we set action.time directly and apply with update(0).
    const t = Math.min(1, Math.max(0, progress)) * seconds; mixer.timeScale = 0;
    for (const a of Object.values(actions)) if (a) { a.paused = false; a.time = Math.min(t, a.getClip().duration); }
    mixer.update(0);
  } else mixer.timeScale = playing ? 1 : 0;
}
export function fitCamera(cam: THREE.PerspectiveCamera, w: number, h: number, shift: number) {
  cam.aspect = w / h; if (shift) cam.setViewOffset(w, h, shift * w, 0, w, h); else cam.clearViewOffset(); cam.updateProjectionMatrix();
}
export function playAll(actions: Record<string, THREE.AnimationAction | null>, names: string[]) { names.forEach(n => actions[n]?.reset().play()); }
export const LAYERS = ['EARTH_SURFACE', 'OCEANS', 'CLOUDS', 'ATMOSPHERE', 'NIGHT_LIGHTS', 'SAUDI_BORDER', 'NETWORK (nodes+links)'] as const;
/** Diagnostic: hide named top-level layers (by node name; NETWORK covers NODE_* and LINK_*). */
export function applyHidden(root: THREE.Object3D, hidden: string[]) {
  root.traverse(o => { const n = o.name; const net = /^(NODE_|LINK_)/.test(n); const key = net ? 'NETWORK (nodes+links)' : n; if ((LAYERS as readonly string[]).includes(key)) o.visible = !hidden.includes(key); });
}
export function disposeScene(root: THREE.Object3D) {
  root.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.geometry.dispose();
    (Array.isArray(m.material) ? m.material : [m.material]).forEach(mat => { for (const v of Object.values(mat)) if (v && (v as THREE.Texture).isTexture) { (v as THREE.Texture).dispose(); const d = (v as THREE.Texture).source?.data as { close?: () => void } | undefined; d?.close?.(); } mat.dispose(); }); });
}
