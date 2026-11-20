// Which functions run inside the long tasks? node scripts/prof_test.mjs <url> (mobile profile: 390x844, 4x CPU)
import { chromium } from '@playwright/test';
const url = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.addInitScript(() => { window.__lt = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push({ s: e.startTime, d: e.duration }))).observe({ type: 'longtask', buffered: true }); });
await page.goto(url, { waitUntil: 'load' }); await page.waitForFunction(() => document.querySelector('.s01-canvas')?.dataset.ready === 'true', null, { timeout: 120000 }); await page.waitForTimeout(1500);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); const now0 = await page.evaluate(() => performance.now()); await cdp.send('Profiler.start');
const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight); let y = 0, marks = [];
for (let i = 0; i < 900; i++) { await page.mouse.wheel(0, 70); await page.waitForTimeout(40); y = await page.evaluate(() => scrollY); if (y >= H - 2) break; }
await page.waitForTimeout(1200);
const { profile } = await cdp.send('Profiler.stop'); const lts = await page.evaluate(() => window.__lt.filter(x => x.d >= 100));
const nodes = new Map(profile.nodes.map(n => [n.id, n])); let t = profile.startTime; const samples = profile.samples.map((id, i) => { t += profile.timeDeltas[i]; return { t: t / 1000, id }; });
// profile.startTime (us) is on the same monotonic clock as performance.timeOrigin; map by aligning the first sample with now0
const off = now0 - profile.startTime / 1000;
for (const lt of lts) {
  const a = lt.s, b = lt.s + lt.d; const agg = new Map();
  for (const s of samples) { const pt = s.t + off; if (pt >= a - 5 && pt <= b + 5) { const n = nodes.get(s.id).callFrame; const k = `${n.functionName || '(anon)'} ${n.url.split('/').pop()}:${n.lineNumber}`; agg.set(k, (agg.get(k) || 0) + 0.5); } }
  console.log(`LONGTASK ${Math.round(lt.d)}ms @${Math.round(lt.s)}ms:`, [...agg.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => `${k} ${Math.round(v)}ms`).join(' | '));
}
await browser.close();
