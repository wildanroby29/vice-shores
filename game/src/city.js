// Vice Shores — the city itself. A sun-soaked coastal grid: varied
// buildings with lit windows, neon signs and balconies; a wide beachfront
// boulevard with NORMAL-SIZED palms (a border, never the subject); beach,
// pier, marina, parks and market stalls; and the Dockside Customs workshop.
//
// FIX 1 (round 6): palms are small — trunk ~3.2 high, crown ~1.6 wide —
// clearly shorter than the buildings and only a little taller than a car.
// They line the beach side and are spaced well apart, never a wall of green.
// FIX 3 (round 6): no single flat wall behind the title. Buildings vary in
// height, colour and depth, with neon signs and balconies, so the skyline
// reads as a varied city, not one slab.
// three.js is loaded by the page as a classic script (game/vendor/three.min.js),
// so the modules read it from the window global instead of importing the UMD
// build (an ES-module import of a UMD file yields an empty namespace).
const THREE = window.THREE;
import { range, rangeInt, pick, chance, mulberry32 } from './random.js';
import { CITY } from './config.js';

const PALETTE = [
  0xf2d8a7, 0xe8b48a, 0xd98a6c, 0x7fb5a3, 0xf5e9d0, 0xc97b5a,
  0x9db8a4, 0xe5c07a, 0xb98a68, 0x8fb8c9, 0xe0a080, 0xf0d060,
];
const NEON_WORDS = ['CAFE', 'SURF', 'HOTEL', 'NEON', 'TACOS', 'PIER', 'BAR', 'SHOP'];
const NEON_COLORS = [0xff4d8d, 0x35e0c8, 0xffb01e, 0x7a5cff, 0xff6b4a];

function windowTexture(rng, litRatio) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  // Warm taupe facade so a building reads as a sunlit wall with windows,
  // never a black slab; unlit glass is a muted blue-grey, lit glass is warm.
  g.fillStyle = '#9a8a76'; g.fillRect(0, 0, 128, 256);
  const cols = 4, rows = 8, w = 22, h = 20, gx = 8, gy = 8;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const lit = rng() < litRatio;
      g.fillStyle = lit ? (chance(rng, 0.5) ? '#ffd98a' : '#ffeec2') : '#5a6a7e';
      g.fillRect(gx + col * (w + gx), gy + r * (h + gy), w, h);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function checkTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    g.fillStyle = (x + y) % 2 ? '#20242e' : '#d8d4cc';
    g.fillRect(x * 16, y * 16, 16, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makePalm() {
  // NORMAL-SIZED palm: trunk 3.2 high, crown about 1.6 across.
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a48 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 3.2, 6), trunkMat);
  trunk.position.y = 1.6;
  g.add(trunk);
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.7, 4), frondMat);
    frond.position.set(Math.cos(a) * 0.75, 3.35, Math.sin(a) * 0.75);
    frond.rotation.z = Math.cos(a) * 1.15;
    frond.rotation.x = -Math.sin(a) * 1.15;
    frond.scale.set(1, 1, 0.28);
    g.add(frond);
  }
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), new THREE.MeshLambertMaterial({ color: 0x2f7d3a }));
  top.position.y = 3.3;
  g.add(top);
  return g;
}

function makeBuilding(rng, x, z, w, d, h, color, winTex) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  body.position.y = h / 2;
  g.add(body);
  // Window band: a slightly proud plane on the two street-facing sides.
  const winMat = new THREE.MeshBasicMaterial({ map: winTex });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.85), winMat);
  front.position.set(0, h * 0.5, d / 2 + 0.06);
  g.add(front);
  const back = front.clone();
  back.position.z = -d / 2 - 0.06;
  back.rotation.y = Math.PI;
  g.add(back);
  // Roof lip.
  const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), new THREE.MeshLambertMaterial({ color: 0x5a4a3a }));
  lip.position.y = h + 0.25;
  g.add(lip);
  // Balconies on taller buildings.
  if (h > 14 && chance(rng, 0.6)) {
    for (let f = 0; f < Math.floor(h / 7); f++) {
      const y = 4 + f * 7;
      const bal = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.25, 1.2), new THREE.MeshLambertMaterial({ color: 0x6b5a48 }));
      bal.position.set(0, y, d / 2 + 0.6);
      g.add(bal);
    }
  }
  // Neon sign on some buildings.
  if (chance(rng, 0.45)) {
    const word = pick(rng, NEON_WORDS);
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#' + pick(rng, NEON_COLORS).toString(16).padStart(6, '0');
    ctx.fillText(word, 128, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.4), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(0, h * 0.82, d / 2 + 0.12);
    g.add(sign);
  }
  g.position.set(x, 0, z);
  return g;
}

