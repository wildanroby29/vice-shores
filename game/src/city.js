// city.js — the city itself: ground, roads, beach, ocean, pier and marina,
// buildings (6+ palettes, stepped towers, cornices, rooftop props, awnings,
// signs, per-building canvas window textures with lit/unlit windows, base
// darkening), palms (curved trunks, drooping fronds, coconuts), bushes and
// flower beds. `level` 'low' builds simple stand-ins (used to prove WP2).
import { WORLD, PALETTE } from './config.js';

export const PALETTES = [
  { base: 0xe8d9b8, trim: 0xc96f4a, roof: 0x8a6f5c },
  { base: 0xd9a05a, trim: 0x8a3a2a, roof: 0x6b3a2a },
  { base: 0x7ac2c2, trim: 0x2a6a6a, roof: 0x2a4a5a },
  { base: 0xe8b8c8, trim: 0x8a4a6a, roof: 0x6b3a4a },
  { base: 0xd9c49a, trim: 0x8a6a3a, roof: 0x5c4a2a },
  { base: 0xdfe8ee, trim: 0x3a7ca5, roof: 0x5c6b7a },
  { base: 0xf5e6c8, trim: 0xb3543f, roof: 0x7a4a3a },
];

function windowTexture(rng, base, lit) {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 256;
  const g2 = cv.getContext('2d');
  g2.fillStyle = base;
  g2.fillRect(0, 0, 128, 256);
  // Pilasters between window columns + floor bands (breaks the flat slab look).
  g2.fillStyle = 'rgba(255,255,255,0.16)';
  for (let x = 0; x < 128; x += 26) g2.fillRect(x, 0, 4, 256);
  g2.fillStyle = 'rgba(0,0,0,0.14)';
  for (let y = 0; y < 256; y += 22) g2.fillRect(0, y, 128, 3);
  for (let y = 8; y < 248; y += 22) {
    for (let x = 10; x < 118; x += 26) {
      const lit2 = rng() < (lit ? 0.5 : 0.18);
      // Recessed window: dark frame, then the lit/unlit pane.
      g2.fillStyle = 'rgba(0,0,0,0.45)';
      g2.fillRect(x - 2, y - 2, 20, 18);
      g2.fillStyle = lit2 ? '#ffd98a' : '#2a3542';
      g2.fillRect(x, y, 16, 14);
      g2.fillStyle = 'rgba(255,255,255,0.25)';
      g2.fillRect(x, y, 16, 3);
    }
  }
  // Darken toward the base (fake ambient occlusion).
  const gradient = g2.createLinearGradient(0, 180, 0, 256);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
  g2.fillStyle = gradient;
  g2.fillRect(0, 180, 128, 76);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeBuilding(rng, x, z, w, d, h, pal, level, lit) {
  const grp = new THREE.Group();
  const trim = new THREE.MeshStandardMaterial({ color: pal.trim, roughness: 0.8 });
  const roof = new THREE.MeshStandardMaterial({ color: pal.roof, roughness: 0.7 });
  // Core box; the canvas texture gives the window panes their lit/unlit
  // variation, but the facade's relief comes from real geometry below.
  const wall = new THREE.MeshStandardMaterial({ map: windowTexture(rng, `#${pal.base.toString(16).padStart(6, '0')}`, lit), roughness: 0.85 });
  const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
  core.position.y = h / 2;
  core.castShadow = true;
  core.receiveShadow = true;
  grp.add(core);
  if (level === 'full') {
    // Pilasters: vertical ribs between the window columns on the front and
    // both side faces, proud of the facade — the flat-slab look is gone
    // because the wall now has real depth.
    const columns = Math.max(2, Math.floor(w / 4.5));
    for (let col = 0; col <= columns; col += 1) {
      const px = -w / 2 + (col / columns) * w;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.35), trim);
      rib.position.set(px, h / 2, d / 2 + 0.1);
      rib.castShadow = true;
      grp.add(rib);
      const ribBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.35), trim);
      ribBack.position.set(px, h / 2, -d / 2 - 0.1);
      grp.add(ribBack);
    }
    const sideColumns = Math.max(1, Math.floor(d / 4.5));
    for (let col = 0; col <= sideColumns; col += 1) {
      const pz = -d / 2 + (col / sideColumns) * d;
      const ribLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, h, 0.5), trim);
      ribLeft.position.set(-w / 2 - 0.1, h / 2, pz);
      grp.add(ribLeft);
      const ribRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, h, 0.5), trim);
      ribRight.position.set(w / 2 + 0.1, h / 2, pz);
      grp.add(ribRight);
    }
    // Floor bands: a ledge wrapping the whole building at every floor.
    const storeys = Math.max(2, Math.floor(h / 3.6));
    for (let floor = 1; floor < storeys; floor += 1) {
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5), trim);
      ledge.position.y = (floor / storeys) * h;
      ledge.castShadow = true;
      grp.add(ledge);
    }
    // Recessed shopfront glass on the ground floor: dark glossy panes set
    // INTO the facade (proud only 0.05, behind the pilasters), with a warm
    // lit interior so the shop reads at dusk.
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x1a2a3a, roughness: 0.08, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.0 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0xffd98a, emissiveIntensity: 0.55 });
    const shops = Math.max(1, Math.floor(w / 6));
    for (let shop = 0; shop < shops; shop += 1) {
      const sx = -w / 2 + ((shop + 0.5) / shops) * w;
      const window = new THREE.Mesh(new THREE.BoxGeometry(w / shops - 1.2, 2.6, 0.12), glass);
      window.position.set(sx, 1.7, d / 2 + 0.03);
      grp.add(window);
      const light = new THREE.Mesh(new THREE.BoxGeometry(w / shops - 1.6, 2.2, 0.06), glowMat);
      light.position.set(sx, 1.7, d / 2 + 0.08);
      grp.add(light);
    }
    // Cornice ledge at the roof + parapet wall around the roof edge.
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.5, d + 0.8), roof);
    cap.position.y = h + 0.2;
    cap.castShadow = true;
    grp.add(cap);
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.9, d + 0.4), roof);
    parapet.position.y = h + 0.7;
    grp.add(parapet);
    // Setback tower top on tall buildings.
    if (h > 16) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, h * 0.18, d * 0.62), trim);
      tower.position.y = h + h * 0.09;
      tower.castShadow = true;
      grp.add(tower);
      const towerCap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62 + 0.5, 0.4, d * 0.62 + 0.5), roof);
      towerCap.position.y = h + h * 0.18 + 0.2;
      grp.add(towerCap);
    }
    // Rooftop props: AC units, water tank, antenna.
    const cooler = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.6, metalness: 0.4 }));
    cooler.position.set(-w / 4, h + 0.9, -d / 4);
    cooler.castShadow = true;
    grp.add(cooler);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 10), new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.9 }));
    tank.position.set(w / 4, h + 1.3, d / 4);
    tank.castShadow = true;
    grp.add(tank);
    const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 4, 6), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    aerial.position.set(w / 4, h + 3.2, -d / 4);
    grp.add(aerial);
    // Ground-floor awning + emissive sign.
    const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.3, 2.2), trim);
    awning.position.set(0, 3.4, d / 2 + 0.9);
    awning.castShadow = true;
    grp.add(awning);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.1, 0.3), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: pal.trim, emissiveIntensity: 0.9 }));
    sign.position.set(0, 5.2, d / 2 + 0.2);
    grp.add(sign);
    // Balconies with rails on the front face (tall buildings only).
    if (h > 16) {
      const balcony = trim;
      const rail = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.5 });
      const levels = Math.min(3, Math.floor(h / 9));
      for (let storey = 0; storey < levels; storey += 1) {
        const by = 7 + storey * 8;
        if (by > h - 2) break;
        const bx = -w / 4 + (storey % 2) * (w / 2);
        const floor = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 1.4), balcony);
        floor.position.set(bx, by, d / 2 + 0.6);
        floor.castShadow = true;
        grp.add(floor);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 0.08), rail);
        bar.position.set(bx, by + 0.6, d / 2 + 1.25);
        grp.add(bar);
        for (const rx of [-1.5, 1.5]) {
          const edge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 1.4), rail);
          edge.position.set(bx + rx, by + 0.6, d / 2 + 0.6);
          grp.add(edge);
        }
      }
    }
  }
  grp.position.set(x, 0, z);
  return grp;
}

