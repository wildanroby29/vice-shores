// Vice Shores' world: the player on foot and by car, traffic, pedestrians,
// police, bullets, the wanted level and the missions, all stepped in fixed
// 1/60 s steps. Screens live here too: title, play, paused; being busted
// is a timed overlay, not a screen.
import { WORLD, PLAYER, CAR, PLAYER_START, SAFEHOUSE, SAVE_KEY } from './config.js';
import { buildCity, collideCircle, lineOfSight, isBeach } from './city.js';
import { createTraffic, createPedestrians, stepTrafficCar, stepPedestrian, scarePeds } from './traffic.js';
import { createPolice, maintainPolice, stepPoliceCar, stepWantedDecay, bustPlayer } from './police.js';
import { createMissions, startMissions, stepMissions, currentMission } from './missions.js';
import { createRandom } from './random.js';
import { ACTION_ENTER, ACTION_SHOOT } from './input.js';

export const SCREEN = { TITLE: 'title', PLAY: 'play', PAUSED: 'paused' };

export function createWorld(seed) {
  const random = createRandom(seed);
  const city = buildCity(random);
  const world = {
    seed,
    random,
    city,
    screen: SCREEN.TITLE,
    time: 0,
    money: 0,
    wanted: 0,
    crimeCooldown: 0,
    bustTimer: 0,
    bustedTimer: 0,
    hurtTimer: 0,
    saveTimer: 0,
    saveDirty: false,
    justPickedUp: false,
    events: [],
    player: {
      x: PLAYER_START.x,
      y: PLAYER_START.y,
      angle: -Math.PI / 2,
      speed: 0,
      health: PLAYER.health,
      inCar: false,
      car: null,
      lastMoveAngle: -Math.PI / 2,
    },
    camera: { x: PLAYER_START.x, y: PLAYER_START.y },
    traffic: createTraffic(city, random),
    peds: createPedestrians(city, random),
    parked: [],
    police: createPolice(),
    bullets: [],
    missions: createMissions(),
  };
  // Parked cars from the lots, plus the blue coupe for the first job.
  for (const spot of city.parkedSpots) {
    world.parked.push({ kind: 'parked', x: spot.x, y: spot.y, angle: spot.angle, speed: 0, maxSpeed: CAR.maxSpeed, color: spot.color, health: CAR.health, driver: false });
  }
  world.parked.push({
    kind: 'parked', x: PLAYER_START.x + 90, y: PLAYER_START.y + 40, angle: Math.PI / 2,
    speed: 0, maxSpeed: CAR.maxSpeed, color: '#2f7fe0', health: CAR.health, driver: false, missionCar: true,
  });
  return world;
}

export function startRun(world) {
  const player = world.player;
  player.x = PLAYER_START.x;
  player.y = PLAYER_START.y;
  player.angle = -Math.PI / 2;
  player.health = PLAYER.health;
  player.inCar = false;
  player.car = null;
  world.money = 0;
  world.wanted = 0;
  world.crimeCooldown = 0;
  world.bustTimer = 0;
  world.bustedTimer = 0;
  world.time = 0;
  world.bullets = [];
  world.police.cars = [];
  startMissions(world.missions);
  world.saveDirty = true;
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (typeof save.money !== 'number' || typeof save.missionsDone !== 'number') return null;
    return save;
  } catch {
    return null;
  }
}

export function applySave(world, save) {
  world.money = save.money;
  world.missions.index = Math.min(save.missionsDone, 3);
  world.missions.step = world.missions.index === 2 ? 'escape' : 'goto';
  if (typeof save.px === 'number' && typeof save.py === 'number') {
    world.player.x = save.px;
    world.player.y = save.py;
  }
  world.saveDirty = false;
}

export function writeSave(world) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: world.money,
      missionsDone: world.missions.index,
      px: Math.round(world.player.x),
      py: Math.round(world.player.y),
    }));
    world.saveDirty = false;
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}

export function addWanted(world, amount, reason) {
  if (reason === 'gun' && world.crimeCooldown > 0) return;
  if (reason === 'gun') world.crimeCooldown = 4;
  const before = world.wanted;
  world.wanted = Math.min(3, world.wanted + amount);
  if (world.wanted !== before) world.events.push({ type: 'wanted', stars: world.wanted });
}

function nearestCar(world, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  const all = [...world.parked, ...world.traffic];
  for (const car of all) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function carCircleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const d = Math.hypot(dx, dy);
  return d < ar + br ? { d: d || 0.01, dx: d === 0 ? 1 : dx / d, dy: d === 0 ? 0 : dy / d } : null;
}