function makeStall(rng, x, z, rotY) {
  const g = new THREE.Group();
  const awnColor = pick(rng, [0xff5a6e, 0xffb01e, 0x35e0c8, 0xff8a3d]);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1, 1.6), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
  counter.position.y = 0.5;
  g.add(counter);
  const awn = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 2.2), new THREE.MeshLambertMaterial({ color: awnColor }));
  awn.position.y = 2.4;
  awn.rotation.x = 0.12;
  g.add(awn);
  for (let i = 0; i < 4; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5), new THREE.MeshLambertMaterial({ color: 0x4a3a28 }));
    post.position.set(i < 2 ? -1.6 : 1.6, 1.2, i % 2 ? -0.9 : 0.9);
    g.add(post);
  }
  // Colourful goods on the counter.
  for (let i = 0; i < 5; i++) {
    const good = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.4), new THREE.MeshLambertMaterial({ color: pick(rng, [0xff4d6d, 0xffd21f, 0x4dd0a0, 0xff8a3d, 0x7a5cff]) }));
    good.position.set(-1.2 + i * 0.6, 1.2, 0);
    g.add(good);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

function makeCarShape(color, isTaxi) {
  // A car that reads as a car: hood, cabin, trunk, wheels, lights, spoiler.
  // LOW SLEEK PROFILE: a low body and a low, long tinted-glass cabin so the
  // car reads as a sports car, never a boxy taxi with a dark box on top.
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.48, 4.4), bodyMat);
  body.position.y = 0.5;
  g.add(body);
  // Glass cabin: low and long, a lighter blue-grey glass so it reads as a
  // canopy with sky in it — never a black slab on the roof.
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 2.3), new THREE.MeshLambertMaterial({ color: 0x5a7a9a }));
  cabin.position.set(0, 0.92, -0.25);
  g.add(cabin);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.18, 1.1), bodyMat);
  hood.position.set(0, 0.82, 1.65);
  g.add(hood);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 0.45), new THREE.MeshLambertMaterial({ color: 0x1c1f24 }));
  spoiler.position.set(0, 1.08, -2.05);
  g.add(spoiler);
  const spoilerL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.08), new THREE.MeshLambertMaterial({ color: 0x1c1f24 }));
  spoilerL.position.set(-0.7, 0.92, -2.05);
  g.add(spoilerL);
  const spoilerR = spoilerL.clone(); spoilerR.position.x = 0.7; g.add(spoilerR);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const hubMat = new THREE.MeshLambertMaterial({ color: 0xb8bec8 });
  for (const [wx, wz] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.38, wz);
    g.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 8), hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(wx, 0.38, wz);
    g.add(hub);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const hx of [-0.6, 0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.06), headMat);
    head.position.set(hx, 0.62, 2.22);
    g.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
  for (const tx of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.06), tailMat);
    tail.position.set(tx, 0.62, -2.22);
    g.add(tail);
  }
  // Front grille + bumper so the nose reads as a real car's face.
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 0.06), darkMat);
  grille.position.set(0, 0.42, 2.22);
  g.add(grille);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.22, 0.14), darkMat);
  bumper.position.set(0, 0.28, 2.2);
  g.add(bumper);
  // Hood vents: two thin dark slots on the hood.
  for (const vx of [-0.45, 0.45]) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.55), darkMat);
    vent.position.set(vx, 0.92, 1.65);
    g.add(vent);
  }
  // Side mirrors on the cabin sides.
  for (const mx of [-0.95, 0.95]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.22), darkMat);
    mirror.position.set(mx, 1.0, 0.6);
    g.add(mirror);
  }
  if (isTaxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe95e }));
    sign.position.set(0, 1.28, -0.25);
    g.add(sign);
  }
  return g;
}