export function makePalm(rng, level, scale) {
  const grp = new THREE.Group();
  const height = (7 + rng() * 3) * scale;
  if (level === 'low') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, height, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a4a }));
    stem.position.y = height / 2;
    grp.add(stem);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.5, 6), new THREE.MeshStandardMaterial({ color: 0x3a7a3a }));
    crown.position.y = height + 1;
    grp.add(crown);
    return grp;
  }
  // Curved trunk: a tapered cylinder bent along a smooth arc, with ring
  // bands (torus) at intervals so the trunk reads as a palm, not a pole.
  const stemGeo = new THREE.CylinderGeometry(0.2, 0.42, height, 10, 8);
  const verts = stemGeo.attributes.position;
  for (let i = 0; i < verts.count; i += 1) {
    const y = verts.getY(i);
    const t = (y + height / 2) / height; // 0 at base, 1 at crown
    verts.setX(i, verts.getX(i) + Math.sin(t * 1.1) * 1.0);
  }
  stemGeo.computeVertexNormals();
  const stem = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0xa8845e, roughness: 0.95 }));
  stem.position.y = height / 2;
  stem.castShadow = true;
  grp.add(stem);
  for (let ring = 0; ring < 5; ring += 1) {
    const ry = height * (0.2 + ring * 0.18);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.36 - ring * 0.03, 0.05, 6, 12), new THREE.MeshStandardMaterial({ color: 0x7a5c3a }));
    band.rotation.x = Math.PI / 2;
    band.position.set(Math.sin((ry / height) * 1.1) * 1.0, ry, 0);
    grp.add(band);
  }
  // 10-13 drooping fronds, each bent along an arc (tip curls down) and
  // warm-lit green (emissive lift) so they never read as black silhouettes.
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a9a3a, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x1a2a10, emissiveIntensity: 0.55 });
  const count = 10 + Math.floor(rng() * 4);
  const topX = Math.sin(1.1) * 1.0;
  for (let i = 0; i < count; i += 1) {
    const length = 3.4 + rng() * 1.4;
    const blade = new THREE.PlaneGeometry(1.0, length, 1, 8);
    const p = blade.attributes.position;
    for (let v = 0; v < p.count; v += 1) {
      const y = p.getY(v);
      const t = (y + length / 2) / length; // 0 at base, 1 at tip
      p.setZ(v, -t * t * 2.0); // droop arc: tip curls down
      p.setX(v, p.getX(v) * (1 - t * 0.45)); // taper toward the tip
    }
    blade.computeVertexNormals();
    const leaf = new THREE.Mesh(blade, leafMat);
    const ang = (i / count) * Math.PI * 2 + rng() * 0.25;
    leaf.position.set(topX, height, 0);
    leaf.rotation.set(-0.35 - rng() * 0.55, ang, 0);
    leaf.translateY(length / 2);
    leaf.castShadow = true;
    grp.add(leaf);
  }
  // Coconuts clustered under the crown.
  for (let i = 0; i < 3; i += 1) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 }));
    nut.position.set(topX + 0.4 + i * 0.22, height - 0.35, 0.35 - i * 0.28);
    grp.add(nut);
  }
  return grp;
}

