import { makePoliceCar, flashPolice } from './vehicles.js';
import { makePerson } from './people.js';

export const TACTICS = ['RAMMING', 'FLANKING', 'PIT', 'ROADBLOCK', 'SPOTLIGHT', 'PURSUIT', 'MARKSMAN', 'SHORE WATCH'];
export const UNIT_NAMES = ['KITE-1', 'MARLIN-3', 'CORAL-48', 'TIDE-7', 'REEF-22', 'SURGE-9'];

function extrudeProfile(points, width, bevel) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 1, steps: 1,
  });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2);
  return geo;
}

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const BEAM_VERT = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const BEAM_FRAG = `
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float along = pow(vUv.y, 1.5);
  float edge = abs(dot(normalize(vNormal), normalize(vView)));
  float a = 0.2 * along * edge;
  gl_FragColor = vec4(uColor, a);
}
`;

export function createHelicopter(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.4, metalness: 0.4,
  });
  const fuselage = new THREE.Mesh(
    extrudeProfile(
      [[2.6, -0.4], [2.7, 0.2], [2.0, 0.9], [0.6, 1.1], [-1.4, 1.0], [-2.4, 0.4], [-2.5, -0.3], [-1.2, -0.8], [1.0, -0.9]],
      1.9, 0.12,
    ),
    bodyMat,
  );
  fuselage.castShadow = true;
  group.add(fuselage);

  // White body with a blue cheatline and fin: a white/blue helicopter.
  // The cheatline colour is the only dark accent on the fuselage.
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x1a4a8a, roughness: 0.4 });
  const cheatline = new THREE.Mesh(
    extrudeProfile(
      [[2.55, -0.15], [2.6, 0.15], [-2.35, 0.15], [-2.4, -0.15]],
      1.96, 0.04,
    ),
    stripeMat,
  );
  group.add(cheatline);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.9), stripeMat);
  fin.position.set(0, 0.6, -5.5);
  fin.castShadow = true;
  group.add(fin);

  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e1a24, roughness: 0.05, metalness: 0.1,
    clearcoat: 1, envMapIntensity: 1.1, transparent: true, opacity: 0.96,
  });
  const canopy = new THREE.Mesh(
    extrudeProfile([[2.5, -0.3], [2.35, 0.7], [1.0, 1.0], [1.0, -0.3]], 1.6, 0.06),
    canopyMat,
  );
  group.add(canopy);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, 3.4, 10), bodyMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.1, -4.0);
  group.add(boom);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.25, 0.6, -5.5);
  const tailBladeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 0.22), tailBladeMat);
    blade.rotation.x = (i * Math.PI) / 2;
    tailRotor.add(blade);
  }
  group.add(tailRotor);
  const skidMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  for (const sx of [-0.85, 0.85]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 8), skidMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx, -1.3, 0.2);
    group.add(rail);
    for (const sz of [-0.9, 1.3]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6), skidMat);
      strut.position.set(sx, -1.05, sz);
      strut.rotation.z = sx > 0 ? 0.3 : -0.3;
      group.add(strut);
    }
  }

  const mastMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), mastMat);
  mast.position.y = 1.3;
  group.add(mast);
  const rotor = new THREE.Group();
  rotor.position.y = 1.65;
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.5 });
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9, 0.06, 0.4), bladeMat);
    blade.rotation.y = (i * Math.PI) / 2;
    rotor.add(blade);
  }
  group.add(rotor);
  // Rotor disc: a faint neutral-grey disc, never a coloured ellipse.
  // Opacity 0.10 keeps the spinning rotor readable without painting a
  // pink or grey blob across the sky.
  const discMat = new THREE.MeshBasicMaterial({
    color: 0x8a8a8a, transparent: true, opacity: 0.10,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 1.66;
  group.add(disc);

  const beamPivot = new THREE.Group();
  group.add(beamPivot);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0xfff2c8) } },
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 34, 20, 1, true), beamMat);
  cone.position.y = -17;
  beamPivot.add(cone);
  const glowTex = radialTexture();
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xfff2c8, opacity: 0.6,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  lampGlow.position.set(0, -1.4, 0);
  lampGlow.scale.set(3, 3, 1);
  group.add(lampGlow);

  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c8, transparent: true, opacity: 0.25,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.0, 24), poolMat);
  pool.rotation.x = -Math.PI / 2;
  scene.add(pool);

  const spot = new THREE.SpotLight(0xfff2c8, 1.6, 60, 0.28, 0.5);
  scene.add(spot);
  scene.add(spot.target);

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xdfe8f2, emissive: 0xbcccdc, emissiveIntensity: 0.9, roughness: 0.5,
  });
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 4.6), rimMat);
  rim.position.set(0, 1.12, -0.2);
  group.add(rim);

  const redNavMat = new THREE.MeshStandardMaterial({
    color: 0x550000, emissive: 0xff2020, emissiveIntensity: 3, roughness: 0.3,
  });
  const greenNavMat = new THREE.MeshStandardMaterial({
    color: 0x005500, emissive: 0x20ff60, emissiveIntensity: 3, roughness: 0.3,
  });
  const strobeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4, roughness: 0.3,
  });
  const redNav = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), redNavMat);
  redNav.position.set(-0.28, 1.3, -5.5);
  group.add(redNav);
  const greenNav = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), greenNavMat);
  greenNav.position.set(0.28, 1.3, -5.5);
  group.add(greenNav);
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), strobeMat);
  strobe.position.set(0, 0.7, -5.85);
  group.add(strobe);

  group.position.set(-40, 34, 40);
  scene.add(group);

  let hold = null;
  let aimTarget = null;

  const down = new THREE.Vector3(0, -1, 0);
  const tmpDir = new THREE.Vector3();

  function aimAt(target) {
    aimTarget = target;
    const hp = group.position;
    tmpDir.set(target.x - hp.x, target.y - hp.y, target.z - hp.z);
    const dist = tmpDir.length();
    if (dist < 0.01) return;
    tmpDir.divideScalar(dist);
    beamPivot.quaternion.setFromUnitVectors(down, tmpDir);
    cone.scale.y = dist / 34;
    pool.position.set(target.x, 0.12, target.z);
    spot.position.copy(hp);
    spot.target.position.set(target.x, target.y, target.z);
  }

  function setHold(x, y, z) {
    hold = { x, y, z };
    group.position.set(x, y, z);
  }

  function clearHold() {
    hold = null;
  }

  function update(dt, time, heroPos) {
    rotor.rotation.y += 22 * dt;
    tailRotor.rotation.x += 30 * dt;
    const t = time % 1.0;
    const on = t < 0.08 || (t > 0.18 && t < 0.26);
    strobeMat.emissiveIntensity = on ? 6 : 0.4;
    if (hold) {
      group.position.set(hold.x, hold.y, hold.z);
      if (aimTarget) aimAt(aimTarget);
    } else if (heroPos) {
      const tx = heroPos.x - 8;
      const tz = heroPos.z - 18;
      group.position.x += (tx - group.position.x) * 0.02;
      group.position.y += (26 - group.position.y) * 0.02;
      group.position.z += (tz - group.position.z) * 0.02;
      group.lookAt(heroPos.x, group.position.y, heroPos.z);
      aimAt({ x: heroPos.x, y: 0, z: heroPos.z });
    } else {
      group.position.x += (-40 - group.position.x) * 0.02;
      group.position.y += (34 - group.position.y) * 0.02;
      group.position.z += (40 - group.position.z) * 0.02;
      aimAt({ x: group.position.x, y: 0, z: group.position.z });
    }
  }

  return {
    group, aimAt, setHold, clearHold, update,
    get position() { return group.position; },
  };
}

