# Scene 01 — ARSANN loader integration

## Before → after

- Before: the phone-only line disappeared at `shell`; viewers could see the incomplete globe. The static-export copy also mounted Scene 03 while Earth was still loading.
- After: a fixed charcoal overlay with the original gold mark is server-rendered with the initial HTML. The JSON is bundled as a module, not fetched from `public/`. The light SVG player is pinned at `lottie-web@5.13.0` and initialized in an effect. The original JSON remains byte-identical in both apps.
- The overlay waits for EarthScene's existing `onReady` and at least 900 ms, then ends the current 120-frame loop and fades for 500 ms. A fallback unmounts it immediately; the safety timeout completes dismissal at about 25 seconds after mounting. Reduced motion uses the filled SVG without running the player.
- The scroll owner is stopped while the overlay is up, the underlying stage is inert, and the document blocks user scrolling. The existing progress stores and camera timelines are not reset by dismissal.
- Scene 02/03 renderers and Scene 04 frame loading are now gated behind ready + dismissal. Fast links use a 2.5-second idle delay; constrained links wait for the user to approach the next scene. Later textures, GLBs and frame fetches are low-priority; car downloads use one worker on constrained links instead of four.
- The two apps keep their own scene content and static-export asset URLs. EarthScene, shaders, camera paths and layout preloads are untouched.

## Verification on 2026-11-23

| Check | Result |
|---|---|
| Targeted ESLint, active app | Passed: 0 errors, 1 existing warning |
| Targeted ESLint, static copy | Passed: 0 errors, 1 existing warning |
| Full `npm run lint` | Failed: existing custom build folders are not ignored, plus existing source lint findings (including the Scene 02 review tool) |
| TypeScript, both apps | Blocked solely by missing `lottie-web` (TS2307) |
| Active production build | Blocked: cannot resolve `lottie-web/build/player/lottie_light` |
| Static production build with EXPORT=1 and basePath | Blocked: Turbopack rejects the existing `node_modules -> ../website/node_modules` symlink outside its app root |
| Playwright QA script syntax | Passed |
| Slow 4G/Fast 3G browser matrix | 0/8 active-app runs, 0/8 static-export runs; no new build available |
| Loader mask render, actual request counts/bytes, dismissal time, destroy after dismissal | Pending real-browser testing; no measured values yet |

The dependency installation failed with `ENOTFOUND registry.npmjs.org`. Neither app has the real package installed; the checked-in dependency declarations and lock entries are pinned, but npm must finalize the lock metadata on a connected machine. No substitute player or fake test result was used.

## To finish validation

1. In `website/`, run `npm install`, then `npm run lint` and `npm run build`.
2. In `arsann-website/`, install its local dependencies (or configure a shared workspace root for its existing dependency symlink), and run `EXPORT=1 NEXT_PUBLIC_BASE_PATH=/arsann-website npm run build`.
3. Start the active production server and serve the static export under its basePath. Run from `website/`:
   - `BASE=http://localhost:3100 node scripts/loader_qa.mjs`
   - `BASE=http://localhost:3110/arsann-website node scripts/loader_qa.mjs`
4. The script runs each language and viewport on both explicit CDP throttling profiles, asserts SSR markup, full overlay coverage, ready-at-fade/removal, SVG masks, player cleanup, inline JSON and zero early later-scene requests, and prints measured byte counts and errors. A safety-timeout dismissal without Earth ready is reported as a failure in the normal-ready matrix.

No commit or push was performed.

## Retry after dependency installation (2026-11-23)

- User installed `lottie-web@5.13.0` successfully in `website/`; its light SVG player now exists and is shared by the local static-copy dependency symlink.
- Both applications passed `tsc --noEmit --incremental false` (exit 0).
- Targeted ESLint for the loader and affected experience components (including the QA script/preview config) passed in both applications with zero errors or warnings. The broader active-app lint still reports one pre-existing Scene 02 review-tool error and six warnings when generated directories are excluded.
- The static app now selects the shared parent Turbopack root only when its local `node_modules` is a symlink. Ordinary CI installations keep their normal root. The previous symlink-resolution failure no longer reproduces.
- Both production builds advanced to CSS compilation but were blocked by the execution environment denying Turbopack's internal port bind (`Operation not permitted`, OS error 1). This is distinct from the previous dependency failure. No production output was validated.
- The existing active dev server returned the `/en` page in the browser, but the browser session reset before lifecycle measurements could be collected. The production network matrix remains unverified.
- The original public Lottie JSON is byte-identical across the two copies.

To unblock production testing, run these builds in the macOS Terminal (outside the restricted execution environment):

```sh
cd ~/ARSANN/website && NEXT_DIST_DIR=.next-loader-check npm run build
cd ~/ARSANN/arsann-website && EXPORT=1 NEXT_PUBLIC_BASE_PATH=/arsann-website NEXT_DIST_DIR=.next-loader-static-check npm run build
```
