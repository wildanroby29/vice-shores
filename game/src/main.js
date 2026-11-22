// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between title, play, garage, paused and busted screens.
//
// ?shot=chase|onfoot|title|garage stages that scene instead of running the
// loop, paints it, and sets window.__VS_READY__ for a screenshot.
import { S, STEP, JOBS, WEAPONS, SAVE_KEY, BOULEVARD_X, GARAGE, SAFEHOUSE, PALETTE } from './config.js';
import { makeRng, range } from './random.js';
import { createRenderer, chaseCamera, footCamera, titleCamera, garageCamera } from './render3d.js';
import { buildCity } from './city.js';
import { makeCar, spawnTraffic, spawnParked, updateTraffic, updateFire, damageCar } from './vehicles.js';
import { makePerson, spawnPedestrians, updatePedestrians, animateWalk } from './people.js';
import { spawnPolice, updatePolice, addHeat } from './police.js';
import { startJob, updateMissions, currentJob } from './missions.js';
import { initHud, updateHud, drawMinimap, showTitle, hideTitle, showGarage, hideGarage, showPaused, hidePaused, showBusted, hideBusted, fillSaveSlots, setDialogue } from './hud.js';
import { createInput, ACT } from './input.js';
import { audio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261122;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const { renderer, scene, camera } = createRenderer(canvas);
const { group, workshop } = buildCity(scene);
const rng = makeRng(seed);

// The world: traffic, parked cars, pedestrians, the player's GT, Rook.
S.traffic = spawnTraffic(scene, 14);
const parked = spawnParked(scene, 10);
S.peds = spawnPedestrians(scene, 26);
const gtModel = { name: 'Rukun Pelo GT', kind: 'sports', color: PALETTE.sportsOrange, top: 62, len: 4.6 };
const playerCar = makeCar(scene, gtModel, BOULEVARD_X - 2, 80, 0, false);
playerCar.condition = 100;
S.car = playerCar;
const rook = makePerson(scene, BOULEVARD_X - 12, 80, 0, {
  isPlayer: true, height: 1.82, shirt: PALETTE.playerJacket, jacketTrim: 0xffffff, cap: 0x1a1a1a,
});
S.player = rook;
S.inCar = false;
const ctx = { scene, camera, traffic: S.traffic, workshop, officers: [], painter: null, focus: null, camera: 'title' };
const input = createInput(canvas);
initHud();
fillSaveSlots();
startJob(scene);

function announce(message) { status.textContent = message; }

function nearestCar(x, z, maxD) {
  let best = null, bd = maxD;
  for (const car of [...S.traffic, ...parked, playerCar, ...S.police]) {
    if (car.burning) continue;
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

function enterCar(car) {
  S.car = car; S.inCar = true;
  car.driver = S.player;
  S.player.mesh.visible = false;
  audio.engineStart(0);
  if (car !== playerCar) {
    addHeat(0.18);
    setDialogue('Marla: Nice. That one is yours now — drive like you mean it.', 5);
  }
}

function exitCar() {
  if (!S.car) return;
  const car = S.car;
  car.driver = null;
  S.inCar = false;
  audio.engineStop();
  const a = car.angle;
  rook.x = car.x - Math.cos(a) * 3.4;
  rook.z = car.z + Math.sin(a) * 3.4;
  rook.angle = a;
  rook.mesh.position.set(rook.x, 0, rook.z);
  rook.mesh.visible = true;
  S.player = rook;
}

function shoot() {
  if (S.inCar || S.weapon === 0) { audio.punch(); return; }
  audio.shot();
  const w = WEAPONS[S.weapon];
  if (w.ammo !== Infinity && w.ammo > 0) w.ammo -= 1;
  addHeat(0.12);
  // Hit the nearest pedestrian or police officer in front of the player.
  const fx = Math.cos(rook.angle), fz = -Math.sin(rook.angle);
  let best = null, bd = 14;
  for (const p of S.peds) {
    const dx = p.x - rook.x, dz = p.z - rook.z;
    const d = Math.hypot(dx, dz);
    if (d < bd && dx * fx + dz * fz > 0) { bd = d; best = p; }
  }
  if (best) { best.fleeing = true; S.respect += 10; }
}

function useCrew(slot) {
  if (slot === 0) { S.wanted = Math.max(0, S.wanted - 1); S.wantedHeat = Math.max(0, S.wantedHeat - 0.2); setDialogue('Mira: Plates swapped. They lost one star on you.', 5); }
  if (slot === 1 && S.car) { S.car.condition = Math.min(100, S.car.condition + 35); setDialogue('Jai: Patched up. She is good as new.', 5); }
  if (slot === 2) { S.wantedHeat = Math.max(0, S.wantedHeat - 0.5); setDialogue('Kiri: Eyes out — the VSPD is looking the wrong way.', 5); }
  audio.pickup();
}

function bust() {
  S.busted = true;
  S.mode = 'busted';
  S.money = Math.max(0, S.money - 150);
  audio.busted(); audio.sirenStop(); audio.engineStop();
  showBusted();
  announce('Busted. You lost $150.');
}

function respawn() {
  S.health = 100; S.armor = 60;
  S.wanted = 0; S.wantedHeat = 0;
  S.busted = false;
  for (const car of S.police) scene.remove(car.mesh);
  S.police = [];
  if (S.heli) { scene.remove(S.heli.mesh); S.heli = null; }
  exitCar();
  rook.x = SAFEHOUSE.x; rook.z = SAFEHOUSE.z;
  rook.mesh.position.set(rook.x, 0, rook.z);
  rook.mesh.visible = true;
  S.player = rook;
  hideBusted();
  S.mode = 'play';
  startJob(scene);
}

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: S.money, respect: S.respect, jobIndex: S.jobIndex,
      x: S.player ? S.player.x : 0, z: S.player ? S.player.z : 0,
    }));
  } catch { /* storage off: the save lasts this visit only */ }
}

