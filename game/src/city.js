// Vice Shores city layout on the XZ plane (x east, z south, ground y = 0). The same grid
// the 2D draft used, now as real 3D footprints: roads, blocks, parks, lots, the beach,
// the river and the bridge, plus every mission landmark. Collision is circle-vs-rect in
// XZ, so the world rules never have to know about three.js.

import { CITY, NEON_SIGNS } from './config.js';
import { createRandom, pick, range } from './random.js';

export const ROADS_V = [300, 780, 1260, 1740, 2220]; // roads running north-south (along z)
export const ROADS_H = [300, 700, 1100, 1500]; // roads running east-west (along x)
export const ROAD_W = 96;
export const BEACH_Z = 1700;
export const WATER_Z = 1760;
export const RIVER_X = 2380;

export const SPOTS = {
  safehouse: { x: 540, z: 500, label: 'SAFEHOUSE' },
  garage: { x: 1500, z: 500, label: 'GARAGE' },
  bank: { x: 1020, z: 500, label: 'BANK' },
  hotel: { x: 1980, z: 900, label: 'HOTEL CORAL' },
  pier: { x: 1260, z: 1700, label: 'PIER 9' },
  coupe: { x: 300, z: 560, label: 'BLUE COUPE' },
  coralRow: { x: 2220, z: 300, label: 'CORAL ROW' },
  package: { x: 1020, z: 900, label: 'PACKAGE' },
  airportRd: { x: 2220, z: 1500, label: 'AIRPORT RD' },
  sportCar: { x: 1500, z: 1300, label: 'SPORTS CAR' },
  lotA: { x: 1020, z: 1300, label: 'LOT A' },
  lotB: { x: 1500, z: 1300, label: 'LOT B' },
  palmPark: { x: 1020, z: 900, label: 'PALM PARK' },
  coralPark: { x: 1980, z: 500, label: 'CORAL PARK' },
  beach: { x: 1260, z: 1730, label: 'BEACH' },
};

const COLS = [
  [60, 252],
  [348, 732],
  [828, 1212],
  [1308, 1692],
  [1788, 2172],
  [2268, 2380],
];
const ROWS = [
  [60, 252],
  [348, 652],
  [748, 1052],
  [1148, 1452],
  [1548, 1692],
];

const LANDMARKS = {
  '1,1': { kind: 'safehouse', sign: 'SAFEHOUSE', h: 34 },
  '2,1': { kind: 'bank', sign: 'BANK', h: 70 },
  '3,1': { kind: 'garage', sign: 'GARAGE', h: 40 },
  '4,2': { kind: 'hotel', sign: 'HOTEL CORAL', h: 120 },
};
const PARKS = ['2,2', '4,1'];
const LOTS = ['2,3', '3,3'];

export function buildCity(seed) {
  const random = createRandom(seed);
  const buildings = [];
  const palms = [];
  const solids = [];
  let signIdx = 0;

  for (let c = 0; c < COLS.length; c++) {
    for (let r = 0; r < ROWS.length; r++) {
      const key = `${c},${r}`;
      if (PARKS.includes(key) || LOTS.includes(key)) continue;
      const [x0, x1] = COLS[c];
      const [z0, z1] = ROWS[r];
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const w = x1 - x0 - 24;
      const d = z1 - z0 - 24;
      const lm = LANDMARKS[key];
      const h = lm ? lm.h : Math.round(range(random, 42, 132));
      const sign = lm ? lm.sign : (random() < 0.55 ? NEON_SIGNS[signIdx++ % NEON_SIGNS.length] : '');
      const hue = pick(random, [0x3a4260, 0x46355e, 0x2f4a5e, 0x4a3a52, 0x37425e]);
      const b = { x: cx, z: cz, w, d, h, sign, color: hue, kind: lm ? lm.kind : 'block' };
      buildings.push(b);
      solids.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 });
    }
  }

  // Palm Park and Coral Park: palms + a few benches (no solids, palms are decoration).
  for (const key of PARKS) {
    const [c, r] = key.split(',').map(Number);
    const [x0, x1] = COLS[c];
    const [z0, z1] = ROWS[r];
    for (let i = 0; i < 10; i++) {
      palms.push({ x: range(random, x0 + 30, x1 - 30), z: range(random, z0 + 30, z1 - 30), s: range(random, 0.85, 1.35) });
    }
  }
  // Boulevard palms along the beachfront road (z = 1500) and on the sand.
  for (let x = 120; x < 2380; x += 190) {
    palms.push({ x: x + range(random, -30, 30), z: 1568, s: range(random, 0.9, 1.3) });
  }
  for (let x = 200; x < 2380; x += 260) {
    palms.push({ x: x + range(random, -40, 40), z: 1732, s: range(random, 1.0, 1.5) });
  }

  // The river (east edge) blocks movement except on the bridge at z = 1100.
  solids.push({ x0: RIVER_X, z0: 0, x1: CITY.width, z1: 1040 });
  solids.push({ x0: RIVER_X, z0: 1160, x1: CITY.width, z1: CITY.height });
  // The ocean blocks walking in past the waterline.
  solids.push({ x0: 0, z0: WATER_Z, x1: RIVER_X, z1: CITY.height });

  return { buildings, palms, solids };
}

export function hitsSolid(solids, x, z, r) {
  for (const s of solids) {
    const nx = Math.max(s.x0, Math.min(x, s.x1));
    const nz = Math.max(s.z0, Math.min(z, s.z1));
    const dx = x - nx;
    const dz = z - nz;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

export function moveCircle(solids, x, z, dx, dz, r) {
  let nx = x + dx;
  let nz = z + dz;
  if (!hitsSolid(solids, nx, z, r)) x = nx;
  if (!hitsSolid(solids, x, nz, r)) z = nz;
  x = Math.max(30, Math.min(CITY.width - 30, x));
  z = Math.max(30, Math.min(CITY.height - 30, z));
  return { x, z };
}

export function onRoad(x, z) {
  for (const rx of ROADS_V) {
    if (Math.abs(x - rx) <= ROAD_W / 2 && z <= BEACH_Z) return true;
  }
  for (const rz of ROADS_H) {
    if (Math.abs(z - rz) <= ROAD_W / 2 && x <= RIVER_X) return true;
  }
  // The bridge carries the z = 1100 road across the river.
  if (Math.abs(z - 1100) <= ROAD_W / 2 && x > RIVER_X) return true;
  return false;
}

export function randomRoadPoint(random) {
  if (random() < 0.5) {
    const rx = pick(random, ROADS_V);
    return { x: rx + range(random, -24, 24), z: range(random, 80, BEACH_Z - 40) };
  }
  const rz = pick(random, ROADS_H);
  return { x: range(random, 80, RIVER_X - 40), z: rz + range(random, -24, 24) };
}

export function nearestRoadPoint(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const rx of ROADS_V) {
    const d = Math.abs(x - rx);
    if (d < bestD && z <= BEACH_Z) { bestD = d; best = { x: rx, z }; }
  }
  for (const rz of ROADS_H) {
    const d = Math.abs(z - rz);
    if (d < bestD && x <= RIVER_X) { bestD = d; best = { x, z: rz }; }
  }
  return best || { x, z };
}

export function nearestRoadLine(x, z) {
  // Returns the road the point is closest to: {axis:'v'|'h', line, along}
  let best = null;
  let bestD = Infinity;
  for (const rx of ROADS_V) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { axis: 'v', line: rx, along: z }; }
  }
  for (const rz of ROADS_H) {
    const d = Math.abs(z - rz);
    if (d < bestD) { bestD = d; best = { axis: 'h', line: rz, along: x }; }
  }
  return best;
}
