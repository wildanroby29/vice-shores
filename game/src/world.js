// Vice Shores (3D) — the whole game state and its rules, in world units on the XZ plane
// (x east, z south, ground y = 0). Plain data + a fixed-step update: no three.js here, so
// the rules are testable without a renderer. The renderer reads this state and draws it.

import {
  STEP, PLAYER, CAR, TRAFFIC, POLICE, HELI, PEDS, WANTED, MISSIONS, RANKS, CREW,
  RADIO, GARAGE, SAVE_KEY, SLOT_KEY, rankFor,
} from './config.js';
import { createRandom, pick, range, clamp, angleDiff, dist } from './random.js';
import {
  buildCity, ROADS_V, ROADS_H, ROAD_W, SPOTS, hitsSolid, moveCircle, onRoad,
  randomRoadPoint, nearestRoadPoint, nearestRoadLine,
} from './city.js';

const TRAFFIC_COLORS = [0xd8d3c8, 0xc23b3b, 0x3b7ac2, 0xd8a83b, 0x4a9a5c, 0x8a5fc2, 0xd86a3b];
const TRAFFIC_NAMES = ['Sedan', 'Taxi', 'Hatch', 'Coupe', 'Van', 'Pickup'];
const PED_COLORS = [0xe8e8e8, 0xffd76a, 0xff7a9a, 0x7ad8ff, 0x9aff8a, 0xff9a3d, 0xc29aff];

let carIdSeq = 1;

function makeCar(kind, x, z, angle, color, name, opts) {
  const c = {
    id: carIdSeq++,
    kind,
    x, z, angle,
    speed: 0,
    color,
    name: name || 'Sedan',
    health: CAR.health,
    wrecked: false,
    driver: kind === 'traffic',
    mission: (opts && opts.mission) || '',
    sport: !!(opts && opts.sport),
    road: null,
    dir: 1,
    brakeLight: false,
  };
  return c;
}

