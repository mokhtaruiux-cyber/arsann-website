# ARSANN website

Next.js 16 · React 19 · three.js. Scenes: 01 Earth → 02 Desert dive → 03 Road. EN / AR.

## Run locally
```bash
npm ci
npm run dev          # http://localhost:3100  (use: npx next dev -p 3100)
```

## Static build for GitHub Pages
```bash
EXPORT=1 NEXT_PUBLIC_BASE_PATH=/<repo-name> npm run build      # output in ./out
node scripts/prefix-css-urls.mjs out /<repo-name>              # prefixes url(/fonts/..) in the exported CSS
```
Use `NEXT_PUBLIC_BASE_PATH=` (empty) for a `<user>.github.io` repo or a custom domain.
The workflow `.github/workflows/pages.yml` does this automatically on every push to `main`
(Settings → Pages → Source: **GitHub Actions**).

## Layout
| Path | What |
|---|---|
| `src/app/(site)/[lang]` | the page, layout and `site.css` (EN/AR) |
| `src/components/experience` | scenes: Earth, Dive, labels, header, scroll controller |
| `src/lib`, `src/content` | recon config + shaders, copy |
| `public/models`, `public/textures`, `public/basis` | GLB, KTX2/WebP textures, Basis transcoder |
| `public/data`, `public/fonts`, `public/brand`, `public/posters`, `public/images` | camera paths, fonts, logo, still fallbacks, photos |
| `scripts/` | asset pipeline (GLB export, texture encoding) and perf/QA scripts |
| `docs/reports` | performance / reconstruction reports |

## Theme
Space scene = brand charcoal canvas (Figma node 5:3). After the dive starts the page sets `html[data-sky="day"]`
(daylight tokens in `src/app/globals.css`). City labels and route arcs are gold.
