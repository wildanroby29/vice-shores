// Staged screenshot scenes behind ?shot=start|play|drive|mission. Each scene
// plays the real rules forward from a fresh world, steered by a simple
// autopilot (walk to the car, get in, drive the streets to a waypoint), so
// every frame is what real play looks like and the same seed always gives
// the same frame.
import { STEP, CAR } from './config.js';
import { createWorld, startRun, stepWorld, SCREEN } from './world.js';
import { ACTION_ENTER, ACTION_SHOOT } from './input.js';
import { stepTrafficCar, stepPedestrian } from './traffic.js';
import { stepPoliceCar, maintainPolice } from './police.js';

const START_SECONDS = 8;
const PLAY_SECONDS = 26;
const DRIVE_SECONDS = 12;
const MISSION_SECONDS = 150;

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** A fake input object the autopilot drives; stepWorld reads it like a keyboard. */
function pilotInput(pilot) {
  return {
    moveVector() {
      return pilot.vector;
    },
    sprinting() {
      return false;
    },
    takeActions() {
      let flags = 0;
      if (pilot.pressed.has('enter')) flags |= ACTION_ENTER;
      if (pilot.pressed.has('shoot')) flags |= ACTION_SHOOT;
      pilot.pressed.clear();
      return flags;
    },
    takeMouse() {
      return { x: 0, y: 0, clicked: false, down: false };
    },
  };
}

function makePilot() {
  return { vector: { x: 0, y: 0 }, pressed: new Set() };
}

/** Steer an on-foot player toward a point. */
function walkToward(pilot, world, target) {
  const player = world.player;
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const d = Math.hypot(dx, dy);
  if (d < 16) {
    pilot.vector = { x: 0, y: 0 };
    return true;
  }
  pilot.vector = { x: dx / d, y: dy / d };
  return false;
}

/** Drive the player's car toward a point; returns true when close. Manages
 * speed: it brakes for sharp turns and for the waypoint, and never holds
 * the brake at a standstill (that would reverse the car). */
function driveToward(pilot, world, target, state) {
  const car = world.player.car;
  if (!car) return false;
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const d = Math.hypot(dx, dy);
  if (d < 60) {
    pilot.vector = { x: 0, y: 0 };
    return true;
  }
  const desired = Math.atan2(dy, dx);
  const diff = wrapAngle(desired - car.angle);
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  // Unstuck: if barely moving while trying to drive, reverse briefly.
  if (Math.abs(car.speed) < 25 && state.stuckTimer > 1.2) {
    state.reverseTimer = 0.9;
    state.stuckTimer = 0;
  }
  if (state.reverseTimer > 0) {
    state.reverseTimer -= STEP;
    pilot.vector = { x: -steer, y: 1 };
    return false;
  }
  state.stuckTimer += STEP;
  if (Math.abs(car.speed) > 40) state.stuckTimer = 0;
  const speed = Math.abs(car.speed);
  let throttle;
  if (speed < 60) throttle = -1; // gain speed to be able to turn at all
  else if (Math.abs(diff) > 0.6 || d < 200 || speed > 300) throttle = 1; // brake
  else throttle = -1;
  pilot.vector = { x: steer, y: throttle };
  return false;
}

/** Nearest parked car to a point (for a pilot whose car was wrecked). */
function nearestParked(world, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const car of world.parked) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

/**
 * A self-healing driving pilot: walk to the mission coupe (or the nearest
 * parked car when the coupe is gone), take it, then drive the route. If the
 * car is wrecked mid-route it walks to another car and carries on.
 */
function makeDrivePilot(world, route) {
  const pilot = makePilot();
  const state = { stuckTimer: 0, reverseTimer: 0, index: 0 };
  pilot.update = () => {
    const player = world.player;
    if (!player.inCar) {
      const car = world.parked.find((c) => c.missionCar) || nearestParked(world, player.x, player.y);
      if (!car) {
        pilot.vector = { x: 0, y: 0 };
        return;
      }
      if (walkToward(pilot, world, { x: car.x, y: car.y })) pilot.pressed.add('enter');
      return;
    }
    if (state.index < route.length && driveToward(pilot, world, route[state.index], state)) state.index += 1;
  };
  pilot.routeDone = () => state.index >= route.length;
  return pilot;
}

function stepAmbient(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    for (const car of world.traffic) stepTrafficCar(car, STEP, [...world.traffic], world.city);
    for (const ped of world.peds) stepPedestrian(ped, STEP, world.city);
    world.time += STEP;
  }
}

function runPilot(world, pilot, seconds, stopWhen) {
  const input = pilotInput(pilot);
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    pilot.update();
    stepWorld(world, STEP, input);
    if (world.bustedTimer > 0) break;
    if (stopWhen && stopWhen(world)) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw.
 * start: title over a live city. play: on foot in a busy street. drive:
 * driving with a two-star police chase. mission: the first job driven to
 * its drop-off, mission-complete banner showing.
 */
export function stageShot(name, world) {
  if (name === 'start') {
    const fresh = createWorld(world.seed);
    Object.assign(world, fresh);
    world.camera.x = 1280;
    world.camera.y = 800;
    stepAmbient(world, START_SECONDS);
    world.screen = SCREEN.TITLE;
    return SCREEN.TITLE;
  }

  startRun(world);

  if (name === 'play') {
    const pilot = makePilot();
    const route = [{ x: 1280, y: 1280 }, { x: 1280, y: 1000 }, { x: 1040, y: 800 }];
    let index = 0;
    pilot.update = () => {
      if (index < route.length && walkToward(pilot, world, route[index])) index += 1;
    };
    runPilot(world, pilot, PLAY_SECONDS, () => index >= route.length);
    return SCREEN.PLAY;
  }

  // drive and mission both start by walking to the blue coupe and taking it.
  const driveState = { stuckTimer: 0, reverseTimer: 0 };
  void driveState;
  if (name === 'drive') {
    world.wanted = 2;
    maintainPolice(world.police, 2, world.city, world.random, world.player.x, world.player.y, 0);
    // Put the chase on the player's tail so it reads in one frame, but far
    // enough away that the cops cannot reach the player on foot first: one
    // cop far behind on the same road, one ahead on the cross street.
    if (world.police.cars.length >= 2) {
      world.police.cars[0].x = 320;
      world.police.cars[0].y = 1280;
      world.police.cars[0].angle = 0;
      world.police.cars[0].speed = 200;
      world.police.cars[1].x = 2240;
      world.police.cars[1].y = 800;
      world.police.cars[1].angle = Math.PI;
      world.police.cars[1].speed = 200;
    }
    const route = [{ x: 1280, y: 1280 }, { x: 1280, y: 800 }, { x: 1760, y: 800 }];
    const pilot = makeDrivePilot(world, route);
    runPilot(world, pilot, DRIVE_SECONDS, () => pilot.routeDone());
    return SCREEN.PLAY;
  }

  // mission: drive the first job to its drop-off on Coral Row.
  const route = [
    { x: 1280, y: 1280 }, { x: 1280, y: 800 }, { x: 1760, y: 800 }, { x: 2240, y: 800 }, { x: 2240, y: 320 },
  ];
  const pilot = makeDrivePilot(world, route);
  runPilot(world, pilot, MISSION_SECONDS, () => world.missions.banner !== null);
  return SCREEN.PLAY;
}