function stepPlayerOnFoot(world, dt, input) {
  const player = world.player;
  const move = input.moveVector();
  const speed = input.sprinting() ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  if (move.x !== 0 || move.y !== 0) {
    player.lastMoveAngle = Math.atan2(move.y, move.x);
    player.angle = player.lastMoveAngle;
  }
  const nx = player.x + move.x * speed * dt;
  const ny = player.y + move.y * speed * dt;
  const fixed = collideCircle(world.city, nx, ny, PLAYER.radius);
  player.x = fixed.x;
  player.y = fixed.y;
  player.speed = move.x !== 0 || move.y !== 0 ? speed : 0;
  // A moving car that touches the player hurts them.
  for (const car of [...world.traffic, ...world.police.cars]) {
    if (Math.abs(car.speed) < 60) continue;
    const hit = carCircleHit(player.x, player.y, PLAYER.radius, car.x, car.y, CAR.radius);
    if (hit) {
      player.health -= 20;
      player.hurtTimer = 5;
      player.x += hit.dx * 26;
      player.y += hit.dy * 26;
      world.events.push({ type: 'crash', x: player.x, y: player.y });
      break;
    }
  }
}

function stepPlayerCar(world, dt, input) {
  const car = world.player.car;
  const move = input.moveVector();
  const onSand = isBeach(car.x, car.y);
  const maxSpeed = (onSand ? CAR.maxSpeed * 0.5 : CAR.maxSpeed) * (car.health < 30 ? 0.6 : 1);
  // Throttle: up accelerates, down brakes then reverses.
  if (move.y < 0) {
    car.speed += CAR.accel * dt;
  } else if (move.y > 0) {
    if (car.speed > 0) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.accel * 0.6 * dt;
  }
  car.speed = Math.max(-CAR.reverseMax, Math.min(maxSpeed, car.speed));
  // Rolling drag.
  car.speed -= car.speed * CAR.drag * dt;
  if (Math.abs(car.speed) < 2 && move.y === 0) car.speed = 0;
  // Steering: stronger at speed, reversed when reversing.
  const steer = move.x;
  const speedFactor = Math.max(-1, Math.min(1, car.speed / 120));
  car.angle += steer * CAR.turnRate * speedFactor * dt;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const before = Math.abs(car.speed);
  const fixed = collideCircle(world.city, nx, ny, CAR.radius);
  if (fixed.hit && before > 140) {
    car.health -= 6;
    world.events.push({ type: 'crash', x: car.x, y: car.y });
  }
  if (fixed.hit) car.speed *= 0.45;
  car.x = fixed.x;
  car.y = fixed.y;
  // Car-to-car: push apart, trade damage on hard hits.
  for (const other of [...world.traffic, ...world.police.cars, ...world.parked]) {
    if (other === car) continue;
    const hit = carCircleHit(car.x, car.y, CAR.radius, other.x, other.y, CAR.radius);
    if (!hit) continue;
    const overlap = CAR.radius * 2 - hit.d;
    car.x += hit.dx * overlap * 0.5;
    car.y += hit.dy * overlap * 0.5;
    other.x -= hit.dx * overlap * 0.5;
    other.y -= hit.dy * overlap * 0.5;
    const rel = Math.abs(car.speed - (other.speed || 0));
    if (rel > 150) {
      // A police ram hurts the player less than it hurts the cop car: the
      // player can fight back by turning into a chase, and a chase stays
      // escapable instead of wrecking the player in seconds.
      if (other.kind === 'police') {
        car.health -= 4;
        other.health -= 10;
      } else {
        car.health -= 6;
        other.health -= 6;
      }
      world.events.push({ type: 'crash', x: car.x, y: car.y });
      if (other.kind === 'police') addWanted(world, 1, 'ram');
      if (other.kind === 'traffic' && other.health <= 0) {
        other.driver = false;
        world.peds.push({ x: other.x, y: other.y, angle: 0, speed: 40, route: world.city.pedRoutes[0], waypoint: 0, color: '#e0e0e0', flee: 4, fleeX: car.x, fleeY: car.y, down: false, downTimer: 0 });
      }
    }
    car.speed *= 0.6;
  }
  // Running over a pedestrian is a crime.
  for (const ped of world.peds) {
    if (ped.down) continue;
    if (Math.abs(car.speed) < 80) continue;
    const hit = carCircleHit(car.x, car.y, CAR.radius, ped.x, ped.y, 9);
    if (hit) {
      ped.down = true;
      ped.downTimer = 6;
      addWanted(world, 1, 'hit');
      scarePeds(world.peds, ped.x, ped.y, 260);
      world.events.push({ type: 'crash', x: ped.x, y: ped.y });
    }
  }
  if (car.health <= 0) {
    world.player.inCar = false;
    world.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
    world.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
    world.player.car = null;
    world.parked.push(car);
    if (world.wanted >= 1) {
      bustPlayer(world);
    } else {
      world.events.push({ type: 'wreck' });
    }
  }
}

