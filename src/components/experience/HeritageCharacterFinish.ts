import * as THREE from 'three';

/** Runtime-only cleanup of the imported static meshes. Never overwrite the source GLBs. */
export function finishOrganicGeometry(geometry: THREE.BufferGeometry, kind: 'horse' | 'man') {
  const p = geometry.getAttribute('position'), index = geometry.getIndex();
  if (!index || !p || geometry.userData.heritageFinished) return;
  geometry.userData.heritageFinished = true;
  const groups: { ids: number[]; original: THREE.Vector3; neighbors: Set<number>; boundary: boolean }[] = [];
  const keys = new Map<string, number>(), membership = new Int32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const xyz = new THREE.Vector3().fromBufferAttribute(p, i), key = xyz.toArray().map(v => Math.round(v * 1e6)).join(',');
    let id = keys.get(key); if (id === undefined) { id = groups.length; keys.set(key, id); groups.push({ ids: [], original: xyz, neighbors: new Set(), boundary: false }); }
    groups[id].ids.push(i); membership[i] = id;
  }
  const edges = new Map<string, [number, number, number]>();
  for (let i = 0; i < index.count; i += 3) {
    const ids = [membership[index.getX(i)], membership[index.getX(i + 1)], membership[index.getX(i + 2)]];
    for (let j = 0; j < 3; j++) { const a = ids[j], b = ids[(j + 1) % 3]; if (a === b) continue; groups[a].neighbors.add(b); groups[b].neighbors.add(a); const lo = Math.min(a,b), hi = Math.max(a,b), key = `${lo}:${hi}`; const e = edges.get(key); if (e) e[2]++; else edges.set(key, [lo, hi, 1]); }
  }
  for (const [a,b,count] of edges.values()) if (count !== 2) { groups[a].boundary = true; groups[b].boundary = true; }
  // Protect the eye, muzzle, ears, hooves, mane/tail, human face, fingers, and open boundaries.
  const weights = groups.map(g => { const { x,y,z } = g.original; if (g.boundary || g.neighbors.size < 3) return 0;
    if (kind === 'horse') return y > -.24 && y < .29 && z > -.31 && z < .26 ? 1 : 0;
    return y > -.37 && y < .13 && Math.abs(x) < .125 ? .7 : 0;
  });
  let positions = groups.map(g => g.original.clone());
  // Two gentle opposite passes limit shrinkage. Welded positions are used only for the calculation; UV vertices remain separate.
  for (const factor of [.16,-.08]) positions = positions.map((point, i) => {
    if (!weights[i]) return point.clone(); const average = new THREE.Vector3(); for (const id of groups[i].neighbors) average.add(positions[id]); average.divideScalar(groups[i].neighbors.size);
    const proposed = point.clone().lerp(average, factor * weights[i]), delta = proposed.sub(groups[i].original);
    return groups[i].original.clone().add(delta.clampLength(0, kind === 'horse' ? .0012 : .0009));
  });
  groups.forEach((g,i) => g.ids.forEach(id => p.setXYZ(id,positions[i].x,positions[i].y,positions[i].z))); p.needsUpdate = true;
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal'), originalNormals = Array.from({length:p.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(normals,i));
  // Smooth UV seams without merging vertices or averaging opposing/sharp normals.
  groups.forEach(g => g.ids.forEach(id => { const original = originalNormals[id], result = new THREE.Vector3(); for (const other of g.ids) if (original.dot(originalNormals[other]) > .48) result.add(originalNormals[other]); if (result.lengthSq() > 1e-8) { result.normalize(); normals.setXYZ(id,result.x,result.y,result.z); } }));
  normals.needsUpdate = true; geometry.computeBoundingBox(); geometry.computeBoundingSphere();
}

/** Warm sand and blue-sky reflection, assigned only to the animals, cloth, metal and leather. */
export function makeCharacterEnvironment(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256; const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0,0,0,256); gradient.addColorStop(0,'#77a9dd'); gradient.addColorStop(.46,'#c1d3e3'); gradient.addColorStop(.52,'#e1c5a2'); gradient.addColorStop(1,'#82624a'); ctx.fillStyle = gradient; ctx.fillRect(0,0,512,256);
  const sun = ctx.createRadialGradient(172,65,1,172,65,35); sun.addColorStop(0,'#ffffff'); sun.addColorStop(.12,'#fff4d9'); sun.addColorStop(1,'#ffffff00'); ctx.fillStyle = sun; ctx.fillRect(132,25,80,80);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.mapping = THREE.EquirectangularReflectionMapping;
  const generator = new THREE.PMREMGenerator(renderer); const target = generator.fromEquirectangular(texture); generator.dispose(); texture.dispose(); return target;
}

