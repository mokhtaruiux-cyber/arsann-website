# Scene 01 — performance, assets, GPU cleanup

**Setup:** Apple M2 Pro (macOS), system Chrome 157 headless via Playwright (Metal ANGLE), 1600×900 @1×, localhost, no throttling; headless is vsync-capped at 60 fps (the WebKit pane showed 120 fps earlier). **Desktop only; no real phone was available — the mobile run is viewport/touch/coarse-pointer *emulation on the desktop GPU* and its FPS means nothing for phones.** Raw data: `export/recon_perf.json`, `export/dispose_*.json`, `export/mobile_emulation.json`; scripts in `scripts/`.

## 1. Asset size (transferred, KB)
| | low | medium | high |
|---|---|---|---|
| Notex GLB (gz) | 932 | 932 | 932 |
| Basis transcoder (js+wasm) | 257 | 257 | 257 |
| Textures (all loaded incl. progressive low set) | 971 | 8,627 | 17,921 |
| **Total scene assets** | **≈ 2.2 MB** | **≈ 9.8 MB** | **≈ 19.1 MB** (18.2 MB if loaded directly) |
Baseline GLB test: 9.8 MB (one 8 MB night JPEG inside the GLB). Per-file: day 4096 UASTC 3.9 MB / ETC1S 0.6 MB, night 2.2 MB / 0.33 MB, region 2048 3.7 MB, region 3584 10.8 MB, mask 30 KB.

## 2. Cold load (fresh browser, no cache) — hitch comparison
| Config | ready (ms) | worst frame gap after ready | long tasks >50 ms after ready | GPU-process RSS* |
|---|---|---|---|---|
| **high KTX2, progressive** | 792 | **17 ms** | 0 | ≈ 172 MB |
| high KTX2, direct | 916 | 17 ms | 1 | 164 MB |
| medium KTX2 | 787 | 17 ms | 1 | 154 MB |
| low KTX2 | 834 | 17 ms | 1 | 136 MB |
| high **WebP RGBA** (earlier run) | 686 | **400 ms** | 4 | 358 MB |
| medium WebP | 687 | 117 ms | 3 | 212 MB |
| *Baseline GLB (embedded JPEG)* | ≈ 0.8 s | **≈ 680–780 ms** frame | – | ≈ 540 MB (incl. page) |
\*macOS GPU-process RSS from `ps` — an **indirect** indicator, not VRAM. The ~700 ms upload hitch is gone from the visible scene: a loading overlay covers the first ≈0.8 s (worst gaps *before* ready: 67–152 ms, hidden behind it) and after it the worst frame is one 60 Hz tick. Fixes that mattered: KTX2 (compressed upload, worker transcode), `ImageBitmap` decode off the main thread, one texture initialised per frame, low-set-first progressive load, shader precompile.
**Texture memory:** estimated (not measured) for high KTX2: day 11 MB + night 11 MB + region ≈ 28 MB (incl. mips, UASTC→BC7/ASTC 8 bpp) + clouds 4096² RGBA ≈ 45 MB + mask 2048² ≈ 11 MB ⇒ ≈ 110 MB; the same set as RGBA8 WebP would be ≈ 480 MB. Chrome exposes no reliable VRAM counter, so only the RSS column above is measured.

## 3. Scrolling (after resources are ready; 60 wheel ticks forward then 60 back, Lenis + GSAP ScrollTrigger)
All four configs: **60 fps, p95 17.1–17.8 ms, max ≤ 23 ms, 0 frames > 33 ms, 0 long tasks**, progress reached 100 % and returned exactly to 0 %. Per-frame cost: 8 draw calls, ≈ 84,840 triangles (scene pass), 18 programs. Zero console/WebGL errors in all runs. (Scrolling *during* the progressive upgrade was not separately stress-tested.)

## 4. GPU cleanup across routes (`scripts/dispose_test.mjs`)
| | Canvas in DOM after leaving | WebGL context lost | geometries/textures after leaving | render loop |
|---|---|---|---|---|
| `cacheComponents: true` (Next 16 default here) | **yes, hidden** | **no** | 0 / 3 (our cleanup frees most) | stopped |
| **`cacheComponents: false`** (now) | **no (unmounted)** | **yes** | **0 / 0** | stopped; re-entering rebuilds fully |
So a hidden mounted Canvas and a disposed renderer are different things; the project now has the latter. Cost: that Next 16 feature is off.

## 5. Mobile
Emulated iPhone-sized viewport (390×844 @3×, coarse pointer): tier auto-selected **low**, ready in ≈ 0.8–0.9 s, no errors, Kingdom framed in portrait, labels reduced to 4. `?maxtex=2048` fallback → WebP 2048 set, no errors. **Real mobile performance, thermal behaviour, memory pressure, Safari/WebKit and Android GPUs are untested.**

## 6. Targets
Desktop smooth 60 fps ✔ (measured, one machine) · no visible long freeze on entry ✔ (≤17 ms after ready) · reliable forward/reverse scrub ✔ · no major errors ✔ · usable mobile tier — **plausible, unproven** · cold-load on a slow network — **not tested** (high tier is 19 MB).
