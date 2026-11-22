// The wanted system and the police. Wanted stars rise on crimes; police
// cars spawn at the city edge, chase the player and ram; when no cop can
// see the player for a while the stars fall again. Getting busted costs
// money and respawns the player at the safehouse.
import { CAR, WANTED, POLICE_MAX, SAFEHOUSE, PALETTE } from './config.js';
import { collideCircle, lineOfSight } from './city.js';

export function createPolice() {
  return {
    cars: [],
    unseenTimer: 0,
    decayTimer: 0,
    sirenTimer: 0,
    respawnTimer: 0,
  };
}

function spawnPoint(city, random, playerX, playerY) {
  // A street edge far from the player, so the chase arrives rather than pops in.
  const spots = [
    { x: 320, y: 320 }, { x: 2240, y: 320 }, { x: 320, y: 1600 }, { x: 2240, y: 1600 },
    { x: 1280, y: 320 }, { x: 1280, y: 1600 },
  ];
  let best = spots[0];
  let bestD = -1;
  for (const s of spots) {
    const d = Math.hypot(s.x - playerX, s.y - playerY);
    if (d > bestD) {
      bestD = d;
      best = s;
    }
  }
  return { x: best.x + random.range(-30, 30), y: best.y + random.range(-30, 30) };
}

/** Keep the number of police cars equal to the wanted level (up to the cap).
 * A wrecked cop is not replaced at once: replacements wait a few seconds,
 * so ramming the police open a real gap to escape through. */
export function maintainPolice(police, wanted, city, random, playerX, playerY, dt) {
  if (police.respawnTimer > 0) {
    police.respawnTimer -= dt;
    return;
  }
  const want = Math.min(wanted, POLICE_MAX);
  while (police.cars.length < want) {
    const at = spawnPoint(city, random, playerX, playerY);
    police.cars.push({
      kind: 'police',
      x: at.x,
      y: at.y,
      angle: 0,
      speed: 0,
      maxSpeed: CAR.policeMaxSpeed,
      color: PALETTE.police,
      health: 100,
      driver: false,
      sirenPhase: random.range(0, 1),
    });
  }
  while (police.cars.length > want) police.cars.pop();
}

/** Step one police car: steer at the player, ram on contact, brake to turn. */
export function stepPoliceCar(car, dt, player, city, world) {
  const target = player.inCar ? player.car : player;
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const dist = Math.hypot(dx, dy) || 1;
  const wantedAngle = Math.atan2(dy, dx);
  let diff = wantedAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const speedFactor = Math.min(1, car.speed / 120 + 0.25);
  car.angle += Math.max(-CAR.turnRate, Math.min(CAR.turnRate, diff * 3.2)) * speedFactor * dt;
  // Ease off when nearly head-on to the target, so the chase can turn.
  const closing = Math.abs(diff) < 0.6;
  let targetSpeed = closing ? car.maxSpeed : car.maxSpeed * 0.55;
  // A cop closing on a player on foot crawls in to make the arrest instead
  // of running them down at full speed.
  if (!player.inCar && dist < 90) targetSpeed = Math.min(targetSpeed, 70);
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.4);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = collideCircle(city, nx, ny, 18);
  if (fixed.hit) {
    car.speed *= 0.6;
    if (car.speed > 180) world.events.push({ type: 'crash', x: car.x, y: car.y });
  }
  car.x = fixed.x;
  car.y = fixed.y;
  car.sirenPhase += dt * 1.4;
}

/** Does any police car see the player right now? */
export function anyPoliceSees(police, city, player) {
  const target = player.inCar ? player.car : player;
  for (const car of police.cars) {
    const d = Math.hypot(car.x - target.x, car.y - target.y);
    if (d < WANTED.sightRange && lineOfSight(city, car.x, car.y, target.x, target.y)) return true;
  }
  return false;
}

/** Wanted decay: stars fall only after a stretch with no cop in sight. */
export function stepWantedDecay(police, world, dt) {
  if (world.wanted === 0) {
    police.unseenTimer = 0;
    police.decayTimer = 0;
    return;
  }
  if (anyPoliceSees(police, world.city, world.player)) {
    police.unseenTimer = 0;
    police.decayTimer = 0;
    return;
  }
  police.unseenTimer += dt;
  if (police.unseenTimer >= WANTED.unseenSeconds) {
    police.decayTimer += dt;
    if (police.decayTimer >= WANTED.decayEverySeconds) {
      police.decayTimer = 0;
      world.wanted = Math.max(0, world.wanted - 1);
      world.events.push({ type: 'wanted', stars: world.wanted });
    }
  }
}

/** Bust the player: lose money, clear wanted, respawn at the safehouse. */
export function bustPlayer(world) {
  const fine = Math.min(world.money, 150);
  world.money -= fine;
  world.wanted = 0;
  world.police.cars = [];
  world.player.inCar = false;
  world.player.car = null;
  world.player.x = SAFEHOUSE.x;
  world.player.y = SAFEHOUSE.y;
  world.player.health = 100;
  world.player.angle = 0;
  world.player.speed = 0;
  world.bustedTimer = 2.5;
  world.lastFine = fine;
  world.events.push({ type: 'busted', fine });
  return fine;
}
