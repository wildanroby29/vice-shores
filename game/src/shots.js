// The four screenshot scenes. Each one stages a real game world — a fresh
// reset, then the rules stepped forward for a fixed number of frames with a
// simple autopilot — so every frame is what the game genuinely looks like and
// the same seed always gives the same frame. The chase and on-foot shots show
// the dense HUD; the title shot shows the poster title over the bright city;
// the garage shot shows the upgrade shop over the player's car.

import { createRandom } from './random.js';
import { createCar, createPlayerCar, damageCar } from './vehicles.js';
import { createPedestrian } from './people.js';
import { spawnPoliceUnit } from './police.js';

const STEP = 1 / 30;

/** Drive straight up the boulevard at full throttle, no steering. */
function driveNorth(game, seconds) {
  const frames = Math.round(seconds / STEP);
  for (let i = 0; i < frames; i += 1) {
    game.step(STEP, { up: true, down: false, left: false, right: false, shoot: false, sneak: false, action: false });
  }
}

/** Walk forward for a few seconds. */
function walkForward(game, seconds) {
  const frames = Math.round(seconds / STEP);
  for (let i = 0; i < frames; i += 1) {
    game.step(STEP, { up: true, down: false, left: false, right: false, shoot: false, sneak: false, action: false });
  }
}

function stageChase(game, seed) {
  const rng = createRandom(seed);
  game.reset(seed);
  const state = game.state;
  // The player in the bright-orange Rukun Pelo GT, tearing north up the
  // beachfront boulevard at 120+ km/h, ocean and palms on the right.
  const gt = createPlayerCar(240, 30, -Math.PI / 2);
  gt.speed = 34;
  state.player.car = gt;
  state.player.x = gt.x;
  state.player.z = gt.z;
  state.player.heading = gt.heading;
  state.player.onFoot = false;
  state.allCars = [gt, ...state.allCars];
  state.wanted = 5;
  // Four pursuit units: two ramming from behind, one flanking alongside,
  // one cutting across ahead. The helicopter is already above.
  const spots = [
    { x: 236, z: 52, tactic: 'RAMMING' },
    { x: 245, z: 58, tactic: 'FLANKING' },
    { x: 243, z: 8, tactic: 'PIT' },
    { x: 234, z: -6, tactic: 'CUT OFF' },
  ];
  state.police = spots.map((s, i) => {
    const unit = spawnPoliceUnit(state.city, rng, state.player, i, 5);
    unit.car.x = s.x;
    unit.car.z = s.z;
    unit.car.heading = -Math.PI / 2;
    unit.car.speed = 36;
    unit.tactic = s.tactic;
    unit.dist = Math.hypot(unit.car.x - gt.x, unit.car.z - gt.z);
    state.allCars.push(unit.car);
    return unit;
  });
  // A wrecked police car burning at the roadside behind the chase.
  const wreck = createCar('police', '#f4f4f4', 233, 74, -Math.PI / 2, { driver: false });
  damageCar(wreck, 200);
  state.allCars.push(wreck);
  state.helo.active = true;
  state.helo.x = gt.x + 18;
  state.helo.z = gt.z - 34;
  state.helo.y = 44;
  state.marker = { x: 240, z: -140, label: 'BOULEVARD' };
  game.hud.showGame();
  game.hud.showDialogue('MARLA', 'Five stars, Rook — and the whole city is watching the boulevard. Do not slow down.', 8);
  game.renderer.setCameraMode('chase');
  driveNorth(game, 2.5);
  game.step(STEP, { up: true, down: false, left: false, right: false, shoot: false, sneak: false, action: false });
  // Fixed chase camera: low and close directly behind the GT, looking north
  // up the boulevard — the GT sits lower-centre, the police and the
  // helicopter's beam ahead of it, the ocean and palms to the right.
  const car = state.player.car;
  game.renderer.setShotCamera(
    [car.x + 4, 4.5, car.z + 17],
    [car.x, 2, car.z - 28],
  );
  // The helicopter, placed after the last step so it stays put: ahead of the
  // GT and high enough that its spotlight beam slants down onto the car.
  state.helo.x = car.x + 6;
  state.helo.z = car.z - 45;
  state.helo.y = 30;
  state.helo.beamTarget = { x: car.x, z: car.z };
  return { mode: 'chase' };
}

