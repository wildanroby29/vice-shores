// The game itself for Vice Shores: the 3D scene, the cameras, driving and
// walking, carjacking, shooting, the wanted system, missions, saves and the
// garage shop.
//
// The scene is built once from the seeded stream — sky, lighting, city,
// traffic, pedestrians, police and the helicopter — and then stepped in
// fixed 1/60-second steps. The cameras are the heart of the look: a snapped
// title-card shot over the boulevard, a low rolled chase shot, an
// over-the-shoulder on-foot camera that puts Rook on the left third, and a
// fixed pier camera. The hero is Rook, a driver working Marla's eight jobs;
// the city answers with traffic, pedestrians, police cars, officers and a
// searchlight helicopter, and the HUD reads everything through hudState().

import { STEP, DAYTIME, PLAYER, WORLD, PAINT } from './config.js';
import { createMissions } from './missions.js';
import { createSky } from './render/sky.js';
import { createLighting } from './render/lighting.js';
import { createEffects } from './render/effects.js';
import { buildCity } from './city.js';
import { makeHeroCar, makeTraffic, updateTraffic } from './vehicles.js';
import { makeRook, makePedestrians, updatePedestrians } from './people.js';
import { createPolice, createHelicopter } from './police.js';

export const UPGRADES = [
  { key: 'armour', name: 'Armour Plating', price: 800, desc: 'Reinforced panels. Take twice the punishment before the car smokes.' },
  { key: 'engine', name: 'Engine Tune', price: 1200, desc: 'Stage-2 tune. Noticeably quicker off the line and a higher top speed.' },
  { key: 'nitro', name: 'Nitro Boost', price: 900, desc: 'A tank of nitro. Hold Shift for a short burst of speed.' },
  { key: 'paint', name: 'Sunset Gold Paint', price: 500, desc: 'Factory gold flake with a deep clearcoat. Turns heads on the boulevard.' },
  { key: 'wheels', name: 'Chrome Wheels', price: 650, desc: 'Polished chrome rims with low-profile tyres. Pure boulevard style.' },
  { key: 'bodykit', name: 'Body Kit', price: 1500, desc: 'Front splitter, side skirts and a rear wing. The GT looks the part.' },
];

