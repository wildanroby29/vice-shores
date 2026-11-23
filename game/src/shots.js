// Vice Shores — the four screenshot stagings. Each shot is a real render
// of the game's own code, set up by positioning the player, the cars, the
// police and the camera, then letting the game render one frame.
//
// THE THREE ROUND-6 FIXES, checked in every shot:
//  1. CHASE — palms are normal-sized (a border, never the subject), the
//     burning wrecks show REAL flickering flames, and the helicopter beam
//     is a clearly visible cone of light locked on the GT.
//  2. ON-FOOT — the "about to be caught" moment is unmistakable: three
//     uniformed officers close in on Rook, a police car blocks the cab,
//     the cab door is open with the driver stepping out, 8+ pedestrians.
//  3. TITLE — the city behind the title is a varied skyline (no single flat
//     wall) and the bottom third is filled with life (cars, stalls, people).
// three.js is loaded by the page as a classic script (game/vendor/three.min.js),
// so the modules read it from the window global instead of importing the UMD
// build (an ES-module import of a UMD file yields an empty namespace).
const THREE = window.THREE;
import { makeBurningWreck } from './vehicles.js';
import { makeOfficer, makePerson } from './people.js';
import { makeStall } from './city.js';
import { mulberry32, range } from './random.js';

function setCar(car, x, z, rotY) {
  car.position.set(x, 0, z);
  car.rotation.y = rotY;
  car.visible = true;
}

// A visible spray-mist cone from a painter's gun to the car (garage shot):
// a wide bright orange cone plus a cloud of big bright droplets, so the
// paint mist reads clearly even in a still frame. The cone is narrow at the
// gun and widens toward the car (tip toward +x, wide base toward -x).
function makeMist() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 2.0, 12),
    new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.55, depthWrite: false })
  );
  cone.rotation.z = -Math.PI / 2;
  cone.position.x = -0.8;
  g.add(cone);
  const dropMat = new THREE.MeshBasicMaterial({ color: 0xffb01e, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 16; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.07 + (i % 3) * 0.03, 6, 5), dropMat);
    d.position.set(-0.3 - ((i * 0.09) % 1.4), Math.sin(i * 2.7) * 0.4, Math.cos(i * 1.9) * 0.4);
    g.add(d);
  }
  // A clear spray gun: dark body with a bright silver nozzle, held at the
  // cone's narrow tip.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.7), new THREE.MeshLambertMaterial({ color: 0x222a33 }));
  gun.position.set(0.15, 0, 0);
  g.add(gun);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.25, 8), new THREE.MeshLambertMaterial({ color: 0xc8ccd4 }));
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.set(-0.25, 0, 0);
  g.add(nozzle);
  return g;
}

