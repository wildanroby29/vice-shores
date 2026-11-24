// City: grid roads, parametric buildings, palms, props, sea, pier, marina, market stalls.
const THREE = window.THREE;
import { DISTRICTS, CITY, districtAt } from './districts.js';
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mats = new Map();
function mat(hex, rough = 0.85, metal = 0.04, emis = 0x000000, ei = 0) {
  const k = hex + '/' + rough + '/' + metal + '/' + emis + '/' + ei;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal, emissive: emis, emissiveIntensity: ei }));
  return mats.get(k);
}
function box(w, h, d, m) { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = true; x.receiveShadow = true; return x; }
function stripeTex(c1, c2) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 32;
  const g = cv.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * 8, 0, 8, 32); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildCity(scene, wallScale = 1) {
  const rng = mulberry32(7);
  const footprints = []; const windowSpots = []; const litSpots = [];
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mat(0x6f7a52, 1, 0));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.1; ground.receiveShadow = true; scene.add(ground);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 500), new THREE.MeshStandardMaterial({ color: 0x1d6f9a, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.25 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.05, 420); sea.receiveShadow = true; scene.add(sea);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(340, 22), mat(0xd8c89a, 1, 0));
  beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.06, 168); beach.receiveShadow = true; scene.add(beach);
  const roadM = new THREE.MeshStandardMaterial({ color: 0x3d3f45, roughness: 0.95, metalness: 0, envMapIntensity: 0 });
  const kerbM = mat(0x9aa0a8, 0.9, 0);
  const dashM = mat(0xe8e8e8, 0.7, 0);
  const dashGeo = new THREE.BoxGeometry(0.5, 0.06, 3);
  const dashes = [];
  const crossGeo = new THREE.BoxGeometry(1.4, 0.06, 5);
  const crosses = [];
  for (let i = 0; i <= 8; i++) {
    const c = -160 + i * 40;
    const rx = box(340, 0.08, 10, roadM); rx.position.set(0, 0.02, c); rx.receiveShadow = true; scene.add(rx);
    const rz = box(10, 0.08, 340, roadM); rz.position.set(c, 0.02, 0); rz.receiveShadow = true; scene.add(rz);
    for (let k = -160; k <= 160; k += 12) { dashes.push([k, c]); dashes.push([c, k]); }
    for (let j = 0; j <= 8; j++) {
      const d = -160 + j * 40;
      for (let s = -4; s <= 4; s += 2) { crosses.push([d + s, c - 6]); crosses.push([d + s, c + 6]); crosses.push([c - 6, d + s]); crosses.push([c + 6, d + s]); }
    }
    const k1 = box(340, 0.12, 0.7, kerbM); k1.position.set(0, 0.04, c - 5.4); scene.add(k1);
    const k2 = box(340, 0.12, 0.7, kerbM); k2.position.set(0, 0.04, c + 5.4); scene.add(k2);
  }
  const dashIM = new THREE.InstancedMesh(dashGeo, dashM, dashes.length);
  const m4 = new THREE.Matrix4();
  dashes.forEach((p, i) => { m4.makeTranslation(p[0], 0.08, p[1]); dashIM.setMatrixAt(i, m4); });
  dashIM.instanceMatrix.needsUpdate = true; scene.add(dashIM);
  const crossIM = new THREE.InstancedMesh(crossGeo, dashM, crosses.length);
  crosses.forEach((p, i) => { m4.makeTranslation(p[0], 0.08, p[1]); crossIM.setMatrixAt(i, m4); });
  crossIM.instanceMatrix.needsUpdate = true; scene.add(crossIM);
  for (let i = 0; i < 26; i++) {
    const mh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 12), mat(0x2a2c30, 0.9, 0.2));
    mh.position.set(-150 + rng() * 300, 0.07, -150 + rng() * 300); scene.add(mh);
  }
  const awnTex = stripeTex('#ff5e8a', '#fff2d8');
  const awnMat = new THREE.MeshStandardMaterial({ map: awnTex, roughness: 0.8 });
  const winGeo = new THREE.BoxGeometry(1.6, 2.0, 0.15);
  function building(x, z, w, d, h, pal, district, tower) {
    const g = new THREE.Group();
    let wall = pal[Math.floor(rng() * pal.length)];
    if (wallScale !== 1) wall = new THREE.Color(wall).multiplyScalar(wallScale).getHex();
    const body = box(w, h, d, mat(wall, 0.85, 0.05));
    body.position.y = h / 2; g.add(body);
    const trim = box(w + 0.6, 0.5, d + 0.6, mat(0x2e2a26, 0.8, 0));
    trim.position.y = h + 0.25; g.add(trim);
    const par = box(w + 0.3, 0.9, d + 0.3, mat(wall, 0.85, 0.05));
    par.position.y = h + 0.7; g.add(par);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const pil = box(0.7, h, 0.7, mat(0x3a342e, 0.8, 0));
      pil.position.set(sx * (w / 2 - 0.35), h / 2, sz * (d / 2 - 0.35)); g.add(pil);
    }
    const floors = Math.max(1, Math.floor(h / 4));
    for (let f = 1; f <= floors; f++) {
      const band = box(w + 0.15, 0.28, d + 0.15, mat(wall, 0.85, 0.05));
      band.position.y = f * 4; g.add(band);
    }
    const cols = Math.max(1, Math.floor(w / 4));
    const rows = floors;
    for (let ci = 0; ci < cols; ci++) for (let ri = 0; ri < rows; ri++) {
      const wx = -w / 2 + 2 + ci * 4, wy = 2.6 + ri * 4;
      windowSpots.push([x + wx, wy, z + d / 2 + 0.08, 0]);
      windowSpots.push([x + wx, wy, z - d / 2 - 0.08, Math.PI]);
      if (rng() < 0.4) litSpots.push([x + wx, wy, z + d / 2 + 0.08, 0]);
    }
    if (district.identity === 'shops and awnings' || district.identity === 'night market') {
      const awn = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 2.4), awnMat);
      awn.position.set(0, 3.4, d / 2 + 1.1); awn.rotation.x = -0.5; g.add(awn);
      const sign = box(w * 0.6, 0.9, 0.3, mat(district.accent, 0.5, 0.1, district.accent, 0.9));
      sign.position.set(0, 4.6, d / 2 + 0.2); g.add(sign);
    }
    if (rng() < 0.6) { const ac = box(2, 1, 1.4, mat(0x8a8f96, 0.7, 0.3)); ac.position.set(w * 0.2, h + 1.4, 0); g.add(ac); }
    if (rng() < 0.4) { const tk = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 10), mat(0x7a6a55, 0.8, 0)); tk.position.set(-w * 0.25, h + 2, -d * 0.2); tk.castShadow = true; g.add(tk); }
    if (tower && h > 30) {
      const set = box(w * 0.62, h * 0.3, d * 0.62, mat(wall, 0.8, 0.12));
      set.position.y = h + h * 0.15; g.add(set);
    }
    if (rng() < 0.5) {
      for (let b = 0; b < 2; b++) {
        const bal = box(3, 0.25, 1.2, mat(0x6a5a48, 0.85, 0));
        bal.position.set(-w / 4 + b * w / 2, 8 + b * 5, d / 2 + 0.6); g.add(bal);
      }
    }
    g.position.set(x, 0, z);
    scene.add(g);
    footprints.push({ x, z, w, d, district: district.id });
  }
  const blockCenters = [];
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) blockCenters.push([-140 + i * 40, -140 + j * 40]);
  for (const [bx, bz] of blockCenters) {
    const d = districtAt(bx, bz);
    const tower = d.identity === 'glass towers';
    const n = tower ? 1 : 1 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      const w = 12 + rng() * 12, dd = 12 + rng() * 12;
      const h = tower ? 38 + rng() * 30 : 9 + rng() * 14;
      building(bx + (rng() - 0.5) * 10, bz + (rng() - 0.5) * 10, w, dd, h, d.walls, d, tower);
    }
  }
  const winIM = new THREE.InstancedMesh(winGeo, mat(0x1a2230, 0.25, 0.5), windowSpots.length);
  windowSpots.forEach((p, i) => { m4.makeRotationY(p[3]); m4.setPosition(p[0], p[1], p[2]); winIM.setMatrixAt(i, m4); });
  winIM.instanceMatrix.needsUpdate = true; scene.add(winIM);
  const litMat = mat(0xffc46a, 0.4, 0, 0xffc46a, 1.4);
  const litIM = new THREE.InstancedMesh(winGeo, litMat, Math.max(1, litSpots.length));
  litSpots.forEach((p, i) => { m4.makeRotationY(p[3]); m4.setPosition(p[0], p[1], p[2]); litIM.setMatrixAt(i, m4); });
  litIM.instanceMatrix.needsUpdate = true; litIM.visible = false; scene.add(litIM);
  const trunkM = mat(0x7a5a3a, 1, 0);
  const frondM = mat(0x3d8a4a, 0.9, 0);
  const palms = [];
  for (let i = 0; i < 46; i++) {
    const px = -160 + (i % 8) * 40 + (rng() - 0.5) * 8;
    const pz = -140 + Math.floor(i / 8) * 40 + 8;
    const pg = new THREE.Group();
    let tx = 0;
    for (let s = 0; s < 3; s++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.28 - s * 0.05, 0.34 - s * 0.05, 2.4, 7), trunkM);
      tx += 0.35; seg.position.set(tx, 1.2 + s * 2.3, 0); seg.rotation.z = -0.12; seg.castShadow = true; pg.add(seg);
    }
    for (let f = 0; f < 11; f++) {
      const fr = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.4, 4), frondM);
      const a = (f / 11) * Math.PI * 2;
      fr.position.set(tx + Math.cos(a) * 1.4, 7.4, Math.sin(a) * 1.4);
      fr.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      fr.scale.set(1, 1, 0.25); fr.castShadow = true; pg.add(fr);
    }
    pg.position.set(px, 0, pz);
    scene.add(pg); palms.push(pg);
  }
  const lampM = mat(0x2e3440, 0.6, 0.4);
  const lampGlow = mat(0xffe9a8, 0.4, 0, 0xffe9a8, 1.6);
  for (let i = 0; i < 60; i++) {
    const lx = -160 + (i % 10) * 36, lz = -160 + Math.floor(i / 10) * 56 + 6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), lampM);
    pole.position.set(lx, 3, lz); pole.castShadow = true; scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), lampGlow);
    bulb.position.set(lx, 6.2, lz); scene.add(bulb);
    if (i % 3 === 0) {
      const bench = box(2.4, 0.5, 0.8, mat(0x8a6a4a, 0.9, 0)); bench.position.set(lx + 3, 0.5, lz); scene.add(bench);
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.45, 1, 8), mat(0x3a4a3a, 0.8, 0.2)); bin.position.set(lx - 3, 0.5, lz); scene.add(bin);
    }
    if (i % 4 === 0) {
      const crate = box(1.2, 1.2, 1.2, mat(0xa8845a, 0.95, 0)); crate.position.set(lx + 5, 0.6, lz + 3); scene.add(crate);
      const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1, 8), mat(0xd83a2a, 0.6, 0.2)); hyd.position.set(lx - 5, 0.5, lz - 2); scene.add(hyd);
    }
  }
  const stalls = [];
  const stallCols = ['#ff5e8a', '#ffd166', '#6ad8e8', '#8affc8', '#ff8a3d'];
  const stallSpots = [[104, -12], [136, -12], [106, -30], [134, -30], [100, -48], [140, -48]];
  for (let s = 0; s < 6; s++) {
    const [sx, sz] = stallSpots[s];
    const sg = new THREE.Group();
    const table = box(4, 1, 2.4, mat(0x8a6a4a, 0.9, 0)); table.position.y = 0.5; sg.add(table);
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6), new THREE.MeshStandardMaterial({ map: stripeTex(stallCols[s], '#fff2d8'), roughness: 0.8 }));
    awn.position.set(0, 3.1, 0.4); awn.rotation.x = -0.45; sg.add(awn);
    const sign = box(3.4, 0.8, 0.25, mat(0xff5e8a, 0.5, 0.1, 0xff5e8a, 1.2)); sign.position.set(0, 4.1, 0); sg.add(sign);
    for (let l = 0; l < 3; l++) {
      const lan = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), mat(l % 2 ? 0xffd166 : 0xff5e8a, 0.4, 0, l % 2 ? 0xffd166 : 0xff5e8a, 1.5));
      lan.position.set(-1.6 + l * 1.6, 2.5, 0.6); sg.add(lan);
    }
    const cr = box(1, 1, 1, mat(0xa8845a, 0.95, 0)); cr.position.set(2.8, 0.5, 1.2); sg.add(cr);
    sg.position.set(sx, 0, sz);
    scene.add(sg); stalls.push(sg);
  }
  const pier = new THREE.Group();
  const deck = box(60, 0.6, 110, mat(0x9a7a55, 0.95, 0)); deck.position.set(0, 1.2, 0); pier.add(deck);
  for (let p = 0; p < 10; p++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3, 8), mat(0x6a4a35, 0.9, 0));
    post.position.set(-28 + (p % 2) * 56, -0.5, -50 + Math.floor(p / 2) * 25); pier.add(post);
  }
  for (let l = 0; l < 8; l++) {
    const lp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), lampGlow);
    lp.position.set(-28 + (l % 2) * 56, 3.4, -50 + Math.floor(l / 2) * 25); pier.add(lp);
  }
  pier.position.set(100, 0, 215);
  scene.add(pier);
  for (let b = 0; b < 5; b++) {
    const bg = new THREE.Group();
    const hull = box(3, 1.4, 9, mat(b % 2 ? 0xe8e8e8 : 0x3a6a8a, 0.4, 0.4)); hull.position.y = 0.7; bg.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 7, 6), mat(0x5a4a35, 0.8, 0)); mast.position.y = 4.5; bg.add(mast);
    const wake = new THREE.Mesh(new THREE.CircleGeometry(2.0, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }));
    wake.rotation.x = -Math.PI / 2; wake.scale.set(1, 2.2, 1); wake.position.y = 0.42; bg.add(wake);
    bg.position.set(-120 + b * 30, -0.35, 185 + (b % 2) * 12);
    scene.add(bg);
  }
  for (let cr = 0; cr < 2; cr++) {
    const cg = new THREE.Group();
    const tower = box(3, 26, 3, mat(0xd8a03a, 0.6, 0.4)); tower.position.y = 13; cg.add(tower);
    const arm = box(22, 1.4, 1.4, mat(0xd8a03a, 0.6, 0.4)); arm.position.set(8, 25, 0); cg.add(arm);
    cg.position.set(-140 + cr * 90, 0, 150);
    scene.add(cg);
  }
  return { footprints, litIM, stalls, palms };
}
