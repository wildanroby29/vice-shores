// police.js — the wanted system: police cars that chase, ram and flank, a
// helicopter with a tapered body, spinning rotor with motion-blur disc, a
// spotlight cone and a bright ground circle, plus roadblocks and the
// dispatch ticker data (unit name, distance, tactic).
import { makePoliceCar } from './vehicles.js';
import { makePerson } from './people.js';

const TACTICS = ['RAMMING', 'FLANKING', 'PIT', 'ROADBLOCK', 'SPOTLIGHT', 'PURSUIT'];
const UNIT_NAMES = ['UNIT 7', 'UNIT 12', 'UNIT 4', 'UNIT 21', 'UNIT 9', 'UNIT 15'];

export function createHelicopter(scene, detail) {
  const group = new THREE.Group();
  if (detail === 'low') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x2a2a3a }));
    group.add(body);
    return { group, rotor: null, beam: null, pool: null, update() {} };
  }
  // Fresh fuselage: an extruded side profile (nose at +Z after the
  // rotate, so group.lookAt points the nose at the target), tapered from a
  // roomy cabin to a slim tail — a distinct silhouette, not an ellipsoid.
  // A white cheatline keeps the dark-blue body readable at night.
  // Steel blue-grey body so the heli reads against the night sky (the old
  // 0x2a3a4e was a black silhouette), with a white belly stripe.
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6b7a8f, roughness: 0.4, metalness: 0.4 });
  function extrudeProfile(points, width, bevel, mat) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();
    const depth = Math.max(0.05, width - bevel * 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1,
    });
    geo.rotateY(-Math.PI / 2);
    geo.translate(depth / 2, 0, 0);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }
  const body = extrudeProfile(
    [[2.6, -0.4], [2.7, 0.2], [2.0, 0.9], [0.6, 1.1], [-1.4, 1.0], [-2.4, 0.4], [-2.5, -0.3], [-1.2, -0.8], [1.0, -0.9]],
    1.9, 0.12, bodyMat,
  );
  group.add(body);
  const stripe = extrudeProfile(
    [[2.55, -0.15], [2.6, 0.15], [-2.35, 0.15], [-2.4, -0.15]],
    1.96, 0.04, new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }),
  );
  group.add(stripe);
  // Glass canopy: a sloped wedge over the nose, dark and glossy.
  const canopy = extrudeProfile(
    [[2.5, -0.3], [2.35, 0.7], [1.0, 1.0], [1.0, -0.3]],
    1.6, 0.06, new THREE.MeshPhysicalMaterial({ color: 0x0e1a24, roughness: 0.05, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.1, transparent: true, opacity: 0.96 }),
  );
  group.add(canopy);
  // Tail boom + fin + tail rotor (tail extends to -Z).
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, 3.4, 8), bodyMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.1, -4.0);
  boom.castShadow = true;
  group.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.9), bodyMat);
  fin.position.set(0, 0.6, -5.5);
  group.add(fin);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.25, 0.6, -5.5);
  const tailBladeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const a of [0, Math.PI / 2]) {
    const tb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 0.22), tailBladeMat);
    tb.rotation.x = a;
    tailRotor.add(tb);
  }
  group.add(tailRotor);
  // Skids: two rails under the belly + struts up to the fuselage.
  const skidMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const sx of [-0.85, 0.85]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 6), skidMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx, -1.3, 0.2);
    group.add(skid);
    for (const sz of [-0.9, 1.3]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6), skidMat);
      strut.position.set(sx, -1.0, sz);
      strut.rotation.z = sx > 0 ? 0.5 : -0.5;
      group.add(strut);
    }
  }
  // Main rotor + translucent motion-blur disc.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  mast.position.y = 1.3;
  group.add(mast);
  const rotor = new THREE.Group();
  rotor.position.y = 1.65;
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.5 });
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9, 0.06, 0.4), bladeMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  group.add(rotor);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.5, 24), new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 1.66;
  group.add(disc);
  // Spotlight: a VOLUMETRIC cone (shader fades alpha along its length and
  // toward the silhouette edges, peak ~0.2) + a soft radial-gradient pool.
  // The old flat cone read as a hard-edged white triangle in the chase shot.
  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(0xfff2c8) } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float axial = smoothstep(0.05, 0.85, vUv.y); float edge = abs(dot(normalize(vN), normalize(vV))); float a = axial * pow(edge, 1.6) * 0.32; gl_FragColor = vec4(uColor, a); }',
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 34, 20, 1, true), beamMat);
  beam.position.y = -17;
  group.add(beam);
  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = 128; poolCanvas.height = 128;
  const pg = poolCanvas.getContext('2d');
  const pgrad = pg.createRadialGradient(64, 64, 4, 64, 64, 62);
  pgrad.addColorStop(0, 'rgba(255,242,200,0.9)');
  pgrad.addColorStop(0.45, 'rgba(255,242,200,0.35)');
  pgrad.addColorStop(1, 'rgba(255,242,200,0)');
  pg.fillStyle = pgrad; pg.fillRect(0, 0, 128, 128);
  const poolTex = new THREE.CanvasTexture(poolCanvas);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.0, 24), new THREE.MeshBasicMaterial({ map: poolTex, color: 0xfff2c8, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -33.8;
  group.add(pool);
  const spot = new THREE.SpotLight(0xfff2c8, 1.6, 60, 0.28, 0.5); // dimmed (Part 1.3 + hotfix): the beam was blowing the hero's roof/hood to white; the pool mesh still gives the ground glow
  spot.position.set(0, 0, 0);
  spot.target = pool;
  group.add(spot);
  group.add(spot.target);
  // Bright lamp glow at the beam's origin (so the helicopter reads at night)
  // + red/green navigation lights on the tail + a white strobe that blinks.
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: poolTex, color: 0xfff2c8, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  lampGlow.position.set(0, -1.4, 0);
  lampGlow.scale.set(3, 3, 1);
  group.add(lampGlow);
  // Rim light: a thin emissive strip along the fuselage top so the steel
  // body separates from the dark sky at night.
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 4.6), new THREE.MeshStandardMaterial({ color: 0xdfe8f2, emissive: 0xbcccdc, emissiveIntensity: 0.9 }));
  rim.position.set(0, 1.12, -0.2);
  group.add(rim);
  const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 3 }));
  navLight.position.set(-0.28, 1.3, -5.5);
  group.add(navLight);
  const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: 0x20ff60, emissive: 0x20ff60, emissiveIntensity: 3 }));
  navGreen.position.set(0.28, 1.3, -5.5);
  group.add(navGreen);
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4 }));
  strobe.position.set(0, 0.7, -5.85);
  group.add(strobe);

  // Aim the cone + pool at a target (used by update() every frame, and by the
  // chase screenshot staging to lock the beam on the hero after positioning).
  function aimAt(targetPos) {
    const to = new THREE.Vector3(targetPos.x - group.position.x, -group.position.y + 0.2, targetPos.z - group.position.z);
    const dist = to.length();
    const dir = to.clone().normalize();
    beam.position.copy(dir.clone().multiplyScalar(dist / 2));
    beam.scale.set(1, dist / 34, 1);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    pool.position.set(to.x, -group.position.y + 0.2, to.z);
    spot.target.position.set(to.x, -group.position.y + 0.2, to.z);
  }

  // A held hover position (screenshot staging): the heli stays there instead
  // of drifting back to its default hover behind the target.
  let holdTarget = null;
  function setHold(x, y, z) { holdTarget = new THREE.Vector3(x, y, z); }
  function clearHold() { holdTarget = null; }

  function update(dt, t, targetPos) {
    rotor.rotation.y += dt * 22;
    tailRotor.rotation.x += dt * 30;
    // White strobe: double-blink (bright for ~0.1 s every ~1 s).
    strobe.material.emissiveIntensity = (t % 1.0) < 0.1 ? 6 : 0.4;
    if (targetPos) {
      // Hover above and slightly behind the target (or at the held spot),
      // beam locked on it.
      const hover = holdTarget || new THREE.Vector3(targetPos.x - 8, 34, targetPos.z + 10);
      group.position.lerp(hover, 0.02);
      aimAt(targetPos);
    }
  }
  return { group, rotor, beam, pool, update, aimAt, setHold, clearHold };
}

