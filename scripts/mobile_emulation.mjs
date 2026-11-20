// Mobile-viewport EMULATION on the desktop GPU (Chrome device metrics, touch, coarse pointer). Validates layout + tier selection + fallbacks; its FPS is NOT mobile performance.
import { chromium } from '@playwright/test'; import fs from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] }); const out = [];
for (const [name, ctxOpts, query] of [['iphone-emulated', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, ''], ['maxtex2048-desktop', { viewport: { width: 1280, height: 720 } }, '&maxtex=2048']]) {
  const ctx = await browser.newContext(ctxOpts); const page = await ctx.newPage(); const errs = []; page.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/Clock/.test(m.text())) errs.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errs.push('pageerror ' + e.message));
  await page.addInitScript(() => { window.__long = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__long.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); });
  const t0 = Date.now(); await page.goto(`http://localhost:3100/scene01-recon?debug=1${query}`); await page.waitForFunction(() => window.__recon?.ready, null, { timeout: 120000 }); const readyMs = Date.now() - t0; await page.waitForTimeout(4000);
  const info = await page.evaluate(() => ({ stats: window.__recon.stats(), timings: window.__recon.timings, long: window.__long, dpr: devicePixelRatio, w: innerWidth, coarse: matchMedia('(pointer: coarse)').matches }));
  for (const p of [0, 0.65, 0.85]) { await page.goto(`http://localhost:3100/scene01-recon?p=${p}${query}`); await page.waitForFunction(() => window.__recon?.ready, null, { timeout: 120000 }); await page.waitForTimeout(2500); await page.screenshot({ path: `shots/mobile_${name}_p${Math.round(p * 100)}.png` }); }
  out.push({ name, readyMs, tier: info.stats?.tier, quality: info.stats?.quality, timings: info.timings, longTasksMs: info.long, dpr: info.dpr, viewportW: info.w, pointerCoarse: info.coarse, fpsEmulatedOnDesktopGpu: info.stats?.fps, errs: [...new Set(errs)] }); await ctx.close();
}
fs.writeFileSync('export/mobile_emulation.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1)); await browser.close();
