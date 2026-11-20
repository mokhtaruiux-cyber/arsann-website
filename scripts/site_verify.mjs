import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.BASE ?? 'http://127.0.0.1:3118';
const output = process.env.QA_OUT ?? 'qa/verified';
const points = [0, 15, 40, 65, 85, 100];
const sizes = { d1920: [1920, 1080], d1440: [1440, 900], t768: [768, 1024], m390: [390, 844], m375: [375, 812], m320: [320, 568] };
const result = {};
const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADLESS === '1', args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
await mkdir(path.join(output, 'screens'), { recursive: true });
const save = () => writeFile(path.join(output, 'results.json'), JSON.stringify({ browser: browser.version(), ...result, errors }, null, 2));
const shot = (page, name) => page.screenshot({ path: path.join(output, 'screens', name + '.jpg'), type: 'jpeg', quality: 85 });
const ready = page => page.waitForFunction(() => document.querySelector('.s01-canvas')?.dataset.ready === 'true', null, { timeout: 45000 });
const seek = async (page, n) => {
  await page.evaluate(n => window.__scrollTo(n / 100), n);
  await page.waitForFunction(n => Math.abs(scrollY / (document.documentElement.scrollHeight - innerHeight) * 100 - n) < 1.2, n);
  await page.waitForTimeout(140);
};
async function visit(name, size = 'd1440', options = {}, args = {}) {
  const [width, height] = sizes[size];
  const mobile = width <= 768;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, ...options });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__qaVitals = { long: [], lcp: null };
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) new PerformanceObserver(l => window.__qaVitals.long.push(...l.getEntries().map(e => [Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true });
    if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) new PerformanceObserver(l => { const e = l.getEntries().at(-1); window.__qaVitals.lcp = { ms: Math.round(e.startTime), tag: e.element?.tagName, url: e.url }; }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  page.on('pageerror', e => errors.push({ name, type: 'pageerror', message: e.message }));
  page.on('console', m => { if (m.type() === 'error') errors.push({ name, type: 'console', message: m.text(), expected: name === 'missingTexture' && m.text().includes('net::ERR_FAILED') }); });
  page.on('response', r => { if (r.status() >= 400 && !args.expectedStatus) errors.push({ name, type: 'http', message: r.status() + ' ' + r.url() }); });
  return { context, page };
}
const geometry = page => page.evaluate(() => {
  const visible = e => getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > .5;
  const box = e => e.getBoundingClientRect();
  const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const blocks = [...document.querySelectorAll('.s01-block')].filter(visible);
  const labels = [...document.querySelectorAll('.s01-labels li')].filter(visible);
  const labelBoxes = labels.map(e => box(e.querySelector('span')));
  const content = blocks.flatMap(e => [...e.children].map(box));
  const progress = [...document.querySelectorAll('.s01-ticks button')].map(box);
  const header = [...document.querySelectorAll('.s01-logo, .s01-header-end')].map(box);
  const overflow = b => b.left < -1 || b.right > innerWidth + 1 || b.top < -1 || b.bottom > innerHeight + 1;
  return {
    lang: document.documentElement.lang, dir: document.documentElement.dir, scrollY: Math.round(scrollY),
    tier: window.__recon.stats()?.tier, camera: window.__recon.stats()?.camera,
    active: [...document.querySelectorAll('.s01-ticks button')].findIndex(e => e.hasAttribute('aria-current')),
    states: blocks.map(e => Number(e.dataset.state)), cityLabels: labels.map(e => e.dataset.city),
    cityOverlap: labelBoxes.some((b, i) => labelBoxes.slice(i + 1).some(c => hit(b, c)) || [...content, ...progress, ...header].some(c => hit(b, c))),
    clipped: [...content, ...labelBoxes, ...progress, ...header].some(overflow),
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    copyObscured: content.some(b => [...header, ...progress].some(c => hit(b, c))),
    minTickWidth: Math.min(...progress.map(b => b.width)),
  };
});
const measure = async (page, ms, action) => {
  const sampling = page.evaluate(ms => new Promise(resolve => {
    const ds = [];
    let first, prev;
    const frame = t => {
      first ??= t;
      if (prev != null) ds.push(t - prev);
      prev = t;
      if (t - first < ms) requestAnimationFrame(frame);
      else {
        ds.sort((a, b) => a - b);
        resolve({ frames: ds.length, fps: +(ds.length * 1000 / (t - first)).toFixed(1), p95Ms: +ds[Math.floor(ds.length * .95)].toFixed(1), maxMs: +ds.at(-1).toFixed(1), over33_4Ms: ds.filter(d => d > 33.4).length, longTasks: window.__qaVitals.long.filter(([at]) => at >= first && at <= t) });
      }
    };
    requestAnimationFrame(frame);
  }), ms);
  await action();
  return sampling;
};
async function cold(name, size, url, throttle = false) {
  const { context, page } = await visit(name, size);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (throttle) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular3g' });
  await page.goto(base + url, { waitUntil: 'commit' });
  await page.locator('.s01-block h1').waitFor({ state: 'visible' });
  const headlineMs = await page.evaluate(() => Math.round(performance.now()));
  await ready(page);
  const readyMs = await page.evaluate(() => Math.round(performance.now()));
  await page.waitForFunction(() => { const s = window.__recon.stats(); return s && s.tier === s.quality; });
  await page.waitForTimeout(1000);
  const metrics = await page.evaluate(() => ({
    paint: Object.fromEntries(performance.getEntriesByType('paint').map(e => [e.name, Math.round(e.startTime)])),
    lcp: window.__qaVitals.lcp, longTasks: window.__qaVitals.long,
    resources: performance.getEntriesByType('resource').map(r => ({ file: new URL(r.name).pathname, transfer: r.transferSize, encoded: r.encodedBodySize, ms: Math.round(r.responseEnd) })),
    html: performance.getEntriesByType('navigation')[0].transferSize,
    renderer: window.__recon.stats(), timings: window.__recon.timings,
    network: { downlink: navigator.connection?.downlink, effectiveType: navigator.connection?.effectiveType },
  }));
  if (throttle) await shot(page, 'slow-3g-ready');
  if (name === 'highEN') await shot(page, 'en_d1920_high_000');
  await context.close();
  return { headlineMs, readyMs, ...metrics };
}
const route = process.env.QA_PART ?? 'all';
try {
  if (['all', 'perf'].includes(route)) {
    result.performance = {};
    for (const [name, size, url, throttle] of [
      ['desktopEN', 'd1440', '/en', false], ['desktopAR', 'd1440', '/ar', false],
      ['mobileAR', 'm390', '/ar', false], ['slowEN', 'd1440', '/en', true],
      ['highEN', 'd1920', '/en?tier=high', false],
    ]) {
      result.performance[name] = await cold(name, size, url, throttle);
      await save();
      console.log('Measured', name, result.performance[name].readyMs);
    }
  }
  if (['all', 'interaction'].includes(route)) {
    const { context, page } = await visit('interaction');
    await page.goto(base + '/'); await ready(page); await page.waitForTimeout(1000);
    const redirected = new URL(page.url()).pathname;
    const routes = {};
    for (const tool of ['/tools', '/scene01-test', '/scene01-compare', '/scene01-scroll-test', '/scene01-recon', '/scene01-visual-review', '/fr']) {
      routes[tool] = (await context.request.get(base + tool)).status();
    }
    const cdp = await context.newCDPSession(page);
    const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); return Math.round((await cdp.send('Runtime.getHeapUsage')).usedSize / 1e6 * 10) / 10; };
    const initialHeap = await heap();
    const wheel = async direction => {
      for (let i = 0; i < 42; i++) { await page.mouse.wheel(0, direction * 164); await page.waitForTimeout(100); }
      await page.waitForTimeout(400);
    };
    await page.mouse.move(790, 500);
    const forward = await measure(page, 5200, () => wheel(1));
    const end = await geometry(page);
    const backward = await measure(page, 5200, () => wheel(-1));
    const start = await geometry(page);
    const rapid = await measure(page, 3000, async () => { for (const n of [100, 15, 85, 0, 65, 40, 100, 0]) await seek(page, n); });
    await page.locator('.s01-ticks button').nth(3).click();
    await page.waitForFunction(() => Math.abs(scrollY - (document.documentElement.scrollHeight - innerHeight) * .65) < 10);
    const tick = await geometry(page);
    await page.evaluate(() => {
      window.__qaOld = window.__recon.renderer;
      window.__qaLost = false;
      window.__qaOld.domElement.addEventListener('webglcontextlost', () => { window.__qaLost = true; });
    });
    await page.locator('.s01-lang').click(); await page.waitForURL('**/ar'); await ready(page); await page.waitForTimeout(1050);
    const arabic = await geometry(page);
    const release = await page.evaluate(() => window.__qaOld ? { lost: window.__qaLost || window.__qaOld.getContext().isContextLost(), geometry: window.__qaOld.info.memory.geometries, textures: window.__qaOld.info.memory.textures, canvases: document.querySelectorAll('canvas').length } : { newDocument: true });
    await page.evaluate(() => { delete window.__qaOld; });
    await page.locator('.s01-lang').click(); await page.waitForURL('**/en'); await ready(page); await page.waitForTimeout(700);
    const english = await geometry(page);
    await page.goBack(); await page.waitForURL('**/ar'); await ready(page);
    await page.goForward(); await page.waitForURL('**/en'); await ready(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await seek(page, 85); const resizeMobile = await geometry(page);
    await page.locator('.s01-menu-btn').click();
    const dialog = await page.locator('dialog[open]').count();
    const focusOnOpen = await page.evaluate(() => document.activeElement.className);
    await page.keyboard.press('Tab');
    const focusLeftMenu = await page.evaluate(() => document.activeElement !== document.body && !document.activeElement.closest('dialog'));
    await page.keyboard.press('Escape'); await page.locator('dialog[open]').waitFor({ state: 'hidden' });
    const focusAfterClose = await page.evaluate(() => document.activeElement.className);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seek(page, 0);
    await page.keyboard.press('Tab');
    await page.locator('.s01-skip').focus(); await page.keyboard.press('Enter');
    const skipFocus = await page.evaluate(() => document.activeElement.id);
    result.interactions = { redirected, routes, forward, end, backward, start, rapid, tick, arabic, english, release, history: 'back to /ar and forward to /en', resizeMobile, dialog, focusOnOpen, focusLeftMenu, focusAfterClose, skipFocus, heapMB: [initialHeap, await heap()] };
    await context.close(); await save();
    for (const [name, url, options, reason] of [['reduced', '/en', { reducedMotion: 'reduce' }, 'reduced'], ['noWebGL', '/ar?webgl=off', {}, 'webgl'], ['missingTexture', '/en', {}, 'assets'], ['contextLoss', '/ar', {}, 'webgl']]) {
      const { context, page } = await visit(name, 'm390', options);
      if (name === 'missingTexture') await page.route(/day_global_(4096\.etc1s\.ktx2|2048\.webp)$/, r => r.abort('failed'));
      await page.goto(base + url);
      if (name === 'contextLoss') {
        await ready(page);
        await page.evaluate(() => window.__recon.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
      }
      await page.locator(`[data-fallback="${reason}"]`).waitFor();
      const data = await page.evaluate(() => ({
        dir: document.documentElement.dir, canvas: !!document.querySelector('canvas'), cards: document.querySelectorAll('.s01-static-sec').length,
        models: performance.getEntriesByType('resource').filter(r => r.name.includes('/models/')).length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }));
      await shot(page, name);
      (result.fallbacks ??= {})[name] = data;
      await context.close(); await save();
    }
  }
  if (['all', 'touch'].includes(route)) {
    const { context, page } = await visit('touch-scroll', 'm390');
    await page.goto(base + '/ar'); await ready(page); await page.waitForTimeout(1000);
    const cdp = await context.newCDPSession(page);
    const swipe = direction => cdp.send('Input.synthesizeScrollGesture', {
      x: 195, y: 420, yDistance: direction * 6300, speed: 1400, preventFling: true, gestureSourceType: 'touch',
    });
    const forward = await measure(page, 5000, () => swipe(-1));
    const end = await geometry(page);
    const backward = await measure(page, 5000, () => swipe(1));
    const start = await geometry(page);
    result.touch = { forward, backward, end, start, stats: await page.evaluate(() => window.__recon.stats()) };
    await save();
    assert(end.states.includes(100) && start.states.includes(0), 'Touch scroll should reach both endpoints');
    await context.close();
  }
  if (['all', 'matrix'].includes(route)) {
    result.matrix = [];
    for (const size of Object.keys(sizes)) for (const lang of ['en', 'ar']) {
      const { context, page } = await visit(`${lang}-${size}`, size);
      await page.goto(base + '/' + lang); await ready(page); await page.waitForTimeout(950);
      for (const progress of points) {
        await seek(page, progress);
        const name = `${lang}_${size}_${String(progress).padStart(3, '0')}`;
        result.matrix.push({ name, progress, ...await geometry(page) });
        await shot(page, name);
      }
      await context.close(); await save();
      console.log('Captured', lang, size);
    }
  }
  assert.deepEqual(errors.filter(e => !e.expected), [], 'Unexpected browser errors');
  if (result.matrix) {
    assert.equal(result.matrix.length, 72, 'Two locales × six viewports × six states');
    for (const capture of result.matrix) {
      assert(capture.states.includes(capture.progress), capture.name + ' checkpoint copy');
      assert(!capture.clipped && !capture.pageOverflow && !capture.cityOverlap && !capture.copyObscured, capture.name + ' layout');
      if (capture.name.includes('_m') || capture.name.includes('_t')) assert(capture.minTickWidth >= 44, capture.name + ' touch targets');
    }
  }
  if (result.interactions) {
    const i = result.interactions;
    assert.equal(i.redirected, '/en');
    assert(i.start.states.includes(0) && i.end.states.includes(100));
    assert(i.arabic.dir === 'rtl' && i.english.dir === 'ltr' && i.arabic.active === 3 && i.english.active === 3);
    assert(i.release.lost && i.release.geometry === 0 && i.release.textures === 0, 'Previous WebGL canvas must be released');
    assert(i.dialog === 1 && !i.focusLeftMenu && i.focusAfterClose === 's01-menu-btn' && i.skipFocus === 's01-main');
    assert.equal(Object.keys(result.fallbacks).length, 4);
    for (const fallback of Object.values(result.fallbacks)) assert(!fallback.canvas && !fallback.overflow && fallback.cards === 6);
  }
} finally {
  await save();
  await browser.close();
}
