# ARSANN Scene 01 browser QA

**Date:** 15 November 2026  
**Build:** Next.js production server on the local Mac. System Chrome with Playwright and the Apple Metal renderer. Tablet and phone viewports use touch emulation at DPR 2.

## Browser results

| Check | Result |
| --- | --- |
| Routes | `/` redirects to `/en`. Both homepage routes render and serve their correct document language and direction. The five technical routes and the tools index return HTTP 200. An unknown locale returns HTTP 404. |
| Scene motion | Wheel input takes the pinned live section to 100% and back to 0%. Eight rapid changes scrub both ways. Clicking the fourth progress control reaches the 65% state. |
| Language and history | EN → AR → EN near 65% keeps the visible chapter and camera orientation. Browser Back returns to Arabic and Forward returns to English. |
| Resize and touch | Resizing from desktop to 390×844 refreshes the camera and layout. Emulated touch contexts expose 44 px wide checkpoint buttons. A touch gesture in Arabic at 390×844 reached 100% and returned to 0%. |
| Keyboard and mobile menu | The skip link focuses the main landmark. The menu traps page focus while open and returns focus to the menu button after Escape. Future section labels are inactive at this milestone. |
| Still fallback | Reduced motion and the disabled WebGL switch show six still sections without requesting a GLB. Forced WebGL context loss and a blocked day texture also switch to a readable still page. The blocked texture test emits the expected network errors. |
| Browser errors | No unexpected JavaScript, console or HTTP errors in the measured paths. |

## Screenshot matrix

Captured 72 views across English and Arabic at 0%, 15%, 40%, 65%, 85% and 100%. Sizes were 1920×1080, 1440×900, 768×1024, 390×844, 375×812 and 320×568. Checks covered active state, document overflow, on-screen copy and controls, and collision between the actual label rectangles, copy, progress and header.

The opening globe is on the right in both languages. The orbit zooms toward the Arabian Peninsula, with the border coming in after 40% and the city names near 85%. On the smallest viewport the priority rules omit names that would collide. The 15% frame is mid transition, so a fading trace of the opening line is expected. A Charcoal gradient appears behind the header after the orbital approach so the bilingual controls remain legible against brighter land and clouds.

- [All captures](qa/verified/screens/)
- [1920 desktop overview](qa/verified/overview-d1920.jpg)
- [390 phone overview](qa/verified/overview-m390.jpg)
- [320 phone overview](qa/verified/overview-m320.jpg)
- [Machine-readable checks](qa/verified/results.json)

## Figma comparison

The checkout includes one reference, [the 1920×1080 English opening export](qa/figma/en_d1920_000.png). The Figma bridge reported no connected file. The live frames for Arabic, mobile and the later checkpoints could not be retrieved, so those screens received layout and visual QA without direct Figma parity signoff.

[Opening comparison](qa/verified/figma-comparison.jpg) shows the Figma export at the top and the browser capture below. The globe's overall framing and right crop, the lower left heading block, the header inset and the scroll cue align closely. The live font remains a system substitute, the language pill is slightly narrower, the ambient background lacks some of the reference's tonal variation, and the moving clouds and night lights differ at the pixel level. The [high quality browser capture](qa/verified/screens/en_d1920_high_000.jpg) also shows the opening with the larger textures. The render and UX checks should be treated separately from final brand approval.

## Reproduce

With the production server running at `127.0.0.1:3118`:

```sh
node scripts/site_verify.mjs
```

Set `BASE` to try another local port. Use `QA_PART=matrix`, `QA_PART=interaction`, `QA_PART=touch` or `QA_PART=perf` for one pass. The default run uses visible Chrome, writes screenshots and raw evidence to `qa/verified`, and fails if the scripted layout or interaction assertions fail.

Physical Android and iPhone hardware, Safari and Firefox were outside this measured pass. The approved font and logo files and the remaining Figma frames are required for final visual signoff.
