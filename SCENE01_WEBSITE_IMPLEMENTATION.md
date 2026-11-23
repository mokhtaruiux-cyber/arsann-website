# ARSANN Scene 01 website implementation

**Date:** 15 November 2026  
**Scope:** The first section of the bilingual ARSANN 2026 website.

## Handoff state

Claude stopped during Playwright QA and performance measurement. The handoff screenshot marked the routes, production build and visual viewport pass complete. The `reconstruction` checkout was at `222e185` (Reconstruction reports), with the homepage implementation still in the working tree. The checkout contained `/en` and `/ar`, the GSAP and Lenis scroll controller, the React Three Fiber canvas, bilingual content, provisional brand assets, existing captures under `qa/shots`, a Figma opening export and the initial `site_qa.mjs` and `site_shots.mjs` scripts. The earlier GLB proof of concept is anchored at tag `baseline-glb-test`.

## Run the site

```sh
npm run build
npm run start -- -H 127.0.0.1 -p 3118
```

- English: [http://127.0.0.1:3118/en](http://127.0.0.1:3118/en)
- Arabic: [http://127.0.0.1:3118/ar](http://127.0.0.1:3118/ar)
- Diagnostic index: [http://127.0.0.1:3118/tools](http://127.0.0.1:3118/tools)

`/` redirects to `/en`. Both language routes are prerendered. The diagnostic routes still serve, including `/scene01-visual-review` for the Blender comparison.

## Scene behavior

The derived geometry-only GLB supplies the meshes, animation clips and camera. Three.js renders the day surface, night lights, clouds, atmosphere, ocean and Saudi border into a linear HDR target with AgX display mapping. The approved Charcoal, Stone, Pearl and Light Gold tokens drive foreground and accent colors. One pinned section maps GSAP ScrollTrigger and Lenis progress to the GLB camera, HTML copy and labels. Checkpoints are at 0, 15, 40, 65, 85 and 100 percent. The Earth coordinates stay fixed when the site switches to RTL.

## Changes from the QA pass

- Made the opening copy and poster visible at first paint and loaded the 3D bundle only in live mode. Low bandwidth and data saver users get the smaller low tier WebP set. The KTX2 path reuses textures shared by the starter and upgrade tiers.
- Kept the still experience available for reduced motion, WebGL loss or lack of support, and required asset failures. It contains six scroll sections with the same bilingual copy and navigation.
- Corrected city label collision bounds by measuring visible label text and its leader offset. Matched the desktop header inset, navigation scale and scroll cue placement more closely to the available Figma export. Added a gradient behind the header on the close-up states to keep it legible over light terrain.
- Switched the mobile menu to a native modal dialog, restored focus on close, gave touch checkpoint controls 44 px targets, and made the skip link focus the main content. Milestone navigation labels are display only because the destination pages are outside Scene 01.
- Scoped the language progress handoff to the destination route and the scroll teardown to this scene. Released cloud render targets and texture resources on teardown.
- Removed sample Google font downloads from the diagnostic layout so the production build can use the site's local system font stacks.

## Preservation and approvals

The original Blender source SHA-256 is `2bc250838b511747364712f817fb31fd0b99948e57e72eaf88bf993f90131657`, matching the export baseline. The canonical GLB and export assets remain the original pipeline inputs. The site logo is the existing provisional reverse lockup. General Sans and 29LT Zarid Slab still need approved web font files. Arabic copy, the Saudi outline and illustrative city locations need signoff for publication.

Production build and TypeScript passed. ESLint returned zero errors and three existing warnings in the older QA scripts. The final Playwright run passed its browser assertions.

See [browser QA](SCENE01_BROWSER_QA.md) for screenshots and Figma comparison and [performance measurements](SCENE01_PERFORMANCE_REPORT.md) for the release gates.
