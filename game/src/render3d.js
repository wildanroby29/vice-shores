// Vice Shores (3D) — the three.js renderer. Reads the world state and draws it: a
// low-poly sunset coastal city, third-person chase cam behind the car and
// over-the-shoulder on foot. The game itself makes no network requests; three.js is
// vendored at game/vendor/three.min.js (UMD, global THREE).

import { CITY, PALETTE } from './config.js';
import { ROADS_V, ROADS_H, ROAD_W, BEACH_Z, WATER_Z, RIVER_X, SPOTS } from './city.js';

const T = () => window.THREE;

function hex(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function skyTexture() {
  const c = makeCanvas(16, 256);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#3a2358'); // dusk purple, top
  grad.addColorStop(0.45, '#8a4a7a');
  grad.addColorStop(0.7, '#ff7a4d'); // sunset orange
  grad.addColorStop(1, '#ffb35c'); // golden horizon
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  const tex = new window.THREE.CanvasTexture(c);
  tex.colorSpace = T().SRGBColorSpace;
  return tex;
}

function windowTexture(color, w, h) {
  const c = makeCanvas(128, 256);
  const g = c.getContext('2d');
  g.fillStyle = hex(color);
  g.fillRect(0, 0, 128, 256);
  const rows = Math.max(3, Math.round(h / 30));
  const cols = Math.max(2, Math.round(w / 30));
  const cw = 128 / cols;
  const ch = 256 / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const lit = ((r * 7 + col * 13) % 10) < 6;
      g.fillStyle = lit ? '#ffd76a' : '#141a2a';
      g.fillRect(col * cw + cw * 0.22, r * ch + ch * 0.24, cw * 0.56, ch * 0.52);
    }
  }
  const tex = new window.THREE.CanvasTexture(c);
  tex.colorSpace = T().SRGBColorSpace;
  return tex;
}

function signTexture(text, color) {
  const c = makeCanvas(256, 64);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 64);
  g.font = 'bold 30px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 14;
  g.fillStyle = color;
  g.fillText(text, 128, 32);
  g.shadowBlur = 0;
  g.fillStyle = '#ffffff';
  g.fillText(text, 128, 32);
  const tex = new window.THREE.CanvasTexture(c);
  tex.colorSpace = T().SRGBColorSpace;
  return tex;
}

function roadTexture() {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#2b3040';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#e8c33a';
  g.fillRect(62, 8, 4, 40);
  g.fillRect(62, 76, 4, 40);
  g.fillStyle = '#3a4157';
  g.fillRect(0, 0, 6, 128);
  g.fillRect(122, 0, 6, 128);
  const tex = new window.THREE.CanvasTexture(c);
  tex.wrapS = T().RepeatWrapping;
  tex.wrapT = T().RepeatWrapping;
  tex.colorSpace = T().SRGBColorSpace;
  return tex;
}

