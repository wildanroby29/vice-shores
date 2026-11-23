// Vice Shores — boot and the one loop. The world advances in fixed 1/60 s
// steps; input is read every frame and the renderer paints what is there.
// ?shot=chase|onfoot|title|garage (with &seed=N) stages that scene instead
// of running the loop, paints it, and sets window.__VS_READY__ for a
// screenshot. Otherwise the game runs: title screen, driving and walking,
// carjacking, shooting, wanted + police, 8 jobs, garage, pause, busted.
// three.js is loaded by the page as a classic script (game/vendor/three.min.js),
// so the modules read it from the window global instead of importing the UMD
// build (an ES-module import of a UMD file yields an empty namespace).
const THREE = window.THREE;
import { mulberry32, clamp, damp } from './random.js';
import { CITY, JOBS, CREW, WEAPONS, GARAGE_PRICES, PLAYER_CAR, TAXI, freshState, rankFor } from './config.js';
import { attachInput, endFrame, steer, hit, down } from './input.js';
import { ensureAudio, sfx, setEngine } from './audio.js';
import { buildCity, makeCarShape } from './city.js';
import { makeTraffic, updateTraffic, makeParkedCars, makeBurningWreck, animateWreck } from './vehicles.js';
import { makePerson, makePedestrians, updatePedestrians, animateWalk } from './people.js';
import { makePolice, updatePolice } from './police.js';
import { makeBeacon, animateBeacon, currentJob, completeJob, JOB_SPOTS } from './missions.js';
import { buildHUD, updateHUD, setDialogue, drawMinimap, buildTitleOverlay, buildGarageOverlay, buildPauseOverlay, buildBustedOverlay } from './hud.js';
import { makeRenderer, makeScene, makeCamera, updateCamera, setShotCamera, resize } from './render3d.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261122;

const canvas = document.getElementById('game');
const state = freshState();
const renderer = makeRenderer(canvas);
const scene = makeScene();
const camera = makeCamera();
const city = buildCity(scene);
const rng = mulberry32(seed);

// The player: Rook on foot, and his GT. Rook wears a brown leather jacket
// so he reads clearly as the protagonist from behind and in a crowd.
const rook = makePerson(rng, { shirt: 0x6b4423, pants: 0x2a3440, height: 1.8 });
rook.position.set(-44, 0, 30);
scene.add(rook);
const gt = makeCarShape(PLAYER_CAR.color, false);
gt.position.set(-44, 0, 36);
gt.rotation.y = Math.PI;
scene.add(gt);
const cab = makeCarShape(TAXI.color, true);
cab.position.set(0, 0, 12);
scene.add(cab);

const traffic = makeTraffic(scene, 14);
const parked = makeParkedCars(scene, rng);
const peds = makePedestrians(scene, 26);
const police = makePolice(scene);
const beacon = makeBeacon(scene);

const player = { x: -44, z: 30, rot: Math.PI, speed: 0, mesh: rook };
const world = { state, player, gt, cab, police, peds, traffic, wrecks: [], stagedOfficers: [], scene };

let screen = 'title'; // title | game | pause | busted | garage
let dialogueTimer = 0;
let wantedTimer = 0;
let jobTimer = 0;
let t = 0;

const hud = buildHUD(document, state);
let titleOverlay = null;
let garageOverlay = null;
let pauseOverlay = null;
let bustedOverlay = null;

function showOverlay(which) {
  for (const ov of [titleOverlay, garageOverlay, pauseOverlay, bustedOverlay]) {
    if (ov) ov.classList.add('hidden');
  }
  if (which === 'title' && titleOverlay) titleOverlay.classList.remove('hidden');
  if (which === 'garage' && garageOverlay) garageOverlay.classList.remove('hidden');
  if (which === 'pause' && pauseOverlay) pauseOverlay.classList.remove('hidden');
  if (which === 'busted' && bustedOverlay) bustedOverlay.classList.remove('hidden');
  document.getElementById('hud').style.opacity = which === 'game' ? '1' : '0.25';
}

function startGame() {
  ensureAudio();
  showOverlay('game');
  screen = 'game';
  setDialogue(document, currentJob(state).say);
  dialogueTimer = 6;
  sfx.jingle();
}

function openGarage() {
  screen = 'garage';
  state.inGarage = true;
  showOverlay('garage');
  sfx.click();
}

function closeGarage() {
  screen = 'game';
  state.inGarage = false;
  showOverlay('game');
  sfx.click();
}

function bustPlayer() {
  screen = 'busted';
  state.busted = true;
  state.money = Math.max(0, state.money - 500);
  state.wanted = 0;
  sfx.busted();
  showOverlay('busted');
}

function respawn() {
  state.busted = false;
  state.health = 100;
  state.armor = 60;
  player.x = CITY.safehouse.x;
  player.z = CITY.safehouse.z;
  player.rot = 0;
  rook.position.set(player.x, 0, player.z);
  screen = 'game';
  showOverlay('game');
}

