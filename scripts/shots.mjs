// Playwright screenshots: GLB in the browser at the Blender progress points, as exported (sun x1) and with a diagnostic sun scale.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); const logs = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); }); page.on('pageerror', e => logs.push('pageerror: ' + e.message));
const variants = [['raw', 'sun=1'], ['sun-div683', 'sun=0.00146'], ['noatmo', 'sun=0.00146&hide=ATMOSPHERE'], ['surface-only', 'sun=0.00146&hide=ATMOSPHERE,CLOUDS,OCEANS,NIGHT_LIGHTS'], ['surface-sun1', 'sun=1&hide=ATMOSPHERE,CLOUDS,OCEANS,NIGHT_LIGHTS']];
fs.mkdirSync('shots', { recursive: true });
for (const [name, q] of variants) for (const p of [0, 15, 40, 65, 85, 100]) {
  await page.goto(`http://localhost:3100/scene01-compare?p=${p}&${q}`); await page.waitForFunction(() => window.__s01?.ready, null, { timeout: 60000 }); await page.waitForTimeout(2500);
  await page.locator('[data-testid=glb-box] canvas').first().screenshot({ path: `shots/glb_${name}_p${String(p).padStart(3, '0')}.png` });
}
// side-by-side compare pages (Blender left, GLB right)
for (const [name, q] of [['asexported', 'sun=1'], ['diag-surface-only', 'sun=0.00146&hide=ATMOSPHERE,CLOUDS,OCEANS,NIGHT_LIGHTS']]) for (const p of [0, 40, 65, 85, 100]) {
  await page.goto(`http://localhost:3100/scene01-compare?p=${p}&${q}`); await page.waitForFunction(() => window.__s01?.ready, null, { timeout: 60000 }); await page.waitForTimeout(2500);
  await page.screenshot({ path: `shots/compare_${name}_p${String(p).padStart(3, '0')}.png`, fullPage: true });
}
const gpu = await page.evaluate(() => window.__s01.stats()?.gpu);
console.log(JSON.stringify({ gpu, logs: [...new Set(logs)] }, null, 1));
await browser.close();
