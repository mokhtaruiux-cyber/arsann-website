// Blender reference vs reconstruction: side-by-side page captures + numeric comparison (mean abs error, mean luminance, 8-bit) at 480x270.
import { chromium } from '@playwright/test'; import fs from 'node:fs'; import path from 'node:path';
const tier = process.argv[2] ?? 'high'; const outDir = `shots/review_${tier}`; fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
const metric = await browser.newPage(); await metric.goto('about:blank'); const results = [];
for (const p of [0, 40, 65, 85, 100]) {
  const pp = String(p).padStart(3, '0');
  await page.goto(`http://localhost:3100/scene01-recon?clean=1&nolabels=1&still=1&progressive=0&tier=${tier}&p=${p / 100}`); await page.waitForFunction(() => window.__recon?.ready, null, { timeout: 120000 }); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${outDir}/recon_p${pp}.png` });
  await page.goto(`http://localhost:3100/scene01-visual-review?p=${p}&tier=${tier}&nolabels=1`); await page.waitForFunction(() => window.__recon?.ready, null, { timeout: 120000 }); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${outDir}/sidebyside_p${pp}.png` });
  const ref = fs.readFileSync(`public/reference/brand_p${pp}.png`).toString('base64'), rec = fs.readFileSync(`${outDir}/recon_p${pp}.png`).toString('base64');
  const r = await metric.evaluate(async ([a, b]) => { const load = s => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]); const mk = i => { const c = document.createElement('canvas'); c.width = 480; c.height = 270; const x = c.getContext('2d'); x.drawImage(i, 0, 0, 480, 270); return x.getImageData(0, 0, 480, 270).data; };
    const A = mk(ia), B = mk(ib); let e = 0, la = 0, lb = 0, n = 0, er = 0, eg = 0, eb = 0; for (let k = 0; k < A.length; k += 4) { er += Math.abs(A[k] - B[k]); eg += Math.abs(A[k + 1] - B[k + 1]); eb += Math.abs(A[k + 2] - B[k + 2]); la += 0.2126 * A[k] + 0.7152 * A[k + 1] + 0.0722 * A[k + 2]; lb += 0.2126 * B[k] + 0.7152 * B[k + 1] + 0.0722 * B[k + 2]; n++; }
    return { maeR: +(er / n).toFixed(1), maeG: +(eg / n).toFixed(1), maeB: +(eb / n).toFixed(1), mae: +((er + eg + eb) / 3 / n).toFixed(1), lumBlender: +(la / n).toFixed(1), lumWeb: +(lb / n).toFixed(1) }; }, [ref, rec]);
  results.push({ p, ...r });
}
fs.writeFileSync(`${outDir}/metrics.json`, JSON.stringify({ tier, results, errs: [...new Set(errs)] }, null, 1)); console.log(JSON.stringify({ tier, results, errs: [...new Set(errs)] }, null, 1));
await browser.close();