function tryEnterCar(world) {
  const player = world.player;
  if (player.inCar) {
    // Get out beside the car.
    const car = player.car;
    const side = car.angle + Math.PI / 2;
    const px = car.x + Math.cos(side) * 42;
    const py = car.y + Math.sin(side) * 42;
    const fixed = collideCircle(world.city, px, py, PLAYER.radius);
    player.x = fixed.x;
    player.y = fixed.y;
    player.inCar = false;
    player.car = null;
    car.speed = 0;
    world.parked.push(car);
    return;
  }
  const car = nearestCar(world, player.x, player.y, 52);
  if (!car) return;
  // Take the car: a driven car loses its driver, who flees on foot.
  if (car.kind === 'traffic' && car.driver) {
    car.driver = false;
    world.peds.push({ x: car.x, y: car.y, angle: 0, speed: 40, route: world.city.pedRoutes[0], waypoint: 0, color: '#e0e0e0', flee: 4, fleeX: player.x, fleeY: player.y, down: false, downTimer: 0 });
    addWanted(world, 1, 'steal');
    world.events.push({ type: 'steal' });
  } else if (car.kind === 'parked') {
    // A parked car is only a crime if a cop sees it happen.
    let seen = false;
    for (const cop of world.police.cars) {
      if (Math.hypot(cop.x - player.x, cop.y - player.y) < 500 && lineOfSight(world.city, cop.x, cop.y, player.x, player.y)) {
        seen = true;
        break;
      }
    }
    if (seen) addWanted(world, 1, 'steal');
  }
  if (car.kind === 'parked') world.parked = world.parked.filter((c) => c !== car);
  else world.traffic = world.traffic.filter((c) => c !== car);
  car.kind = 'player';
  car.speed = 0;
  player.car = car;
  player.inCar = true;
}

function tryShoot(world, input, mouse) {
  const player = world.player;
  if (player.inCar) return; // no drive-by: keep combat on foot and simple
  let angle = player.lastMoveAngle;
  if (mouse.clicked) {
    const view = world.view || { width: 1280, height: 800 };
    const wx = world.camera.x + (mouse.x - view.width / 2);
    const wy = world.camera.y + (mouse.y - view.height / 2);
    angle = Math.atan2(wy - player.y, wx - player.x);
  }
  // Point-blank: punch instead of shooting.
  let nearestPed = null;
  let nearestD = PLAYER.punchRange;
  for (const ped of world.peds) {
    if (ped.down) continue;
    const d = Math.hypot(ped.x - player.x, ped.y - player.y);
    if (d < nearestD) {
      nearestD = d;
      nearestPed = ped;
    }
  }
  if (nearestPed) {
    nearestPed.down = true;
    nearestPed.downTimer = 5;
    addWanted(world, 1, 'punch');
    scarePeds(world.peds, player.x, player.y, 240);
    world.events.push({ type: 'punch', x: player.x, y: player.y });
    return;
  }
  const bx = player.x + Math.cos(angle) * 20;
  const by = player.y + Math.sin(angle) * 20;
  world.bullets.push({ x: bx, y: by, vx: Math.cos(angle) * 720, vy: Math.sin(angle) * 720, life: 0.5 });
  addWanted(world, 1, 'gun');
  world.events.push({ type: 'shot', x: bx, y: by });
}

