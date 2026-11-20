// Static export + GitHub Pages project site: CSS url(/fonts/..), url(/posters/..) are absolute and ignore the base path.
// Rewrites them in the exported CSS. Usage: node scripts/prefix-css-urls.mjs out /repo-name
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [, , dir = 'out', base = ''] = process.argv;
if (!base) process.exit(0);
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
let n = 0;
for (const f of walk(dir).filter(f => f.endsWith('.css'))) {
  const s = readFileSync(f, 'utf8');
  const t = s.replace(/url\((['"]?)\/(fonts|posters|images|brand|textures|models|data|basis)\//g, (_, q, d) => `url(${q}${base}/${d}/`);
  if (t !== s) { writeFileSync(f, t); n++; }
}
console.log(`prefix-css-urls: rewrote ${n} css file(s) with base "${base}"`);
