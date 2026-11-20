// Baseline performance measurements (desktop Chrome via Playwright, Apple M2 Pro, Metal ANGLE). NOT representative of mobile.
import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const out = { env: {}, viewer: {}, scroll: {}, dispose: {}, cameraFidelity: [] };
const cam = JSON.parse(fs.readFileSync('public/data/camera_path.json', 'utf8'));
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
out.env = { browser: browser.version(), cpu: execSync('sysctl -n machdep.cpu.brand_string').toString().trim() };
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 }); const page = await ctx.newPage(); const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('pageerror ' + e.message));
const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable');
// ---- viewer: load time, transfer, fps ----
const t0 = Date.now(); await page.goto('http://localhost:3100/scene01-test', { waitUntil: 'load' });
await page.waitForFunction(() => window.__s01?.stats?.()?.frames > 30, null, { timeout: 120000 }); const tFirst = Date.now() - t0;
const res = await page.evaluate(() => performance.getEntriesByType('resource').map(e => ({ n: e.name.split('/').pop(), transfer: e.transferSize, decoded: e.decodedBodySize, dur: Math.round(e.duration) })));
const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
await page.waitForTimeout(8000);
out.viewer = { timeToStatsReadyMs: tFirst, nav, glb: res.find(r => r.n.endsWith('.glb')), jsTransferKB: Math.round(res.filter(r => r.n.endsWith('.js')).reduce((s, r) => s + r.transfer, 0) / 1024), stats: await page.evaluate(() => window.__s01.stats()), perfMetrics: Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(m => ['JSHeapUsedSize', 'Nodes', 'LayoutCount', 'TaskDuration'].includes(m.name)).map(m => [m.name, Math.round(m.value)])) };
out.viewer.chromeProcessRssMB = Math.round(+execSync("ps -axo rss,command | grep -i 'Google Chrome' | grep -i -E 'gpu-process|--type=gpu' | grep -v grep | awk '{s+=$1} END {print s/1024}'").toString() || 0);
// ---- scroll route ----
await page.goto('http://localhost:3100/scene01-scroll-test'); await page.waitForFunction(() => window.__s01?.stats?.()?.frames > 20); await page.waitForTimeout(1500);
const samples = []; const t1 = Date.now();
await page.evaluate(() => { window.__long = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__long.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); });
for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, 260); await page.waitForTimeout(16); if (i % 6 === 0) samples.push({ i, pct: await page.evaluate(() => document.querySelector('[data-testid=stats]').textContent.split('\n')[0]) }); }
await page.waitForTimeout(1500); const fwd = await page.evaluate(() => ({ pct: document.querySelector('[data-testid=stats]').textContent.split('\n')[0], y: scrollY, h: document.documentElement.scrollHeight - innerHeight }));
for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, -260); await page.waitForTimeout(16); } await page.waitForTimeout(1800);
const back = await page.evaluate(() => ({ pct: document.querySelector('[data-testid=stats]').textContent.split('\n')[0], y: scrollY }));
out.scroll = { forward: fwd, backAfterReverse: back, samples, longTasksMs: await page.evaluate(() => window.__long), stats: await page.evaluate(() => window.__s01.stats()), scrollingMs: Date.now() - t1 };
// ---- camera fidelity: GLB camera vs exported Blender path (cam_path json, Z-up -> Y-up) ----
for (const p of [0, 0.15, 0.4, 0.65, 0.85, 1]) {
  await page.goto(`http://localhost:3100/scene01-compare?p=${Math.round(p * 100)}`); await page.waitForFunction(() => window.__s01?.stats?.()?.geometries > 0); await page.waitForTimeout(1200);
  const c = (await page.evaluate(() => window.__s01.stats().camera)).match(/pos=([-\d.]+),([-\d.]+),([-\d.]+)/).slice(1).map(Number); const k = cam.keys[Math.round(p * 100)].cam; const ref = [k[0], k[2], -k[1]];
  out.cameraFidelity.push({ p, glb: c, blenderPath: ref.map(v => +v.toFixed(2)), maxAbsErr: +Math.max(...c.map((v, i) => Math.abs(v - ref[i]))).toFixed(3) });
}
// ---- disposal: client-side navigation away from the canvas ----
await page.goto('http://localhost:3100/'); await page.click('a[href="/scene01-test"]'); await page.waitForFunction(() => window.__s01?.stats?.()?.geometries > 0); await page.waitForTimeout(1500); const mem1 = await page.evaluate(() => window.__s01.stats());
await page.goBack(); await page.waitForTimeout(2500);
out.dispose = { whileOpen: { geometries: mem1.geometries, textures: mem1.textures }, log: await page.evaluate(() => window.__s01.disposeLog), jsHeapMB: Math.round((await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0)) / 1048576) };
out.consoleErrors = [...new Set(errs)];
fs.writeFileSync('export/perf_results.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1).slice(0, 4500));
await browser.close();
