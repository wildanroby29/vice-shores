// Vice Shores — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there. The
// game moves between title, play, paused, garage and busted screens.
//
// ?seed=N fixes the world. ?shot=chase|onfoot|title|garage (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { Renderer } from './render3d.js';
import { HUD } from './hud.js';
import {
  createInput,
  ACTION_CONFIRM,
  ACTION_PAUSE,
  ACTION_GARAGE,
  ACTION_MUTE,
  ACTION_RELOAD,
  ACTION_CREW_Q,
  ACTION_CREW_C,
  ACTION_CREW_V,
} from './input.js';
import { createAudio } from './audio.js';
import { createCity } from './city.js';
import { STEP, RADIO, WEAPONS, SAVE_KEY } from './config.js';
import { createRandom } from './random.js';
import {
  createTraffic,
  createParkedCars,
  createPlayerCar,
  driveCar,
  updateTraffic,
  nearestCar,
  damageCar,
} from './vehicles.js';
import {
  createCrowd,
  createPedestrian,
  makePlayerBody,
  updatePedestrian,
  knockDown,
} from './people.js';
import {
  createHelicopter,
  spawnPoliceUnit,
  createRoadblock,
  updatePoliceUnit,
  updateHelicopter,
  addWanted,
  coolWanted,
  bustPlayer,
} from './police.js';
import {
  createMissionState,
  currentJob,
  currentStage,
  advanceStage,
} from './missions.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

/** The save slots the title screen shows when the browser has no saves yet. */
const DEMO_SLOTS = [
  { empty: false, act: 'ACT II', jobName: 'MARKET SQUEEZE', percent: 32.8, missions: '3/6', location: 'Kumala Strand', money: '$12,650', time: '18:23', rank: 'WHEELMAN' },
  { empty: false, act: 'ACT I', jobName: 'NEON RUN', percent: 18.5, missions: '2/6', location: 'Neon Row', money: '$4,380', time: '09:41', rank: 'HUSTLER' },
  { empty: true },
];

/** Mission marker labels from missions.js, mapped to city points. */
function markerPoints(city) {
  const L = city.landmarks;
  return {
    PIER: L.pier,
    GARAGE: L.garage,
    TAXI: { x: 240, z: 60 },
    'NEON 1': { x: -20, z: 140 },
    'NEON 2': { x: 0, z: 160 },
    'NEON 3': { x: 20, z: 180 },
    MARKET: { x: -40, z: 82 },
    SAFEHOUSE: L.safehouse,
    BRIDGE: { x: 0, z: 0 },
    CELL: { x: -120, z: 80 },
    MARINA: { x: 290, z: 130 },
    BOULEVARD: { x: 240, z: -60 },
  };
}

