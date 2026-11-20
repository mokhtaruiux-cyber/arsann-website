import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal','--ignore-gpu-blocklist'] }); const p = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage();
await p.goto('http://localhost:3100/en'); await p.waitForFunction(()=>window.__recon?.ready,null,{timeout:30000}); await p.evaluate(()=>window.__scrollTo(.65)); await p.waitForTimeout(1200);
await p.click('.s01-lang'); await p.waitForURL('**/ar'); await p.waitForTimeout(3500); console.log(await p.evaluate(()=>({y:scrollY, vis:[...document.querySelectorAll('.s01-block')].filter(e=>+getComputedStyle(e).opacity>.5).map(e=>e.dataset.state)})));
await p.screenshot({path:'qa/shots/ar_after_switch_065.png'}); await b.close();
