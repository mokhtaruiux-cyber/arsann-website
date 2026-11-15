import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'node:fs';
const file = process.argv[2];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(file); const root = doc.getRoot();
const out = { file, bytes: fs.statSync(file).size, extensionsUsed: root.listExtensionsUsed().map(e => e.extensionName),
  scenes: root.listScenes().length, nodes: root.listNodes().length, meshes: root.listMeshes().length, materials: root.listMaterials().length, textures: root.listTextures().length,
  cameras: root.listCameras().map(c => ({ name: c.getName(), type: c.getType(), yfov: c.getYFov(), znear: c.getZNear(), zfar: c.getZFar(), aspect: c.getAspectRatio() })),
  animations: root.listAnimations().map(a => ({ name: a.getName(), channels: a.listChannels().length, targets: [...new Set(a.listChannels().map(c => (c.getTargetNode()?.getName() ?? '?') + ':' + c.getTargetPath()))], maxTime: Math.max(0, ...a.listSamplers().map(s => s.getInput()?.getMax([0])[0] ?? 0)), keyframes: a.listSamplers()[0]?.getInput()?.getCount() })),
  nodesTree: [] , meshDetail: root.listMeshes().map(m => ({ name: m.getName(), prims: m.listPrimitives().length, verts: m.listPrimitives().reduce((s, p) => s + (p.getAttribute('POSITION')?.getCount() ?? 0), 0), attrs: [...new Set(m.listPrimitives().flatMap(p => p.listSemantics()))], mat: m.listPrimitives().map(p => p.getMaterial()?.getName()) })),
  materialDetail: root.listMaterials().map(m => ({ name: m.getName(), base: m.getBaseColorFactor().map(x => +x.toFixed(3)), baseTex: m.getBaseColorTexture()?.getName() ?? null, rough: m.getRoughnessFactor(), metal: m.getMetallicFactor(), emissive: m.getEmissiveFactor().map(x => +x.toFixed(3)), emTex: m.getEmissiveTexture()?.getName() ?? null, alphaMode: m.getAlphaMode(), alpha: +m.getBaseColorFactor()[3].toFixed(3), doubleSided: m.getDoubleSided(), exts: m.listExtensions?.().map(e => e.extensionName) })),
  textureDetail: root.listTextures().map(t => ({ name: t.getName(), mime: t.getMimeType(), bytes: t.getImage()?.byteLength, size: t.getSize() })),
  lights: root.listNodes().filter(n => n.getExtension('KHR_lights_punctual')).map(n => ({ node: n.getName(), light: n.getExtension('KHR_lights_punctual').getType(), intensity: n.getExtension('KHR_lights_punctual').getIntensity(), color: n.getExtension('KHR_lights_punctual').getColor() })),
};
const walk = (n, d = 0) => { out.nodesTree.push('  '.repeat(d) + n.getName() + (n.getMesh() ? ' [mesh]' : '') + (n.getCamera() ? ' [camera]' : '') + (n.getExtension('KHR_lights_punctual') ? ' [light]' : '')); n.listChildren().forEach(c => walk(c, d + 1)); };
root.listScenes()[0].listChildren().forEach(n => walk(n));
console.log(JSON.stringify(out, null, 1));
