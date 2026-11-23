// Vice Shores — vehicles. Cars are built to read as cars (hood, cabin,
// trunk, wheels, lights, spoiler). Traffic loops the streets, parked cars
// line the boulevard, and burning wrecks carry REAL FLAMES: several thin
// flickering tongues of bright yellow-orange, a warm point light and grey
// smoke — never a single orange pyramid.
// three.js is loaded by the page as a classic script (game/vendor/three.min.js),
// so the modules read it from the window global instead of importing the UMD
// build (an ES-module import of a UMD file yields an empty namespace).
const THREE = window.THREE;
import { range, pick, mulberry32 } from './random.js';
import { makeCarShape } from './city.js';

const TRAFFIC_COLORS = [0x3a6fd8, 0xe8e8e8, 0x2a2e36, 0x7a4a8a, 0x4a9e6a, 0xc9a13a, 0xd84a3a, 0x5a7a8a];

export function makeTrafficCar(rng, color) {
  const car = makeCarShape(color || pick(rng, TRAFFIC_COLORS), false);
  car.userData.isCar = true;
  return car;
}

// A burning wreck: a damaged car + flickering flame tongues + smoke.
export function makeBurningWreck(rng, color) {
  const g = new THREE.Group();
  const car = makeCarShape(color || 0x8a3a2a, false);
  car.rotation.y = range(rng, -0.5, 0.5);
  car.rotation.z = 0.06;
  g.add(car);
  const flames = [];
  const flameMats = [];
  for (let i = 0; i < 10; i++) {
    // Each tongue: a TALL THIN flickering tongue of bright yellow-orange,
    // tilted at a random angle so the fire reads as licking flames — never
    // a row of identical orange pyramids. Big and bright on purpose.
    const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe95e : 0xff8a00, transparent: true, opacity: 0.95 });
    const tongue = new THREE.Mesh(new THREE.ConeGeometry(range(rng, 0.22, 0.32), range(rng, 2.4, 3.4), 6), mat);
    tongue.position.set(range(rng, -0.7, 0.7), 1.6, range(rng, -1.4, 1.4));
    tongue.rotation.z = range(rng, -0.28, 0.28);
    tongue.rotation.x = range(rng, -0.2, 0.2);
    tongue.userData.phase = rng() * Math.PI * 2;
    tongue.userData.baseH = tongue.scale.y;
    g.add(tongue);
    flames.push(tongue);
    flameMats.push(mat);
  }
  // Bright yellow heart of the fire.
  const heart = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 6), new THREE.MeshBasicMaterial({ color: 0xffe95e, transparent: true, opacity: 0.95 }));
  heart.position.set(0, 1.1, 0);
  heart.userData.phase = 1.3;
  heart.userData.baseH = 1;
  g.add(heart);
  flames.push(heart);
  // Warm light so the fire lights the road.
  const light = new THREE.PointLight(0xff8a2a, 1.6, 14);
  light.position.set(0, 1.6, 0);
  g.add(light);
  // Grey smoke: small soft dark spheres drifting up, kept small so they
  // read as smoke, never as big grey balloons.
  const smoke = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(range(rng, 0.35, 0.6), 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x55565e, transparent: true, opacity: 0.45 })
    );
    s.position.set(range(rng, -0.6, 0.6), 2.4 + i * 0.9, range(rng, -0.6, 0.6));
    s.userData.phase = rng() * Math.PI * 2;
    g.add(s);
    smoke.push(s);
  }
  g.userData.flames = flames;
  g.userData.smoke = smoke;
  g.userData.light = light;
  return g;
}

export function animateWreck(wreck, t) {
  for (const f of wreck.userData.flames) {
    const flick = 0.75 + 0.35 * Math.sin(t * 9 + f.userData.phase) * Math.sin(t * 5.3 + f.userData.phase * 2);
    f.scale.y = Math.max(0.4, flick);
    f.rotation.y = t * 0.6 + f.userData.phase;
  }
  for (const s of wreck.userData.smoke) {
    s.position.y += 0.008;
    if (s.position.y > 7) s.position.y = 1.8;
    s.position.x += Math.sin(t + s.userData.phase) * 0.004;
  }
  wreck.userData.light.intensity = 1.3 + 0.5 * Math.sin(t * 11);
}

// Traffic: cars looping the street grid on fixed lanes.
export function makeTraffic(scene, count) {
  const rng = mulberry32(777);
  const cars = [];
  const lanes = [
    { x: -43, z0: -110, z1: 110, dir: 1 },
    { x: -49, z0: -110, z1: 110, dir: -1 },
    { x: -8, z0: -110, z1: 110, dir: 1 },
    { x: 38, z0: -110, z1: 110, dir: -1 },
    { x: 84, z0: -110, z1: 110, dir: 1 },
  ];
  for (let i = 0; i < count; i++) {
    const lane = pick(rng, lanes);
    const car = makeTrafficCar(rng);
    car.position.set(lane.x + range(rng, -1, 1), 0, range(rng, lane.z0, lane.z1));
    car.rotation.y = lane.dir > 0 ? 0 : Math.PI;
    car.userData.speed = range(rng, 8, 14);
    car.userData.dir = lane.dir;
    car.userData.lane = lane;
    scene.add(car);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt) {
  for (const car of cars) {
    const lane = car.userData.lane;
    car.position.z += car.userData.dir * car.userData.speed * dt;
    if (car.position.z > lane.z1) car.position.z = lane.z0;
    if (car.position.z < lane.z0) car.position.z = lane.z1;
  }
}

// Parked cars along the boulevard and side streets.
export function makeParkedCars(scene, rng) {
  const cars = [];
  const spots = [
    [-40.5, -70, 0], [-40.5, -30, 0], [-40.5, 20, 0], [-40.5, 58, 0],
    [-51.5, -80, Math.PI], [-51.5, -44, Math.PI], [-51.5, 6, Math.PI], [-51.5, 44, Math.PI],
    [24, -60, Math.PI / 2], [60, 10, -Math.PI / 2], [-4, 70, 0],
  ];
  for (const [x, z, rot] of spots) {
    const car = makeTrafficCar(rng);
    car.position.set(x, 0, z);
    car.rotation.y = rot + range(rng, -0.05, 0.05);
    scene.add(car);
    cars.push(car);
  }
  return cars;
}
