// People: the player and the pedestrians. Every person is built from several
// parts (torso, head, two arms, two legs) with their own colours and
// proportions, and walks with swinging arms and legs. No single-box people.
// Pedestrians wander the sidewalks in small groups, flee crimes, and are
// knocked down when hit. render3d.js builds the part meshes from these bodies.

import { SHIRTS, PANTS, SKINS } from './config.js';
import { pick, range } from './random.js';

const HAIR = ['#201512', '#3a2a1a', '#6b4a2a', '#111111', '#8a8a8a', '#e8c832'];

let nextId = 1;

/** A body is a bag of parts; render3d builds a mesh group from it. */
export function makeBody(rng, kind) {
  const outfit = [pick(rng, SHIRTS), pick(rng, PANTS), pick(rng, SKINS), pick(rng, HAIR)];
  const tall = range(rng, 0.92, 1.08);
  const wide = range(rng, 0.9, 1.12);
  return {
    kind: kind || 'ped',
    shirt: outfit[0],
    pants: outfit[1],
    skin: outfit[2],
    hair: outfit[3],
    tall,
    wide,
    hat: rng() < 0.18,
    walkPhase: range(rng, 0, Math.PI * 2),
    walkSpeed: range(rng, 1.4, 2.2),
  };
}

/** Rook, the player — tall, red jacket, impossible to miss in a crowd. */
export function makePlayerBody(rng) {
  const body = makeBody(rng, 'player');
  body.shirt = '#e63946';
  body.pants = '#1f2a44';
  body.skin = '#e8b98a';
  body.hair = '#201512';
  body.tall = 1.06;
  body.wide = 1.05;
  body.hat = false;
  return body;
}

export function createPedestrian(city, rng, x, z) {
  return {
    id: nextId++,
    x,
    z,
    heading: range(rng, 0, Math.PI * 2),
    speed: 0,
    body: makeBody(rng, 'ped'),
    state: 'walk',
    waypoint: sidewalkPoint(city, rng),
    group: Math.floor(rng() * 6),
    fleeTimer: 0,
    downTimer: 0,
    panic: 0,
  };
}

/** A point on a sidewalk: a road point pushed to the side of the street. */
export function sidewalkPoint(city, rng) {
  const p = city.randomRoadPoint(rng);
  const onVertical = Math.abs(p.x % 80) < 1 || Math.abs(Math.abs(p.x) - 240) < 1;
  if (onVertical) return { x: p.x + (rng() < 0.5 ? -11 : 11), z: p.z };
  return { x: p.x, z: p.z + (rng() < 0.5 ? -11 : 11) };
}

/** 20+ pedestrians on the sidewalks, in small groups near each other. */
export function createCrowd(city, rng, count) {
  const peds = [];
  // Groups of 2–4 friends walking together, so the street reads as busy.
  let made = 0;
  while (made < count) {
    const groupSize = 2 + Math.floor(rng() * 3);
    const anchor = sidewalkPoint(city, rng);
    for (let i = 0; i < groupSize && made < count; i += 1, made += 1) {
      const ped = createPedestrian(city, rng, anchor.x + range(rng, -3, 3), anchor.z + range(rng, -3, 3));
      ped.group = made;
      peds.push(ped);
    }
  }
  return peds;
}

/** Update one pedestrian: walk to the waypoint, flee from danger, get up again. */
export function updatePedestrian(ped, dt, city, danger) {
  if (ped.state === 'down') {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) {
      ped.state = 'walk';
      ped.fleeTimer = 3;
    }
    return;
  }
  if (danger) {
    const dx = ped.x - danger.x;
    const dz = ped.z - danger.z;
    const d = Math.hypot(dx, dz);
    if (d < 26) {
      ped.state = 'flee';
      ped.fleeTimer = 2.5;
      ped.panic = 1;
    }
  }
  if (ped.state === 'flee') {
    ped.fleeTimer -= dt;
    const dx = ped.x - (danger ? danger.x : ped.x);
    const dz = ped.z - (danger ? danger.z : ped.z);
    const d = Math.hypot(dx, dz) || 1;
    ped.heading = Math.atan2(dz, dx);
    ped.speed = 4.2;
    ped.x += Math.cos(ped.heading) * ped.speed * dt;
    ped.z += Math.sin(ped.heading) * ped.speed * dt;
    if (ped.fleeTimer <= 0) ped.state = 'walk';
  } else {
    const dx = ped.waypoint.x - ped.x;
    const dz = ped.waypoint.z - ped.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.5) {
      ped.waypoint = sidewalkPoint(city, Math.random);
      ped.speed = 0;
    } else {
      ped.heading = Math.atan2(dz, dx);
      ped.speed = ped.body.walkSpeed;
      ped.x += Math.cos(ped.heading) * ped.speed * dt;
      ped.z += Math.sin(ped.heading) * ped.speed * dt;
    }
  }
  ped.body.walkPhase += dt * (ped.speed > 0.1 ? ped.speed * 3.2 : 0);
  const fixed = city.collide(ped.x, ped.z, 0.6);
  ped.x = fixed.x;
  ped.z = fixed.z;
}

/** Knock a pedestrian down (crime: wanted heat + a scream). */
export function knockDown(ped) {
  if (ped.state === 'down') return;
  ped.state = 'down';
  ped.downTimer = 3;
  ped.speed = 0;
}
