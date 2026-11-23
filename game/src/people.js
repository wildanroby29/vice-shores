// people.js — people built from explicit geometry: a capsule torso with a
// belt, a neck, a sphere head with nose/eyes/mouth and hair, cylinder+sphere
// limbs with hands and shoes, and a walk/run cycle. The hero Rook is a brown
// leather jacket over a shirt, blue jeans, and carries a pistol he can aim
// (parts.aim(true) raises the right arm into a two-hand aim pose).
const SKINS = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf2c9a0, 0x6b4226];
const SHIRTS = [0x3a6ac2, 0xc23a5a, 0x3a9a5a, 0xe8b83a, 0x7a3aa8, 0xe87a3a, 0x2a8a8a, 0xf2f2f2];
const PANTS = [0x2a2a3a, 0x3a3a4a, 0x5a4a3a, 0x6b7a8a];
const HAIRS = [0x1a1a1a, 0x4a2a1a, 0x8a6a3a, 0xaaaaaa, 0x6b3a1a];

export function makePerson(rng, opts = {}) {
  const level = opts.detail || 'full';
  const grp = new THREE.Group();
  const skin = opts.skin ?? SKINS[Math.floor(rng() * SKINS.length)];
  const shirt = opts.shirt ?? SHIRTS[Math.floor(rng() * SHIRTS.length)];
  const pants = opts.pants ?? PANTS[Math.floor(rng() * PANTS.length)];
  const hair = opts.hair ?? HAIRS[Math.floor(rng() * HAIRS.length)];
  const scale = opts.scale ?? (0.92 + rng() * 0.16);
  grp.scale.setScalar(scale);

  if (level === 'low') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.35), new THREE.MeshStandardMaterial({ color: shirt }));
    body.position.y = 1.0;
    grp.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: skin }));
    head.position.y = 1.8;
    grp.add(head);
    return { group: grp, parts: {} };
  }

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.85, envMapIntensity: 0.35 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.95 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });

  // Torso: a rounded capsule. A belt band at the waist separates it from
  // the jeans, so the figure reads as two garments, not one block.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 4, 10), shirtMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  grp.add(torso);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.34, 0.09, 12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
  belt.position.y = 0.88;
  grp.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.03), new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 0.8, roughness: 0.3 }));
  buckle.position.set(0, 0.88, 0.33);
  grp.add(buckle);

  // Legs: capsules pivoting at the hip, jeans in a distinct colour, shoes.
  const legs = [];
  for (const lx of [-0.14, 0.14]) {
    const legGroup = new THREE.Group();
    legGroup.position.set(lx, 0.85, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.55, 4, 8), pantsMat);
    leg.position.y = -0.35;
    leg.castShadow = true;
    legGroup.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.32), shoeMat);
    shoe.position.set(0, -0.8, 0.05);
    shoe.castShadow = true;
    legGroup.add(shoe);
    grp.add(legGroup);
    legs.push(legGroup);
  }

  // Arms: capsules pivoting at the shoulder, hands as spheres.
  const arms = [];
  for (const ax of [-0.4, 0.4]) {
    const arm = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8), shirtMat);
    limb.position.y = -0.3;
    limb.castShadow = true;
    arm.add(limb);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), skinMat);
    hand.position.y = -0.62;
    arm.add(hand);
    arm.position.set(ax, 1.45, 0);
    grp.add(arm);
    arms.push(arm);
  }

  // Neck + head: a sphere with a nose, eyes, mouth and hair.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 8), skinMat);
  neck.position.y = 1.58;
  grp.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), skinMat);
  head.position.y = 1.82;
  head.castShadow = true;
  grp.add(head);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  for (const ex of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeMat);
    eye.position.set(ex, 1.86, 0.23);
    grp.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), pupilMat);
    pupil.position.set(ex, 1.86, 0.265);
    grp.add(pupil);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 6), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.78, 0.26);
  grp.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0x7a3a2a }));
  mouth.position.set(0, 1.7, 0.25);
  grp.add(mouth);

  // Hair variant: cap, short, long, or bun.
  const style = opts.hairStyle ?? Math.floor(rng() * 4);
  if (style === 0) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
    cap.position.y = 1.86;
    grp.add(cap);
  } else if (style === 1) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), hairMat);
    bun.position.set(0, 2.08, -0.12);
    grp.add(bun);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat);
    cap.position.y = 1.86;
    grp.add(cap);
  } else if (style === 2) {
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.14), hairMat);
    mane.position.set(0, 1.75, -0.2);
    grp.add(mane);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat);
    cap.position.y = 1.86;
    grp.add(cap);
  } else {
    // Officer cap with brim.
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.29, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.6 }));
    crown.position.y = 2.02;
    grp.add(crown);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.22), new THREE.MeshStandardMaterial({ color: 0x1a2a4a }));
    brim.position.set(0, 1.97, 0.28);
    grp.add(brim);
  }

  // Pistol in the right hand (dark, always there; the aim pose raises it).
  const gun = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 });
  const pistol = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), gun);
  pistol.add(grip);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.22), gun);
  barrel.position.set(0, 0.05, 0.12);
  pistol.add(barrel);
  pistol.position.set(0, -0.66, 0.06);
  pistol.rotation.x = Math.PI / 2;
  arms[1].add(pistol);

  if (opts.officer) {
    // Police uniform: dark navy shirt + badge + belt.
    torso.material = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.8 });
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.06, 10), new THREE.MeshStandardMaterial({ color: 0xf2c94c, metalness: 0.8, roughness: 0.3 }));
    badge.position.set(-0.16, 1.32, 0.31);
    grp.add(badge);
  }
  if (opts.jacket) {
    // Rook: brown leather jacket (distinct from the jeans) + collar + a
    // muted white shirt showing under the open jacket.
    torso.material = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.55 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 6, 12), new THREE.MeshStandardMaterial({ color: 0x2a1608, roughness: 0.6 }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.5;
    grp.add(collar);
    const undershirt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.06), new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.85 }));
    undershirt.position.set(0, 1.18, 0.3);
    grp.add(undershirt);
    // Jacket sleeves match the jacket, not the shirt.
    for (const arm of arms) {
      arm.children[0].material = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.55 });
    }
  }

  // Aim pose: right arm forward (pistol up), left arm across to support,
  // feet in a stable stance. Call with false to lower the weapon.
  function aim(on) {
    if (on) {
      arms[1].rotation.x = -1.35;
      arms[0].rotation.x = -0.7;
      arms[0].rotation.z = 0.35;
      legs[0].rotation.x = 0.18;
      legs[1].rotation.x = -0.18;
    } else {
      arms[1].rotation.x = 0;
      arms[0].rotation.x = 0;
      arms[0].rotation.z = 0;
      legs[0].rotation.x = 0;
      legs[1].rotation.x = 0;
    }
  }

  return { group: grp, parts: { legs, arms, head, aim } };
}

