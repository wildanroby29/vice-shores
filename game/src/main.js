// Vice Shores bootstrap: renderer, loop, input, driving, missions, saves, shot driver.
const THREE = window.THREE;
import { DISTRICTS, districtAt } from './districts.js';
import { setupLighting, setNight } from './render/lighting.js';
import { makeSky, setSkyNight } from './render/sky.js';
import { buildCity, mulberry32 } from './city.js';
import { makeCar, makeBike, spawnTraffic, updateTraffic, damageCar } from './vehicles.js';
import { Police, RADIO } from './police.js';
import { MISSIONS, MissionLog } from './missions.js';
import { makePerson, spawnPeople, updatePeople, getPeople } from './people.js';
import { Combat, WEAPONS } from './combat.js';
import { HUD } from './hud.js';
import { Progress } from './progress.js';
import { listSaves, saveSlot } from './save.js';
import { AudioSys } from './audio.js';
import { Effects } from './render/effects.js';
import { Weather } from './render/weather.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot') || '';
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1430);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 8, 24);

const lights = setupLighting(scene, renderer);
const sky = makeSky(scene);
const city = buildCity(scene, SHOT === 'chase' ? 0.75 : 1);
const effects = new Effects(scene);
const weather = new Weather(scene);
const rng = mulberry32(7);
spawnTraffic(scene, 14, rng);
const marketClusters = [[100, -40], [120, -52], [140, -26], [110, -60], [130, -38], [96, -28]];
spawnPeople(scene, 28, marketClusters);
const police = new Police(scene, effects);
const missions = new MissionLog();
const combat = new Combat(scene, effects);
const hud = new HUD();
const progress = new Progress();
const audio = new AudioSys();

function makeRook() {
  const g = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: 0x2a5ad8, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 0.7 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.74, 8), shirt);
  torso.position.y = 1.06; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skin);
  head.position.y = 1.63; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }));
  hair.position.y = 1.73; hair.scale.set(1, 0.6, 1); g.add(hair);
  const arms = [], legs = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.62, 6), shirt);
    arm.position.set(sx * 0.34, 1.06, 0); g.add(arm); arms.push(arm);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.66, 6), pants);
    leg.position.set(sx * 0.13, 0.36, 0); g.add(leg); legs.push(leg);
  }
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.42), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.35 }));
  gun.position.set(0.34, 0.78, 0.3); g.add(gun);
  g.userData.parts = { arms, legs };
  g.userData.phase = 0;
  return g;
}
const rook = makeRook();
rook.position.set(-30, 0, -60);
scene.add(rook);
const heroCar = makeCar('gt');
heroCar.position.set(-24, 0, -60);
heroCar.rotation.y = Math.PI / 2;
scene.add(heroCar);
const bike = makeBike();
bike.position.set(40, 0, -100);
scene.add(bike);
let garageCar = null;

