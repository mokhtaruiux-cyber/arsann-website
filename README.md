# ARSANN Scene 01 — GLB → Next.js + R3F baseline POC
Isolated test project. **The Blender source (`../scene01/scene01_origin.blend`) is never modified**; export works on `export/scene01_export_copy.blend`.

```bash
npm install
npm run build && npm run start -- -p 3100      # then open http://localhost:3100/
npx tsc --noEmit && npx eslint src             # checks
node scripts/shots.mjs                          # Playwright screenshots → shots/
node scripts/perf.mjs                           # desktop measurements → export/perf_results.json
node scripts/inspect_glb.mjs public/models/scene01/scene01_origin.glb
/Applications/Blender.app/Contents/MacOS/Blender -b export/scene01_export_copy.blend -P scripts/export_glb.py   # re-export (canonical: SCENE mode)
```
Routes: `/scene01-test`, `/scene01-compare`, `/scene01-scroll-test` (baseline), **`/scene01-recon`**, **`/scene01-visual-review`** (reconstruction). Reports: `SCENE01_*` and `ARSANN_3D_PIPELINE_RECOMMENDATION.md`; reconstruction notes in `SCENE01_REALTIME_RECONSTRUCTION.md`, `SCENE01_VISUAL_COMPARISON.md`, `SCENE01_PERFORMANCE.md`.
Chrome for Playwright is the system Chrome (`channel: 'chrome'`); no browser was downloaded. Next 16 note: `AGENTS.md` (generated) asks to read `node_modules/next/dist/docs` before writing code.
