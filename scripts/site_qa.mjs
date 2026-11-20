import { chromium } from '@playwright/test';
const BASE = 'http://localhost:3100'; const R = {};
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const mk = async (o = {}) => { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...o }); const p = await ctx.newPage(); const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e))); return { ctx, p, errs }; };
const ready = p => p.waitForFunction(() => window.__recon?.ready === true, null, { timeout: 40000 }).then(() => true, () => false);
const frames = (p, ms) => p.evaluate(ms => new Promise(res => { const d = []; let l = performance.now(); const lt = []; try { new PerformanceObserver(l2 => l2.getEntries().forEach(e => lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch {} const t0 = l; const f = t => { d.push(t - l); l = t; if (t - t0 < ms) requestAnimationFrame(f); else { d.shift(); const s = [...d].sort((a, b) => a - b); res({ n: d.length, fps: +(1000 / (d.reduce((a, b) => a + b, 0) / d.length)).toFixed(1), p95: +s[Math.floor(s.length * .95)].toFixed(1), max: +s[s.length - 1].toFixed(1), over33: d.filter(x => x > 33.4).length, long: lt.length }); } }; requestAnimationFrame(f); }), ms);
// 1 cold load + network + first visual
{ const { ctx, p, errs } = await mk(); const reqs = []; p.on('response', async r => { const u = r.url(); let n = 0; try { n = (await r.body()).length; } catch {} reqs.push({ u: u.replace(BASE, ''), n }); });
  const t0 = Date.now(); await p.goto(BASE + '/en', { waitUntil: 'commit' }); await p.waitForSelector('.s01-block h1', { timeout: 20000 }); const tText = Date.now() - t0;
  const fp = await p.evaluate(() => performance.getEntriesByType('paint').map(e => [e.name, Math.round(e.startTime)])); const ok = await ready(p); const tReady = Date.now() - t0; await p.waitForTimeout(6000);
  const tex = reqs.filter(r => /textures|models|basis|data/.test(r.u)); const tot = reqs.reduce((a, r) => a + r.n, 0);
  const rec = await p.evaluate(() => ({ t: window.__recon.timings, s: window.__recon.stats(), mem: performance.memory?.usedJSHeapSize }));
  R.cold = { tText, tReady, ok, paint: fp, totalKB: Math.round(tot / 1024), texKB: Math.round(tex.reduce((a, r) => a + r.n, 0) / 1024), texFiles: tex.map(r => `${r.u} ${Math.round(r.n / 1024)}KB`), tier: rec.s?.tier, quality: rec.s?.quality, timings: rec.t, errs }; await ctx.close(); }
// 2 scroll fps: slow 0->100, backward, rapid jumps; heap growth
{ const { ctx, p, errs } = await mk(); await p.goto(BASE + '/en'); await ready(p); await p.waitForTimeout(4000); const heap0 = await p.evaluate(() => performance.memory.usedJSHeapSize);
  await p.mouse.move(700, 450); const fr = frames(p, 9000); for (let i = 0; i < 90; i++) { await p.mouse.wheel(0, 70); await p.waitForTimeout(100); } R.slowDown = await fr; const pr = await p.evaluate(() => 0);
  const fb = frames(p, 4000); for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, -150); await p.waitForTimeout(100); } R.backward = await fb;
  const fj = frames(p, 4000); for (const x of [1, .15, .85, 0, .65, .4, 1, 0]) { await p.evaluate(v => window.__scrollTo(v), x); await p.waitForTimeout(450); } R.rapid = await fj;
  const heap1 = await p.evaluate(() => performance.memory.usedJSHeapSize); R.heapMB = [Math.round(heap0 / 1e6), Math.round(heap1 / 1e6)]; R.scrollErrs = errs; R.stats = await p.evaluate(() => window.__recon.stats());
  // progress indicator + nav
  await p.evaluate(() => window.__scrollTo(0)); await p.waitForTimeout(800); await p.click('.s01-ticks button:nth-child(4)'); await p.waitForTimeout(2500);
  R.tickClick = await p.evaluate(() => ({ active: [...document.querySelectorAll('.s01-ticks button')].findIndex(x => x.dataset.active === 'true'), y: Math.round(scrollY), vis: [...document.querySelectorAll('.s01-block')].filter(e => getComputedStyle(e).visibility === 'visible' && +getComputedStyle(e).opacity > .5).map(e => e.dataset.state) }));
  // keyboard focus order sanity
  R.focusable = await p.evaluate(() => [...document.querySelectorAll('a,button')].filter(e => e.offsetParent !== null).map(e => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 20)));
  // 3 language switch keeps progress, earth not mirrored
  await p.evaluate(() => window.__scrollTo(.65)); await p.waitForTimeout(1200); await p.click('.s01-lang'); await p.waitForURL('**/ar'); await ready(p); await p.waitForTimeout(3000);
  R.afterLang = await p.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, y: Math.round(scrollY), h1: document.querySelector('.s01-block[data-state="65"] h2')?.textContent, vis: [...document.querySelectorAll('.s01-block')].filter(e => +getComputedStyle(e).opacity > .5).map(e => e.dataset.state) }));
  await p.screenshot({ path: 'qa/shots/ar_after_switch_065.png' });
  await p.click('.s01-lang'); await p.waitForURL('**/en'); await ready(p); R.enAgain = await p.evaluate(() => document.documentElement.dir);
  // 4 back/forward
  await p.goBack(); await p.waitForURL('**/ar'); await p.goForward(); await p.waitForURL('**/en'); await ready(p); R.backFwd = 'ok';
  // 5 resize desktop -> mobile -> desktop
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(1200); await p.evaluate(() => window.__scrollTo(.85)); await p.waitForTimeout(1500);
  R.resizeMobile = await p.evaluate(() => ({ ov: document.documentElement.scrollWidth > document.documentElement.clientWidth, canvas: [document.querySelector('canvas').clientWidth, document.querySelector('canvas').clientHeight], menu: getComputedStyle(document.querySelector('.s01-menu-btn')).display }));
  await p.screenshot({ path: 'qa/shots/resize_m390_085.png' }); await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(1000); R.resizeBack = await p.evaluate(() => [document.querySelector('canvas').clientWidth, document.querySelector('canvas').clientHeight]);
  R.allErrs = errs; await ctx.close(); }