export function createPolice(scene, rand, detail) {
  const cars = [];
  const officers = [];
  const roadblocks = [];

  function spawnCar(x, z, tactic) {
    const { group } = makePoliceCar(detail);
    group.position.set(x, 0, z);
    scene.add(group);
    const car = { group, tactic: tactic || TACTICS[Math.floor(rand() * TACTICS.length)], name: UNIT_NAMES[cars.length % UNIT_NAMES.length], speed: 22 + rand() * 6 };
    cars.push(car);
    return car;
  }

  function spawnOfficer(x, z) {
    const { group, parts } = makePerson(rand, { detail, officer: true, hairStyle: 3, shirt: 0x1a2a4a });
    group.position.set(x, 0, z);
    scene.add(group);
    const o = { group, parts };
    officers.push(o);
    return o;
  }

  function spawnRoadblock(x, z, rotY) {
    const g = new THREE.Group();
    for (let i = -1; i <= 1; i += 1) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.5), new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xe8e8e8 : 0xc23a2e }));
      stripe.position.set(i * 1.9, 0.45, 0);
      stripe.castShadow = true;
      g.add(stripe);
    }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0xe87a3a }));
    cone.position.set(3.4, 0.45, 0);
    g.add(cone);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    scene.add(g);
    roadblocks.push(g);
    return g;
  }

  function update(dt, t, heroPos, wanted) {
    for (const c of cars) {
      const dx = heroPos.x - c.group.position.x;
      const dz = heroPos.z - c.group.position.z;
      const d = Math.hypot(dx, dz) || 1;
      const targetAngle = Math.atan2(dx, dz);
      let a = c.group.rotation.y;
      let diff = targetAngle - a;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      c.group.rotation.y = a;
      const sp = wanted > 0 ? c.speed : 0;
      c.group.position.x += Math.sin(a) * sp * dt;
      c.group.position.z += Math.cos(a) * sp * dt;
      const fl = c.group.userData.flash;
      if (fl) {
        const ph = Math.sin(t * 10 + fl.phase) > 0;
        fl.red.material.emissiveIntensity = ph ? 3 : 0.2;
        fl.blue.material.emissiveIntensity = ph ? 0.2 : 3;
        fl.light.color.setHex(ph ? 0xff2020 : 0x2040ff);
        fl.light.intensity = 6 + Math.sin(t * 10) * 3; // dimmed (Part 1.3): 8-20 was blowing the hero's roof/hood to white; the emissive lenses still read as flashing
      }
    }
  }

  function dispatch(heroPos) {
    return cars.slice(0, 3).map((c) => {
      const d = Math.round(Math.hypot(heroPos.x - c.group.position.x, heroPos.z - c.group.position.z));
      return { name: c.name, dist: d, tactic: c.tactic };
    });
  }

  return { cars, officers, roadblocks, spawnCar, spawnOfficer, spawnRoadblock, update, dispatch };
}
