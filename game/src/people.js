// Vice Shores — people. Every person is built from readable parts (head,
// torso, arms, legs) with varied heights and outfits, and walks with a
// simple leg/arm swing. Police officers wear dark navy uniforms with caps
// and, when closing in, hold their arms out toward the player.
// three.js is loaded by the page as a classic script (game/vendor/three.min.js),
// so the modules read it from the window global instead of importing the UMD
// build (an ES-module import of a UMD file yields an empty namespace).
const THREE = window.THREE;
import { range, pick, mulberry32 } from './random.js';

const SKINS = [0xe8b88a, 0xc98a5e, 0x8a5a3a, 0xf0c8a0];
const SHIRTS = [0xd84a3a, 0x3a6fd8, 0x4a9e6a, 0xe8d21f, 0x7a4a8a, 0xf0f0f0, 0xff8a3d, 0x35b5c8];
const PANTS = [0x2a3440, 0x4a3a28, 0x5a5a66, 0x1c2a3a];

export function makePerson(rng, opts) {
  const o = opts || {};
  const height = o.height || range(rng, 1.55, 1.9);
  const skin = o.skin || pick(rng, SKINS);
  const shirt = o.shirt || pick(rng, SHIRTS);
  const pants = o.pants || pick(rng, PANTS);
  const g = new THREE.Group();
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  // Legs.
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, height * 0.48, 0.16), pantsMat);
  legL.position.set(-0.11, height * 0.24, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.11;
  g.add(legR);
  // Torso.
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, height * 0.32, 0.24), shirtMat);
  torso.position.y = height * 0.64;
  g.add(torso);
  // Arms.
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, height * 0.3, 0.12), shirtMat);
  armL.position.set(-0.3, height * 0.62, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.3;
  g.add(armR);
  // Head.
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.24), skinMat);
  head.position.y = height * 0.88;
  g.add(head);
  // Hair or cap.
  if (o.cap) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8), new THREE.MeshLambertMaterial({ color: 0x141a24 }));
    cap.position.y = height * 0.88 + 0.16;
    g.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.16), new THREE.MeshLambertMaterial({ color: 0x141a24 }));
    brim.position.set(0, height * 0.88 + 0.13, 0.16);
    g.add(brim);
  } else {
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.26), new THREE.MeshLambertMaterial({ color: o.hair || pick(rng, [0x1c1a16, 0x4a2a12, 0x8a6a3a, 0x777777]) }));
    hair.position.y = height * 0.88 + 0.15;
    g.add(hair);
  }
  // Face: BIG readable eyes (white sclera + dark pupil, so the eyes read
  // even when the face is in shadow), nose and mouth — the character reads
  // as a person with an expression, not a blank doll or a dark mask.
  // The face is on the +z side of the head.
  const hy = height * 0.88;
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xf8f8f0 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1210 });
  for (const ex of [-0.06, 0.06]) {
    const sclera = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.02), scleraMat);
    sclera.position.set(ex, hy + 0.03, 0.125);
    g.add(sclera);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.02), pupilMat);
    pupil.position.set(ex, hy + 0.03, 0.135);
    g.add(pupil);
  }
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.05), skinMat);
  nose.position.set(0, hy - 0.02, 0.135);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0x5a2a22 }));
  mouth.position.set(0, hy - 0.075, 0.125);
  g.add(nose, mouth);
  // Optional details: a moustache for a veteran officer, a hair bun for a
  // female officer — small touches that make the three officers distinct.
  if (o.mustache) {
    const mo = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.02), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }));
    mo.position.set(0, hy - 0.045, 0.13);
    g.add(mo);
  }
  if (o.bun) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshLambertMaterial({ color: o.hair || 0x2a1a10 }));
    bun.position.set(0, hy + 0.05, -0.13);
    g.add(bun);
  }
  g.userData = { legL, legR, armL, armR, head, height, phase: rng() * Math.PI * 2 };
  return g;
}

// A uniformed officer: navy uniform, cap, and arms held out toward the
// player when closing in (reach = true).
export function makeOfficer(rng, reach, opts) {
  const o = opts || {};
  // Light skin tones for the officers so their faces read clearly in the
  // golden-hour light — never a dark mask.
  const g = makePerson(rng, { skin: pick(rng, [0xe8b88a, 0xf0c8a0, 0xc98a5e]), shirt: 0x1c2a4a, pants: 0x141a28, cap: true, height: range(rng, 1.75, 1.88), mustache: o.mustache, bun: o.bun, hair: o.hair });
  // Badge.
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd21f }));
  badge.position.set(-0.12, g.userData.height * 0.72, 0.13);
  g.add(badge);
  if (reach) {
    // Arms out, reaching toward the player.
    g.userData.armL.rotation.x = -1.25;
    g.userData.armR.rotation.x = -1.25;
    g.userData.armL.position.z = 0.2;
    g.userData.armR.position.z = 0.2;
  }
  return g;
}

export function animateWalk(person, t, speed) {
  const u = person.userData;
  const swing = Math.sin(t * 7 + u.phase) * 0.5 * Math.min(1, speed);
  u.legL.rotation.x = swing;
  u.legR.rotation.x = -swing;
  u.armL.rotation.x = -swing * 0.8;
  u.armR.rotation.x = swing * 0.8;
}

// Pedestrians wandering the sidewalks.
export function makePedestrians(scene, count) {
  const rng = mulberry32(4242);
  const peds = [];
  const walks = [
    { x: -38, z0: -110, z1: 110 },
    { x: -34, z0: -110, z1: 110 },
    { x: -52, z0: -110, z1: 110 },
    { x: -6, z0: -110, z1: 110 },
    { x: 12, z0: -110, z1: 110 },
    { x: 40, z0: -110, z1: 110 },
    { x: 58, z0: -110, z1: 110 },
  ];
  for (let i = 0; i < count; i++) {
    const walk = pick(rng, walks);
    const p = makePerson(rng);
    const dir = chance(rng, 0.5) ? 1 : -1;
    p.position.set(walk.x + range(rng, -1.5, 1.5), 0, range(rng, walk.z0, walk.z1));
    p.rotation.y = dir > 0 ? 0 : Math.PI;
    p.userData.speed = range(rng, 0.8, 1.6);
    p.userData.dir = dir;
    p.userData.walk = walk;
    scene.add(p);
    peds.push(p);
  }
  return peds;
}

export function updatePedestrians(peds, dt, t) {
  for (const p of peds) {
    p.position.z += p.userData.dir * p.userData.speed * dt;
    if (p.position.z > p.userData.walk.z1) { p.position.z = p.userData.walk.z1; p.userData.dir = -1; p.rotation.y = Math.PI; }
    if (p.position.z < p.userData.walk.z0) { p.position.z = p.userData.walk.z0; p.userData.dir = 1; p.rotation.y = 0; }
    animateWalk(p, t, 1);
  }
}

function chance(rng, p) { return rng() < p; }
