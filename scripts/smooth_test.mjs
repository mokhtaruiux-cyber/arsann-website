// Scroll smoothness probe (headless Chrome, Metal ANGLE). Usage: node scripts/smooth_test.mjs http://localhost:3101/en
import { chromium } from '@playwright/test';
const url = process.argv[2] || 'http://localhost:3101/en';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const t0 = Date.now(); await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('.s01-canvas')?.dataset.ready === 'true', null, { timeout: 180000 });
const tReady = Date.now() - t0; await page.waitForTimeout(1500);
await page.evaluate(() => {
  window.__d = []; window.__lt = []; let last = performance.now();
  new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push({ d: Math.round(e.duration), p: +(scrollY / (document.documentElement.scrollHeight - innerHeight)).toFixed(3) }))).observe({ entryTypes: ['longtask'] });
  const f = n => { window.__d.push({ dt: n - last, p: scrollY / (document.documentElement.scrollHeight - innerHeight) }); last = n; requestAnimationFrame(f); }; requestAnimationFrame(f);
});
const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
// 110 px every 20 ms ~ a brisk trackpad swipe; run until the end of the page
let y = 0; for (let i = 0; i < 700; i++) { await page.mouse.wheel(0, 110); await page.waitForTimeout(20); y = await page.evaluate(() => scrollY); if (y >= H - 2) break; }
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const bands = [[0, .15, 'earth 0-15%'], [.15, .3, 'earth 15-30%'], [.3, .45, 'kingdom/network'], [.45, .6, 'earth->dive'], [.6, .8, 'desert dive'], [.8, 1, 'road/photos']];
  const q = (a, p) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
  return bands.map(([a, b, n]) => { const s = window.__d.filter(x => x.p >= a && x.p < b).map(x => x.dt); return { band: n, frames: s.length, avg: +(s.reduce((x, y) => x + y, 0) / Math.max(1, s.length)).toFixed(1), p95: +q(s, .95).toFixed(1), p99: +q(s, .99).toFixed(1), max: +Math.max(0, ...s).toFixed(1), over25: s.filter(x => x > 25).length, over50: s.filter(x => x > 50).length }; }).concat([{ longTasks: window.__lt }]);
});
console.log(JSON.stringify({ tReadyMs: tReady, scrolledTo: y, of: H, bands: r, errors: [...new Set(errs)] }, null, 1)); await browser.close();
