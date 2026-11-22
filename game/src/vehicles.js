// Cars: their state, arcade physics, traffic and carjacking. This module holds
// no three.js — it only moves numbers around. render3d.js turns each car into
// a shaped mesh (body + cabin + windshield + wheels + lights + bumper) and
// syncs its transform every frame.

import { CAR_PAINTS } from './config.js';
import { pick, range } from './random.js';

let nextId = 1;

/** Top speed in m/s per kind (42 m/s is about 150 km/h). */
const SPECS = {
  sports: { length: 4.6, width: 2.0, maxSpeed: 46, accel: 22, turn: 2.6, name: 'Rukun Pelo GT' },
  sedan: { length: 4.4, width: 1.9, maxSpeed: 38, accel: 16, turn: 2.2, name: 'Calyx Sprint' },
  taxi: { length: 4.4, width: 1.9, maxSpeed: 36, accel: 15, turn: 2.2, name: 'Sunline Cab' },
  suv: { length: 4.8, width: 2.1, maxSpeed: 34, accel: 14, turn: 1.9, name: 'Terra Rover' },
  hatch: { length: 3.9, width: 1.8, maxSpeed: 36, accel: 17, turn: 2.4, name: 'Pip City' },
  police: { length: 4.5, width: 2.0, maxSpeed: 41, accel: 20, turn: 2.5, name: 'VSPD Interceptor' },
};

export function createCar(kind, color, x, z, heading, opts = {}) {
  const spec = SPECS[kind] || SPECS.sedan;
  return {
    id: nextId++,
    kind,
    color: color || pickColor(kind),
    x,
    z,
    heading,
    speed: 0,
    maxSpeed: spec.maxSpeed * (opts.speedMul || 1),
    accel: spec.accel,
    turn: spec.turn,
    length: spec.length,
    width: spec.width,
    name: opts.name || spec.name,
    condition: opts.condition ?? 100,
    health: opts.health ?? 100,
    wrecked: false,
    burning: false,
    driver: opts.driver !== false,
    isPlayer: !!opts.isPlayer,
    isPolice: kind === 'police',
    loop: opts.loop || null,
    waypoint: 0,
    stuck: 0,
    honk: 0,
  };
}

function pickColor(kind) {
  if (kind === 'taxi') return '#ffd21f';
  if (kind === 'police') return '#f4f4f4';
  return CAR_PAINTS[Math.floor(Math.random() * CAR_PAINTS.length)];
}

/** The player's car: a low, wide, bright-orange sports car, the most distinctive on the road. */
export function createPlayerCar(x, z, heading) {
  return createCar('sports', '#ff5a1e', x, z, heading, { isPlayer: true, name: 'Rukun Pelo GT', condition: 100 });
}

/** Traffic: cars that loop around city blocks on the roads. */
export function createTraffic(city, rng, count) {
  const cars = [];
  const kinds = ['sedan', 'sedan', 'taxi', 'suv', 'hatch', 'sedan', 'taxi'];
  for (let i = 0; i < count; i += 1) {
    const loop = city.loops[i % city.loops.length];
    const wp = loop[Math.floor(rng() * loop.length)];
    const car = createCar(kinds[i % kinds.length], null, wp.x + range(rng, -4, 4), wp.z + range(rng, -4, 4), range(rng, 0, Math.PI * 2), {
      loop,
      speedMul: range(rng, 0.85, 1.1),
    });
    car.waypoint = Math.floor(rng() * loop.length);
    car.speed = range(rng, 8, 12);
    cars.push(car);
  }
  return cars;
}

/** Parked cars along the roads and in the lots, ready to be stolen. */
export function createParkedCars(city, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const p = city.randomRoadPoint(rng);
    const onBoulevard = Math.abs(p.x - 240) < 8;
    const kind = onBoulevard && i % 3 === 0 ? 'sports' : pick(rng, ['sedan', 'hatch', 'taxi', 'suv']);
    const car = createCar(kind, null, p.x + range(rng, -2, 2), p.z + range(rng, -2, 2), Math.round(rng() * 4) * (Math.PI / 2), { driver: false });
    cars.push(car);
  }
  return cars;
}

