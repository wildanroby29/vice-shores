import { PAINT } from './config.js';

export const PALETTES = [
  { base: 0xe8d9b8, trim: 0xc96f4a, roof: 0x8a6f5c }, // cream
  { base: 0xd9a05a, trim: 0x8a3a2a, roof: 0x6b3a2a }, // terracotta
  { base: 0x7ac2c2, trim: 0x2a6a6a, roof: 0x2a4a5a }, // teal
  { base: 0xe8b8c8, trim: 0x8a4a6a, roof: 0x6b3a4a }, // pink
  { base: 0xd9c49a, trim: 0x8a6a3a, roof: 0x5c4a2a }, // sand
  { base: 0xdfe8ee, trim: 0x3a7ca5, roof: 0x5c6b7a }, // pale blue
  { base: 0xf5e6c8, trim: 0xb3543f, roof: 0x7a4a3a }, // warm white
];

function paintWindowTexture(palette, rng) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#' + palette.base.toString(16).padStart(6, '0');
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(255,255,255,0.16)';
  for (let x = 0; x < 128; x += 26) g.fillRect(x, 0, 4, 256);
  g.fillStyle = 'rgba(0,0,0,0.14)';
  for (let y = 0; y < 256; y += 22) g.fillRect(0, y, 128, 3);
  for (let y = 8; y < 256; y += 22) {
    for (let x = 10; x < 128; x += 26) {
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(x - 2, y - 2, 20, 18);
      const lit = rng() < 0.5;
      g.fillStyle = lit ? '#ffd98a' : '#2a3542';
      g.fillRect(x, y, 16, 14);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x, y, 16, 3);
    }
  }
  const grad = g.createLinearGradient(0, 180, 0, 256);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = grad;
  g.fillRect(0, 180, 128, 76);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function makeBuilding(x, z, w, d, h, palette, rng, detail = 'full', lit = true) {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: palette.base, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: palette.roof, roughness: 0.9 });
  const tex = paintWindowTexture(palette, rng);
  const wallMat = new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.85,
  });
  const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  core.position.y = h / 2;
  core.castShadow = true;
  core.receiveShadow = true;
  group.add(core);

  if (detail === 'full') {
    const cols = Math.max(2, Math.floor(w / 4.5));
    for (let i = 0; i < cols; i++) {
      const px = -w / 2 + ((i + 0.5) * w) / cols;
      group.add(box(0.5, h, 0.35, trimMat, px, h / 2, d / 2 + 0.1));
      group.add(box(0.5, h, 0.35, trimMat, px, h / 2, -d / 2 - 0.1));
    }
    const sideCols = Math.max(1, Math.floor(d / 4.5));
    for (let i = 0; i < sideCols; i++) {
      const pz = -d / 2 + ((i + 0.5) * d) / sideCols;
      group.add(box(0.35, h, 0.5, trimMat, w / 2 + 0.1, h / 2, pz));
      group.add(box(0.35, h, 0.5, trimMat, -w / 2 - 0.1, h / 2, pz));
    }
    const floors = Math.max(2, Math.floor(h / 3.6));
    for (let f = 0; f < floors - 1; f++) {
      const y = (h * (f + 1)) / floors;
      group.add(box(w + 0.5, 0.35, d + 0.5, trimMat, 0, y, 0));
    }
    const shopN = Math.max(1, Math.floor(w / 6));
    const paneW = w / shopN - 1.2;
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1a2430, roughness: 0.15, metalness: 0.4,
      emissive: 0xffd98a, emissiveIntensity: 0.55,
    });
    for (let i = 0; i < shopN; i++) {
      const px = -w / 2 + ((i + 0.5) * w) / shopN;
      group.add(box(paneW, 2.6, 0.12, glassMat, px, 1.7, d / 2 + 0.03));
    }
    group.add(box(w + 0.8, 0.5, d + 0.8, roofMat, 0, h + 0.2, 0));
    group.add(box(w + 0.4, 0.9, d + 0.4, roofMat, 0, h + 0.7, 0));
    if (h > 16) {
      const tw = w * 0.62;
      const td = d * 0.62;
      const th = h * 0.18;
      group.add(box(tw, th, td, trimMat, 0, h + h * 0.09, 0));
      group.add(box(tw + 0.8, 0.5, td + 0.8, roofMat, 0, h + th + 0.2, 0));
    }
    const acMat = new THREE.MeshStandardMaterial({ color: 0x9aa2a8, metalness: 0.4, roughness: 0.6 });
    group.add(box(1.6, 0.8, 1.2, acMat, -w / 4, h + 0.9, -d / 4));
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.9 });
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 12), tankMat);
    tank.position.set(w / 4, h + 1.3, d / 4);
    tank.castShadow = true;
    group.add(tank);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.6 });
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 4, 6), antMat);
    ant.position.set(w / 4, h + 3.2, -d / 4);
    group.add(ant);
    group.add(box(w * 0.7, 0.3, 2.2, trimMat, 0, 3.4, d / 2 + 0.9));
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x222222, emissive: palette.trim, emissiveIntensity: 0.9, roughness: 0.6,
    });
    group.add(box(w * 0.5, 1.1, 0.3, signMat, 0, 5.2, d / 2 + 0.2));
    if (h > 16) {
      const railMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.5, roughness: 0.6 });
      let f = 0;
      for (let y = 7; y < h - 2 && f < 3; y += 8, f++) {
        const bx = f % 2 === 0 ? -w / 4 : w / 4;
        group.add(box(3.2, 0.25, 1.4, trimMat, bx, y, d / 2 + 0.7));
        group.add(box(3.2, 0.7, 0.08, railMat, bx, y + 0.5, d / 2 + 1.25));
        group.add(box(0.08, 0.7, 1.4, railMat, bx - 1.56, y + 0.5, d / 2 + 0.7));
        group.add(box(0.08, 0.7, 1.4, railMat, bx + 1.56, y + 0.5, d / 2 + 0.7));
      }
    }
  }

  group.position.set(x, 0, z);
  return group;
}

