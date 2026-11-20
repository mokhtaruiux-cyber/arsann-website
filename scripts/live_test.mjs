// Live performance probe. node scripts/live_test.mjs <url> <desktop|mobile> [shotsDir]
// mobile = 390x844 @3x, touch, 4x CPU slowdown, ~9 Mbps / 170 ms RTT network.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const [, , url = 'https://mokhtaruiux-cyber.github.io/arsann-website/', mode = 'desktop', shots = ''] = process.argv;
const mobile = mode === 'mobile';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' } : { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage(); const errs = [], bad = [];
page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 160)); });
page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
const cdp = await ctx.newCDPSession(page);
if (mobile) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 170, downloadThroughput: 9 * 1024 * 1024 / 8, uploadThroughput: 3 * 1024 * 1024 / 8 }); }
await page.addInitScript(() => { window.__lcp = 0; window.__cls = 0; window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch {} });
const t0 = Date.now(); await page.goto(url, { waitUntil: 'load', timeout: 120000 }); const tLoad = Date.now() - t0;
let tReady = null; try { await page.waitForFunction(() => document.querySelector('.s01-canvas')?.dataset.ready === 'true', null, { timeout: 120000 }); tReady = Date.now() - t0; } catch {}
const fallback = await page.evaluate(() => !!document.querySelector('.s01-static'));
await page.waitForTimeout(1500);
const info = await page.evaluate(() => { const r = performance.getEntriesByType('resource'); const nav = performance.getEntriesByType('navigation')[0]; return { lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(3), fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0), transferMB: +(r.reduce((s, e) => s + (e.transferSize || 0), 0) / 1048576).toFixed(2) + +((nav.transferSize || 0) / 1048576).toFixed(2), resources: r.length, heavy: r.sort((a, b) => b.transferSize - a.transferSize).slice(0, 5).map(e => e.name.split('/').pop() + ' ' + Math.round(e.transferSize / 1024) + 'KB'), doc: { w: document.documentElement.scrollWidth, vw: innerWidth }, tier: document.querySelector('.s01-canvas canvas') ? 'canvas' : 'none' }; });
await page.evaluate(() => { window.__d = []; let last = performance.now(); const f = n => { window.__d.push({ dt: n - last, p: scrollY / (document.documentElement.scrollHeight - innerHeight) }); last = n; requestAnimationFrame(f); }; requestAnimationFrame(f); });
const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight); let y = 0; const shotAt = [0.05, 0.3, 0.42, 0.6, 0.75, 0.9]; let si = 0;
for (let i = 0; i < 900; i++) {
  if (mobile) { await page.touchscreen.tap(1, 1).catch(() => {}); await page.mouse.wheel(0, 70); } else await page.mouse.wheel(0, 110);
  await page.waitForTimeout(mobile ? 40 : 20); y = await page.evaluate(() => scrollY);
  if (shots && si < shotAt.length && y / H >= shotAt[si]) { await page.waitForTimeout(900); await page.screenshot({ path: `${shots}/${mode}_${String(shotAt[si]).replace('.', '')}.png` }); si++; }
  if (y >= H - 2) break;
}
await page.waitForTimeout(1500);
const r = await page.evaluate(() => { const bands = [[0, .15], [.15, .3], [.3, .45], [.45, .6], [.6, .8], [.8, 1]]; const q = (a, p) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0; return bands.map(([a, b]) => { const s = window.__d.filter(x => x.p >= a && x.p < b).map(x => x.dt); return { band: `${a * 100}-${b * 100}%`, frames: s.length, avg: +(s.reduce((x, y) => x + y, 0) / Math.max(1, s.length)).toFixed(1), p95: +q(s, .95).toFixed(1), max: +Math.max(0, ...s).toFixed(1), over33: s.filter(x => x > 33.5).length, over50: s.filter(x => x > 50).length }; }); });
const lt = await page.evaluate(() => window.__lt);
console.log(JSON.stringify({ mode, url, tLoadMs: tLoad, tReadyMs: tReady, fallback, ...info, scrolled: `${Math.round(y)}/${H}`, bands: r, longTasks: lt, bad: bad.slice(0, 8), errors: [...new Set(errs)].slice(0, 8) }, null, 1));
await browser.close();
