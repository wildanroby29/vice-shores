// Vehicles: shaped cars (hood, cabin, trunk, wheels, lights, bumpers), the
// player's Rukun Pelo GT, traffic on road loops, parked cars, carjacking,
// damage, fire and smoke. A car is never a plain box: the body, the cabin, the
// windshield, the wheels and the lights are separate parts.
import { CITY, BOULEVARD_X, PALETTE } from './config.js';
import { makeRng, range, rangeInt, pick } from './random.js';
import { audio } from './audio.js';

const rng = makeRng(777);
let carId = 0;

const CAR_MODELS = [
  { name: 'Rukun Pelo GT', kind: 'sports', color: PALETTE.sportsOrange, top: 62, len: 4.6 },
  { name: 'Sunline Cab', kind: 'taxi', color: PALETTE.taxiYellow, top: 42, len: 4.4 },
  { name: 'Palm Sedan', kind: 'sedan', color: 0x4d7ea8, top: 40, len: 4.4 },
  { name: 'Coral Coupe', kind: 'coupe', color: 0xe87a5d, top: 44, len: 4.2 },
  { name: 'Marina Van', kind: 'van', color: 0x8fc7a3, top: 34, len: 5.0 },
  { name: 'Neon Hatch', kind: 'hatch', color: 0x7a5cff, top: 38, len: 3.8 },
];

function wheelMesh() {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), new THREE.MeshLambertMaterial({ color: 0x141414 }));
  tyre.rotation.z = Math.PI / 2; g.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8), new THREE.MeshLambertMaterial({ color: 0xcccccc }));
  hub.rotation.z = Math.PI / 2; g.add(hub);
  return g;
}

function makeCarMesh(model, isPolice) {
  const g = new THREE.Group();
  const bodyColor = isPolice ? PALETTE.policeWhite : model.color;
  const body = new THREE.MeshLambertMaterial({ color: bodyColor });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const L = model.len, W = 2.0;
  // Lower body: hood, cabin, trunk as one shaped mass with a sloped nose.
  const lower = new THREE.Mesh(new THREE.BoxGeometry(L, 0.72, W), body);
  lower.position.y = 0.62; g.add(lower);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, W - 0.1), body);
  nose.position.set(L / 2 + 0.2, 0.52, 0); nose.rotation.z = -0.18; g.add(nose);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(L * 0.46, 0.62, W - 0.34), body);
  cabin.position.set(-L * 0.06, 1.22, 0); g.add(cabin);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, W - 0.4), dark);
  shield.position.set(L * 0.16, 1.2, 0); shield.rotation.z = 0.35; g.add(shield);
  const rearGlass = shield.clone(); rearGlass.position.x = -L * 0.28; rearGlass.rotation.z = -0.3; g.add(rearGlass);
  // Wheels: four, visible, with hubcaps.
  const wheels = [];
  for (const [wx, wz] of [[L * 0.32, W / 2 - 0.08], [L * 0.32, -W / 2 + 0.08], [-L * 0.32, W / 2 - 0.08], [-L * 0.32, -W / 2 + 0.08]]) {
    const w = wheelMesh();
    w.position.set(wx, 0.42, wz);
    g.add(w); wheels.push(w);
  }
  // Headlights, taillights, bumpers.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  for (const wz of [-0.6, 0.6]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.42), lightMat);
    hl.position.set(L / 2 + 0.55, 0.62, wz); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.42), tailMat);
    tl.position.set(-L / 2 - 0.02, 0.62, wz); g.add(tl);
  }
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, W), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  bumperF.position.set(L / 2 + 0.5, 0.32, 0); g.add(bumperF);
  const bumperR = bumperF.clone(); bumperR.position.x = -L / 2 - 0.02; g.add(bumperR);
  if (model.kind === 'sports') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, W - 0.2), dark);
    spoiler.position.set(-L / 2 + 0.1, 1.12, 0); g.add(spoiler);
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), dark);
    strutL.position.set(-L / 2 + 0.1, 0.95, 0.7); g.add(strutL);
    const strutR = strutL.clone(); strutR.position.z = -0.7; g.add(strutR);
  }
  if (model.kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.9), new THREE.MeshBasicMaterial({ color: 0xffe14d }));
    sign.position.set(-0.1, 1.66, 0); g.add(sign);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.7), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar.position.set(-0.1, 1.62, 0); g.add(bar);
    const barR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.7), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    barR.position.set(0.35, 1.62, 0); g.add(barR);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(L * 0.9, 0.16, W + 0.04), new THREE.MeshLambertMaterial({ color: PALETTE.policeBlue }));
    stripe.position.set(0, 0.62, 0); g.add(stripe);
  }
  g.userData.wheels = wheels;
  return g;
}

