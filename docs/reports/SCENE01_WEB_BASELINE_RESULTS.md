# Scene 01 — web baseline results (unmodified GLB in Next.js + R3F)

**Test machine/browser:** Apple M2 Pro, macOS (Darwin 25.4), Google Chrome 157.0.8103.52 driven by Playwright 1.65.1 (headless, GPU via ANGLE/Metal, 1600×900 @1×), plus the Claude in-app browser (WebKit) for spot checks. **Desktop only. No mobile device was available; nothing here may be extrapolated to phones.** Headless Chrome is vsync-capped at 60 fps; the WebKit pane showed 120 fps on a 120 Hz display.
**Stack (pinned in package.json / package-lock.json):** Next 16.4.6, React 19.3.0, three 0.187.0, @react-three/fiber 9.8.2, @react-three/drei 10.7.9, gsap 3.15.1, lenis 1.3.27, Tailwind 4.3.3, TypeScript 5.x. `tsc --noEmit`, `eslint src` and `next build` pass with no errors. One console warning: `THREE.Clock deprecated` (from R3F). drei pulls a second `three@0.170` via `stats-gl` (not used).
**Routes:** `/scene01-test` (inspection), `/scene01-compare?p=65[&sun=&hide=&tone=&shift=1]` (Blender vs GLB), `/scene01-scroll-test` (GSAP + Lenis).

## 1. Visual comparison (screenshots in `shots/`; Blender = Cycles review frames, GLB = this viewer)
| State | GLB exactly as exported (`shots/compare_asexported_*`) | Diagnostic: shells hidden, sun ÷683 (`compare_diag-surface-only_*`) |
|---|---|---|
| 0 % | white disc, Earth centred (no lens shift) | Earth texture visible, correctly oriented, lit as a plain sphere; Blender’s right-side composition, terminator, night lights, atmosphere, clouds all missing |
| 40 % | white fills the frame | geography/framing close to Blender; coast/border placement matches |
| 65 % | white (opaque atmosphere shell) | Saudi border and coastline align with Blender within a few px; flat colour, no limb glow, no clouds |
| 85 % | white | **city-marker spheres land on the same spots as Blender**; border matches; dark ocean (no specular/haze); markers un-animated in the border reveal |
| 100 % | white | same; Abha/Jeddah/Riyadh markers aligned |
**Verdict: the GLB does NOT match Blender as exported.** The mismatch is not geometry or camera; it is materials (opaque shells, lost masks/tone mapping). With shells hidden the geometry, UV mapping, geographic alignment, border and marker positions match Blender frames.
Per-feature: Earth surface texture ✔ (colour grade ✗) · terrain detail = same 5400 px source, soft at close-up as in Blender · ocean shading ✗ · atmosphere ✗ · clouds ✗ · night lights ✗ (shell opaque, mask lost) · border position ✔ / visibility ✔ (always on) / reveal ✗ · marker alignment ✔ · colours/roughness/metalness: exported as Principled factors only (base white, metal 1, rough 1 on shells) · transparency ✗ · emission ✔ (teal) · camera pose ✔ · FOV ✔ 28.4° · lens shift ✗ · timing: 10 s sampled, continuous.

## 2. Camera fidelity (measured, GLB camera world position vs `camera_path.json`, Y-up converted)
p 0 / 0.15 / 0.4 / 0.65 / 0.85 / 1 → max abs error **0.003 / 0.002 / 0.002 / 0.005 / 0.002 / 0.004 BU** (1 BU = 1000 km → ≤ 5 km). The first (ACTIONS) export failed this test (up to 12 BU) — see the export report.

## 3. Performance (desktop; numbers from `export/perf_results.json`)
| Metric | Result |
|---|---|
| Page load (`load` event) | 214 ms (DCL 20 ms) |
| GLB transfer / decoded | **9.83 MB / 11.63 MB**, fetch 265 ms (localhost) |
| JS transfer (all chunks) | 401 KB |
| Time to first stats-ready (canvas up, GLB fetched) | 821 ms |
| Frame loading hitch | **one frame of ≈680–780 ms** while the textures were decoded/uploaded (max frame time) |
| Steady FPS (viewer) | 60 fps (headless vsync) after load; 514-frame window incl. hitch reports 55.8 avg, p95 16.8 ms, 2 frames > 33 ms |
| Scroll route | 60 fps, p95 17.5 ms, max 18.2 ms, **0 frames > 33 ms**, 0 long tasks during 60 wheel ticks forward + 60 back; progress reached 100 % and returned exactly to 0 % |
| Draw calls / triangles | 23 / 70,740 (30 nodes, 23 geometries, 3 textures) |
| WebGL / console errors | 0 errors (1 deprecation warning) |
| JS heap | 35 MB after load |
| Chrome GPU-process RSS (approx.) | ≈ 540 MB (not an exact VRAM figure) |
| Texture memory (**computed**, not measured) | day 5400×2700 ≈ 58 MB (+mips ≈ 78 MB); night 13500×6750 ≈ 365 MB (+mips ≈ 486 MB) → **≈ 560 MB GPU** if full-size. Desktop MAX_TEXTURE_SIZE here = 16384; many phones cap at 4096–8192 and three.js would downscale on the CPU |
| Disposal after leaving the page | Next 16 (`cacheComponents`) hides the previous route with Activity instead of unmounting it: the canvas stays in the DOM (display:none), the render loop stops (frame counter frozen) but `renderer.info.memory` still reports 23 geometries / 3 textures one second later and the GL context is **not** lost. I added explicit disposal on unmount; counters still read 23/3 after the hide, so **GPU release on navigation is NOT proven** — see recommendations. |
Scroll responsiveness: Lenis (autoRaf off, driven by `gsap.ticker`) + ScrollTrigger `scrub`, `lagSmoothing(0)`: single scroll owner, no double handling observed in the numbers above.

## 4. What exists
- `/scene01-test`: one persistent Canvas, `useGLTF`, OrbitControls + reset, sun/ambient/tone-mapping controls, wireframe, per-layer visibility, loading bar, FPS/frame-time/draw-call monitor, clip play/pause, GLB-camera toggle, scrub 0–100 %, optional Blender lens shift (clearly labelled as NOT in the GLB), EN/AR toggle (RTL), placeholder fonts labelled.
- `/scene01-scroll-test`: same GLB, scroll 0→1 drives the exported camera clips via ScrollTrigger; forward/reverse works; EN/AR HTML copy; reduced-motion disables Lenis smoothing. Because the GLB shows the white atmosphere shell, the visual is still blown out (expected).
- Official fonts/logo are **not** bundled: General Sans not shipped, 29LT Zarid Slab not licensed/available; official logo master not received. UI uses system fonts and says so.

## 5. Not tested / limitations of this test
Mobile (any), Safari/Firefox desktop performance numbers, low-power GPUs, real network throttling, long-session memory growth, texture-downscale quality on small GPUs, hardware-GPU memory measurement (only computed).