export function makePalm(scale, rng, detail = 'full') {
  const group = new THREE.Group();
  const h = (7 + rng() * 3) * scale;
  if (detail !== 'full') {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0xa8845e, roughness: 0.95 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, h, 8), trunkMat);
    trunk.position.y = h / 2;
    group.add(trunk);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x4a9a3a, roughness: 0.9 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 8), topMat);
    cone.position.y = h + 1;
    group.add(cone);
    return { group, height: h };
  }

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xa8845e, roughness: 0.95 });
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.42, h, 10, 8);
  const pos = trunkGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const k = (y + h / 2) / h;
    pos.setX(i, pos.getX(i) + Math.sin(k * 1.1) * 1.0);
  }
  trunkGeo.computeVertexNormals();
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  group.add(trunk);

  const ringMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.9 });
  for (let ring = 0; ring < 5; ring++) {
    const k = 0.2 + ring * 0.18;
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(0.36 - ring * 0.03, 0.05, 6, 16), ringMat,
    );
    torus.rotation.x = Math.PI / 2;
    torus.position.set(Math.sin(k * 1.1) * 1.0, h * k, 0);
    group.add(torus);
  }

  const crownX = Math.sin(1.1) * 1.0;
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x4a9a3a, emissive: 0x1a2a10, emissiveIntensity: 0.55,
    roughness: 0.9, side: THREE.DoubleSide,
  });
  const frondCount = 10 + Math.floor(rng() * 4);
  for (let i = 0; i < frondCount; i++) {
    const len = 3.4 + rng() * 1.4;
    const geo = new THREE.PlaneGeometry(1.0, len, 1, 8);
    const p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const y = p.getY(v);
      const k = (y + len / 2) / len;
      p.setZ(v, p.getZ(v) - k * k * 2.0);
      p.setX(v, p.getX(v) * (1 - k * 0.45));
    }
    geo.computeVertexNormals();
    const frond = new THREE.Mesh(geo, frondMat);
    frond.castShadow = true;
    const holder = new THREE.Group();
    holder.position.set(crownX, h, 0);
    holder.rotation.y = (i / frondCount) * Math.PI * 2;
    frond.rotation.x = -1.15;
    frond.position.y = len / 2;
    holder.add(frond);
    group.add(holder);
  }

  const nutMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), nutMat);
    nut.position.set(crownX + (i - 1) * 0.35, h - 0.35, (i % 2 === 0 ? 0.25 : -0.25));
    group.add(nut);
  }

  return { group, height: h };
}

function radialSpriteTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function extrudeProfile(points, width, bevel) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 1, steps: 1,
  });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2);
  return geo;
}

function makeBoat(i, rng) {
  const group = new THREE.Group();
  const hullCols = [0xf2f2f2, 0x3a7ca5, 0xe8b83a, 0xc96f4a];
  const hullMat = new THREE.MeshStandardMaterial({
    color: hullCols[i % hullCols.length], roughness: 0.45, metalness: 0.1,
  });
  const hullGeo = extrudeProfile(
    [[4.5, 0.5], [4.2, 1.1], [2.0, 1.2], [-4.2, 1.2], [-4.5, 0.9], [-4.5, 0.2], [2.0, 0.0], [4.5, 0.5]],
    3.6, 0.15,
  );
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.castShadow = true;
  group.add(hull);
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 });
  group.add(box(3.4, 0.15, 7.6, deckMat, 0, 1.28, -0.4));
  group.add(box(2.4, 1.3, 2.8, deckMat, 0, 2.0, -1.2));
  const cabinGlass = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.6, 2.0),
    new THREE.MeshPhysicalMaterial({
      color: 0x0e1a24, roughness: 0.05, metalness: 0.1,
      clearcoat: 1, envMapIntensity: 1.1, transparent: true, opacity: 0.96,
    }),
  );
  cabinGlass.position.set(0, 2.2, -1.0);
  group.add(cabinGlass);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.5, metalness: 0.6 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8), mastMat);
  mast.position.set(0, 3.2, -1.2);
  group.add(mast);
  const wakeMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false,
  });
  const wakeGeo = new THREE.PlaneGeometry(0.7, 12);
  const w1 = new THREE.Mesh(wakeGeo, wakeMat);
  w1.rotation.x = -Math.PI / 2;
  w1.rotation.z = 0.35;
  w1.position.set(-1.2, 0.12, -8);
  group.add(w1);
  const w2 = new THREE.Mesh(wakeGeo, wakeMat);
  w2.rotation.x = -Math.PI / 2;
  w2.rotation.z = -0.35;
  w2.position.set(1.2, 0.12, -8);
  group.add(w2);
  const centreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.65, depthWrite: false,
  });
  const centre = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 12), centreMat);
  centre.rotation.x = -Math.PI / 2;
  centre.position.set(0, 0.12, -8);
  group.add(centre);

  group.position.set(242 + (i % 3) * 14, 0.2, 168 + Math.floor(i / 3) * 55);
  group.rotation.y = (rng() - 0.5) * 0.4;
  return group;
}

