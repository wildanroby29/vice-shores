// The four staged screenshots for Vice Shores, plus the asset turntables.
//
// Every shot runs on seed 1 with $12,650 in the bank and the screen set to
// PLAY, stages a deterministic scene, steps the simulation forward with a
// scripted input, and the frame is what real play looks like. The same seed
// always gives the same frame. The turntables are not part of the dossier —
// they render to /tmp — but they exist so a single asset can be checked
// alone, on a neutral disc, in a three-quarter view.

import { scriptedInput } from './input.js';
import { makeBuilding, PALETTES } from './city.js';
import { makeRng } from './random.js';

const IDLE = scriptedInput('IDLE');
const DRIVE = scriptedInput('DRIVE');

export function forward(game, seconds, input) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) game.step(1 / 60, input);
}

// Stage one pedestrian at a fixed spot, standing still (its target is its
// own position, so the walk update leaves it alone).
function posePed(ped, x, y, z) {
  ped.group.position.set(x, y, z);
  ped.target = { x, z };
  ped.speed = 0;
}

// Hide the whole world for a turntable: city, traffic, pedestrians, police
// and officers, helicopter, marker, hero car, Rook, clouds and glitter.
// Then a neutral ground disc, an afternoon sky, and the asset camera.
function isolateForTurntable(game, view) {
  const scene = game.scene;
  game.city.group.visible = false;
  for (const t of game.traffic) t.group.visible = false;
  for (const p of game.peds) p.group.visible = false;
  for (const c of game.police.cars) c.group.visible = false;
  for (const o of game.police.officers) o.group.visible = false;
  game.heli.group.visible = false;
  game.marker.visible = false;
  game.markerBeam.visible = false;
  game.heroCar.group.visible = false;
  game.rook.group.visible = false;
  game.sky.dome.visible = false;
  for (const cl of game.sky.clouds) cl.visible = false;
  game.glitter.visible = false;
  scene.background = new THREE.Color(0x2e3644);
  scene.fog = null;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(30, 40),
    new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 1 }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0;
  disc.receiveShadow = true;
  scene.add(disc);
  game.setTimeOfDay('afternoon');
  game.camMode = 'asset';
  game.assetView = view;
}

function stageTitle(game) {
  game.setTimeOfDay('golden');
  game.setMission(0);
  game.setHero(180, -20, 0, true);
  game.camMode = 'titlecard';
  game.setWanted(0);
  game.missions.money = 12650;
  game.screen = 'play';
  // Park the first five traffic cars along the boulevard.
  const spots = [
    [176, -8, 0], [184, 2, Math.PI], [176, 12, 0], [184, 22, Math.PI], [176, 32, 0],
  ];
  for (let i = 0; i < 5; i++) {
    const car = game.traffic[i];
    car.group.position.set(spots[i][0], 0, spots[i][1]);
    car.group.rotation.y = spots[i][2];
    car.speed = 0;
    car.group.userData.speed = 0;
  }
  // Twelve pedestrians on the sidewalks, alternating sides.
  for (let i = 0; i < 12; i++) {
    const ped = game.peds[i];
    const x = i % 2 === 0 ? 170 : 190;
    posePed(ped, x, 0, -15 + i * 4);
  }
  forward(game, 1.5, IDLE);
}

