// Experimental: WebP tiers -> KTX2 (Basis Universal UASTC, mipmapped) via ktx2-encoder (WASM). Usage: node scripts/encode_ktx2.mjs day_global_4096 [...]
import { encodeToKTX2 } from 'ktx2-encoder'; import sharp from 'sharp'; import fs from 'node:fs';
const imageDecoder = async buf => { const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data: new Uint8Array(data), width: info.width, height: info.height }; };
for (const name of process.argv.slice(2)) {
  const src = `public/textures/scene01/${name}.webp`; const t = Date.now(); const out = await encodeToKTX2(new Uint8Array(fs.readFileSync(src)), { isUASTC: process.env.ETC !== '1', qualityLevel: 160, generateMipmap: true, enableDebug: false, imageDecoder, isSetKTX2SRGBTransferFunc: !name.startsWith('landmask'), isKTX2File: true, needSupercompression: true });
  const suffix = process.env.ETC === '1' ? '.etc1s' : ''; fs.writeFileSync(`public/textures/scene01/${name}${suffix}.ktx2`, out); console.log(name, 'webp', fs.statSync(src).size, '-> ktx2', out.byteLength, `${((Date.now() - t) / 1000).toFixed(1)}s`);
}
