// People for Vice Shores: multi-part low-poly figures with heads, torsos, arms and
// legs, varied heights and outfits, a walk swing, and uniformed police officers with
// caps who read as police at a glance.
import { WORLD } from './config.js';

const SKINS = [0xf2c89a, 0xd9a066, 0x8a5a32, 0xf2d0a8, 0xc98a5a];
const SHIRTS = [0xe74c3c, 0x2e6fb0, 0x39d0ff, 0xffe14d, 0x7ee081, 0xff5ea8, 0xf2e6c9, 0x9b59b6, 0xffffff, 0x1c1e22];
const PANTS = [0x2c3550, 0x3a3f47, 0x5a4632, 0x1c1e22, 0x7a8a99];

// One person: head, torso, two arms, two legs. `uniform` makes a police officer.
export function makePerson(THREE, rng, opts) {
  const o = opts || {};
  const person = new THREE.Group();
  const height = o.height || rng.range(1.65, 1.9);
  const skin = new THREE.MeshLambertMaterial({ color: o.skin ?? SKINS[rng.int(0, SKINS.length)] });
  const shirtMat = new THREE.MeshLambertMaterial({ color: o.shirt ?? SHIRTS[rng.int(0, SHIRTS.length)] });
  const pantsMat = new THREE.MeshLambertMaterial({ color: o.pants ?? PANTS[rng.int(0, PANTS.length)] });
  const s = height / 1.8;

  // Legs.
  const legGeo = new THREE.BoxGeometry(0.16 * s, 0.8 * s, 0.16 * s);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(-0.11 * s, 0.4 * s, 0);
  person.add(legL);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legR.position.set(0.11 * s, 0.4 * s, 0);
  person.add(legR);
  // Torso.
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.62 * s, 0.28 * s), shirtMat);
  torso.position.y = 1.11 * s;
  person.add(torso);
  // Arms.
  const armGeo = new THREE.BoxGeometry(0.13 * s, 0.6 * s, 0.13 * s);
  const armL = new THREE.Mesh(armGeo, shirtMat);
  armL.position.set(-0.33 * s, 1.12 * s, 0);
  person.add(armL);
  const armR = new THREE.Mesh(armGeo, shirtMat);
  armR.position.set(0.33 * s, 1.12 * s, 0);
  person.add(armR);
  // Head with hair.
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.32 * s, 0.3 * s), skin);
  head.position.y = 1.62 * s;
  person.add(head);
  const hair = new THREE.Mesh(
    new THREE.BoxGeometry(0.32 * s, 0.12 * s, 0.32 * s),
    new THREE.MeshLambertMaterial({ color: o.hair ?? 0x2a1a0e }),
  );
  hair.position.y = 1.8 * s;
  person.add(hair);
  if (o.uniform) {
    // Police: dark navy uniform, badge, and a peaked cap.
    torso.material = new THREE.MeshLambertMaterial({ color: 0x1d2a44 });
    armL.material = new THREE.MeshLambertMaterial({ color: 0x1d2a44 });
    armR.material = new THREE.MeshLambertMaterial({ color: 0x1d2a44 });
    legL.material = new THREE.MeshLambertMaterial({ color: 0x141c2e });
    legR.material = new THREE.MeshLambertMaterial({ color: 0x141c2e });
    const capTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19 * s, 0.2 * s, 0.09 * s, 8),
      new THREE.MeshLambertMaterial({ color: 0x141c2e }),
    );
    capTop.position.y = 1.84 * s;
    person.add(capTop);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.03 * s, 0.16 * s), new THREE.MeshLambertMaterial({ color: 0x0a0f1c }));
    brim.position.set(0, 1.8 * s, 0.18 * s);
    person.add(brim);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.12 * s, 0.02 * s), new THREE.MeshBasicMaterial({ color: 0xffd21f }));
    badge.position.set(-0.12 * s, 1.28 * s, 0.15 * s);
    person.add(badge);
  }
  person.userData.limbs = { legL, legR, armL, armR };
  person.userData.height = height;
  return person;
}

// Pedestrians walking the sidewalks in groups, crossing at corners.
export function createPedestrians(THREE, rng, scene, count) {
  const peds = [];
  // Sidewalk walking loops: rectangles around a few blocks.
  const loops = [
    { x0: -30, x1: 6, z0: -30, z1: 6 },
    { x0: 6, x1: 42, z0: 6, z1: 42 },
    { x0: -58, x1: -44, z0: -40, z1: 60 },
    { x0: 42, x1: 78, z0: -30, z1: 6 },
    { x0: 6, x1: 42, z0: -66, z1: -30 },
    { x0: 78, x1: 114, z0: 42, z1: 78 },
  ];
  for (let i = 0; i < count; i += 1) {
    const loop = loops[i % loops.length];
    const mesh = makePerson(THREE, rng, {});
    scene.add(mesh);
    // Start at a random point on the loop's edge.
    const edge = rng.int(0, 4);
    let x = loop.x0;
    let z = loop.z0;
    if (edge === 0) { x = rng.range(loop.x0, loop.x1); z = loop.z0; }
    if (edge === 1) { x = loop.x1; z = rng.range(loop.z0, loop.z1); }
    if (edge === 2) { x = rng.range(loop.x0, loop.x1); z = loop.z1; }
    if (edge === 3) { x = loop.x0; z = rng.range(loop.z0, loop.z1); }
    peds.push({
      mesh,
      loop,
      x,
      z,
      dir: rng.chance(0.5) ? 1 : -1,
      speed: rng.range(1.0, 1.9),
      phase: rng.range(0, Math.PI * 2),
      edge,
    });
    mesh.position.set(x, 0, z);
  }
  return {
    peds,
    update(dt, t) {
      for (const ped of peds) {
        const { loop } = ped;
        // Walk along the loop's edge, turning corners.
        let { x, z } = ped;
        const sp = ped.speed * ped.dir * dt;
        if (ped.edge === 0) { x += sp; if (x > loop.x1) { x = loop.x1; ped.edge = 1; } if (x < loop.x0) { x = loop.x0; ped.edge = 3; } }
        else if (ped.edge === 1) { z += sp; if (z > loop.z1) { z = loop.z1; ped.edge = 2; } if (z < loop.z0) { z = loop.z0; ped.edge = 0; } }
        else if (ped.edge === 2) { x -= sp; if (x < loop.x0) { x = loop.x0; ped.edge = 3; } if (x > loop.x1) { x = loop.x1; ped.edge = 1; } }
        else { z -= sp; if (z < loop.z0) { z = loop.z0; ped.edge = 0; } if (z > loop.z1) { z = loop.z1; ped.edge = 2; } }
        ped.x = x;
        ped.z = z;
        const heading = ped.edge === 0 ? Math.PI / 2 : ped.edge === 1 ? Math.PI : ped.edge === 2 ? -Math.PI / 2 : 0;
        ped.mesh.rotation.y = heading * (ped.dir > 0 ? 1 : -1) + (ped.dir > 0 ? 0 : Math.PI);
        ped.mesh.position.set(x, 0, z);
        // Walk swing.
        const swing = Math.sin(t * 7 + ped.phase) * 0.45;
        const limbs = ped.mesh.userData.limbs;
        limbs.legL.rotation.x = swing;
        limbs.legR.rotation.x = -swing;
        limbs.armL.rotation.x = -swing * 0.7;
        limbs.armR.rotation.x = swing * 0.7;
      }
    },
  };
}

export { WORLD };