export function createWorld(input, audio) {
  const random = createRandom(7);
  const city = buildCity(7);

  const state = {
    screen: 'title',
    time: 0,
    clockMin: 18 * 60 + 30,
    money: 0,
    missionIndex: 0,
    missionStage: 0,
    missionTimer: 0,
    vaultProgress: 0,
    surviveTimer: 0,
    policeWrecked: 0,
    player: {
      x: SPOTS.safehouse.x, z: SPOTS.safehouse.z, angle: -Math.PI / 2,
      health: PLAYER.health, armor: 0, speed: 0,
      inCar: null, weapon: 1, ammo: { pistol: 24, smg: 0 },
      shootCd: 0, invuln: 0, walkPhase: 0, moving: false,
      shooting: false, punching: false,
    },
    cars: [],
    peds: [],
    bullets: [],
    fires: [],
    wanted: 0,
    unseenTimer: 0,
    lastCrimeAt: -99,
    heli: null,
    roadblock: null,
    policeRespawnAt: 0,
    events: [],
    dialogue: null,
    banner: null,
    radioIdx: 0,
    radioTimer: 0,
    saveSlot: 1,
    carColorIdx: 0,
    aim: { x: SPOTS.safehouse.x, z: SPOTS.safehouse.z - 100 },
    titleSlots: [null, null, null],
    garageSel: 0,
    muted: false,
    stats: { carsStolen: 0, pedsHit: 0, shotsFired: 0 },
  };

  // ---- spawning ------------------------------------------------------------
  function spawnParkedCars() {
    const spots = [
      { x: 1020, z: 1260, name: 'Sedan', color: 0xd8d3c8 },
      { x: 1100, z: 1260, name: 'Taxi', color: 0xd8a83b },
      { x: 1180, z: 1260, name: 'Hatch', color: 0x4a9a5c },
      { x: 1420, z: 1260, name: 'Coupe', color: 0x8a5fc2 },
      { x: 1500, z: 1380, name: 'Van', color: 0xd8d3c8 },
      { x: 1580, z: 1260, name: 'Pickup', color: 0xc23b3b },
      { x: 900, z: 420, name: 'Sedan', color: 0x3b7ac2 },
      { x: 1900, z: 1400, name: 'Taxi', color: 0xd8a83b },
    ];
    for (const s of spots) {
      state.cars.push(makeCar('parked', s.x, s.z, pick(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]), s.color, s.name));
    }
    // The blue coupe (mission 1) and the red sports car (mission 5).
    state.cars.push(makeCar('parked', SPOTS.coupe.x, SPOTS.coupe.z, Math.PI / 2, 0x2f7bff, 'Blue Coupe', { mission: 'coupe' }));
    state.cars.push(makeCar('parked', SPOTS.sportCar.x, SPOTS.sportCar.z, 0, 0xc22e2e, 'Sports Car', { mission: 'sport', sport: true }));
  }

  function spawnTraffic() {
    for (let i = 0; i < TRAFFIC.count; i++) {
      const p = randomRoadPoint(random);
      const line = nearestRoadLine(p.x, p.z);
      const angle = line.axis === 'v' ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI);
      const car = makeCar('traffic', p.x, p.z, angle, pick(random, TRAFFIC_COLORS), pick(random, TRAFFIC_NAMES));
      car.road = line;
      car.dir = 1;
      car.speed = range(random, 140, TRAFFIC.maxSpeed);
      state.cars.push(car);
    }
  }

  function spawnPeds() {
    for (let i = 0; i < PEDS.count; i++) {
      const p = randomRoadPoint(random);
      const line = nearestRoadLine(p.x, p.z);
      // Pedestrians walk on the sidewalk next to the road.
      const off = pick(random, [-62, 62]);
      const x = line.axis === 'v' ? p.x + off : p.x;
      const z = line.axis === 'h' ? p.z + off : p.z;
      state.peds.push({
        x: clamp(x, 60, 2380), z: clamp(z, 60, 1690),
        angle: range(random, 0, Math.PI * 2),
        speed: PEDS.walk,
        state: 'walk', color: pick(random, PED_COLORS),
        walkPhase: range(random, 0, 6), target: null, down: 0,
      });
    }
  }

  spawnParkedCars();
  spawnTraffic();
  spawnPeds();

  // ---- helpers -------------------------------------------------------------
  function addEvent(text, kind) {
    state.events.push({ text, kind: kind || 'info', t: state.time });
    if (state.events.length > 6) state.events.shift();
  }

  function say(text, secs) {
    state.dialogue = { text, until: state.time + (secs || 5) };
  }

  function showBanner(text, sub, secs) {
    state.banner = { text, sub: sub || '', until: state.time + (secs || 3) };
  }

  function crewUnlocked(name) {
    const c = CREW.find((k) => k.name === name);
    return c && state.missionIndex >= c.unlock;
  }

  function maxSpeedFor(car) {
    let m = car.sport ? CAR.sportMaxSpeed : CAR.maxSpeed;
    if (crewUnlocked('Dex')) m *= 1.15;
    return m;
  }

  function policeMaxSpeed() {
    return POLICE.maxSpeed;
  }

  function crimeSeen(maxDist) {
    for (const c of state.cars) {
      if (c.kind === 'police' && !c.wrecked && dist(c.x, c.z, state.player.x, state.player.z) < (maxDist || 300)) return true;
    }
    return false;
  }

  function addWanted(n) {
    const now = state.time;
    if (now - state.lastCrimeAt < 1.5) return;
    state.lastCrimeAt = now;
    state.wanted = clamp(state.wanted + n, 0, WANTED.maxStars);
    state.unseenTimer = 0;
  }

  function activePolice() {
    return state.cars.filter((c) => c.kind === 'police' && !c.wrecked);
  }

  function spawnPoliceCar(near) {
    const p = near || randomRoadPoint(random);
    const car = makeCar('police', p.x, p.z, 0, 0xe8ecf4, 'Interceptor');
    car.speed = 0;
    state.cars.push(car);
    return car;
  }

  function spawnHeli() {
    if (state.heli) return;
    state.heli = { x: state.player.x - 200, z: state.player.z - 200, angle: 0, rotor: 0 };
    addEvent('AIR-1 helicopter on station', 'police');
  }

  function removeHeli() {
    state.heli = null;
  }

  function spawnRoadblock() {
    if (state.roadblock) return;
    // Two police cars parked across the road ahead of the player.
    const p = state.player;
    const aheadX = p.x + Math.cos(p.angle) * 420;
    const aheadZ = p.z + Math.sin(p.angle) * 420;
    const line = nearestRoadLine(aheadX, aheadZ);
    let x1, z1, x2, z2, ang;
    if (line.axis === 'v') {
      x1 = line.line; z1 = clamp(aheadZ, 120, 1640); x2 = line.line; z2 = z1 + 70; ang = Math.PI / 2;
    } else {
      x1 = clamp(aheadX, 120, 2320); z1 = line.line; x2 = x1 + 70; z2 = line.line; ang = 0;
    }
    const a = makeCar('police', x1, z1, ang, 0xe8ecf4, 'Roadblock');
    const b = makeCar('police', x2, z2, ang, 0xe8ecf4, 'Roadblock');
    a.speed = 0; b.speed = 0; a.roadblock = true; b.roadblock = true;
    state.cars.push(a, b);
    state.roadblock = { cars: [a.id, b.id], x: (x1 + x2) / 2, z: (z1 + z2) / 2 };
    addEvent('ROADBLOCK ahead — dispatch', 'police');
  }

  function clearRoadblock() {
    if (!state.roadblock) return;
    for (const id of state.roadblock.cars) {
      const i = state.cars.findIndex((c) => c.id === id);
      if (i >= 0) state.cars.splice(i, 1);
    }
    state.roadblock = null;
  }

  function wreckCar(car, cause) {
    if (car.wrecked) return;
    car.wrecked = true;
    car.speed = 0;
    state.fires.push({ x: car.x, z: car.z, t: 0 });
    audio.crash();
    if (car.kind === 'police') {
      state.policeWrecked += 1;
      addEvent(`Police unit ${car.name} wrecked`, 'police');
      if (state.missionIndex === 5) {
        if (state.policeWrecked >= 3) completeMission();
        else addEvent(`Payback: ${state.policeWrecked}/3 police cars wrecked`, 'mission');
      }
    }
    if (car.id === state.player.inCar) {
      // The player's car blew up — they are thrown out on foot.
      state.player.inCar = null;
      state.player.x = car.x + 40;
      state.player.z = car.z + 40;
    }
  }

  function damagePlayer(amount) {
    if (state.player.invuln > 0) return;
    let rest = amount;
    if (state.player.armor > 0) {
      const absorbed = Math.min(state.player.armor, rest * 0.6);
      state.player.armor -= absorbed;
      rest -= absorbed;
    }
    state.player.health -= rest;
    state.player.invuln = 0.5;
    if (state.player.health <= 0) {
      state.player.health = 0;
      wasted();
    }
  }

  function busted() {
    const fine = crewUnlocked('Marla') ? 75 : WANTED.bustFine;
    state.money = Math.max(0, state.money - fine);
    state.wanted = 0;
    state.player.inCar = null;
    state.player.x = SPOTS.safehouse.x;
    state.player.z = SPOTS.safehouse.z;
    state.player.health = PLAYER.health;
    state.player.armor = 0;
    state.screen = 'busted';
    audio.busted();
    showBanner('BUSTED', `Marla paid the fine — $${fine}. Back at the safehouse.`, 4);
    addEvent(`Busted — fined $${fine}`, 'police');
    clearRoadblock();
    removeHeli();
    // Mission 8 fails if busted during it.
    if (state.missionIndex === 7 && state.missionStage === 1) failMission('Busted during the run.');
  }

  function wasted() {
    state.money = Math.max(0, state.money - 100);
    state.wanted = 0;
    state.player.inCar = null;
    state.player.x = SPOTS.safehouse.x;
    state.player.z = SPOTS.safehouse.z;
    state.player.health = PLAYER.health;
    state.player.armor = 0;
    state.screen = 'busted';
    audio.busted();
    showBanner('WASTED', 'The clinic patched you up — $100. Back at the safehouse.', 4);
    addEvent('Wasted — $100 clinic bill', 'police');
    clearRoadblock();
    removeHeli();
    if (state.missionIndex === 7 && state.missionStage === 1) failMission('Wasted during the run.');
  }

  function completeMission() {
    const m = MISSIONS[state.missionIndex];
    state.money += m.payout;
    state.player.ammo.pistol = Math.min(48, state.player.ammo.pistol + 12);
    audio.jingle();
    showBanner('JOB DONE', `${m.name} — +$${m.payout}`, 3.5);
    say(pick(random, [
      `Marla: "Clean work, Rook. $${m.payout} in your pocket."`,
      `Marla: "That's how it's done. Next job's waiting."`,
      `Marla: "The streets are talking about you now, Rook."`,
    ]), 5);
    addEvent(`Job ${state.missionIndex + 1} complete — +$${m.payout}`, 'mission');
    state.missionIndex += 1;
    state.missionStage = 0;
    state.missionTimer = 0;
    state.vaultProgress = 0;
    state.surviveTimer = 0;
    state.policeWrecked = 0;
    if (state.missionIndex >= MISSIONS.length) {
      say('Marla: "Eight jobs. You run Vice Shores now, Rook."', 6);
      showBanner('KING OF VICE SHORES', 'All 8 jobs done — free roam. The city is yours.', 5);
    } else {
      startMission();
    }
    saveGame(state.saveSlot);
  }

  function failMission(reason) {
    showBanner('JOB FAILED', reason || 'Try again, Rook.', 3);
    say('Marla: "Shake it off. The job is still there when you are ready."', 5);
    state.missionStage = 0;
    state.missionTimer = 0;
    state.vaultProgress = 0;
    state.surviveTimer = 0;
    state.policeWrecked = 0;
    if (state.missionIndex === 2) state.wanted = 0;
    if (state.missionIndex === 7) state.wanted = 0;
  }

  function startMission() {
    const i = state.missionIndex;
    state.missionStage = 0;
    state.missionTimer = 0;
    state.vaultProgress = 0;
    state.surviveTimer = 0;
    state.policeWrecked = 0;
    const lines = [
      'Marla: "First job, Rook. The blue coupe on the boulevard — bring it to Coral Row. Don\'t scratch it."',
      'Marla: "Package in Palm Park. The pier, quick — and the cops are already watching."',
      'Marla: "You\'ve got two stars, Rook. Lose them and get to the safehouse."',
      'Marla: "Client at Hotel Coral needs a fast ride to Airport Rd. Sixty seconds. Go."',
      'Marla: "Red sports car, Lot B. Take it. Bring it to my garage."',
      'Marla: "The cops took Dex\'s car. Pay them back — wreck three of their cars."',
      'Marla: "The bank. Crack the vault, then run — three stars, straight to the safehouse."',
      'Marla: "Last one, Rook. Five stars at the pier. Survive sixty seconds and the city is yours."',
    ];
    say(lines[i] || '', 6);
    if (i === 1) state.wanted = Math.max(state.wanted, 1);
    if (i === 2) state.wanted = 2;
    if (i === 6) addEvent('Job 7: reach the bank, hold E to crack the vault', 'mission');
  }

  function missionMarker() {
    const i = state.missionIndex;
    if (i >= MISSIONS.length) return null;
    const s = state.missionStage;
    switch (i) {
      case 0: return s === 0 ? SPOTS.coupe : SPOTS.coralRow;
      case 1: return s === 0 ? SPOTS.package : SPOTS.pier;
      case 2: return SPOTS.safehouse;
      case 3: return s === 0 ? SPOTS.hotel : SPOTS.airportRd;
      case 4: return s === 0 ? SPOTS.sportCar : SPOTS.garage;
      case 5: return null;
      case 6: return s === 0 ? SPOTS.bank : SPOTS.safehouse;
      case 7: return s === 0 ? SPOTS.pier : SPOTS.pier;
      default: return null;
    }
  }

  function missionObjective() {
    const i = state.missionIndex;
    if (i >= MISSIONS.length) return 'FREE ROAM — all jobs done. The city is yours.';
    return MISSIONS[i].stages[state.missionStage] || MISSIONS[i].stages[0];
  }

  // ---- save / load ---------------------------------------------------------
  function saveData() {
    return {
      money: state.money,
      missionIndex: state.missionIndex,
      x: state.player.x, z: state.player.z,
      health: state.player.health, armor: state.player.armor,
      ammo: state.player.ammo,
      time: state.time,
    };
  }

  function saveGame(slot) {
    try {
      localStorage.setItem(SLOT_KEY(slot), JSON.stringify(saveData()));
      state.titleSlots[slot - 1] = saveData();
    } catch { /* storage unavailable (screenshot headless) */ }
  }

  function loadSlots() {
    for (let n = 1; n <= 3; n++) {
      try {
        const raw = localStorage.getItem(SLOT_KEY(n));
        state.titleSlots[n - 1] = raw ? JSON.parse(raw) : null;
      } catch { state.titleSlots[n - 1] = null; }
    }
  }

  function loadGame(slot) {
    const d = state.titleSlots[slot - 1];
    if (!d) return false;
    state.money = d.money;
    state.missionIndex = d.missionIndex;
    state.missionStage = 0;
    state.player.x = d.x;
    state.player.z = d.z;
    state.player.health = d.health;
    state.player.armor = d.armor;
    state.player.ammo = d.ammo || { pistol: 24, smg: 0 };
    state.player.inCar = null;
    state.wanted = 0;
    state.saveSlot = slot;
    startMission();
    return true;
  }

  function newGame(slot) {
    state.money = 0;
    state.missionIndex = 0;
    state.missionStage = 0;
    state.player.x = SPOTS.safehouse.x;
    state.player.z = SPOTS.safehouse.z;
    state.player.health = PLAYER.health;
    state.player.armor = 0;
    state.player.ammo = { pistol: 24, smg: 0 };
    state.player.inCar = null;
    state.player.weapon = 1;
    state.wanted = 0;
    state.saveSlot = slot;
    startMission();
    saveGame(slot);
  }

  loadSlots();

  // ---- per-frame updates ---------------------------------------------------
  function updatePlayerOnFoot(dt) {
    const p = state.player;
    const mv = input.moveVector();
    const speed = input.sprint() ? PLAYER.sprint : PLAYER.walk;
    const moving = mv.x !== 0 || mv.z !== 0;
    const shooting = input.shootHeld() || state.debugShoot;
    p.moving = moving;
    if (moving) {
      p.walkPhase += dt * (input.sprint() ? 14 : 9);
      // Face the aim point (mouse) when shooting or aiming, else face movement.
      const aimDx = state.aim.x - p.x;
      const aimDz = state.aim.z - p.z;
      if (shooting && Math.hypot(aimDx, aimDz) > 20) {
        p.angle = Math.atan2(aimDz, aimDx);
      } else {
        p.angle = Math.atan2(mv.z, mv.x);
      }
      const moved = moveCircle(city.solids, p.x, p.z, mv.x * speed * dt, mv.z * speed * dt, PLAYER.radius);
      p.x = moved.x;
      p.z = moved.z;
      p.speed = speed;
    } else {
      p.speed = 0;
      const aimDx = state.aim.x - p.x;
      const aimDz = state.aim.z - p.z;
      if (shooting && Math.hypot(aimDx, aimDz) > 20) p.angle = Math.atan2(aimDz, aimDx);
    }

    // Punch: point-blank — knocks the nearest pedestrian down (they flee).
    if (p.weapon === 0 && shooting && p.shootCd <= 0) {
      p.shootCd = PLAYER.shootCooldown;
      p.punching = true;
      audio.punch();
      let best = null;
      let bestD = PLAYER.punchRange + 20;
      for (const ped of state.peds) {
        const d = dist(p.x, p.z, ped.x, ped.z);
        if (d < bestD) { bestD = d; best = ped; }
      }
      if (best) {
        best.state = 'flee';
        best.down = 1.2;
        if (crimeSeen(300)) addWanted(1);
      }
    } else {
      p.punching = false;
    }

    // Shoot the selected firearm.
    if (p.weapon > 0 && shooting && p.shootCd <= 0) {
      const key = p.weapon === 1 ? 'pistol' : 'smg';
      if (p.ammo[key] > 0) {
        p.ammo[key] -= 1;
        state.stats.shotsFired += 1;
        p.shootCd = p.weapon === 1 ? PLAYER.shootCooldown : PLAYER.smgCooldown;
        p.shooting = true;
        const spread = p.weapon === 2 ? 0.06 : 0.02;
        const a = p.angle + range(random, -spread, spread);
        state.bullets.push({
          x: p.x + Math.cos(a) * 22, z: p.z + Math.sin(a) * 22,
          angle: a, life: 0.9, damage: p.weapon === 1 ? PLAYER.bulletDamage : PLAYER.smgDamage,
          fromPlayer: true,
        });
        audio.shot();
        addWanted(1);
      } else {
        p.shootCd = 0.3;
        p.shooting = false;
      }
    } else if (p.weapon > 0) {
      p.shooting = false;
    }

    if (p.shootCd > 0) p.shootCd -= dt;
    if (p.invuln > 0) p.invuln -= dt;
  }

  function nearestCar(maxD) {
    const p = state.player;
    let best = null;
    let bestD = maxD;
    for (const c of state.cars) {
      if (c.wrecked) continue;
      const d = dist(p.x, p.z, c.x, c.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function enterCar(car) {
    const p = state.player;
    if (car.kind === 'traffic' && car.driver) {
      // Carjacking: the driver is ejected and runs.
      car.driver = false;
      addWanted(1);
      audio.steal();
      addEvent('Carjacked a ' + car.name + ' — wanted!', 'police');
      state.stats.carsStolen += 1;
      spawnFleeingDriver(car);
    } else if (car.kind === 'parked') {
      if (crimeSeen(300)) {
        addWanted(1);
        addEvent('Stole a ' + car.name + ' — a cop saw it!', 'police');
      } else {
        addEvent('Took a ' + car.name, 'info');
      }
      state.stats.carsStolen += 1;
      audio.steal();
    }
    p.inCar = car.id;
    car.kind = 'player';
    audio.engineStart();
    if (car.mission === 'coupe' && state.missionIndex === 0 && state.missionStage === 0) {
      state.missionStage = 1;
      say('Marla: "That\'s the one. Coral Row, north end. Go."', 4);
    }
    if (car.mission === 'sport' && state.missionIndex === 4 && state.missionStage === 0) {
      state.missionStage = 1;
      addWanted(1);
      say('Marla: "Red sports car — nice. Bring it to my garage."', 4);
    }
  }

  function spawnFleeingDriver(car) {
    const a = range(random, 0, Math.PI * 2);
    state.peds.push({
      x: car.x + Math.cos(a) * 40, z: car.z + Math.sin(a) * 40,
      angle: a, speed: PEDS.run, state: 'flee', color: pick(random, PED_COLORS),
      walkPhase: 0, target: null, down: 0,
    });
  }

  function exitCar() {
    const p = state.player;
    const car = state.cars.find((c) => c.id === p.inCar);
    if (!car) { p.inCar = null; return; }
    car.kind = car.driver ? 'traffic' : 'parked';
    const a = car.angle + Math.PI / 2;
    const spot = moveCircle(city.solids, car.x + Math.cos(a) * 34, car.z + Math.sin(a) * 34, 0, 0, PLAYER.radius);
    p.x = spot.x;
    p.z = spot.z;
    p.angle = car.angle;
    p.inCar = null;
    audio.engineStop();
  }

  function updatePlayerInCar(dt) {
    const p = state.player;
    const car = state.cars.find((c) => c.id === p.inCar);
    if (!car) { p.inCar = null; return; }
    // Cruise (staged chase): hold a fixed speed so the shot stays at speed.
    if (state.cruise) {
      car.speed = state.cruiseSpeed;
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const nz = car.z + Math.sin(car.angle) * car.speed * dt;
      if (!hitsSolid(city.solids, nx, nz, CAR.radius)) {
        car.x = nx;
        car.z = nz;
      } else {
        car.speed *= -0.25;
      }
      p.x = car.x;
      p.z = car.z;
      p.angle = car.angle;
      p.speed = Math.abs(car.speed);
      audio.engineSet(Math.abs(car.speed) / maxSpeedFor(car), true);
      if (p.invuln > 0) p.invuln -= dt;
      return;
    }
    const fwd = input.isDown('KeyW') || input.isDown('ArrowUp');
    const back = input.isDown('KeyS') || input.isDown('ArrowDown');
    const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
    const right = input.isDown('KeyD') || input.isDown('ArrowRight');
    const maxSp = maxSpeedFor(car);
    if (fwd) car.speed += CAR.accel * dt;
    if (back) car.speed -= (car.speed > 0 ? CAR.brake : CAR.accel * 0.6) * dt;
    if (!fwd && !back) {
      const drag = Math.exp(-CAR.drag * dt);
      car.speed *= drag;
      if (Math.abs(car.speed) < 4) car.speed = 0;
    }
    car.speed = clamp(car.speed, -CAR.reverseMax, maxSp);
    const steer = (left ? 1 : 0) - (right ? 1 : 0);
    const dirSign = car.speed >= 0 ? 1 : -1;
    car.angle += steer * CAR.turn * dt * dirSign * Math.min(1, Math.abs(car.speed) / 120);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const nz = car.z + Math.sin(car.angle) * car.speed * dt;
    if (!hitsSolid(city.solids, nx, nz, CAR.radius)) {
      car.x = nx;
      car.z = nz;
    } else {
      if (Math.abs(car.speed) > 180) {
        car.health -= 8;
        audio.crash();
        if (car.health <= 0) wreckCar(car, 'crash');
      }
      car.speed *= -0.25;
    }
    p.x = car.x;
    p.z = car.z;
    p.angle = car.angle;
    p.speed = Math.abs(car.speed);
    audio.engineSet(Math.abs(car.speed) / maxSp, true);
    car.brakeLight = back;
    if (p.invuln > 0) p.invuln -= dt;
  }

  function updateTraffic(dt) {
    for (const car of state.cars) {
      if (car.kind !== 'traffic') continue;
      if (car.frozen) continue;
      // Brake for the car ahead on the same road.
      let ahead = null;
      let aheadD = Infinity;
      for (const o of state.cars) {
        if (o === car || o.wrecked || o.kind === 'parked') continue;
        const d = dist(car.x, car.z, o.x, o.z);
        if (d < 80) {
          const angTo = Math.atan2(o.z - car.z, o.x - car.x);
          if (Math.abs(angleDiff(car.angle, angTo)) < 0.5 && d < aheadD) { aheadD = d; ahead = o; }
        }
      }
      const target = ahead ? 0 : TRAFFIC.maxSpeed;
      car.speed += clamp(target - car.speed, -TRAFFIC.accel * 2 * dt, TRAFFIC.accel * dt);
      // Turn at an intersection sometimes.
      const line = nearestRoadLine(car.x, car.z);
      if (line) {
        const cross = line.axis === 'v' ? ROADS_H : ROADS_V;
        for (const cl of cross) {
          const along = line.axis === 'v' ? car.z : car.x;
          if (Math.abs(along - cl) < 6 && random() < 0.006) {
            car.angle = line.axis === 'v'
              ? (random() < 0.5 ? 0 : Math.PI)
              : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
            break;
          }
        }
      }
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const nz = car.z + Math.sin(car.angle) * car.speed * dt;
      if (hitsSolid(city.solids, nx, nz, CAR.radius) || !onRoad(nx, nz)) {
        // Turn around at the end of a road.
        car.angle += Math.PI;
        car.speed *= 0.5;
      } else {
        car.x = nx;
        car.z = nz;
      }
    }
  }

  function updatePeds(dt) {
    for (const ped of state.peds) {
      if (ped.down > 0) { ped.down -= dt; continue; }
      if (ped.state === 'flee') {
        ped.speed = PEDS.run;
        const a = Math.atan2(ped.z - state.player.z, ped.x - state.player.x);
        ped.angle = a;
        const moved = moveCircle(city.solids, ped.x, ped.z, Math.cos(a) * ped.speed * dt, Math.sin(a) * ped.speed * dt, 10);
        ped.x = moved.x;
        ped.z = moved.z;
        ped.walkPhase += dt * 12;
        if (dist(ped.x, ped.z, state.player.x, state.player.z) > 500) ped.state = 'walk';
        continue;
      }
      ped.speed = PEDS.walk;
      ped.walkPhase += dt * 6;
      if (!ped.target || dist(ped.x, ped.z, ped.target.x, ped.target.z) < 20) {
        ped.target = randomRoadPoint(random);
      }
      const a = Math.atan2(ped.target.z - ped.z, ped.target.x - ped.x);
      ped.angle = a;
      const moved = moveCircle(city.solids, ped.x, ped.z, Math.cos(a) * ped.speed * dt, Math.sin(a) * ped.speed * dt, 10);
      ped.x = moved.x;
      ped.z = moved.z;
      // A crime nearby makes pedestrians flee.
      if (state.time - state.lastCrimeAt < 1 && dist(ped.x, ped.z, state.player.x, state.player.z) < 260) {
        ped.state = 'flee';
      }
    }
  }

  function updateBullets(dt) {
    for (const b of state.bullets) {
      b.x += Math.cos(b.angle) * PLAYER.bulletSpeed * dt;
      b.z += Math.sin(b.angle) * PLAYER.bulletSpeed * dt;
      b.life -= dt;
      // Hit a pedestrian.
      for (const ped of state.peds) {
        if (ped.down > 0) continue;
        if (dist(b.x, b.z, ped.x, ped.z) < 16) {
          ped.state = 'flee';
          ped.down = 1.5;
          b.life = 0;
          if (b.fromPlayer) { state.stats.pedsHit += 1; addWanted(1); }
          break;
        }
      }
      if (b.life <= 0) continue;
      // Hit a car.
      for (const c of state.cars) {
        if (c.wrecked) continue;
        if (dist(b.x, b.z, c.x, c.z) < CAR.radius + 6) {
          c.health -= b.damage;
          b.life = 0;
          audio.crash();
          if (c.health <= 0) wreckCar(c, 'shot');
          break;
        }
      }
      if (b.life <= 0) continue;
      if (hitsSolid(city.solids, b.x, b.z, 4)) b.life = 0;
    }
    state.bullets = state.bullets.filter((b) => b.life > 0 && b.x > -100 && b.x < 2700 && b.z > -100 && b.z < 2000);
  }

  function updateCarCollisions(dt) {
    const list = state.cars.filter((c) => !c.wrecked);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const d = dist(a.x, a.z, b.x, b.z);
        const min = CAR.radius * 2 - 4;
        if (d < min && d > 0.01) {
          const nx = (b.x - a.x) / d;
          const nz = (b.z - a.z) / d;
          const push = (min - d) / 2;
          a.x -= nx * push; a.z -= nz * push;
          b.x += nx * push; b.z += nz * push;
          const rel = Math.abs(a.speed - b.speed);
          if (rel > 120) {
            a.health -= 6;
            b.health -= 6;
            audio.crash();
            // Ramming a police car is a crime and, on Job 6, progress.
            const playerCar = a.id === state.player.inCar ? a : b.id === state.player.inCar ? b : null;
            const cop = a.kind === 'police' ? a : b.kind === 'police' ? b : null;
            if (playerCar && cop) {
              addWanted(1);
              state.stats.pedsHit += 0;
            }
            if (a.health <= 0) wreckCar(a, 'ram');
            if (b.health <= 0) wreckCar(b, 'ram');
          }
        }
      }
    }
    // The player's car hitting a pedestrian.
    const pcar = state.cars.find((c) => c.id === state.player.inCar);
    if (pcar && Math.abs(pcar.speed) > 60) {
      for (const ped of state.peds) {
        if (ped.down > 0) continue;
        if (dist(pcar.x, pcar.z, ped.x, ped.z) < CAR.radius + 8) {
          ped.state = 'flee';
          ped.down = 2;
          state.stats.pedsHit += 1;
          addWanted(1);
          audio.crash();
        }
      }
    }
  }

  function updatePolice(dt) {
    const want = state.wanted;
    const targetCount = want === 0 ? 0 : want <= 1 ? 1 : want === 2 ? 2 : want === 3 ? 3 : 4;
    const cops = activePolice().filter((c) => !c.roadblock);
    // Spawn up to the target count (not before the respawn delay).
    if (cops.length < targetCount && state.time >= state.policeRespawnAt) {
      const p = state.player;
      const a = range(random, 0, Math.PI * 2);
      const sx = clamp(p.x + Math.cos(a) * 700, 100, 2300);
      const sz = clamp(p.z + Math.sin(a) * 700, 100, 1650);
      const spot = nearestRoadPoint(sx, sz);
      spawnPoliceCar(spot);
      state.policeRespawnAt = state.time + 2;
    }
    // Chase and ram.
    for (const cop of activePolice()) {
      if (cop.roadblock) continue;
      const p = state.player;
      const d = dist(cop.x, cop.z, p.x, p.z);
      const wantAngle = Math.atan2(p.z - cop.z, p.x - cop.x);
      cop.angle += clamp(angleDiff(cop.angle, wantAngle), -2.4 * dt, 2.4 * dt);
      const target = d > 60 ? policeMaxSpeed() : policeMaxSpeed() * 0.6;
      cop.speed += clamp(target - cop.speed, -POLICE.accel * dt, POLICE.accel * dt);
      const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
      const nz = cop.z + Math.sin(cop.angle) * cop.speed * dt;
      if (!hitsSolid(city.solids, nx, nz, CAR.radius)) {
        cop.x = nx;
        cop.z = nz;
      } else {
        cop.speed *= 0.4;
      }
      // Ram the player.
      if (d < CAR.radius + 16 && cop.speed > 60) {
        if (p.inCar) {
          const pcar = state.cars.find((c) => c.id === p.inCar);
          if (pcar) {
            pcar.health -= POLICE.ramDamage * dt * 3;
            if (pcar.health <= 0) wreckCar(pcar, 'ram');
          }
        } else {
          damagePlayer(POLICE.ramDamage * dt * 2);
        }
        cop.speed *= 0.5;
      }
      // Busted: a cop sitting on the player.
      if (d < POLICE.bustRange && Math.abs(cop.speed) < 120 && !p.inCar) {
        cop.bustTimer = (cop.bustTimer || 0) + dt;
        if (cop.bustTimer > POLICE.bustTime) {
          cop.bustTimer = 0;
          busted();
          return;
        }
      } else {
        cop.bustTimer = 0;
      }
    }
    // Remove wrecked police after a while (they stay as wrecks with fire).
    // Helicopter at 4-5 stars.
    if (want >= 4) spawnHeli();
    else removeHeli();
    if (state.heli) {
      const h = state.heli;
      h.rotor += dt * 22;
      if (!state.heliFrozen) {
        const dx = state.player.x - h.x;
        const dz = state.player.z - h.z;
        const d = Math.hypot(dx, dz);
        if (d > 60) {
          h.x += (dx / d) * HELI.speed * dt;
          h.z += (dz / d) * HELI.speed * dt;
        }
        h.angle = Math.atan2(dz, dx);
      }
    }
    // Roadblock at 3+ stars.
    if (want >= 3 && !state.roadblock) spawnRoadblock();
    if (want < 3) clearRoadblock();
    // Wanted decay: 10s unseen, then -1 every 4s (2s with Lena).
    const nearestCop = activePolice().reduce((m, c) => Math.min(m, dist(c.x, c.z, state.player.x, state.player.z)), Infinity);
    const heliNear = state.heli ? dist(state.heli.x, state.heli.z, state.player.x, state.player.z) < 400 : false;
    if (want > 0 && nearestCop > 250 && !heliNear) {
      state.unseenTimer += dt;
      if (state.unseenTimer > WANTED.decayUnseen) {
        const step = crewUnlocked('Lena') ? WANTED.decayStep / 2 : WANTED.decayStep;
        state.decayAcc = (state.decayAcc || 0) + dt;
        if (state.decayAcc >= step) {
          state.decayAcc = 0;
          state.wanted -= 1;
          state.unseenTimer = WANTED.decayUnseen;
          addEvent(`Heat cooling — ${state.wanted} star${state.wanted === 1 ? '' : 's'}`, 'info');
        }
      }
    } else {
      state.unseenTimer = 0;
      state.decayAcc = 0;
    }
    // Siren while any police is active.
    if (cops.length > 0) audio.sirenStart();
    else audio.sirenStop();
  }

  function updateMissions(dt) {
    const i = state.missionIndex;
    if (i >= MISSIONS.length) return;
    const p = state.player;
    const marker = missionMarker();
    const near = (spot, r) => spot && dist(p.x, p.z, spot.x, spot.z) < r;
    switch (i) {
      case 0:
        if (state.missionStage === 1 && near(SPOTS.coralRow, 90)) completeMission();
        break;
      case 1:
        if (state.missionStage === 0 && !p.inCar && near(SPOTS.package, 46)) {
          state.missionStage = 1;
          audio.pickup();
          say('Marla: "Package secured. Pier 9 — and don\'t stop for anyone."', 4);
        } else if (state.missionStage === 1 && near(SPOTS.pier, 90)) {
          completeMission();
        }
        break;
      case 2:
        if (near(SPOTS.safehouse, 90)) {
          if (state.wanted === 0) completeMission();
          else if (state.time - (state.m3HintAt || 0) > 6) {
            state.m3HintAt = state.time;
            say('Marla: "Not yet — lose the heat first, then come home."', 4);
          }
        }
        break;
      case 3:
        if (state.missionStage === 0 && near(SPOTS.hotel, 90)) {
          state.missionStage = 1;
          state.missionTimer = 60;
          say('Client: "Airport Rd. Sixty seconds or I walk."', 4);
        } else if (state.missionStage === 1) {
          state.missionTimer -= dt;
          if (near(SPOTS.airportRd, 90) && p.inCar) completeMission();
          else if (state.missionTimer <= 0) failMission('Too slow — the client walked.');
        }
        break;
      case 4:
        if (state.missionStage === 1 && p.inCar) {
          const car = state.cars.find((c) => c.id === p.inCar);
          if (car && car.mission === 'sport' && near(SPOTS.garage, 110)) completeMission();
        }
        break;
      case 5:
        // Progress is counted in wreckCar; the objective is always visible.
        break;
      case 6:
        if (state.missionStage === 0 && near(SPOTS.bank, 110)) {
          if (input.isDown('KeyE')) {
            state.vaultProgress += dt;
            if (state.vaultProgress >= 5) {
              state.vaultProgress = 0;
              state.missionStage = 1;
              state.wanted = 3;
              audio.pickup();
              say('Marla: "Vault\'s open. Three stars — RUN to the safehouse."', 5);
            }
          } else {
            state.vaultProgress = Math.max(0, state.vaultProgress - dt * 2);
          }
        } else if (state.missionStage === 1 && near(SPOTS.safehouse, 90)) {
          completeMission();
        }
        break;
      case 7:
        if (state.missionStage === 0 && near(SPOTS.pier, 100)) {
          state.missionStage = 1;
          state.surviveTimer = 60;
          state.wanted = 5;
          say('Marla: "Five stars, Rook. Sixty seconds. Make them remember you."', 5);
        } else if (state.missionStage === 1) {
          state.surviveTimer -= dt;
          if (state.surviveTimer <= 0) completeMission();
        }
        break;
      default:
        break;
    }
    if (marker && p.inCar) {
      // Nothing: the marker is drawn by the renderer.
    }
  }

  function updateClock(dt) {
    state.clockMin += dt * 0.5; // 1 game minute per 2 real seconds
    if (state.clockMin >= 24 * 60) state.clockMin -= 24 * 60;
    state.radioTimer += dt;
    if (state.radioTimer > 45) {
      state.radioTimer = 0;
      state.radioIdx = (state.radioIdx + 1) % RADIO.length;
    }
  }

  function updateFires(dt) {
    for (const f of state.fires) f.t += dt;
    state.fires = state.fires.filter((f) => f.t < 14);
  }

  // ---- main update ---------------------------------------------------------
  function update(dt) {
    if (state.screen !== 'play') return;
    state.time += dt;
    updateClock(dt);

    // E: enter/exit cars, garage, vault handled in missions.
    if (input.consume('KeyE')) {
      if (state.player.inCar) {
        exitCar();
      } else {
        const car = nearestCar(64);
        if (car) enterCar(car);
      }
    }
    // G: garage (only near the garage, on foot or in a car).
    if (input.consume('KeyG')) {
      if (dist(state.player.x, state.player.z, SPOTS.garage.x, SPOTS.garage.z) < 140) {
        state.screen = 'garage';
        audio.engineStop();
        return;
      }
    }
    // Weapon keys.
    if (input.consume('Digit1')) state.player.weapon = 0;
    if (input.consume('Digit2')) state.player.weapon = 1;
    if (input.consume('Digit3') && state.missionIndex >= 4) {
      state.player.weapon = 2;
      if (state.player.ammo.smg === 0) state.player.ammo.smg = 60;
    }
    if (input.consume('KeyQ')) {
      state.player.weapon = (state.player.weapon + 1) % 3;
      if (state.player.weapon === 2 && state.missionIndex < 4) state.player.weapon = 0;
    }
    if (input.consume('KeyM')) {
      state.muted = !state.muted;
      audio.setMuted(state.muted);
    }
    if (input.consume('KeyP') || input.consume('Escape')) {
      state.screen = 'paused';
      audio.engineStop();
      audio.sirenStop();
      return;
    }

    if (state.player.inCar) updatePlayerInCar(dt);
    else updatePlayerOnFoot(dt);
    updateTraffic(dt);
    updatePeds(dt);
    updateBullets(dt);
    updateCarCollisions(dt);
    updatePolice(dt);
    updateMissions(dt);
    updateFires(dt);

    // Expire dialogue/banner.
    if (state.dialogue && state.time > state.dialogue.until) state.dialogue = null;
    if (state.banner && state.time > state.banner.until) state.banner = null;
  }

  function updateGarage() {
    if (input.consume('Escape') || input.consume('KeyG')) {
      state.screen = 'play';
      return;
    }
    if (input.consume('Digit1')) buyGarage('repair');
    if (input.consume('Digit2')) buyGarage('respray');
    if (input.consume('Digit3')) buyGarage('armour');
    if (input.consume('Digit4')) buyGarage('ammo');
  }

  function buyGarage(kind) {
    const car = state.cars.find((c) => c.id === state.player.inCar) || nearestCar(120);
    const price = GARAGE[kind];
    if (state.money < price) {
      say('Marla: "Short on cash, Rook. Go earn it."', 3);
      return;
    }
    if (kind === 'repair' && !car) return;
    if (kind === 'repair' && car.health >= CAR.health) return;
    if (kind === 'armour' && state.player.armor >= 100) return;
    state.money -= price;
    if (kind === 'repair' && car) {
      car.health = CAR.health;
      addEvent('Car repaired — $150', 'info');
    } else if (kind === 'respray' && car) {
      state.carColorIdx = (state.carColorIdx + 1) % TRAFFIC_COLORS.length;
      car.color = TRAFFIC_COLORS[state.carColorIdx];
      addEvent('Respray — $200', 'info');
    } else if (kind === 'armour') {
      state.player.armor = Math.min(100, state.player.armor + 50);
      addEvent('Armour +50 — $300', 'info');
    } else if (kind === 'ammo') {
      state.player.ammo.pistol = Math.min(48, state.player.ammo.pistol + 24);
      addEvent('Ammo +24 — $50', 'info');
    }
    audio.pickup();
  }

  // ---- debug helpers for the screenshot staging -----------------------------
  const debug = {
    placePlayer(x, z, angle) {
      state.player.x = x;
      state.player.z = z;
      if (angle !== undefined) state.player.angle = angle;
      state.player.inCar = null;
    },
    placePlayerInCar(car, x, z, angle) {
      if (x !== undefined) { car.x = x; car.z = z; }
      if (angle !== undefined) car.angle = angle;
      car.speed = 0;
      state.player.inCar = car.id;
      car.kind = 'player';
      state.player.x = car.x;
      state.player.z = car.z;
      state.player.angle = car.angle;
    },
    giveCar(kind, x, z, angle, color, name, opts) {
      const car = makeCar(kind, x, z, angle, color, name, opts);
      state.cars.push(car);
      return car;
    },
    setWanted(n) {
      state.wanted = clamp(n, 0, WANTED.maxStars);
      state.unseenTimer = 0;
    },
    setMoney(n) { state.money = n; },
    setMission(i, stage) {
      state.missionIndex = i;
      state.missionStage = stage || 0;
      state.missionTimer = 0;
      state.vaultProgress = 0;
      state.surviveTimer = 0;
      state.policeWrecked = 0;
    },
    spawnPoliceAt(x, z, angle) {
      const car = spawnPoliceCar({ x, z });
      if (angle !== undefined) car.angle = angle;
      car.speed = 300;
      return car;
    },
    spawnHeliAt(x, z) {
      spawnHeli();
      if (state.heli) { state.heli.x = x; state.heli.z = z; }
      return state.heli;
    },
    setRoadblockAt(x, z, axis) {
      const a = makeCar('police', x, z, axis === 'v' ? Math.PI / 2 : 0, 0xe8ecf4, 'Roadblock');
      const b = makeCar('police', axis === 'v' ? x : x + 70, axis === 'v' ? z + 70 : z, axis === 'v' ? Math.PI / 2 : 0, 0xe8ecf4, 'Roadblock');
      a.roadblock = true; b.roadblock = true;
      state.cars.push(a, b);
      state.roadblock = { cars: [a.id, b.id], x, z };
      return state.roadblock;
    },
    addFire(x, z) {
      state.fires.push({ x, z, t: 0 });
    },
    wreckPoliceAt(x, z) {
      const car = makeCar('police', x, z, 0.4, 0xe8ecf4, 'Interceptor');
      car.health = 0;
      state.cars.push(car);
      wreckCar(car, 'debug');
      return car;
    },
    freezeTraffic() {
      for (const c of state.cars) if (c.kind === 'traffic') { c.frozen = true; c.speed = 0; }
    },
    unfreezeTraffic() {
      for (const c of state.cars) if (c.kind === 'traffic') c.frozen = false;
    },
    setClock(min) { state.clockMin = min; },
    setRadio(i) { state.radioIdx = i % RADIO.length; state.radioTimer = 0; },
    setHealth(h, armor) { state.player.health = h; state.player.armor = armor || 0; },
    setAmmo(pistol, smg) { state.player.ammo = { pistol, smg }; },
    setWeapon(w) { state.player.weapon = w; },
    setDialogue(text, secs) { say(text, secs || 30); },
    setBanner(text, sub, secs) { showBanner(text, sub, secs || 30); },
    openGarage() { state.screen = 'garage'; },
    showTitle() { state.screen = 'title'; loadSlots(); },
    seedSlots() {
      // Two played slots, through the real save path, so the title screen shows
      // real save data (the game's own localStorage format).
      try {
        localStorage.setItem(SLOT_KEY(1), JSON.stringify({ money: 1250, missionIndex: 2, x: 540, z: 500, health: 82, armor: 40, ammo: { pistol: 36, smg: 0 }, time: 1820 }));
        localStorage.setItem(SLOT_KEY(2), JSON.stringify({ money: 3400, missionIndex: 5, x: 1500, z: 500, health: 100, armor: 75, ammo: { pistol: 48, smg: 60 }, time: 5400 }));
      } catch { /* ignore */ }
      loadSlots();
    },
    setPlayerCarSpeed(s) {
      const car = state.cars.find((c) => c.id === state.player.inCar);
      if (car) car.speed = s;
    },
    setAim(x, z) { state.aim.x = x; state.aim.z = z; },
    setAimLock(x, z) { state.aimLocked = { x, z }; },
    clearAimLock() { state.aimLocked = null; },
    setShooting(v) { state.debugShoot = !!v; },
    setCruise(speed) { state.cruise = true; state.cruiseSpeed = speed; },
    freezeHeli() { state.heliFrozen = true; },
  };

  return {
    state, city, input, audio,
    update, updateGarage,
    startMission, completeMission, failMission, missionMarker, missionObjective,
    saveGame, loadGame, newGame, loadSlots,
    rank: () => rankFor(state.missionIndex),
    crewUnlocked,
    radio: () => RADIO[state.radioIdx],
    debug,
  };
}