function stepBullets(world, dt) {
  for (const bullet of world.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life <= 0) continue;
    if (world.city.buildings.some((b) => bullet.x >= b.x && bullet.x <= b.x + b.w && bullet.y >= b.y && bullet.y <= b.y + b.h)) {
      bullet.life = 0;
      continue;
    }
    for (const ped of world.peds) {
      if (ped.down) continue;
      if (Math.hypot(ped.x - bullet.x, ped.y - bullet.y) < 12) {
        ped.down = true;
        ped.downTimer = 6;
        bullet.life = 0;
        scarePeds(world.peds, ped.x, ped.y, 260);
        break;
      }
    }
    if (bullet.life <= 0) continue;
    for (const car of [...world.traffic, ...world.police.cars, ...world.parked]) {
      if (Math.hypot(car.x - bullet.x, car.y - bullet.y) < CAR.radius) {
        car.health -= 16;
        bullet.life = 0;
        if (car.kind === 'police') addWanted(world, 1, 'gun');
        if (car.kind === 'traffic' && car.health <= 0 && car.driver) {
          car.driver = false;
          world.peds.push({ x: car.x, y: car.y, angle: 0, speed: 40, route: world.city.pedRoutes[0], waypoint: 0, color: '#e0e0e0', flee: 4, fleeX: bullet.x, fleeY: bullet.y, down: false, downTimer: 0 });
        }
        break;
      }
    }
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);
}

function stepCamera(world) {
  const view = world.view || { width: 1280, height: 800 };
  const target = world.player.inCar && world.player.car ? world.player.car : world.player;
  const halfW = view.width / 2;
  const halfH = view.height / 2;
  const cx = Math.max(halfW, Math.min(WORLD.width - halfW, target.x));
  const cy = Math.max(halfH, Math.min(WORLD.height - halfH, target.y));
  // Ease the camera so it trails the player instead of snapping.
  world.camera.x += (cx - world.camera.x) * 0.12;
  world.camera.y += (cy - world.camera.y) * 0.12;
}

/** Advance the world one fixed step. `input` is the keyboard/mouse object. */
export function stepWorld(world, dt, input) {
  world.time += dt;
  if (world.crimeCooldown > 0) world.crimeCooldown -= dt;
  if (world.hurtTimer > 0) world.hurtTimer -= dt;
  if (world.bustedTimer > 0) {
    world.bustedTimer -= dt;
    return;
  }

  const actions = input.takeActions();
  const mouse = input.takeMouse();
  if (actions & ACTION_ENTER) tryEnterCar(world);
  if ((actions & ACTION_SHOOT) || mouse.clicked) tryShoot(world, input, mouse);

  if (world.player.inCar && world.player.car) stepPlayerCar(world, dt, input);
  else stepPlayerOnFoot(world, dt, input);

  for (const car of world.traffic) stepTrafficCar(car, dt, [...world.traffic, ...world.police.cars], world.city);
  for (const ped of world.peds) stepPedestrian(ped, dt, world.city);
  stepBullets(world, dt);

  // Package pickup for mission 2 (E near the pickup point).
  const mission = currentMission(world.missions);
  if (mission && mission.pickup && world.missions.step === 'pickup') {
    if (Math.hypot(world.player.x - mission.pickup.x, world.player.y - mission.pickup.y) < 44) {
      world.justPickedUp = true;
      world.events.push({ type: 'pickup', x: mission.pickup.x, y: mission.pickup.y });
    }
  }

  maintainPolice(world.police, world.wanted, world.city, world.random, world.player.x, world.player.y, dt);
  for (const car of world.police.cars) stepPoliceCar(car, dt, world.player, world.city, world);
  // Wrecked cop cars are towed away; replacements take a few seconds.
  const before = world.police.cars.length;
  world.police.cars = world.police.cars.filter((car) => car.health > 0);
  if (world.police.cars.length < before) world.police.respawnTimer = 6;
  stepWantedDecay(world.police, world, dt);

  // A cop that reaches the player on foot busts them.
  if (!world.player.inCar) {
    let touching = false;
    for (const car of world.police.cars) {
      if (Math.hypot(car.x - world.player.x, car.y - world.player.y) < 32) {
        touching = true;
        break;
      }
    }
    if (touching) {
      world.bustTimer += dt;
      if (world.bustTimer >= 1) {
        world.bustTimer = 0;
        bustPlayer(world);
      }
    } else {
      world.bustTimer = Math.max(0, world.bustTimer - dt * 2);
    }
  }

  // Health comes back slowly out of trouble.
  if (world.hurtTimer <= 0 && world.player.health < PLAYER.health) {
    world.player.health = Math.min(PLAYER.health, world.player.health + 6 * dt);
  }
  if (world.player.health <= 0) {
    bustPlayer(world);
  }

  stepMissions(world.missions, world, dt);
  stepCamera(world);

  // Autosave while playing.
  world.saveTimer += dt;
  if (world.saveTimer > 15 && world.saveDirty) {
    world.saveTimer = 0;
    writeSave(world);
  }
}
