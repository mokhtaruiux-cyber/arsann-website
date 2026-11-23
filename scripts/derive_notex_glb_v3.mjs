// Derive a texture-free GLB from the CANONICAL GLB (no Blender re-export): the web scene supplies its own textures/materials.
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { prune } from '@gltf-transform/functions'; import fs from 'node:fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc = await io.read('export/v3/scene01_origin_v3.glb');
for (const t of doc.getRoot().listTextures()) t.dispose(); await doc.transform(prune({ keepAttributes: true, keepLeaves: true }));
await io.write('public/models/scene01/v3/scene01_origin.notex.glb', doc);
console.log('notex bytes', fs.statSync('public/models/scene01/v3/scene01_origin.notex.glb').size);