function collideCircle(x, z, colliders, radius) {
  for (const c of colliders) {
    const cx = Math.max(c.x - c.w / 2, Math.min(x, c.x + c.w / 2));
    const cz = Math.max(c.z - c.d / 2, Math.min(z, c.z + c.d / 2));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}

export function createGame(canvas, opts = {}) {
  const rand = opts.rand;
  const detail = opts.detail ?? 'full';
  const flat = !!opts.flat;
  const audio = opts.audio ?? null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);

  const lighting = createLighting(scene, renderer);
  const sky = createSky(scene, rand);
  const effects = createEffects(scene);
  const city = buildCity(rand);
  scene.add(city.group);
  const traffic = makeTraffic(rand);
  for (const t of traffic) scene.add(t.group);
  const peds = makePedestrians(rand);
  for (const p of peds) scene.add(p.group);
  const police = createPolice(scene, rand);
  const heli = createHelicopter(scene);
  const missions = createMissions();

  // The hero GT and Rook.
  const heroCar = makeHeroCar();
  scene.add(heroCar.group);
  const rook = makeRook();
  scene.add(rook.group);
  let currentCar = heroCar;

  // Sun glitter on the sea east of the pier.
  const glitterMat = new THREE.MeshBasicMaterial({
    color: 0xffb36b, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const glitter = new THREE.Mesh(new THREE.PlaneGeometry(60, 260), glitterMat);
  glitter.rotation.x = -Math.PI / 2;
  glitter.position.set(300, 0.12, 60);
  scene.add(glitter);

  // The mission marker: a floating golden diamond and a faint beam.
  const markerMat = new THREE.MeshStandardMaterial({
    color: 0xffd94a, emissive: 0xffb020, emissiveIntensity: 1.4, roughness: 0.3,
  });
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), markerMat);
  marker.position.set(60, 2.2, -60);
  scene.add(marker);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffd94a, transparent: true, opacity: 0.06,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const markerBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 8, 10), beamMat);
  markerBeam.position.set(60, 4, -60);
  scene.add(markerBeam);

  // --- State ---------------------------------------------------------------
  let screen = 'title';
  let onFoot = false;
  let heading = -Math.PI / 2;
  let speed = 0;
  let maxSpeed = PLAYER.topSpeed;
  let health = PLAYER.health;
  let armour = PLAYER.armour;
  let wanted = 0;
  let clock = 17.5;
  let dialogue = '';
  let dialogueTime = 0;
  let camMode = 'title';
  let time = 0;
  let condition = 100;
  let carName = 'GT SUNLINE';
  let fireCooldown = 0;
  let aiming = false;
  let wantedTimer = 0;
  let timeOfDay = 'golden';
  let toast = '';
  let toastTime = 0;
  const owned = new Set();
  const camPos = new THREE.Vector3(0, 10, 0);
  const camLook = new THREE.Vector3(0, 0, 0);
  let camReady = false;

  function heroPos() {
    if (onFoot) return { x: rook.group.position.x, z: rook.group.position.z };
    return { x: currentCar.group.position.x, z: currentCar.group.position.z };
  }

  function setTimeOfDay(key) {
    timeOfDay = key;
    const preset = DAYTIME[key];
    clock = preset.hour;
    const target = new THREE.Vector3(heroPos().x, 0, heroPos().z);
    const { dir, isNight } = lighting.setTime(key, target);
    sky.applyTime(preset, dir, isNight);
    glitterMat.opacity = key === 'sunset' || key === 'golden' ? 0.5 : 0.08;
    glitterMat.color.setHex(isNight ? 0x8fa8ff : 0xffb36b);
    if (!flat) sky.buildEnvironment(renderer);
  }

  if (flat) {
    lighting.setFlat();
    sky.dome.visible = false;
  }
  setTimeOfDay('golden');

  function setHero(x, z, h, inCar) {
    onFoot = !inCar;
    heading = h;
    currentCar.group.position.set(x, 0, z);
    currentCar.group.rotation.set(0, h, 0);
    rook.group.position.set(x - 3, 0, z + 2);
    rook.group.rotation.set(0, h, 0);
    rook.group.visible = onFoot;
    speed = 0;
  }

  function setMission(i) {
    missions.setMission(i);
    const t = missions.current.target;
    marker.position.set(t[0], 2.2, t[1]);
    markerBeam.position.set(t[0], 4, t[1]);
  }

  function setWanted(n) {
    wanted = Math.max(0, Math.min(5, n));
    if (wanted >= 3 && audio) audio.sirenOn();
    else if (audio) audio.sirenOff();
    const hp = heroPos();
    while (police.cars.length < Math.min(4, wanted)) {
      const ang = Math.random() * Math.PI * 2;
      police.spawnCar(hp.x + Math.cos(ang) * 40, hp.z + Math.sin(ang) * 40);
    }
  }

  function say(text, seconds) {
    dialogue = text;
    dialogueTime = seconds;
  }

  function enterCar() {
    if (onFoot) {
      // Nearest traffic car within 5 m becomes the hero's ride.
      let best = null;
      let bestD = 5;
      for (const t of traffic) {
        const d = Math.hypot(
          t.group.position.x - rook.group.position.x,
          t.group.position.z - rook.group.position.z,
        );
        if (d < bestD) { best = t; bestD = d; }
      }
      if (best) {
        currentCar = best;
        const g = best.group;
        heading = g.rotation.y;
        g.userData.stolen = true;
        carName = 'STOLEN SEDAN';
        condition = 72;
        onFoot = false;
        rook.group.visible = false;
        setWanted(wanted + 1);
        say('Rook: "Borrowed. Don\'t tell Marla."', 4);
        if (audio) audio.engineStart();
        return;
      }
      const d = Math.hypot(
        heroCar.group.position.x - rook.group.position.x,
        heroCar.group.position.z - rook.group.position.z,
      );
      if (d < 6) {
        currentCar = heroCar;
        heading = heroCar.group.rotation.y;
        carName = 'GT SUNLINE';
        condition = 100;
        onFoot = false;
        rook.group.visible = false;
        say('Rook: "Let\'s roll."', 3);
        if (audio) audio.engineStart();
      }
      return;
    }
    // Step out of the car.
    const g = currentCar.group;
    onFoot = true;
    rook.group.position.set(g.position.x + 2.5, 0, g.position.z + 1);
    rook.group.rotation.y = heading;
    rook.group.visible = true;
    speed = 0;
    if (audio) audio.engineStop();
  }

  function shoot() {
    if (fireCooldown > 0) return;
    fireCooldown = 0.28;
    if (audio) audio.shot();
    if (!missions.useAmmo()) return;
    const hp = heroPos();
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const mx = hp.x + fx * 3;
    const mz = hp.z + fz * 3;
    effects.muzzle(mx, 1.4, mz);
    // A police car ahead of the hero takes the hit.
    for (const car of police.cars) {
      const g = car.group;
      const dx = g.position.x - hp.x;
      const dz = g.position.z - hp.z;
      const dist = Math.hypot(dx, dz);
      const facing = (dx * fx + dz * fz) / (dist || 1);
      if (dist < 28 && facing > 0.5) {
        effects.smoke(g.position.x, 1.2, g.position.z, { size: 1.6, life: 0.9, color: 0xd8d2c8 });
        effects.flame(g.position.x, 1.2, g.position.z, 1.2);
        condition = Math.max(40, condition - 2);
        setWanted(wanted + 1);
        say('Rook: "They started it."', 4);
        break;
      }
    }
  }

  function checkMission() {
    const t = missions.current.target;
    const hp = heroPos();
    if (Math.hypot(hp.x - t[0], hp.z - t[1]) < 12) {
      const { job, finishedAll } = missions.complete();
      if (audio) audio.chime();
      say(`Marla: "Job done. $${job.reward} is yours."`, 5);
      if (finishedAll) say('Marla: "That\'s all eight, Rook. You run this city now."', 6);
      setMission(missions.index);
      saveSlot(1);
    }
  }

  function saveSlot(n) {
    try {
      const saves = JSON.parse(localStorage.getItem('vice-shores.saves.v1') || '{}');
      const hp = heroPos();
      saves[n] = {
        money: missions.money, mission: missions.index, completed: missions.completed,
        rank: missions.rank, time: clock, x: hp.x, z: hp.z,
      };
      localStorage.setItem('vice-shores.saves.v1', JSON.stringify(saves));
    } catch (e) {}
  }

  function loadSlot(n) {
    try {
      const saves = JSON.parse(localStorage.getItem('vice-shores.saves.v1') || '{}');
      return saves[n] || null;
    } catch (e) {
      return null;
    }
  }

  function listSaves() {
    const labels = [
      'SLOT 1 · ACT II — MARKET SQUEEZE',
      'SLOT 2 · ACT I — GOLD PAINT',
      'SLOT 3 · EMPTY',
    ];
    return [1, 2, 3].map((n, i) => {
      const s = loadSlot(n);
      if (!s) return { slot: n, label: labels[i], empty: true };
      return {
        slot: n, label: labels[i], empty: false,
        act: s.completed >= 4 ? 'ACT II' : 'ACT I',
        percent: Math.round((s.completed / 8) * 100),
        missions: `${s.completed}/8`,
        money: s.money,
      };
    });
  }

  function buyUpgrade(key) {
    const item = UPGRADES.find((u) => u.key === key);
    if (!item || owned.has(key)) return { ok: false };
    if (!missions.spend(item.price)) return { ok: false, poor: true };
    owned.add(key);
    if (key === 'engine') maxSpeed = 54;
    if (key === 'paint') heroCar.paintMat.color.setHex(0xd4af37);
    toast = `${item.name} installed`;
    toastTime = 2.6;
    if (audio) audio.chime();
    return { ok: true, name: item.name };
  }

  // --- Cameras -------------------------------------------------------------
  function updateCamera() {
    const hp = heroPos();
    const h = heading;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    const rx = -Math.cos(h);
    const rz = Math.sin(h);
    if (camMode === 'title') {
      const a = time * 0.05;
      camera.position.set(Math.cos(a) * 130, 55, Math.sin(a) * 130);
      camera.lookAt(0, 6, 0);
      camera.fov = 62;
    } else if (camMode === 'titlecard') {
      camera.position.set(hp.x - fx * 8.5 + rx * 4.5, 3.0, hp.z - fz * 8.5 + rz * 4.5);
      camera.lookAt(hp.x + fx * 12, 1.2, hp.z + fz * 12);
      camera.fov = 66;
    } else if (camMode === 'chaseShot') {
      camera.position.set(hp.x - fx * 8.5 + rx * 3.0, 3.6, hp.z - fz * 8.5 + rz * 3.0);
      camera.lookAt(hp.x + fx * 14, 1.6, hp.z + fz * 14);
      camera.rotateZ(0.055);
      camera.fov = 66 + Math.min(4, Math.abs(speed) * 0.12);
    } else if (camMode === 'pier') {
      camera.position.set(186, 3.0, 237);
      camera.lookAt(184, 5, 140);
      camera.fov = 64;
    } else if (camMode === 'onfoot') {
      const rp = rook.group.position;
      const base = new THREE.Vector3(
        rp.x - fx * 5.5 + rx * 2.5, 2.6, rp.z - fz * 5.5 + rz * 2.5,
      );
      if (!camReady) {
        camPos.copy(base);
        camLook.set(rp.x + fx * 12, 1.6, rp.z + fz * 12);
        camReady = true;
      }
      camPos.lerp(base, 0.12);
      camLook.lerp(new THREE.Vector3(rp.x + fx * 12, 1.6, rp.z + fz * 12), 0.12);
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      camera.fov = 64;
    } else if (camMode === 'asset') {
      const v = game.assetView || { x: 0, y: 0, z: 0, dist: 9, height: 3.2, az: Math.PI / 4, fov: 50 };
      camera.position.set(
        v.x + Math.sin(v.az) * v.dist, v.height, v.z + Math.cos(v.az) * v.dist,
      );
      camera.lookAt(v.x, v.y, v.z);
      camera.fov = v.fov || 50;
    } else {
      // Play chase camera behind the car.
      const tx = hp.x - Math.sin(heading) * 11.5;
      const tz = hp.z - Math.cos(heading) * 11.5;
      if (!camReady) {
        camPos.set(tx, 4.6, tz);
        camLook.set(hp.x + Math.sin(heading) * 14, 1.6, hp.z + Math.cos(heading) * 14);
        camReady = true;
      }
      camPos.lerp(new THREE.Vector3(tx, 4.6, tz), 0.08);
      camLook.lerp(
        new THREE.Vector3(hp.x + Math.sin(heading) * 14, 1.6, hp.z + Math.cos(heading) * 14),
        0.15,
      );
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      camera.fov = 62;
    }
    camera.updateProjectionMatrix();
  }

  // --- The step ------------------------------------------------------------
  function step(dt, input) {
    time += dt;
    const pressed = input ? input.takePressed() : 0;

    if (screen !== 'play') {
      // Idle the world: traffic and pedestrians at 0.4x, effects, marker
      // and boats keep moving, camera keeps updating.
      updateTraffic(traffic, dt * 0.4);
      updatePedestrians(peds, dt * 0.4, time);
      police.update(dt * 0.4, time, heroPos(), wanted);
      heli.update(dt * 0.4, time, wanted >= 3 ? heroPos() : null);
      effects.update(dt);
      marker.rotation.y += dt;
      marker.position.y = 2.2 + Math.sin(time * 2) * 0.3;
      for (const b of city.boats) {
        b.position.y = 0.1 + Math.sin(time * 0.8 + b.position.x) * 0.15;
        b.rotation.z = Math.sin(time * 0.6) * 0.02;
      }
      updateCamera();
      return;
    }

    clock += dt * 0.004;
    if (dialogueTime > 0) {
      dialogueTime -= dt;
      if (dialogueTime <= 0) dialogue = '';
    }
    if (toastTime > 0) toastTime -= dt;
    if (fireCooldown > 0) fireCooldown -= dt;

    const fwd = input ? input.forward : 0;
    const steer = input ? input.steer : 0;

    if (onFoot) {
      // Walking: turn, then step. Sprint with Shift.
      heading += steer * 2.6 * dt;
      const walkSpeed = input && input.sprint ? PLAYER.run : PLAYER.walk;
      const nx = rook.group.position.x + Math.sin(heading) * fwd * walkSpeed * dt;
      const nz = rook.group.position.z + Math.cos(heading) * fwd * walkSpeed * dt;
      const cx = THREE.MathUtils.clamp(nx, -208, 208);
      const cz = THREE.MathUtils.clamp(nz, -208, 232);
      if (!collideCircle(cx, cz, city.colliders, 0.7)) {
        rook.group.position.x = cx;
        rook.group.position.z = cz;
      }
      rook.group.rotation.y = heading;
      const swing = Math.sin(time * 9) * 0.45;
      if (fwd !== 0) {
        rook.leftLeg.rotation.x = swing;
        rook.rightLeg.rotation.x = -swing;
        rook.leftArm.rotation.x = -swing * 0.7;
        rook.rightArm.rotation.x = swing * 0.7;
      }
      if (aiming) rook.aim(true);
      else rook.aim(false);
      if (pressed & 2) shoot();
    } else {
      // Driving: accelerate, brake, drag, steer, collide.
      if (fwd > 0) speed += PLAYER.accel * dt;
      else if (fwd < 0) speed -= PLAYER.brake * dt;
      speed -= speed * 0.55 * dt;
      speed = THREE.MathUtils.clamp(speed, -10, maxSpeed);
      const turnScale = Math.min(1, Math.abs(speed) / 10);
      heading += steer * PLAYER.turn * dt * turnScale * (speed < 0 ? -1 : 1);
      const g = currentCar.group;
      const nx = g.position.x + Math.sin(heading) * speed * dt;
      const nz = g.position.z + Math.cos(heading) * speed * dt;
      const cx = THREE.MathUtils.clamp(nx, -208, 208);
      const cz = THREE.MathUtils.clamp(nz, -208, 232);
      if (collideCircle(cx, cz, city.colliders, 1.8)) {
        speed *= 0.4;
      } else {
        g.position.x = cx;
        g.position.z = cz;
      }
      g.rotation.y = heading;
      // A touch of body lean into the steering.
      g.rotation.z = -steer * 0.04 * Math.min(1, Math.abs(speed) / 20);
      for (const w of currentCar.wheels) w.rotation.x += (speed * dt) / 0.42;
      // Nitro: a burst while Shift is held, if the tank is fitted.
      if (input && input.sprint && owned.has('nitro') && fwd > 0) {
        speed = Math.min(speed + 14 * dt, maxSpeed + 12);
      }
      // Tyre smoke when drifting hard.
      if (Math.abs(steer) > 0.5 && Math.abs(speed) > 22 && Math.random() < 0.5) {
        effects.smoke(
          g.position.x - Math.sin(heading) * 2, 0.8, g.position.z - Math.cos(heading) * 2,
          { size: 1.6, life: 0.9, color: 0xd8d2c8 },
        );
      }
      if (audio) audio.engineSet(Math.abs(speed) / maxSpeed);
    }

    if (pressed & 1) enterCar();

    // Wanted decay: no police close by for 14 seconds drops a star.
    let near = false;
    for (const car of police.cars) {
      const d = Math.hypot(
        car.group.position.x - heroPos().x,
        car.group.position.z - heroPos().z,
      );
      if (d < 30) { near = true; break; }
    }
    if (near) wantedTimer = 0;
    else {
      wantedTimer += dt;
      if (wantedTimer > 14 && wanted > 0) {
        wanted -= 1;
        wantedTimer = 0;
        if (wanted < 3 && audio) audio.sirenOff();
      }
    }

    updateTraffic(traffic, dt);
    updatePedestrians(peds, dt, time);
    police.update(dt, time, heroPos(), wanted);
    heli.update(dt, time, wanted >= 3 ? heroPos() : null);
    effects.update(dt);
    marker.rotation.y += dt;
    marker.position.y = 2.2 + Math.sin(time * 2) * 0.3;
    for (const b of city.boats) {
      b.position.y = 0.1 + Math.sin(time * 0.8 + b.position.x) * 0.15;
      b.rotation.z = Math.sin(time * 0.6) * 0.02;
    }
    // The sun follows the hero.
    lighting.setTime(timeOfDay, new THREE.Vector3(heroPos().x, 0, heroPos().z));
    checkMission();
    updateCamera();
  }

  function hudState() {
    const hp = heroPos();
    return {
      mission: missions.current,
      missionDone: missions.completed,
      money: missions.money,
      timeStr: `${String(Math.floor(clock) % 24).padStart(2, '0')}:${String(Math.floor((clock % 1) * 60)).padStart(2, '0')}`,
      wanted,
      speedKmh: Math.round(Math.abs(speed) * 3.6),
      carName,
      condition,
      onFoot,
      health,
      armour,
      rank: missions.rank,
      progress: missions.progress,
      dispatch: police.dispatch(hp),
      dialogue,
      weapon: missions.weapon,
      radio: missions.radio,
      crew: missions.crew,
      toast: toastTime > 0 ? toast : '',
      map: {
        player: { x: hp.x, z: hp.z, heading },
        police: police.cars.map((c) => ({ x: c.group.position.x, z: c.group.position.z })),
        mission: missions.current.target,
        buildings: city.buildingSpots,
      },
    };
  }

  function render() {
    renderer.render(scene, camera);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  const game = {
    scene, camera, renderer,
    missions, police, heli, traffic, peds,
    heroCar, rook, city,
    fx: effects, sky, marker, markerBeam, glitter,
    get screen() { return screen; },
    set screen(v) { screen = v; },
    get onFoot() { return onFoot; },
    get wanted() { return wanted; },
    get time() { return time; },
    get clock() { return clock; },
    get camMode() { return camMode; },
    set camMode(v) { camMode = v; camReady = false; },
    assetView: null,
    setTimeOfDay, setHero, setMission, setWanted, enterCar, shoot,
    checkMission, saveSlot, loadSlot, listSaves, buyUpgrade,
    step, render, resize, hudState,
    set aiming(v) { aiming = v; },
    get aiming() { return aiming; },
    setDialogue(t, s) { say(t, s); },
    get currentCar() { return currentCar; },
  };
  return game;
}