export function createPedestrians(scn, rng, level, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const { group, parts } = makePerson(rng, { detail: level });
    const x = -190 + rng() * 340;
    const z = -190 + rng() * 380;
    group.position.set(x, 0, z);
    group.rotation.y = rng() * Math.PI * 2;
    scn.add(group);
    peds.push({ group, parts, speed: 1 + rng() * 1.4, dir: rng() * Math.PI * 2, phase: rng() * 6, tx: x, tz: z });
  }
  function update(dt, t) {
    for (const ped of peds) {
      if (ped.fallen) continue; // lying on the ground (shot staging): frozen
      ped.tx += Math.cos(ped.dir) * ped.speed * dt;
      ped.tz += Math.sin(ped.dir) * ped.speed * dt;
      if (Math.abs(ped.tx) > 200 || Math.abs(ped.tz) > 205) ped.dir += Math.PI / 2 + Math.random() * 0.6;
      ped.group.position.x = ped.tx;
      ped.group.position.z = ped.tz;
      ped.group.rotation.y = -ped.dir + Math.PI / 2;
      const swing = Math.sin(t * 6 + ped.phase) * 0.5;
      if (ped.parts.legs) {
        if (ped.aiming) {
          // Enemy officer holding an aim pose (pistol up, stable stance).
          ped.parts.legs[0].rotation.x = 0.18;
          ped.parts.legs[1].rotation.x = -0.18;
          ped.parts.arms[0].rotation.x = -0.7;
          ped.parts.arms[0].rotation.z = 0.35;
          ped.parts.arms[1].rotation.x = -1.35;
        } else {
          ped.parts.legs[0].rotation.x = swing;
          ped.parts.legs[1].rotation.x = -swing;
          ped.parts.arms[0].rotation.x = -swing * 0.7;
          ped.parts.arms[1].rotation.x = swing * 0.7;
        }
      }
    }
  }
  return { peds, update };
}