function irisMap() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#160f0d'; ctx.fillRect(0,0,256,256);
  ctx.save(); ctx.translate(128,128); ctx.scale(1,.82);
  const iris = ctx.createRadialGradient(0,0,9,0,0,115); iris.addColorStop(0,'#090604'); iris.addColorStop(.30,'#1c1009'); iris.addColorStop(.64,'#563015'); iris.addColorStop(.84,'#2b160d'); iris.addColorStop(1,'#080504'); ctx.fillStyle=iris; ctx.beginPath(); ctx.arc(0,0,115,0,Math.PI*2); ctx.fill();
  let seed=7239; const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<320;i++){const a=rand()*Math.PI*2, r=51+rand()*33, l=13+rand()*25;ctx.strokeStyle=rand()>.5?'rgba(179,108,48,.18)':'rgba(15,8,5,.25)';ctx.lineWidth=.7+rand()*1.1;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a+.025)*(r+l),Math.sin(a+.025)*(r+l));ctx.stroke();}
  ctx.fillStyle='#050403'; ctx.beginPath();ctx.ellipse(0,0,85,45,0,0,Math.PI*2);ctx.fill();ctx.restore();
  // Small soft sky reflection in addition to the physical corneal reflections.
  const highlight=ctx.createRadialGradient(93,88,1,93,88,14);highlight.addColorStop(0,'rgba(224,240,255,.84)');highlight.addColorStop(.23,'rgba(181,212,238,.48)');highlight.addColorStop(1,'rgba(180,205,230,0)');ctx.fillStyle=highlight;ctx.fillRect(77,72,32,32);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

/** Fit both glossy eyes to the actual local head surfaces. No baked-light texture edits. */
export function makeHorseEyes(horse: THREE.Object3D, environment: THREE.Texture) {
  horse.updateWorldMatrix(true,true); const group=new THREE.Group();group.name='Fitted corneal eyes and eyelid rims';
  const map=irisMap(); const eyeMat=new THREE.MeshPhysicalMaterial({map,roughness:.24,metalness:0,clearcoat:.35,clearcoatRoughness:.18,envMap:environment,envMapIntensity:.28,emissive:0xffffff,emissiveMap:map,emissiveIntensity:.16,side:THREE.DoubleSide});
  const rimMat=new THREE.MeshStandardMaterial({color:0x362018,roughness:.67,envMap:environment,envMapIntensity:.45});
  const ray=new THREE.Raycaster(), slices=48, rings=10;
  for(const side of [-1,1]){
    const centerY=1.435, centerZ=-.931;
    const sample=(angle:number,radius:number,bulge:number)=>{
      const z=centerZ+.025*radius*Math.cos(angle), y=centerY+.0145*radius*Math.sin(angle)+.0045*radius*Math.cos(angle);
      ray.set(new THREE.Vector3(.78+side*.25,y,z),new THREE.Vector3(-side,0,0));const hit=ray.intersectObject(horse,true)[0];
      return new THREE.Vector3((hit?.point.x??(.78+side*.09))+side*bulge,y,z);
    };
    const pos:number[]=[],uv:number[]=[],idx:number[]=[];
    for(let r=0;r<=rings;r++)for(let i=0;i<=slices;i++){const a=i/slices*Math.PI*2, rr=r/rings,p=sample(a,rr,.0015+.0055*(1-rr*rr));pos.push(p.x,p.y,p.z);uv.push(.5+.5*rr*Math.cos(a),.5+.5*rr*Math.sin(a));}
    for(let r=0;r<rings;r++)for(let i=0;i<slices;i++){const a=r*(slices+1)+i,b=a+slices+1;idx.push(a,a+1,b,b,a+1,b+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const eye=new THREE.Mesh(g,eyeMat);eye.name=side<0?'Left cornea':'Right cornea';group.add(eye);
    const points=Array.from({length:slices},(_,i)=>sample(i/slices*Math.PI*2,1.06,.0018));const lid=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),slices,.0018,8,true),rimMat);group.add(lid);
  }
  return {group,map};
}
