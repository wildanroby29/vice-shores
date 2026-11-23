// city.js — the city itself: ground, roads, beach, ocean, pier and marina,
// buildings (6+ palettes, stepped towers, cornices, rooftop props, awnings,
// signs, per-building canvas window textures with lit/unlit windows, base
// darkening), palms (curved trunks, drooping fronds, coconuts), bushes and
// flower beds. `detail` 'low' builds simple stand-ins (used to prove WP2).
import { PALETTE, WORLD } from './config.js';

export const PALETTES = [
  { base: 0xe8d9b8, trim: 0xc96f4a, roof: 0x8a6f5c }, // cream
  { base: 0xd9a05a, trim: 0x8a3a2a, roof: 0x6b3a2a }, // terracotta
  { base: 0x7ac2c2, trim: 0x2a6a6a, roof: 0x2a4a5a }, // teal
  { base: 0xe8b8c8, trim: 0x8a4a6a, roof: 0x6b3a4a }, // pink
  { base: 0xd9c49a, trim: 0x8a6a3a, roof: 0x5c4a2a }, // sand
  { base: 0xdfe8ee, trim: 0x3a7ca5, roof: 0x5c6b7a }, // pale blue
  { base: 0xf5e6c8, trim: 0xb3543f, roof: 0x7a4a3a }, // warm white
];

