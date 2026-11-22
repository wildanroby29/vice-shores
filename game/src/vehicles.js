// Vehicles for Vice Shores: shaped cars with a real silhouette (hood, cabin, trunk,
// four wheels, lights, bumpers, spoiler), traffic driving road loops, parked cars,
// and burning wrecks with real orange flames and smoke.
import { WORLD } from './config.js';

const CAR_COLORS = [0xe07a5f, 0x2e6fb0, 0x39d0ff, 0xffe14d, 0x7ee081, 0xf2e6c9, 0x8a7f74, 0x9b59b6];

// One shaped car. `kind` is gt | taxi | police | sedan | van.
export function makeCar(THREE, rng, kind, color) {
  const car = new THREE.Group();
  const paint = color ?? (kind === 'taxi' ? 0xffd21f : kind === 'police' ? 0xf2f2f2 : CAR_COLORS[rng.int(0, CAR_COLORS.length)]);
  const paintMat = new THREE.MeshLambertMaterial({ color: paint });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2436, emissive: 0x0a1626 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c1e22 });
  const chromeMat = new THREE.MeshLambertMaterial({ color: 0xd8dde2 });

  const long = kind === 'van' ? 5.2 : 4.4;
  const wide = 1.9;
  // Lower body.
  const body = new THREE.Mesh(new THREE.BoxGeometry(long, 0.55, wide), paintMat);
  body.position.y = 0.55;
  car.add(body);
  // Hood and trunk: slightly lower nose and tail so the silhouette reads as a car.
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.34, wide - 0.12), paintMat);
  hood.position.set(long / 2 - 0.55, 0.62, 0);
  hood.rotation.z = -0.1;
  car.add(hood);
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.34, wide - 0.12), paintMat);
  trunk.position.set(-long / 2 + 0.45, 0.62, 0);
  trunk.rotation.z = 0.08;
  car.add(trunk);
  // Cabin with glass.
  const cabinLen = kind === 'van' ? 3.4 : 2.1;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinLen, 0.55, wide - 0.35), glassMat);
  cabin.position.set(kind === 'van' ? 0.1 : -0.25, 1.08, 0);
  car.add(cabin);
  const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(cabinLen - 0.3, 0.08, wide - 0.45), paintMat);
  cabinRoof.position.set(kind === 'van' ? 0.1 : -0.25, 1.38, 0);
  car.add(cabinRoof);
  // Bumpers.
  const bumpF = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, wide - 0.05), darkMat);
  bumpF.position.set(long / 2 + 0.02, 0.42, 0);
  car.add(bumpF);
  const bumpR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, wide - 0.05), darkMat);
  bumpR.position.set(-long / 2 - 0.02, 0.42, 0);
  car.add(bumpR);
  // Headlights (warm white) and taillights (red).
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a22 });
  for (const side of [-0.6, 0.6]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.34), lightMat);
    hl.position.set(long / 2 + 0.03, 0.72, side);
    car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.34), tailMat);
    tl.position.set(-long / 2 - 0.03, 0.72, side);
    car.add(tl);
  }
  // Grille and exhaust.
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.9), darkMat);
  grille.position.set(long / 2 + 0.04, 0.52, 0);
  car.add(grille);
  // Wheels: dark tyres with pale hubs, four of them.
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8);
  for (const [wx, wz] of [[long / 2 - 1.1, wide / 2], [long / 2 - 1.1, -wide / 2], [-long / 2 + 1.1, wide / 2], [-long / 2 + 1.1, -wide / 2]]) {
    const wheel = new THREE.Group();
    const tyre = new THREE.Mesh(wheelGeo, darkMat);
    tyre.rotation.x = Math.PI / 2;
    wheel.add(tyre);
    const hub = new THREE.Mesh(hubGeo, chromeMat);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);
    wheel.position.set(wx, 0.38, wz);
    car.add(wheel);
    wheels.push(wheel);
  }
  if (kind === 'gt') {
    // Spoiler on two small supports.
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 1.7), darkMat);
    blade.position.set(-long / 2 + 0.15, 1.28, 0);
    car.add(blade);
    for (const side of [-0.6, 0.6]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), darkMat);
      post.position.set(-long / 2 + 0.15, 1.08, side);
      car.add(post);
    }
    // Racing stripe down the middle.
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(long - 0.4, 0.03, 0.5), new THREE.MeshLambertMaterial({ color: 0x1c1e22 }));
    stripe.position.set(0, 0.84, 0);
    car.add(stripe);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffe14d }),
    );
    sign.position.set(-0.25, 1.52, 0);
    car.add(sign);
    const checker = new THREE.Mesh(new THREE.BoxGeometry(long - 0.6, 0.1, 0.06), darkMat);
    checker.position.set(0, 0.85, wide / 2 + 0.01);
    car.add(checker);
  }
  if (kind === 'police') {
    // Light bar: red on one side, blue on the other.
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.25, 1.5, 0.45);
    car.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.6), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    blue.position.set(-0.25, 1.5, -0.45);
    car.add(blue);
    // Door star.
    const star = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    star.position.set(0.1, 0.75, wide / 2 + 0.02);
    car.add(star);
    const star2 = star.clone();
    star2.position.z = -wide / 2 - 0.02;
    car.add(star2);
  }
  car.userData.wheels = wheels;
  car.userData.kind = kind;
  car.userData.long = long;
  return car;
}

