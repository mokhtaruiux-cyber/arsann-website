# ARSANN Scene 01 performance

**Date:** 15 November 2026  
**Environment:** MacBook Pro, Apple M2 Pro, 16 GB. Chrome 157.0.8103.52 with ANGLE Metal, Playwright 1.65.1, production Next.js 16.4.6 on loopback. Results are local lab measurements.

## Cold navigation

Each row uses a new Chrome context with HTTP cache disabled. Timings are measured from navigation start. First contentful paint was also the observed heading LCP candidate. The poster column measures the completion of the poster response. Live Earth appears after the first shader and texture set is ready, then fades over the poster.

| Scenario | First contentful paint | Poster response | Live Earth ready | Selected tier | Total transfer | Scene transfer |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| English, 1440×900 | 200 ms | 143 ms | 1.08 s | Low WebP | 1,749 KiB | 1,205 KiB |
| Arabic, 1440×900 | 224 ms | 18 ms | 1.11 s | Low WebP | 1,749 KiB | 1,205 KiB |
| Arabic, 390×844 touch and DPR 2 | 192 ms | 18 ms | 1.11 s | Low WebP | 1,749 KiB | 1,205 KiB |
| English, 150 ms latency and 1.6 Mbit/s down | 512 ms | 1.33 s | 10.11 s | Low WebP | 1,749 KiB | 1,205 KiB |
| English, 1920×1080, forced high | 224 ms | 24 ms | 1.20 s | Low starter → High KTX2 | 19,661 KiB | 19,117 KiB |

Transfer uses Resource Timing and navigation `transferSize`, which includes response headers. Scene transfer covers the derived GLB, textures, decoder and camera data. A `ready` result means the scene can render. Appearance at full opacity follows the crossfade. The unthrottled desktop tests also reported low downlink estimates in Chrome, so the data conserving path selected Low. The forced high run verifies the requested quality path. It downloaded the starter and high textures, with no medium tier download.

The pre-fix throttled capture reached the live scene in 14.50 s. The current run is about 4.4 s sooner. The preceding benchmark used headless Chrome and a slightly different readiness probe, so this is a directional comparison. The current slow run downloads the ~932 KiB compressed derived GLB before the initial textures. Its response finished at 8.44 s, making this request the largest part of the remaining slow load path. The poster and HTML stay available while 3D loads.

## Scroll pacing after loading

Measurements use `requestAnimationFrame` callback intervals while the production site is open at 1440×900 in visible Chrome. This measures browser animation cadence. GPU present time is not exposed by this probe.

| Action | Average | p95 interval | Worst interval | Intervals above 33.4 ms | Main thread tasks ≥50 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Wheel to 100% | 120.0 fps | 10.1 ms | 10.4 ms | 0 | 0 |
| Wheel back to 0% | 120.0 fps | 10.3 ms | 10.4 ms | 0 | 0 |
| Eight rapid checkpoint jumps | 119.9 fps | 10.3 ms | 10.4 ms | 0 | 0 |

A separate Arabic touch scroll at 390×844 and DPR 2 reached both endpoints at 119.6 fps going forward (10.1 ms p95, 17.9 ms worst) and 120.0 fps in reverse (10.2 ms p95, 10.4 ms worst), with no intervals above 33.4 ms or long tasks. This used the same desktop GPU. [Touch results](qa/verified/touch-results.json)

The legacy baseline ran at a 60 fps callback cadence in headless Chrome, so the two frame rates are not a speedup comparison. Cold load emitted 83 ms, 51 ms and 177 ms long tasks in the desktop English, throttled and forced high samples respectively. The behavior after readiness stayed within the intervals above.

## Memory and device behavior

Chromium's collected JavaScript heap was 8.5 MB at the start of the interaction sequence and 11.3 MB after scrolling, language changes, Back/Forward and resize. That is a short-run difference that includes retained application and routing state. It does not establish a long-session heap trend.

Three.js reported six active textures on Low and nine on the forced high sample. Browser APIs used in this run did not expose reliable GPU allocation bytes. The previous language route's WebGL context was lost after unmount and its renderer reported zero geometries and textures. The active locale had one canvas. The no-WebGL and reduced-motion routes started with zero canvases and zero GLB loads.

## Release assessment

Desktop Chromium is ready for the Scene 01 review. A production mobile signoff still needs on-device Safari and Android testing. Slow network review should use the poster-first wait as well as live motion. The enabled high tier remains expensive at 19.2 MiB total, so its production use needs a bandwidth decision and a real browser pass on the target hardware.

[Final raw results](qa/verified/results.json) · [Pre-fix browser baseline](qa/verified/baseline.json) · [Throttled capture](qa/verified/screens/slow-3g-ready.jpg)