function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    S.money = d.money; S.respect = d.respect; S.jobIndex = Math.min(d.jobIndex, JOBS.length - 1);
    rook.x = d.x; rook.z = d.z;
    rook.mesh.position.set(rook.x, 0, rook.z);
    return true;
  } catch { return false; }
}

function drive(dt) {
  const car = S.car;
  const h = input.held;
  const accel = h.up ? 26 : h.down ? -16 : 0;
  car.speed += accel * dt;
  if (!h.up && !h.down) car.speed *= Math.max(0, 1 - dt * 1.2);
  car.speed = Math.max(-12, Math.min(car.model.top, car.speed));
  const steer = (h.left ? 1 : 0) - (h.right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  car.angle += steer * 1.9 * dt * dir * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.z -= Math.sin(car.angle) * car.speed * dt;
  // Stay in the city.
  car.x = Math.max(-180, Math.min(190, car.x));
  car.z = Math.max(-180, Math.min(180, car.z));
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.angle;
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
  S.player = { x: car.x, z: car.z };
  audio.engineSet(Math.abs(car.speed));
  // Hitting pedestrians while driving adds heat.
  for (const p of S.peds) {
    if (Math.hypot(p.x - car.x, p.z - car.z) < 2.2 && Math.abs(car.speed) > 6) {
      p.fleeing = true;
      addHeat(0.15);
      audio.crash();
      car.speed *= 0.6;
    }
  }
}

function walk(dt) {
  const h = input.held;
  const fx = Math.cos(rook.angle), fz = -Math.sin(rook.angle);
  const rx = -fz, rz = fx;
  let mx = 0, mz = 0;
  if (h.up) { mx += fx; mz += fz; }
  if (h.down) { mx -= fx; mz -= fz; }
  if (h.left) { mx += rx; mz += rz; }
  if (h.right) { mx -= rx; mz -= rz; }
  const len = Math.hypot(mx, mz);
  const sp = h.sprint ? 7.5 : 4.2;
  if (len > 0.01) {
    rook.x += (mx / len) * sp * dt;
    rook.z += (mz / len) * sp * dt;
    rook.angle = Math.atan2(-(mz / len), mx / len);
    rook.mesh.position.set(rook.x, 0, rook.z);
    rook.mesh.rotation.y = rook.angle;
    animateWalk(rook, dt, true);
  } else animateWalk(rook, dt, false);
  S.player = rook;
}

function step(dt) {
  S.clock += dt;
  S.time += dt * 12; // 12 game-seconds per real second
  if (S.dialogueTimer > 0) S.dialogueTimer -= dt;
  // Wanted decays when quiet.
  if (S.wanted > 0) {
    S.wantedHeat = Math.max(0, S.wantedHeat - dt * 0.012);
    const w = Math.min(5, Math.floor(S.wantedHeat * 6));
    if (w < S.wanted) S.wanted = w;
  }
  updateTraffic(S.traffic, dt);
  updatePedestrians(S.peds, dt, S.player, S.wanted);
  for (const car of [...S.traffic, ...parked, playerCar, ...S.police]) updateFire(car, dt, S.clock);
  if (S.mode !== 'play') return;
  if (S.inCar) drive(dt); else walk(dt);
  spawnPolice(scene, S.player);
  updatePolice(scene, dt, S.clock, S.player, S.inCar ? S.car : null);
  updateMissions(scene, dt, S.player);
  // Busted: health gone, or 5 stars with police on top of the player.
  if (S.health <= 0) { bust(); return; }
  if (S.wanted >= 5) {
    const near = S.police.some((c) => Math.hypot(c.x - S.player.x, c.z - S.player.z) < 2.6);
    if (near) { bust(); return; }
  }
  // Garage is only entered at Dockside Customs.
  if (Math.hypot(S.player.x - GARAGE.x, S.player.z - GARAGE.z) < 16 && S.inCar) {
    S.nearGarage = true;
  } else S.nearGarage = false;
}

function handleActions() {
  const a = input.takeActions();
  if (!a) return;
  audio.unlock();
  if (a & ACT.PAUSE) {
    if (S.mode === 'play') { S.mode = 'paused'; showPaused(); announce('Paused.'); }
    else if (S.mode === 'paused') { S.mode = 'play'; hidePaused(); announce('Playing.'); }
    return;
  }
  if (S.mode === 'title') {
    if (a & ACT.ENTER || a & ACT.SHOOT) { hideTitle(); S.mode = 'play'; announce('Playing.'); }
    return;
  }
  if (S.mode === 'busted') {
    if (a & ACT.ENTER || a & ACT.SHOOT) respawn();
    return;
  }
  if (S.mode === 'garage') {
    if (a & ACT.GARAGE || a & ACT.PAUSE) { hideGarage(); S.mode = 'play'; }
    if (a & ACT.ENTER) {
      if (S.car && S.money >= 250) { S.money -= 250; S.car.condition = 100; setDialogue('Jai: Full repair. She is good as new.', 5); audio.jingle(); }
    }
    return;
  }
  if (S.mode !== 'play') return;
  if (a & ACT.ENTER) {
    if (S.inCar) exitCar();
    else {
      const car = nearestCar(rook.x, rook.z, 4.5);
      if (car) enterCar(car);
    }
  }
  if (a & ACT.SHOOT) shoot();
  if (a & ACT.RELOAD) { const w = WEAPONS[S.weapon]; if (w.ammo !== Infinity) { w.ammo = w.max; audio.pickup(); } }
  if (a & ACT.GARAGE && S.nearGarage) { S.mode = 'garage'; showGarage(); }
  if (a & ACT.MUTE) { S.muted = !S.muted; if (S.muted) audio.sirenStop(); }
  if (a & ACT.CREW1) useCrew(0);
  if (a & ACT.CREW2) useCrew(1);
  if (a & ACT.CREW3) useCrew(2);
  if (a & ACT.WEAPON1) S.weapon = 0;
  if (a & ACT.WEAPON2) S.weapon = 1;
  if (a & ACT.WEAPON3) S.weapon = 2;
  if (a & ACT.WEAPON4) S.weapon = 3;
}

function renderShotFrame() {
  const focus = ctx.focus;
  if (ctx.shotCam) {
    // Exact staged camera for a screenshot — overrides the follow cameras.
    camera.position.set(ctx.shotCam.pos[0], ctx.shotCam.pos[1], ctx.shotCam.pos[2]);
    camera.lookAt(ctx.shotCam.look[0], ctx.shotCam.look[1], ctx.shotCam.look[2]);
  } else if (ctx.camera === 'chase' && focus) chaseCamera(camera, focus, 0.5);
  else if (ctx.camera === 'foot' && focus) footCamera(camera, focus, 0.5);
  else if (ctx.camera === 'title') titleCamera(camera, 0);
  else if (ctx.camera === 'garage') garageCamera(camera, ctx.workshop.carSpot);
  // Let fire and the helicopter beam settle for a few frames.
  for (const car of [...S.traffic, ...parked, playerCar, ...S.police]) updateFire(car, 0.05, S.clock + 0.5);
  if (S.heli) {
    S.heli.rotor.rotation.y += 1.2;
    S.heli.mesh.position.set(S.heli.x, S.heli.y, S.heli.z);
  }
  renderer.render(scene, camera);
}

function runShot(name) {
  // Stage the scene, paint it several times so shadows and the beam settle,
  // then signal the screenshot.
  stageShot(name, ctx);
  updateHud();
  drawMinimap();
  let painted = 0;
  function paint() {
    renderShotFrame();
    painted += 1;
    if (painted < 6) requestAnimationFrame(paint);
    else { window.__VS_READY__ = true; window.__shotReady = true; }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  showTitle();
  announce('Vice Shores. Press Space or click to start.');
  let accumulator = 0;
  let last = performance.now();
  // Menu buttons.
  const menu = document.getElementById('menu');
  if (menu) {
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      audio.unlock();
      const act = b.dataset.act;
      if (act === 'continue') { hideTitle(); S.mode = 'play'; announce('Playing.'); }
      if (act === 'new') { S.money = 500; S.respect = 0; S.jobIndex = 0; hideTitle(); S.mode = 'play'; startJob(scene); announce('Playing.'); }
      if (act === 'load') { if (loadGame()) { hideTitle(); S.mode = 'play'; startJob(scene); announce('Playing.'); } }
      if (act === 'settings') setDialogue('Settings: sound on, radio Shore FM 98.6. Press P to pause.', 6);
    });
  }
  const gb = document.getElementById('garage-back');
  if (gb) gb.addEventListener('click', () => { hideGarage(); S.mode = 'play'; });
  const bb = document.getElementById('busted-continue');
  if (bb) bb.addEventListener('click', () => respawn());

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (S.mode === 'title') {
      titleCamera(camera, S.clock);
      renderer.render(scene, camera);
      return;
    }
    if (S.mode === 'garage') {
      garageCamera(camera, workshop.carSpot);
      renderer.render(scene, camera);
      return;
    }
    if (S.mode === 'paused' || S.mode === 'busted') {
      renderer.render(scene, camera);
      accumulator = 0;
      return;
    }
    while (accumulator >= STEP) { step(STEP); accumulator -= STEP; }
    if (S.inCar && S.car) chaseCamera(camera, S.car, 0.016);
    else if (S.player && S.player.mesh) footCamera(camera, S.player, 0.016);
    renderer.render(scene, camera);
    updateHud();
    drawMinimap();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S.mode === 'play') { S.mode = 'paused'; showPaused(); announce('Paused.'); }
  });
  window.addEventListener('beforeunload', saveGame);
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
