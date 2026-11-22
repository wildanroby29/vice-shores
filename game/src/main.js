// Boot and the one loop for Vice Shores: input every frame, the world in fixed
// 1/60 s steps, and the renderer painting what is there. Screens: title, play,
// pause, busted, garage. ?shot=chase|onfoot|title|garage stages that scene instead
// of running the loop, paints it a few times and sets window.__VS_READY__.
import { STEP, WORLD, CAR, PLAYER, JOBS, RADIO, SAVE_KEY, createState } from './config.js';
import { makeRng } from './random.js';
import { createAudio } from './audio.js';
import { createInput, ACT_ENTER, ACT_SHOOT, ACT_PAUSE, ACT_CONFIRM, ACT_GARAGE, ACT_RADIO, ACT_CAMERA, ACT_CREW_Q, ACT_CREW_C, ACT_CREW_V, ACT_RELOAD } from './input.js';
import { createCity } from './city.js';
import { makeCar, createTraffic, createParkedCars } from './vehicles.js';
import { makePerson, createPedestrians } from './people.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { createRenderer3D } from './render3d.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const rng = makeRng(seed);
const THREE = window.THREE;

const canvas = document.getElementById('game');
const renderer3d = createRenderer3D(THREE, canvas);
const scene = renderer3d.scene;
const state = createState();
const audio = createAudio();
const hud = createHud();
const city = createCity(THREE, rng);
scene.add(city.group);
const traffic = createTraffic(THREE, rng, scene);
const parkedCars = createParkedCars(THREE, rng, scene);
const peds = createPedestrians(THREE, rng, scene, 26);
const police = createPolice(THREE, rng, scene);
const missions = createMissions(THREE, scene);

// Rook, the player, on foot: red jacket so he reads instantly in every shot.
const playerMesh = makePerson(THREE, rng, { shirt: 0xe74c3c, pants: 0x2c3550, height: 1.82 });
playerMesh.position.set(state.player.x, 0, state.player.z);
scene.add(playerMesh);

// The player's own car: the orange Rukun Pelo GT, parked by the safehouse.
const playerCar = {
  mesh: makeCar(THREE, rng, 'gt', 0xff7a1a),
  x: 22,
  z: 22,
  heading: Math.PI / 2,
  speed: 0,
  condition: 97,
  nitro: false,
  name: 'RUKUN PELO GT',
};
playerCar.mesh.position.set(playerCar.x, 0, playerCar.z);
playerCar.mesh.rotation.y = playerCar.heading;
scene.add(playerCar.mesh);

const game = {
  THREE, scene, state, renderer3d, missions, police, traffic, parkedCars, peds,
  playerMesh, playerCar, rng,
  wrecks: [],
  staged: [],
};

let walkPhase = 0;
let crimeTimer = 0;
let muzzleTimer = 0;
let muzzle = null;

function clampToWorld(x, z) {
  return {
    x: Math.max(WORLD.minX + 1, Math.min(WORLD.maxX - 1, x)),
    z: Math.max(WORLD.minZ + 1, Math.min(WORLD.maxZ - 1, z)),
  };
}

function collideCircle(x, z, radius) {
  // Push a circle out of building colliders.
  for (const c of city.colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 < 0.0001) return { x: x + radius, z, hit: true };
      const d = Math.sqrt(d2);
      return { x: nx + (dx / d) * radius, z: nz + (dz / d) * radius, hit: true };
    }
  }
  return { x, z, hit: false };
}

function addWanted(n) {
  state.wanted = Math.max(0, Math.min(5, state.wanted + n));
  crimeTimer = 0;
}

function say(line, seconds) {
  state.dialogue = line;
  state.dialogueTimer = seconds || 4;
}

function flash(message, seconds) {
  state.message = message;
  state.messageTimer = seconds || 3;
}

function nearestCar(x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  const check = (car, cx, cz) => {
    const d = Math.hypot(cx - x, cz - z);
    if (d < bestD) { bestD = d; best = car; }
  };
  for (const p of parkedCars) if (!p.taken) check(p, p.x, p.z);
  for (const t of traffic.cars) check({ mesh: t.mesh, x: t.mesh.position.x, z: t.mesh.position.z, traffic: t }, t.mesh.position.x, t.mesh.position.z);
  if (playerCar.mesh.visible) check(playerCar, playerCar.x, playerCar.z);
  return best;
}

