# ARSANN 3D pipeline recommendation (from the Scene 01 baseline)

## Decision: **REVISE** (not GO as-is, HYBRID not yet required)
Evidence: the unmodified GLB loads cleanly, runs at the display refresh rate on desktop, keeps geometry/UVs/hierarchy, reproduces the approved camera path to within 5 km and aligns the border and city markers with Blender. But it renders as a white disc because glTF cannot carry the shell materials (alpha, masks, view-angle and sun-direction logic). Those effects must be rebuilt as native Three.js shaders — nothing measured so far says they are too heavy (the earlier standalone Three.js test with custom shaders ran ≈120 fps on the same machine, but looked darker than Blender; quality parity is unproven).

## What should stay in GLB (author in Blender, export)
- Earth mesh + UVs, shell meshes (as geometry only), border curve geometry, marker/link geometry, node hierarchy, scene hierarchy, sun direction.
- Camera rig and keyframes — export with **animation mode SCENE over the full frame range** (time remap truncates the ACTIONS export). Keep `camera_path.json` as the verification oracle (CI check: camera position within 0.01 BU).
- Textures: re-encode for the web (KTX2/WebP, ≤ 4096 desktop / 2048 mobile) — do not ship the 13500×6750 night JPEG.

## What must become native Three.js shaders / code (cannot live in glTF)
1. Day/night + terminator + twilight (sun-direction mask) — port the lon/lat-free version using the exported UVs.
2. Night-lights emission masked to the dark side (additive, alpha).
3. Ocean specular (land mask texture + Fresnel).
4. Atmosphere limb scattering (additive shell, view-angle falloff) and procedural/real clouds with alpha.
5. Border and network reveal animation (draw ranges / shader uniforms) driven by scroll, plus HTML city labels projected from the camera (already designed in Figma).
6. Lens shift (Earth-on-the-right opening) via `setViewOffset` from the path data, tone mapping/grade matching, star background.
7. Brand re-grade: replace teal with the official palette in these shaders, not in the GLB.

## Pre-rendered fallback: justified only as a safety net
Keep Blender-rendered stills/short loops for `prefers-reduced-motion`, WebGL-less and low-power devices, and as the quality reference in CI visual diffs. Not justified (yet) as the primary experience: no measurement shows real-time cannot reach the target; mobile is untested. Re-evaluate after the native-shader pass and a real phone test.

## Required fixes before the next milestone
1. Re-export with SCENE mode; add a script check for animation duration and camera error.
2. Build native shaders (list above) and compare against `cycles_reference` frames with an automated pixel metric.
3. Texture pipeline (resize + compress) and measure VRAM on a phone-class device.
4. Next 16 Activity behaviour: decide whether 3D routes should opt out of cacheComponents or explicitly unmount/dispose the Canvas; prove GPU release with `renderer.info` + context-loss.
5. Hitch at load (~0.7 s frame): move texture upload off the critical frame (progressive/KTX2, `renderer.initTexture`).
6. Official assets: General Sans files, 29LT Zarid **Slab** licence/files, official logo master.