function stageChase(game) {
  game.setTimeOfDay('night');
  game.setMission(1);
  game.setHero(0, 60, Math.PI, true);
  game.camMode = 'chaseShot';
  game.setWanted(5);
  game.missions.money = 12650;
  game.screen = 'play';
  forward(game, 4, DRIVE);
  const hp = { x: game.heroCar.group.position.x, z: game.heroCar.group.position.z };
  // Four police cars posed 10-30 m from the hero.
  const near = [
    [hp.x - 6, hp.z - 20], [hp.x + 7, hp.z - 25],
    [hp.x - 5, hp.z + 15], [hp.x + 6, hp.z + 18],
  ];
  for (let i = 0; i < 4; i++) {
    const car = game.police.cars[i];
    car.group.position.set(near[i][0], 0, near[i][1]);
    car.group.rotation.y = Math.PI;
    car.speed = 0;
    car.group.userData.speed = 0;
  }
  // Four more on the flanks, facing the hero.
  const flanks = [
    [hp.x - 14, hp.z - 8], [hp.x + 14, hp.z - 10],
    [hp.x - 13, hp.z + 8], [hp.x + 13, hp.z + 5],
  ];
  for (let i = 0; i < 4; i++) {
    const car = game.police.spawnCar(flanks[i][0], flanks[i][1], 'FLANKING');
    car.group.rotation.y = Math.atan2(hp.x - flanks[i][0], hp.z - flanks[i][1]);
    car.speed = 0;
    car.group.userData.speed = 0;
  }
  // The helicopter, close and low so it fills the frame, beam on the hero.
  game.heli.setHold(hp.x - 12, 14, hp.z - 28);
  game.heli.aimAt({ x: hp.x, y: 0, z: hp.z });
  // Skid smoke last: five small puffs, never a huge haze.
  const puffs = [
    [hp.x - 2, hp.z + 4, 1.3], [hp.x + 2, hp.z + 4, 1.5], [hp.x, hp.z - 3, 1.8],
    [hp.x - 1, hp.z + 6, 1.4], [hp.x + 3, hp.z + 2, 1.6],
  ];
  for (const [px, pz, size] of puffs) {
    game.fx.smoke(px, 0.8, pz, { size, life: 0.9, color: 0xe8e2d8 });
  }
}

function stageOnFoot(game) {
  game.setTimeOfDay('afternoon');
  game.setMission(2);
  game.setHero(180, 140, Math.PI, false);
  game.camMode = 'onfoot';
  game.setWanted(2);
  game.missions.money = 12650;
  game.screen = 'play';
  game.aiming = true;
  const rx = 177;
  const rz = 142;
  // Three officers between Rook and the marker, aiming at him.
  const officerSpots = [
    [rx - 8, rz - 14], [rx + 8, rz - 16], [rx + 0, rz - 20],
  ];
  for (const [ox, oz] of officerSpots) {
    const off = game.police.spawnOfficer(ox, oz);
    off.group.rotation.y = Math.atan2(rx - ox, rz - oz);
    off.aim(true);
  }
  // Police cars parked: one as a roadblock across the road, the first one
  // a listed dispatch unit close to the player.
  const roadblock = game.police.cars[1];
  roadblock.group.position.set(rx + 3, 0, rz - 27);
  roadblock.group.rotation.y = Math.PI * 0.32;
  roadblock.speed = 0;
  const first = game.police.cars[0];
  first.group.position.set(rx + 6, 0, rz - 15);
  first.group.rotation.y = Math.PI;
  first.speed = 0;
  for (const c of game.police.cars) c.speed = 0;
  // A yellow cab parked ahead-left.
  const cab = game.traffic[0];
  cab.paintMat.color.setHex(0xe8b83a);
  cab.group.position.set(171, 0, 118);
  cab.group.rotation.y = Math.PI * 0.5;
  cab.speed = 0;
  cab.group.userData.speed = 0;
  // Twelve pedestrians on the sidewalks ahead of Rook.
  for (let i = 0; i < 12; i++) {
    const ped = game.peds[i];
    const x = i % 2 === 0 ? 171 : 189;
    posePed(ped, x, 0, 108 + i * 3);
  }
  // Two pedestrians lying on the road, fallen in the firefight.
  const fallenSpots = [[rx - 3, rz - 10], [rx + 5, rz - 12]];
  for (let i = 0; i < 2; i++) {
    const ped = game.peds[12 + i];
    ped.fallen = true;
    ped.speed = 0;
    ped.group.position.set(fallenSpots[i][0], 0.32, fallenSpots[i][1]);
    ped.group.rotation.set(0, 0, Math.PI / 2);
  }
  game.setDialogue('Marla: "Case goes to the marina. Don\'t open it."', 6);
  forward(game, 1.2, IDLE);
  // The firefight, last: Rook's muzzle flash, return fire, tracers, sparks.
  game.fx.muzzle(rx, 1.4, rz - 3);
  game.fx.muzzle(rx - 8, 1.4, rz - 13);
  game.fx.muzzle(rx + 8, 1.4, rz - 15);
  game.fx.tracer([rx, 1.4, rz - 3], [rx - 8, 1.4, rz - 13]);
  game.fx.tracer([rx - 8, 1.4, rz - 13], [rx - 1, 1.2, rz - 4]);
  game.fx.tracer([rx + 8, 1.4, rz - 15], [rx + 1, 1.2, rz - 5]);
  game.fx.sparks(rx + 3, 1.2, rz - 26, 10);
  game.fx.smoke(rx, 1.2, rz - 10, { size: 1.2, life: 0.9, color: 0xffd98a });
}

