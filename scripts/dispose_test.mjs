// Distinguish a hidden-but-mounted Canvas from an unmounted/disposed renderer across a client-side route change.
import { chromium } from '@playwright/test'; import fs from 'node:fs';
const label = process.argv[2] ?? 'run'; const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const out = { label };
await page.goto('http://localhost:3100/'); await page.click('a[href="/scene01-recon"]'); await page.waitForFunction(() => window.__recon?.ready, null, { timeout: 120000 }); await page.waitForTimeout(3000);
const snap = () => page.evaluate(() => { const r = window.__recon.renderer; const gl = r.getContext(); return { canvasesInDom: document.querySelectorAll('canvas').length, contextLost: gl.isContextLost(), memory: { ...r.info.memory }, programs: r.info.programs?.length, frames: window.__recon.stats()?.frames, url: location.pathname }; });
out.open = await snap(); await page.goBack(); await page.waitForTimeout(2500); out.afterLeave = await snap();
const f1 = out.afterLeave.frames; await page.waitForTimeout(1500); out.afterLeave2 = await snap(); out.renderLoopStopped = out.afterLeave2.frames === f1;
await page.goForward(); await page.waitForFunction(() => window.__recon?.ready, null, { timeout: 120000 }); await page.waitForTimeout(2500); out.reenter = await snap();
console.log(JSON.stringify(out, null, 1)); fs.writeFileSync(`export/dispose_${label}.json`, JSON.stringify(out, null, 1)); await browser.close();