export function buildCity(scene) {
  const rng = mulberry32(20261122);
  const group = new THREE.Group();
  const out = { group, palms: [], buildings: [], stalls: [], colliders: [], workshop: null, ocean: null };
  scene.add(group);

  // Ground: big asphalt base, then sidewalks, beach and ocean on top.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshLambertMaterial({ color: 0x3a3f4a }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  group.add(ground);
  // Sidewalk strips along the boulevard.
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(10, 240), new THREE.MeshLambertMaterial({ color: 0x8f8a80 }));
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(-40, 0.02, 0);
  group.add(walk);
  // Beach sand west of the boulevard.
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(14, 240), new THREE.MeshLambertMaterial({ color: 0xe8d29a }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-56, 0.03, 0);
  group.add(beach);
  // Ocean.
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(60, 260), new THREE.MeshLambertMaterial({ color: 0x2a9db8 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-92, 0.01, 0);
  group.add(ocean);
  out.ocean = ocean;
  // Foam line where sea meets sand.
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 240), new THREE.MeshBasicMaterial({ color: 0xdff4f8 }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(-63.5, 0.04, 0);
  group.add(foam);

  // Boulevard centre line (dashed, pale yellow).
  for (let z = -110; z < 110; z += 8) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.5), new THREE.MeshBasicMaterial({ color: 0xe8c84a }));
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(CITY.boulevardX, 0.05, z);
    group.add(dash);
  }
  // Crosswalks.
  for (const cz of [-60, -10, 40, 90]) {
    for (let i = 0; i < 6; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.4), new THREE.MeshBasicMaterial({ color: 0xe8e8e8 }));
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(CITY.boulevardX - 5 + i * 2, 0.05, cz);
      group.add(stripe);
    }
  }

  // Buildings: a grid of blocks, skipping the boulevard, the garage plot and
  // the pier approach. Heights and colours vary so the skyline is varied.
  const winTexA = windowTexture(mulberry32(11), 0.55);
  const winTexB = windowTexture(mulberry32(22), 0.35);
  const step = CITY.block + CITY.street; // 46
  for (let bi = 0; bi < CITY.blocks; bi++) {
    for (let bj = 0; bj < CITY.blocks; bj++) {
      const bx = -20 + bi * step;
      const bz = -92 + bj * step;
      // Skip the garage plot and the pier approach.
      if (Math.abs(bx - CITY.garage.x) < 24 && Math.abs(bz - CITY.garage.z) < 20) continue;
      if (bx < -30 && Math.abs(bz - CITY.pier.z) < 18) continue;
      // Two buildings per block, varied heights and colours.
      for (let k = 0; k < 2; k++) {
        const w = range(rng, 12, 18), d = range(rng, 12, 18);
        const h = range(rng, 9, 26);
        const x = bx + (k === 0 ? -7 : 8) + range(rng, -2, 2);
        const z = bz + range(rng, -4, 4);
        const color = pick(rng, PALETTE);
        const b = makeBuilding(rng, x, z, w, d, h, color, chance(rng, 0.5) ? winTexA : winTexB);
        group.add(b);
        out.buildings.push(b);
        out.colliders.push({ x, z, r: Math.max(w, d) * 0.62 });
      }
    }
  }

  // Palms: NORMAL-SIZED, along the beach side and sparsely on sidewalks.
  // Spaced ~9 apart, never a wall of green in the chase frame.
  for (let z = -105; z <= 105; z += 9) {
    if (chance(rng, 0.82)) {
      const p = makePalm();
      p.position.set(-52 + range(rng, -1.5, 1.5), 0, z + range(rng, -1.5, 1.5));
      p.rotation.y = rng() * Math.PI * 2;
      group.add(p);
      out.palms.push(p);
    }
  }
  for (let z = -90; z <= 100; z += 22) {
    if (chance(rng, 0.5)) {
      const p = makePalm();
      p.position.set(-38, 0, z);
      group.add(p);
      out.palms.push(p);
    }
  }

  // Market stalls along the boulevard (FIX 3: life at street level).
  const stallSpots = [[-40, -52, 0.3], [-40, -14, -0.2], [-40, 28, 0.15], [-40, 66, -0.3], [-36, -70, 1.4], [-36, 8, 1.6], [-36, 52, 1.5]];
  for (const [x, z, r] of stallSpots) {
    const s = makeStall(rng, x, z, r);
    group.add(s);
    out.stalls.push(s);
  }

  // Pier: wooden deck out into the ocean + posts.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6a48 });
  for (let i = 0; i < 12; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 4), pierMat);
    plank.position.set(CITY.pier.x - i * 2.1, 0.6, CITY.pier.z);
    group.add(plank);
  }
  for (let i = 0; i < 6; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.2, 6), new THREE.MeshLambertMaterial({ color: 0x5a4230 }));
    post.position.set(CITY.pier.x - i * 4.2, -0.2, CITY.pier.z + 1.4);
    group.add(post);
  }

  // Marina boats.
  for (let i = 0; i < 4; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 5), new THREE.MeshLambertMaterial({ color: pick(rng, [0xf0f0f0, 0xff8a3d, 0x35e0c8]) }));
    hull.position.y = 0.35;
    boat.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.6), new THREE.MeshLambertMaterial({ color: 0x2a3440 }));
    cab.position.set(0, 1, -0.6);
    boat.add(cab);
    boat.position.set(-72 - i * 3, 0.1, CITY.marina.z + i * 7);
    boat.rotation.y = 0.2;
    group.add(boat);
  }

  // Dockside Customs workshop: an enclosed bay with a checkered floor.
  const ws = buildWorkshop(group, rng);
  out.workshop = ws;

  return out;
}