function windowTexture(rand, base, lit) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  // Pilasters between window columns + floor bands (breaks the flat slab look).
  g.fillStyle = 'rgba(255,255,255,0.16)';
  for (let x = 0; x < 128; x += 26) g.fillRect(x, 0, 4, 256);
  g.fillStyle = 'rgba(0,0,0,0.14)';
  for (let y = 0; y < 256; y += 22) g.fillRect(0, y, 128, 3);
  for (let y = 8; y < 248; y += 22) {
    for (let x = 10; x < 118; x += 26) {
      const on = rand() < (lit ? 0.5 : 0.18);
      // Recessed window: dark frame, then the lit/unlit pane.
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(x - 2, y - 2, 20, 18);
      g.fillStyle = on ? '#ffd98a' : '#2a3542';
      g.fillRect(x, y, 16, 14);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x, y, 16, 3);
    }
  }
  // Darken toward the base (fake ambient occlusion).
  const grad = g.createLinearGradient(0, 180, 0, 256);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = grad;
  g.fillRect(0, 180, 128, 76);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeBuilding(rand, x, z, w, d, h, pal, detail, lit) {
  const group = new THREE.Group();
  const trimMat = new THREE.MeshStandardMaterial({ color: pal.trim, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: pal.roof, roughness: 0.7 });
  // Core box; the canvas texture gives the window panes their lit/unlit
  // variation, but the facade's relief comes from real geometry below.
  const mat = new THREE.MeshStandardMaterial({ map: windowTexture(rand, `#${pal.base.toString(16).padStart(6, '0')}`, lit), roughness: 0.85 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  box.position.y = h / 2;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);
  if (detail === 'full') {
    // Pilasters: vertical ribs between the window columns on the front and
    // both side faces, proud of the facade — the flat-slab look is gone
    // because the wall now has real depth.
    const cols = Math.max(2, Math.floor(w / 4.5));
    for (let c = 0; c <= cols; c += 1) {
      const px = -w / 2 + (c / cols) * w;
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.35), trimMat);
      pil.position.set(px, h / 2, d / 2 + 0.1);
      pil.castShadow = true;
      group.add(pil);
      const pilB = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.35), trimMat);
      pilB.position.set(px, h / 2, -d / 2 - 0.1);
      group.add(pilB);
    }
    const sideCols = Math.max(1, Math.floor(d / 4.5));
    for (let c = 0; c <= sideCols; c += 1) {
      const pz = -d / 2 + (c / sideCols) * d;
      const pilL = new THREE.Mesh(new THREE.BoxGeometry(0.35, h, 0.5), trimMat);
      pilL.position.set(-w / 2 - 0.1, h / 2, pz);
      group.add(pilL);
      const pilR = new THREE.Mesh(new THREE.BoxGeometry(0.35, h, 0.5), trimMat);
      pilR.position.set(w / 2 + 0.1, h / 2, pz);
      group.add(pilR);
    }
    // Floor bands: a ledge wrapping the whole building at every floor.
    const floors = Math.max(2, Math.floor(h / 3.6));
    for (let f = 1; f < floors; f += 1) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5), trimMat);
      band.position.y = (f / floors) * h;
      band.castShadow = true;
      group.add(band);
    }
    // Recessed shopfront glass on the ground floor: dark glossy panes set
    // INTO the facade (proud only 0.05, behind the pilasters), with a warm
    // lit interior so the shop reads at dusk.
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x1a2a3a, roughness: 0.08, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.0 });
    const shopGlow = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0xffd98a, emissiveIntensity: 0.55 });
    const shopN = Math.max(1, Math.floor(w / 6));
    for (let s = 0; s < shopN; s += 1) {
      const sx = -w / 2 + ((s + 0.5) / shopN) * w;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(w / shopN - 1.2, 2.6, 0.12), glassMat);
      pane.position.set(sx, 1.7, d / 2 + 0.03);
      group.add(pane);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(w / shopN - 1.6, 2.2, 0.06), shopGlow);
      glow.position.set(sx, 1.7, d / 2 + 0.08);
      group.add(glow);
    }
    // Cornice ledge at the roof + parapet wall around the roof edge.
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.5, d + 0.8), roofMat);
    cornice.position.y = h + 0.2;
    cornice.castShadow = true;
    group.add(cornice);
    const par = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.9, d + 0.4), roofMat);
    par.position.y = h + 0.7;
    group.add(par);
    // Setback tower top on tall buildings.
    if (h > 16) {
      const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, h * 0.18, d * 0.62), trimMat);
      top.position.y = h + h * 0.09;
      top.castShadow = true;
      group.add(top);
      const topCornice = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62 + 0.5, 0.4, d * 0.62 + 0.5), roofMat);
      topCornice.position.y = h + h * 0.18 + 0.2;
      group.add(topCornice);
    }
    // Rooftop props: AC units, water tank, antenna.
    const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.6, metalness: 0.4 }));
    ac.position.set(-w / 4, h + 0.9, -d / 4);
    ac.castShadow = true;
    group.add(ac);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 10), new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.9 }));
    tank.position.set(w / 4, h + 1.3, d / 4);
    tank.castShadow = true;
    group.add(tank);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 4, 6), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    ant.position.set(w / 4, h + 3.2, -d / 4);
    group.add(ant);
    // Ground-floor awning + emissive sign.
    const awn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.3, 2.2), trimMat);
    awn.position.set(0, 3.4, d / 2 + 0.9);
    awn.castShadow = true;
    group.add(awn);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.1, 0.3), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: pal.trim, emissiveIntensity: 0.9 }));
    sign.position.set(0, 5.2, d / 2 + 0.2);
    group.add(sign);
    // Balconies with rails on the front face (tall buildings only).
    if (h > 16) {
      const balMat = trimMat;
      const railMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.5 });
      const balFloors = Math.min(3, Math.floor(h / 9));
      for (let f = 0; f < balFloors; f += 1) {
        const by = 7 + f * 8;
        if (by > h - 2) break;
        const bx = -w / 4 + (f % 2) * (w / 2);
        const slab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 1.4), balMat);
        slab.position.set(bx, by, d / 2 + 0.6);
        slab.castShadow = true;
        group.add(slab);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 0.08), railMat);
        rail.position.set(bx, by + 0.6, d / 2 + 1.25);
        group.add(rail);
        for (const rx of [-1.5, 1.5]) {
          const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 1.4), railMat);
          side.position.set(bx + rx, by + 0.6, d / 2 + 0.6);
          group.add(side);
        }
      }
    }
  }
  group.position.set(x, 0, z);
  return group;
}