function stageOnFoot(game, seed) {
  const rng = createRandom(seed);
  game.reset(seed);
  const state = game.state;
  // Rook on foot in his red jacket on the boulevard sidewalk, about to take
  // a Sunline Cab whose driver is already running. The street is busy: a
  // crowd of pedestrians on both sidewalks, some in small groups.
  state.player.onFoot = true;
  state.player.car = null;
  state.player.x = 236;
  state.player.z = 62;
  state.player.heading = -Math.PI / 2 - 0.3;
  state.player.speed = 0;
  // The cab to steal, stopped in the lane beside the sidewalk.
  const cab = createCar('taxi', '#ffd21f', 240, 44, -Math.PI / 2, { driver: false });
  state.allCars.push(cab);
  // The ejected driver, fleeing down the sidewalk.
  const driver = createPedestrian(state.city, rng, 238, 48);
  driver.state = 'flee';
  driver.fleeTimer = 4;
  state.peds.push(driver);
  // A busy street: a dozen extra pedestrians clustered on the sidewalks
  // around the carjacking, in varied outfits, walking in small groups.
  for (let i = 0; i < 14; i += 1) {
    const px = 232 + rng() * 10;
    const pz = 18 + rng() * 66;
    const ped = createPedestrian(state.city, rng, px, pz);
    ped.waypoint = { x: 232 + rng() * 10, z: 18 + rng() * 66 };
    state.peds.push(ped);
  }
  state.wanted = 2;
  const unit = spawnPoliceUnit(state.city, rng, state.player, 0, 2);
  unit.car.x = 244;
  unit.car.z = 96;
  unit.car.heading = -Math.PI / 2;
  unit.car.speed = 30;
  unit.dist = 40;
  state.police = [unit];
  state.allCars.push(unit.car);
  state.marker = { x: 240, z: 44, label: 'TAXI' };
  game.hud.showGame();
  game.hud.showDialogue('MARLA', 'That cab on Palm Row is yours, Rook. Take it — the driver already knows the drill.', 8);
  game.renderer.setCameraMode('onfoot');
  walkForward(game, 1.6);
  // Fixed camera: behind and left of Rook, looking down the busy street at
  // the cab, the crowd and the neon buildings.
  const p = state.player;
  game.renderer.setShotCamera(
    [p.x - 7, 5.5, p.z + 13],
    [p.x + 3, 1.2, p.z - 16],
  );
  game.step(STEP, { up: true, down: false, left: false, right: false, shoot: false, sneak: false, action: false });
  return { mode: 'onfoot' };
}

function stageTitle(game, seed) {
  game.reset(seed);
  const state = game.state;
  // A living city behind the title: traffic on the boulevard, pedestrians
  // on the sidewalks, the sun low over the ocean.
  state.player.onFoot = true;
  state.player.car = null;
  state.player.x = 240;
  state.player.z = 0;
  state.player.heading = -Math.PI / 2;
  state.marker = null;
  game.renderer.setCameraMode('title');
  game.hud.setSaveSlots(game.saveSlots);
  game.hud.showTitle();
  // Let the title camera drift for two seconds so it settles on the wide
  // beachfront view: boulevard, palms, ocean and skyline.
  for (let i = 0; i < 60; i += 1) {
    game.step(STEP, { up: false, down: false, left: false, right: false, shoot: false, sneak: false, action: false });
  }
  return { mode: 'title' };
}

function stageGarage(game, seed) {
  game.reset(seed);
  const state = game.state;
  // The Rukun Pelo GT parked at Rook's garage on Palm Row, a little banged
  // up so the repair matters, with the upgrade shop open over it.
  const gt = createPlayerCar(190, 140, Math.PI / 2);
  gt.condition = 72;
  gt.speed = 0;
  state.player.car = gt;
  state.player.x = gt.x;
  state.player.z = gt.z;
  state.player.heading = gt.heading;
  state.player.onFoot = false;
  state.garageCar = gt;
  state.allCars = [gt, ...state.allCars];
  state.money = 12650;
  state.marker = null;
  game.mode = 'garage';
  game.renderer.setCameraMode('garage');
  game.hud.showGame();
  game.hud.showOverlay(game.hud.garageHTML(state));
  // Dock the shop panel on the left so the GT shows on the right.
  game.hud.overlayEl.style.justifyContent = 'flex-start';
  game.hud.overlayEl.style.paddingLeft = '56px';
  for (let i = 0; i < 30; i += 1) {
    game.step(STEP, { up: false, down: false, left: false, right: false, shoot: false, sneak: false, action: false });
  }
  return { mode: 'garage' };
}

/** Stage the named scene on a fresh world and return its mode. */
export function stageShot(name, game, seed = 1) {
  if (name === 'onfoot') return stageOnFoot(game, seed);
  if (name === 'title') return stageTitle(game, seed);
  if (name === 'garage') return stageGarage(game, seed);
  return stageChase(game, seed);
}
