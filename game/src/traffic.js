// Traffic cars and pedestrians. Traffic follows rectangular loops around
// city blocks on the street centrelines, slowing for the car ahead.
// Pedestrians walk the sidewalks and run away when a crime happens nearby.
import { TRAFFIC_COUNT, PED_COUNT, PALETTE } from './config.js';
import { collideCircle } from './city.js';

function loopPoint(loop, index) {
  return loop[index % loop.length];
}

export function createTraffic(city, random) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const loop = random.pick(city.trafficLoops);
    const start = random.int(0, loop.length - 1);
    const at = loopPoint(loop, start);
    const next = loopPoint(loop, start + 1);
    cars.push({
      kind: 'traffic',
      x: at.x + random.range(-8, 8),
      y: at.y + random.range(-8, 8),
      angle: Math.atan2(next.y - at.y, next.x - at.x),
      speed: random.range(90, 150),
      maxSpeed: random.range(120, 170),
      loop,
      waypoint: start + 1,
      color: random.pick(PALETTE.traffic),
      health: 100,
      driver: true,
      stuck: 0,
    });
  }
  return cars;
}

export function createPedestrians(city, random) {
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    const route = random.pick(city.pedRoutes);
    const start = random.int(0, route.length - 1);
    const at = loopPoint(route, start);
    peds.push({
      x: at.x + random.range(-10, 10),
      y: at.y + random.range(-10, 10),
      angle: 0,
      speed: random.range(34, 52),
      route,
      waypoint: start + 1,
      color: random.pick(PALETTE.ped),
      flee: 0,
      fleeX: 0,
      fleeY: 0,
      down: false,
      downTimer: 0,
    });
  }
  return peds;
}

/** Step one traffic car along its loop; it brakes for a slow car ahead. */
export function stepTrafficCar(car, dt, cars, city) {
  const target = loopPoint(car.loop, car.waypoint);
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 14) {
    car.waypoint += 1;
    return;
  }
  const wantedAngle = Math.atan2(dy, dx);
  let diff = wantedAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-2.4, Math.min(2.4, diff * 3));
  car.angle += turn * dt;
  // Brake when another car is close ahead.
  let blocked = false;
  for (const other of cars) {
    if (other === car) continue;
    const ox = other.x - car.x;
    const oy = other.y - car.y;
    const ahead = ox * Math.cos(car.angle) + oy * Math.sin(car.angle);
    const side = Math.abs(-ox * Math.sin(car.angle) + oy * Math.cos(car.angle));
    if (ahead > 0 && ahead < 70 && side < 26) {
      blocked = true;
      break;
    }
  }
  const targetSpeed = blocked ? 0 : car.maxSpeed;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.6);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = collideCircle(city, nx, ny, 18);
  car.x = fixed.x;
  car.y = fixed.y;
  if (fixed.hit) car.speed *= 0.5;
}

/** Step one pedestrian: walk its route, or run from a threat while fleeing. */
export function stepPedestrian(ped, dt, city) {
  if (ped.down) {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) ped.down = false;
    return;
  }
  let target;
  let speed = ped.speed;
  if (ped.flee > 0) {
    ped.flee -= dt;
    const dx = ped.x - ped.fleeX;
    const dy = ped.y - ped.fleeY;
    const d = Math.hypot(dx, dy) || 1;
    target = { x: ped.x + (dx / d) * 100, y: ped.y + (dy / d) * 100 };
    speed = 130;
  } else {
    target = loopPoint(ped.route, ped.waypoint);
    const d = Math.hypot(target.x - ped.x, target.y - ped.y);
    if (d < 12) {
      ped.waypoint += 1;
      return;
    }
  }
  const dx = target.x - ped.x;
  const dy = target.y - ped.y;
  const d = Math.hypot(dx, dy) || 1;
  ped.angle = Math.atan2(dy, dx);
  const nx = ped.x + (dx / d) * speed * dt;
  const ny = ped.y + (dy / d) * speed * dt;
  const fixed = collideCircle(city, nx, ny, 8);
  ped.x = fixed.x;
  ped.y = fixed.y;
}

/** Scare every pedestrian within `radius` of (x, y): they run away. */
export function scarePeds(peds, x, y, radius) {
  for (const ped of peds) {
    if (ped.down) continue;
    if (Math.hypot(ped.x - x, ped.y - y) < radius) {
      ped.flee = 3;
      ped.fleeX = x;
      ped.fleeY = y;
    }
  }
}