export function makeCar(scene, model, x, z, angle, isPolice) {
  const mesh = makeCarMesh(model, isPolice);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = angle;
  scene.add(mesh);
  const car = {
    id: (carId += 1), mesh, model, isPolice: !!isPolice,
    x, z, angle, speed: 0, targetSpeed: 0, condition: 100,
    burning: false, smoke: null, driver: null, route: null, routeIndex: 0,
  };
  return car;
}

export function setBurning(scene, car) {
  if (car.burning) return;
  car.burning = true;
  const fire = new THREE.Group();
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85 }));
  flame.position.y = 1.6; fire.add(flame);
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.9 }));
  flame2.position.y = 1.5; fire.add(flame2);
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.5 }));
  smoke.position.y = 3.2; fire.add(smoke);
  fire.position.set(car.x, 0, car.z);
  scene.add(fire);
  car.smoke = fire;
  car.fireParts = { flame, flame2, smoke };
}

export function updateFire(car, dt, t) {
  if (!car.burning || !car.fireParts) return;
  const { flame, flame2, smoke } = car.fireParts;
  const s = 1 + Math.sin(t * 9 + car.id) * 0.18;
  flame.scale.set(s, 1 + Math.sin(t * 11) * 0.25, s);
  flame2.scale.set(1 / s, 1 + Math.cos(t * 13) * 0.2, 1 / s);
  smoke.position.y = 3.2 + Math.sin(t * 2 + car.id) * 0.4;
  smoke.scale.setScalar(1 + (Math.sin(t * 1.5) + 1) * 0.3);
}

function roadLoopPoints() {
  // Loops around blocks: rectangles on the road centrelines.
  const pts = [];
  const lines = [];
  for (let v = -CITY.half; v <= CITY.half; v += CITY.pitch) lines.push(v);
  for (const v of lines) {
    pts.push([{ x: v, z: -CITY.half }, { x: v, z: CITY.half }]);
    pts.push([{ x: -CITY.half, z: v }, { x: CITY.half, z: v }]);
  }
  pts.push([{ x: BOULEVARD_X, z: -CITY.half }, { x: BOULEVARD_X, z: CITY.half }]);
  return pts;
}

export function spawnTraffic(scene, count) {
  const loops = roadLoopPoints();
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const model = pick(rng, CAR_MODELS.slice(1));
    const loop = pick(rng, loops);
    const start = loop[0];
    const car = makeCar(scene, model, start.x + range(rng, -2, 2), start.z + range(rng, -40, 40), 0, false);
    car.route = loop; car.routeIndex = 1;
    car.targetSpeed = range(rng, 9, 15);
    car.speed = car.targetSpeed;
    cars.push(car);
  }
  return cars;
}

export function spawnParked(scene, count) {
  const cars = [];
  const lines = [];
  for (let v = -CITY.half; v <= CITY.half; v += CITY.pitch) lines.push(v);
  for (let i = 0; i < count; i += 1) {
    const model = pick(rng, CAR_MODELS.slice(1));
    const along = pick(rng, lines);
    const across = pick(rng, lines);
    const car = makeCar(scene, model, along + (rng() < 0.5 ? -8.5 : 8.5), across + range(rng, -30, 30), (rng() < 0.5 ? 0 : Math.PI) + (rng() < 0.5 ? 0 : Math.PI / 2), false);
    car.condition = rangeInt(rng, 55, 96);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt) {
  for (const car of cars) {
    if (!car.route || car.burning) continue;
    const target = car.route[car.routeIndex];
    const dx = target.x - car.x, dz = target.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) { car.routeIndex = (car.routeIndex + 1) % car.route.length; continue; }
    const want = Math.atan2(-dz, dx);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
    car.speed += (car.targetSpeed - car.speed) * Math.min(1, dt * 2);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.z -= Math.sin(car.angle) * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
  }
}

export function damageCar(scene, car, amount) {
  car.condition = Math.max(0, car.condition - amount);
  if (car.condition < 35 && !car.burning) setBurning(scene, car);
  if (amount > 10) audio.crash();
}
