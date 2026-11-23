// render3d.js — the 3D scene and the game itself: renderer, sky, lights, city,
// traffic, pedestrians, police + helicopter, hero car and Rook, driving and
// on-foot movement, carjacking, shooting, wanted, missions, saves, cameras
// (chase / over-shoulder / title orbit / pier wide) and time of day.
import { WORLD, TOD, PLAYER, SAVE_KEY } from './config.js';
import { createLighting } from './render/lighting.js';
import { createSky } from './render/sky.js';
import { createEffects } from './render/effects.js';
import { createCity } from './city.js';
import { makeCar, createTraffic } from './vehicles.js';
import { makePerson, createPedestrians } from './people.js';
import { createPolice, createHelicopter } from './police.js';
import { createMissions } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function clampV(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function createGame(canvas, cfg) {
  const { rand: rng, detail: level, hud, audio, flat } = cfg;
  const rdr = new THREE.WebGLRenderer({ canvas, antialias: true });
  rdr.setSize(window.innerWidth, window.innerHeight);
  const scn = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
  const lighting = createLighting(scn, rdr);
  const sky = createSky(scn);
  const effects = createEffects(scn);
  const city = createCity(scn, rng, level, true);
  const traffic = createTraffic(scn, rng, level, 14);
  const peds = createPedestrians(scn, rng, level, 26);
  const police = createPolice(scn, rng, level);
  const heli = createHelicopter(scn, level);
  heli.group.position.set(-40, 34, 40);
  scn.add(heli.group);
  const jobs = createMissions();

  // Hero GT (orange, spoiler) + Rook (brown leather jacket).
  const heroCar = makeCar(0xe87a1a, { detail: level, spoiler: true, clearcoat: 0.45 }); // clearcoat lowered (Part 1.3): 0.8 mirrored the heli spotlight + sky and blew the roof/hood to white
  heroCar.group.position.set(150, 0, -20);
  scn.add(heroCar.group);
  const blob = lighting.blobShadow(1.15, 2.3, 0.22);
  heroCar.group.add(blob);
  const rook = makePerson(rng, { detail: level, jacket: true, shirt: 0x6b4423, hairStyle: 0, skin: 0xe8b88a, hair: 0x1a1a1a, pants: 0x2a3a5a });
  rook.group.position.set(148, 0, -18);
  rook.group.visible = false;
  scn.add(rook.group);

  // Sun glitter on the sea at sunset (additive strip aimed at the sun).
  const glitter = new THREE.Mesh(new THREE.PlaneGeometry(60, 260), new THREE.MeshBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  glitter.rotation.x = -Math.PI / 2;
  glitter.position.set(300, 0.12, 60);
  scn.add(glitter);

  // Mission marker: small floating golden diamond + a thin faint beam.
  // (Was a huge octahedron + a 30 m pillar that read as a floating artifact.)
  const marker = new THREE.Group();
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), new THREE.MeshStandardMaterial({ color: 0xffd94a, emissive: 0xffb020, emissiveIntensity: 1.4, roughness: 0.3 }));
  gem.position.y = 2.2;
  marker.add(gem);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 8, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd94a, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
  shaft.position.y = 4;
  marker.add(shaft);
  scn.add(marker);

  const st = {
    screen: SCREEN_TITLE,
    onFoot: false,
    heading: -Math.PI / 2,
    speed: 0,
    health: PLAYER.health,
    armour: PLAYER.armour,
    wanted: 0,
    wantedTimer: 0,
    clock: 17.5, // hours
    dialogue: '',
    dialogueTimer: 0,
    camMode: 'title',
    time: 0,
    condition: 100,
    carName: 'GT SUNLINE',
    shotMode: null,
    upgrades: new Set(),
    fireCooldown: 0,
    aiming: false,
    assetView: null, // {x,y,z,dist,height,az,fov} for the asset turntable shots
  };

  let todName = 'golden';
  function todNow() {
    return TOD[todName];
  }
  function applyTime() {
    const when = todNow();
    const sunDir = new THREE.Vector3(Math.cos(((when.hour - 12) / 12) * Math.PI + 0.6) * 0.96, 0.18, Math.sin(((when.hour - 12) / 12) * Math.PI + 0.6) * 0.96).normalize();
    lighting.setTime(when, heroAt());
    sky.applyTime(when, sunDir);
    glitter.material.opacity = (todName === 'sunset' || todName === 'golden') ? 0.5 : 0.08;
    glitter.material.color.setHex(todName === 'night' ? 0x8fa8ff : 0xffb36b);
    if (flat) {
      // WP1 before: flat light, no shadows, no sky gradient, no environment.
      rdr.toneMapping = THREE.NoToneMapping;
      rdr.shadowMap.enabled = false;
      sky.dome.visible = false;
      scn.background = new THREE.Color(0x9a9a9a);
      scn.environment = null;
      scn.fog = null;
    }
  }
  function setTimeOfDay(key) {
    todName = key;
    st.clock = TOD[key].hour;
    applyTime();
    if (!flat) sky.buildEnvironment(rdr);
  }

  function heroAt() {
    return st.onFoot ? rook.group.position : heroCar.group.position;
  }
  function heroDir() {
    return st.onFoot ? rook.group.rotation.y : st.heading;
  }

  function pushOut(pos, r) {
    for (const c of city.colliders) {
      const nx = clampV(pos.x, c.x0, c.x1);
      const nz = clampV(pos.z, c.z0, c.z1);
      const dx = pos.x - nx, dz = pos.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        const d = Math.sqrt(d2) || 0.01;
        pos.x = nx + (dx / d) * r;
        pos.z = nz + (dz / d) * r;
        return true;
      }
    }
    return false;
  }

  function say(text, secs) {
    st.dialogue = text;
    st.dialogueTimer = secs || 4;
  }

  function placeMarker() {
    const msn = jobs.current();
    marker.position.set(msn.target[0], 0, msn.target[1]);
  }

  function setMission(i) {
    jobs.setMission(i);
    placeMarker();
  }

  function setWanted(n) {
    st.wanted = clampV(n, 0, 5);
    while (police.cars.length < st.wanted && police.cars.length < 4) {
      const hero = heroAt();
      const a = rng() * Math.PI * 2;
      police.spawnCar(hero.x + Math.cos(a) * 40, hero.z + Math.sin(a) * 40);
    }
    if (st.wanted >= 3) audio.sirenOn();
    else audio.sirenOff();
  }

  function setHero(x, z, heading, inCar) {
    st.onFoot = !inCar;
    st.heading = heading;
    heroCar.group.position.set(x, 0, z);
    heroCar.group.rotation.y = heading;
    rook.group.position.set(x - 3, 0, z + 2);
    rook.group.rotation.y = heading;
    rook.group.visible = !inCar;
    heroCar.group.visible = true;
    st.speed = 0;
  }

  function enterCar() {
    if (st.onFoot) {
      // Nearest traffic car within 5 m becomes the hero car (carjacking).
      let bestCar = null, bestDist = 5;
      for (const car of traffic.cars) {
        const d = Math.hypot(car.group.position.x - rook.group.position.x, car.group.position.z - rook.group.position.z);
        if (d < bestDist) {
          bestDist = d;
          bestCar = car;
        }
      }
      if (bestCar) {
        heroCar.group.position.copy(bestCar.group.position);
        heroCar.group.rotation.y = bestCar.group.rotation.y;
        st.heading = bestCar.group.rotation.y;
        st.onFoot = false;
        rook.group.visible = false;
        st.carName = 'STOLEN SEDAN';
        st.condition = 72;
        setWanted(st.wanted + 1);
        say('Rook: "Borrowed. Don\'t tell Marla."');
        audio.blip(660, 0.15, 'square', 0.06);
        return;
      }
      // No car near: enter the GT.
      const d = Math.hypot(heroCar.group.position.x - rook.group.position.x, heroCar.group.position.z - rook.group.position.z);
      if (d < 6) {
        st.onFoot = false;
        rook.group.visible = false;
        st.carName = 'GT SUNLINE';
        st.condition = 100;
        say('Rook: "Let\'s roll."');
      }
      return;
    }
    // Exit the car.
    st.onFoot = true;
    rook.group.position.set(heroCar.group.position.x + 2.5, 0, heroCar.group.position.z + 1);
    rook.group.rotation.y = st.heading;
    rook.group.visible = true;
    st.speed = 0;
    audio.engineStop();
  }

  function shoot() {
    if (st.fireCooldown > 0) return;
    st.fireCooldown = 0.28;
    audio.shot();
    const weapon = jobs.weapon();
    if (weapon.ammo !== Infinity) weapon.ammo = Math.max(0, weapon.ammo - 1);
    const from = heroAt();
    const aim = new THREE.Vector3(Math.sin(heroDir()), 0, Math.cos(heroDir()));
    const fx = from.x + aim.x * 3, fz = from.z + aim.z * 3;
    effects.muzzleFlash(fx, 1.4, fz);
    // Hit the nearest police car in front within 28 m.
    for (const car of police.cars) {
      const dx = car.group.position.x - from.x, dz = car.group.position.z - from.z;
      const d = Math.hypot(dx, dz);
      if (d < 28 && (dx * aim.x + dz * aim.z) > 0) {
        effects.spawnSmoke(car.group.position.x, 1.5, car.group.position.z, 2.5, 1.4, 0x888888);
        effects.spawnFlame(car.group.position.x, 1.2, car.group.position.z, 1.4);
        st.condition = Math.max(40, st.condition - 2);
        setWanted(st.wanted + 1);
        say('Rook: "They started it."');
        break;
      }
    }
  }

  function checkMission() {
    const msn = jobs.current();
    const pos = heroAt();
    if (Math.hypot(pos.x - msn.target[0], pos.z - msn.target[1]) < 12) {
      const result = jobs.complete();
      audio.chime();
      say(`Marla: "Job done. $${result.reward.toLocaleString('en-US')} is yours."`);
      if (result.done) {
        say('Marla: "That\'s all eight, Rook. You run this city now."', 6);
      } else {
        placeMarker();
      }
      saveGame(1);
    }
  }

  function saveGame(slot) {
    try {
      const slots = JSON.parse(window.localStorage.getItem(SAVE_KEY) || '{}');
      slots[slot] = { money: jobs.money, mission: jobs.index, completed: jobs.completed, rank: jobs.rank(), time: st.clock, x: heroAt().x, z: heroAt().z };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(slots));
    } catch { /* storage off */ }
  }
  function loadGame(slot) {
    try {
      const slots = JSON.parse(window.localStorage.getItem(SAVE_KEY) || '{}');
      return slots[slot] || null;
    } catch { return null; }
  }
  function getSaveSlots() {
    const labels = ['SLOT 1 · ACT II — MARKET SQUEEZE', 'SLOT 2 · ACT I — GOLD PAINT', 'SLOT 3 · EMPTY'];
    return [1, 2, 3].map((s) => {
      const save = loadGame(s);
      if (!save) return { label: `SLOT ${s}`, act: labels[s - 1].split('·')[1] || '—', pct: 'EMPTY', missions: '—', money: '—' };
      return { label: `SLOT ${s}`, act: `ACT ${save.mission < 4 ? 'I' : 'II'}`, pct: `${Math.round((save.completed / 8) * 100)}% complete`, missions: `${save.completed}/8 missions`, money: `$${save.money.toLocaleString('en-US')}` };
    });
  }

  function buyUpgrade(item) {
    if (st.upgrades.has(item.key)) return false;
    if (jobs.money < item.price) {
      hud.toast('Not enough cash.');
      return false;
    }
    jobs.money -= item.price;
    st.upgrades.add(item.key);
    if (item.key === 'engine') PLAYER.maxSpeed = 54;
    if (item.key === 'armour') st.armour = 100;
    if (item.key === 'paint') heroCar.paint.color.setHex(0xd4af37);
    hud.toast(`${item.name} installed.`);
    audio.chime();
    return true;
  }

  // Camera rigs. FOV 62-70, 3/4 angles, rule of thirds: the hero is never
  // dead-centre and never blocks the street; no car is cut at the frame edge.
  // NOTE: never assign camera.rotation.z after lookAt() — for a south-facing
  // camera the Euler decomposition carries z≈π and zeroing it flips the
  // camera upside down (that broke the round-8 title shot). lookAt() alone
  // gives an upright camera; roll is added with rotateZ() only.
  // Right vector for a heading h (forward = (sin h, cos h)) is (-cos h, sin h).
  // Offsetting the CAMERA to the right puts the subject on the LEFT of frame.
  const lookTarget = new THREE.Vector3(150, 0, -20);
  let fovNow = 62;
  function setFov(f) {
    const val = Math.round(f);
    if (val !== fovNow) {
      fovNow = val;
      camera.fov = val;
      camera.updateProjectionMatrix();
    }
  }
  function updateCamera(dt) {
    const hero = heroAt();
    if (st.camMode === 'asset' && st.assetView) {
      // Turntable: one asset alone, close-up 3/4 view, snapped.
      const view = st.assetView;
      const az = view.az ?? Math.PI / 4;
      camera.position.set(view.x + Math.sin(az) * view.dist, view.height, view.z + Math.cos(az) * view.dist);
      camera.lookAt(view.x, view.y, view.z);
      setFov(view.fov || 50);
      return;
    }
    if (st.camMode === 'title') {
      const angle = st.time * 0.05;
      camera.position.set(Math.cos(angle) * 130, 55, Math.sin(angle) * 130);
      camera.lookAt(0, 6, 0);
      setFov(62);
      return;
    }
    if (st.camMode === 'titlecard') {
      // Cinematic title card: 3/4 rear view, hero car in the LEFT third.
      // Snapped (screenshot-only mode): the hero is stationary, no lag.
      const heading = st.heading;
      const fx = Math.sin(heading), fz = Math.cos(heading);
      const rx = -Math.cos(heading), rz = Math.sin(heading);
      camera.position.set(hero.x - fx * 8.5 + rx * 4.5, 3.0, hero.z - fz * 8.5 + rz * 4.5);
      camera.lookAt(hero.x + fx * 12, 1.2, hero.z + fz * 12);
      setFov(66);
      return;
    }
    if (st.camMode === 'chaseShot') {
      // 3/4 rear chase angle, closer + lower than the play camera, slight roll,
      // FOV kicks up with speed (62 -> 70). Snapped: the hero is fast and a
      // lerped camera would lag ~7 m behind it.
      const heading = st.heading;
      const fx = Math.sin(heading), fz = Math.cos(heading);
      const rx = -Math.cos(heading), rz = Math.sin(heading);
      camera.position.set(hero.x - fx * 8.5 + rx * 3.0, 3.6, hero.z - fz * 8.5 + rz * 3.0);
      lookTarget.set(hero.x + fx * 14, 1.6, hero.z + fz * 14);
      camera.lookAt(lookTarget);
      camera.rotateZ(0.055); // ~3.2 deg roll
      setFov(66 + Math.min(4, Math.abs(st.speed) * 0.12));
      return;
    }
    if (st.camMode === 'pier') {
      // STREET-LEVEL at the end of the pier, looking back at the skyline.
      camera.position.set(186, 3.0, 237);
      camera.lookAt(184, 5, 140);
      setFov(64);
      return;
    }
    if (st.onFoot) {
      // Over-the-shoulder: hero in the LEFT third, street ahead.
      const heading = rook.group.rotation.y;
      const fx = Math.sin(heading), fz = Math.cos(heading);
      const rx = -Math.cos(heading), rz = Math.sin(heading);
      const bx = rook.group.position.x - fx * 5.5 + rx * 2.5;
      const bz = rook.group.position.z - fz * 5.5 + rz * 2.5;
      camera.position.lerp(new THREE.Vector3(bx, 2.6, bz), 0.12);
      camera.lookAt(rook.group.position.x + fx * 12, 1.6, rook.group.position.z + fz * 12);
      setFov(64);
      return;
    }
    // Chase cam behind the car.
    const back = 11.5, up = 4.6;
    const tx = hero.x - Math.sin(st.heading) * back;
    const tz = hero.z - Math.cos(st.heading) * back;
    camera.position.lerp(new THREE.Vector3(tx, up, tz), 0.08);
    lookTarget.lerp(new THREE.Vector3(hero.x + Math.sin(st.heading) * 14, 1.6, hero.z + Math.cos(st.heading) * 14), 0.15);
    camera.lookAt(lookTarget);
    setFov(62);
  }

  function step(dt, input) {
    st.time += dt;
    if (st.screen !== SCREEN_PLAY) {
      // Title orbit backdrop keeps moving; world idles.
      traffic.update(dt * 0.4);
      peds.update(dt * 0.4, st.time);
      effects.update(dt);
      gem.rotation.y += dt * 1.5;
      gem.position.y = 2.2 + Math.sin(st.time * 2) * 0.3;
      for (const boat of city.boats) {
        boat.position.y = 0.1 + Math.sin(st.time * 0.8 + boat.position.x) * 0.15;
        boat.rotation.z = Math.sin(st.time * 0.6) * 0.02;
      }
      updateCamera(dt);
      return;
    }
    // Clock advances slowly.
    st.clock += dt * 0.004;
    if (st.dialogueTimer > 0) {
      st.dialogueTimer -= dt;
      if (st.dialogueTimer <= 0) st.dialogue = '';
    }
    if (st.fireCooldown > 0) st.fireCooldown -= dt;

    if (st.onFoot) {
      const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      let dx = 0, dz = 0;
      if (input.fwd) {
        dx += Math.sin(rook.group.rotation.y);
        dz += Math.cos(rook.group.rotation.y);
      }
      if (input.back) {
        dx -= Math.sin(rook.group.rotation.y);
        dz -= Math.cos(rook.group.rotation.y);
      }
      if (input.left) rook.group.rotation.y += 2.6 * dt;
      if (input.right) rook.group.rotation.y -= 2.6 * dt;
      const len = Math.hypot(dx, dz) || 1;
      rook.group.position.x += (dx / len) * speed * dt * (input.fwd || input.back ? 1 : 0);
      rook.group.position.z += (dz / len) * speed * dt * (input.fwd || input.back ? 1 : 0);
      rook.group.position.x = clampV(rook.group.position.x, -208, 208);
      rook.group.position.z = clampV(rook.group.position.z, -208, 232); // pier runs to z=240; match the car's z clamp so Rook can stand on it
      pushOut(rook.group.position, 0.7);
      const swing = Math.sin(st.time * 9) * 0.45 * ((input.fwd || input.back) ? 1 : 0);
      if (rook.parts && rook.parts.legs) {
        if (st.aiming) {
          // Aim pose holds: right arm forward with the pistol, left arm
          // across to support, feet in a stable stance.
          rook.parts.legs[0].rotation.x = 0.18;
          rook.parts.legs[1].rotation.x = -0.18;
          rook.parts.arms[0].rotation.x = -0.7;
          rook.parts.arms[0].rotation.z = 0.35;
          rook.parts.arms[1].rotation.x = -1.35;
        } else {
          rook.parts.legs[0].rotation.x = swing;
          rook.parts.legs[1].rotation.x = -swing;
          rook.parts.arms[0].rotation.x = -swing * 0.7;
          rook.parts.arms[1].rotation.x = swing * 0.7;
        }
      }
      st.speed = (input.fwd || input.back) ? speed : 0;
      if (input.shoot) shoot();
    } else {
      if (input.fwd) st.speed += PLAYER.accel * dt;
      if (input.back) st.speed -= PLAYER.brake * dt;
      st.speed -= st.speed * 0.55 * dt; // drag
      st.speed = clampV(st.speed, -10, PLAYER.maxSpeed);
      const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      st.heading += steer * PLAYER.turn * dt * clampV(Math.abs(st.speed) / 12, 0, 1) * (st.speed >= 0 ? 1 : -1);
      const nx = heroCar.group.position.x + Math.sin(st.heading) * st.speed * dt;
      const nz = heroCar.group.position.z + Math.cos(st.heading) * st.speed * dt;
      const prev = { x: heroCar.group.position.x, z: heroCar.group.position.z };
      heroCar.group.position.x = clampV(nx, -208, 232);
      heroCar.group.position.z = clampV(nz, -208, 232);
      if (pushOut(heroCar.group.position, 1.8)) st.speed *= 0.4;
      heroCar.group.rotation.y = st.heading;
      const wheels = heroCar.group.userData.wheels || [];
      for (const wheel of wheels) wheel.rotation.x += (st.speed * dt) / 0.42;
      // Body lean + tyre smoke when drifting hard.
      heroCar.group.rotation.z = -steer * 0.03 * clampV(Math.abs(st.speed) / 20, 0, 1);
      if (Math.abs(steer) > 0.5 && Math.abs(st.speed) > 22 && Math.random() < 0.5) {
        effects.spawnSmoke(heroCar.group.position.x - Math.sin(st.heading) * 2, 0.4, heroCar.group.position.z - Math.cos(st.heading) * 2, 1.6, 0.9, 0xd8d2c8);
      }
      audio.engineSet(Math.abs(st.speed) / PLAYER.maxSpeed);
      if (input.shoot) shoot();
      void prev;
    }
    if (input.enter) enterCar();

    // Wanted decay when no police are close.
    if (st.wanted > 0) {
      st.wantedTimer += dt;
      let close = false;
      for (const car of police.cars) {
        if (Math.hypot(car.group.position.x - heroAt().x, car.group.position.z - heroAt().z) < 30) close = true;
      }
      if (!close && st.wantedTimer > 14) {
        setWanted(st.wanted - 1);
        st.wantedTimer = 0;
      }
    }

    traffic.update(dt);
    peds.update(dt, st.time);
    police.update(dt, st.time, heroAt(), st.wanted);
    if (st.wanted >= 3) heli.update(dt, st.time, heroAt());
    else heli.group.position.lerp(new THREE.Vector3(-40, 34, 40), 0.01);
    effects.update(dt);
    gem.rotation.y += dt * 1.5;
    gem.position.y = 2.2 + Math.sin(st.time * 2) * 0.3;
    for (const boat of city.boats) {
      boat.position.y = 0.1 + Math.sin(st.time * 0.8 + boat.position.x) * 0.15;
      boat.rotation.z = Math.sin(st.time * 0.6) * 0.02;
    }
    lighting.setTime(todNow(), heroAt());
    checkMission();
    updateCamera(dt);
  }

  function hudState() {
    const hero = heroAt();
    const hh = Math.floor(st.clock), mm = Math.floor((st.clock - hh) * 60);
    return {
      mission: jobs.current(),
      missionDone: jobs.completed,
      money: jobs.money,
      timeStr: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      wanted: st.wanted,
      speedKmh: Math.abs(st.speed) * 3.6,
      carName: st.carName,
      condition: st.condition,
      onFoot: st.onFoot,
      health: st.health,
      armour: st.armour,
      rank: jobs.rank(),
      progress: jobs.progress(),
      dispatch: police.dispatch(hero),
      dialogue: st.dialogue,
      weapon: jobs.weapon(),
      radio: jobs.radio(),
      crew: jobs.crew(),
      map: { player: { x: hero.x, z: hero.z, heading: heroDir() }, police: police.cars.map((car) => ({ x: car.group.position.x, z: car.group.position.z })), mission: jobs.current().target, buildings: city.buildingSpots },
    };
  }

  function render() {
    rdr.render(scn, camera);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    rdr.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  setTimeOfDay('golden');
  placeMarker();
  setWanted(0);

  return {
    state: st,
    missions: jobs,
    police, heli, city, traffic, peds, effects,
    scene: scn, sky, heroCar, rook, marker, glitter,
    setTimeOfDay, setMission, setWanted, setHero, enterCar, shoot, say,
    saveGame, loadGame, getSaveSlots, buyUpgrade, hudState, render, step,
    setCamMode(m) { st.camMode = m; },
    setAssetView(v) { st.assetView = v; },
    setAim(on) { st.aiming = !!on; },
    setScreen(s) { st.screen = s; },
    applyTime,
  };
}
