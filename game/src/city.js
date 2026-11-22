// The city of Vice Shores: a sun-soaked coastal grid with a beachfront boulevard,
// the ocean, a pier, parks, a market, and the Dockside Customs workshop. Buildings
// wear canvas-painted facades with lit windows so they read as real places, and the
// ground is one big painted map (asphalt, lane lines, crosswalks, sidewalks, sand).
import { WORLD } from './config.js';

const FACADES = [
  { base: '#e8a56b', trim: '#c97f45', lit: 0.55 },
  { base: '#e9c46a', trim: '#c9a24a', lit: 0.5 },
  { base: '#f4d35e', trim: '#d9b23a', lit: 0.45 },
  { base: '#f2e6c9', trim: '#d8c49a', lit: 0.6 },
  { base: '#7fb3d5', trim: '#5a8fb0', lit: 0.5 },
  { base: '#e07a5f', trim: '#b85c44', lit: 0.55 },
  { base: '#81b29a', trim: '#5f8f7a', lit: 0.5 },
  { base: '#f4a261', trim: '#cf7f3e', lit: 0.55 },
];

// Paint one building face: a warm wall, a grid of windows, some lit gold.
function facadeTexture(rng, spec, floors, cols) {
  const w = 128;
  const h = 256;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  g.fillStyle = spec.base;
  g.fillRect(0, 0, w, h);
  // Subtle vertical shading so the face is not flat.
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.18)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.10)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // Ground floor: shopfronts.
  g.fillStyle = spec.trim;
  g.fillRect(0, h - 34, w, 34);
  g.fillStyle = 'rgba(20,20,30,0.85)';
  for (let c = 0; c < cols; c += 1) {
    g.fillRect(8 + c * ((w - 16) / cols) + 2, h - 30, (w - 16) / cols - 4, 22);
  }
  // Window grid.
  const cellW = (w - 16) / cols;
  const cellH = (h - 48) / floors;
  for (let f = 0; f < floors; f += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = 8 + c * cellW + 3;
      const y = 8 + f * cellH + 3;
      const lit = rng.next() < spec.lit;
      g.fillStyle = lit ? '#ffd98a' : '#2c3550';
      g.fillRect(x, y, cellW - 6, cellH - 6);
      if (lit) {
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(x, y, cellW - 6, 3);
      } else {
        g.fillStyle = 'rgba(140,180,230,0.25)';
        g.fillRect(x, y, cellW - 6, 4);
      }
    }
  }
  const tex = new window.THREE.CanvasTexture(cv);
  tex.colorSpace = window.THREE.SRGBColorSpace;
  return tex;
}

// Neon sign texture: glowing words on a dark plate.
function neonTexture(text, color) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#101018';
  g.fillRect(0, 0, 256, 64);
  g.font = '900 34px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 18;
  g.fillStyle = color;
  g.fillText(text, 128, 34);
  g.shadowBlur = 0;
  g.fillStyle = '#ffffff';
  g.fillText(text, 128, 34);
  const tex = new window.THREE.CanvasTexture(cv);
  tex.colorSpace = window.THREE.SRGBColorSpace;
  return tex;
}

