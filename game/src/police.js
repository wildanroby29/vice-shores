// The wanted system for Vice Shores: stars that rise on crime, police cars that
// chase and ram, a helicopter with a spotlight at 4-5 stars, roadblocks at 3+, and
// the named dispatch panel the HUD shows.
import { makeCar } from './vehicles.js';
import { makePerson } from './people.js';

const TACTICS = ['RAMMING', 'FLANKING', 'PIT', 'ROADBLOCK', 'SPOTLIGHT', 'CHASING'];
const UNIT_NAMES = ['VSPD-23', 'VSPD-19', 'VSPD-07', 'VSPD-14', 'VSPD-21', 'VSPD-28', 'VSPD-12', 'VSPD-31', 'VSPD-04', 'VSPD-17'];

export function createPolice(THREE, rng, scene) {
  const units = [];
  let heli = null;
  let heliBeam = null;
  let heliPool = null;
  let roadblocks = [];

  function spawnUnit(px, pz, index) {
    const mesh = makeCar(THREE, rng, 'police');
    const angle = rng.range(0, Math.PI * 2);
    mesh.position.set(px + Math.cos(angle) * rng.range(18, 30), 0, pz + Math.sin(angle) * rng.range(18, 30));
    scene.add(mesh);
    const unit = {
      mesh,
      name: UNIT_NAMES[index % UNIT_NAMES.length],
      tactic: TACTICS[rng.int(0, TACTICS.length)],
      speed: rng.range(13, 17),
      ramTimer: 0,
    };
    units.push(unit);
    return unit;
  }

  function spawnHeli(px, pz) {
    if (heli) return;
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c1e22 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 1.8), bodyMat);
    body.position.y = 0;
    g.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.6), new THREE.MeshLambertMaterial({ color: 0x1a2436, emissive: 0x0a1626 }));
    nose.position.set(1.9, -0.1, 0);
    g.add(nose);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.5), bodyMat);
    tail.position.set(-3.0, 0.3, 0);
    g.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 0.9), new THREE.MeshLambertMaterial({ color: 0xc0392b }));
    fin.position.set(-4.6, 0.8, 0);
    g.add(fin);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.5), darkMat);
    rotor.position.y = 1.0;
    g.add(rotor);
    const rotor2 = rotor.clone();
    rotor2.rotation.y = Math.PI / 2;
    g.add(rotor2);
    const skidMat = new THREE.MeshLambertMaterial({ color: 0x2c2f36 });
    for (const side of [-0.8, 0.8]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.12), skidMat);
      skid.position.set(0, -1.0, side);
      g.add(skid);
      for (const px of [-0.8, 0.8]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), skidMat);
        strut.position.set(px, -0.75, side);
        g.add(strut);
      }
    }
    // Red beacon.
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    beacon.position.set(0, -0.85, 0);
    g.add(beacon);
    // Spotlight: a narrow cone from the belly to the ground, faint enough to
    // read as light, never as a wall. ConeGeometry's apex is at the top, so with
    // no rotation the narrow end sits at the helicopter and the wide end opens
    // onto the ground.
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(2.4, 16, 12, 1, true), beamMat);
    beam.position.y = -8.6;
    g.add(beam);
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.4, depthWrite: false }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -16.4;
    g.add(pool);
    g.position.set(px + 14, 17, pz - 10);
    scene.add(g);
    heli = { group: g, rotor, rotor2, beam, pool, beacon };
    heliBeam = beam;
    heliPool = pool;
  }

  function spawnRoadblock(px, pz) {
    const block = new THREE.Group();
    for (const off of [-2.4, 0, 2.4]) {
      const car = makeCar(THREE, rng, 'police');
      car.position.set(off, 0, 0);
      car.rotation.y = Math.PI / 2;
      block.add(car);
    }
    block.position.set(px, 0, pz);
    scene.add(block);
    roadblocks.push(block);
    return block;
  }

  function clearRoadblocks() {
    for (const b of roadblocks) scene.remove(b);
    roadblocks = [];
  }

  function removeHeli() {
    if (!heli) return;
    scene.remove(heli.group);
    heli = null;
    heliBeam = null;
    heliPool = null;
  }

  return {
    units,
    get heli() { return heli; },
    get roadblocks() { return roadblocks; },
    // How many units the wanted level wants on the street.
    wantedUnits(wanted) {
      return [0, 1, 2, 3, 5, 7][Math.max(0, Math.min(5, wanted))];
    },
    sync(px, pz, wanted, dt, t) {
      const want = this.wantedUnits(wanted);
      while (units.length < want) spawnUnit(px, pz, units.length);
      while (units.length > want) {
        const u = units.pop();
        scene.remove(u.mesh);
      }
      if (wanted >= 4) spawnHeli(px, pz);
      else removeHeli();
      if (wanted >= 3 && roadblocks.length === 0) {
        spawnRoadblock(px + 20, pz - 14);
        spawnRoadblock(px - 18, pz + 16);
      }
      if (wanted < 3) clearRoadblocks();
      // Chase and ram.
      for (const unit of units) {
        const dx = px - unit.mesh.position.x;
        const dz = pz - unit.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        const heading = Math.atan2(-dz, dx);
        let diff = heading - unit.mesh.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        unit.mesh.rotation.y += diff * Math.min(1, dt * 3.2);
        const speed = unit.tactic === 'RAMMING' && dist < 14 ? unit.speed * 1.35 : unit.speed;
        unit.mesh.position.x += Math.cos(unit.mesh.rotation.y) * speed * dt;
        unit.mesh.position.z -= Math.sin(unit.mesh.rotation.y) * speed * dt;
        unit.ramTimer = Math.max(0, unit.ramTimer - dt);
      }
      // Helicopter follows, rotor spins, beam stays on the player.
      if (heli) {
        const target = { x: px + 12, z: pz - 8 };
        heli.group.position.x += (target.x - heli.group.position.x) * Math.min(1, dt * 0.8);
        heli.group.position.z += (target.z - heli.group.position.z) * Math.min(1, dt * 0.8);
        heli.group.position.y = 17 + Math.sin(t * 0.9) * 0.6;
        heli.rotor.rotation.y += dt * 22;
        heli.rotor2.rotation.y += dt * 22;
        heli.beacon.material.color.setHex(Math.sin(t * 9) > 0 ? 0xff2222 : 0x661111);
        // Aim the beam at the player: tilt the cone from the heli down to the player.
        const hx = heli.group.position.x;
        const hz = heli.group.position.z;
        const dx = px - hx;
        const dz = pz - hz;
        const len = Math.hypot(dx, dz);
        heli.beam.rotation.z = Math.atan2(dx, 17) * 0.35;
        heli.beam.rotation.x = Math.atan2(-dz, 17) * 0.35;
        heli.pool.position.x = dx * 0.92;
        heli.pool.position.z = dz * 0.92;
        heli.pool.position.y = -16.4;
        void len;
      }
    },
    // The dispatch panel rows for the HUD: each unit with distance and tactic.
    dispatchRows(px, pz) {
      return units.map((u) => ({
        name: u.name,
        dist: Math.round(Math.hypot(px - u.mesh.position.x, pz - u.mesh.position.z)),
        tactic: u.tactic,
      }));
    },
    clear() {
      for (const u of units) scene.remove(u.mesh);
      units.length = 0;
      removeHeli();
      clearRoadblocks();
    },
    // Officers on foot for the on-foot shot staging.
    spawnOfficers(scene2, positions) {
      const officers = [];
      for (const pos of positions) {
        const officer = makePerson(THREE, rng, { uniform: true, height: 1.85 });
        officer.position.set(pos.x, 0, pos.z);
        officer.rotation.y = pos.heading || 0;
        scene2.add(officer);
        officers.push(officer);
      }
      return officers;
    },
  };
}
