// Vice Shores' city: a street grid, blocks of buildings, two parks, two
// parking lots, a beach and water on the south edge, a river and one bridge
// on the east edge. Everything here is deterministic for a seed: the same
// seed always builds the same city, the same traffic loops and the same
// pedestrian routes.
import { WORLD, STREETS_X, STREETS_Y, ROAD_HALF, BEACH_Y, WATER_Y, RIVER_X, BRIDGE_Y, PALETTE } from './config.js';

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** True when the segment (ax,ay)-(bx,by) touches rect r (for line of sight). */
function segmentHitsRect(ax, ay, bx, by, r) {
  const dx = bx - ax;
  const dy = by - ay;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (ax < r.x || ax > r.x + r.w) return false;
  } else {
    let t1 = (r.x - ax) / dx;
    let t2 = (r.x + r.w - ax) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (ay < r.y || ay > r.y + r.h) return false;
  } else {
    let t1 = (r.y - ay) / dy;
    let t2 = (r.y + r.h - ay) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function isWater(x, y) {
  if (y > WATER_Y) return true;
  if (x > RIVER_X) {
    // The bridge at BRIDGE_Y carries the road across the river.
    if (Math.abs(y - BRIDGE_Y) <= ROAD_HALF) return false;
    return true;
  }
  return false;
}

export function isBeach(x, y) {
  return y > BEACH_Y && y <= WATER_Y && x <= RIVER_X;
}

export function buildCity(random) {
  const buildings = [];
  const parks = [];
  const lots = [];
  const trees = [];
  const parkedSpots = [];

  // Block bands between street centrelines (plus the world edges).
  const xBands = [0, ...STREETS_X, WORLD.width];
  const yBands = [0, ...STREETS_Y, BEACH_Y];
  // Two park blocks and two parking-lot blocks, picked by band indices.
  const parkCells = new Set(['2,2', '4,1']);
  const lotCells = new Set(['1,3', '3,2']);

  for (let bi = 0; bi < xBands.length - 1; bi += 1) {
    for (let bj = 0; bj < yBands.length - 1; bj += 1) {
      const x0 = xBands[bi] + (bi === 0 ? 24 : ROAD_HALF);
      const x1 = xBands[bi + 1] - (bi === xBands.length - 2 ? 24 : ROAD_HALF);
      const y0 = yBands[bj] + (bj === 0 ? 24 : ROAD_HALF);
      const y1 = yBands[bj + 1] - (bj === yBands.length - 2 ? 24 : ROAD_HALF);
      const key = `${bi},${bj}`;
      const block = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      if (block.w < 60 || block.h < 60) continue;
      if (parkCells.has(key)) {
        parks.push(block);
        const treeCount = Math.floor((block.w * block.h) / 9000);
        for (let i = 0; i < treeCount; i += 1) {
          trees.push({ x: random.range(block.x + 16, block.x + block.w - 16), y: random.range(block.y + 16, block.y + block.h - 16) });
        }
        continue;
      }
      if (lotCells.has(key)) {
        lots.push(block);
        const rows = Math.max(1, Math.floor(block.h / 64));
        for (let r = 0; r < rows; r += 1) {
          const y = block.y + 34 + r * 64;
          for (let x = block.x + 30; x < block.x + block.w - 30; x += 62) {
            if (random.next() < 0.55) parkedSpots.push({ x, y, angle: 0, color: random.pick(PALETTE.traffic) });
          }
        }
        continue;
      }
      // Buildings: split the block into a 2x2 grid of plots with alleys.
      const cols = block.w > 300 ? 2 : 1;
      const rows = block.h > 300 ? 2 : 1;
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          if (random.next() < 0.12) continue; // an empty plaza plot
          const px = block.x + (c * block.w) / cols + 10;
          const py = block.y + (r * block.h) / rows + 10;
          const pw = block.w / cols - 20;
          const ph = block.h / rows - 20;
          const colorIndex = random.int(0, PALETTE.building.length - 1);
          buildings.push({
            x: px, y: py, w: pw, h: ph,
            color: PALETTE.building[colorIndex],
            roof: PALETTE.buildingRoof[colorIndex],
            neon: random.next() < 0.4,
            neonColor: random.pick([PALETTE.neonPink, PALETTE.neonCyan, PALETTE.neonYellow]),
          });
        }
      }
    }
  }

  // Traffic loops: rectangles around interior blocks, on street centrelines.
  const trafficLoops = [];
  for (let bi = 1; bi < xBands.length - 2; bi += 1) {
    for (let bj = 1; bj < yBands.length - 2; bj += 1) {
      const x0 = xBands[bi];
      const x1 = xBands[bi + 1];
      const y0 = yBands[bj];
      const y1 = yBands[bj + 1];
      trafficLoops.push([
        { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
      ]);
    }
  }
  // Pedestrian routes: rectangles around blocks, on the sidewalks.
  const pedRoutes = [];
  for (let bi = 0; bi < xBands.length - 1; bi += 1) {
    for (let bj = 0; bj < yBands.length - 1; bj += 1) {
      const x0 = xBands[bi] + (bi === 0 ? 30 : ROAD_HALF + 10);
      const x1 = xBands[bi + 1] - (bi === xBands.length - 2 ? 30 : ROAD_HALF + 10);
      const y0 = yBands[bj] + (bj === 0 ? 30 : ROAD_HALF + 10);
      const y1 = yBands[bj + 1] - (bj === yBands.length - 2 ? 30 : ROAD_HALF + 10);
      if (x1 - x0 < 80 || y1 - y0 < 80) continue;
      pedRoutes.push([
        { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
      ]);
    }
  }

  return { buildings, parks, lots, trees, parkedSpots, trafficLoops, pedRoutes };
}

/** Push a circle out of buildings, water and the world edge. Returns {x, y, hit}. */
export function collideCircle(city, x, y, radius) {
  let hit = false;
  let nx = Math.max(radius, Math.min(WORLD.width - radius, x));
  let ny = Math.max(radius, Math.min(WORLD.height - radius, y));
  if (nx !== x || ny !== y) hit = true;
  if (isWater(nx, ny)) {
    // Slide back out of the water along the shortest axis.
    if (ny > WATER_Y) ny = WATER_Y - radius;
    else if (nx > RIVER_X) nx = RIVER_X - radius;
    hit = true;
  }
  for (const b of city.buildings) {
    const closestX = Math.max(b.x, Math.min(nx, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(ny, b.y + b.h));
    const dx = nx - closestX;
    const dy = ny - closestY;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 === 0) {
        // Centre inside the building: push out along the smallest overlap.
        const left = nx - b.x;
        const right = b.x + b.w - nx;
        const top = ny - b.y;
        const bottom = b.y + b.h - ny;
        const m = Math.min(left, right, top, bottom);
        if (m === left) nx = b.x - radius;
        else if (m === right) nx = b.x + b.w + radius;
        else if (m === top) ny = b.y - radius;
        else ny = b.y + b.h + radius;
      } else {
        const d = Math.sqrt(d2);
        nx = closestX + (dx / d) * radius;
        ny = closestY + (dy / d) * radius;
      }
    }
  }
  return { x: nx, y: ny, hit };
}

/** True when no building stands between (ax,ay) and (bx,by). */
export function lineOfSight(city, ax, ay, bx, by) {
  for (const b of city.buildings) {
    if (segmentHitsRect(ax, ay, bx, by, b)) return false;
  }
  return true;
}

export function pointInAnyBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (pointInRect(x, y, b)) return true;
  }
  return false;
}

export { rectsOverlap };