function enterCar(car) {
  if (car === playerCar) {
    state.player.inCar = playerCar;
  } else {
    // Steal it: the player's GT is parked, the stolen car becomes the ride.
    state.player.inCar = {
      mesh: car.mesh || car,
      x: car.x ?? car.mesh.position.x,
      z: car.z ?? car.mesh.position.z,
      heading: car.heading ?? 0,
      speed: 0,
      condition: 82,
      nitro: false,
      name: car.kind === 'taxi' ? 'SUNLINE CAB' : 'STOLEN SEDAN',
      stolen: car,
    };
    if (car.taken !== undefined) car.taken = true;
    state.stats.carsStolen += 1;
    addWanted(1);
    audio.sirenBurst();
    flash('Car stolen — wanted level up');
  }
  state.player.onFoot = false;
  playerMesh.visible = false;
  audio.engineStart(true);
}

function exitCar() {
  const car = state.player.inCar;
  if (!car) return;
  const hx = Math.cos(state.player.heading);
  const hz = -Math.sin(state.player.heading);
  state.player.x = car.x - hx * 2.5;
  state.player.z = car.z - hz * 2.5;
  state.player.onFoot = true;
  state.player.inCar = null;
  playerMesh.visible = true;
  audio.engineStart(false);
}

function shoot() {
  const weapon = [1, 2, 3, 4][state.weaponSlot - 1];
  void weapon;
  if (state.weaponSlot > 1) {
    if ((state.ammo[state.weaponSlot] || 0) <= 0) {
      flash('Out of ammo — press R to reload');
      return;
    }
    state.ammo[state.weaponSlot] -= 1;
  }
  state.stats.shotsFired += 1;
  audio.shot();
  addWanted(1);
  // Hitscan: the nearest police unit or pedestrian roughly ahead of Rook.
  const hx = Math.cos(state.player.heading);
  const hz = -Math.sin(state.player.heading);
  let best = null;
  let bestD = 40;
  for (const u of police.units) {
    const dx = u.mesh.position.x - state.player.x;
    const dz = u.mesh.position.z - state.player.z;
    const d = Math.hypot(dx, dz);
    const dot = (dx * hx + dz * hz) / (d || 1);
    if (d < bestD && dot > 0.86) { bestD = d; best = { kind: 'unit', unit: u }; }
  }
  if (best && best.kind === 'unit') {
    // Knock the unit's car sideways and flash a hit.
    best.unit.mesh.position.x += hx * 1.2;
    best.unit.mesh.position.z += hz * 1.2;
    flash('Hit! Police unit pushed back');
  }
  // Muzzle flash: a short bright line from Rook's hand forward.
  if (!muzzle) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
    muzzle = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9 }));
    scene.add(muzzle);
  }
  const start = new THREE.Vector3(state.player.x + hx * 0.5, 1.3, state.player.z + hz * 0.5);
  const end = new THREE.Vector3(state.player.x + hx * 6, 1.3, state.player.z + hz * 6);
  muzzle.geometry.setFromPoints([start, end]);
  muzzle.material.opacity = 0.9;
  muzzleTimer = 0.09;
}

function useCrew(key) {
  if ((state.crewCooldown[key] || 0) > 0) return;
  if (key === 'Q') {
    addWanted(-1);
    flash('Mira swapped the plates — 1 star lost');
  } else if (key === 'C') {
    if (state.player.inCar) {
      state.player.inCar.condition = Math.min(100, state.player.inCar.condition + 35);
      flash('Jai patched the car +35%');
    } else {
      state.health = Math.min(100, state.health + 25);
      flash('Jai patched you up +25 health');
    }
  } else if (key === 'V') {
    state.eyesOutTimer = 20;
    flash('Kiri has eyes out — police lose you for 20s');
  }
  state.crewCooldown[key] = key === 'Q' ? 45 : key === 'C' ? 40 : 60;
  audio.pickup();
}

function openGarage() {
  state.screen = 'garage';
  state.garageOpen = true;
  hud.showScreen('garage');
  audio.click();
}

function closeGarage() {
  state.screen = 'play';
  state.garageOpen = false;
  hud.showScreen('play');
}

function bust() {
  state.screen = 'busted';
  state.busted = true;
  state.bustedTimer = 0;
  const fine = Math.min(state.money, 500);
  state.money -= fine;
  state.wanted = 0;
  police.clear();
  audio.busted();
  audio.engineStart(false);
  audio.stopSiren();
  document.getElementById('busted-fine').textContent = `Fine paid: $${fine}. The VSPD towed your car and dropped you at the safehouse.`;
  hud.showScreen('busted');
}