export function makePalm(rand, detail, scale) {
  const group = new THREE.Group();
  const h = (7 + rand() * 3) * scale;
  if (detail === 'low') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, h, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a4a }));
    trunk.position.y = h / 2;
    group.add(trunk);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.5, 6), new THREE.MeshStandardMaterial({ color: 0x3a7a3a }));
    top.position.y = h + 1;
    group.add(top);
    return group;
  }
  // Curved trunk: a tapered cylinder bent along a smooth arc, with ring
  // bands (torus) at intervals so the trunk reads as a palm, not a pole.
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.42, h, 10, 8);
  const pos = trunkGeo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    const k = (y + h / 2) / h; // 0 at base, 1 at crown
    pos.setX(i, pos.getX(i) + Math.sin(k * 1.1) * 1.0);
  }
  trunkGeo.computeVertexNormals();
  const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0xa8845e, roughness: 0.95 }));
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  group.add(trunk);
  for (let r = 0; r < 5; r += 1) {
    const ry = h * (0.2 + r * 0.18);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36 - r * 0.03, 0.05, 6, 12), new THREE.MeshStandardMaterial({ color: 0x7a5c3a }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(Math.sin((ry / h) * 1.1) * 1.0, ry, 0);
    group.add(ring);
  }
  // 10-13 drooping fronds, each bent along an arc (tip curls down) and
  // warm-lit green (emissive lift) so they never read as black silhouettes.
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x4a9a3a, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x1a2a10, emissiveIntensity: 0.55 });
  const fronds = 10 + Math.floor(rand() * 4);
  const crownX = Math.sin(1.1) * 1.0;
  for (let i = 0; i < fronds; i += 1) {
    const len = 3.4 + rand() * 1.4;
    const geo = new THREE.PlaneGeometry(1.0, len, 1, 8);
    const p = geo.attributes.position;
    for (let j = 0; j < p.count; j += 1) {
      const y = p.getY(j);
      const k = (y + len / 2) / len; // 0 at base, 1 at tip
      p.setZ(j, -k * k * 2.0); // droop arc: tip curls down
      p.setX(j, p.getX(j) * (1 - k * 0.45)); // taper toward the tip
    }
    geo.computeVertexNormals();
    const frond = new THREE.Mesh(geo, frondMat);
    const a = (i / fronds) * Math.PI * 2 + rand() * 0.25;
    frond.position.set(crownX, h, 0);
    frond.rotation.set(-0.35 - rand() * 0.55, a, 0);
    frond.translateY(len / 2);
    frond.castShadow = true;
    group.add(frond);
  }
  // Coconuts clustered under the crown.
  for (let i = 0; i < 3; i += 1) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 }));
    nut.position.set(crownX + 0.4 + i * 0.22, h - 0.35, 0.35 - i * 0.28);
    group.add(nut);
  }
  return group;
}

