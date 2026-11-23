// render3d.js — the 3D scene and the game itself: renderer, sky, lights, city,
// traffic, pedestrians, police + helicopter, hero car and Rook, driving and
// on-foot movement, carjacking, shooting, wanted, missions, saves, cameras
// (chase / over-shoulder / title orbit / pier wide) and time of day.
import { TOD, PLAYER, SAVE_KEY, WORLD } from './config.js';
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

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export function createGame(canvas, opts) {
  const { rand, detail, hud, audio, flat } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
  const lighting = createLighting(scene, renderer);
  const sky = createSky(scene);
  const effects = createEffects(scene);
  const city = createCity(scene, rand, detail, true);
  const traffic = createTraffic(scene, rand, detail, 14);
  const peds = createPedestrians(scene, rand, detail, 26);
  const police = createPolice(scene, rand, detail);
  const heli = createHelicopter(scene, detail);
  heli.group.position.set(-40, 34, 40);
  scene.add(heli.group);
  const missions = createMissions();

  // Hero GT (orange, spoiler) + Rook (brown leather jacket).
  const heroCar = makeCar(0xe87a1a, { detail, spoiler: true, clearcoat: 0.45 }); // clearcoat lowered (Part 1.3): 0.8 mirrored the heli spotlight + sky and blew the roof/hood to white
  heroCar.group.position.set(150, 0, -20);
  scene.add(heroCar.group);
  const heroBlob = lighting.blobShadow(1.15, 2.3, 0.22);
  heroCar.group.add(heroBlob);
  const rook = makePerson(rand, { detail, jacket: true, shirt: 0x6b4423, hairStyle: 0, skin: 0xe8b88a, hair: 0x1a1a1a, pants: 0x2a3a5a });
  rook.group.position.set(148, 0, -18);
  rook.group.visible = false;
  scene.add(rook.group);

  // Sun glitter on the sea at sunset (additive strip aimed at the sun).
  const glitter = new THREE.Mesh(new THREE.PlaneGeometry(60, 260), new THREE.MeshBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  glitter.rotation.x = -Math.PI / 2;
  glitter.position.set(300, 0.12, 60);
  scene.add(glitter);

  // Mission marker: small floating golden diamond + a thin faint beam.
  // (Was a huge octahedron + a 30 m pillar that read as a floating artifact.)
  const marker = new THREE.Group();
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), new THREE.MeshStandardMaterial({ color: 0xffd94a, emissive: 0xffb020, emissiveIntensity: 1.4, roughness: 0.3 }));
  diamond.position.y = 2.2;
  marker.add(diamond);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 8, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd94a, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
  pillar.position.y = 4;
  marker.add(pillar);
  scene.add(marker);

  const state = {
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

  let todKey = 'golden';
  function tod() { return TOD[todKey]; }
  function applyTime() {
    const t = tod();
    const sunDir = new THREE.Vector3(Math.cos(((t.hour - 12) / 12) * Math.PI + 0.6) * 0.96, 0.18, Math.sin(((t.hour - 12) / 12) * Math.PI + 0.6) * 0.96).normalize();
    lighting.setTime(t, heroPos());
    sky.applyTime(t, sunDir);
    glitter.material.opacity = (todKey === 'sunset' || todKey === 'golden') ? 0.5 : 0.08;
    glitter.material.color.setHex(todKey === 'night' ? 0x8fa8ff : 0xffb36b);
    if (flat) {
      // WP1 before: flat light, no shadows, no sky gradient, no environment.
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.shadowMap.enabled = false;
      sky.dome.visible = false;
      scene.background = new THREE.Color(0x9a9a9a);
      scene.environment = null;
      scene.fog = null;
    }
  }
  function setTimeOfDay(key) {
    todKey = key;
    state.clock = TOD[key].hour;
    applyTime();
    if (!flat) sky.buildEnvironment(renderer);
  }

  function heroPos() {
    return state.onFoot ? rook.group.position : heroCar.group.position;
  }
  function heroHeading() { return state.onFoot ? rook.group.rotation.y : state.heading; }

  function collideCircle(pos, r) {
    for (const c of city.colliders) {
      const nx = clamp(pos.x, c.x0, c.x1);
      const nz = clamp(pos.z, c.z0, c.z1);
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
    state.dialogue = text;
    state.dialogueTimer = secs || 4;
  }

  function placeMarker() {
    const m = missions.current();
    marker.position.set(m.target[0], 0, m.target[1]);
  }

  function setMission(i) {
    missions.setMission(i);
    placeMarker();
  }

  function setWanted(n) {
    state.wanted = clamp(n, 0, 5);
    while (police.cars.length < state.wanted && police.cars.length < 4) {
      const hp = heroPos();
      const a = rand() * Math.PI * 2;
      police.spawnCar(hp.x + Math.cos(a) * 40, hp.z + Math.sin(a) * 40);
    }
    if (state.wanted >= 3) audio.sirenOn(); else audio.sirenOff();
  }

  function setHero(x, z, heading, inCar) {
    state.onFoot = !inCar;
    state.heading = heading;
    heroCar.group.position.set(x, 0, z);
    heroCar.group.rotation.y = heading;
    rook.group.position.set(x - 3, 0, z + 2);
    rook.group.rotation.y = heading;
    rook.group.visible = !inCar;
    heroCar.group.visible = true;
    state.speed = 0;
  }

  function enterCar() {
    if (state.onFoot) {
      // Nearest traffic car within 5 m becomes the hero car (carjacking).
      let best = null, bestD = 5;
      for (const c of traffic.cars) {
        const d = Math.hypot(c.group.position.x - rook.group.position.x, c.group.position.z - rook.group.position.z);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (best) {
        heroCar.group.position.copy(best.group.position);
        heroCar.group.rotation.y = best.group.rotation.y;
        state.heading = best.group.rotation.y;
        state.onFoot = false;
        rook.group.visible = false;
        state.carName = 'STOLEN SEDAN';
        state.condition = 72;
        setWanted(state.wanted + 1);
        say('Rook: "Borrowed. Don\'t tell Marla."');
        audio.blip(660, 0.15, 'square', 0.06);
        return;
      }
      // No car near: enter the GT.
      const d = Math.hypot(heroCar.group.position.x - rook.group.position.x, heroCar.group.position.z - rook.group.position.z);
      if (d < 6) {
        state.onFoot = false;
        rook.group.visible = false;
        state.carName = 'GT SUNLINE';
        state.condition = 100;
        say('Rook: "Let\'s roll."');
      }
      return;
    }
    // Exit the car.
    state.onFoot = true;
    rook.group.position.set(heroCar.group.position.x + 2.5, 0, heroCar.group.position.z + 1);
    rook.group.rotation.y = state.heading;
    rook.group.visible = true;
    state.speed = 0;
    audio.engineStop();
  }

  function shoot() {
    if (state.fireCooldown > 0) return;
    state.fireCooldown = 0.28;
    audio.shot();
    const w = missions.weapon();
    if (w.ammo !== Infinity) w.ammo = Math.max(0, w.ammo - 1);
    const origin = heroPos();
    const dir = new THREE.Vector3(Math.sin(heroHeading()), 0, Math.cos(heroHeading()));
    const mx = origin.x + dir.x * 3, mz = origin.z + dir.z * 3;
    effects.muzzleFlash(mx, 1.4, mz);
    // Hit the nearest police car in front within 28 m.
    for (const c of police.cars) {
      const dx = c.group.position.x - origin.x, dz = c.group.position.z - origin.z;
      const d = Math.hypot(dx, dz);
      if (d < 28 && (dx * dir.x + dz * dir.z) > 0) {
        effects.spawnSmoke(c.group.position.x, 1.5, c.group.position.z, 2.5, 1.4, 0x888888);
        effects.spawnFlame(c.group.position.x, 1.2, c.group.position.z, 1.4);
        state.condition = Math.max(40, state.condition - 2);
        setWanted(state.wanted + 1);
        say('Rook: "They started it."');
        break;
      }
    }
  }

  function checkMission() {
    const m = missions.current();
    const p = heroPos();
    if (Math.hypot(p.x - m.target[0], p.z - m.target[1]) < 12) {
      const r = missions.complete();
      audio.chime();
      say(`Marla: "Job done. $${r.reward.toLocaleString('en-US')} is yours."`);
      if (r.done) {
        say('Marla: "That\'s all eight, Rook. You run this city now."', 6);
      } else {
        placeMarker();
      }
      saveGame(1);
    }
  }

  function saveGame(slot) {
    try {
      const saves = JSON.parse(window.localStorage.getItem(SAVE_KEY) || '{}');
      saves[slot] = { money: missions.money, mission: missions.index, completed: missions.completed, rank: missions.rank(), time: state.clock, x: heroPos().x, z: heroPos().z };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    } catch { /* storage off */ }
  }
  function loadGame(slot) {
    try {
      const saves = JSON.parse(window.localStorage.getItem(SAVE_KEY) || '{}');
      return saves[slot] || null;
    } catch { return null; }
  }
  function getSaveSlots() {
    const names = ['SLOT 1 · ACT II — MARKET SQUEEZE', 'SLOT 2 · ACT I — GOLD PAINT', 'SLOT 3 · EMPTY'];
    return [1, 2, 3].map((s) => {
      const d = loadGame(s);
      if (!d) return { label: `SLOT ${s}`, act: names[s - 1].split('·')[1] || '—', pct: 'EMPTY', missions: '—', money: '—' };
      return { label: `SLOT ${s}`, act: `ACT ${d.mission < 4 ? 'I' : 'II'}`, pct: `${Math.round((d.completed / 8) * 100)}% complete`, missions: `${d.completed}/8 missions`, money: `$${d.money.toLocaleString('en-US')}` };
    });
  }

  function buyUpgrade(item) {
    if (state.upgrades.has(item.key)) return false;
    if (missions.money < item.price) { hud.toast('Not enough cash.'); return false; }
    missions.money -= item.price;
    state.upgrades.add(item.key);
    if (item.key === 'engine') PLAYER.maxSpeed = 54;
    if (item.key === 'armour') state.armour = 100;
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
  const camTarget = new THREE.Vector3(150, 0, -20);
  let curFov = 62;
  function setFov(f) {
    const v = Math.round(f);
    if (v !== curFov) { curFov = v; camera.fov = v; camera.updateProjectionMatrix(); }
  }
  function updateCamera(dt) {
    const hp = heroPos();
    if (state.camMode === 'asset' && state.assetView) {
      // Turntable: one asset alone, close-up 3/4 view, snapped.
      const v = state.assetView;
      const az = v.az ?? Math.PI / 4;
      camera.position.set(v.x + Math.sin(az) * v.dist, v.height, v.z + Math.cos(az) * v.dist);
      camera.lookAt(v.x, v.y, v.z);
      setFov(v.fov || 50);
      return;
    }
    if (state.camMode === 'title') {
      const a = state.time * 0.05;
      camera.position.set(Math.cos(a) * 130, 55, Math.sin(a) * 130);
      camera.lookAt(0, 6, 0);
      setFov(62);
      return;
    }
    if (state.camMode === 'titlecard') {
      // Cinematic title card: 3/4 rear view, hero car in the LEFT third.
      // Snapped (screenshot-only mode): the hero is stationary, no lag.
      const h = state.heading;
      const fx = Math.sin(h), fz = Math.cos(h);
      const rx = -Math.cos(h), rz = Math.sin(h);
      camera.position.set(hp.x - fx * 8.5 + rx * 4.5, 3.0, hp.z - fz * 8.5 + rz * 4.5);
      camera.lookAt(hp.x + fx * 12, 1.2, hp.z + fz * 12);
      setFov(66);
      return;
    }
    if (state.camMode === 'chaseShot') {
      // 3/4 rear chase angle, closer + lower than the play camera, slight roll,
      // FOV kicks up with speed (62 -> 70). Snapped: the hero is fast and a
      // lerped camera would lag ~7 m behind it.
      const h = state.heading;
      const fx = Math.sin(h), fz = Math.cos(h);
      const rx = -Math.cos(h), rz = Math.sin(h);
      camera.position.set(hp.x - fx * 8.5 + rx * 3.0, 3.6, hp.z - fz * 8.5 + rz * 3.0);
      camTarget.set(hp.x + fx * 14, 1.6, hp.z + fz * 14);
      camera.lookAt(camTarget);
      camera.rotateZ(0.055); // ~3.2 deg roll
      setFov(66 + Math.min(4, Math.abs(state.speed) * 0.12));
      return;
    }
    if (state.camMode === 'pier') {
      // STREET-LEVEL at the end of the pier, looking back at the skyline.
      camera.position.set(186, 3.0, 237);
      camera.lookAt(184, 5, 140);
      setFov(64);
      return;
    }
    if (state.onFoot) {
      // Over-the-shoulder: hero in the LEFT third, street ahead.
      const h = rook.group.rotation.y;
      const fx = Math.sin(h), fz = Math.cos(h);
      const rx = -Math.cos(h), rz = Math.sin(h);
      const bx = rook.group.position.x - fx * 5.5 + rx * 2.5;
      const bz = rook.group.position.z - fz * 5.5 + rz * 2.5;
      camera.position.lerp(new THREE.Vector3(bx, 2.6, bz), 0.12);
      camera.lookAt(rook.group.position.x + fx * 12, 1.6, rook.group.position.z + fz * 12);
      setFov(64);
      return;
    }
    // Chase cam behind the car.
    const back = 11.5, up = 4.6;
    const tx = hp.x - Math.sin(state.heading) * back;
    const tz = hp.z - Math.cos(state.heading) * back;
    camera.position.lerp(new THREE.Vector3(tx, up, tz), 0.08);
    camTarget.lerp(new THREE.Vector3(hp.x + Math.sin(state.heading) * 14, 1.6, hp.z + Math.cos(state.heading) * 14), 0.15);
    camera.lookAt(camTarget);
    setFov(62);
  }

  function step(dt, input) {
    state.time += dt;
    if (state.screen !== SCREEN_PLAY) {
      // Title orbit backdrop keeps moving; world idles.
      traffic.update(dt * 0.4);
      peds.update(dt * 0.4, state.time);
      effects.update(dt);
      diamond.rotation.y += dt * 1.5;
      diamond.position.y = 2.2 + Math.sin(state.time * 2) * 0.3;
      for (const b of city.boats) { b.position.y = 0.1 + Math.sin(state.time * 0.8 + b.position.x) * 0.15; b.rotation.z = Math.sin(state.time * 0.6) * 0.02; }
      updateCamera(dt);
      return;
    }
    // Clock advances slowly.
    state.clock += dt * 0.004;
    if (state.dialogueTimer > 0) { state.dialogueTimer -= dt; if (state.dialogueTimer <= 0) state.dialogue = ''; }
    if (state.fireCooldown > 0) state.fireCooldown -= dt;

    if (state.onFoot) {
      const sp = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      let mx = 0, mz = 0;
      if (input.fwd) { mx += Math.sin(rook.group.rotation.y); mz += Math.cos(rook.group.rotation.y); }
      if (input.back) { mx -= Math.sin(rook.group.rotation.y); mz -= Math.cos(rook.group.rotation.y); }
      if (input.left) rook.group.rotation.y += 2.6 * dt;
      if (input.right) rook.group.rotation.y -= 2.6 * dt;
      const len = Math.hypot(mx, mz) || 1;
      rook.group.position.x += (mx / len) * sp * dt * (input.fwd || input.back ? 1 : 0);
      rook.group.position.z += (mz / len) * sp * dt * (input.fwd || input.back ? 1 : 0);
      rook.group.position.x = clamp(rook.group.position.x, -208, 208);
      rook.group.position.z = clamp(rook.group.position.z, -208, 232); // pier runs to z=240; match the car's z clamp so Rook can stand on it
      collideCircle(rook.group.position, 0.7);
      const sw = Math.sin(state.time * 9) * 0.45 * ((input.fwd || input.back) ? 1 : 0);
      if (rook.parts && rook.parts.legs) {
        if (state.aiming) {
          // Aim pose holds: right arm forward with the pistol, left arm
          // across to support, feet in a stable stance.
          rook.parts.legs[0].rotation.x = 0.18;
          rook.parts.legs[1].rotation.x = -0.18;
          rook.parts.arms[0].rotation.x = -0.7;
          rook.parts.arms[0].rotation.z = 0.35;
          rook.parts.arms[1].rotation.x = -1.35;
        } else {
          rook.parts.legs[0].rotation.x = sw;
          rook.parts.legs[1].rotation.x = -sw;
          rook.parts.arms[0].rotation.x = -sw * 0.7;
          rook.parts.arms[1].rotation.x = sw * 0.7;
        }
      }
      state.speed = (input.fwd || input.back) ? sp : 0;
      if (input.shoot) shoot();
    } else {
      if (input.fwd) state.speed += PLAYER.accel * dt;
      if (input.back) state.speed -= PLAYER.brake * dt;
      state.speed -= state.speed * 0.55 * dt; // drag
      state.speed = clamp(state.speed, -10, PLAYER.maxSpeed);
      const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      state.heading += steer * PLAYER.turn * dt * clamp(Math.abs(state.speed) / 12, 0, 1) * (state.speed >= 0 ? 1 : -1);
      const nx = heroCar.group.position.x + Math.sin(state.heading) * state.speed * dt;
      const nz = heroCar.group.position.z + Math.cos(state.heading) * state.speed * dt;
      const before = { x: heroCar.group.position.x, z: heroCar.group.position.z };
      heroCar.group.position.x = clamp(nx, -208, 232);
      heroCar.group.position.z = clamp(nz, -208, 232);
      if (collideCircle(heroCar.group.position, 1.8)) state.speed *= 0.4;
      heroCar.group.rotation.y = state.heading;
      const wheels = heroCar.group.userData.wheels || [];
      for (const w of wheels) w.rotation.x += (state.speed * dt) / 0.42;
      // Body lean + tyre smoke when drifting hard.
      heroCar.group.rotation.z = -steer * 0.03 * clamp(Math.abs(state.speed) / 20, 0, 1);
      if (Math.abs(steer) > 0.5 && Math.abs(state.speed) > 22 && Math.random() < 0.5) {
        effects.spawnSmoke(heroCar.group.position.x - Math.sin(state.heading) * 2, 0.4, heroCar.group.position.z - Math.cos(state.heading) * 2, 1.6, 0.9, 0xd8d2c8);
      }
      audio.engineSet(Math.abs(state.speed) / PLAYER.maxSpeed);
      if (input.shoot) shoot();
      void before;
    }
    if (input.enter) enterCar();

    // Wanted decay when no police are close.
    if (state.wanted > 0) {
      state.wantedTimer += dt;
      let near = false;
      for (const c of police.cars) if (Math.hypot(c.group.position.x - heroPos().x, c.group.position.z - heroPos().z) < 30) near = true;
      if (!near && state.wantedTimer > 14) { setWanted(state.wanted - 1); state.wantedTimer = 0; }
    }

    traffic.update(dt);
    peds.update(dt, state.time);
    police.update(dt, state.time, heroPos(), state.wanted);
    if (state.wanted >= 3) heli.update(dt, state.time, heroPos());
    else heli.group.position.lerp(new THREE.Vector3(-40, 34, 40), 0.01);
    effects.update(dt);
    diamond.rotation.y += dt * 1.5;
    diamond.position.y = 2.2 + Math.sin(state.time * 2) * 0.3;
    for (const b of city.boats) { b.position.y = 0.1 + Math.sin(state.time * 0.8 + b.position.x) * 0.15; b.rotation.z = Math.sin(state.time * 0.6) * 0.02; }
    lighting.setTime(tod(), heroPos());
    checkMission();
    updateCamera(dt);
  }

  function hudState() {
    const hp = heroPos();
    const h = Math.floor(state.clock), m = Math.floor((state.clock - h) * 60);
    return {
      mission: missions.current(),
      missionDone: missions.completed,
      money: missions.money,
      timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      wanted: state.wanted,
      speedKmh: Math.abs(state.speed) * 3.6,
      carName: state.carName,
      condition: state.condition,
      onFoot: state.onFoot,
      health: state.health,
      armour: state.armour,
      rank: missions.rank(),
      progress: missions.progress(),
      dispatch: police.dispatch(hp),
      dialogue: state.dialogue,
      weapon: missions.weapon(),
      radio: missions.radio(),
      crew: missions.crew(),
      map: { player: { x: hp.x, z: hp.z, heading: heroHeading() }, police: police.cars.map((c) => ({ x: c.group.position.x, z: c.group.position.z })), mission: missions.current().target, buildings: city.buildingSpots },
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
  window.addEventListener('resize', resize);

  setTimeOfDay('golden');
  placeMarker();
  setWanted(0);

  return {
    state, missions, police, heli, city, traffic, peds, effects,
    scene, sky, heroCar, rook, marker, glitter,
    setTimeOfDay, setMission, setWanted, setHero, enterCar, shoot, say,
    saveGame, loadGame, getSaveSlots, buyUpgrade, hudState, render, step,
    setCamMode(m) { state.camMode = m; },
    setAssetView(v) { state.assetView = v; },
    setAim(on) { state.aiming = !!on; },
    setScreen(s) { state.screen = s; },
    applyTime,
  };
}