function respawn() {
  state.player.x = WORLD.safehouse.x;
  state.player.z = WORLD.safehouse.z;
  state.player.heading = 0;
  state.player.onFoot = true;
  state.player.inCar = null;
  state.health = 100;
  state.armor = 60;
  playerMesh.visible = true;
  playerMesh.position.set(state.player.x, 0, state.player.z);
  playerCar.x = WORLD.safehouse.x + 4;
  playerCar.z = WORLD.safehouse.z + 4;
  playerCar.speed = 0;
  playerCar.condition = 97;
  playerCar.mesh.position.set(playerCar.x, 0, playerCar.z);
  state.busted = false;
  state.screen = 'play';
  hud.showScreen('play');
  say('Marla: Back on your feet, Rook. The city does not wait.', 4);
}

function saveGame(slot) {
  try {
    const data = {
      money: state.money,
      respect: state.respect,
      jobIndex: state.jobIndex,
      jobDone: state.jobDone,
      x: state.player.x,
      z: state.player.z,
      time: state.time,
    };
    window.localStorage.setItem(`${SAVE_KEY}.${slot}`, JSON.stringify(data));
    flash(`Saved to slot ${slot + 1}`);
  } catch { /* storage off */ }
}

function loadGame(slot) {
  try {
    const raw = window.localStorage.getItem(`${SAVE_KEY}.${slot}`);
    if (!raw) return false;
    const data = JSON.parse(raw);
    state.money = data.money;
    state.respect = data.respect;
    state.jobIndex = data.jobIndex;
    state.jobDone = data.jobDone;
    state.player.x = data.x;
    state.player.z = data.z;
    state.time = data.time;
    missions.start(state.jobIndex);
    return true;
  } catch {
    return false;
  }
}

function startPlay() {
  state.screen = 'play';
  hud.showScreen('play');
  audio.unlock();
  audio.missionStart();
  const job = JOBS[state.jobIndex];
  if (job) say(job.line, 5);
}