export function createCity(scene, rand, detail, lit) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = []; // {x0,z0,x1,z1} building footprints for driving + minimap
  const palmSpots = [];
  const buildingSpots = [];

  // Ground: grass base, asphalt roads, sidewalks, sand beach, sea.
  // The ground + sea run to the horizon (fog far) so the world edge / void
  // is never visible in any shot.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: PALETTE.asphalt, roughness: 0.95 });
  const walkMat = new THREE.MeshStandardMaterial({ color: PALETTE.sidewalk, roughness: 1 });
  const sandMat = new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 });
  const seaMat = new THREE.MeshStandardMaterial({ color: PALETTE.sea, roughness: 0.4, metalness: 0.0 });
  for (let i = -4; i <= 4; i += 1) {
    const c = i * (WORLD.block + WORLD.street);
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(440, WORLD.street), roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.02, c);
    roadH.receiveShadow = true;
    group.add(roadH);
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.street, 440), roadMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(c, 0.02, 0);
    roadV.receiveShadow = true;
    group.add(roadV);
    // Centre dashes.
    for (let d = -200; d < 200; d += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), new THREE.MeshStandardMaterial({ color: PALETTE.asphaltLine }));
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(d, 0.04, c);
      group.add(dash);
      const dash2 = dash.clone();
      dash2.rotation.z = Math.PI / 2;
      dash2.position.set(c, 0.04, d);
      group.add(dash2);
    }
  }
  // Beach strip + sea to the east and south (sand stays clear of the roads).
  // NOTE: the ground/sand/sea planes are subdivided (not 1x1): a single
  // 460 m triangle viewed at a grazing angle loses the depth fight to the
  // grass below it (depth is interpolated across the whole triangle), which
  // is why the sea read as green lawn in the pier shot.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(44, 460, 4, 32), sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(210, 0.05, 0);
  sand.receiveShadow = true;
  group.add(sand);
  const sandS = new THREE.Mesh(new THREE.PlaneGeometry(460, 44, 32, 4), sandMat);
  sandS.rotation.x = -Math.PI / 2;
  sandS.position.set(0, 0.05, 210);
  sandS.receiveShadow = true;
  group.add(sandS);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1568, 2000, 32, 32), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(1016, 0.12, 0);
  group.add(sea);
  const seaS = new THREE.Mesh(new THREE.PlaneGeometry(2000, 1200, 32, 24), seaMat);
  seaS.rotation.x = -Math.PI / 2;
  seaS.position.set(0, 0.12, 900);
  group.add(seaS);

  // Buildings on the blocks BETWEEN the roads (block centres at +30).
  for (let bx = -4; bx <= 4; bx += 1) {
    for (let bz = -4; bz <= 4; bz += 1) {
      if (bx >= 3) continue; // beach side
      if (bx === 0 && bz === 0) continue; // central plaza
      const cx = bx * (WORLD.block + WORLD.street) + 30;
      const cz = bz * (WORLD.block + WORLD.street) + 30;
      const w = 18 + rand() * 14;
      const d = 18 + rand() * 14;
      const h = 10 + rand() * 26 + (Math.abs(bx) + Math.abs(bz) < 3 ? 10 : 0);
      const pal = PALETTES[Math.floor(rand() * PALETTES.length)];
      const b = makeBuilding(rand, cx, cz, w, d, h, pal, detail, lit);
      group.add(b);
      colliders.push({ x0: cx - w / 2 - 1, z0: cz - d / 2 - 1, x1: cx + w / 2 + 1, z1: cz + d / 2 + 1 });
      buildingSpots.push({ x: cx, z: cz, w, d, h, color: pal.base });
    }
  }

  // Palms along the boulevard (east road) and the beach strip, 2-3 sizes.
  for (let z = -190; z <= 190; z += 18) {
    const s = 0.85 + (Math.abs(z) % 3) * 0.2;
    const p1 = makePalm(rand, detail, s);
    p1.position.set(168, 0, z);
    group.add(p1);
    palmSpots.push({ x: 168, z });
    if (z % 36 === 0) {
      const p2 = makePalm(rand, detail, s * 1.15);
      p2.position.set(150, 0, z + 9);
      group.add(p2);
      palmSpots.push({ x: 150, z: z + 9 });
    }
  }
  // Bushes and low flower beds on the beach strip (grounded planters, never
  // floating coloured spheres). Small (r<=1) and set back on the sand at
  // x=197, clear of the boulevard camera lines — the big domes at x=186
  // sat on the road edge and read as giant green blobs in the title/on-foot
  // shots.
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 1 });
  const flowerCols = [0xe85a8a, 0xf2c94c, 0xe85a3a, 0x9a5ae8];
  for (let z = -180; z <= 180; z += 24) {
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.7 + rand() * 0.3, 8, 6), bushMat);
    bush.position.set(197, 0.45, z);
    bush.scale.y = 0.55;
    bush.castShadow = true;
    group.add(bush);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 1.3), new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 1 }));
    bed.position.set(197, 0.2, z + 6);
    bed.castShadow = true;
    group.add(bed);
    for (let f = 0; f < 6; f += 1) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 5), new THREE.MeshStandardMaterial({ color: flowerCols[Math.floor(rand() * 4)] }));
      fl.scale.y = 0.45;
      fl.position.set(195.4 + (f % 3) * 1.6, 0.45, z + 5.6 + Math.floor(f / 3) * 0.8);
      group.add(fl);
    }
  }

  // Pier: wooden deck running south into the sea + marina boats.
  // Plank deck (canvas texture), side rails, lamp posts, wakes behind boats.
  const pierCanvas = document.createElement('canvas');
  pierCanvas.width = 64; pierCanvas.height = 256;
  const pg2 = pierCanvas.getContext('2d');
  pg2.fillStyle = '#a08055'; pg2.fillRect(0, 0, 64, 256);
  pg2.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 0; y < 256; y += 12) pg2.fillRect(0, y, 64, 2);
  pg2.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = 0; x < 64; x += 16) pg2.fillRect(x, 0, 2, 256);
  const pierTex = new THREE.CanvasTexture(pierCanvas);
  pierTex.colorSpace = THREE.SRGBColorSpace;
  const pierMat = new THREE.MeshStandardMaterial({ map: pierTex, roughness: 0.95 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 90), pierMat);
  pier.position.set(185, 0.8, 195);
  pier.castShadow = true;
  pier.receiveShadow = true;
  group.add(pier);
  for (let i = 0; i < 8; i += 1) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2a }));
    post.position.set(181 + (i % 2) * 8, 0.4, 160 + i * 10);
    group.add(post);
  }
  // Side rails (two horizontal bars each side) + rail posts.
  const railMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.9 });
  for (const rx of [180.4, 189.6]) {
    for (const ry of [1.5, 2.1]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 88, 6), railMat);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(rx, ry, 195);
      group.add(rail);
    }
    for (let z = 155; z <= 235; z += 10) {
      const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6), railMat);
      rp.position.set(rx, 1.4, z);
      group.add(rp);
    }
  }
  // Lamp posts along the pier (emissive heads + glow).
  const lampGlowCanvas = document.createElement('canvas');
  lampGlowCanvas.width = 64; lampGlowCanvas.height = 64;
  const lg = lampGlowCanvas.getContext('2d');
  const lgrad = lg.createRadialGradient(32, 32, 2, 32, 32, 30);
  lgrad.addColorStop(0, 'rgba(255,220,150,0.95)');
  lgrad.addColorStop(1, 'rgba(255,220,150,0)');
  lg.fillStyle = lgrad; lg.fillRect(0, 0, 64, 64);
  const lampGlowTex = new THREE.CanvasTexture(lampGlowCanvas);
  for (let z = 160; z <= 232; z += 12) {
    for (const lx of [181.2, 188.8]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.4, 6), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.5 }));
      pole.position.set(lx, 2.5, z);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd98a, emissiveIntensity: 1.2 }));
      head.position.set(lx, 4.3, z);
      group.add(head);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampGlowTex, color: 0xffd98a, transparent: true, opacity: 0.25, depthWrite: false }));
      glow.position.set(lx, 4.3, z);
      glow.scale.set(1.2, 1.2, 1);
      group.add(glow);
    }
  }
  const boats = [];
  const boatCols = [0xf2f2f2, 0x3a7ca5, 0xe8b83a, 0xc96f4a];
  // Hull profile (side view, x = along the boat, bow at +x): a pointed bow
  // rising out of the water, a flat run to a square transom at the stern.
  // Extruded across the beam with a bevel — a real boat hull, not a box.
  function hullProfile(points, width, bevel, mat) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();
    const depth = Math.max(0.05, width - bevel * 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1,
    });
    geo.rotateY(-Math.PI / 2);
    geo.translate(depth / 2, 0, 0);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }
  for (let i = 0; i < 6; i += 1) {
    const boat = new THREE.Group();
    const hull = hullProfile(
      [[4.5, 0.5], [4.2, 1.1], [2.0, 1.2], [-4.2, 1.2], [-4.5, 0.9], [-4.5, 0.2], [2.0, 0.0], [4.5, 0.5]],
      3.6, 0.15, new THREE.MeshStandardMaterial({ color: boatCols[i % 4], roughness: 0.45 }),
    );
    hull.position.y = 0.1;
    boat.add(hull);
    // Deck + cabin with windows + a small mast.
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 7.6), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 }));
    deck.position.set(0, 1.28, -0.4);
    boat.add(deck);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 2.8), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }));
    cab.position.set(0, 2.0, -1.2);
    cab.castShadow = true;
    boat.add(cab);
    const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 2.0), new THREE.MeshPhysicalMaterial({ color: 0x1a2a3a, roughness: 0.1, clearcoat: 1 }));
    cabGlass.position.set(0, 2.2, -1.0);
    boat.add(cabGlass);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 0.6, roughness: 0.4 }));
    mast.position.set(0, 3.2, -1.2);
    boat.add(mast);
    // Boats IN the water east of the pier (x>=242; the sand strip runs to
    // x=232, so the old x=205-229 berths sat on dry sand and read as boxes
    // on land). Close enough to the pier end to read in the pier shot.
    boat.position.set(242 + (i % 3) * 14, 0.2, 168 + Math.floor(i / 3) * 55);
    boat.rotation.y = (rand() - 0.5) * 0.4;
    group.add(boat);
    boats.push(boat);
    // Wake: a white V (two fading trails) + a centre line behind the boat.
    const wakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    for (const side of [-1, 1]) {
      const wake = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 12), wakeMat);
      wake.rotation.x = -Math.PI / 2;
      wake.rotation.z = boat.rotation.y + side * 0.35;
      wake.position.set(
        boat.position.x - Math.sin(boat.rotation.y) * 8 + Math.cos(boat.rotation.y) * side * 2,
        0.12,
        boat.position.z - Math.cos(boat.rotation.y) * 8 - Math.sin(boat.rotation.y) * side * 2,
      );
      group.add(wake);
    }
    const wakeLine = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65, depthWrite: false }));
    wakeLine.rotation.x = -Math.PI / 2;
    wakeLine.rotation.z = boat.rotation.y;
    wakeLine.position.set(boat.position.x - Math.sin(boat.rotation.y) * 8, 0.12, boat.position.z - Math.cos(boat.rotation.y) * 8);
    group.add(wakeLine);
  }
  // Sun glitter on the sea east of the pier (bright glints on the water).
  const glitterMat = new THREE.MeshBasicMaterial({ map: lampGlowTex, color: 0xffd98a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 26; i += 1) {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + rand() * 2.2, 0.5 + rand() * 0.6), glitterMat);
    gl.rotation.x = -Math.PI / 2;
    gl.rotation.z = rand() * Math.PI;
    gl.position.set(238 + rand() * 40, 0.12, 150 + rand() * 85);
    group.add(gl);
  }

  // Street dressing: sidewalks, crosswalks, edge lines, double-yellow centre
  // line, manhole covers, street lamps, benches, bins, bollards, hydrants.
  // (The boulevard x=180 and the central road z=0 are the shot roads.)
  const sideMat = new THREE.MeshStandardMaterial({ color: PALETTE.sidewalk, roughness: 1 });
  const sideW = new THREE.Mesh(new THREE.PlaneGeometry(4, 440), sideMat);
  sideW.rotation.x = -Math.PI / 2;
  sideW.position.set(170, 0.025, 0);
  sideW.receiveShadow = true;
  group.add(sideW);
  for (const sz of [-10, 10]) {
    const sideC = new THREE.Mesh(new THREE.PlaneGeometry(440, 4), sideMat);
    sideC.rotation.x = -Math.PI / 2;
    sideC.position.set(0, 0.025, sz);
    sideC.receiveShadow = true;
    group.add(sideC);
  }
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
  function crosswalk(cx, cz, alongX) {
    for (let i = -3; i <= 3; i += 1) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? 1.1 : 7.2, alongX ? 7.2 : 1.1), crossMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(cx + (alongX ? 0 : i * 1.9), 0.06, cz + (alongX ? i * 1.9 : 0));
      stripe.renderOrder = 2;
      group.add(stripe);
    }
  }
  for (const cz of [-120, -60, 0, 60, 120]) crosswalk(180, cz, false);
  for (const cx of [-120, -60, 60, 120]) crosswalk(cx, 0, true);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
  for (const ex of [172.5, 187.5]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 440), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(ex, 0.05, 0);
    edge.renderOrder = 2;
    group.add(edge);
  }
  for (const ez of [-7.5, 7.5]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(440, 0.25), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(0, 0.05, ez);
    edge.renderOrder = 2;
    group.add(edge);
  }
  // Second yellow dash row (double-yellow centre line) on the two shot roads.
  const dashMat2 = new THREE.MeshStandardMaterial({ color: PALETTE.asphaltLine });
  for (let d = -200; d < 200; d += 12) {
    const dv = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), dashMat2);
    dv.rotation.x = -Math.PI / 2;
    dv.position.set(180.8, 0.04, d);
    group.add(dv);
    const dh = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), dashMat2);
    dh.rotation.x = -Math.PI / 2;
    dh.position.set(d, 0.04, 0.8);
    group.add(dh);
  }
  const manMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9 });
  for (let i = 0; i < 14; i += 1) {
    const mh = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12), manMat);
    mh.rotation.x = -Math.PI / 2;
    mh.position.set(-200 + rand() * 400, 0.05, -200 + rand() * 400);
    mh.renderOrder = 1;
    group.add(mh);
  }
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.5 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.9 });
  const binMat = new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.8, metalness: 0.3 });
  function streetLamp(x, z, dx, dz) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.4, 6), lampPoleMat);
    pole.position.set(x, 2.7, z);
    pole.castShadow = true;
    group.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(dx !== 0 ? 1.4 : 0.1, 0.1, dz !== 0 ? 1.4 : 0.1), lampPoleMat);
    arm.position.set(x + dx * 0.7, 5.3, z + dz * 0.7);
    group.add(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd98a, emissiveIntensity: 1.2 }));
    head.position.set(x + dx * 1.3, 5.2, z + dz * 1.3);
    group.add(head);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampGlowTex, color: 0xffd98a, transparent: true, opacity: 0.25, depthWrite: false }));
    glow.position.set(x + dx * 1.3, 5.2, z + dz * 1.3);
    glow.scale.set(1.2, 1.2, 1);
    group.add(glow);
  }
  for (let z = -168; z <= 168; z += 28) {
    streetLamp(172, z, 1, 0);
    streetLamp(188, z + 14, -1, 0);
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.6), benchMat);
    seat.position.y = 0.5;
    bench.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.1), benchMat);
    back.position.set(0, 0.85, -0.28);
    bench.add(back);
    bench.position.set(170.5, 0, z + 7);
    bench.rotation.y = Math.PI / 2;
    group.add(bench);
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.9, 8), binMat);
    bin.position.set(170.5, 0.45, z + 11);
    bin.castShadow = true;
    group.add(bin);
    for (let b = 0; b < 3; b += 1) {
      const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 6), lampPoleMat);
      bol.position.set(169.5, 0.45, z + 2 + b * 3.5);
      group.add(bol);
    }
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.7 }));
    hyd.position.set(189.5, 0.35, z + 5);
    group.add(hyd);
  }
  for (let x = -168; x <= 168; x += 56) {
    streetLamp(x, -8, 0, 1);
    streetLamp(x + 28, 8, 0, -1);
  }

  // Central plaza: fountain + benches (block centre 30,30).
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.6 }));
  fountain.position.set(30, 0.6, 30);
  fountain.castShadow = true;
  group.add(fountain);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0x3a9ab5, roughness: 0.15, metalness: 0.3 }));
  water.position.set(30, 1.1, 30);
  group.add(water);

  return { group, colliders, palmSpots, buildingSpots, boats };
}