// 6 reduced motion, webgl off, mobile menu
{ const { ctx, p, errs } = await mk({ reducedMotion: 'reduce' }); await p.goto(BASE + '/en'); await p.waitForSelector('[data-fallback]'); R.reduced = await p.evaluate(() => ({ fb: document.querySelector('[data-fallback]').dataset.fallback, canvas: !!document.querySelector('canvas'), secs: document.querySelectorAll('.s01-static-sec').length, ov: document.documentElement.scrollWidth > document.documentElement.clientWidth })); await p.screenshot({ path: 'qa/shots/fallback_reduced.png' }); R.reducedErrs = errs; await ctx.close(); }
{ const { ctx, p, errs } = await mk(); await p.goto(BASE + '/ar?webgl=off'); await p.waitForSelector('[data-fallback]'); R.webglOff = await p.evaluate(() => ({ fb: document.querySelector('[data-fallback]').dataset.fallback, canvas: !!document.querySelector('canvas'), dir: document.dir })); R.webglOffErrs = errs; await ctx.close(); }
{ const { ctx, p } = await mk({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await p.goto(BASE + '/en'); await ready(p); await p.tap('.s01-menu-btn'); await p.waitForSelector('#s01-menu'); R.menuTargets = await p.evaluate(() => [...document.querySelectorAll('#s01-menu button,#s01-menu a')].map(e => Math.round(e.getBoundingClientRect().height))); await p.keyboard.press('Escape'); R.menuClosed = await p.evaluate(() => !document.querySelector('#s01-menu')); await ctx.close(); }
// 7 slow network (CDP): Fast 3G-ish
{ const { ctx, p } = await mk(); const c = await ctx.newCDPSession(p); await c.send('Network.enable'); await c.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 }); const reqs = []; p.on('response', async r => { try { reqs.push([r.url().replace(BASE, ''), (await r.body()).length]); } catch {} });
  const t0 = Date.now(); await p.goto(BASE + '/en', { waitUntil: 'commit' }); await p.waitForSelector('.s01-block h1'); const tText = Date.now() - t0; const ok = await ready(p); const tReady = Date.now() - t0; await p.screenshot({ path: 'qa/shots/slow3g_ready.png' }); await p.waitForTimeout(8000);
  R.slow = { tText, tReady, ok, tier: await p.evaluate(() => window.__recon?.stats()?.quality), kb: Math.round(reqs.reduce((a, r) => a + r[1], 0) / 1024) }; await ctx.close(); }
console.log(JSON.stringify(R, null, 1)); await b.close();
