import { scriptedInput } from './input.js';
import { makeRng } from './random.js';
import { buildMarket } from './market.js';

const IDLE = scriptedInput('IDLE');
const DRIVE = scriptedInput('DRIVE');

export function forward(game, seconds, input) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) game.step(1 / 60, input);
}

function posePed(ped, x, y, z, rotY) {
  ped.group.position.set(x, y, z);
  ped.target = { x, z };
  ped.speed = 0;
  if (rotY !== undefined) ped.group.rotation.y = rotY;
}

function stageTitle(game) {
  game.setTimeOfDay('golden');
  game.setMission(0);
  game.setHero(180, -20, 0, true);
  game.camMode = 'aerial';
  game.setWanted(0);
  game.missions.money = 12650;
  game.screen = 'play';
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
  for (let i = 0; i < 12; i++) {
    const ped = game.peds[i];
    const x = i % 2 === 0 ? 170 : 190;
    posePed(ped, x, 0, -15 + i * 4);
  }
  forward(game, 1.5, IDLE);
}

function stageChase(game) {
  game.setTimeOfDay('golden');
  game.setMission(1);
  game.setHero(0, 60, Math.PI, true);
  game.camMode = 'chaseShot';
  game.setWanted(4);
  game.setCondition(62);
  game.missions.money = 12650;
  game.screen = 'play';
  forward(game, 4, DRIVE);
  const hp = { x: game.heroCar.group.position.x, z: game.heroCar.group.position.z };
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
  game.heli.setHold(hp.x - 5, 10, hp.z - 15);
  game.heli.aimAt({ x: hp.x, y: 0, z: hp.z });
  const puffs = [
    [hp.x - 2, hp.z + 4, 1.3], [hp.x + 2, hp.z + 4, 1.5], [hp.x, hp.z - 3, 1.8],
    [hp.x - 1, hp.z + 6, 1.4], [hp.x + 3, hp.z + 2, 1.6],
  ];
  for (const [px, pz, size] of puffs) {
    game.fx.smoke(px, 0.8, pz, { size, life: 0.9, color: 0xe8e2d8 });
  }
}

function stageOnFoot(game) {
  game.setTimeOfDay('sunset');
  game.setMission(2);
  game.setHero(180, 140, Math.PI, false);
  game.camMode = 'onfoot';
  game.setWanted(2);
  game.missions.money = 12650;
  game.screen = 'play';
  game.aiming = true;
  const rx = 177;
  const rz = 142;
  const market = buildMarket(makeRng(1));
  game.scene.add(market.group);
  const officerSpots = [
    [rx - 8, rz - 14], [rx + 8, rz - 16], [rx + 0, rz - 20],
  ];
  for (const [ox, oz] of officerSpots) {
    const off = game.police.spawnOfficer(ox, oz);
    off.group.rotation.y = Math.atan2(rx - ox, rz - oz);
    off.aim(true);
  }
  const roadblock = game.police.cars[1];
  roadblock.group.position.set(rx + 3, 0, rz - 27);
  roadblock.group.rotation.y = Math.PI * 0.32;
  roadblock.speed = 0;
  const first = game.police.cars[0];
  first.group.position.set(rx + 6, 0, rz - 15);
  first.group.rotation.y = Math.PI;
  first.speed = 0;
  for (const c of game.police.cars) c.speed = 0;
  const cab = game.traffic[0];
  cab.paintMat.color.setHex(0xe8b83a);
  cab.group.position.set(189, 0, 118);
  cab.group.rotation.y = Math.PI * 0.5;
  cab.speed = 0;
  cab.group.userData.speed = 0;
  for (let i = 0; i < 5; i++) {
    const ped = game.peds[i];
    const f = market.stallFronts[i];
    posePed(ped, f.x, 0, f.z, -Math.PI / 2);
  }
  for (let i = 5; i < 10; i++) {
    const ped = game.peds[i];
    posePed(ped, 170 + (i % 3), 0, 120 + (i - 5) * 5, -Math.PI / 2);
  }
  const fallenSpots = [[rx - 3, rz - 10], [rx + 5, rz - 12]];
  for (let i = 0; i < 2; i++) {
    const ped = game.peds[10 + i];
    ped.fallen = true;
    ped.speed = 0;
    ped.group.position.set(fallenSpots[i][0], 0.32, fallenSpots[i][1]);
    ped.group.rotation.set(0, 0, Math.PI / 2);
  }
  game.setPrompt('duck behind the stall');
  forward(game, 1.2, IDLE);
  game.shoot();
  game.fx.muzzle(rx - 8, 1.4, rz - 13);
  game.fx.tracer([rx, 1.4, rz - 3], [rx - 8, 1.4, rz - 13]);
  game.fx.tracer([rx - 8, 1.4, rz - 13], [rx - 1, 1.2, rz - 4]);
  game.fx.sparks(rx + 3, 1.2, rz - 26, 10);
  game.fx.smoke(rx, 1.2, rz - 10, { size: 1.2, life: 0.9, color: 0xffd98a });
}

function stageProgress(game) {
  game.setTimeOfDay('golden');
  game.setMission(3);
  game.setHero(0, 0, 0, true);
  game.camMode = 'aerial';
  game.setWanted(0);
  game.missions.money = 12650;
  game.screen = 'play';
  forward(game, 1.5, IDLE);
}

const STAGES = {
  title: stageTitle,
  chase: stageChase,
  onfoot: stageOnFoot,
  progress: stageProgress,
};

export function runShot(name, game) {
  const stage = STAGES[name] ?? STAGES.title;
  stage(game);
  game.render();
}
