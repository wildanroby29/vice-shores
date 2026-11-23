// police.js — the wanted system: police cars that chase, ram and flank, a
// helicopter with a tapered body, spinning rotor with motion-blur disc, a
// spotlight cone and a bright ground circle, plus roadblocks and the
// dispatch ticker data (unit name, distance, tactic).
import { makePoliceCar } from './vehicles.js';
import { makePerson } from './people.js';

const TACTICS = ['RAMMING', 'FLANKING', 'PIT', 'ROADBLOCK', 'SPOTLIGHT', 'PURSUIT'];
const UNIT_NAMES = ['UNIT 7', 'UNIT 12', 'UNIT 4', 'UNIT 21', 'UNIT 9', 'UNIT 15'];

export function createHelicopter(scn, level) {
  const grp = new THREE.Group();
  if (level === 'low') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x2a2a3a }));
    grp.add(body);
    return { group: grp, rotor: null, beam: null, pool: null, update() {} };
  }
  // Fresh fuselage: an extruded side profile (nose at +Z after the
  // rotate, so group.lookAt points the nose at the target), tapered from a
  // roomy cabin to a slim tail — a distinct silhouette, not an ellipsoid.
  // WHITE body with a BLACK cheatline (Tem 23:08 WIB — was steel blue-grey
  // 0x6b7a8f with a white belly stripe); the white reads clearly against
  // the night sky and the black stripe + black tail fin keep it defined.
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.4 });
  function extrudeProfile(pts, beam, bevel, material) {
    const outline = new THREE.Shape();
    outline.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 1) outline.lineTo(pts[i][0], pts[i][1]);
    outline.closePath();
    const depth = Math.max(0.05, beam - bevel * 2);
    const form = new THREE.ExtrudeGeometry(outline, {
      depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1,
    });
    form.rotateY(-Math.PI / 2);
    form.translate(depth / 2, 0, 0);
    form.computeVertexNormals();
    const part = new THREE.Mesh(form, material);
    part.castShadow = true;
    return part;
  }
  const body = extrudeProfile(
    [[2.6, -0.4], [2.7, 0.2], [2.0, 0.9], [0.6, 1.1], [-1.4, 1.0], [-2.4, 0.4], [-2.5, -0.3], [-1.2, -0.8], [1.0, -0.9]],
    1.9, 0.12, bodyMat,
  );
  grp.add(body);
  const stripe = extrudeProfile(
    [[2.55, -0.15], [2.6, 0.15], [-2.35, 0.15], [-2.4, -0.15]],
    1.96, 0.04, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 }),
  );
  grp.add(stripe);
  // Glass canopy: a sloped wedge over the nose, dark and glossy.
  const canopy = extrudeProfile(
    [[2.5, -0.3], [2.35, 0.7], [1.0, 1.0], [1.0, -0.3]],
    1.6, 0.06, new THREE.MeshPhysicalMaterial({ color: 0x0e1a24, roughness: 0.05, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.1, transparent: true, opacity: 0.96 }),
  );
  grp.add(canopy);
  // Tail boom + fin + tail rotor (tail extends to -Z).
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, 3.4, 8), bodyMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.1, -4.0);
  boom.castShadow = true;
  grp.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.9), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }));
  fin.position.set(0, 0.6, -5.5);
  grp.add(fin);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.25, 0.6, -5.5);
  const tailBlade = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const ang of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 0.22), tailBlade);
    blade.rotation.x = ang;
    tailRotor.add(blade);
  }
  grp.add(tailRotor);
  // Skids: two rails under the belly + struts up to the fuselage.
  const skid = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const sx of [-0.85, 0.85]) {
    const skidRail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 6), skid);
    skidRail.rotation.x = Math.PI / 2;
    skidRail.position.set(sx, -1.3, 0.2);
    grp.add(skidRail);
    for (const sz of [-0.9, 1.3]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6), skid);
      strut.position.set(sx, -1.0, sz);
      strut.rotation.z = sx > 0 ? 0.5 : -0.5;
      grp.add(strut);
    }
  }
  // Main rotor + translucent motion-blur disc.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  mast.position.y = 1.3;
  grp.add(mast);
  const rotor = new THREE.Group();
  rotor.position.y = 1.65;
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.5 });
  for (const ang of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9, 0.06, 0.4), bladeMat);
    blade.rotation.y = ang;
    rotor.add(blade);
  }
  grp.add(rotor);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.5, 24), new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 1.66;
  grp.add(disc);
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
  grp.add(beam);
  const poolCv = document.createElement('canvas');
  poolCv.width = 128;
  poolCv.height = 128;
  const g2 = poolCv.getContext('2d');
  const gradient = g2.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,242,200,0.9)');
  gradient.addColorStop(0.45, 'rgba(255,242,200,0.35)');
  gradient.addColorStop(1, 'rgba(255,242,200,0)');
  g2.fillStyle = gradient;
  g2.fillRect(0, 0, 128, 128);
  const poolMap = new THREE.CanvasTexture(poolCv);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.0, 24), new THREE.MeshBasicMaterial({ map: poolMap, color: 0xfff2c8, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -33.8;
  grp.add(pool);
  const spot = new THREE.SpotLight(0xfff2c8, 1.6, 60, 0.28, 0.5); // dimmed (Part 1.3 + hotfix): the beam was blowing the hero's roof/hood to white; the pool mesh still gives the ground glow
  spot.position.set(0, 0, 0);
  spot.target = pool;
  grp.add(spot);
  grp.add(spot.target);
  // Bright lamp glow at the beam's origin (so the helicopter reads at night)
  // + red/green navigation lights on the tail + a white strobe that blinks.
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: poolMap, color: 0xfff2c8, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  lampGlow.position.set(0, -1.4, 0);
  lampGlow.scale.set(3, 3, 1);
  grp.add(lampGlow);
  // Rim light: a thin emissive strip along the fuselage top so the steel
  // body separates from the dark sky at night.
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 4.6), new THREE.MeshStandardMaterial({ color: 0xdfe8f2, emissive: 0xbcccdc, emissiveIntensity: 0.9 }));
  rim.position.set(0, 1.12, -0.2);
  grp.add(rim);
  const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 3 }));
  navLight.position.set(-0.28, 1.3, -5.5);
  grp.add(navLight);
  const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: 0x20ff60, emissive: 0x20ff60, emissiveIntensity: 3 }));
  navGreen.position.set(0.28, 1.3, -5.5);
  grp.add(navGreen);
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4 }));
  strobe.position.set(0, 0.7, -5.85);
  grp.add(strobe);

  // Aim the cone + pool at a target (used by update() every frame, and by the
  // chase screenshot staging to lock the beam on the hero after positioning).
  function aimAt(targetPos) {
    const vec = new THREE.Vector3(targetPos.x - grp.position.x, -grp.position.y + 0.2, targetPos.z - grp.position.z);
    const len = vec.length();
    const dir = vec.clone().normalize();
    beam.position.copy(dir.clone().multiplyScalar(len / 2));
    beam.scale.set(1, len / 34, 1);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    pool.position.set(vec.x, -grp.position.y + 0.2, vec.z);
    spot.target.position.set(vec.x, -grp.position.y + 0.2, vec.z);
  }

  // A held hover position (screenshot staging): the heli stays there instead
  // of drifting back to its default hover behind the target.
  let hold = null;
  function setHold(x, y, z) {
    hold = new THREE.Vector3(x, y, z);
  }
  function clearHold() {
    hold = null;
  }

  function update(dt, t, targetPos) {
    rotor.rotation.y += dt * 22;
    tailRotor.rotation.x += dt * 30;
    // White strobe: double-blink (bright for ~0.1 s every ~1 s).
    strobe.material.emissiveIntensity = (t % 1.0) < 0.1 ? 6 : 0.4;
    if (targetPos) {
      // Hover above and slightly behind the target (or at the held spot),
      // beam locked on it.
      const hover = hold || new THREE.Vector3(targetPos.x - 8, 34, targetPos.z + 10);
      grp.position.lerp(hover, 0.02);
      aimAt(targetPos);
    }
  }
  return { group: grp, rotor, beam, pool, update, aimAt, setHold, clearHold };
}

