// Vice Shores — staged screenshots.
//
// Each shot is a deterministic pose of the live game: the camera, the
// time of day, the hero, the police and the pedestrians are all placed by
// hand, then the game is stepped forward a second or two so the traffic,
// the helicopter and the effects settle into a natural frame. The three
// shots are the dossier: title (aerial over the city at golden hour),
// chase (a four-star police chase on the boulevard) and onfoot (a dusk
// firefight in the night market). There is no progress screen shot — the
// entry ships exactly these three.

import { scriptedInput } from './input.js';
import { makeRng } from './random.js';
import { buildMarket } from './market.js';
import { DISPATCH_ROSTER } from './config.js';

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

// Title: golden hour over the whole city. The camera is the aerial
// slow-orbit, so the frame holds the towers, the beach and the sea at
// once, with the logo and PRESS START laid over it by the title card.
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

// Chase: a four-star pursuit on the boulevard at golden hour. Eight
// police cars in total; the six that matter are placed ahead and beside
// the hero, inside the chase camera's view, and carry the fixed dispatch
// roster (name + tactic) so the HUD panel reads as one coherent board.
// The helicopter holds off the hero's left shoulder with its beam on him.
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
  const aimAt = (x, z) => Math.atan2(hp.x - x, hp.z - z);

  // Four cars ahead of the hero, in the camera's view. The far pair sits
  // wider than the near pair so no car hides behind another from the
  // chase camera — all six read as separate cars.
  const ahead = [
    [hp.x - 5, hp.z - 12], [hp.x + 5, hp.z - 12],
    [hp.x - 13, hp.z - 19], [hp.x + 13, hp.z - 19],
  ];
  for (let i = 0; i < 4; i++) {
    const car = game.police.cars[i];
    car.group.position.set(ahead[i][0], 0, ahead[i][1]);
    car.group.rotation.y = aimAt(ahead[i][0], ahead[i][1]);
    car.speed = 0;
    car.group.userData.speed = 0;
  }
  // Two flank cars beside the hero, also in view — close enough to the
  // centreline that the chase camera holds them, not at the frame edge.
  const flanks = [[hp.x - 10, hp.z - 8], [hp.x + 10, hp.z - 8]];
  for (let i = 0; i < 2; i++) {
    const car = game.police.spawnCar(flanks[i][0], flanks[i][1], 'FLANKING');
    car.group.rotation.y = aimAt(flanks[i][0], flanks[i][1]);
    car.speed = 0;
    car.group.userData.speed = 0;
  }
  // Two more behind the hero, out of frame, keeping the chase honest.
  const behind = [[hp.x - 6, hp.z + 14], [hp.x + 6, hp.z + 14]];
  for (let i = 0; i < 2; i++) {
    const car = game.police.spawnCar(behind[i][0], behind[i][1], 'PURSUIT');
    car.group.rotation.y = aimAt(behind[i][0], behind[i][1]);
    car.speed = 0;
    car.group.userData.speed = 0;
  }
  // The dispatch panel shows the first six cars, so pin the roster to
  // them in order: name and tactic exactly as the board should read.
  for (let i = 0; i < 6; i++) {
    game.police.cars[i].name = DISPATCH_ROSTER[i].name;
    game.police.cars[i].tactic = DISPATCH_ROSTER[i].tactic;
  }
  game.heli.setHold(hp.x - 5, 10, hp.z - 15);
  game.heli.aimAt({ x: hp.x, y: 0, z: hp.z });
  // Small skid smoke, no longer than the car, already thinning.
  const puffs = [
    [hp.x - 2, hp.z + 4, 1.3], [hp.x + 2, hp.z + 4, 1.5], [hp.x, hp.z - 3, 1.8],
    [hp.x - 1, hp.z + 6, 1.4], [hp.x + 3, hp.z + 2, 1.6],
  ];
  for (const [px, pz, size] of puffs) {
    game.fx.smoke(px, 0.8, pz, { size, life: 0.9, color: 0xe8e2d8 });
  }
}