function stagePier(game) {
  game.setTimeOfDay('sunset');
  game.setMission(5);
  game.setHero(185, 228, 0, false);
  game.camMode = 'pier';
  game.setWanted(0);
  game.missions.money = 12650;
  game.screen = 'play';
  // Rook stands on the deck, facing the sea — south, toward the camera.
  game.rook.group.position.y = 1.1;
  // The GT parked on the deck beside him.
  game.heroCar.group.position.set(186, 1.1, 226);
  game.heroCar.group.rotation.y = Math.PI;
  // Twenty pedestrians on the pier deck, four more on the beach.
  for (let i = 0; i < 20; i++) {
    const ped = game.peds[i];
    posePed(ped, 181.5 + (i % 4) * 2.4, 1.1, 218 - Math.floor(i / 4) * 13);
  }
  for (let i = 20; i < 24; i++) {
    const ped = game.peds[i];
    posePed(ped, 196 + ((i - 20) % 4) * 4, 0, 165 + Math.floor((i - 20) / 4) * 12);
  }
  game.setDialogue('Marla: "Boat\'s at the pier end. Tide waits for nobody."', 6);
  forward(game, 1.5, IDLE);
}

function stageAssetCar(game) {
  isolateForTurntable(game, { x: 0, y: 0.8, z: 0, dist: 9, height: 3.2, az: Math.PI / 4, fov: 50 });
  game.heroCar.group.visible = true;
  game.heroCar.group.position.set(0, 0, 0);
  game.screen = 'play';
  forward(game, 0.5, IDLE);
  game.heroCar.group.rotation.y = 0;
}

function stageAssetPolice(game) {
  isolateForTurntable(game, { x: 0, y: 0.8, z: 0, dist: 9, height: 3.2, az: Math.PI / 4, fov: 50 });
  const car = game.police.spawnCar(0, 0, 'PURSUIT');
  car.speed = 0;
  game.screen = 'play';
  forward(game, 0.5, IDLE);
  car.group.rotation.y = 0;
}

function stageAssetHero(game) {
  isolateForTurntable(game, { x: 0, y: 1.0, z: 0, dist: 4.5, height: 1.8, az: Math.PI / 4, fov: 50 });
  game.rook.group.visible = true;
  game.rook.group.position.set(0, 0, 0);
  game.rook.group.rotation.y = 0;
  game.screen = 'play';
  forward(game, 0.5, IDLE);
}

function stageAssetBuilding(game) {
  isolateForTurntable(game, { x: 0, y: 12, z: 0, dist: 55, height: 16, az: Math.PI / 4, fov: 50 });
  const rng = makeRng(1);
  const b = makeBuilding(0, 0, 24, 20, 28, PALETTES[1], rng, 'full', true);
  game.scene.add(b);
  game.screen = 'play';
  forward(game, 0.5, IDLE);
}

function stageAssetHeli(game) {
  isolateForTurntable(game, { x: 0, y: 18, z: 0, dist: 14, height: 19.5, az: Math.PI / 4, fov: 50 });
  game.heroCar.group.visible = true;
  game.heroCar.group.position.set(0, 0, 0);
  game.heli.group.visible = true;
  game.heli.setHold(0, 18, 0);
  game.setWanted(3);
  game.screen = 'play';
  forward(game, 1.0, IDLE);
}

const STAGES = {
  title: stageTitle,
  chase: stageChase,
  onfoot: stageOnFoot,
  pier: stagePier,
  asset_car: stageAssetCar,
  asset_police: stageAssetPolice,
  asset_hero: stageAssetHero,
  asset_building: stageAssetBuilding,
  asset_heli: stageAssetHeli,
};

// Run one shot by name. An unknown name falls back to the title shot.
export function runShot(name, game) {
  const stage = STAGES[name] ?? STAGES.title;
  stage(game);
  game.render();
}
