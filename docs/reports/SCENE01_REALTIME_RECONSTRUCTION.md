# Scene 01 — real-time reconstruction (implementation notes)

Branch `reconstruction` (baseline preserved at tag `baseline-glb-test`; Blender source, canonical GLB, 13 clips, camera animation, earlier reports and Blender reference frames untouched). Routes: **`/scene01-recon`** (scroll scene; `?p=0.65` fixed progress, `?stage=1..6`, `?tier=low|medium|high`, `?fmt=ktx2|webp`, `?still=1`, `?clean=1`, `?nolabels=1`, `?debug=1`), **`/scene01-visual-review`**.

## 1. What was wrong and what the web renderer does now
| Layer (GLB node) | Exported as | Web renderer |
|---|---|---|
| EARTH_SURFACE | Principled + day JPG | **custom shader**: day texture (+ regional tile), brand grade, Lambert from the sun node, sky-fill, Rayleigh haze, twilight band |
| OCEANS | opaque white metal | custom additive shell: land-mask (Natural Earth) × Fresnel(1.333) × GGX sun glint |
| NIGHT_LIGHTS | opaque emissive | alpha shell: Black Marble tinted Light Gold, masked to the unlit hemisphere |
| CLOUDS | opaque diffuse | alpha shell sampling a **baked procedural cloud map** (seamless 3D fbm, baked once on the GPU), slow independent rotation |
| ATMOSPHERE | opaque emissive | additive limb shell: view-angle falloff, blue→warm at the terminator, soft outer edge |
| SAUDI_BORDER | emissive teal tube | restyled tube: constant on-screen width, Light Gold core + Charcoal under-stroke, reveal swept around the Kingdom centroid between 40 and 65 % |
| NODE_* / LINK_* | teal dots/links | hidden (dots-and-links dropped by design) |
| SUN (2185 lux) | directional | intensity forced to 0; **only its direction is used** (shaders do their own lighting, sun I = 1.0 ≈ Blender 3.2 W/m²/π) |
Nothing was deleted from the asset: hiding and re-materialling happens in the browser (`ReconScene.tsx`). The derived `scene01_origin.notex.glb` (1.8 MB; 932 KB transferred) is the canonical GLB with textures removed by `gltf-transform` (`scripts/derive_notex_glb.mjs`; UVs kept — the first attempt lost TEXCOORD_0 through `prune()` and produced a grey globe) — **no Blender re-export** was needed.

## 2. Pipeline decisions
- **Scene-referred like Blender:** all layers render into a HalfFloat 4×MSAA target (no tone mapping), then **one AgX + sRGB pass** to the screen (`Composer`). Per-layer tone mapping of additive glows over-brightened the atmosphere (measured MAE 15 → 7–8 after the change).
- **Colour:** brand colours are given as sRGB hex to `THREE.Color` (already converted to linear by ColorManagement; an early double conversion made the atmosphere too blue).
- **Texture conventions:** textures are *not* Y-flipped (glTF convention, v=0 north) — a flipped Earth was the first bug. The regional tile uses analytic lon/lat from the local position and feathers into the global map; the global map uses the mesh UVs (no seam).
- **Camera:** GLB camera (exported clips, SCENE-mode export) + **lens shift** from `camera_path.json` (not storable in glTF) via `setViewOffset`; portrait viewports keep the 16:9 *horizontal* FOV so the Kingdom stays in frame. Scrubbing writes `action.time` directly (`mixer.setTime` multiplies by timeScale and silently did nothing — first baseline bug).
- **City markers:** 8 world-space points (lon/lat → globe frame) rendered as sprites; labels are an HTML `<ul>` (EN/AR, `aria-label` says provisional/illustrative) positioned each frame by projecting the world points through the live camera (includes lens shift), hidden past the horizon; 4 priority-1 labels on narrow screens. **City list is provisional and not ARSANN-approved.**
- **Borders:** Natural Earth geometry unchanged; still requires ARSANN approval.

## 3. Texture strategy (see `SCENE01_PERFORMANCE.md` for numbers)
Tiers chosen from `MAX_TEXTURE_SIZE`, `pointer: coarse`, `navigator.deviceMemory`, `connection.downlink` (override `?tier=`):
| Tier | Global day / night | Region (30–62°E, 8–38°N, NASA BMNG C1 tile 0.46 km/px source) | Cloud bake |
|---|---|---|---|
| low | KTX2 **ETC1S** 4096 | – | 1024² |
| medium | UASTC 4096 / ETC1S 4096 | UASTC 2048×1920 | 2048² |
| high | UASTC 4096 / UASTC 4096 | UASTC 3584×3360 | 4096² |
Land mask 2048² WebP (all tiers). Progressive: the **low set shows first, then the tier set swaps in** (one texture uploaded per frame); `?progressive=0` loads the tier directly. WebP RGBA sets remain as `?fmt=webp` and as the automatic fallback when `MAX_TEXTURE_SIZE < 4096` (tested with `?maxtex=2048`). Mipmaps + anisotropy 8. Encoder limit found: `ktx2-encoder` refuses > 12 Mpix, so the region tile is 3584×3360 not 4096×3840.
KTX2/Basis (via `ktx2-encoder` 0.6.0 + three `KTX2Loader`, transcoder in `public/basis`) *works*: GPU-compressed, decoded in workers. Trade-off: UASTC files are ~10× larger on the wire than WebP.
`cacheComponents` is **disabled** in `next.config.ts`: with it on, Next 16 keeps leaving routes mounted (Activity) and the WebGL context is never released (see performance report).

## 4. Known limitations / unresolved
- Clouds are procedural (not real weather) and do not match Blender’s pattern, only its scale/density; ocean specular glint is rarely inside the framed views, so its look is **unverified**; night-side terminator colour is a tuned approximation.
- Border: reveal is 40→65 % by design; the Blender reference shows a fully drawn thin outline already at 40 %.
- Portrait/mobile framing uses the same path with a wider vertical FOV — acceptable but not art-directed; copy block overlaps lower labels on 390 px wide screens.
- High tier needs ≈18 MB of textures; default is capped to *medium* unless memory ≥ 8 GB and link ≥ 10 Mb/s.
- Fonts: General Sans not bundled; **29LT Zarid Slab unavailable (Figma showed only Zarid Sans AL)** → UI uses system fonts and says so; official logo master not received.
- No real phone was available (emulation only).