// On foot: a dusk firefight in the night market. Rook is aiming his pistol
// at two visible armed officers; two more figures are already down on the
// ground (never on a car); shoppers crowd the stalls behind him; the
// prompt tells the player to duck behind a stall.
function stageOnFoot(game) {
  game.setTimeOfDay('sunset');
  game.setMission(2);
  game.setHero(180, 140, Math.PI, false);
  game.heroCar.group.position.set(176, 0, 128);
  game.heroCar.group.rotation.y = Math.PI;
  game.camMode = 'onfoot';
  game.setWanted(2);
  game.missions.money = 12650;
  game.screen = 'play';
  game.aiming = true;
  const rx = 177;
  const rz = 142;
  const market = buildMarket(makeRng(1));
  game.scene.add(market.group);
  // Two armed officers in Rook's sights, aiming back at him — spread
  // wide of the parked car so each reads as its own standing figure.
  const officerSpots = [[165, 124], [188, 122]];
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
  // Shoppers at the stall fronts, then more browsing the market row:
  // ten civilians in the frame, none of them in Rook's line of fire.
  for (let i = 0; i < 5; i++) {
    const ped = game.peds[i];
    const f = market.stallFronts[i];
    posePed(ped, f.x, 0, f.z, -Math.PI / 2);
  }
  for (let i = 5; i < 10; i++) {
    const ped = game.peds[i];
    posePed(ped, 170 + (i % 3), 0, 120 + (i - 5) * 5, -Math.PI / 2);
  }
  // Two fallen figures lying flat in the open street, clearly visible
  // to the camera — on the ground, never on a car, never behind a stall.
  // Both sit south of the parked car, one each side of its path.
  const fallenSpots = [[180, 134], [185, 137]];
  for (let i = 0; i < 2; i++) {
    const ped = game.peds[10 + i];
    ped.fallen = true;
    ped.speed = 0;
    ped.lieDown();
    // Bright high-visibility shirt so a downed body pops against the
    // dark asphalt and reads instantly, whatever its random shirt was.
    ped.group.traverse((m) => {
      if (m.isMesh && m.geometry && m.geometry.type === 'CapsuleGeometry'
        && Math.abs(m.position.y - 1.15) < 0.05) {
        m.material = m.material.clone();
        m.material.color.setHex(0xffe14a);
      }
    });
    ped.group.position.set(fallenSpots[i][0], 0.32, fallenSpots[i][1]);
    ped.group.rotation.set(0, 0, Math.PI / 2);
  }
  // Four extra shoppers browsing the street in front of the stalls, so
  // the market reads as a crowd (10+ NPCs) without anyone blocking
  // the camera or Rook's line of fire.
  const streetShoppers = [[178, 122], [184, 126], [180, 132], [186, 136]];
  for (let i = 0; i < 4; i++) {
    posePed(game.peds[12 + i], streetShoppers[i][0], 0, streetShoppers[i][1], Math.PI / 2 + (i % 2 === 0 ? 0.4 : -0.4));
  }
  game.setPrompt('duck behind the stall');
  forward(game, 1.2, IDLE);
  game.shoot();
  // Muzzle flash and tracers aim at the left officer (165, 124), the
  // one Rook is shooting at; the second tracer is the officer's return
  // fire back toward Rook.
  game.fx.muzzle(165, 1.4, 124);
  game.fx.tracer([rx, 1.4, rz - 3], [165, 1.4, 124]);
  game.fx.tracer([165, 1.4, 124], [rx - 1, 1.2, rz - 4]);
  game.fx.sparks(rx + 3, 1.2, rz - 26, 10);
  game.fx.smoke(rx, 1.2, rz - 10, { size: 1.2, life: 0.9, color: 0xffd98a });
}

const STAGES = {
  title: stageTitle,
  chase: stageChase,
  onfoot: stageOnFoot,
};

export function runShot(name, game) {
  const stage = STAGES[name] ?? STAGES.title;
  stage(game);
  game.render();
}
