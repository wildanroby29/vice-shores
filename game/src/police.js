// Vice Shores — the wanted system and the police. Stars rise on crime;
// police cars chase and ram; a helicopter follows at 4–5 stars with a
// spotlight beam that is CLEARLY VISIBLE — a bright cone of light from the
// helicopter down to the player, plus a glowing pool on the ground.
// three.js is loaded by the page as a classic script (game/vendor/three.min.js),
// so the modules read it from the window global instead of importing the UMD
// build (an ES-module import of a UMD file yields an empty namespace).
const THREE = window.THREE;
import { range, pick, mulberry32 } from './random.js';
import { makeCarShape } from './city.js';

const TACTICS = ['RAMMING', 'FLANKING', 'PIT', 'ROADBLOCK', 'SPOTLIGHT', 'CHASING'];

export function makePoliceCar(rng) {
  const car = makeCarShape(0xe8e8e8, false);
  // Light bar.
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.3), new THREE.MeshLambertMaterial({ color: 0x222a33 }));
  bar.position.set(0, 1.42, -0.25);
  car.add(bar);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.32), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
  red.position.set(-0.22, 1.5, -0.25);
  car.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.32), new THREE.MeshBasicMaterial({ color: 0x2a5aff }));
  blue.position.set(0.22, 1.5, -0.25);
  car.add(blue);
  // VSPD door marking.
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.4), new THREE.MeshBasicMaterial({ color: 0x2a5aff }));
  door.position.set(-0.96, 0.62, 0);
  door.rotation.y = -Math.PI / 2;
  car.add(door);
  car.userData.isPolice = true;
  return car;
}

export function makeHelicopter() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 3.2), bodyMat);
  g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.9), new THREE.MeshLambertMaterial({ color: 0x2a3440 }));
  nose.position.set(0, -0.1, 1.9);
  g.add(nose);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 2.6), bodyMat);
  tail.position.set(0, 0.2, -2.6);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.7), new THREE.MeshLambertMaterial({ color: 0xd84a3a }));
  fin.position.set(0, 0.7, -3.8);
  g.add(fin);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.15), new THREE.MeshLambertMaterial({ color: 0x222a33 }));
  tailRotor.position.set(0.25, 0.4, -3.8);
  g.add(tailRotor);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 6), new THREE.MeshLambertMaterial({ color: 0x222a33 }));
  mast.position.y = 0.8;
  g.add(mast);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x1c1f24 }));
  rotor.position.y = 1.05;
  g.add(rotor);
  const rotor2 = rotor.clone();
  rotor2.rotation.y = Math.PI / 2;
  g.add(rotor2);
  for (const sx of [-0.6, 0.6]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.6), new THREE.MeshLambertMaterial({ color: 0x222a33 }));
    skid.position.set(sx, -0.85, 0);
    g.add(skid);
  }
  // Spotlight housing under the nose.
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6c0 }));
  lamp.position.set(0, -0.7, 1.4);
  g.add(lamp);
  g.userData.rotor = rotor;
  g.userData.rotor2 = rotor2;
  return g;
}

// A bright, clearly visible spotlight cone: a NARROW beam from the
// helicopter down to the player (never a giant white triangle), plus a
// glowing pool where it lands.
export function makeSpotlight() {
  const g = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0, transparent: true, opacity: 0.32,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.5, 14, 16, 1, true), beamMat);
  beam.position.y = -7;
  g.add(beam);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -13.9;
  g.add(pool);
  g.userData.beam = beam;
  g.userData.pool = pool;
  return g;
}

export function makePolice(scene) {
  const rng = mulberry32(99);
  const police = { cars: [], heli: null, spotlight: null, roadblocks: [], units: [] };
  for (let i = 0; i < 7; i++) {
    const car = makePoliceCar(rng);
    car.position.set(range(rng, -60, 80), 0, range(rng, -100, 100));
    car.userData.unit = 'VSPD-' + (10 + i * 3);
    car.userData.tactic = pick(rng, TACTICS);
    car.userData.dist = range(rng, 5, 40);
    scene.add(car);
    police.cars.push(car);
    police.units.push({ name: car.userData.unit, dist: car.userData.dist, tactic: car.userData.tactic });
  }
  const heli = makeHelicopter();
  heli.position.set(0, 14, 0);
  scene.add(heli);
  police.heli = heli;
  const spot = makeSpotlight();
  spot.position.set(0, 14, 0);
  scene.add(spot);
  police.spotlight = spot;
  // Roadblock: two police cars + a striped barrier across the road.
  for (let i = 0; i < 2; i++) {
    const rb = new THREE.Group();
    const c1 = makePoliceCar(rng);
    c1.position.set(-3.5, 0, 0);
    c1.rotation.y = 0.4;
    rb.add(c1);
    const c2 = makePoliceCar(rng);
    c2.position.set(3.5, 0, 0);
    c2.rotation.y = -0.4;
    rb.add(c2);
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 0.3), new THREE.MeshBasicMaterial({ color: 0xff8a1a }));
    barrier.position.set(0, 0.8, 0);
    rb.add(barrier);
    rb.visible = false;
    scene.add(rb);
    police.roadblocks.push(rb);
  }
  return police;
}

export function updatePolice(police, playerPos, wanted, dt, t) {
  // Helicopter follows the player at 4-5 stars, beam locked on.
  const heli = police.heli;
  const spot = police.spotlight;
  if (wanted >= 4) {
    heli.visible = true;
    spot.visible = true;
    heli.position.x += (playerPos.x + 4 - heli.position.x) * 0.4 * dt;
    heli.position.z += (playerPos.z - 6 - heli.position.z) * 0.4 * dt;
    heli.position.y = 13 + Math.sin(t * 0.8) * 0.5;
    heli.userData.rotor.rotation.y = t * 18;
    heli.userData.rotor2.rotation.y = t * 18 + Math.PI / 2;
    spot.position.set(heli.position.x, heli.position.y, heli.position.z);
    // Beam points down at the player; the pool sits on the player.
    spot.userData.pool.position.set(playerPos.x - heli.position.x, -heli.position.y + 0.1, playerPos.z - heli.position.z);
    spot.lookAt(playerPos.x, 0, playerPos.z);
  } else {
    heli.visible = false;
    spot.visible = false;
  }
  // Police cars chase: steer toward the player, ram when close.
  for (const car of police.cars) {
    if (wanted <= 0) continue;
    const dx = playerPos.x - car.position.x;
    const dz = playerPos.z - car.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const targetAngle = Math.atan2(dx, dz);
    let da = targetAngle - car.rotation.y;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    car.rotation.y += Math.max(-2.2 * dt, Math.min(2.2 * dt, da));
    const speed = wanted >= 4 ? 17 : 12;
    car.position.x += Math.sin(car.rotation.y) * speed * dt;
    car.position.z += Math.cos(car.rotation.y) * speed * dt;
    car.userData.dist = dist;
  }
  // Roadblocks appear at 3+ stars.
  const showRb = wanted >= 3;
  police.roadblocks.forEach((rb, i) => {
    rb.visible = showRb;
    if (showRb) {
      rb.position.set(playerPos.x + (i === 0 ? 18 : -22), 0, playerPos.z + (i === 0 ? 24 : -18));
    }
  });
  // Refresh the dispatch list.
  police.units = police.cars.map((c) => ({ name: c.userData.unit, dist: Math.round(c.userData.dist), tactic: c.userData.tactic }));
}
