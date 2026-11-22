// The city of Vice Shores: a street grid west of a wide beachfront boulevard,
// the beach and the ocean east of it, a pier and a marina, parks, a market,
// and the Dockside Customs workshop where the GT gets its airbrush paint.
// Canvas textures carry the detail (lit windows, road dashes, neon signs) so
// the mesh count stays low and the city still reads as designed, not rough.
import { CITY, BOULEVARD_X, BEACH_X, OCEAN_X, PIER_Z, GARAGE, PALETTE } from './config.js';
import { makeRng, range, rangeInt, pick, chance } from './random.js';

const rng = makeRng(20261122);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function windowTexture(base, lit) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 12; y < h - 12; y += 22) {
      for (let x = 10; x < w - 10; x += 20) {
        const on = rng() < 0.62;
        g.fillStyle = on ? lit : 'rgba(20,24,34,0.85)';
        g.fillRect(x, y, 12, 14);
      }
    }
  });
}

function roadTexture() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#3a3f4a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f7c948';
    g.fillRect(w / 2 - 2, 0, 4, h);
    g.fillStyle = '#e8e8e8';
    for (let y = 8; y < h; y += 42) { g.fillRect(6, y, 3, 22); g.fillRect(w - 9, y, 3, 22); }
  });
}

function signTexture(text, fg, bg) {
  return canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.font = '900 44px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

function awningTexture(c1, c2) {
  return canvasTex(128, 64, (g, w, h) => {
    for (let x = 0; x < w; x += 16) { g.fillStyle = (x / 16) % 2 ? c1 : c2; g.fillRect(x, 0, 16, h); }
  });
}

const WIN_TEX = [
  windowTexture('#f5e6c8', '#ffd76a'), windowTexture('#e8a56b', '#ffe9a8'),
  windowTexture('#7fc4b8', '#fff3b0'), windowTexture('#e87a5d', '#ffd76a'),
];
const ROAD_TEX = roadTexture();
const SIGNS = ['SURF', 'HOTEL', 'TACOS', 'BAR', 'PIER', 'NEON', 'CLUB', 'CAFE'].map((t, i) =>
  signTexture(t, ['#ff4d6d', '#2ee6c8', '#ffc93c', '#7a5cff'][i % 4], '#14101e'));

function mat(color, opts) {
  return new THREE.MeshLambertMaterial({ color, ...(opts || {}) });
}

function box(w, h, d, material, x, y, z, group) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

function palm(x, z, group, s) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 7, 6), mat(0x8a6a4a));
  trunk.position.y = 3.5; trunk.rotation.z = 0.08; g.add(trunk);
  const frondMat = mat(0x3f9e4d);
  for (let i = 0; i < 6; i += 1) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.4, 4), frondMat);
    const a = (i / 6) * Math.PI * 2;
    f.position.set(Math.cos(a) * 1.6, 7.1, Math.sin(a) * 1.6);
    f.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    f.scale.set(1, 1, 0.28);
    g.add(f);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(s || 1);
  group.add(g);
  return g;
}

function tree(x, z, group) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6), mat(0x7a5a3a));
  trunk.position.y = 1.2; g.add(trunk);
  const top = new THREE.Mesh(new THREE.SphereGeometry(1.9, 8, 6), mat(0x4da34d));
  top.position.y = 3.6; top.scale.y = 0.85; g.add(top);
  g.position.set(x, 0, z);
  group.add(g);
}

// Roads: centrelines on multiples of the pitch, from -182 to +182, plus the
// beachfront boulevard at BOULEVARD_X.
function buildRoads(group) {
  const roadMat = new THREE.MeshLambertMaterial({ map: ROAD_TEX });
  const walkMat = mat(0xc9bda6);
  const lines = [];
  for (let v = -CITY.half; v <= CITY.half; v += CITY.pitch) lines.push(v);
  for (const v of lines) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(CITY.road, CITY.half * 2), roadMat);
    ns.rotation.x = -Math.PI / 2; ns.position.set(v, 0.02, 0); group.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(CITY.half * 2, CITY.road), roadMat);
    ew.rotation.x = -Math.PI / 2; ew.position.set(0, 0.02, v); group.add(ew);
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(3, CITY.half * 2), walkMat);
    w1.rotation.x = -Math.PI / 2; w1.position.set(v - 7.5, 0.03, 0); group.add(w1);
    const w2 = w1.clone(); w2.position.x = v + 7.5; group.add(w2);
    const w3 = new THREE.Mesh(new THREE.PlaneGeometry(CITY.half * 2, 3), walkMat);
    w3.rotation.x = -Math.PI / 2; w3.position.set(0, 0.03, v - 7.5); group.add(w3);
    const w4 = w3.clone(); w4.position.z = v + 7.5; group.add(w4);
  }
  // Beachfront boulevard: wider, palm-lined, with the ocean beside it.
  const blvd = new THREE.Mesh(new THREE.PlaneGeometry(18, CITY.half * 2), roadMat);
  blvd.rotation.x = -Math.PI / 2; blvd.position.set(BOULEVARD_X, 0.02, 0); group.add(blvd);
  const blvdWalk = new THREE.Mesh(new THREE.PlaneGeometry(6, CITY.half * 2), walkMat);
  blvdWalk.rotation.x = -Math.PI / 2; blvdWalk.position.set(BOULEVARD_X - 12, 0.03, 0); group.add(blvdWalk);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(22, CITY.half * 2 + 40), mat(0xf2d8a0));
  sand.rotation.x = -Math.PI / 2; sand.position.set(BEACH_X + 8, 0.01, 0); group.add(sand);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(120, CITY.half * 2 + 120), mat(PALETTE.ocean));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(OCEAN_X + 62, 0.0, 0); group.add(ocean);
  // Base ground under the whole city.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY.half * 2 + 260, CITY.half * 2 + 40), mat(0x8a7f6a));
  ground.rotation.x = -Math.PI / 2; ground.position.set(10, -0.05, 0); group.add(ground);
}

