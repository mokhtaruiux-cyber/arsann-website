import { chromium } from '@playwright/test';
const BASE = process.env.BASE || 'http://localhost:3100';
const VP = { d1440: [1440, 900], d1920: [1920, 1080], t768: [768, 1024], m390: [390, 844], m375: [375, 812], m320: [320, 568] };
const langs = (process.env.LANGS || 'en,ar').split(','); const vps = (process.env.VPS || 'd1440,m390').split(','); const pts = (process.env.PTS || '0,15,40,65,85,100').split(',').map(Number);
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const out = [];
for (const v of vps) for (const l of langs) {
  const [w, h] = VP[v]; const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 800, isMobile: w < 800 }); const p = await ctx.newPage();
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`${BASE}/${l}${process.env.QS || ''}`, { waitUntil: 'load' }); await p.waitForFunction(() => window.__recon?.ready === true, null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(2500);
  for (const k of pts) { await p.evaluate(x => window.__scrollTo(x / 100), k); await p.waitForTimeout(1600); await p.screenshot({ path: `qa/shots/${l}_${v}_${String(k).padStart(3, '0')}.png` }); }
  const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  out.push({ v, l, overflow: ov.sw > ov.cw, errs }); await ctx.close();
}
console.log(JSON.stringify(out, null, 1)); await b.close();
