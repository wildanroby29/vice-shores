// Wanted level and police: pursuit cars that ram, a helicopter with a
// spotlight at 4-5 stars, roadblocks at 3+ stars, and the named dispatch
// panel the HUD shows (each unit with distance and tactic).
import { S } from './config.js';
import { makeCar, setBurning, damageCar } from './vehicles.js';
import { makePerson } from './people.js';
import { audio } from './audio.js';
import { makeRng, range, pick } from './random.js';

const rng = makeRng(99);
const TACTICS = ['RAMMING', 'FLANKING', 'PIT', 'ROADBLOCK', 'SPOTLIGHT', 'CUT OFF'];
let unitNo = 7;

const POLICE_MODEL = { name: 'VSPD Interceptor', kind: 'sedan', color: 0xf2f2f2, top: 48, len: 4.4 };

export function addHeat(amount) {
  S.wantedHeat = Math.min(1, S.wantedHeat + amount);
  const want = Math.min(5, Math.floor(S.wantedHeat * 6));
  if (want > S.wanted) {
    S.wanted = want;
    S.dialogue = want >= 4 ? 'Marla: Five stars, Rook — the whole city is watching. Do not slow down.' : 'Marla: The VSPD is on you. Lose them.';
    S.dialogueTimer = 6;
  }
}

export function makeHelicopter(scene) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f0 });
  const redMat = new THREE.MeshLambertMaterial({ color: 0xc22730 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  // Body: a rounded cabin with a tail boom, skids and a rotor.
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 1.9), bodyMat);
  body.position.y = 0; g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.7), bodyMat);
  nose.position.set(2.1, -0.1, 0); nose.rotation.z = -0.25; g.add(nose);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 1.7), dark);
  glass.position.set(1.9, 0.15, 0); glass.rotation.z = -0.25; g.add(glass);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.35, 1.92), redMat);
  stripe.position.y = -0.2; g.add(stripe);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 0.5), bodyMat);
  tail.position.set(-3.2, 0.35, 0); g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.3, 0.9), redMat);
  fin.position.set(-4.9, 0.9, 0); g.add(fin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 6), dark);
  mast.position.y = 1.05; g.add(mast);
  const rotor = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.08, 0.5), dark);
  rotor.add(blade);
  const blade2 = blade.clone(); blade2.rotation.y = Math.PI / 2; rotor.add(blade2);
  rotor.position.y = 1.45; g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.3), dark);
  tailRotor.position.set(-4.9, 0.9, 0.6); g.add(tailRotor);
  for (const z of [-0.8, 0.8]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.12), dark);
    skid.position.set(0, -1.05, z); g.add(skid);
  }
  // Spotlight beam: a translucent cone aimed down at the player.
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = -15; // apex at the helicopter, wide base at the ground
  g.add(beam);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.4, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.3, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -26.5;
  g.add(pool);
  scene.add(g);
  return { mesh: g, rotor, tailRotor, beam, pool, x: 0, z: 0, y: 34, tactic: 'SPOTLIGHT', id: 'HELI-1' };
}

export function spawnPolice(scene, playerPos) {
  const want = S.wanted;
  const target = Math.min(7, 1 + want);
  while (S.police.length < target) {
    const a = rng() * Math.PI * 2;
    const d = range(rng, 28, 45);
    const car = makeCar(scene, POLICE_MODEL, playerPos.x + Math.cos(a) * d, playerPos.z + Math.sin(a) * d, 0, true);
    car.unit = `VSPD-${unitNo}`; unitNo += 7;
    car.tactic = pick(rng, TACTICS);
    car.targetSpeed = range(rng, 20, 30);
    S.police.push(car);
  }
  if (want >= 4 && !S.heli) {
    S.heli = makeHelicopter(scene);
    S.heli.x = playerPos.x + 20; S.heli.z = playerPos.z - 14;
    audio.sirenStart();
  }
  if (want < 4 && S.heli) {
    scene.remove(S.heli.mesh);
    S.heli = null;
    audio.sirenStop();
  }
  // Roadblocks at 3+ stars: two police cars parked across the road ahead.
  if (want >= 3 && S.roadblocks.length === 0) {
    const ahead = { x: playerPos.x + 30, z: playerPos.z };
    for (const off of [-4, 4]) {
      const rb = makeCar(scene, POLICE_MODEL, ahead.x, ahead.z + off, Math.PI / 2, true);
      rb.unit = `VSPD-${unitNo}`; unitNo += 7;
      rb.tactic = 'ROADBLOCK';
      S.roadblocks.push(rb);
    }
  }
  if (want < 3) {
    for (const rb of S.roadblocks) scene.remove(rb.mesh);
    S.roadblocks = [];
  }
}

export function updatePolice(scene, dt, t, playerPos, playerCar) {
  const speed = playerCar ? playerCar.speed : 0;
  for (const car of S.police) {
    const dx = playerPos.x - car.x, dz = playerPos.z - car.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(-dz, dx);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // Flankers weave; rammers drive straight at the player.
    const steer = car.tactic === 'FLANKING' ? diff + Math.sin(t * 0.8 + car.id) * 0.5 : diff;
    car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, steer));
    const chase = Math.min(34, 18 + S.wanted * 3 + speed * 0.4);
    car.speed += (chase - car.speed) * Math.min(1, dt * 1.5);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.z -= Math.sin(car.angle) * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
    // Ram: contact damages the player's car (or the player) and adds heat.
    if (dist < 3.4) {
      if (playerCar) damageCar(scene, playerCar, 6);
      else { S.health = Math.max(0, S.health - 8); audio.punch(); }
      addHeat(0.05);
      car.speed *= 0.4;
    }
    car.dist = dist;
  }
  if (S.heli) {
    const h = S.heli;
    // Hover ahead-left of the player, high enough to stay in frame.
    const tx = playerPos.x + 16, tz = playerPos.z - 10;
    h.x += (tx - h.x) * Math.min(1, dt * 1.2);
    h.z += (tz - h.z) * Math.min(1, dt * 1.2);
    h.y = 30 + Math.sin(t * 0.7) * 1.5;
    h.mesh.position.set(h.x, h.y, h.z);
    h.mesh.rotation.y = Math.atan2(-(playerPos.z - h.z), playerPos.x - h.x);
    h.rotor.rotation.y += dt * 22;
    h.tailRotor.rotation.x += dt * 30;
    // Keep the beam and its pool over the player.
    h.beam.position.set(0, -15, 0);
    h.pool.position.set(playerPos.x - h.x, -h.y + 0.1, playerPos.z - h.z);
    h.pool.position.y = -h.y + 0.15;
  }
}

export function dispatchList(playerPos) {
  const list = [];
  for (const car of S.police) {
    list.push({ id: car.unit, dist: Math.round(car.dist || 40), tactic: car.tactic });
  }
  for (const rb of S.roadblocks) {
    list.push({ id: rb.unit, dist: Math.round(Math.hypot(rb.x - playerPos.x, rb.z - playerPos.z)), tactic: 'ROADBLOCK' });
  }
  if (S.heli) list.push({ id: 'HELI-1', dist: 0, tactic: 'SPOTLIGHT' });
  return list.slice(0, 7);
}