// The whole ground as one painted map: grass blocks, sidewalks, asphalt roads with
// dashed centre lines, crosswalks at every crossing, and the sand beach.
function groundTexture() {
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d');
  const X = (x) => ((x - WORLD.minX) / (WORLD.maxX - WORLD.minX)) * S;
  const Z = (z) => ((z - WORLD.minZ) / (WORLD.maxZ - WORLD.minZ)) * S;
  // Grass base.
  g.fillStyle = '#69a854';
  g.fillRect(0, 0, S, S);
  // Sand beach on the west edge.
  g.fillStyle = '#e8cf9a';
  g.fillRect(0, 0, X(WORLD.beachX + 4), S);
  g.fillStyle = '#f2ddab';
  g.fillRect(0, 0, X(WORLD.beachX + 1), S);
  // Sidewalk blocks: light grey pads between the roads.
  g.fillStyle = '#a8a094';
  for (let i = 0; i < WORLD.roadXs.length - 1; i += 1) {
    for (let j = 0; j < WORLD.roadZs.length - 1; j += 1) {
      g.fillRect(X(WORLD.roadXs[i] + WORLD.roadHalf), Z(WORLD.roadZs[j] + WORLD.roadHalf),
        X(WORLD.roadXs[i + 1] - WORLD.roadHalf) - X(WORLD.roadXs[i] + WORLD.roadHalf),
        Z(WORLD.roadZs[j + 1] - WORLD.roadHalf) - Z(WORLD.roadZs[j] + WORLD.roadHalf));
    }
  }
  // Boulevard sidewalk band.
  g.fillRect(X(-63), Z(WORLD.minZ), X(-41) - X(-63), S);
  // Asphalt roads.
  g.fillStyle = '#3a3f47';
  for (const x of WORLD.roadXs) g.fillRect(X(x - WORLD.roadHalf), 0, X(x + WORLD.roadHalf) - X(x - WORLD.roadHalf), S);
  for (const z of WORLD.roadZs) g.fillRect(0, Z(z - WORLD.roadHalf), S, Z(z + WORLD.roadHalf) - Z(z - WORLD.roadHalf));
  // The boulevard: wider, warm asphalt with a palm median.
  g.fillStyle = '#43484f';
  g.fillRect(X(-63), 0, X(-41) - X(-63), S);
  g.fillStyle = '#5d7a4a';
  g.fillRect(X(-54), 0, X(-50) - X(-54), S);
  // Dashed centre lines on the grid roads.
  g.fillStyle = '#f2c94c';
  for (const x of WORLD.roadXs) {
    for (let z = WORLD.minZ; z < WORLD.maxZ; z += 8) {
      g.fillRect(X(x) - 1.5, Z(z), 3, Z(z + 4) - Z(z));
    }
  }
  for (const z of WORLD.roadZs) {
    for (let x = WORLD.minX; x < WORLD.maxX; x += 8) {
      g.fillRect(X(x), Z(z) - 1.5, X(x + 4) - X(x), 3);
    }
  }
  // Crosswalks: white stripes at every grid crossing.
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const x of WORLD.roadXs) {
    for (const z of WORLD.roadZs) {
      for (let k = -2; k <= 2; k += 1) {
        g.fillRect(X(x - 4 + k * 1.6), Z(z - WORLD.roadHalf), 2.5, Z(z + WORLD.roadHalf) - Z(z - WORLD.roadHalf));
      }
    }
  }
  // The pier deck line.
  g.fillStyle = '#8a6a4a';
  g.fillRect(X(-72), Z(-64), X(-66) - X(-72), Z(-56) - Z(-64));
  const tex = new window.THREE.CanvasTexture(cv);
  tex.colorSpace = window.THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Checkered polished workshop floor.