export function createPolice(scene, rng) {
  const cars = [];
  const officers = [];
  const roadblocks = [];
  let nameIdx = 0;

  function spawnCar(x, z, tactic) {
    const car = makePoliceCar(rng);
    car.group.position.set(x, 0, z);
    const useTactic = tactic ?? TACTICS[Math.floor(rng() * TACTICS.length)];
    const name = UNIT_NAMES[nameIdx % UNIT_NAMES.length];
    nameIdx += 1;
    const entry = {
      ...car,
      name,
      tactic: useTactic,
      speed: 22 + rng() * 6,
    };
    entry.group.userData.police = true;
    scene.add(entry.group);
    cars.push(entry);
    return entry;
  }

  function spawnOfficer(x, z) {
    const person = makePerson({
      detail: 'full', officer: true, hairStyle: 3, shirt: 0x1a2a4a,
      skin: 0xe8b88a, hair: 0x1a1a1a, pants: 0x2a2a3a, scale: 1,
    });
    person.group.position.set(x, 0, z);
    scene.add(person.group);
    const entry = { ...person, x, z };
    officers.push(entry);
    return entry;
  }

  function spawnRoadblock(x, z, rotY) {
    const g = new THREE.Group();
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xc23a2e, roughness: 0.6 });
    for (let i = 0; i < 3; i++) {
      const mat = i % 2 === 0 ? whiteMat : redMat;
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.5), mat);
      barrier.position.set(-1.9 + i * 1.9, 0.45, 0);
      barrier.castShadow = true;
      g.add(barrier);
    }
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xe87a3a, roughness: 0.7 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 10), coneMat);
    cone.position.set(3.4, 0.45, 0);
    g.add(cone);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    scene.add(g);
    roadblocks.push(g);
    return g;
  }

  function dispatch(heroPos) {
    return cars.slice(0, 6).map((c) => ({
      name: c.name,
      dist: Math.round(Math.hypot(c.group.position.x - heroPos.x, c.group.position.z - heroPos.z)),
      tactic: c.tactic,
    }));
  }

  function update(dt, time, heroPos, wanted) {
    for (const car of cars) {
      const g = car.group;
      flashPolice(car, time);
      if (wanted <= 0) continue;
      const dx = heroPos.x - g.position.x;
      const dz = heroPos.z - g.position.z;
      const want = Math.atan2(dx, dz);
      let diff = want - g.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turn = Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      g.rotation.y += turn;
      g.position.x += Math.sin(g.rotation.y) * car.speed * dt;
      g.position.z += Math.cos(g.rotation.y) * car.speed * dt;
      for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.42;
    }
  }

  return { cars, officers, roadblocks, spawnCar, spawnOfficer, spawnRoadblock, dispatch, update };
}