function stepGame(dt, t, input) {
  const actions = input.takeActions();
  const weaponKey = input.takeWeapon();
  if (weaponKey >= 1 && weaponKey <= 4) state.weaponSlot = weaponKey;
  if (actions & ACT_PAUSE) {
    if (state.screen === 'play') {
      state.screen = 'pause';
      hud.showScreen('pause');
    } else if (state.screen === 'pause') {
      state.screen = 'play';
      hud.showScreen('play');
    }
    return;
  }
  if (state.screen !== 'play') return;

  // Timers.
  crimeTimer += dt;
  if (crimeTimer > 20 && state.wanted > 0) {
    state.wanted -= 1;
    crimeTimer = 0;
  }
  for (const k of ['Q', 'C', 'V']) state.crewCooldown[k] = Math.max(0, (state.crewCooldown[k] || 0) - dt);
  state.eyesOutTimer = Math.max(0, state.eyesOutTimer - dt);
  state.dialogueTimer = Math.max(0, state.dialogueTimer - dt);
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  state.time += dt * 0.002;
  if (state.time >= 24) state.time -= 24;

  if (actions & ACT_CREW_Q) useCrew('Q');
  if (actions & ACT_CREW_C) useCrew('C');
  if (actions & ACT_CREW_V) useCrew('V');
  if (actions & ACT_RADIO) {
    state.radioIndex = (state.radioIndex + 1) % RADIO.length;
    flash(`Radio: ${RADIO[state.radioIndex].station}`);
  }
  if (actions & ACT_RELOAD && state.weaponSlot > 1) {
    state.ammo[state.weaponSlot] = [0, 36, 90, 12][state.weaponSlot];
    flash('Reloaded');
  }
  if (actions & ACT_SHOOT && state.player.onFoot) shoot();
  if (actions & ACT_CAMERA) {
    // Camera cycles are cosmetic: the renderer picks the best framing.
  }
  if (actions & ACT_GARAGE) {
    const d = Math.hypot(state.player.x - WORLD.garage.x, state.player.z - WORLD.garage.z);
    if (d < 16) openGarage();
    else flash('Get to Dockside Customs to use the garage');
  }
  if (actions & ACT_ENTER) {
    if (state.player.onFoot) {
      const car = nearestCar(state.player.x, state.player.z, 4);
      if (car) enterCar(car);
    } else {
      exitCar();
    }
  }

  const throttle = input.throttle();
  const steer = input.steer();
  const sprint = input.sprint();

  if (state.player.inCar) {
    const car = state.player.inCar;
    const forward = throttle;
    const targetAccel = forward > 0 ? CAR.accel : forward < 0 ? -CAR.reverseAccel : 0;
    car.speed += targetAccel * dt;
    if (forward === 0) car.speed *= Math.max(0, 1 - dt * 1.2);
    car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
    const steerAmount = steer * CAR.steer * dt * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 8 + 0.3);
    car.heading += steerAmount * (car.speed >= 0 ? 1 : -1);
    const nx = car.x + Math.cos(car.heading) * car.speed * dt;
    const nz = car.z - Math.sin(car.heading) * car.speed * dt;
    const hit = collideCircle(nx, nz, 1.6);
    if (hit.hit && Math.abs(car.speed) > 6) {
      car.condition = Math.max(0, car.condition - 4);
      audio.crash();
      addWanted(0);
    }
    const clamped = clampToWorld(hit.x, hit.z);
    car.x = clamped.x;
    car.z = clamped.z;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    for (const wheel of car.mesh.userData.wheels) wheel.rotation.y += (car.speed * dt) / 0.38;
    state.player.x = car.x;
    state.player.z = car.z;
    state.player.heading = car.heading;
    state.stats.distance += Math.abs(car.speed) * dt;
    audio.engineSet(Math.abs(car.speed) / CAR.maxSpeed);
    // Police rams damage the car.
    for (const u of police.units) {
      const d = Math.hypot(u.mesh.position.x - car.x, u.mesh.position.z - car.z);
      if (d < 3.2) {
        car.condition = Math.max(0, car.condition - 12 * dt);
        u.ramTimer = 0.5;
        if (Math.random() < dt * 2) audio.crash();
      }
    }
    if (car.condition <= 0) {
      car.condition = 0;
      flash('Your car is wrecked — get out and run');
      exitCar();
    }
  } else {
    // On foot.
    const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const move = throttle !== 0 ? 1 : 0;
    if (move) {
      state.player.heading += steer * 2.4 * dt;
      const nx = state.player.x + Math.cos(state.player.heading) * speed * dt * throttle;
      const nz = state.player.z - Math.sin(state.player.heading) * speed * dt * throttle;
      const hit = collideCircle(nx, nz, PLAYER.radius);
      const clamped = clampToWorld(hit.x, hit.z);
      state.player.x = clamped.x;
      state.player.z = clamped.z;
      walkPhase += dt * 9;
    }
    playerMesh.position.set(state.player.x, 0, state.player.z);
    playerMesh.rotation.y = state.player.heading;
    const limbs = playerMesh.userData.limbs;
    const swing = move ? Math.sin(walkPhase) * 0.5 : 0;
    limbs.legL.rotation.x = swing;
    limbs.legR.rotation.x = -swing;
    limbs.armL.rotation.x = -swing * 0.7;
    limbs.armR.rotation.x = swing * 0.7;
    // Busted: a police car touches Rook on foot at 3+ stars.
    if (state.wanted >= 3) {
      for (const u of police.units) {
        const d = Math.hypot(u.mesh.position.x - state.player.x, u.mesh.position.z - state.player.z);
        if (d < 2.2) {
          bust();
          return;
        }
      }
    }
  }

  // World life.
  traffic.update(dt);
  peds.update(dt, performance.now() / 1000);
  police.sync(state.player.x, state.player.z, state.eyesOutTimer > 0 ? 0 : state.wanted, dt, performance.now() / 1000);
  for (const w of game.wrecks) w.update(performance.now() / 1000);
  if (muzzleTimer > 0) {
    muzzleTimer -= dt;
    if (muzzle) muzzle.material.opacity = Math.max(0, muzzleTimer / 0.09) * 0.9;
  }

  // Missions.
  const result = missions.update(dt, performance.now() / 1000, state.player.x, state.player.z, state);
  if (result === 'done') {
    const payout = missions.complete(state);
    audio.missionDone();
    flash(`Job complete — $${payout} earned`);
    const job = JOBS[state.jobIndex];
    if (job && !missions.allDone(state)) say(job.line, 5);
    if (missions.allDone(state)) {
      say('Marla: That is all eight, Rook. The shore is yours now.', 6);
      flash('ALL JOBS DONE — free roam, King of the Shore');
    }
  }

  // Siren when wanted.
  if (state.wanted >= 2) audio.startSiren();
  else audio.stopSiren();
  if (state.health <= 0) bust();
}