function checkerTexture() {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d');
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      g.fillStyle = (x + y) % 2 === 0 ? '#c8c4bc' : '#3c3f45';
      g.fillRect(x * 32, y * 32, 32, 32);
    }
  }
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.fillRect(0, 0, S, S);
  const tex = new window.THREE.CanvasTexture(cv);
  tex.colorSpace = window.THREE.SRGBColorSpace;
  tex.wrapS = window.THREE.RepeatWrapping;
  tex.wrapT = window.THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function box(THREE, w, h, d, color, x, y, z, opts) {
  const mat = new window.THREE.MeshLambertMaterial({ color, ...(opts || {}) });
  const mesh = new window.THREE.Mesh(new window.THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

export function createCity(THREE, rng) {
  const group = new THREE.Group();
  const colliders = [];
  const palms = [];

  // Ground.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.maxX - WORLD.minX, WORLD.maxZ - WORLD.minZ),
    new THREE.MeshLambertMaterial({ map: groundTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((WORLD.minX + WORLD.maxX) / 2, 0, (WORLD.minZ + WORLD.maxZ) / 2);
  ground.receiveShadow = false;
  group.add(ground);

  // Ocean: a wide blue plane west of the beach, with a lighter shore band.
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(60, WORLD.maxZ - WORLD.minZ + 40),
    new THREE.MeshLambertMaterial({ color: 0x1f8fb8, emissive: 0x0a4a66 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(WORLD.oceanX - 28, -0.4, (WORLD.minZ + WORLD.maxZ) / 2);
  group.add(ocean);
  const shore = new THREE.Mesh(
    new THREE.PlaneGeometry(6, WORLD.maxZ - WORLD.minZ + 40),
    new THREE.MeshLambertMaterial({ color: 0x7fd4e8, emissive: 0x2a7a96 }),
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(WORLD.oceanX + 2, -0.25, (WORLD.minZ + WORLD.maxZ) / 2);
  group.add(shore);

  // Buildings, block by block. Each block holds one or two towers with painted faces.
  const facadeTexs = FACADES.map((spec) => facadeTexture(rng, spec, 8, 4));
  for (let i = 0; i < WORLD.roadXs.length - 1; i += 1) {
    for (let j = 0; j < WORLD.roadZs.length - 1; j += 1) {
      const x0 = WORLD.roadXs[i] + WORLD.roadHalf + 2;
      const x1 = WORLD.roadXs[i + 1] - WORLD.roadHalf - 2;
      const z0 = WORLD.roadZs[j] + WORLD.roadHalf + 2;
      const z1 = WORLD.roadZs[j + 1] - WORLD.roadHalf - 2;
      // Keep the boulevard frontage open and leave the workshop plot clear.
      if (i === 0 && j === 5) continue; // workshop plot
      if (i === 0 && j === 2) continue; // market square
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const w = Math.min(x1 - x0, 20);
      const d = Math.min(z1 - z0, 20);
      const h = rng.range(9, 30);
      const spec = FACADES[rng.int(0, FACADES.length)];
      const tex = facadeTexs[FACADES.indexOf(spec)];
      const side = new THREE.MeshLambertMaterial({ map: tex });
      const roof = new THREE.MeshLambertMaterial({ color: 0x8a7f74 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roof, roof, side, side]);
      b.position.set(cx, h / 2, cz);
      group.add(b);
      colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
      // A few blocks get a second, shorter tower beside the first.
      if (rng.chance(0.45) && w > 14) {
        const h2 = rng.range(6, 14);
        const w2 = w * 0.5;
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d * 0.6), [side, side, roof, roof, side, side]);
        b2.position.set(cx + w * 0.35, h2 / 2, cz - d * 0.2);
        group.add(b2);
        colliders.push({ minX: cx + w * 0.35 - w2 / 2, maxX: cx + w * 0.35 + w2 / 2, minZ: cz - d * 0.2 - d * 0.3, maxZ: cz - d * 0.2 + d * 0.3 });
      }
      // Neon signs on some towers.
      if (rng.chance(0.4)) {
        const words = ['HOTEL', 'CAFE', 'NEON', 'SURF', 'PIER', 'BAR', '24H'];
        const word = rng.pick(words);
        const color = rng.pick(['#ff5ea8', '#39d0ff', '#ffe14d', '#ff7a3c']);
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(7, 1.8, 0.3),
          new THREE.MeshBasicMaterial({ map: neonTexture(word, color) }),
        );
        sign.position.set(cx, Math.min(h - 2, 12), cz + d / 2 + 0.2);
        group.add(sign);
      }
    }
  }

  // Palms along the boulevard median and the beach.
  function makePalm(x, z, s) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * s, 0.28 * s, 5.2 * s, 6),
      new THREE.MeshLambertMaterial({ color: 0x8a6a4a }),
    );
    trunk.position.y = 2.6 * s;
    trunk.rotation.z = rng.range(-0.08, 0.08);
    palm.add(trunk);
    for (let k = 0; k < 7; k += 1) {
      const frond = new THREE.Mesh(
        new THREE.BoxGeometry(0.5 * s, 0.08 * s, 3.2 * s),
        new THREE.MeshLambertMaterial({ color: k % 2 ? 0x2f8f3e : 0x3aa84a }),
      );
      const a = (k / 7) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 1.2 * s, 5.2 * s, Math.sin(a) * 1.2 * s);
      frond.rotation.y = -a;
      frond.rotation.x = 0.55;
      palm.add(frond);
    }
    const nut = new THREE.Mesh(
      new THREE.SphereGeometry(0.22 * s, 6, 5),
      new THREE.MeshLambertMaterial({ color: 0x6a4a2a }),
    );
    nut.position.y = 5.0 * s;
    palm.add(nut);
    palm.position.set(x, 0, z);
    return palm;
  }
  for (let z = -84; z <= 120; z += 14) {
    // No palms inside the workshop plot (z 82..110): they would poke through its roof.
    if (z > 82 && z < 110) continue;
    const p1 = makePalm(-56.5, z + rng.range(-2, 2), rng.range(0.9, 1.2));
    const p2 = makePalm(-49.5, z + 7 + rng.range(-2, 2), rng.range(0.9, 1.2));
    group.add(p1);
    group.add(p2);
    palms.push(p1, p2);
  }
  for (let z = -80; z <= 116; z += 18) {
    group.add(makePalm(-70 + rng.range(-2, 2), z, rng.range(1.0, 1.3)));
  }

  // The pier: wooden planks out over the ocean at the north end, with a hut and a boat.
  const pier = new THREE.Group();
  for (let k = 0; k < 10; k += 1) {
    const plank = box(THREE, 6, 0.3, 2.4, 0x9a7448, -72 - k * 2.2, 0.6, -60, {});
    pier.add(plank);
  }
  for (let k = 0; k < 5; k += 1) {
    const post = box(THREE, 0.4, 2.4, 0.4, 0x6a4a2a, -74 - k * 4.4, -0.4, -62.2, {});
    pier.add(post);
    const post2 = box(THREE, 0.4, 2.4, 0.4, 0x6a4a2a, -74 - k * 4.4, -0.4, -57.8, {});
    pier.add(post2);
  }
  const hut = box(THREE, 4, 3, 3.4, 0xe8a56b, -92, 2.1, -60, {});
  pier.add(hut);
  const hutRoof = new THREE.Mesh(
    new THREE.ConeGeometry(3.4, 1.6, 4),
    new THREE.MeshLambertMaterial({ color: 0xc94f3d }),
  );
  hutRoof.position.set(-92, 4.4, -60);
  hutRoof.rotation.y = Math.PI / 4;
  pier.add(hutRoof);
  // A little fishing boat beside the pier.
  const hull = box(THREE, 6, 1.2, 2.2, 0xf2e6c9, -88, -0.2, -48, {});
  pier.add(hull);
  const cabin = box(THREE, 2.4, 1.4, 1.8, 0x2e6fb0, -89, 1.0, -48, {});
  pier.add(cabin);
  group.add(pier);

  // Market square on the boulevard: striped stalls with colourful goods.
  const market = new THREE.Group();
  const stallColors = ['#ff5ea8', '#39d0ff', '#ffe14d', '#ff7a3c', '#7ee081'];
  for (let k = 0; k < 5; k += 1) {
    const sx = -46 + (k % 3) * 6;
    const sz = -6 + Math.floor(k / 3) * 8;
    const stall = new THREE.Group();
    stall.add(box(THREE, 3.4, 0.9, 2.2, 0x8a6a4a, 0, 0.9, 0, {}));
    const awn = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.15, 2.6),
      new THREE.MeshLambertMaterial({ color: stallColors[k] }),
    );
    awn.position.y = 2.4;
    awn.rotation.z = 0.08;
    stall.add(awn);
    for (let p = 0; p < 4; p += 1) {
      stall.add(box(THREE, 0.12, 1.6, 0.12, 0x5a4632, p % 2 ? 1.6 : -1.6, 1.6, p < 2 ? 1.1 : -1.1, {}));
    }
    for (let g2 = 0; g2 < 5; g2 += 1) {
      stall.add(box(THREE, 0.5, 0.4, 0.5, stallColors[(k + g2) % stallColors.length], -1.2 + g2 * 0.6, 1.55, 0, {}));
    }
    stall.position.set(sx, 0, sz);
    market.add(stall);
  }
  group.add(market);

  // Park trees on the grass blocks.
  function makeTree(x, z, s) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 2.4 * s, 6),
      new THREE.MeshLambertMaterial({ color: 0x6a4a2a }),
    );
    trunk.position.y = 1.2 * s;
    tree.add(trunk);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
    const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x57b368 });
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.7 * s, 8, 6), leafMat);
    c1.position.y = 3.4 * s;
    tree.add(c1);
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.2 * s, 8, 6), leafMat2);
    c2.position.set(0.9 * s, 2.8 * s, 0.4 * s);
    tree.add(c2);
    tree.position.set(x, 0, z);
    return tree;
  }
  const parkSpots = [[18, -54], [54, 18], [90, 54], [18, 90], [90, -54], [54, 90]];
  for (const [px, pz] of parkSpots) {
    for (let k = 0; k < 4; k += 1) {
      group.add(makeTree(px + rng.range(-8, 8), pz + rng.range(-8, 8), rng.range(0.8, 1.3)));
    }
  }

  // Dockside Customs: the repair workshop at the south end of the boulevard. An
  // open-fronted room with a checkered polished floor, workbench, paint cans,
  // stacked tyres, a neon CUSTOMS sign, warm lights and the car lift.
  const garage = new THREE.Group();
  const gx = WORLD.garage.x;
  const gz = WORLD.garage.z;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 20),
    new THREE.MeshLambertMaterial({ map: checkerTexture() }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(gx, 0.06, gz);
  garage.add(floor);
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xb8b0a2 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(26, 7, 0.6), wallMat);
  backWall.position.set(gx, 3.5, gz + 10);
  garage.add(backWall);
  const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 20), wallMat);
  sideWallL.position.set(gx - 13, 3.5, gz);
  garage.add(sideWallL);
  const sideWallR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 20), wallMat);
  sideWallR.position.set(gx + 13, 3.5, gz);
  garage.add(sideWallR);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, 20), new THREE.MeshLambertMaterial({ color: 0x5a4a3a }));
  roof.position.set(gx, 7.2, gz);
  garage.add(roof);
  // Neon CUSTOMS sign on the back wall.
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(9, 2.2, 0.3),
    new THREE.MeshBasicMaterial({ map: neonTexture('CUSTOMS', '#ff5ea8') }),
  );
  sign.position.set(gx, 5.4, gz + 9.6);
  garage.add(sign);
  // The lift: dark platform on two red posts.
  const lift = new THREE.Mesh(
    new THREE.BoxGeometry(6.5, 0.5, 3.4),
    new THREE.MeshLambertMaterial({ color: 0x2c2f36 }),
  );
  lift.position.set(gx, 0.55, gz);
  garage.add(lift);
  for (const px of [-2.6, 2.6]) {
    garage.add(box(THREE, 0.7, 1.6, 0.7, 0xc0392b, gx + px, 0.8, gz - 1.4, {}));
    garage.add(box(THREE, 0.7, 1.6, 0.7, 0xc0392b, gx + px, 0.8, gz + 1.4, {}));
  }
  // Workbench along the back wall, with tools on top.
  garage.add(box(THREE, 7, 1.0, 1.6, 0x7a5a34, gx - 7, 0.9, gz + 8.6, {}));
  garage.add(box(THREE, 7, 0.12, 1.7, 0x4a3a24, gx - 7, 1.45, gz + 8.6, {}));
  for (let k = 0; k < 6; k += 1) {
    garage.add(box(THREE, 0.35, 0.25, 0.5, [0xd8d8d8, 0x2e6fb0, 0xff5ea8, 0xffe14d, 0x39d0ff, 0xff7a3c][k], gx - 9.5 + k * 1.0, 1.65, gz + 8.6, {}));
  }
  // Paint cans: bright little cylinders on the floor and the bench.
  const canColors = [0xff5e3c, 0xffe14d, 0x39d0ff, 0x7ee081, 0xff5ea8, 0xff9a3c];
  for (let k = 0; k < 6; k += 1) {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.5, 10),
      new THREE.MeshLambertMaterial({ color: canColors[k] }),
    );
    can.position.set(gx + 8.5 + (k % 3) * 0.7, 0.32, gz + 7.5 + Math.floor(k / 3) * 0.8);
    garage.add(can);
  }
  // Stacked tyres.
  for (let k = 0; k < 3; k += 1) {
    const tyre = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.22, 8, 14),
      new THREE.MeshLambertMaterial({ color: 0x1c1e22 }),
    );
    tyre.rotation.x = Math.PI / 2;
    tyre.position.set(gx + 10.5, 0.25 + k * 0.45, gz - 6);
    garage.add(tyre);
  }
  // A spare wheel and a toolbox near the lift.
  const spare = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.2, 8, 14),
    new THREE.MeshLambertMaterial({ color: 0x1c1e22 }),
  );
  spare.rotation.x = Math.PI / 2;
  spare.position.set(gx - 6.5, 0.22, gz - 5);
  garage.add(spare);
  garage.add(box(THREE, 1.4, 0.7, 0.7, 0xc0392b, gx + 9.5, 0.42, gz + 2, {}));
  // Warm workshop lights.
  const warm1 = new THREE.PointLight(0xffc46b, 0.9, 30);
  warm1.position.set(gx - 5, 6, gz);
  garage.add(warm1);
  const warm2 = new THREE.PointLight(0xffd98a, 0.7, 30);
  warm2.position.set(gx + 6, 6, gz + 4);
  garage.add(warm2);
  group.add(garage);

  return { group, colliders, palms, garagePos: { x: gx, z: gz } };
}
