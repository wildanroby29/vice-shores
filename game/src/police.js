// Police: the wanted system, pursuit units, the helicopter and roadblocks.
// Wanted stars rise on crimes and cool off when the player stays clean and
// out of sight. At 4–5 stars a helicopter with a spotlight beam follows the
// player. Getting busted costs money and respawns Rook at the safehouse.

import { createCar } from './vehicles.js';
import { range } from './random.js';

const UNIT_NAMES = ['UNIT 7', 'UNIT 12', 'UNIT 19', 'UNIT 23', 'UNIT 31', 'UNIT 44'];
const TACTICS = ['RAMMING', 'FLANKING', 'PIT', 'ROADBLOCK', 'SPOTLIGHT', 'CUT OFF'];

/** The helicopter: a distinct white/red body, a spinning rotor and a bright
 *  spotlight beam that slants down onto the player car. render3d draws it. */
export function createHelicopter() {
  return {
    x: 0,
    z: 0,
    y: 46,
    heading: 0,
    rotor: 0,
    beamTarget: null,
    active: false,
  };
}

/** Spawn a patrol car at the nearest road point behind the player. */
export function spawnPoliceUnit(city, rng, player, index, wanted) {
  const p = city.nearestRoad(player.x + range(rng, -60, 60), player.z + range(rng, -60, 60));
  const car = createCar('police', '#f4f4f4', p.x, p.z, range(rng, 0, Math.PI * 2), { driver: true });
  car.maxSpeed = 41 + Math.min(6, wanted * 1.2);
  return {
    id: index,
    name: UNIT_NAMES[index % UNIT_NAMES.length],
    car,
    tactic: TACTICS[index % TACTICS.length],
    state: 'chase',
    stuck: 0,
    honk: 0,
  };
}

/** A roadblock: two police cars parked nose-to-nose across the road. */
export function createRoadblock(city, rng, player) {
  const p = city.nearestRoad(player.x + range(rng, -80, 80), player.z + range(rng, -80, 80));
  const cars = [
    createCar('police', '#f4f4f4', p.x - 5, p.z, Math.PI / 2, { driver: true }),
    createCar('police', '#f4f4f4', p.x + 5, p.z, -Math.PI / 2, { driver: true }),
  ];
  return { x: p.x, z: p.z, cars, timer: 14 };
}

/** Update one pursuit unit: chase, ram, or block. */
export function updatePoliceUnit(unit, dt, player, city, others, wanted) {
  const car = unit.car;
  if (car.wrecked) {
    unit.state = 'wrecked';
    return;
  }
  const px = player.x;
  const pz = player.z;
  const dx = px - car.x;
  const dz = pz - car.z;
  const dist = Math.hypot(dx, dz);
  unit.dist = dist;
  const want = Math.atan2(dz, dx);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (unit.tactic === 'FLANKING' && dist < 30) {
    // Swing wide and come in from the side instead of tailing.
    const side = Math.PI / 2;
    const flankWant = Math.atan2(dz, dx) + side * (unit.id % 2 === 0 ? 1 : -1);
    let fdiff = flankWant - car.heading;
    while (fdiff > Math.PI) fdiff -= Math.PI * 2;
    while (fdiff < -Math.PI) fdiff += Math.PI * 2;
    car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, fdiff));
  } else if (unit.tactic === 'PIT' && dist < 14) {
    // Aim slightly ahead of the player's nose to spin them.
    const lead = 0.25;
    const lx = px + Math.cos(player.heading || 0) * lead * 10;
    const lz = pz + Math.sin(player.heading || 0) * lead * 10;
    const lWant = Math.atan2(lz - car.z, lx - car.x);
    let ld = lWant - car.heading;
    while (ld > Math.PI) ld -= Math.PI * 2;
    while (ld < -Math.PI) ld += Math.PI * 2;
    car.heading += Math.max(-2.8 * dt, Math.min(2.8 * dt, ld));
  } else {
    car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
  }
  const targetSpeed = dist < 10 ? car.maxSpeed : car.maxSpeed * 0.92;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.2);
  car.x += Math.cos(car.heading) * car.speed * dt;
  car.z += Math.sin(car.heading) * car.speed * dt;
  const fixed = city.collide(car.x, car.z, 2.1);
  car.x = fixed.x;
  car.z = fixed.z;
  // Ramming contact with the player.
  if (dist < 4.6) {
    car.speed *= 0.55;
    unit.honk = 0.3;
  }
  for (const other of others) {
    if (other === car || other.wrecked) continue;
    const ox = car.x - other.x;
    const oz = car.z - other.z;
    const od = Math.hypot(ox, oz);
    if (od > 0.01 && od < 3.4) {
      const push = (3.4 - od) / 2;
      car.x += (ox / od) * push;
      car.z += (oz / od) * push;
      other.x -= (ox / od) * push;
      other.z -= (oz / od) * push;
    }
  }
}

/** Move the helicopter above and slightly ahead of the player; spin the rotor. */
export function updateHelicopter(helo, dt, player, wanted) {
  helo.active = wanted >= 4;
  if (!helo.active) return;
  helo.rotor += dt * 28;
  const targetX = player.x + Math.cos(player.heading || 0) * 14;
  const targetZ = player.z + Math.sin(player.heading || 0) * 14;
  helo.x += (targetX - helo.x) * Math.min(1, dt * 1.4);
  helo.z += (targetZ - helo.z) * Math.min(1, dt * 1.4);
  helo.y = 30 + Math.sin(helo.rotor * 0.3) * 2;
  helo.heading = Math.atan2(player.z - helo.z, player.x - helo.x);
  helo.beamTarget = { x: player.x, z: player.z };
}

/** Wanted stars: 0–5. Crimes add stars; staying clean cools them off. */
export function addWanted(state, amount) {
  state.wanted = Math.min(5, state.wanted + amount);
  state.wantedTimer = 0;
}

export function coolWanted(state, dt, playerInSight) {
  if (state.wanted === 0) return;
  if (playerInSight) {
    state.wantedTimer = 0;
    return;
  }
  state.wantedTimer += dt;
  if (state.wantedTimer > 22) {
    state.wanted -= 1;
    state.wantedTimer = 0;
  }
}

/** The busted sequence: lose some money, lose the car, respawn at the safehouse. */
export function bustPlayer(state) {
  const lost = Math.min(state.money, Math.round(state.money * 0.15) + 120);
  state.money -= lost;
  state.bustedCount += 1;
  state.wanted = 0;
  state.wantedTimer = 0;
  return lost;
}