export function createPolice(scn, rng, level) {
  const cars = [];
  const officers = [];
  const roadblocks = [];

  function spawnCar(x, z, tactic) {
    const { group } = makePoliceCar(level);
    group.position.set(x, 0, z);
    scn.add(group);
    const car = { group, tactic: tactic || TACTICS[Math.floor(rng() * TACTICS.length)], name: UNIT_NAMES[cars.length % UNIT_NAMES.length], speed: 22 + rng() * 6 };
    cars.push(car);
    return car;
  }

  function spawnOfficer(x, z) {
    const { group, parts } = makePerson(rng, { detail: level, officer: true, hairStyle: 3, shirt: 0x1a2a4a });
    group.position.set(x, 0, z);
    scn.add(group);
    const officer = { group, parts };
    officers.push(officer);
    return officer;
  }

  function spawnRoadblock(x, z, rotY) {
    const block = new THREE.Group();
    for (let i = -1; i <= 1; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.5), new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xe8e8e8 : 0xc23a2e }));
      bar.position.set(i * 1.9, 0.45, 0);
      bar.castShadow = true;
      block.add(bar);
    }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0xe87a3a }));
    cone.position.set(3.4, 0.45, 0);
    block.add(cone);
    block.position.set(x, 0, z);
    block.rotation.y = rotY;
    scn.add(block);
    roadblocks.push(block);
    return block;
  }

  function update(dt, t, heroPos, wanted) {
    for (const car of cars) {
      const dx = heroPos.x - car.group.position.x;
      const dz = heroPos.z - car.group.position.z;
      const d = Math.hypot(dx, dz) || 1;
      const angle = Math.atan2(dx, dz);
      let heading = car.group.rotation.y;
      let gap = angle - heading;
      while (gap > Math.PI) gap -= Math.PI * 2;
      while (gap < -Math.PI) gap += Math.PI * 2;
      heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, gap));
      car.group.rotation.y = heading;
      const speed = wanted > 0 ? car.speed : 0;
      car.group.position.x += Math.sin(heading) * speed * dt;
      car.group.position.z += Math.cos(heading) * speed * dt;
      const flash = car.group.userData.flash;
      if (flash) {
        const on = Math.sin(t * 10 + flash.phase) > 0;
        flash.red.material.emissiveIntensity = on ? 3 : 0.2;
        flash.blue.material.emissiveIntensity = on ? 0.2 : 3;
        flash.light.color.setHex(on ? 0xff2020 : 0x2040ff);
        flash.light.intensity = 6 + Math.sin(t * 10) * 3; // dimmed (Part 1.3): 8-20 was blowing the hero's roof/hood to white; the emissive lenses still read as flashing
      }
    }
  }

  function dispatch(heroPos) {
    return cars.slice(0, 3).map((car) => {
      const dist = Math.round(Math.hypot(heroPos.x - car.group.position.x, heroPos.z - car.group.position.z));
      return { name: car.name, dist, tactic: car.tactic };
    });
  }

  return { cars, officers, roadblocks, spawnCar, spawnOfficer, spawnRoadblock, update, dispatch };
}