export function buildCity(rng) {
  const group = new THREE.Group();
  const colliders = [];
  const buildingSpots = [];
  const boats = [];
  const glowTex = radialSpriteTexture();

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshStandardMaterial({ color: PAINT.grass, roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  group.add(grass);

  const roadMat = new THREE.MeshStandardMaterial({ color: PAINT.asphalt, roughness: 0.95 });
  const dashMat = new THREE.MeshStandardMaterial({ color: PAINT.lane, roughness: 0.9 });
  const dashGeoH = new THREE.PlaneGeometry(3, 0.5);
  const dashGeoV = new THREE.PlaneGeometry(0.5, 3);
  for (let i = -4; i <= 4; i++) {
    const c = i * 60;
    const rh = new THREE.Mesh(new THREE.PlaneGeometry(440, 16), roadMat);
    rh.rotation.x = -Math.PI / 2;
    rh.position.set(0, 0.02, c);
    rh.receiveShadow = true;
    group.add(rh);
    const rv = new THREE.Mesh(new THREE.PlaneGeometry(16, 440), roadMat);
    rv.rotation.x = -Math.PI / 2;
    rv.position.set(c, 0.02, 0);
    rv.receiveShadow = true;
    group.add(rv);
    for (let d = -200; d <= 200; d += 12) {
      const dh = new THREE.Mesh(dashGeoH, dashMat);
      dh.rotation.x = -Math.PI / 2;
      dh.position.set(d, 0.03, c);
      group.add(dh);
      const dv = new THREE.Mesh(dashGeoV, dashMat);
      dv.rotation.x = -Math.PI / 2;
      dv.position.set(c, 0.03, d);
      group.add(dv);
    }
  }

  const walkMat = new THREE.MeshStandardMaterial({ color: PAINT.sidewalk, roughness: 0.95 });
  const walkGeoA = new THREE.PlaneGeometry(4, 440);
  const walkGeoB = new THREE.PlaneGeometry(440, 4);
  const w1 = new THREE.Mesh(walkGeoA, walkMat);
  w1.rotation.x = -Math.PI / 2;
  w1.position.set(170, 0.025, 0);
  group.add(w1);
  const w2 = new THREE.Mesh(walkGeoB, walkMat);
  w2.rotation.x = -Math.PI / 2;
  w2.position.set(0, 0.025, -10);
  group.add(w2);
  const w3 = new THREE.Mesh(walkGeoB, walkMat);
  w3.rotation.x = -Math.PI / 2;
  w3.position.set(0, 0.025, 10);
  group.add(w3);

  const sandMat = new THREE.MeshStandardMaterial({ color: PAINT.sand, roughness: 1 });
  const sandE = new THREE.Mesh(new THREE.PlaneGeometry(44, 460, 4, 32), sandMat);
  sandE.rotation.x = -Math.PI / 2;
  sandE.position.set(210, 0.05, 0);
  sandE.receiveShadow = true;
  group.add(sandE);
  const sandS = new THREE.Mesh(new THREE.PlaneGeometry(460, 44, 32, 4), sandMat);
  sandS.rotation.x = -Math.PI / 2;
  sandS.position.set(0, 0.05, 210);
  sandS.receiveShadow = true;
  group.add(sandS);
  const seaMat = new THREE.MeshStandardMaterial({ color: PAINT.sea, roughness: 0.6 });
  const seaE = new THREE.Mesh(new THREE.PlaneGeometry(1568, 2000, 1, 1), seaMat);
  seaE.rotation.x = -Math.PI / 2;
  seaE.position.set(1016, 0.12, 0);
  group.add(seaE);
  const seaS = new THREE.Mesh(new THREE.PlaneGeometry(2000, 1200, 1, 1), seaMat);
  seaS.rotation.x = -Math.PI / 2;
  seaS.position.set(0, 0.12, 900);
  group.add(seaS);

  let bi = 0;
  for (let bx = -4; bx <= 4; bx++) {
    for (let bz = -4; bz <= 4; bz++) {
      if (bx >= 3) continue;
      if (bx === 0 && bz === 0) continue;
      const cx = bx * 60 + 30;
      const cz = bz * 60 + 30;
      const w = 18 + rng() * 14;
      const d = 18 + rng() * 14;
      const h = 10 + rng() * 26 + (Math.abs(bx) + Math.abs(bz) < 3 ? 10 : 0);
      const palette = PALETTES[bi % PALETTES.length];
      bi += 1;
      const b = makeBuilding(cx, cz, w, d, h, palette, rng, 'full', true);
      group.add(b);
      colliders.push({ x: cx, z: cz, w: w + 2, d: d + 2 });
      buildingSpots.push({ x: cx, z: cz, w, d, h, color: palette.base });
    }
  }

  const palmSpots = [];
  for (let z = -190; z <= 190; z += 18) {
    const scale = 0.85 + (Math.abs(z) % 3) * 0.2;
    const p = makePalm(scale, rng, 'full');
    p.group.position.set(168, 0, z);
    group.add(p.group);
    palmSpots.push({ x: 168, z });
  }
  for (let z = -181; z <= 190; z += 36) {
    const scale = (0.85 + (Math.abs(z - 9) % 3) * 0.2) * 1.15;
    const p = makePalm(scale, rng, 'full');
    p.group.position.set(150, 0, z);
    group.add(p.group);
    palmSpots.push({ x: 150, z });
  }

  // Beach planting: low flat shrubs with a flower bed, kept small and
  // squashed (never a big green dome) and kept out of the boulevard and
  // market sightlines, so no planter ever photobombs a camera line.
  const flowerCols = [0xe85a8a, 0xf2c94c, 0xe85a3a, 0x9a5ae8];
  for (let z = -180; z <= 180; z += 24) {
    if (z >= -30 && z <= 70) continue;
    if (z >= 100 && z <= 170) continue;
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.9 });
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.38 + rng() * 0.12, 12, 10), bushMat);
    bush.scale.y = 0.3;
    bush.position.set(203, 0.25, z);
    bush.castShadow = true;
    group.add(bush);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.9 });
    group.add(box(4.2, 0.4, 1.3, bedMat, 203, 0.2, z + 6));
    for (let f = 0; f < 6; f++) {
      const flMat = new THREE.MeshStandardMaterial({
        color: flowerCols[f % flowerCols.length], roughness: 0.7,
      });
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), flMat);
      fl.scale.y = 0.45;
      fl.position.set(203 + (f - 2.5) * 0.7, 0.5, z + 6);
      group.add(fl);
    }
  }

  const deckCanvas = document.createElement('canvas');
  deckCanvas.width = 128;
  deckCanvas.height = 512;
  {
    const g = deckCanvas.getContext('2d');
    g.fillStyle = '#a08055';
    g.fillRect(0, 0, 128, 512);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    for (let y = 0; y < 512; y += 12) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    for (let y = 0; y < 512; y += 16) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke();
    }
  }
  const deckTex = new THREE.CanvasTexture(deckCanvas);
  deckTex.colorSpace = THREE.SRGBColorSpace;
  const deckMat = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.9 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 90), deckMat);
  deck.position.set(185, 0.8, 195);
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });
  for (let i = 0; i < 8; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.4, 8), postMat);
    post.position.set(i % 2 === 0 ? 181 : 189, 0.4, 160 + i * 10);
    group.add(post);
  }
  const railMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.9 });
  for (const rx of [180.4, 189.6]) {
    for (const ry of [1.5, 2.1]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 88, 8), railMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(rx, ry, 195);
      group.add(bar);
    }
  }
  for (let z = 155; z <= 235; z += 10) {
    for (const rx of [180.4, 189.6]) {
      const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 8), railMat);
      rp.position.set(rx, 1.8, z);
      group.add(rp);
    }
  }

  const pierPoleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.4 });
  // Lamp globes are small and bright (emissive 1.2) with a tight halo, so
  // they read as lamps at golden hour instead of blown-out white balls.
  const globeMat = new THREE.MeshStandardMaterial({
    color: 0xfff2c8, emissive: 0xffd98a, emissiveIntensity: 1.2, roughness: 0.4,
  });
  for (let z = 160; z <= 232; z += 12) {
    for (const lx of [181.2, 188.8]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.4, 8), pierPoleMat);
      pole.position.set(lx, 2.5, z);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), globeMat);
      head.position.set(lx, 4.3, z);
      group.add(head);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffd98a, opacity: 0.12, transparent: true, depthWrite: false,
      }));
      halo.position.set(lx, 4.3, z);
      halo.scale.set(0.8, 0.8, 1);
      group.add(halo);
    }
  }

  for (let i = 0; i < 6; i++) {
    const boat = makeBoat(i, rng);
    group.add(boat);
    boats.push(boat);
  }
  const glitterMat = new THREE.MeshBasicMaterial({
    color: 0xffd98a, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  for (let i = 0; i < 26; i++) {
    const gw = 1.2 + rng() * 2.2;
    const gh = 0.5 + rng() * 0.6;
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), glitterMat);
    gl.rotation.x = -Math.PI / 2;
    gl.rotation.z = rng() * Math.PI;
    gl.position.set(238 + rng() * 40, 0.12, 150 + rng() * 85);
    gl.visible = false;
    group.add(gl);
  }

  const whiteMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false,
  });
  for (const cx of [-120, -60, 60, 120]) {
    for (let s = 0; s < 7; s++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.1), whiteMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(cx, 0.04, (s - 3) * 1.9);
      group.add(stripe);
    }
  }
  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false,
  });
  for (const ex of [172.5, 187.5]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 440), edgeMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(ex, 0.04, 0);
    group.add(line);
  }
  for (const ez of [-7.5, 7.5]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(440, 0.25), edgeMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.04, ez);
    group.add(line);
  }
  for (let d = -200; d <= 200; d += 12) {
    const y1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), dashMat);
    y1.rotation.x = -Math.PI / 2;
    y1.position.set(180.8, 0.03, d);
    group.add(y1);
    const y2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), dashMat);
    y2.rotation.x = -Math.PI / 2;
    y2.position.set(d, 0.03, 0.8);
    group.add(y2);
  }
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9 });
  for (let i = 0; i < 14; i++) {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), holeMat);
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(-200 + rng() * 400, 0.03, -200 + rng() * 400);
    group.add(hole);
  }

  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.4 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.9 });
  const binMat = new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.9 });
  const hydMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.6 });
  function streetLamp(x, z, armDx, armDz) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.4, 8), lampPoleMat);
    pole.position.set(x, 2.7, z);
    pole.castShadow = true;
    group.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), lampPoleMat);
    arm.position.set(x + armDx * 0.7, 5.35, z + armDz * 0.7);
    if (armDz !== 0) arm.rotation.y = Math.PI / 2;
    group.add(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), globeMat);
    head.position.set(x + armDx * 1.4, 5.35, z + armDz * 1.4);
    group.add(head);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffd98a, opacity: 0.12, transparent: true, depthWrite: false,
    }));
    halo.position.set(x + armDx * 1.4, 5.35, z + armDz * 1.4);
    halo.scale.set(0.7, 0.7, 1);
    group.add(halo);
  }
  for (let z = -168; z <= 190; z += 28) {
    streetLamp(172, z, 1, 0);
    streetLamp(188, z + 14, -1, 0);
    group.add(box(1.8, 0.14, 0.6, benchMat, 170.5, 0.5, z + 7));
    group.add(box(1.8, 0.5, 0.1, benchMat, 170.5, 0.85, z + 7.3));
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.9, 10), binMat);
    bin.position.set(170.5, 0.45, z + 11);
    group.add(bin);
    for (const bz of [2, 5.5, 9]) {
      const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8), lampPoleMat);
      bol.position.set(169.5, 0.45, z + bz);
      group.add(bol);
    }
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 10), hydMat);
    hyd.position.set(189.5, 0.35, z + 5);
    group.add(hyd);
  }
  for (let x = -168; x <= 190; x += 56) {
    streetLamp(x, -8, 0, 1);
    streetLamp(x, 8, 0, -1);
  }

  const fountMat = new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.7 });
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7, 1.2, 24), fountMat);
  fountain.position.set(30, 0.6, 30);
  fountain.castShadow = true;
  group.add(fountain);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3a9ab5, roughness: 0.15, metalness: 0.3,
  });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.4, 24), waterMat);
  water.position.set(30, 1.1, 30);
  group.add(water);

  return { group, colliders, buildingSpots, palmSpots, boats };
}