function fmtClock(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export class Game {
  constructor(canvas, root, seed) {
    this.canvas = canvas;
    this.root = root;
    this.seed = seed || 1;
    this.hud = new HUD(root, {
      onMenu: (act) => this.onMenu(act),
      onSlot: (i) => {
        this.selectedSlot = i;
      },
      onOverlay: (act) => this.onOverlay(act),
    });
    this.input = createInput(canvas);
    this.audio = createAudio();
    this.audioOn = false;
    this.mode = 'title';
    this.selectedSlot = 0;
    this.saveSlots = this.loadSlots();
    this.ePrev = false;
    this.ePressed = false;
    window.addEventListener('keydown', () => {
      this.audioOn = true;
      this.audio.resume();
    });
    window.addEventListener('pointerdown', () => {
      this.audioOn = true;
      this.audio.resume();
    });
    this.reset(this.seed);
    this.mode = 'title';
    this.hud.setSaveSlots(this.saveSlots);
    this.hud.showTitle();
    this.renderer.setCameraMode('title');
  }

  loadSlots() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 3) return parsed;
      }
    } catch {
      // Storage off: the demo slots stand in.
    }
    return JSON.parse(JSON.stringify(DEMO_SLOTS));
  }

  storeSlots() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.saveSlots));
    } catch {
      // Storage off: saves last this visit only.
    }
  }

  /** A fresh world: same city every time (the city is seeded), new traffic, crowd and player. */
  reset(seed) {
    const rng = createRandom(seed);
    const city = createCity();
    if (this.renderer) {
      // Clear the dynamic meshes so the new world starts clean.
      for (const mesh of this.renderer.carMeshes.values()) this.renderer.scene.remove(mesh);
      for (const mesh of this.renderer.pedMeshes.values()) this.renderer.scene.remove(mesh);
      for (const fx of this.renderer.particles) this.renderer.scene.remove(fx.group);
      this.renderer.carMeshes.clear();
      this.renderer.pedMeshes.clear();
      this.renderer.particles = [];
    }
    const traffic = createTraffic(city, rng, 14);
    const parked = createParkedCars(city, rng, 10);
    const peds = createCrowd(city, rng, 24);
    this.state = {
      city,
      time: 0,
      money: 500,
      health: 100,
      armor: 50,
      wanted: 0,
      wantedTimer: 0,
      clockMin: 18 * 60 + 23,
      day: 'SUNDAY',
      radio: RADIO[0],
      radioTimer: 0,
      weapon: 1,
      ammo: { pistol: 36, smg: 90 },
      missions: createMissionState(),
      police: [],
      policeTimer: 0,
      roadblocks: [],
      roadblockTimer: 8,
      helo: createHelicopter(),
      peds,
      traffic,
      parked,
      allCars: [...traffic, ...parked],
      player: {
        x: city.landmarks.safehouse.x,
        z: city.landmarks.safehouse.z,
        heading: Math.PI / 2,
        speed: 0,
        onFoot: true,
        car: null,
        body: makePlayerBody(rng),
      },
      marker: null,
      garageCar: null,
      bustedCount: 0,
      bustedTimer: 0,
      hiddenTimer: 0,
      shotCooldown: 0,
      driveTimer: 0,
      nitroTuned: false,
      gripTires: false,
      engineTuned: false,
      crewCd: { Q: 0, C: 0, V: 0 },
      input: { moveMag: 0 },
      clock: '18:23',
    };
    if (!this.renderer) {
      this.renderer = new Renderer(this.canvas, city);
      this.renderer.resize(window.innerWidth, window.innerHeight);
    }
    this.updateMarker();
  }

  markerPoint(label) {
    if (!label) return null;
    return markerPoints(this.state.city)[label] || null;
  }

  updateMarker() {
    const stage = currentStage(this.state.missions);
    if (!stage) {
      this.state.marker = null;
      return;
    }
    const point = this.markerPoint(stage.marker);
    this.state.marker = point ? { x: point.x, z: point.z, label: stage.marker } : null;
  }

  /** The fixed-step simulation. `input` is {up, down, left, right, shoot, sneak, action}. */
  step(dt, input) {
    const s = this.state;
    s.time += dt;
    s.clockMin += dt * 0.5;
    s.clock = fmtClock(s.clockMin);
    for (const key of Object.keys(s.crewCd)) s.crewCd[key] = Math.max(0, s.crewCd[key] - dt);
    s.hiddenTimer = Math.max(0, s.hiddenTimer - dt);
    s.shotCooldown = Math.max(0, s.shotCooldown - dt);
    // The world stays alive behind the title, garage and pause screens.
    const playing = this.mode === 'play';
    updateTraffic(s.traffic, dt, s.city, s.player.car);
    for (const ped of s.peds) {
      const danger = s.player.car && Math.abs(s.player.car.speed) > 10 ? s.player.car : null;
      updatePedestrian(ped, dt, s.city, danger);
    }
    if (s.helo.active || s.wanted >= 4) updateHelicopter(s.helo, dt, s.player, s.wanted);
    if (!playing) return;
    this.stepPlayer(dt, input);
    this.stepPolice(dt);
    this.stepMissions(dt);
    // Wanted cools off when no unit can see the player.
    const inSight = s.police.some((u) => (u.dist || 999) < 60);
    if (s.hiddenTimer <= 0) coolWanted(s, dt, inSight);
    // Radio: a new song every 25 seconds.
    s.radioTimer += dt;
    if (s.radioTimer > 25) {
      s.radioTimer = 0;
      const idx = RADIO.indexOf(s.radio);
      s.radio = RADIO[(idx + 1) % RADIO.length];
    }
  }

  stepPlayer(dt, input) {
    const s = this.state;
    const p = s.player;
    const turn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const forward = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    if (p.car) {
      const car = p.car;
      const nitro = input.sneak && s.nitroTuned;
      const crashed = driveCar(car, dt, turn, input.up ? 1 : 0, input.down ? 1 : 0, nitro, s.city, s.allCars);
      if (crashed && this.audioOn) this.audio.crash();
      p.x = car.x;
      p.z = car.z;
      p.heading = car.heading;
      p.speed = car.speed;
      // Running over a pedestrian is a crime.
      for (const ped of s.peds) {
        if (ped.state === 'down') continue;
        if (Math.hypot(ped.x - car.x, ped.z - car.z) < 2.4 && Math.abs(car.speed) > 5) {
          knockDown(ped);
          addWanted(s, 1);
          if (this.audioOn) this.audio.punch();
        }
      }
      if (car.wrecked) {
        // The car died under Rook: he climbs out on foot.
        p.car = null;
        p.onFoot = true;
        p.x = car.x + 3;
        p.z = car.z + 3;
      }
    } else {
      p.heading += turn * 2.6 * dt;
      const speed = input.sneak ? 2.2 : 7;
      const move = forward * speed;
      p.speed = move;
      if (move !== 0) {
        const nx = p.x + Math.cos(p.heading) * move * dt;
        const nz = p.z + Math.sin(p.heading) * move * dt;
        const fixed = s.city.collide(nx, nz, 0.6);
        p.x = fixed.x;
        p.z = fixed.z;
        p.body.walkPhase += dt * Math.abs(move) * 3.2;
      }
      // Bumping into a pedestrian at a run knocks them down.
      for (const ped of s.peds) {
        if (ped.state === 'down') continue;
        if (Math.hypot(ped.x - p.x, ped.z - p.z) < 1.1 && Math.abs(move) > 5) {
          knockDown(ped);
          addWanted(s, 1);
        }
      }
    }
    // E: enter or exit a car.
    if (input.action) {
      if (p.car) {
        const car = p.car;
        p.car = null;
        p.onFoot = true;
        p.x = car.x - Math.sin(car.heading) * 3;
        p.z = car.z + Math.cos(car.heading) * 3;
        p.speed = 0;
      } else {
        const car = nearestCar(s.allCars, p.x, p.z, 4.5);
        if (car) {
          if (car.driver) {
            // Carjacking: the driver runs, the heat rises.
            const driver = createPedestrian(s.city, Math.random, car.x + 2, car.z + 2);
            driver.state = 'flee';
            driver.fleeTimer = 4;
            s.peds.push(driver);
            car.driver = false;
            addWanted(s, 1);
            this.hud.showDialogue('ROOK', 'Out. This one is mine now.', 3);
          }
          if (car.isPolice) addWanted(s, 2);
          s.traffic = s.traffic.filter((c) => c !== car);
          s.parked = s.parked.filter((c) => c !== car);
          p.car = car;
          p.onFoot = false;
          p.x = car.x;
          p.z = car.z;
          p.heading = car.heading;
          if (this.audioOn) this.audio.pickup();
          this.checkMission();
        }
      }
    }
    // Shooting: hitscan in front of the player.
    if (input.shoot && s.shotCooldown <= 0) this.shoot();
  }

  shoot() {
    const s = this.state;
    const p = s.player;
    const weapon = WEAPONS[s.weapon];
    if (!weapon) return;
    if (s.weapon === 1 && s.ammo.pistol <= 0) return;
    if (s.weapon === 2 && s.ammo.smg <= 0) return;
    s.shotCooldown = weapon.rate;
    if (s.weapon === 1) s.ammo.pistol -= 1;
    if (s.weapon === 2) s.ammo.smg -= 1;
    if (this.audioOn) this.audio.shot();
    const fx = Math.cos(p.heading);
    const fz = Math.sin(p.heading);
    let best = null;
    let bestD = weapon.range;
    for (const ped of s.peds) {
      if (ped.state === 'down') continue;
      const dx = ped.x - p.x;
      const dz = ped.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < bestD && Math.abs(Math.atan2(dz, dx) - p.heading) < 0.35) {
        bestD = d;
        best = { kind: 'ped', target: ped };
      }
    }
    for (const car of s.allCars) {
      if (car === p.car || car.wrecked) continue;
      const dx = car.x - p.x;
      const dz = car.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < bestD && Math.abs(Math.atan2(dz, dx) - p.heading) < 0.35) {
        bestD = d;
        best = { kind: 'car', target: car };
      }
    }
    if (!best) return;
    if (best.kind === 'ped') {
      knockDown(best.target);
      addWanted(s, 1);
    } else {
      const wasPolice = best.target.isPolice;
      damageCar(best.target, weapon.damage);
      if (wasPolice) addWanted(s, 1);
    }
  }

  stepPolice(dt) {
    const s = this.state;
    const p = s.player;
    const target = s.wanted >= 1 ? Math.min(4, 1 + Math.floor(s.wanted / 2)) : 0;
    s.policeTimer -= dt;
    if (s.police.length < target && s.policeTimer <= 0) {
      s.policeTimer = 3;
      const unit = spawnPoliceUnit(s.city, Math.random, p, s.police.length, s.wanted);
      s.police.push(unit);
      s.allCars.push(unit.car);
    }
    // Roadblocks at 3+ stars: two police cars across the road ahead.
    s.roadblockTimer -= dt;
    if (s.wanted >= 3 && s.roadblockTimer <= 0 && s.roadblocks.length === 0) {
      s.roadblockTimer = 20;
      const block = createRoadblock(s.city, Math.random, p);
      s.roadblocks.push(block);
      for (const car of block.cars) s.allCars.push(car);
    }
    for (const block of s.roadblocks) block.timer -= dt;
    s.roadblocks = s.roadblocks.filter((block) => {
      if (block.timer > 0) return true;
      s.allCars = s.allCars.filter((c) => !block.cars.includes(c));
      return false;
    });
    // Chase, ram, and the busted check.
    let nearest = 999;
    for (const unit of s.police) {
      updatePoliceUnit(unit, dt, p, s.city, s.allCars, s.wanted);
      nearest = Math.min(nearest, unit.dist || 999);
      // Ramming contact with the player's car damages it.
      if (p.car && unit.dist < 4.6) {
        damageCar(p.car, 2 * dt * 10);
      }
    }
    s.police = s.police.filter((unit) => {
      if (!unit.car.wrecked) return true;
      s.allCars = s.allCars.filter((c) => c !== unit.car);
      return false;
    });
    if (s.wanted > 0 && nearest < 3.5) {
      s.bustedTimer += dt;
      if (s.bustedTimer > 2) this.doBust();
    } else {
      s.bustedTimer = 0;
    }
  }

  stepMissions(dt) {
    this.checkMission(dt);
  }

  checkMission(dt) {
    const s = this.state;
    const job = currentJob(s.missions);
    if (!job) return;
    const stage = currentStage(s.missions);
    if (!stage) return;
    const p = s.player;
    const m = this.markerPoint(stage.marker);
    let done = false;
    if (stage.kind === 'go' && m) {
      done = Math.hypot(p.x - m.x, p.z - m.z) < 14;
    } else if (stage.kind === 'steal') {
      done = !!p.car;
    } else if (stage.kind === 'escape' && m) {
      done = s.wanted === 0 && Math.hypot(p.x - m.x, p.z - m.z) < 14;
    } else if (stage.kind === 'race' && m) {
      const speed = Math.abs(p.car ? p.car.speed : p.speed);
      done = Math.hypot(p.x - m.x, p.z - m.z) < 12 && speed > 20;
    } else if (stage.kind === 'drive') {
      if (p.car && Math.abs(p.car.speed) > 33 && Math.abs(p.x - 240) < 14) {
        s.driveTimer += dt || 0;
      } else {
        s.driveTimer = 0;
      }
      done = s.driveTimer > 2;
    }
    if (done) this.completeStage();
  }

  completeStage() {
    const s = this.state;
    const job = currentJob(s.missions);
    const payout = advanceStage(s.missions);
    if (payout > 0) {
      s.money += payout;
      if (this.audioOn) this.audio.jingle();
      this.hud.showBanner('JOB COMPLETE', `${job.name} — $${payout}`, 3.5);
      const next = currentJob(s.missions);
      if (next) {
        this.hud.showDialogue('MARLA', next.marla, 7);
      } else {
        this.hud.showBanner('KING OF VICE SHORES', 'All 8 jobs done — the city is yours', 5);
        this.hud.showDialogue('MARLA', 'You did it, Rook. Vice Shores is yours now.', 7);
      }
    } else if (this.audioOn) {
      this.audio.pickup();
    }
    // The next stage of an escape heats up: the job's mark calls the cops.
    const nextStage = currentStage(s.missions);
    if (nextStage && nextStage.kind === 'escape') {
      addWanted(s, 2);
      this.hud.showDialogue('MARLA', 'The cops are coming — lose them and get to the safehouse.', 6);
    }
    this.updateMarker();
  }

  doBust() {
    const s = this.state;
    const lost = bustPlayer(s);
    if (s.player.car) {
      s.allCars = s.allCars.filter((c) => c !== s.player.car);
      s.player.car = null;
    }
    s.player.onFoot = true;
    s.police = [];
    s.roadblocks = [];
    s.helo.active = false;
    this.mode = 'busted';
    if (this.audioOn) this.audio.busted();
    this.hud.showOverlay(this.hud.bustedHTML(lost));
  }

  respawn() {
    const s = this.state;
    const home = s.city.landmarks.safehouse;
    s.player.x = home.x;
    s.player.z = home.z;
    s.player.heading = Math.PI / 2;
    s.player.speed = 0;
    s.player.onFoot = true;
    s.player.car = null;
    s.health = 100;
    s.armor = 50;
    s.bustedTimer = 0;
    this.mode = 'play';
    this.hud.hideOverlay();
    this.hud.showGame();
    this.renderer.setCameraMode('onfoot');
    this.hud.showDialogue('MARLA', 'Back on your feet, Rook. The city does not wait.', 5);
  }

  startGame(slotIndex, cont) {
    this.selectedSlot = slotIndex;
    this.reset(this.seed);
    const slot = this.saveSlots[slotIndex];
    if (cont && slot && !slot.empty) {
      if (slot.save) {
        const snap = slot.save;
        this.state.money = snap.money;
        this.state.missions.jobIndex = snap.jobIndex;
        this.state.missions.stageIndex = snap.stageIndex;
        this.state.missions.completedJobs = snap.completedJobs.slice();
        this.state.player.x = snap.playerX;
        this.state.player.z = snap.playerZ;
        this.state.clockMin = snap.clockMin;
        this.updateMarker();
      } else {
        // A demo slot: start with its money and its completed jobs.
        const done = Number.parseInt(String(slot.missions).split('/')[0], 10) || 0;
        this.state.money = Number.parseInt(String(slot.money).replace(/[^0-9]/g, ''), 10) || 500;
        this.state.missions.completedJobs = [1, 2, 3, 4, 5, 6, 7, 8].slice(0, done);
        this.state.missions.jobIndex = done;
        this.updateMarker();
      }
    }
    this.mode = 'play';
    this.hud.hideOverlay();
    this.hud.showGame();
    this.renderer.setCameraMode('onfoot');
    const job = currentJob(this.state.missions);
    if (job) this.hud.showDialogue('MARLA', job.marla, 7);
    if (this.audioOn) this.audio.resume();
  }

  saveGame() {
    const s = this.state;
    const slot = this.saveSlots[this.selectedSlot];
    const snap = {
      money: Math.round(s.money),
      jobIndex: s.missions.jobIndex,
      stageIndex: s.missions.stageIndex,
      completedJobs: s.missions.completedJobs.slice(),
      playerX: s.player.x,
      playerZ: s.player.z,
      clockMin: s.clockMin,
    };
    const job = currentJob(s.missions);
    this.saveSlots[this.selectedSlot] = {
      empty: false,
      act: job ? job.act : 'ACT III',
      jobName: job ? job.name : 'FREE ROAM',
      percent: Math.round((s.missions.completedJobs.length / 8) * 1000) / 10,
      missions: `${s.missions.completedJobs.length}/8`,
      location: job ? job.location : 'Kumala Strand',
      money: `$${Math.round(s.money).toLocaleString()}`,
      time: s.clock,
      rank: 'WHEELMAN',
      save: snap,
    };
    this.storeSlots();
  }

  onMenu(act) {
    if (act === 'continue') this.startGame(this.selectedSlot, true);
    else if (act === 'new') this.startGame(this.selectedSlot, false);
    else if (act === 'load') this.startGame(this.selectedSlot, true);
    else if (act === 'settings') {
      this.hud.showOverlay(`
        <h2>SETTINGS</h2>
        <div class="row"><span>Sound</span><b>${this.audio.isMuted() ? 'OFF' : 'ON'}</b></div>
        <div class="row"><span>Controls</span><b>WASD drive · E enter · SPACE shoot · SHIFT sneak/nitro · C camera · M radio · P pause · G garage</b></div>
        <button class="btn" data-act="mute">${this.audio.isMuted() ? 'UNMUTE' : 'MUTE'}</button>
        <button class="btn ghost" data-act="close">BACK</button>
      `);
    }
  }

  onOverlay(act, el) {
    const s = this.state;
    if (act === 'close' || act === 'resume') {
      this.hud.hideOverlay();
      if (this.mode === 'paused' || this.mode === 'garage') this.mode = 'play';
      return;
    }
    if (act === 'mute') {
      this.audio.setMuted(!this.audio.isMuted());
      this.onMenu('settings');
      return;
    }
    if (act === 'quit') {
      this.mode = 'title';
      this.hud.hideOverlay();
      this.hud.setSaveSlots(this.saveSlots);
      this.hud.showTitle();
      this.renderer.setCameraMode('title');
      return;
    }
    if (act === 'save') {
      this.saveGame();
      this.hud.showBanner('SAVED', `Slot ${this.selectedSlot + 1} — progress kept`, 2.5);
      return;
    }
    if (act === 'respawn') {
      this.respawn();
      return;
    }
    // Garage purchases.
    const car = s.player.car || s.garageCar;
    const price = { repair: 150, respray: 200, armor: 300, ammo: 50, nitro: 400 }[act];
    if (price === undefined) return;
    if (s.money < price) {
      this.hud.showBanner('NOT ENOUGH CASH', `Need $${price}`, 2);
      return;
    }
    s.money -= price;
    if (act === 'repair' && car) car.condition = 100;
    if (act === 'respray' && car) {
      const paints = ['#ff5a1e', '#ffd21f', '#2ec4ff', '#ff8fd1', '#7be07b'];
      car.color = paints[Math.floor(Math.random() * paints.length)];
    }
    if (act === 'armor') s.armor = Math.min(100, s.armor + 40);
    if (act === 'ammo') {
      s.ammo.pistol = 36;
      s.ammo.smg = 90;
    }
    if (act === 'nitro') s.nitroTuned = true;
    if (this.audioOn) this.audio.pickup();
    this.hud.showOverlay(this.hud.garageHTML(s));
    if (el) el.textContent = 'DONE';
  }

  readInput() {
    const move = this.input.move();
    const weapon = this.input.weaponKey();
    if (weapon >= 0 && weapon <= 2) this.state.weapon = weapon;
    this.state.input.moveMag = Math.hypot(move.x, move.y);
    return {
      up: move.y < -0.3,
      down: move.y > 0.3,
      left: move.x < -0.3,
      right: move.x > 0.3,
      shoot: this.input.shootHeld(),
      sneak: this.input.sprint(),
      action: this.ePressed,
    };
  }

  handleActions() {
    const a = this.input.takeActions();
    if (a & ACTION_PAUSE) {
      if (this.mode === 'play') {
        this.mode = 'paused';
        this.hud.showOverlay(this.hud.pauseHTML(this.state));
      } else if (this.mode === 'paused') {
        this.mode = 'play';
        this.hud.hideOverlay();
      }
    }
    if (a & ACTION_GARAGE) {
      if (this.mode === 'play') {
        this.mode = 'garage';
        this.hud.showOverlay(this.hud.garageHTML(this.state));
      } else if (this.mode === 'garage') {
        this.mode = 'play';
        this.hud.hideOverlay();
      }
    }
    if (a & ACTION_MUTE) {
      const idx = RADIO.indexOf(this.state.radio);
      this.state.radio = RADIO[(idx + 1) % RADIO.length];
      this.state.radioTimer = 0;
    }
    if (a & ACTION_RELOAD) {
      if (this.state.money >= 50) {
        this.state.money -= 50;
        this.state.ammo.pistol = 36;
        this.state.ammo.smg = 90;
        if (this.audioOn) this.audio.click();
      }
    }
    if (a & ACTION_CREW_Q && this.state.crewCd.Q <= 0 && this.state.wanted > 0) {
      this.state.crewCd.Q = 45;
      this.state.wanted = Math.max(0, this.state.wanted - 1);
      this.hud.showDialogue('MIRA', 'Plates swapped. One star off your back.', 4);
    }
    if (a & ACTION_CREW_C && this.state.crewCd.C <= 0 && this.state.player.car) {
      this.state.crewCd.C = 30;
      this.state.player.car.condition = Math.min(100, this.state.player.car.condition + 35);
      this.hud.showDialogue('JAI', 'Quick fix — she is holding together again.', 4);
    }
    if (a & ACTION_CREW_V && this.state.crewCd.V <= 0) {
      this.state.crewCd.V = 60;
      this.state.hiddenTimer = 20;
      this.hud.showDialogue('KIRI', 'Eyes out — they have lost you for now.', 4);
    }
    if (a & ACTION_CONFIRM) {
      if (this.mode === 'title') this.startGame(this.selectedSlot, true);
      else if (this.mode === 'busted') this.respawn();
    }
    const eDown = this.input.isDown('KeyE');
    this.ePressed = eDown && !this.ePrev;
    this.ePrev = eDown;
  }

  render(dt) {
    const s = this.state;
    this.renderer.setCameraMode(
      this.mode === 'title' ? 'title' : this.mode === 'garage' ? 'garage' : s.player.car ? 'chase' : 'onfoot',
    );
    this.renderer.update(s, dt);
    this.hud.update(s, dt);
    if (this.audioOn) {
      const driving = !!s.player.car;
      const speedNorm = driving ? Math.min(1, Math.abs(s.player.car.speed) / 46) : 0;
      this.audio.engine(speedNorm, driving && this.mode === 'play');
      this.audio.siren(s.wanted > 0 && this.mode === 'play');
    }
  }

  run() {
    let last = performance.now();
    let acc = 0;
    const frame = (now) => {
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, MAX_FRAME);
      last = now;
      this.handleActions();
      acc += dt;
      let first = true;
      while (acc >= STEP) {
        const input = this.readInput();
        if (!first) input.action = false;
        this.step(STEP, input);
        acc -= STEP;
        first = false;
      }
      this.ePressed = false;
      this.render(dt);
    };
    window.addEventListener('resize', () => {
      this.renderer.resize(window.innerWidth, window.innerHeight);
    });
    requestAnimationFrame(frame);
  }
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const game = new Game(canvas, document.body, seed);
window.__game = game;

if (shot) {
  stageShot(shot, game, seed);
  let painted = 0;
  const paint = () => {
    game.render(1 / 60);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  game.run();
}
