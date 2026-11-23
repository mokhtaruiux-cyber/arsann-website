import * as THREE from 'three';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type Sample = { point: THREE.Vector3; normal: THREE.Vector3 };

/** Sample the actual imported mesh, in world space, so the tack hugs the head. */
function sampleSurface(horse: THREE.Object3D, center: THREE.Vector3, outward: THREE.Vector3, radius = .24): Sample {
  const ray = new THREE.Raycaster(center.clone().addScaledVector(outward, radius), outward.clone().negate(), 0, radius * 2);
  const hit = ray.intersectObject(horse, true)[0];
  return { point: hit ? hit.point : center.clone().addScaledVector(outward, .07), normal: outward.clone() };
}

/** A flat leather strap with a real thickness and rounded edges, not a round tube. */
function ribbon(parent: THREE.Object3D, samples: Sample[], width: number, leather: THREE.Material, closed = false) {
  const positions: number[] = [], uv: number[] = [], triangles: number[] = [];
  const count = samples.length, thickness = .0045;
  for (let i = 0; i < count; i++) {
    const { point, normal } = samples[i];
    const prev = samples[closed ? (i + count - 1) % count : Math.max(0, i - 1)].point;
    const next = samples[closed ? (i + 1) % count : Math.min(count - 1, i + 1)].point;
    const tangent = next.clone().sub(prev).normalize();
    const across = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    const outward = new THREE.Vector3().crossVectors(across, tangent).normalize();
    // Keep the inside face just above the real horse surface and the outside face proud.
    for (const [w, h] of [[-.5, 0], [.5, 0], [.5, thickness], [-.5, thickness]]) {
      const p = point.clone().addScaledVector(across, w * width).addScaledVector(outward, .0035 + h);
      positions.push(p.x, p.y, p.z); uv.push(w + .5, i / Math.max(1, count - 1) * 5);
    }
  }
  for (let i = 0; i < (closed ? count : count - 1); i++) {
    const a = i * 4, b = ((i + 1) % count) * 4;
    for (let j = 0; j < 4; j++) { const k = (j + 1) % 4; triangles.push(a + j, b + j, a + k, a + k, b + j, b + k); }
  }
  if (!closed) { const e = (count - 1) * 4; triangles.push(0, 1, 2, 0, 2, 3, e, e + 2, e + 1, e, e + 3, e + 2); }
  const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geom.setIndex(triangles); geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, leather); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}

function ring(parent: THREE.Object3D, center: THREE.Vector3, radius: number, metal: THREE.Material, axis = v(1, 0, 0), tube = .004) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 40), metal);
  mesh.position.copy(center); mesh.quaternion.setFromUnitVectors(v(0, 0, 1), axis.clone().normalize()); mesh.castShadow = true; parent.add(mesh); return mesh;
}

function link(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const d = b.clone().sub(a), mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(.001, d.length() - radius * 2), 4, 10), material);
  mesh.position.copy(a).lerp(b, .5); mesh.quaternion.setFromUnitVectors(v(0, 1, 0), d.normalize()); mesh.castShadow = true; parent.add(mesh); return mesh;
}

/** Figma reference: brown noseband, crown and cheek straps, brass rings and a swivel clasp. */
export function makeHorseHalter(horse: THREE.Object3D, leather: THREE.Material) {
  horse.updateWorldMatrix(true, true);
  const tack = new THREE.Group(); tack.name = 'Figma leather halter and brass snap';
  const brass = new THREE.MeshStandardMaterial({ color: 0xe3b65e, metalness: .58, roughness: .27, emissive: 0x80531e, emissiveIntensity: .08 });
  // The cross-section aligns with the slanted nose of this exact horse GLB.
  const noseCenter = v(.78, 1.28, -.95);
  const nose = Array.from({ length: 72 }, (_, i) => { const a = i / 72 * Math.PI * 2; return sampleSurface(horse, noseCenter, v(Math.cos(a), .4 * Math.sin(a), -.916515 * Math.sin(a)), .19); });
  ribbon(tack, nose, .027, leather, true);

  const cheekPath = [[1.28,-.91],[1.32,-.90],[1.37,-.88],[1.42,-.865],[1.47,-.845],[1.52,-.81],[1.55,-.785],[1.57,-.76]];
  const cheekEnds = new Map<number, Sample>();
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3(cheekPath.map(([y,z]) => v(.78,y,z)), false, 'centripetal');
    const cheek = Array.from({ length: 38 }, (_, i) => sampleSurface(horse, curve.getPoint(i / 37), v(side,0,0), .24));
    cheekEnds.set(side, cheek[cheek.length - 1]);
    ribbon(tack, cheek, .022, leather);
    const sideRing = v(.78 + side * .089, 1.267, -.914);
    ring(tack, sideRing, .020, brass, v(side,0,0));
    // A short adjustable brass buckle on each cheek, plus its two rivets.
    const at = cheek[24].point.clone().addScaledVector(v(side,0,0), .011);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(.008, .031, .023), brass); buckle.position.copy(at); tack.add(buckle);
    const insert = new THREE.Mesh(new THREE.BoxGeometry(.009, .019, .013), leather); insert.position.copy(at).addScaledVector(v(side,0,0), .002); tack.add(insert);
  }
  // Crown strap over the poll, behind the ears, connected to both cheek straps.
  const pollCenter = v(.78, 1.51, -.76);
  const crown = [cheekEnds.get(1)!, ...Array.from({ length: 40 }, (_, i) => { const a = .63 + i / 39 * (Math.PI - 1.26); return sampleSurface(horse, pollCenter, v(Math.cos(a), Math.sin(a), 0), .17); }), cheekEnds.get(-1)!];
  ribbon(tack, crown, .027, leather);

  // Under-jaw connection joins both sides and remains visible from either camera side.
  const chinCenter = v(.78,1.35,-.84);
  const join = (side: number) => Array.from({ length: 9 }, (_, i) => sampleSurface(horse, v(.78,1.39 - i / 8 * .04,-.879 + i / 8 * .039), v(side,0,0), .24));
  const chin = [...join(1).slice(0,-1), ...Array.from({ length: 40 }, (_, i) => { const a = i / 39 * Math.PI; return sampleSurface(horse, chinCenter, v(Math.cos(a), -Math.sin(a), 0), .17); }), ...join(-1).reverse().slice(1)];
  ribbon(tack, chin, .019, leather);
  // A central underside ring and separate swivel eye allow the lead to stay attached through the camera orbit.
  const upper = v(.78,1.216,-.863), lower = v(.78,1.164,-.892);
  ring(tack, upper, .019, brass);
  link(tack, upper.clone().add(v(0,-.018,0)), lower.clone().add(v(0,.015,0)), .008, brass);
  ring(tack, lower, .017, brass, v(1,0,.25), .004);
  const leadStart = v(.78, 1.145, -.906);
  link(tack, leadStart, v(.759,1.125,-.948), .014, leather);
  return { tack, leadStart };
}