export function createCity(scn, rng, level, lit) {
  const grp = new THREE.Group();
  scn.add(grp);
  const colliders = []; // {x0,z0,x1,z1} building footprints for driving + minimap
  const palmAt = [];
  const buildAt = [];

  // Ground: grass base, asphalt roads, sidewalks, sand beach, sea.
  // The ground + sea run to the horizon (fog far) so the world edge / void
  // is never visible in any shot.
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.receiveShadow = true;
  grp.add(lawn);

  const tar = new THREE.MeshStandardMaterial({ color: PALETTE.asphalt, roughness: 0.95 });
  const walk = new THREE.MeshStandardMaterial({ color: PALETTE.sidewalk, roughness: 1 });
  const sand = new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 });
  const sea = new THREE.MeshStandardMaterial({ color: PALETTE.sea, roughness: 0.4, metalness: 0.0 });
  for (let i = -4; i <= 4; i += 1) {
    const coord = i * (WORLD.block + WORLD.street);
    const roadEast = new THREE.Mesh(new THREE.PlaneGeometry(440, WORLD.street), tar);
    roadEast.rotation.x = -Math.PI / 2;
    roadEast.position.set(0, 0.02, coord);
    roadEast.receiveShadow = true;
    grp.add(roadEast);
    const roadNorth = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.street, 440), tar);
    roadNorth.rotation.x = -Math.PI / 2;
    roadNorth.position.set(coord, 0.02, 0);
    roadNorth.receiveShadow = true;
    grp.add(roadNorth);
    // Centre dashes.
    for (let dist = -200; dist < 200; dist += 12) {
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), new THREE.MeshStandardMaterial({ color: PALETTE.asphaltLine }));
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(dist, 0.04, coord);
      grp.add(mark);
      const mark2 = mark.clone();
      mark2.rotation.z = Math.PI / 2;
      mark2.position.set(coord, 0.04, dist);
      grp.add(mark2);
    }
  }
  // Beach strip + sea to the east and south (sand stays clear of the roads).
  // NOTE: the ground/sand/sea planes are subdivided (not 1x1): a single
  // 460 m triangle viewed at a grazing angle loses the depth fight to the
  // grass below it (depth is interpolated across the whole triangle), which
  // is why the sea read as green lawn in the pier shot.
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(44, 460, 4, 32), sand);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(210, 0.05, 0);
  beach.receiveShadow = true;
  grp.add(beach);
  const beachSouth = new THREE.Mesh(new THREE.PlaneGeometry(460, 44, 32, 4), sand);
  beachSouth.rotation.x = -Math.PI / 2;
  beachSouth.position.set(0, 0.05, 210);
  beachSouth.receiveShadow = true;
  grp.add(beachSouth);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1568, 2000, 32, 32), sea);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(1016, 0.12, 0);
  grp.add(ocean);
  const oceanSouth = new THREE.Mesh(new THREE.PlaneGeometry(2000, 1200, 32, 24), sea);
  oceanSouth.rotation.x = -Math.PI / 2;
  oceanSouth.position.set(0, 0.12, 900);
  grp.add(oceanSouth);

  // Buildings on the blocks BETWEEN the roads (block centres at +30).
  for (let bx = -4; bx <= 4; bx += 1) {
    for (let bz = -4; bz <= 4; bz += 1) {
      if (bx >= 3) continue; // beach side
      if (bx === 0 && bz === 0) continue; // central plaza
      const cx = bx * (WORLD.block + WORLD.street) + 30;
      const cz = bz * (WORLD.block + WORLD.street) + 30;
      const w = 18 + rng() * 14;
      const d = 18 + rng() * 14;
      const h = 10 + rng() * 26 + (Math.abs(bx) + Math.abs(bz) < 3 ? 10 : 0);
      const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
      const tower = makeBuilding(rng, cx, cz, w, d, h, pal, level, lit);
      grp.add(tower);
      colliders.push({ x0: cx - w / 2 - 1, z0: cz - d / 2 - 1, x1: cx + w / 2 + 1, z1: cz + d / 2 + 1 });
      buildAt.push({ x: cx, z: cz, w, d, h, color: pal.base });
    }
  }

  // Palms along the boulevard (east road) and the beach strip, 2-3 sizes.
  for (let z = -190; z <= 190; z += 18) {
    const size = 0.85 + (Math.abs(z) % 3) * 0.2;
    const palmA = makePalm(rng, level, size);
    palmA.position.set(168, 0, z);
    grp.add(palmA);
    palmAt.push({ x: 168, z });
    if (z % 36 === 0) {
      const palmB = makePalm(rng, level, size * 1.15);
      palmB.position.set(150, 0, z + 9);
      grp.add(palmB);
      palmAt.push({ x: 150, z: z + 9 });
    }
  }
  // Bushes and low flower beds on the beach strip (grounded planters, never
  // floating coloured spheres). Small (r<=1) and set back on the sand at
  // x=197, clear of the boulevard camera lines — the big domes at x=186
  // sat on the road edge and read as giant green blobs in the title/on-foot
  // shots.
  const bush = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 1 });
  const petals = [0xe85a8a, 0xf2c94c, 0xe85a3a, 0x9a5ae8];
  for (let z = -180; z <= 180; z += 24) {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.7 + rng() * 0.3, 8, 6), bush);
    shrub.position.set(197, 0.45, z);
    shrub.scale.y = 0.55;
    shrub.castShadow = true;
    grp.add(shrub);
    const planter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 1.3), new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 1 }));
    planter.position.set(197, 0.2, z + 6);
    planter.castShadow = true;
    grp.add(planter);
    for (let bloom = 0; bloom < 6; bloom += 1) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 5), new THREE.MeshStandardMaterial({ color: petals[Math.floor(rng() * 4)] }));
      flower.scale.y = 0.45;
      flower.position.set(195.4 + (bloom % 3) * 1.6, 0.45, z + 5.6 + Math.floor(bloom / 3) * 0.8);
      grp.add(flower);
    }
  }

  // Pier: wooden deck running south into the sea + marina boats.
  // Plank deck (canvas texture), side rails, lamp posts, wakes behind boats.
  const deckCanvas = document.createElement('canvas');
  deckCanvas.width = 64;
  deckCanvas.height = 256;
  const g2 = deckCanvas.getContext('2d');
  g2.fillStyle = '#a08055';
  g2.fillRect(0, 0, 64, 256);
  g2.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 0; y < 256; y += 12) g2.fillRect(0, y, 64, 2);
  g2.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = 0; x < 64; x += 16) g2.fillRect(x, 0, 2, 256);
  const deckTex = new THREE.CanvasTexture(deckCanvas);
  deckTex.colorSpace = THREE.SRGBColorSpace;
  const deckMat = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.95 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 90), deckMat);
  deck.position.set(185, 0.8, 195);
  deck.castShadow = true;
  deck.receiveShadow = true;
  grp.add(deck);
  for (let i = 0; i < 8; i += 1) {
    const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2a }));
    pile.position.set(181 + (i % 2) * 8, 0.4, 160 + i * 10);
    grp.add(pile);
  }
  // Side rails (two horizontal bars each side) + rail posts.
  const rail = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.9 });
  for (const rx of [180.4, 189.6]) {
    for (const ry of [1.5, 2.1]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 88, 6), rail);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(rx, ry, 195);
      grp.add(bar);
    }
    for (let z = 155; z <= 235; z += 10) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6), rail);
      post.position.set(rx, 1.4, z);
      grp.add(post);
    }
  }
  // Lamp posts along the pier (emissive heads + glow).
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 64;
  glowCanvas.height = 64;
  const lg = glowCanvas.getContext('2d');
  const gradient = lg.createRadialGradient(32, 32, 2, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(255,220,150,0.95)');
  gradient.addColorStop(1, 'rgba(255,220,150,0)');
  lg.fillStyle = gradient;
  lg.fillRect(0, 0, 64, 64);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  for (let z = 160; z <= 232; z += 12) {
    for (const lx of [181.2, 188.8]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.4, 6), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.5 }));
      post.position.set(lx, 2.5, z);
      grp.add(post);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd98a, emissiveIntensity: 1.2 }));
      bulb.position.set(lx, 4.3, z);
      grp.add(bulb);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd98a, transparent: true, opacity: 0.25, depthWrite: false }));
      halo.position.set(lx, 4.3, z);
      halo.scale.set(1.2, 1.2, 1);
      grp.add(halo);
    }
  }
  const boats = [];
  const hullCols = [0xf2f2f2, 0x3a7ca5, 0xe8b83a, 0xc96f4a];
  // Hull profile (side view, x = along the boat, bow at +x): a pointed bow
  // rising out of the water, a flat run to a square transom at the stern.
  // Extruded across the beam with a bevel — a real boat hull, not a box.
  function hullProfile(pts, beam, bevel, material) {
    const outline = new THREE.Shape();
    outline.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 1) outline.lineTo(pts[i][0], pts[i][1]);
    outline.closePath();
    const depth = Math.max(0.05, beam - bevel * 2);
    const form = new THREE.ExtrudeGeometry(outline, {
      depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1,
    });
    form.rotateY(-Math.PI / 2);
    form.translate(depth / 2, 0, 0);
    form.computeVertexNormals();
    const hull = new THREE.Mesh(form, material);
    hull.castShadow = true;
    return hull;
  }
  for (let i = 0; i < 6; i += 1) {
    const ship = new THREE.Group();
    const hull = hullProfile(
      [[4.5, 0.5], [4.2, 1.1], [2.0, 1.2], [-4.2, 1.2], [-4.5, 0.9], [-4.5, 0.2], [2.0, 0.0], [4.5, 0.5]],
      3.6, 0.15, new THREE.MeshStandardMaterial({ color: hullCols[i % 4], roughness: 0.45 }),
    );
    hull.position.y = 0.1;
    ship.add(hull);
    // Deck + cabin with windows + a small mast.
    const floor = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 7.6), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 }));
    floor.position.set(0, 1.28, -0.4);
    ship.add(floor);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 2.8), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }));
    cabin.position.set(0, 2.0, -1.2);
    cabin.castShadow = true;
    ship.add(cabin);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 2.0), new THREE.MeshPhysicalMaterial({ color: 0x1a2a3a, roughness: 0.1, clearcoat: 1 }));
    glass.position.set(0, 2.2, -1.0);
    ship.add(glass);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 0.6, roughness: 0.4 }));
    mast.position.set(0, 3.2, -1.2);
    ship.add(mast);
    // Boats IN the water east of the pier (x>=242; the sand strip runs to
    // x=232, so the old x=205-229 berths sat on dry sand and read as boxes
    // on land). Close enough to the pier end to read in the pier shot.
    ship.position.set(242 + (i % 3) * 14, 0.2, 168 + Math.floor(i / 3) * 55);
    ship.rotation.y = (rng() - 0.5) * 0.4;
    grp.add(ship);
    boats.push(ship);
    // Wake: a white V (two fading trails) + a centre line behind the boat.
    const wake = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    for (const side of [-1, 1]) {
      const trail = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 12), wake);
      trail.rotation.x = -Math.PI / 2;
      trail.rotation.z = ship.rotation.y + side * 0.35;
      trail.position.set(
        ship.position.x - Math.sin(ship.rotation.y) * 8 + Math.cos(ship.rotation.y) * side * 2,
        0.12,
        ship.position.z - Math.cos(ship.rotation.y) * 8 - Math.sin(ship.rotation.y) * side * 2,
      );
      grp.add(trail);
    }
    const trailMid = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65, depthWrite: false }));
    trailMid.rotation.x = -Math.PI / 2;
    trailMid.rotation.z = ship.rotation.y;
    trailMid.position.set(ship.position.x - Math.sin(ship.rotation.y) * 8, 0.12, ship.position.z - Math.cos(ship.rotation.y) * 8);
    grp.add(trailMid);
  }
  // Sun glitter on the sea east of the pier (bright glints on the water).
  const sparkle = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffd98a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 26; i += 1) {
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + rng() * 2.2, 0.5 + rng() * 0.6), sparkle);
    glint.rotation.x = -Math.PI / 2;
    glint.rotation.z = rng() * Math.PI;
    glint.position.set(238 + rng() * 40, 0.12, 150 + rng() * 85);
    grp.add(glint);
  }

  // Street dressing: sidewalks, crosswalks, edge lines, double-yellow centre
  // line, manhole covers, street lamps, benches, bins, bollards, hydrants.
  // (The boulevard x=180 and the central road z=0 are the shot roads.)
  const walkMat = new THREE.MeshStandardMaterial({ color: PALETTE.sidewalk, roughness: 1 });
  const walkEast = new THREE.Mesh(new THREE.PlaneGeometry(4, 440), walkMat);
  walkEast.rotation.x = -Math.PI / 2;
  walkEast.position.set(170, 0.025, 0);
  walkEast.receiveShadow = true;
  grp.add(walkEast);
  for (const sz of [-10, 10]) {
    const walkSide = new THREE.Mesh(new THREE.PlaneGeometry(440, 4), walkMat);
    walkSide.rotation.x = -Math.PI / 2;
    walkSide.position.set(0, 0.025, sz);
    walkSide.receiveShadow = true;
    grp.add(walkSide);
  }
  const cross = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
  function crosswalk(cx, cz, alongX) {
    for (let i = -3; i <= 3; i += 1) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? 1.1 : 7.2, alongX ? 7.2 : 1.1), cross);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(cx + (alongX ? 0 : i * 1.9), 0.06, cz + (alongX ? i * 1.9 : 0));
      bar.renderOrder = 2;
      grp.add(bar);
    }
  }
  for (const cz of [-120, -60, 0, 60, 120]) crosswalk(180, cz, false);
  for (const cx of [-120, -60, 60, 120]) crosswalk(cx, 0, true);
  const edge = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
  for (const ex of [172.5, 187.5]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 440), edge);
    line.rotation.x = -Math.PI / 2;
    line.position.set(ex, 0.05, 0);
    line.renderOrder = 2;
    grp.add(line);
  }
  for (const ez of [-7.5, 7.5]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(440, 0.25), edge);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.05, ez);
    line.renderOrder = 2;
    grp.add(line);
  }
  // Second yellow dash row (double-yellow centre line) on the two shot roads.
  const dash = new THREE.MeshStandardMaterial({ color: PALETTE.asphaltLine });
  for (let dist = -200; dist < 200; dist += 12) {
    const dashV = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), dash);
    dashV.rotation.x = -Math.PI / 2;
    dashV.position.set(180.8, 0.04, dist);
    grp.add(dashV);
    const dashH = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), dash);
    dashH.rotation.x = -Math.PI / 2;
    dashH.position.set(dist, 0.04, 0.8);
    grp.add(dashH);
  }
  const hole = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9 });
  for (let i = 0; i < 14; i += 1) {
    const cover = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12), hole);
    cover.rotation.x = -Math.PI / 2;
    cover.position.set(-200 + rng() * 400, 0.05, -200 + rng() * 400);
    cover.renderOrder = 1;
    grp.add(cover);
  }
  const pole = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.5 });
  const bench = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.9 });
  const bin = new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.8, metalness: 0.3 });
  function streetLamp(x, z, dx, dz) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.4, 6), pole);
    post.position.set(x, 2.7, z);
    post.castShadow = true;
    grp.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(dx !== 0 ? 1.4 : 0.1, 0.1, dz !== 0 ? 1.4 : 0.1), pole);
    arm.position.set(x + dx * 0.7, 5.3, z + dz * 0.7);
    grp.add(arm);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd98a, emissiveIntensity: 1.2 }));
    bulb.position.set(x + dx * 1.3, 5.2, z + dz * 1.3);
    grp.add(bulb);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd98a, transparent: true, opacity: 0.25, depthWrite: false }));
    halo.position.set(x + dx * 1.3, 5.2, z + dz * 1.3);
    halo.scale.set(1.2, 1.2, 1);
    grp.add(halo);
  }
  for (let z = -168; z <= 168; z += 28) {
    streetLamp(172, z, 1, 0);
    streetLamp(188, z + 14, -1, 0);
    const seat = new THREE.Group();
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.6), bench);
    plank.position.y = 0.5;
    seat.add(plank);
    const rest = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.1), bench);
    rest.position.set(0, 0.85, -0.28);
    seat.add(rest);
    seat.position.set(170.5, 0, z + 7);
    seat.rotation.y = Math.PI / 2;
    grp.add(seat);
    const binMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.9, 8), bin);
    binMesh.position.set(170.5, 0.45, z + 11);
    binMesh.castShadow = true;
    grp.add(binMesh);
    for (let b = 0; b < 3; b += 1) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 6), pole);
      bollard.position.set(169.5, 0.45, z + 2 + b * 3.5);
      grp.add(bollard);
    }
    const hydrant = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.7 }));
    hydrant.position.set(189.5, 0.35, z + 5);
    grp.add(hydrant);
  }
  for (let x = -168; x <= 168; x += 56) {
    streetLamp(x, -8, 0, 1);
    streetLamp(x + 28, 8, 0, -1);
  }

  // Central plaza: fountain + benches (block centre 30,30).
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.6 }));
  fountain.position.set(30, 0.6, 30);
  fountain.castShadow = true;
  grp.add(fountain);
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0x3a9ab5, roughness: 0.15, metalness: 0.3 }));
  pond.position.set(30, 1.1, 30);
  grp.add(pond);

  return { group: grp, colliders, palmSpots: palmAt, buildingSpots: buildAt, boats };
}