function buyGarageItem(i) {
  const item = GARAGE_PRICES[i];
  if (state.money < item.price) return;
  state.money -= item.price;
  if (i === 0) state.carCondition = 100;
  if (i === 1) state.carCondition = Math.min(100, state.carCondition + 15);
  if (i === 2) state.armor = Math.min(100, state.armor + 40);
  if (i === 3) { state.ammo[2] = 36; state.ammo[3] = 90; }
  if (i === 4) state.nitro = true;
  sfx.pickup();
  const cond = document.getElementById('garageCond');
  if (cond) cond.textContent = Math.round(state.carCondition) + '%';
}

function nearestCar(maxDist) {
  let best = null, bestD = maxDist;
  for (const c of [gt, cab, ...parked, ...traffic]) {
    const d = Math.hypot(c.position.x - player.x, c.position.z - player.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function stepGame(dt) {
  t += dt;
  const s = steer();
  // Crew abilities.
  for (const c of CREW) {
    if (hit('Key' + c.key) && (state.crewCooldown[c.key] || 0) <= 0) {
      if (c.key === 'Q' && state.wanted > 0) { state.wanted -= 1; setDialogue(document, 'Mira: plates swapped. One star gone.'); }
      if (c.key === 'C') { state.carCondition = Math.min(100, state.carCondition + 35); setDialogue(document, 'Jai: patched her up, good as new.'); }
      if (c.key === 'V') { state.wanted = 0; setDialogue(document, 'Kiri: eyes out — they lost you.'); }
      state.crewCooldown[c.key] = c.cooldown;
      dialogueTimer = 4;
      sfx.pickup();
    }
    if (state.crewCooldown[c.key] > 0) state.crewCooldown[c.key] -= dt;
  }
  // Radio.
  if (hit('KeyM')) {
    state.radioIndex = (state.radioIndex + 1) % 4;
    sfx.click();
  }
  // Weapons.
  for (const w of WEAPONS) {
    if (hit('Digit' + w.slot)) { state.weaponSlot = w.slot; sfx.click(); }
  }
  // Pause / garage.
  if (hit('KeyP') || hit('Escape')) {
    screen = 'pause';
    showOverlay('pause');
    return;
  }
  if (hit('KeyG')) { openGarage(); return; }

  // Enter / steal a car.
  if (hit('KeyE')) {
    if (state.onFoot) {
      const car = nearestCar(4);
      if (car) {
        state.onFoot = false;
        state.wanted = Math.min(5, state.wanted + (car === gt ? 0 : 1));
        player.x = car.position.x;
        player.z = car.position.z;
        player.rot = car.rotation.y;
        sfx.pickup();
        setDialogue(document, car === cab ? 'The cab is yours, Rook. Drive.' : 'Nice ride. It is yours now.');
        dialogueTimer = 4;
      }
    } else {
      state.onFoot = true;
      player.x += Math.sin(player.rot + Math.PI / 2) * 2;
      player.z += Math.cos(player.rot + Math.PI / 2) * 2;
      rook.position.set(player.x, 0, player.z);
      sfx.click();
    }
  }

  // Shooting.
  if (hit('Space') && state.weaponSlot > 1) {
    if ((state.ammo[state.weaponSlot] || 0) > 0) {
      state.ammo[state.weaponSlot] -= 1;
      state.wanted = Math.min(5, state.wanted + 1);
      sfx.shot();
    }
  }
  if (hit('Space') && state.weaponSlot === 1) sfx.punch();

  // Movement.
  const sprint = down('ShiftLeft') || down('ShiftRight');
  if (state.onFoot) {
    const speed = sprint ? 7 : 4;
    const mx = Math.sin(player.rot) * s.y + Math.cos(player.rot) * s.x;
    const mz = Math.cos(player.rot) * s.y - Math.sin(player.rot) * s.x;
    player.x += mx * speed * dt;
    player.z += mz * speed * dt;
    player.rot += -s.x * 0.04;
    player.speed = Math.hypot(mx, mz) * speed;
    state.speedKmh = player.speed * 3.6;
    rook.position.set(player.x, 0, player.z);
    rook.rotation.y = player.rot;
    animateWalk(rook, t, player.speed / 4);
    // Stay inside the city.
    player.x = clamp(player.x, -58, 120);
    player.z = clamp(player.z, -115, 115);
  } else {
    const car = gt;
    const accel = PLAYER_CAR.accel * (state.nitro ? 1.35 : 1);
    player.speed = damp(player.speed, s.y * PLAYER_CAR.topSpeed, 1.6, dt);
    player.rot += -s.x * (0.9 + Math.abs(player.speed) * 0.012) * dt * (player.speed >= 0 ? 1 : -1);
    player.x += Math.sin(player.rot) * player.speed * dt;
    player.z += Math.cos(player.rot) * player.speed * dt;
    state.speedKmh = Math.abs(player.speed) * 3.6;
    car.position.set(player.x, 0, player.z);
    car.rotation.y = player.rot;
    rook.position.set(player.x, 0, player.z);
    rook.visible = false;
    // Hitting a pedestrian or a police car raises the heat.
    wantedTimer -= dt;
    if (wantedTimer <= 0) {
      for (const p of peds) {
        if (Math.hypot(p.position.x - player.x, p.position.z - player.z) < 2.2) {
          state.wanted = Math.min(5, state.wanted + 1);
          sfx.crash();
          wantedTimer = 2;
          break;
        }
      }
    }
    player.x = clamp(player.x, -58, 120);
    player.z = clamp(player.z, -115, 115);
    setEngine(true, Math.abs(player.speed) / PLAYER_CAR.topSpeed);
  }
  if (state.onFoot) { rook.visible = true; setEngine(false, 0); }

  // Wanted decays slowly when the player is calm and out of sight.
  if (state.wanted > 0) {
    wantedTimer -= dt;
    if (wantedTimer <= -8) { state.wanted -= 1; wantedTimer = 0; }
  }

  // Mission: reach the beacon spot to complete the job.
  const spot = JOB_SPOTS[Math.min(state.jobIndex, JOBS.length - 1)];
  beacon.position.set(spot.x, 0, spot.z);
  beacon.visible = true;
  if (Math.hypot(spot.x - player.x, spot.z - player.z) < 5) {
    const job = completeJob(state);
    setDialogue(document, `Job done: ${job.name} — $${job.payout}. ${currentJob(state).say}`);
    dialogueTimer = 6;
    jobTimer = 0;
    sfx.jingle();
  }
  animateBeacon(beacon, t);

  // World life.
  updateTraffic(traffic, dt);
  updatePedestrians(peds, dt, t);
  updatePolice(police, player, state.wanted, dt, t);
  for (const w of world.wrecks) animateWreck(w, t);
  if (state.wanted >= 4) sfx.sirenStart(); else sfx.sirenStop();

  // Clock advances a game-minute every few seconds.
  jobTimer += dt;
  if (jobTimer > 4) { state.clockMin += 1; jobTimer = 0; }
  if (dialogueTimer > 0) {
    dialogueTimer -= dt;
    if (dialogueTimer <= 0) setDialogue(document, '');
  }

  // Busted when health hits zero (police rams do damage on contact).
  if (state.wanted >= 3) {
    for (const car of police.cars) {
      if (Math.hypot(car.position.x - player.x, car.position.z - player.z) < 2.5) {
        state.health -= 14 * dt;
        if (state.health <= 0) { bustPlayer(); return; }
      }
    }
  }

  // HUD + minimap.
  updateHUD(document, state, police, player);
  drawMinimap(document, player, police, spot, state.jobDone);
  updateCamera(camera, player, state.onFoot, dt);
  endFrame();
}

function runShot(name) {
  const staged = stageShot(world, name);
  // Show the right overlay for the shot.
  if (staged.overlay === 'title') {
    titleOverlay = buildTitleOverlay(document, state, () => {});
    showOverlay('title');
  } else if (staged.overlay === 'garage') {
    garageOverlay = buildGarageOverlay(document, state, () => {}, () => {});
    showOverlay('garage');
  } else {
    showOverlay('game');
  }
  updateHUD(document, state, police, player);
  const spot = JOB_SPOTS[Math.min(state.jobIndex, JOBS.length - 1)];
  drawMinimap(document, player, police, spot, state.jobDone);
  setDialogue(document, currentJob(state).say);
  setShotCamera(camera, staged.cam, staged.look);
  // The title and garage screens carry their own menus — the in-game HUD
  // (job panel, dispatch, minimap, bars) must not clutter them.
  if (staged.overlay !== 'game') {
    const hudEl = document.getElementById('hud');
    if (hudEl) hudEl.style.display = 'none';
  }
  let painted = 0;
  function paint() {
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__VS_READY__ = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  attachInput();
  titleOverlay = buildTitleOverlay(document, state, startGame);
  garageOverlay = buildGarageOverlay(document, state, buyGarageItem, closeGarage);
  pauseOverlay = buildPauseOverlay(document, () => { screen = 'game'; showOverlay('game'); });
  bustedOverlay = buildBustedOverlay(document, respawn);
  showOverlay('title');
  updateHUD(document, state, police, player);
  drawMinimap(document, player, police, JOB_SPOTS[0], 0);
  setShotCamera(camera, [-43, 4.5, 34], [-48, 6, -80]);
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === 'game') {
      acc += dt;
      while (acc >= STEP) { stepGame(STEP); acc -= STEP; }
    } else if (screen === 'title') {
      t += dt;
      updatePedestrians(peds, dt, t);
      updateTraffic(traffic, dt);
      setShotCamera(camera, [-43, 4.5, 34], [-48, 6, -80]);
    }
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', () => resize(renderer, camera));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'game') { screen = 'pause'; showOverlay('pause'); }
  });
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
