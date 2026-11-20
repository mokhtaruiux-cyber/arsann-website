import sharp from 'sharp';
const [v, l] = process.argv.slice(2); const ks = [0,15,40,65,85,100]; const desk = v.startsWith('d'); const cols = desk ? 3 : 6; const s = desk ? 0.5 : 0.6;
const ims = await Promise.all(ks.map(async k => { const f = `qa/shots/${l}_${v}_${String(k).padStart(3,'0')}.png`; const m = await sharp(f).metadata(); return { b: await sharp(f).resize(Math.round(m.width*s)).toBuffer(), w: Math.round(m.width*s), h: Math.round(m.height*s) }; }));
const W = ims[0].w, H = ims[0].h, rows = 6/cols;
await sharp({ create: { width: W*cols, height: H*rows, channels: 3, background: '#000' } }).composite(ims.map((im,i)=>({ input: im.b, left: (i%cols)*W, top: Math.floor(i/cols)*H }))).png().toFile(`qa/shots/sheet_${l}_${v}.png`);