function hudView() {
  const car = state.player.inCar;
  return {
    dispatch: police.dispatchRows(state.player.x, state.player.z),
    vehicleName: car ? car.name : null,
    condition: car ? car.condition : 0,
    speedKmh: car ? car.speed * 3.6 : 0,
    nitro: car ? car.nitro : false,
    beacon: { x: JOBS[state.jobIndex] ? JOBS[state.jobIndex].target.x : 0, z: JOBS[state.jobIndex] ? JOBS[state.jobIndex].target.z : 0 },
    police: police.units.map((u) => ({ x: u.mesh.position.x, z: u.mesh.position.z })),
  };
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer3d.resize(w, h);
}

window.addEventListener('resize', resize);
resize();

// Title screen buttons.
document.getElementById('btn-continue').addEventListener('click', () => { audio.unlock(); startPlay(); });
document.getElementById('btn-new').addEventListener('click', () => {
  audio.unlock();
  Object.assign(state, createState());
  state.player.x = WORLD.safehouse.x;
  state.player.z = WORLD.safehouse.z;
  missions.start(0);
  startPlay();
});
document.getElementById('btn-load').addEventListener('click', () => {
  audio.unlock();
  if (loadGame(0)) {
    startPlay();
    flash('Loaded save slot 1');
  } else {
    flash('No save in slot 1 yet');
  }
});
document.getElementById('btn-settings').addEventListener('click', () => {
  const muted = audio.toggleMute();
  flash(muted ? 'Sound off' : 'Sound on');
});
document.getElementById('btn-resume').addEventListener('click', () => {
  state.screen = 'play';
  hud.showScreen('play');
});
document.getElementById('btn-busted').addEventListener('click', () => respawn());
document.getElementById('btn-garage-close').addEventListener('click', () => closeGarage());
document.querySelectorAll('#screen-garage [data-buy]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const kind = btn.getAttribute('data-buy');
    const prices = { repair: 250, respray: 150, armour: 400, ammo: 180, nitro: 600 };
    const price = prices[kind] || 0;
    if (state.money < price) {
      flash('Not enough money');
      return;
    }
    state.money -= price;
    if (kind === 'repair' && state.player.inCar) state.player.inCar.condition = 100;
    if (kind === 'armour') state.armor = 100;
    if (kind === 'ammo') { state.ammo[2] = 36; state.ammo[3] = 90; state.ammo[4] = 12; }
    if (kind === 'nitro' && state.player.inCar) state.player.inCar.nitro = true;
    if (kind === 'respray') flash('Resprayed sunrise orange — fresh paint, new face');
    audio.pickup();
    flash(`${kind} bought — $${price}`);
  });
});
document.querySelectorAll('#screen-title [data-slot]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const slot = Number(btn.getAttribute('data-slot'));
    if (loadGame(slot)) {
      audio.unlock();
      startPlay();
      flash(`Loaded save slot ${slot + 1}`);
    }
  });
});

function runShot(name) {
  const staged = stageShot(name, game);
  hud.showScreen(staged.screen);
  hud.update(state, hudView());
  let painted = 0;
  function paint() {
    // Let the fire flicker and the helicopter settle before the capture.
    const t = 1.2 + painted * 0.12;
    for (const w of game.wrecks) w.update(t);
    renderer3d.frameCamera(staged.screen === 'title' ? 'title' : staged.screen === 'garage' ? 'garage' : 'play', state.player, state.player.inCar, 0.016, t);
    renderer3d.render();
    painted += 1;
    if (painted < 4) requestAnimationFrame(paint);
    else window.__VS_READY__ = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  hud.showScreen('title');
  let accumulator = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (accumulator >= STEP) {
      stepGame(STEP, now / 1000, input);
      accumulator -= STEP;
    }
    const mode = state.screen === 'title' ? 'title' : state.screen === 'garage' ? 'garage' : 'play';
    renderer3d.frameCamera(mode, state.player, state.player.inCar, STEP, now / 1000);
    hud.update(state, hudView());
    renderer3d.render();
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