const G = {
  scene, camera, renderer, player: { pos: rook.position, yaw: 0, mesh: rook },
  heroCar, police, missions, combat, hud, weather, effects,
  money: 0, clockMin: 17 * 60 + 30, speed: 0, carsStolen: 0, distKm: 0, coll: 0,
  mode: 'title', night: false, inCar: false, car: null, radioIdx: 0,
  setMode(m) {
    this.mode = m;
    document.getElementById('title').style.display = m === 'title' ? 'flex' : 'none';
    document.getElementById('hud').style.display = m === 'title' ? 'none' : 'block';
    document.getElementById('help').style.display = m === 'title' ? 'none' : 'block';
  },
  setTimeOfDay(t) {
    this.night = t === 'night';
    setNight(lights, this.night);
    setSkyNight(sky, this.night);
    city.litIM.visible = this.night;
  },
  hudVisible(v) { document.getElementById('hud').style.display = v ? 'block' : 'none'; document.getElementById('help').style.display = v ? 'block' : 'none'; },
  enterCar(car) {
    this.inCar = true; this.car = car;
    rook.visible = false;
    this.carsStolen += 1;
    audio.blip();
  },
  exitCar() {
    if (!this.car) return;
    this.inCar = false;
    rook.visible = true;
    rook.position.set(this.car.position.x + 2.5, 0, this.car.position.z + 1.5);
    this.player.pos = rook.position;
    this.car = null;
    audio.blip();
  },
  placeMarketScene() {
    const erng = mulberry32(99);
    const mk = (x, z, down) => {
      const e = makePerson(erng);
      e.position.set(x, 0, z);
      e.rotation.y = Math.PI;
      if (down) { e.rotation.x = -Math.PI / 2; e.position.y = 0.25; e.userData.down = true; }
      scene.add(e);
      return e;
    };
    this.enemies = [mk(112, -18, false), mk(128, -20, false)];
    this.fallen = [mk(114, -12, true), mk(126, -10, true)];
    for (const [x, z] of [[112, -24], [128, -24], [104, -30], [134, -28], [112, -48], [128, -50], [100, -20], [138, -22]]) mk(x, z, false);
    for (const e of this.enemies) {
      e.userData.parts.torso.material.color.setHex(0x8a1a1a);
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.35 }));
      gun.position.set(0.34, 0.78, 0.3); e.add(gun);
    }
  },
  openProgress() {
    const saves = listSaves();
    if (!saves[0] && !saves[1] && !saves[2]) {
      try {
        localStorage.setItem('vice-shores-saves-v1', JSON.stringify([
          { job: 4, money: 18450, date: '24 Nov, 17:10' },
          { job: 2, money: 6100, date: '24 Nov, 16:40' },
          { job: 1, money: 2450, date: '24 Nov, 16:20' },
        ]));
      } catch { /* ignore */ }
    }
    const r = missions.rank();
    const pct = {};
    for (const d of DISTRICTS) pct[d.id] = d.id === 'north' || d.id === 'coral' || d.id === 'plaza' ? 100 : d.id === 'bank' ? 25 : 0;
    progress.show({
      rank: { name: r.name, cur: missions.xp, need: r.need },
      money: G.money, wanted: police.wanted, done: missions.done,
      ratings: missions.ratings, cars: G.carsStolen, dist: G.distKm,
      shots: combat.shots, coll: G.coll, footprints: city.footprints,
      districtPct: pct, player: { x: G.player.pos.x, z: G.player.pos.z },
    }, listSaves());
  },
};
const keys = {};
let mouseDown = false, dragX = 0, camYaw = 0;
addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  audio.ensure();
  if (e.key === 'Enter' && G.mode === 'title') {
    G.setMode('play');
    hud.subtitle('DEACON', 'The GT is parked on Coral Row. Take it. Do not scratch it.', 5);
  }
  if (e.key.toLowerCase() === 'e') {
    if (G.inCar) G.exitCar();
    else {
      let best = null, bd = 5;
      for (const c of [heroCar, bike]) {
        const d = c.position.distanceTo(rook.position);
        if (d < bd) { bd = d; best = c; }
      }
      if (best) G.enterCar(best);
    }
  }
  if (e.key >= '1' && e.key <= '4') combat.switch(Number(e.key) - 1);
  if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
    if (progress.open) progress.hide();
    else G.openProgress();
  }
  if (e.key.toLowerCase() === 'm') audio.toggleMute();
  if (e.key.toLowerCase() === 'q') { police.setWanted(0); hud.subtitle('CREW', 'Plates swapped. The heat is off — for now.', 3); }
  if (e.key.toLowerCase() === 'f' && G.car) { G.car.userData.damage = 0; hud.subtitle('CREW', 'Quick fix — the GT is good as new.', 3); }
  if (e.key.toLowerCase() === 'c') { hud.subtitle('CREW', 'Eyes out — two cruisers on Ocean Drive, one heli inbound.', 4); }
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('mousedown', e => { if (e.button === 0) { mouseDown = true; dragX = e.clientX; } });
addEventListener('mouseup', () => { mouseDown = false; });
addEventListener('mousemove', e => { if (mouseDown) { camYaw += (e.clientX - dragX) * 0.004; dragX = e.clientX; } });
addEventListener('click', () => {
  if (G.mode !== 'play' || progress.open || !G.inCar && false) return;
  audio.ensure();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const from = camera.position.clone();
  const targets = [...getPeople(), ...police.cars];
  const res = combat.shoot(from, dir, targets);
  if (res) { audio.shot(); police.addHeat(6); if (res.hit) police.addHeat(8); }
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
document.getElementById('progSide').addEventListener('click', e => {
  const slot = e.target.closest('.slot');
  if (!slot) return;
  const i = Number(slot.textContent.match(/SLOT (\d)/)?.[1] || 1) - 1;
  saveSlot(i, { done: missions.done, money: G.money, xp: missions.xp, wanted: police.wanted, cars: G.carsStolen, dist: G.distKm, shots: combat.shots, coll: G.coll });
  G.openProgress();
  audio.blip();
});

const TARGETS = [[-24, -60], [0, 20], [120, -40], [-100, 150], [-100, -20], [100, 215], [20, -40], [100, 215]];
let missionMarker = null;
function setMarker() {
  if (missionMarker) scene.remove(missionMarker);
  const t = TARGETS[missions.index];
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(t[0], 15, t[1]);
  scene.add(beam);
  missionMarker = beam;
}
setMarker();
let frame = 0, clock = new THREE.Clock(), flashTimer = 0, saveT = 0;
const clockEl = { h: 0 };
function fmtTime(min) { const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
const RADIOS = ['SHORE FM', 'VICE 95', 'NEON 101'];
function inFootprint(x, z) {
  for (const f of city.footprints) {
    if (Math.abs(x - f.x) < f.w / 2 + 1 && Math.abs(z - f.z) < f.d / 2 + 1) return true;
  }
  return false;
}
function refreshHUD(dt) {
  const m = missions.current();
  hud.setMission(missions.stageText(), m.obj, m.next);
  const r = missions.rank();
  hud.setRank(r.name, missions.xp, r.need);
  hud.setStars(police.wanted);
  hud.setMoney(G.money, fmtTime(G.clockMin), RADIOS[G.radioIdx % 3]);
  const units = police.activeUnits().map(u => ({ call: u.call + ' · ' + (u.role === 'MARKSMAN' ? '10m' : u.role === 'SHORE WATCH' ? '10m' : u.role === 'PURSUIT' ? '16m' : u.role === 'SPOTLIGHT' ? '16m' : u.role === 'FLANKING' ? '5m' : '5m'), role: u.role }));
  hud.setDispatch(units, police.radioLine());
  hud.setWeapons(WEAPONS, combat.ammo, combat.slot);
  hud.setAbilities();
  const label = G.inCar && G.car ? `${G.car.userData.type.name} · CONDITION ${Math.round((1 - G.car.userData.damage) * 100)}%` : 'ON FOOT';
  hud.setSpeed(Math.abs(G.speed) * 3.6, label);
  hud.drawMinimap(city.footprints, rook.position, police.cars, TARGETS[missions.index]);
  hud.tick(dt);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  frame++;
  if (SHOT === 'title') {
    camera.position.set(120 + Math.sin(t * 0.05) * 12, 110, 230);
    camera.lookAt(0, 10, -10);
  } else if (SHOT === 'chase') {
    G.speed = 34;
    camera.position.set(4, 6.5, 119);
    camera.lookAt(0, 2, 152);
    if (police.heli) {
      police.heli.position.set(10, 16, 158);
      police.heli.rotation.y = Math.PI / 2;
      if (police.beam) {
        const from = police.heli.position.clone(); from.y -= 1;
        const to = new THREE.Vector3(0, 0.1, 132);
        police.beam.cone.position.copy(from).lerp(to, 0.5);
        police.beam.ell.position.set(to.x, 0.12, to.z);
      }
    }
  } else if (SHOT === 'night') {
    camera.position.set(120, 2.5, 4);
    camera.lookAt(120, 1.5, -20);
    hud.prompt(`<span class="k">E</span> duck behind the stall`);
    if (G.enemies) {
      flashTimer -= dt;
      if (flashTimer <= 0) {
        flashTimer = 0.16;
        const from = rook.position.clone(); from.y = 1.3;
        const to = G.enemies[0].position.clone(); to.y = 1.2;
        const dir = new THREE.Vector3().subVectors(to, from).setY(0).normalize();
        effects.flash(from.clone().addScaledVector(dir, 0.9));
        effects.tracer(from, to);
      }
    }
  } else if (!SHOT && G.mode === 'title') {
    camera.position.set(150 + Math.sin(t * 0.05) * 20, 150, 285);
    camera.lookAt(-20, 8, -30);
  } else if (!SHOT && !progress.open) {
    const sp = G.inCar ? 1 : 0;
    let mx = 0, mz = 0;
    if (keys['w'] || keys['arrowup']) mz += 1;
    if (keys['s'] || keys['arrowdown']) mz -= 1;
    if (keys['a'] || keys['arrowleft']) mx -= 1;
    if (keys['d'] || keys['arrowright']) mx += 1;
    if (G.inCar && G.car) {
      const car = G.car;
      const accel = mz * 26 * dt;
      G.speed = Math.max(-14, Math.min(38, G.speed + accel - Math.sign(G.speed) * 4 * dt));
      if (mz === 0) G.speed *= (1 - dt * 0.8);
      car.rotation.y -= mx * dt * 1.6 * Math.sign(G.speed || 1);
      const nx = car.position.x + Math.sin(car.rotation.y) * G.speed * dt;
      const nz = car.position.z + Math.cos(car.rotation.y) * G.speed * dt;
      if (!inFootprint(nx, nz) && Math.abs(nx) < 168 && Math.abs(nz) < 168) { car.position.x = nx; car.position.z = nz; }
      else G.speed *= 0.4;
      G.distKm += Math.abs(G.speed) * dt / 1000 * 3.6;
      rook.position.copy(car.position);
      const camDist = 11, camH = 4.6;
      const bx = car.position.x - Math.sin(car.rotation.y + camYaw) * camDist;
      const bz = car.position.z - Math.cos(car.rotation.y + camYaw) * camDist;
      camera.position.set(bx, camH, bz);
      camera.lookAt(car.position.x + Math.sin(car.rotation.y) * 8, 1.6, car.position.z + Math.cos(car.rotation.y) * 8);
      if (Math.abs(G.speed) > 24) police.addHeat(dt * 2);
      if (G.speed > 30) { police.addHeat(dt * 1.2); }
      audio.setEngine(Math.abs(G.speed), true);
    } else {
      const mv = 5.2 * dt;
      const yaw = G.player.yaw;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      let nx = rook.position.x + (fx * mz - fz * mx) * mv;
      let nz = rook.position.z + (fz * mz + fx * mx) * mv;
      if (!inFootprint(nx, nz)) { rook.position.x = nx; rook.position.z = nz; }
      if (mx || mz) {
        G.player.yaw = Math.atan2(fx * mz - fz * mx, fz * mz + fx * mx);
        rook.rotation.y = G.player.yaw;
        rook.userData.phase += dt * 9;
        const sw = Math.sin(rook.userData.phase) * 0.5;
        rook.userData.parts.arms[0].rotation.x = sw; rook.userData.parts.arms[1].rotation.x = -sw;
        rook.userData.parts.legs[0].rotation.x = -sw; rook.userData.parts.legs[1].rotation.x = sw;
      }
      camera.position.set(rook.position.x - Math.sin(camYaw) * 9, 4.2, rook.position.z - Math.cos(camYaw) * 9);
      camera.lookAt(rook.position.x, 1.6, rook.position.z);
      audio.setEngine(0, false);
    }
    const tgt = TARGETS[missions.index];
    const pd = Math.hypot(rook.position.x - tgt[0], rook.position.z - tgt[1]);
    if (pd < 7) {
      const m = missions.complete('S');
      G.money = missions.money;
      hud.subtitle('DEACON', m.next ? 'Next: ' + m.next : 'You own this city now.', 5);
      setMarker();
      audio.blip();
    }
    let prompt = '';
    if (!G.inCar) {
      for (const c of [heroCar, bike]) if (c.position.distanceTo(rook.position) < 5) prompt = `<span class="k">E</span> steal the ${c.userData.type.name}`;
      if (Math.abs(rook.position.x - -100) < 14 && Math.abs(rook.position.z - -120) < 14) prompt = `<span class="k">E</span> garage — repaint the GT`;
    }
    if (SHOT === 'night') prompt = `<span class="k">E</span> duck behind the stall`;
    hud.prompt(prompt);
    if (SHOT === 'night' && G.enemies) {
      flashTimer -= dt;
      if (flashTimer <= 0) {
        flashTimer = 0.16;
        const from = rook.position.clone(); from.y = 1.3;
        const to = G.enemies[0].position.clone(); to.y = 1.2;
        effects.flash(from.clone().add(new THREE.Vector3(0.4, 0, 0.6)));
        effects.tracer(from, to);
      }
    }
  }
  updateTraffic(dt, t);
  updatePeople(dt, rook.position, police.wanted > 0 || combat.shots > 0);
  police.update(dt, rook.position, G.player.yaw, t, !!SHOT);
  combat.update(dt);
  weather.update(dt);
  effects.update(dt);
  audio.setSiren(police.wanted >= 2, t);
  G.clockMin += dt * 0.12;
  if (frame % 6 === 0 || frame <= 2) refreshHUD(dt);
  if (frame === 20) window.__shotReady = true;
  renderer.render(scene, camera);
}
if (SHOT) {
  G.setMode('play');
  applyShot(SHOT, G);
  document.getElementById('help').style.display = 'none';
  if (SHOT === 'title') G.setMode('title');
} else {
  G.setMode('title');
}
G.setTimeOfDay('golden');
if (SHOT === 'night') G.setTimeOfDay('night');
if (SHOT === 'chase') { renderer.toneMappingExposure = 0.75; lights.sun.intensity = 2.7 * 0.75; lights.sun.color.setHex(0xffe8c8); lights.hemi.intensity = 0.5; }
refreshHUD(0.016);
animate();