// A burning wreck: a dark tilted car with layered flames, smoke and a flickering light.
export function makeBurningWreck(THREE, rng) {
  const group = new THREE.Group();
  const wreck = makeCar(THREE, rng, 'sedan', 0x3a3a3a);
  wreck.rotation.z = 0.1;
  wreck.rotation.y = rng.range(-0.4, 0.4);
  group.add(wreck);
  const flames = [];
  const flameDefs = [
    { color: 0xff5e1a, r: 1.15, h: 2.9, y: 1.6 },
    { color: 0xffa41a, r: 0.8, h: 2.2, y: 1.5 },
    { color: 0xffe14d, r: 0.5, h: 1.6, y: 1.4 },
  ];
  for (const def of flameDefs) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(def.r, def.h, 8),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.92 }),
    );
    cone.position.set(0.4, def.y, 0);
    group.add(cone);
    flames.push(cone);
  }
  const light = new THREE.PointLight(0xff7a22, 1.6, 14);
  light.position.set(0.4, 2.2, 0);
  group.add(light);
  const smokeMat = new THREE.MeshLambertMaterial({ color: 0x555555, transparent: true, opacity: 0.55 });
  const puffs = [];
  for (let i = 0; i < 5; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.7, 7, 6), smokeMat);
    puff.position.set(0.4 + rng.range(-0.5, 0.5), 2.5 + i * 0.9, rng.range(-0.5, 0.5));
    group.add(puff);
    puffs.push(puff);
  }
  return {
    group,
    update(t) {
      for (let i = 0; i < flames.length; i += 1) {
        const f = flames[i];
        const s = 1 + Math.sin(t * 13 + i * 2.1) * 0.16 + Math.sin(t * 29 + i) * 0.07;
        f.scale.set(s, 1 + Math.sin(t * 17 + i * 1.3) * 0.22, s);
      }
      light.intensity = 1.3 + Math.sin(t * 11) * 0.4 + Math.sin(t * 23) * 0.2;
      for (let i = 0; i < puffs.length; i += 1) {
        const p = puffs[i];
        const cycle = ((t * 0.25 + i * 0.2) % 1);
        p.position.y = 2.5 + cycle * 6;
        p.scale.setScalar(0.7 + cycle * 1.6);
        p.material.opacity = 0.55 * (1 - cycle);
      }
    },
  };
}

// Traffic: cars driving rectangular loops around the city blocks.
export function createTraffic(THREE, rng, scene) {
  const loops = [
    { xs: [-36, 0], zs: [-36, 0] },
    { xs: [0, 36], zs: [0, 36] },
    { xs: [36, 72], zs: [-36, 0] },
    { xs: [-36, 0], zs: [36, 72] },
    { xs: [72, 108], zs: [36, 72] },
    { xs: [0, 36], zs: [-72, -36] },
  ];
  const cars = [];
  for (const loop of loops) {
    const [x0, x1] = loop.xs;
    const [z0, z1] = loop.zs;
    const waypoints = [
      { x: x0, z: z0 + 5 },
      { x: x1, z: z0 + 5 },
      { x: x1, z: z1 - 5 },
      { x: x0, z: z1 - 5 },
    ];
    const mesh = makeCar(THREE, rng, 'sedan');
    scene.add(mesh);
    cars.push({
      mesh,
      waypoints,
      wp: rng.int(0, 4),
      speed: rng.range(7, 11),
      progress: rng.next(),
    });
  }
  // A taxi cruising the boulevard.
  const taxi = makeCar(THREE, rng, 'taxi');
  scene.add(taxi);
  cars.push({
    mesh: taxi,
    waypoints: [
      { x: -52, z: -80 },
      { x: -52, z: 80 },
    ],
    wp: 0,
    speed: 9,
    progress: 0,
    pingpong: true,
  });
  return {
    cars,
    update(dt) {
      for (const car of cars) {
        const target = car.waypoints[car.wp];
        const dx = target.x - car.mesh.position.x;
        const dz = target.z - car.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1.2) {
          if (car.pingpong) {
            car.wp = car.wp === 0 ? 1 : 0;
          } else {
            car.wp = (car.wp + 1) % car.waypoints.length;
          }
          continue;
        }
        const heading = Math.atan2(-dz, dx);
        // Smooth the turn.
        let diff = heading - car.mesh.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.mesh.rotation.y += diff * Math.min(1, dt * 4);
        car.mesh.position.x += Math.cos(car.mesh.rotation.y) * car.speed * dt;
        car.mesh.position.z -= Math.sin(car.mesh.rotation.y) * car.speed * dt;
        for (const wheel of car.mesh.userData.wheels) wheel.rotation.y += (car.speed * dt) / 0.38;
      }
    },
  };
}

// Parked cars along the roads, for stealing and for dressing the streets.
export function createParkedCars(THREE, rng, scene) {
  const spots = [
    { x: -30, z: -20, heading: 0 },
    { x: -30, z: 10, heading: Math.PI },
    { x: 6, z: -20, heading: Math.PI / 2 },
    { x: 42, z: 20, heading: 0 },
    { x: 78, z: -20, heading: Math.PI },
    { x: 6, z: 60, heading: -Math.PI / 2 },
    { x: 42, z: -60, heading: Math.PI },
    { x: 114, z: 60, heading: 0 },
    { x: -46, z: 40, heading: Math.PI / 2 },
    { x: -46, z: -30, heading: -Math.PI / 2 },
  ];
  const cars = [];
  for (const spot of spots) {
    const kind = rng.chance(0.25) ? 'taxi' : 'sedan';
    const mesh = makeCar(THREE, rng, kind);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = spot.heading;
    scene.add(mesh);
    cars.push({ mesh, x: spot.x, z: spot.z, heading: spot.heading, taken: false, kind });
  }
  return cars;
}

export { WORLD };
