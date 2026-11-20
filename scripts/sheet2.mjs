import sharp from 'sharp';
const [v, l, ...ks] = process.argv.slice(2); const s = +process.env.S || 0.6;
const ims = await Promise.all(ks.map(async k => { const f = `qa/shots/${l}_${v}_${String(k).padStart(3,'0')}.png`; const m = await sharp(f).metadata(); return { b: await sharp(f).resize(Math.round(m.width*s)).toBuffer(), w: Math.round(m.width*s), h: Math.round(m.height*s) }; }));
const W = ims[0].w, H = ims[0].h;
await sharp({ create: { width: W*ims.length, height: H, channels: 3, background: '#000' } }).composite(ims.map((im,i)=>({ input: im.b, left: i*W, top: 0 }))).png().toFile(`qa/shots/s2_${l}_${v}.png`);