export function createGameRenderer(world) {
  const THREE = window.THREE;
  const state = world.state;
  const city = world.city;

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(1280, 800);
  renderer.setPixelRatio(1);
  renderer.domElement.id = 'game3d';
  renderer.domElement.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;';
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8a4a7a);
  scene.fog = new THREE.Fog(0xc97a8a, 500, 3000);

  const camera = new THREE.PerspectiveCamera(68, 1280 / 800, 0.1, 6000);
  camera.position.set(1260, 500, 200);
  const camPos = new THREE.Vector3(1260, 500, 200);
  const camTarget = new THREE.Vector3(1260, 0, 900);

  // --- sky dome + sun --------------------------------------------------------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(3200, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  sky.position.set(1280, 0, 960);
  scene.add(sky);

  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(150, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd76a, fog: false }),
  );
  sun.position.set(-900, 260, 960);
  scene.add(sun);
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(260, 32),
    new THREE.MeshBasicMaterial({ color: 0xff9a3d, transparent: true, opacity: 0.35, fog: false }),
  );
  sunGlow.position.set(-900, 260, 955);
  scene.add(sunGlow);

  // --- lights -----------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xff9a7a, 0x2a2438, 0.85);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffb36a, 1.35);
  sunLight.position.set(-1200, 700, 400);
  scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0x7a6aff, 0.35);
  fill.position.set(1200, 500, -600);
  scene.add(fill);

  // --- ground, roads, beach, ocean, river --------------------------------------
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x232839 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3600, 2800), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(1280, 0, 960);
  scene.add(ground);

  const rTex = roadTexture();
  const roadMat = new THREE.MeshLambertMaterial({ map: rTex });
  function roadStrip(x, z, w, d, repeat) {
    const tex = rTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(repeat[0], repeat[1]);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshLambertMaterial({ map: tex }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.1, z);
    scene.add(m);
  }
  for (const rx of ROADS_V) roadStrip(rx, 850, ROAD_W, 1700, [1, 13]);
  for (const rz of ROADS_H) roadStrip(1190, rz, 2380, ROAD_W, [18, 1]);
  roadStrip(2470, 1100, 180, ROAD_W, [1.4, 1]); // bridge over the river
  // Bridge rails.
  const railMat = new THREE.MeshLambertMaterial({ color: 0x8a93a8 });
  for (const z of [1048, 1152]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(180, 8, 4), railMat);
    rail.position.set(2470, 4, z);
    scene.add(rail);
  }

  // Parks (green), lots (grey with parking lines).
  const parkMat = new THREE.MeshLambertMaterial({ color: 0x1d5c2e });
  const parkRects = [
    [828, 748, 1212, 1052],
    [1788, 348, 2172, 652],
  ];
  for (const [x0, z0, x1, z1] of parkRects) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), parkMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set((x0 + x1) / 2, 0.15, (z0 + z1) / 2);
    scene.add(p);
  }
  const lotMat = new THREE.MeshLambertMaterial({ color: 0x2e3345 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8d3c8 });
  for (const [x0, z0, x1, z1] of [[828, 1148, 1212, 1452], [1308, 1148, 1692, 1452]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), lotMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set((x0 + x1) / 2, 0.15, (z0 + z1) / 2);
    scene.add(p);
    for (let x = x0 + 40; x < x1; x += 60) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 34), lineMat);
      line.position.set(x, 0.3, (z0 + z1) / 2);
      scene.add(line);
    }
  }

  // Beach sand + ocean + river.
  const sandMat = new THREE.MeshLambertMaterial({ color: 0xe0b96a });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(2380, WATER_Z - BEACH_Z + 4), sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(1190, 0.15, (BEACH_Z + WATER_Z) / 2);
  scene.add(sand);
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x1a6a9a, transparent: true, opacity: 0.92 });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(3600, 900), waterMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(1280, 0.2, WATER_Z + 450);
  scene.add(ocean);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(180, 1920), waterMat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(RIVER_X + 90, 0.2, 960);
  scene.add(river);
  // White wave lines on the sand.
  for (let x = 120; x < 2380; x += 240) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(90, 1, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    w.position.set(x, 0.3, WATER_Z - 6);
    scene.add(w);
  }

  // --- buildings ---------------------------------------------------------------
  const signTexCache = new Map();
  const winTexCache = new Map();
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x2b3247 });
  const neonColors = ['#ff4d8d', '#37e0d8', '#ff9a3d', '#c29aff'];
  let neonIdx = 0;
  for (const b of city.buildings) {
    const key = `${b.color}-${b.w}x${b.h}`;
    let tex = winTexCache.get(key);
    if (!tex) {
      tex = windowTexture(b.color, b.w, b.h);
      winTexCache.set(key, tex);
    }
    const side = new THREE.MeshLambertMaterial({ map: tex });
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, b.h, b.d),
      [side, side, roofMat, roofMat, side, side],
    );
    box.position.set(b.x, b.h / 2, b.z);
    scene.add(box);
    if (b.sign) {
      const color = neonColors[neonIdx++ % neonColors.length];
      let stex = signTexCache.get(b.sign + color);
      if (!stex) {
        stex = signTexture(b.sign, color);
        signTexCache.set(b.sign + color, stex);
      }
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(b.w * 0.85, 220), 22),
        new THREE.MeshBasicMaterial({ map: stex, transparent: true }),
      );
      sign.position.set(b.x, b.h * 0.72, b.z + b.d / 2 + 1);
      scene.add(sign);
    }
  }

  // --- palms -------------------------------------------------------------------
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8a44 });
  for (const palm of city.palms) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 46 * palm.s, 6), trunkMat);
    trunk.position.y = 23 * palm.s;
    g.add(trunk);
    const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(20 * palm.s, 0), leafMat);
    canopy.scale.y = 0.55;
    canopy.position.y = 50 * palm.s;
    g.add(canopy);
    g.position.set(palm.x, 0, palm.z);
    scene.add(g);
  }

  // --- cars ---------------------------------------------------------------------
  const carMeshes = new Map();
  function makeCarMesh(color, isPolice) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(new THREE.BoxGeometry(46, 12, 22), bodyMat);
    body.position.y = 8;
    g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(24, 10, 18), new THREE.MeshLambertMaterial({ color: 0x141a2a }));
    cabin.position.set(-2, 18, 0);
    g.add(cabin);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    for (const [wx, wz] of [[14, 11], [14, -11], [-14, 11], [-14, -11]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 5, 10), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 7, wz);
      g.add(wheel);
    }
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    for (const wz of [7, -7]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 4), headMat);
      h.position.set(23, 8, wz);
      g.add(h);
    }
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    for (const wz of [7, -7]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 4), tailMat);
      t.position.set(-23, 8, wz);
      g.add(t);
    }
    if (isPolice) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 18), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      bar.position.set(-2, 25, 0);
      g.add(bar);
      const red = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 7), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
      red.position.set(-2, 26, 4.5);
      g.add(red);
      const blue = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 7), new THREE.MeshBasicMaterial({ color: 0x2f7bff }));
      blue.position.set(-2, 26, -4.5);
      g.add(blue);
      g.userData.lightRed = red;
      g.userData.lightBlue = blue;
    }
    return g;
  }

  function syncCars(time) {
    const seen = new Set();
    for (const car of state.cars) {
      seen.add(car.id);
      let mesh = carMeshes.get(car.id);
      if (!mesh) {
        mesh = makeCarMesh(car.color, car.kind === 'police');
        mesh.userData.isPolice = car.kind === 'police';
        scene.add(mesh);
        carMeshes.set(car.id, mesh);
      }
      mesh.position.set(car.x, car.wrecked ? 2 : 0, car.z);
      mesh.rotation.y = -car.angle;
      if (car.wrecked) mesh.rotation.z = 0.12;
      else mesh.rotation.z = 0;
      // Police light bar flashes.
      if (mesh.userData.isPolice && mesh.userData.lightRed) {
        const on = Math.floor(time * 3) % 2 === 0;
        mesh.userData.lightRed.material.color.setHex(on ? 0xff3b30 : 0x550000);
        mesh.userData.lightBlue.material.color.setHex(on ? 0x0a2a66 : 0x2f7bff);
      }
      // Player / mission cars keep their colour.
      if (car._color !== car.color) {
        car._color = car.color;
        mesh.children[0].material.color.setHex(car.color);
      }
    }
    for (const [id, mesh] of carMeshes) {
      if (!seen.has(id)) {
        scene.remove(mesh);
        carMeshes.delete(id);
      }
    }
  }

  // --- characters ---------------------------------------------------------------
  function makePersonMesh(shirtColor, withGun) {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
    const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
    const dark = new THREE.MeshLambertMaterial({ color: 0x1a1e2c });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(5, 12, 5), dark);
    legL.position.set(0, 6, 3.5);
    g.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(5, 12, 5), dark);
    legR.position.set(0, 6, -3.5);
    g.add(legR);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(12, 16, 14), shirt);
    torso.position.y = 20;
    g.add(torso);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(4, 14, 4), shirt);
    armL.position.set(2, 20, 9);
    g.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(4, 14, 4), shirt);
    armR.position.set(2, 20, -9);
    g.add(armR);
    const head = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), skin);
    head.position.y = 34;
    g.add(head);
    if (withGun) {
      const gun = new THREE.Mesh(new THREE.BoxGeometry(11, 3, 3), dark);
      gun.position.set(9, 22, -9);
      g.add(gun);
      g.userData.gun = gun;
    }
    g.userData.legL = legL;
    g.userData.legR = legR;
    g.userData.armL = armL;
    g.userData.armR = armR;
    return g;
  }

  const playerMesh = makePersonMesh(0x37e0d8, true);
  scene.add(playerMesh);
  const pedMeshes = new Map();
  let pedSeq = 0;

  function syncPeople(time) {
    const p = state.player;
    const inCar = !!p.inCar;
    playerMesh.visible = !inCar && state.screen !== 'title';
    if (!inCar) {
      playerMesh.position.set(p.x, p.moving ? Math.abs(Math.sin(p.walkPhase)) * 2 : 0, p.z);
      playerMesh.rotation.y = -p.angle;
      const s = Math.sin(p.walkPhase);
      playerMesh.userData.legL.position.x = s * 4;
      playerMesh.userData.legR.position.x = -s * 4;
      playerMesh.userData.armL.position.x = -s * 3 + 2;
      playerMesh.userData.armR.position.x = s * 3 + 2;
      if (playerMesh.userData.gun) playerMesh.userData.gun.visible = p.weapon > 0;
    }
    const seen = new Set();
    for (const ped of state.peds) {
      if (!ped._mid) ped._mid = ++pedSeq;
      seen.add(ped._mid);
      let mesh = pedMeshes.get(ped._mid);
      if (!mesh) {
        mesh = makePersonMesh(ped.color, false);
        scene.add(mesh);
        pedMeshes.set(ped._mid, mesh);
      }
      mesh.visible = ped.down <= 0;
      mesh.position.set(ped.x, Math.abs(Math.sin(ped.walkPhase)) * 1.5, ped.z);
      mesh.rotation.y = -ped.angle;
      const s = Math.sin(ped.walkPhase);
      mesh.userData.legL.position.x = s * 3;
      mesh.userData.legR.position.x = -s * 3;
    }
    for (const [id, mesh] of pedMeshes) {
      if (!seen.has(id)) {
        scene.remove(mesh);
        pedMeshes.delete(id);
      }
    }
  }

  // --- helicopter ----------------------------------------------------------------
  const heliGroup = new THREE.Group();
  {
    const body = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 16), new THREE.MeshLambertMaterial({ color: 0x2a2f3a }));
    heliGroup.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(26, 5, 5), new THREE.MeshLambertMaterial({ color: 0x2a2f3a }));
    tail.position.set(-27, 2, 0);
    heliGroup.add(tail);
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshLambertMaterial({ color: 0x9fd8ff }));
    cockpit.position.set(10, 2, 0);
    heliGroup.add(cockpit);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(56, 1, 3), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    rotor.position.y = 9;
    heliGroup.add(rotor);
    heliGroup.userData.rotor = rotor;
    const skidMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    for (const wz of [7, -7]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(24, 2, 2), skidMat);
      skid.position.set(0, -8, wz);
      heliGroup.add(skid);
    }
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 55, 170, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }),
    );
    cone.position.y = -85;
    heliGroup.add(cone);
    const spot = new THREE.SpotLight(0xfff2b0, 2.2, 500, 0.35, 0.4, 1);
    spot.position.set(0, -4, 0);
    heliGroup.add(spot);
    heliGroup.userData.spot = spot;
    const spotTarget = new THREE.Object3D();
    scene.add(spotTarget);
    spot.target = spotTarget;
    heliGroup.userData.spotTarget = spotTarget;
  }
  heliGroup.visible = false;
  scene.add(heliGroup);
  const heliCircle = new THREE.Mesh(
    new THREE.CircleGeometry(55, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  heliCircle.rotation.x = -Math.PI / 2;
  heliCircle.position.y = 0.4;
  heliCircle.visible = false;
  scene.add(heliCircle);

  // --- fire / smoke ----------------------------------------------------------------
  const fireMeshes = new Map();
  function syncFires(time) {
    const seen = new Set();
    for (const f of state.fires) {
      seen.add(f);
      let g = fireMeshes.get(f);
      if (!g) {
        g = new THREE.Group();
        const cols = [0xff5a1e, 0xff9a3d, 0xffd76a, 0xff3b30];
        for (let i = 0; i < 9; i++) {
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(8 + (i % 3) * 3, 10 + (i % 4) * 4, 8),
            new THREE.MeshBasicMaterial({ color: cols[i % cols.length] }),
          );
          m.position.set(((i * 37) % 40) - 20, 8, ((i * 53) % 36) - 18);
          m.userData.phase = i * 0.9;
          g.add(m);
        }
        const light = new THREE.PointLight(0xff7a2a, 1.6, 160);
        light.position.y = 24;
        g.add(light);
        g.userData.light = light;
        for (let i = 0; i < 3; i++) {
          const s = new THREE.Mesh(
            new THREE.SphereGeometry(10, 8, 6),
            new THREE.MeshLambertMaterial({ color: 0x555560, transparent: true, opacity: 0.45 }),
          );
          s.position.set((i - 1) * 12, 40 + i * 14, (i % 2) * 10 - 5);
          s.userData.rise = i * 20;
          g.add(s);
          g.userData['smoke' + i] = s;
        }
        scene.add(g);
        fireMeshes.set(f, g);
      }
      g.position.set(f.x, 0, f.z);
      g.children.forEach((m, i) => {
        if (m.isMesh && m.geometry.type === 'BoxGeometry') {
          const s = 0.8 + Math.sin(time * 6 + m.userData.phase) * 0.35;
          m.scale.set(s, 0.8 + Math.abs(Math.sin(time * 5 + m.userData.phase)) * 0.7, s);
          m.position.y = 8 + Math.sin(time * 4 + m.userData.phase) * 3;
        }
      });
      g.userData.light.intensity = 1.3 + Math.sin(time * 13) * 0.5;
      for (let i = 0; i < 3; i++) {
        const s = g.userData['smoke' + i];
        if (s) s.position.y = 40 + i * 14 + ((time * 12 + s.userData.rise) % 50);
      }
    }
    for (const [f, g] of fireMeshes) {
      if (!seen.has(f)) {
        scene.remove(g);
        fireMeshes.delete(f);
      }
    }
  }

  // --- bullets -----------------------------------------------------------------------
  const bulletMeshes = [];
  function syncBullets() {
    while (bulletMeshes.length < state.bullets.length) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(10, 2, 2),
        new THREE.MeshBasicMaterial({ color: 0xffe27a }),
      );
      scene.add(m);
      bulletMeshes.push(m);
    }
    state.bullets.forEach((b, i) => {
      const m = bulletMeshes[i];
      m.visible = true;
      m.position.set(b.x, 18, b.z);
      m.rotation.y = -b.angle;
    });
    for (let i = state.bullets.length; i < bulletMeshes.length; i++) bulletMeshes[i].visible = false;
  }

  // --- mission marker -------------------------------------------------------------------
  const markerGroup = new THREE.Group();
  const markerRing = new THREE.Mesh(
    new THREE.TorusGeometry(30, 3, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xf2c94c }),
  );
  markerRing.rotation.x = Math.PI / 2;
  markerGroup.add(markerRing);
  const markerBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 320, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  markerBeam.position.y = 160;
  markerGroup.add(markerBeam);
  markerGroup.visible = false;
  scene.add(markerGroup);

  // --- camera + aim -----------------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const aimPoint = new THREE.Vector3();
  let mouseNdc = { x: 0, y: 0 };
  let renderTime = 0;

  function computeAim(ndc) {
    // A staged shot can lock the aim (the carjacking target) instead of the mouse.
    if (state.aimLocked) {
      world.debug.setAim(state.aimLocked.x, state.aimLocked.z);
      return;
    }
    if (ndc) mouseNdc = ndc;
    raycaster.setFromCamera(mouseNdc, camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, aimPoint);
    if (hit) world.debug.setAim(aimPoint.x, aimPoint.z);
  }

  function updateCamera(dt, time) {
    const p = state.player;
    let desired = new THREE.Vector3();
    let target = new THREE.Vector3();
    if (state.screen === 'title') {
      const a = renderTime * 0.045;
      desired.set(1280 + Math.cos(a) * 900, 420, 960 + Math.sin(a) * 700);
      target.set(1260, 0, 1300);
    } else if (p.inCar) {
      const car = state.cars.find((c) => c.id === p.inCar);
      const a = car ? car.angle : p.angle;
      const fx = Math.cos(a);
      const fz = Math.sin(a);
      // Chase cam: well behind and above the car, looking far ahead down the road.
      // 80 behind the car's centre = ~57 behind its rear bumper (the car is 46
      // long and 22 tall with the cabin), so the car is a clear subject (~1/4 of
      // the frame) and the street, the police and the city read around it. Offset
      // 25 to the side: a ramming police car sits on the road centreline behind
      // the player, and a straight-behind camera would sit inside it.
      const rx = -fz;
      const rz = fx;
      desired.set(p.x - fx * 80 + rx * 25, 16, p.z - fz * 80 + rz * 25);
      target.set(p.x + fx * 55, 8, p.z + fz * 55);
    } else {
      const fx = Math.cos(p.angle);
      const fz = Math.sin(p.angle);
      // Over the shoulder: behind, up, and a touch to the side, looking ahead.
      // 80 back so the 34-tall player reads as a character in the street (~1/3 of
      // the frame), not a wall filling it.
      const rx = -fz;
      const rz = fx;
      desired.set(p.x - fx * 80 + rx * 7, 20, p.z - fz * 80 + rz * 7);
      target.set(p.x + fx * 35, 13, p.z + fz * 35);
    }
    const k = 1 - Math.exp(-5.5 * dt);
    if (state.screen === 'title') {
      // Slow orbit: smooth.
      camPos.lerp(desired, k);
      camTarget.lerp(target, k);
    } else {
      // Third-person (car / on foot): place the camera exactly behind the player
      // every frame. A lerp toward a fast-moving target lags behind it (the chase
      // car outruns a smoothed camera), so the position is direct and only the
      // look-at point is smoothed.
      camPos.copy(desired);
      camTarget.lerp(target, 1 - Math.exp(-10 * dt));
    }
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    sun.lookAt(camera.position);
    sunGlow.lookAt(camera.position);
  }

  function render(dt) {
    const time = state.time;
    renderTime += dt;
    syncCars(time);
    syncPeople(time);
    syncBullets();
    syncFires(time);

    // Helicopter.
    const h = state.heli;
    heliGroup.visible = !!h;
    heliCircle.visible = !!h;
    if (h) {
      heliGroup.position.set(h.x, 170, h.z);
      heliGroup.rotation.y = -h.angle;
      heliGroup.userData.rotor.rotation.y = h.rotor;
      // The spotlight pool sits on the ground under the helicopter.
      heliGroup.userData.spotTarget.position.set(h.x, 0, h.z);
      heliCircle.position.set(h.x, 0.4, h.z);
    }

    // Mission marker.
    const marker = world.missionMarker();
    if (marker && state.screen === 'play') {
      markerGroup.visible = true;
      markerGroup.position.set(marker.x, 2 + Math.sin(time * 2) * 2, marker.z);
    } else {
      markerGroup.visible = false;
    }

    updateCamera(dt, time);
    renderer.render(scene, camera);
  }

  function resize(w, h) {
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return { render, computeAim, resize, renderer, scene, camera };
}