/** Arcade driving for the player's car. Returns true when it hit something hard. */
export function driveCar(car, dt, steer, throttle, brake, nitro, city, others) {
  const spec = SPECS[car.kind] || SPECS.sedan;
  const top = car.maxSpeed * (nitro ? 1.18 : 1);
  if (throttle > 0) car.speed += car.accel * throttle * dt;
  if (brake > 0) car.speed -= (car.speed > 0 ? 34 : 12) * brake * dt;
  car.speed -= car.speed * 0.25 * dt;
  if (car.speed > top) car.speed = top;
  if (car.speed < -9) car.speed = -9;
  const steerAmount = steer * car.turn * dt * Math.min(1, Math.abs(car.speed) / 8) * (car.speed >= 0 ? 1 : -1);
  car.heading += steerAmount;
  const nx = car.x + Math.cos(car.heading) * car.speed * dt;
  const nz = car.z + Math.sin(car.heading) * car.speed * dt;
  const fixed = city.collide(nx, nz, 2.3);
  let crashed = false;
  if (fixed.x !== nx || fixed.z !== nz) {
    crashed = Math.abs(car.speed) > 6;
    car.speed *= 0.45;
    car.condition = Math.max(0, car.condition - Math.abs(car.speed) * 0.4);
  }
  car.x = fixed.x;
  car.z = fixed.z;
  // Soft push-apart from other cars.
  for (const other of others) {
    if (other === car || other.wrecked) continue;
    const dx = car.x - other.x;
    const dz = car.z - other.z;
    const d = Math.hypot(dx, dz);
    const min = 3.4;
    if (d > 0.01 && d < min) {
      const push = (min - d) / 2;
      const ux = dx / d;
      const uz = dz / d;
      car.x += ux * push;
      car.z += uz * push;
      other.x -= ux * push;
      other.z -= uz * push;
      if (Math.abs(car.speed) > 8 || Math.abs(other.speed) > 8) {
        crashed = true;
        car.speed *= 0.7;
        other.speed *= 0.7;
        car.condition = Math.max(0, car.condition - 3);
      }
    }
  }
  if (car.condition <= 0 && !car.wrecked) {
    car.wrecked = true;
    car.burning = true;
    car.speed = 0;
  }
  return crashed;
}

/** Traffic AI: follow the loop, slow for the car ahead, never ram the player. */
export function updateTraffic(cars, dt, city, playerCar) {
  for (const car of cars) {
    if (car.wrecked || !car.loop) continue;
    const target = car.loop[car.waypoint];
    const dx = target.x - car.x;
    const dz = target.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 6) {
      car.waypoint = (car.waypoint + 1) % car.loop.length;
      continue;
    }
    const want = Math.atan2(dz, dx);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
    // Slow for anything ahead.
    let ahead = false;
    for (const other of cars) {
      if (other === car || other.wrecked) continue;
      const ox = other.x - car.x;
      const oz = other.z - car.z;
      const od = Math.hypot(ox, oz);
      if (od < 11 && Math.abs(Math.atan2(oz, ox) - car.heading) < 0.5) {
        ahead = true;
        break;
      }
    }
    if (playerCar && !playerCar.wrecked) {
      const px = playerCar.x - car.x;
      const pz = playerCar.z - car.z;
      const pd = Math.hypot(px, pz);
      if (pd < 10 && Math.abs(Math.atan2(pz, px) - car.heading) < 0.6) ahead = true;
    }
    const cruise = 11;
    car.speed += ((ahead ? 0 : cruise) - car.speed) * Math.min(1, dt * 1.5);
    car.x += Math.cos(car.heading) * car.speed * dt;
    car.z += Math.sin(car.heading) * car.speed * dt;
    const fixed = city.collide(car.x, car.z, 2.1);
    car.x = fixed.x;
    car.z = fixed.z;
  }
}

/** The nearest car within reach for entering / stealing. */
export function nearestCar(cars, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (car.wrecked) continue;
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

/** Damage a car; returns true when it just became a wreck. */
export function damageCar(car, amount) {
  if (car.wrecked) return false;
  car.condition = Math.max(0, car.condition - amount);
  car.health = Math.max(0, car.health - amount);
  if (car.condition <= 0 || car.health <= 0) {
    car.wrecked = true;
    car.burning = true;
    car.speed = 0;
    return true;
  }
  return false;
}
