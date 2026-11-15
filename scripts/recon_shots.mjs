// Usage: node scripts/recon_shots.mjs <outPrefix> "<query>" p1,p2,...   e.g. stageA "stage=1&tier=high" 0,0.65
import { chromium } from '@playwright/test'; import fs from 'node:fs';
const [prefix, query, plist] = process.argv.slice(2); const ps = plist.split(',').map(Number); fs.mkdirSync('shots/recon', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/Clock/.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); }); page.on('pageerror', e => errs.push('pageerror: ' + e.message));
for (const p of ps) {
  await page.goto(`http://localhost:3100/scene01-recon?clean=1&still=1&progressive=0&p=${p}&${query}`); await page.waitForFunction(() => window.__recon?.ready, null, { timeout: 120000 }); await page.waitForTimeout(2500);
  await page.screenshot({ path: `shots/recon/${prefix}_p${String(Math.round(p * 100)).padStart(3, '0')}.png` });
}
console.log(JSON.stringify({ errs: [...new Set(errs)] }));
await browser.close();
