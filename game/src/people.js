// People: multi-part low-poly characters with convincing proportions — head,
// torso, two arms, two legs, varied heights, skin, hair and outfits, and a
// walk animation that swings the arms and legs. Nobody is a plain box.
import { CITY, BOULEVARD_X } from './config.js';
import { makeRng, range, rangeInt, pick } from './random.js';

const rng = makeRng(4242);
let personId = 0;

const SKINS = [0xe8b98a, 0xc98d5f, 0x8a5a3b, 0xf2c9a0, 0x6b4426];
const SHIRTS = [0xd7263d, 0x2e86c8, 0x27a35c, 0xf2c94c, 0x7a5cff, 0xff8a3d, 0x2ee6c8, 0xe87a5d, 0xffffff, 0x333333];
const PANTS = [0x2a3a55, 0x3a3a3a, 0x5a4a3a, 0x7a8a9a, 0x1a1a1a];
const HAIRS = [0x1a1a1a, 0x4a2a10, 0x8a8a8a, 0xd9a441, 0x3a1a0a];

function limbMat(color) { return new THREE.MeshLambertMaterial({ color }); }

export function makePersonMesh(opts) {
  const o = opts || {};
  const h = o.height || range(rng, 1.65, 1.9);
  const skin = o.skin || pick(rng, SKINS);
  const shirt = o.shirt || pick(rng, SHIRTS);
  const pants = o.pants || pick(rng, PANTS);
  const hair = o.hair || pick(rng, HAIRS);
  const g = new THREE.Group();
  const s = h / 1.75;
  // Legs.
  const legGeo = new THREE.BoxGeometry(0.16, 0.8 * s, 0.18);
  const legL = new THREE.Mesh(legGeo, limbMat(pants)); legL.position.set(-0.11, 0.4 * s, 0);
  const legR = new THREE.Mesh(legGeo, limbMat(pants)); legR.position.set(0.11, 0.4 * s, 0);
  g.add(legL); g.add(legR);
  // Torso (jacket/shirt) with a collar stripe.
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62 * s, 0.3), limbMat(shirt));
  torso.position.y = 0.8 * s + 0.31 * s; g.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.1, 0.32), limbMat(o.jacketTrim || 0xffffff));
  chest.position.y = 0.8 * s + 0.52 * s; chest.visible = !!o.jacketTrim; g.add(chest);
  // Arms.
  const armGeo = new THREE.BoxGeometry(0.13, 0.62 * s, 0.15);
  const armL = new THREE.Mesh(armGeo, limbMat(shirt)); armL.position.set(-0.34, 0.8 * s + 0.3 * s, 0);
  const armR = new THREE.Mesh(armGeo, limbMat(shirt)); armR.position.set(0.34, 0.8 * s + 0.3 * s, 0);
  g.add(armL); g.add(armR);
  // Hands.
  const handGeo = new THREE.BoxGeometry(0.11, 0.12, 0.12);
  const handL = new THREE.Mesh(handGeo, limbMat(skin)); handL.position.set(-0.34, 0.8 * s - 0.06 * s, 0);
  const handR = new THREE.Mesh(handGeo, limbMat(skin)); handR.position.set(0.34, 0.8 * s - 0.06 * s, 0);
  g.add(handL); g.add(handR);
  // Head + hair + cap option.
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), limbMat(skin));
  head.position.y = 0.8 * s + 0.62 * s + 0.16; g.add(head);
  const hairM = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), limbMat(hair));
  hairM.position.y = 0.8 * s + 0.62 * s + 0.34; g.add(hairM);
  if (o.cap) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 8), limbMat(o.cap));
    cap.position.y = 0.8 * s + 0.62 * s + 0.4; g.add(cap);
  }
  g.userData.parts = { legL, legR, armL, armR, torso, head };
  g.userData.height = h;
  return g;
}

export function makePerson(scene, x, z, angle, opts) {
  const mesh = makePersonMesh(opts);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = angle;
  scene.add(mesh);
  const p = {
    id: (personId += 1), mesh, x, z, angle,
    speed: 0, walkPhase: Math.random() * 6.28, fleeing: false,
    target: null, isPlayer: !!(opts && opts.isPlayer),
  };
  return p;
}

export function animateWalk(p, dt, moving) {
  const parts = p.mesh.userData.parts;
  if (!moving) {
    parts.legL.rotation.x *= 0.8; parts.legR.rotation.x *= 0.8;
    parts.armL.rotation.x *= 0.8; parts.armR.rotation.x *= 0.8;
    return;
  }
  p.walkPhase += dt * (p.speed * 2.4 + 4);
  const sw = Math.sin(p.walkPhase) * 0.55;
  parts.legL.rotation.x = sw; parts.legR.rotation.x = -sw;
  parts.armL.rotation.x = -sw * 0.8; parts.armR.rotation.x = sw * 0.8;
}

function sidewalkPoint() {
  // A point on a sidewalk beside a road, or on the boulevard walk.
  const lines = [];
  for (let v = -CITY.half; v <= CITY.half; v += CITY.pitch) lines.push(v);
  if (rng() < 0.3) return { x: BOULEVARD_X - 12 + range(rng, -1, 1), z: range(rng, -170, 170) };
  const along = pick(rng, lines);
  const across = range(rng, -CITY.half, CITY.half);
  return rng() < 0.5
    ? { x: along + (rng() < 0.5 ? -7.5 : 7.5), z: across }
    : { x: across, z: along + (rng() < 0.5 ? -7.5 : 7.5) };
}

export function spawnPedestrians(scene, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const pt = sidewalkPoint();
    const p = makePerson(scene, pt.x, pt.z, range(rng, 0, Math.PI * 2), {});
    p.speed = range(rng, 1.2, 2.2);
    p.target = sidewalkPoint();
    peds.push(p);
  }
  return peds;
}

export function updatePedestrians(peds, dt, playerPos, wanted) {
  for (const p of peds) {
    if (!p.target) p.target = sidewalkPoint();
    let tx = p.target.x, tz = p.target.z;
    // Flee from the player when the heat is on.
    if (wanted > 0 && playerPos) {
      const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
      if (d < 22) {
        p.fleeing = true;
        tx = p.x + (p.x - playerPos.x) / Math.max(1, d) * 30;
        tz = p.z + (p.z - playerPos.z) / Math.max(1, d) * 30;
      } else p.fleeing = false;
    }
    const dx = tx - p.x, dz = tz - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.5) { p.target = sidewalkPoint(); continue; }
    const sp = p.fleeing ? p.speed * 2.6 : p.speed;
    const want = Math.atan2(-dz, dx);
    let diff = want - p.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.angle += Math.max(-3 * dt, Math.min(3 * dt, diff));
    p.x += Math.cos(p.angle) * sp * dt;
    p.z -= Math.sin(p.angle) * sp * dt;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.angle;
    animateWalk(p, dt, true);
  }
}