function buildWorkshop(group, rng) {
  const g = new THREE.Group();
  const { x, z, w, d } = CITY.garage;
  // Checkered floor.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: checkTexture() }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, 0.06, z);
  group.add(floor);
  // Walls: back + two sides, open front (south) so the camera can see in.
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xc9b8a0 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, 7, 0.5), wallMat);
  back.position.set(x, 3.5, z - d / 2);
  group.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, d), wallMat);
  left.position.set(x - w / 2, 3.5, z);
  group.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, d), wallMat);
  right.position.set(x + w / 2, 3.5, z);
  group.add(right);
  // Roof.
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.4, d + 1), new THREE.MeshLambertMaterial({ color: 0x4a3a30 }));
  roof.position.set(x, 7.2, z);
  group.add(roof);
  // Neon CUSTOMS sign on the back wall.
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#14101c'; ctx.fillRect(0, 0, 512, 96);
  ctx.font = 'bold 58px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff4d8d';
  ctx.fillText('CUSTOMS', 256, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(x, 5.6, z - d / 2 + 0.3);
  group.add(sign);
  // Workbench with tools.
  const bench = new THREE.Mesh(new THREE.BoxGeometry(6, 0.9, 1.6), new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
  bench.position.set(x - 7, 0.45, z - 6);
  group.add(bench);
  for (let i = 0; i < 5; i++) {
    const tool = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.2), new THREE.MeshLambertMaterial({ color: pick(rng, [0xff4d6d, 0xffd21f, 0x4dd0a0, 0x7a5cff]) }));
    tool.position.set(x - 9 + i * 1, 1.0, z - 6);
    group.add(tool);
  }
  // Paint cans: small colourful cylinders on the bench and floor.
  for (let i = 0; i < 8; i++) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 8), new THREE.MeshLambertMaterial({ color: pick(rng, [0xff4d6d, 0xffd21f, 0x4dd0a0, 0xff8a3d, 0x35e0c8, 0xf0f0f0]) }));
    const onBench = i < 4;
    can.position.set(x - 9.5 + i * 1.1, onBench ? 1.15 : 0.25, onBench ? z - 6.4 : z + 4 + (i % 2));
    group.add(can);
  }
  // Stacked tyres.
  for (let i = 0; i < 3; i++) {
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 12), new THREE.MeshLambertMaterial({ color: 0x16181c }));
    tyre.position.set(x + 9.5, 0.15 + i * 0.3, z + 6);
    group.add(tyre);
  }
  const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 12), new THREE.MeshLambertMaterial({ color: 0x16181c }));
  spare.position.set(x + 10, 0.15, z - 5);
  spare.rotation.z = Math.PI / 2;
  group.add(spare);
  // Drop cloth.
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshLambertMaterial({ color: 0xe8e4da }));
  cloth.rotation.x = -Math.PI / 2;
  cloth.position.set(x + 4, 0.08, z + 5);
  group.add(cloth);
  // Lift: dark platform + red posts.
  const lift = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.35, 10), new THREE.MeshLambertMaterial({ color: 0x2a2e36 }));
  lift.position.set(x, 0.25, z);
  group.add(lift);
  for (const [lx, lz] of [[-2.4, -4], [2.4, -4], [-2.4, 4], [2.4, 4]]) {
    // Short thin posts (0.9 high) so they read as a lift without ever
    // blocking the camera's sightline to the car.
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.35), new THREE.MeshLambertMaterial({ color: 0xc23a2a }));
    post.position.set(x + lx, 0.45, z + lz);
    group.add(post);
  }
  // Warm interior lights.
  const l1 = new THREE.PointLight(0xffe0a0, 0.9, 22);
  l1.position.set(x - 4, 5.5, z - 3);
  group.add(l1);
  const l2 = new THREE.PointLight(0xffe0a0, 0.9, 22);
  l2.position.set(x + 4, 5.5, z + 3);
  group.add(l2);
  return { group: g, liftPos: { x, z } };
}

export { makeCarShape, makeStall };
