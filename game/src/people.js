// people.js — people built from explicit geometry: a capsule torso with a
// belt, a neck, a sphere head with nose/eyes/mouth and hair, cylinder+sphere
// limbs with hands and shoes, and a walk/run cycle. The hero Rook is a brown
// leather jacket over a shirt, blue jeans, and carries a pistol he can aim
// (parts.aim(true) raises the right arm into a two-hand aim pose).
const SKINS = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf2c9a0, 0x6b4226];
const SHIRTS = [0x3a6ac2, 0xc23a5a, 0x3a9a5a, 0xe8b83a, 0x7a3aa8, 0xe87a3a, 0x2a8a8a, 0xf2f2f2];
const PANTS = [0x2a2a3a, 0x3a3a4a, 0x5a4a3a, 0x6b7a8a];
const HAIRS = [0x1a1a1a, 0x4a2a1a, 0x8a6a3a, 0xaaaaaa, 0x6b3a1a];

export function makePerson(rand, opts = {}) {
  const detail = opts.detail || 'full';
  const group = new THREE.Group();
  const skin = opts.skin ?? SKINS[Math.floor(rand() * SKINS.length)];
  const shirt = opts.shirt ?? SHIRTS[Math.floor(rand() * SHIRTS.length)];
  const pants = opts.pants ?? PANTS[Math.floor(rand() * PANTS.length)];
  const hair = opts.hair ?? HAIRS[Math.floor(rand() * HAIRS.length)];
  const s = opts.scale ?? (0.92 + rand() * 0.16);
  group.scale.setScalar(s);

  if (detail === 'low') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.35), new THREE.MeshStandardMaterial({ color: shirt }));
    body.position.y = 1.0;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: skin }));
    head.position.y = 1.8;
    group.add(head);
    return { group, parts: {} };
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
  group.add(torso);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.34, 0.09, 12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
  belt.position.y = 0.88;
  group.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.03), new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 0.8, roughness: 0.3 }));
  buckle.position.set(0, 0.88, 0.33);
  group.add(buckle);

  // Legs: capsules pivoting at the hip, jeans in a distinct colour, shoes.
  const legs = [];
  for (const lx of [-0.14, 0.14]) {
    const legG = new THREE.Group();
    legG.position.set(lx, 0.85, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.55, 4, 8), pantsMat);
    leg.position.y = -0.35;
    leg.castShadow = true;
    legG.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.32), shoeMat);
    shoe.position.set(0, -0.8, 0.05);
    shoe.castShadow = true;
    legG.add(shoe);
    group.add(legG);
    legs.push(legG);
  }

  // Arms: capsules pivoting at the shoulder, hands as spheres.
  const arms = [];
  for (const ax of [-0.4, 0.4]) {
    const arm = new THREE.Group();
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8), shirtMat);
    a.position.y = -0.3;
    a.castShadow = true;
    arm.add(a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), skinMat);
    hand.position.y = -0.62;
    arm.add(hand);
    arm.position.set(ax, 1.45, 0);
    group.add(arm);
    arms.push(arm);
  }

  // Neck + head: a sphere with a nose, eyes, mouth and hair.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 8), skinMat);
  neck.position.y = 1.58;
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), skinMat);
  head.position.y = 1.82;
  head.castShadow = true;
  group.add(head);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  for (const ex of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeMat);
    eye.position.set(ex, 1.86, 0.23);
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), pupilMat);
    pupil.position.set(ex, 1.86, 0.265);
    group.add(pupil);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 6), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.78, 0.26);
  group.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0x7a3a2a }));
  mouth.position.set(0, 1.7, 0.25);
  group.add(mouth);

  // Hair variant: cap, short, long, or bun.
  const variant = opts.hairStyle ?? Math.floor(rand() * 4);
  if (variant === 0) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
    cap.position.y = 1.86;
    group.add(cap);
  } else if (variant === 1) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), hairMat);
    bun.position.set(0, 2.08, -0.12);
    group.add(bun);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat);
    cap.position.y = 1.86;
    group.add(cap);
  } else if (variant === 2) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.14), hairMat);
    back.position.set(0, 1.75, -0.2);
    group.add(back);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat);
    cap.position.y = 1.86;
    group.add(cap);
  } else {
    // Officer cap with brim.
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.29, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.6 }));
    capTop.position.y = 2.02;
    group.add(capTop);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.22), new THREE.MeshStandardMaterial({ color: 0x1a2a4a }));
    brim.position.set(0, 1.97, 0.28);
    group.add(brim);
  }

  // Pistol in the right hand (dark, always there; the aim pose raises it).
  const pistolMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 });
  const pistol = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), pistolMat);
  pistol.add(grip);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.22), pistolMat);
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
    group.add(badge);
  }
  if (opts.jacket) {
    // Rook: brown leather jacket (distinct from the jeans) + collar + a
    // muted white shirt showing under the open jacket.
    torso.material = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.55 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 6, 12), new THREE.MeshStandardMaterial({ color: 0x2a1608, roughness: 0.6 }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.5;
    group.add(collar);
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.06), new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.85 }));
    shirt.position.set(0, 1.18, 0.3);
    group.add(shirt);
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

  return { group, parts: { legs, arms, head, aim } };
}

export function createPedestrians(scene, rand, detail, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const { group, parts } = makePerson(rand, { detail });
    const x = -190 + rand() * 340;
    const z = -190 + rand() * 380;
    group.position.set(x, 0, z);
    group.rotation.y = rand() * Math.PI * 2;
    scene.add(group);
    peds.push({ group, parts, speed: 1 + rand() * 1.4, dir: rand() * Math.PI * 2, phase: rand() * 6, tx: x, tz: z });
  }
  function update(dt, t) {
    for (const p of peds) {
      if (p.fallen) continue; // lying on the ground (shot staging): frozen
      p.tx += Math.cos(p.dir) * p.speed * dt;
      p.tz += Math.sin(p.dir) * p.speed * dt;
      if (Math.abs(p.tx) > 200 || Math.abs(p.tz) > 205) p.dir += Math.PI / 2 + Math.random() * 0.6;
      p.group.position.x = p.tx;
      p.group.position.z = p.tz;
      p.group.rotation.y = -p.dir + Math.PI / 2;
      const sw = Math.sin(t * 6 + p.phase) * 0.5;
      if (p.parts.legs) {
        if (p.aiming) {
          // Enemy officer holding an aim pose (pistol up, stable stance).
          p.parts.legs[0].rotation.x = 0.18;
          p.parts.legs[1].rotation.x = -0.18;
          p.parts.arms[0].rotation.x = -0.7;
          p.parts.arms[0].rotation.z = 0.35;
          p.parts.arms[1].rotation.x = -1.35;
        } else {
          p.parts.legs[0].rotation.x = sw;
          p.parts.legs[1].rotation.x = -sw;
          p.parts.arms[0].rotation.x = -sw * 0.7;
          p.parts.arms[1].rotation.x = sw * 0.7;
        }
      }
    }
  }
  return { peds, update };
}
