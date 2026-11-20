# Scene 01 — GLB export report (baseline, nothing artistic changed)

## 1. Source state (recorded before anything else)
- Source: `<studio>/scene01/scene01_origin.blend`, 1,137,077 bytes, mtime 2026-11-15 13:02, **sha256 `2bc250838b511747364712f817fb31fd0b99948e57e72eaf88bf993f90131657`** (re-checked after every export: unchanged).
- Blender 5.2.3 LTS (hash e13b728c6880). Scene `SCENE01_ORIGIN`, Eevee, AgX, 1920×1080, 24 fps, frames 0–240 with **time remap 100→240**; keys live on frames 0–100.
- Preserved: read-only backup `scene01/backups/scene01_origin_PRE-GLB-TEST_2026-11-15.blend` (same hash). Export ran **only** on the working copy `arsann-scene01-glb-poc/export/scene01_export_copy.blend` (same hash). Full inventory: `export/blender_inventory.json`.
- Note: the file’s mtime (13:02) is later than my Phase-2 look-dev save; contents still match Phase 2 (NASA materials, teal network) — I did not modify it, and the original was never opened for writing in this test.

## 2. Scene inventory (what had to cross)
14 meshes (Earth 8,192 faces; OCEANS/CLOUDS/NIGHT_LIGHTS/ATMOSPHERE shells 4,608 faces each; 9 node spheres), 9 curves (SAUDI_BORDER with bevel, 8 links), 1 camera (lens 40 mm, sensor 36, **lens shift −0.28→0 animated**, Track-To constraint), 1 sun, 5 empties (camera rig, controller). 8 materials built from node graphs; 3 images (day 5400×2700 JPG, night 13500×6750 JPG, land mask 4096×2048 PNG packed).

## 3. Known limitations identified BEFORE exporting (glTF 2.0 cannot hold these)
Object-space lon/lat UV math, Hue/Sat/Contrast, Map Range, Mix-by-sun-direction, Fresnel/Layer Weight, procedural noise, Mix-shader transparency, Add-shader glow, Value controls, world nodes (stars), curve bevel-factor animation, `hide_render` animation, camera lens shift, drivers/constraints (Track-To is baked by sampling), Eevee/Cycles specifics (render method “DITHERED” blend), AgX/colour management, time remap.

## 4. Export (Blender glTF exporter)
`scripts/export_glb.py` (run on the copy): GLB, cameras ✓, lights ✓, animations ✓, extras ✓, apply modifiers ✗, materials EXPORT (no replacement), images AUTO (as-is), Y-up. Every conversion is the exporter’s own: curves → meshes; constraint results → sampled keys; node trees → Principled approximation.
- **Export A** (animation mode ACTIONS): 11.6 MB. Camera clip has 101 keys / 4.17 s — **it covers only progress 0 → 0.417**, because sampling frames 0–100 on a 240-frame time-remapped timeline reads actions at f×100/240. Kept for the record: `export/scene01_origin__exportA_action-key-range_TRUNCATED.glb`. I found this by comparing GLB camera poses with `camera_path.json` (6 points, error up to 12 BU).
- **Export B (canonical, `public/models/scene01/scene01_origin.glb`)**: animation mode **SCENE** over the scene frame range → 241 samples, 10.0 s, full path. This is an *export setting* change, not an artistic one.
- Export log: no warnings or errors were emitted (`export/blender_export_log*.txt`). Absence of warnings does **not** mean fidelity — see §6.

## 5. GLB inspection (`export/glb_inspection.json`, tool: `scripts/inspect_glb.mjs` on @gltf-transform 4.5.1)
| Item | Result |
|---|---|
| File size | 11,632,356 bytes (served uncompressed: 9.83 MB transfer measured in Chrome, probably header-level) |
| Nodes / meshes / materials / textures | 30 / 23 / 8 / 2 |
| Vertices | 41,505 (≈70.7 k triangles in the draw) |
| Textures (embedded JPEG) | day `bmng…5400x2700` 1.77 MB; night `blackmarble…13500x6750` 8.04 MB (**exported at full resolution**; land mask NOT exported) |
| Extensions | KHR_lights_punctual, KHR_materials_emissive_strength, KHR_materials_specular |
| Cameras | 1 perspective, yfov 28.4°, aspect 16:9, near 0.05, far 500 — **lens shift absent** |
| Animations | 13 clips, 10.0 s: camera rig (ARM/TARGET/TILT rotation/translation, camera translation+rotation 241 keys each), 9 node-scale pops. **Missing:** border bevel reveal, border visibility, lens shift |
| Hierarchy | preserved (CAM_ARM → CAM_TARGET/CAM_TILT → CAM_SCENE01; EARTH_GLOBE_ROOT → shells, border, links, nodes; SUN) |
| Light | SUN exported as directional **2185.6** (3.2 W/m² × 683 lux/W) — three.js applies it unscaled → blown out |
| Parsing | loads in gltf-transform and three.js GLTFLoader with no errors |

## 6. What survived and what did not (material by material)
| Blender | In GLB | Consequence in the browser |
|---|---|---|
| EARTH_SURFACE_NASA | baseColor = day JPG (via mesh UVs), roughness 0.88; **emissive map also = day JPG** (artefact of the haze/twilight emission graph) | geography **correct** (see §7); grade, contrast, haze, twilight lost; night side not dark because of the emissive map |
| OCEAN_SPECULAR | base white, metal 1, rough 1, **OPAQUE** | opaque white shell covers the Earth |
| CLOUDS_PROCEDURAL | white diffuse, **OPAQUE**, noise lost | opaque white shell |
| ATMOSPHERE_LIMB | black base + emissive white, **OPAQUE** | the first thing you see: an emissive white disc (even with sun ×0) |
| NIGHT_LIGHTS_NASA | emissive = night JPG, **OPAQUE**, mask lost | opaque shell |
| TEAL_BORDER / LINK / NODE | emissive teal/aqua (strength kept) | OK for geometry; border fully visible from frame 0 (reveal animation lost) |
| World stars, AgX look, Eevee dithered blending | none | black/Charcoal background only |
Geometry, UVs, hierarchy, transforms, camera pose animation, node scale animation, lights: transferred.

## 7. Limitations list (unsupported by glTF / lost)
1. Alpha/blend modes (all shells opaque) 2. Procedural textures/noise 3. Sun-direction masks (night lights, twilight, terminator tint) 4. View-angle effects (Fresnel, limb scattering) 5. Ocean specular masked by land 6. Colour grading nodes 7. Curve bevel-factor reveal, `hide_render` keys 8. Camera lens shift 9. AgX tone mapping 10. Star background 11. Time remap (must export with SCENE mode) 12. Physical light units (lux scale) 13. Texture size: night texture 13500×6750 not optimised.

## 8. Files
`export/` (blend copy, inventory, both GLBs, inspections, logs) · `public/models/scene01/scene01_origin.glb` (canonical) · `scripts/export_glb.py`, `scripts/inspect_glb.mjs`.