export function stageShot(world, name) {
  const { state, player, gt, cab, police, peds, traffic, wrecks, scene } = world;
  const rng = mulberry32(2026);
  // Clear any staged extras from a previous shot.
  for (const w of wrecks) { scene.remove(w); }
  world.wrecks = [];
  for (const o of world.stagedOfficers || []) { scene.remove(o); }
  world.stagedOfficers = [];

  if (name === 'chase') {
    // FIX 1: palms are already normal-sized in the city; the frame is about
    // the cars. GT at 122 km/h, 5 stars, on the boulevard heading north.
    state.wanted = 5;
    state.jobIndex = 6;
    state.money = 86250;
    state.onFoot = false;
    state.speedKmh = 122;
    state.carCondition = 97;
    setCar(gt, -46, 30, Math.PI);
    player.x = -46; player.z = 30; player.rot = Math.PI;
    // Rook is driving — his on-foot mesh must not stand in the road next
    // to the GT.
    player.mesh.visible = false;
    // Rammer: beside the GT's rear quarter, NOT blocking the camera.
    const rammer = police.cars[0];
    setCar(rammer, -49.5, 27, Math.PI + 0.35);
    // Flanker ahead, close.
    setCar(police.cars[1], -43, 16, Math.PI - 0.3);
    // A third police car further ahead.
    setCar(police.cars[2], -49, -8, Math.PI + 0.15);
    // A fourth police car ramming on the GT's right side, close.
    setCar(police.cars[3], -42.5, 26, Math.PI - 0.2);
    // Roadblock ahead.
    police.roadblocks[0].position.set(-46, 0, -22);
    police.roadblocks[0].visible = true;
    // Keep pedestrians on the sidewalks, out of the chase lane.
    for (const p of peds) {
      const side = p.position.x < -46 ? -1 : 1;
      p.position.x = -46 + side * range(rng, 8, 13);
      p.position.z = range(rng, 0, 55);
    }
    // Clear the traffic out of the chase lane so no random car photobombs
    // the GT: push every traffic car far north, where it reads as depth.
    for (const c of traffic) {
      c.position.z = range(rng, -95, -35);
    }
    // Two burning wrecks with REAL flames, close enough to read: one ahead
    // left, one ahead right, scaled up so the flames fill the frame.
    const w1 = makeBurningWreck(rng, 0x8a3a2a);
    w1.position.set(-42, 0, 18);
    w1.scale.setScalar(1.5);
    scene.add(w1);
    world.wrecks.push(w1);
    const w2 = makeBurningWreck(rng, 0x5a4a3a);
    w2.position.set(-50, 0, 24);
    w2.scale.setScalar(1.5);
    scene.add(w2);
    world.wrecks.push(w2);
    // Helicopter BIG and close, fully in frame at the top, beam locked on the GT.
    police.heli.visible = true;
    police.heli.position.set(-41, 10.5, 16);
    police.heli.scale.setScalar(1.35);
    police.spotlight.visible = true;
    police.spotlight.position.set(-41, 10.5, 16);
    police.spotlight.lookAt(-46, 0, 30);
    // Dispatch distances for the panel.
    police.units = [
      { name: 'VSPD-23', dist: 5, tactic: 'RAMMING' },
      { name: 'VSPD-19', dist: 15, tactic: 'SPOTLIGHT' },
      { name: 'VSPD-07', dist: 22, tactic: 'ROADBLOCK' },
      { name: 'VSPD-14', dist: 28, tactic: 'CHASING' },
      { name: 'VSPD-21', dist: 30, tactic: 'RAMMING' },
      { name: 'VSPD-28', dist: 32, tactic: 'FLANKING' },
      { name: 'VSPD-12', dist: 9, tactic: 'FLANKING' },
    ];
    // Low CLOSE chase cam, 7.5 behind the GT and offset to the side so the
    // shot is a three-quarter rear view — the GT's sleek side profile and
    // spoiler read, not just a flat rear box.
    return { cam: [-43.5, 1.9, 38], look: [-46, 1.0, 22], overlay: 'game' };
  }

  if (name === 'onfoot') {
    // FIX 2: unmistakable "about to be caught". Rook on foot, cab ahead,
    // three officers closing in, police car blocking the cab, door open.
    state.wanted = 2;
    state.jobIndex = 1;
    state.money = 6420;
    state.onFoot = true;
    state.speedKmh = 0;
    player.x = 0.6; player.z = 22; player.rot = Math.PI;
    // The player MESH must move with the state (shot mode never steps the
    // game loop), and Rook faces AWAY from the camera, toward the officers.
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.rot;
    // The yellow cab, door open, driver stepping out.
    setCar(cab, 0, 12, 0);
    cab.userData.doorOpen = true;
    const driver = makePerson(rng, { shirt: 0xe8d21f, pants: 0x2a3440 });
    driver.position.set(1.3, 0, 12.5);
    driver.rotation.y = -Math.PI / 2;
    scene.add(driver);
    world.stagedOfficers.push(driver);
    // A door panel, swung open.
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.9), new THREE.MeshLambertMaterial({ color: 0xffd21f }));
    door.position.set(1.05, 0.85, 12.8);
    door.rotation.y = 1.1;
    scene.add(door);
    world.stagedOfficers.push(door);
    // Three uniformed officers, CLOSE, facing Rook, arms reaching out —
    // distinct faces: a moustached veteran, a plain officer, a female officer.
    const spots = [[-1.8, 20.3], [2.2, 20.3], [-0.8, 18.2]];
    const looks = [{ mustache: true }, {}, { bun: true, hair: 0x4a2a12 }];
    for (let i = 0; i < spots.length; i++) {
      const [ox, oz] = spots[i];
      const off = makeOfficer(rng, true, looks[i]);
      off.position.set(ox, 0, oz);
      // Face Rook.
      off.rotation.y = Math.atan2(player.x - ox, player.z - oz);
      scene.add(off);
      world.stagedOfficers.push(off);
    }
    // Police car angled sharply across the road directly in front of the cab.
    setCar(police.cars[0], 0, 7, 0.7);
    setCar(police.cars[1], -6, 8, -0.4);
    police.units = [
      { name: 'VSPD-23', dist: 10, tactic: 'RAMMING' },
      { name: 'VSPD-19', dist: 8, tactic: 'FLANKING' },
    ];
    // Extra pedestrians on the sidewalks so the street reads busy (10+ in frame).
    for (let i = 0; i < 10; i++) {
      const p = makePerson(rng);
      const side = i % 2 ? -1 : 1;
      p.position.set(side * range(rng, 4.5, 7), 0, range(rng, 8, 28));
      p.rotation.y = range(rng, 0, Math.PI * 2);
      scene.add(p);
      world.stagedOfficers.push(p);
    }
    // CLOSE over-the-shoulder camera: Rook's leather-jacketed back fills the
    // right foreground, BIG and clearly identifiable, the three officers and
    // the cab fill the middle.
    return { cam: [-0.3, 1.7, 24.6], look: [0.3, 1.25, 12], overlay: 'game' };
  }

  if (name === 'title') {
    // FIX 3: the camera looks down the boulevard so the background is a
    // varied skyline + palms + ocean, not one flat wall. The bottom third
    // holds parked cars, stalls and pedestrians.
    state.wanted = 0;
    state.jobIndex = 0;
    state.money = 12650;
    state.onFoot = true;
    state.speedKmh = 0;
    player.x = -44; player.z = 30; player.rot = 0;
    // Life in the foreground: pedestrians near the camera, parked cars and
    // market stalls filling the bottom third, so the street reads busy.
    for (let i = 0; i < 10; i++) {
      const p = makePerson(rng);
      p.position.set(range(rng, -50, -36), 0, range(rng, 20, 36));
      p.rotation.y = range(rng, 0, Math.PI * 2);
      scene.add(p);
      world.stagedOfficers.push(p);
    }
    // Two more market stalls close to the camera, on the boulevard's edge.
    const stallNear = [
      [-37, 24, 1.2], [-37, 32, 1.5],
    ];
    for (const [sx, sz, sr] of stallNear) {
      const stall = makeStall(rng, sx, sz, sr);
      scene.add(stall);
      world.stagedOfficers.push(stall);
    }
    // Low cinematic camera down the boulevard: skyline right, palms + ocean left.
    return { cam: [-40, 4.5, 36], look: [-52, 4, -70], overlay: 'title' };
  }

  if (name === 'garage') {
    // The GT on the lift, mid airbrush-paint. Painter visibly holding a
    // spray gun with a small mist cone. Car BIG in frame.
    state.wanted = 0;
    state.jobIndex = 0;
    state.money = 12650;
    state.onFoot = true;
    state.speedKmh = 0;
    state.inGarage = true;
    state.carCondition = 72;
    setCar(gt, 18, 88, Math.PI / 2);
    gt.position.y = 0.45; // on the lift
    player.x = 18; player.z = 96; player.rot = Math.PI;
    // Painter in blue on the car's east side, spray gun raised toward the
    // car's flank, mist cone widening onto the paint. He faces west, cap on.
    const painter = makePerson(rng, { shirt: 0x3a6fd8, pants: 0x2a3440, height: 1.78, cap: true });
    painter.position.set(20.6, 0.45, 89.5);
    painter.rotation.y = -Math.PI / 2;
    // Raise the painter's arm toward the car.
    painter.userData.armR.rotation.x = -1.4;
    painter.userData.armR.position.z = 0.25;
    scene.add(painter);
    world.stagedOfficers.push(painter);
    const mist = makeMist();
    mist.position.set(19.6, 1.35, 89.5);
    scene.add(mist);
    world.stagedOfficers.push(mist);
    // Foreground props so the workshop reads full, not empty: a tyre stack
    // and paint cans on the lift's far (west) side, visible but never in
    // the camera's face.
    const tyreMat = new THREE.MeshLambertMaterial({ color: 0x16181c });
    for (let i = 0; i < 2; i++) {
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 12), tyreMat);
      tyre.position.set(14.5, 0.15 + i * 0.3, 92);
      scene.add(tyre);
      world.stagedOfficers.push(tyre);
    }
    const canColors = [0xff4d6d, 0xffd21f, 0x4dd0a0];
    for (let i = 0; i < 3; i++) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 8), new THREE.MeshLambertMaterial({ color: canColors[i] }));
      can.position.set(14.8 + i * 0.5, 0.25, 86.5 + (i % 2) * 0.5);
      scene.add(can);
      world.stagedOfficers.push(can);
    }
    // Closer, lower three-quarter view from the south-east: the GT fills the
    // frame, the painter and the mist cone on the right, CUSTOMS behind.
    return { cam: [22.5, 2.4, 94.5], look: [18, 1.0, 89], overlay: 'garage' };
  }

  return { cam: [0, 4, 10], look: [0, 1, 0], overlay: 'game' };
}

export const SHOT_NAMES = ['chase', 'onfoot', 'title', 'garage'];