function buildBuildings(group) {
  const mats = WIN_TEX.map((t) => new THREE.MeshLambertMaterial({ map: t, emissive: 0x665533, emissiveMap: t, emissiveIntensity: 0.55 }));
  const roofMat = mat(0x5a5148);
  for (let bx = -CITY.half; bx < BOULEVARD_X - 20; bx += CITY.pitch) {
    for (let bz = -CITY.half; bz <= CITY.half; bz += CITY.pitch) {
      if (chance(rng, 0.22)) continue; // park or lot
      const cx = bx + 26, cz = bz + 26;
      const n = rangeInt(rng, 1, 2);
      for (let i = 0; i < n; i += 1) {
        const w = range(rng, 14, 26), d = range(rng, 14, 26);
        const h = range(rng, 10, 58);
        const x = cx + (i === 0 ? -6 : 8) + range(rng, -3, 3);
        const z = cz + (i === 0 ? -6 : 8) + range(rng, -3, 3);
        const b = box(w, h, d, mats[rangeInt(rng, 0, mats.length - 1)], x, h / 2, z, group);
        b.userData.isBuilding = true;
        box(w + 0.6, 1, d + 0.6, roofMat, x, h + 0.5, z, group);
        if (chance(rng, 0.5)) {
          const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(9, 3.4),
            new THREE.MeshBasicMaterial({ map: SIGNS[rangeInt(rng, 0, SIGNS.length - 1)] }),
          );
          sign.position.set(x, Math.min(h - 2, 14), z + d / 2 + 0.15);
          group.add(sign);
        }
      }
    }
  }
}

function buildParks(group) {
  const grass = mat(0x5da24d);
  for (let i = 0; i < 5; i += 1) {
    const x = range(rng, -150, 100), z = range(rng, -150, 150);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), grass);
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.04, z); group.add(p);
    for (let t = 0; t < 5; t += 1) tree(x + range(rng, -12, 12), z + range(rng, -12, 12), group);
  }
  // Market stalls near the boulevard.
  const awn1 = new THREE.MeshLambertMaterial({ map: awningTexture('#ff4d6d', '#fff3e0') });
  const awn2 = new THREE.MeshLambertMaterial({ map: awningTexture('#2ee6c8', '#fff3e0') });
  for (let i = 0; i < 6; i += 1) {
    const x = BOULEVARD_X - 22 - (i % 2) * 8, z = -60 + i * 18;
    box(5, 2.4, 4, mat(0x8a6a4a), x, 1.2, z, group);
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), i % 2 ? awn1 : awn2);
    awn.rotation.x = -Math.PI / 2; awn.rotation.z = 0.25; awn.position.set(x, 3.1, z); group.add(awn);
  }
}

