// The city of Vice Shores: a bright sun-soaked coastal grid. Streets run on an
// 80-unit pitch; blocks sit between them. The east edge is a wide beachfront
// boulevard with palms, then sand, then a bright blue ocean. The north edge
// holds a river with a bridge. Landmarks (safehouse, garage, bank, park, pier)
// are fixed, so missions and screenshots always know where they are.

import { GRID, PALETTE, SIGNS } from './config.js';
import { createRandom, int, pick, range } from './random.js';

const BLOCK_CENTERS = [-200, -120, -40, 40, 120, 200];

/** Block types by (column, row): most hold buildings; a few are special. */
function blockType(cx, cz) {
  if (cx === 40 && cz === -40) return 'park';
  if (cx === 200 && cz === 120) return 'garage';
  if (cx === -40 && cz === -120) return 'bank';
  if (cx === -40 && cz === 40) return 'safehouse';
  if (cx === 120 && cz === 200) return 'lot';
  if (cx === -120 && cz === 200) return 'lot';
  return 'building';
}

export function createCity() {
  const rng = createRandom(20261122);
  const blocks = [];
  const solids = [];
  const palms = [];

  for (const cx of BLOCK_CENTERS) {
    for (const cz of BLOCK_CENTERS) {
      const type = blockType(cx, cz);
      const block = { cx, cz, type, buildings: [] };
      if (type === 'building') {
        const count = int(rng, 2, 4);
        const slots = [
          { dx: -16, dz: -16 }, { dx: 16, dz: -16 }, { dx: -16, dz: 16 }, { dx: 16, dz: 16 },
        ];
        for (let i = 0; i < count; i += 1) {
          const slot = slots[i];
          const w = range(rng, 18, 26);
          const d = range(rng, 18, 26);
          const h = range(rng, 12, 46);
          const color = pick(rng, PALETTE.building);
          const sign = rng() < 0.45 ? pick(rng, SIGNS) : null;
          const signColor = pick(rng, PALETTE.neon);
          block.buildings.push({ x: cx + slot.dx, z: cz + slot.dz, w, d, h, color, sign, signColor });
          solids.push({ x0: cx + slot.dx - w / 2, x1: cx + slot.dx + w / 2, z0: cz + slot.dz - d / 2, z1: cz + slot.dz + d / 2 });
        }
      } else if (type === 'bank') {
        block.buildings.push({ x: cx, z: cz - 8, w: 34, d: 26, h: 30, color: '#e8e8e8', sign: 'SHORE BANK', signColor: '#00e5ff' });
        solids.push({ x0: cx - 17, x1: cx + 17, z0: cz - 21, z1: cz + 5 });
      } else if (type === 'garage') {
        block.buildings.push({ x: cx + 8, z: cz - 10, w: 30, d: 24, h: 14, color: '#ffb27d', sign: 'DOCKSIDE CUSTOMS', signColor: '#ff2e88' });
        solids.push({ x0: cx - 7, x1: cx + 23, z0: cz - 22, z1: cz + 2 });
      } else if (type === 'safehouse') {
        block.buildings.push({ x: cx - 6, z: cz - 8, w: 20, d: 16, h: 10, color: '#ffe08a', sign: null, signColor: null });
        solids.push({ x0: cx - 16, x1: cx + 4, z0: cz - 16, z1: cz });
      } else if (type === 'park') {
        for (let i = 0; i < 9; i += 1) {
          palms.push({ x: cx + range(rng, -28, 28), z: cz + range(rng, -28, 28), scale: range(rng, 0.9, 1.3) });
        }
      }
      blocks.push(block);
    }
  }

  // Palms line both sides of the beachfront boulevard, and dot the sidewalks.
  for (let z = -280; z <= 280; z += 40) {
    palms.push({ x: GRID.boulevardX - 13, z, scale: range(rng, 0.9, 1.25) });
    palms.push({ x: GRID.boulevardX + 13, z: z + 20, scale: range(rng, 0.9, 1.25) });
  }
  for (let i = 0; i < 14; i += 1) {
    const street = pick(rng, [-160, -80, 0, 80, 160]);
    const along = range(rng, -240, 240);
    palms.push({ x: street + 11, z: along, scale: range(rng, 0.8, 1.2) });
  }

  const landmarks = {
    safehouse: { x: -40, z: 62 },
    garage: { x: 200, z: 148 },
    bank: { x: -40, z: -92 },
    palmPark: { x: 40, z: -40 },
    pier: { x: 322, z: 0 },
    coralRow: { x: 120, z: 240 },
    marinaRow: { x: 240, z: -120 },
    neonMile: { x: 0, z: 160 },
    race: [{ x: 0, z: 0 }, { x: 200, z: -200 }, { x: -200, z: 200 }],
  };

  // Traffic loops: rectangles around a few blocks, on the roads.
  const loops = [];
  const loopBlocks = [[-120, -120], [40, 40], [120, -120], [-40, 120], [200, -40], [-200, 0]];
  for (const [bx, bz] of loopBlocks) {
    const x0 = bx - GRID.pitch / 2;
    const x1 = bx + GRID.pitch / 2;
    const z0 = bz - GRID.pitch / 2;
    const z1 = bz + GRID.pitch / 2;
    loops.push([
      { x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 },
    ]);
  }

  function solidAt(x, z) {
    for (let i = 0; i < solids.length; i += 1) {
      const s = solids[i];
      if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) return true;
    }
    return false;
  }

  /** Push a point out of solid blocks (axis-separated, so sliding along walls works). */
  function collide(x, z, radius) {
    let nx = x;
    let nz = z;
    for (let i = 0; i < solids.length; i += 1) {
      const s = solids[i];
      const cx = Math.max(s.x0, Math.min(nx, s.x1));
      const cz = Math.max(s.z0, Math.min(nz, s.z1));
      const dx = nx - cx;
      const dz = nz - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          nx = cx + (dx / d) * radius;
          nz = cz + (dz / d) * radius;
        } else {
          nx = s.x1 + radius;
        }
      }
    }
    return { x: nx, z: nz };
  }

  /** Snap a point to the nearest road centreline (streets on the 80 pitch). */
  function nearestRoad(x, z) {
    const snap = (v) => Math.round(v / GRID.pitch) * GRID.pitch;
    const dx = Math.abs(x - snap(x));
    const dz = Math.abs(z - snap(z));
    if (dx <= dz) return { x: snap(x), z };
    return { x, z: snap(z) };
  }

  /** A random point on a road, for spawning traffic and pedestrians. */
  function randomRoadPoint(rng2) {
    const street = pick(rng2, [-240, -160, -80, 0, 80, 160, 240]);
    if (rng2() < 0.5) return { x: street, z: range(rng2, -280, 280) };
    return { x: range(rng2, -280, 280), z: street };
  }

  /** True when the point is on the beachfront boulevard (the wide east street). */
  function onBoulevard(x) {
    return Math.abs(x - GRID.boulevardX) < 12;
  }

  /** True when the point is on the beach or in the ocean. */
  function onSand(x) {
    return x >= GRID.beachX;
  }

  return {
    blocks,
    palms,
    landmarks,
    loops,
    solids,
    solidAt,
    collide,
    nearestRoad,
    randomRoadPoint,
    onBoulevard,
    onSand,
  };
}