function buildPier(group) {
  const wood = mat(0x9a7a52);
  for (let x = BEACH_X; x < OCEAN_X + 46; x += 4) {
    box(3.6, 0.5, 10, wood, x, 0.6, PIER_Z, group);
  }
  for (let x = BEACH_X + 6; x < OCEAN_X + 46; x += 12) {
    box(0.5, 2.4, 0.5, wood, x, -0.4, PIER_Z - 4.6, group);
    box(0.5, 2.4, 0.5, wood, x, -0.4, PIER_Z + 4.6, group);
  }
  // Boats in the marina.
  const hullMat = mat(0xf2f2f2);
  for (let i = 0; i < 4; i += 1) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 1.4, 2.6), hullMat);
    hull.position.y = 0.4; g.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 2), mat(pick(rng, PALETTE.building)));
    cab.position.set(-0.6, 1.8, 0); g.add(cab);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 5), mat(0x666666));
    mast.position.set(1.4, 3.2, 0); g.add(mast);
    g.position.set(OCEAN_X + 18 + i * 9, 0.2, PIER_Z + 26 + (i % 2) * 14);
    g.rotation.y = range(rng, -0.4, 0.4);
    group.add(g);
  }
  // Beach umbrellas.
  for (let i = 0; i < 8; i += 1) {
    const x = BEACH_X + range(rng, 2, 14), z = range(rng, -160, 160);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 5), mat(0xdddddd));
    pole.position.set(x, 1.3, z); group.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 8), mat(pick(rng, [0xff4d6d, 0xffc93c, 0x2ee6c8])));
    top.position.set(x, 3, z); group.add(top);
  }
}

// The Dockside Customs workshop: an open-front garage interior where the GT
// sits on a lift being airbrush-painted. Returns the spots the shot needs.
export function buildWorkshop(group) {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), mat(0x6a6a72));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05; g.add(floor);
  const wallMat = mat(0x8a7a68);
  box(26, 9, 0.6, wallMat, 0, 4.5, -10, g);
  box(0.6, 9, 20, wallMat, -13, 4.5, 0, g);
  box(0.6, 9, 20, wallMat, 13, 4.5, 0, g);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), mat(0x4a423e));
  roof.rotation.x = Math.PI / 2; roof.position.y = 9; g.add(roof);
  // Ceiling lights.
  for (let i = -1; i <= 1; i += 1) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 1), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    lamp.position.set(i * 7, 8.7, 0); g.add(lamp);
  }
  // Warm interior lights so the workshop reads bright, not gloomy.
  const warm1 = new THREE.PointLight(0xfff0d8, 7, 30, 1.2);
  warm1.position.set(0, 7, 0); g.add(warm1);
  const warm2 = new THREE.PointLight(0xfff0d8, 4, 26, 1.2);
  warm2.position.set(6, 6, -5); g.add(warm2);
  // Lift: two posts and a platform.
  box(0.7, 3.4, 0.7, mat(0x8a1f1f), -3.4, 1.7, 0, g);
  box(0.7, 3.4, 0.7, mat(0x8a1f1f), 3.4, 1.7, 0, g);
  box(8.4, 0.4, 3.4, mat(0x2a2a2e), 0, 0.9, 0, g);
  // Paint cans, workbench, tyres.
  for (let i = 0; i < 5; i += 1) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 8),
      mat(pick(rng, [0xff4d6d, 0xffc93c, 0x2ee6c8, 0xff6b1a, 0x7a5cff])));
    can.position.set(-9 + i * 1.1, 0.4, -8.4); g.add(can);
  }
  box(7, 1, 2.4, mat(0x7a5a3a), -8.5, 0.9, 6, g);
  for (let i = 0; i < 3; i += 1) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.32, 8, 14), mat(0x1a1a1a));
    tyre.position.set(9.5, 0.75, -6 + i * 3.4); tyre.rotation.y = Math.PI / 2; g.add(tyre);
  }
  // Airbrush mist: a translucent cone from the painter's gun toward the car.
  // (Local coords — after the group's turn this lands between painter and car.)
  const mist = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 2.2, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff6b1a, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
  );
  mist.position.set(1.5, 1.6, -1.5);
  mist.rotation.z = -Math.PI / 2.4;
  g.add(mist);
  // A "CUSTOMS" neon sign on the back wall.
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.5), new THREE.MeshBasicMaterial({ map: signTexture('CUSTOMS', '#ff8a3d', '#14101e') }));
  sign.position.set(0, 6.4, -9.6); g.add(sign);
  g.position.set(GARAGE.x, 0, GARAGE.z);
  g.rotation.y = -Math.PI / 2; // open front faces the boulevard (east)
  group.add(g);
  return {
    carSpot: { x: GARAGE.x, z: GARAGE.z, angle: Math.PI / 2 },
    painterSpot: { x: GARAGE.x + 6.4, z: GARAGE.z + 1.4 },
    mist,
  };
}

export function buildCity(scene) {
  const group = new THREE.Group();
  scene.add(group);
  buildRoads(group);
  buildBuildings(group);
  buildParks(group);
  buildPier(group);
  // Palms along the boulevard and the beach.
  for (let z = -170; z <= 170; z += 17) {
    palm(BOULEVARD_X - 13.5, z + range(rng, -3, 3), group, range(rng, 0.9, 1.25));
    if (chance(rng, 0.6)) palm(BEACH_X + 6, z + 8, group, range(rng, 0.9, 1.3));
  }
  const workshop = buildWorkshop(group);
  return { group, workshop };
}
