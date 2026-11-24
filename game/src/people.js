import { pickOne, int } from './random.js';

export const SKINS = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf2c9a0, 0x6b4226];
export const SHIRTS = [
  0x3a6ac2, 0xc23a5a, 0x3a9a5a, 0xe8b83a,
  0x7a3aa8, 0xe87a3a, 0x2a8a8a, 0xf2f2f2,
];
export const PANTS = [0x2a2a3a, 0x3a3a4a, 0x5a4a3a, 0x6b7a8a];
export const HAIRS = [0x1a1a1a, 0x4a2a1a, 0x8a6a3a, 0xaaaaaa, 0x6b3a1a];

function capsule(r, len, mat) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat);
  m.castShadow = true;
  return m;
}

export function makePerson(opts = {}) {
  const detail = opts.detail ?? 'full';
  const jacket = opts.jacket ?? false;
  const officer = opts.officer ?? false;
  const shirtCol = officer ? 0x1a2a4a : (opts.shirt ?? 0x3a6ac2);
  const pantsCol = opts.pants ?? 0x2a2a3a;
  const skinCol = opts.skin ?? 0xe8b88a;
  const hairCol = opts.hair ?? 0x1a1a1a;
  const hairStyle = opts.hairStyle ?? 0;
  const scale = opts.scale ?? 1;

  const group = new THREE.Group();

  if (detail !== 'full') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: shirtCol, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), bodyMat);
    body.position.y = 1.1;
    group.add(body);
    const headMat = new THREE.MeshStandardMaterial({ color: skinCol, roughness: 0.8 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), headMat);
    head.position.y = 1.8;
    group.add(head);
    group.scale.setScalar(scale);
    return {
      group,
      aim() {},
      lieDown() {},
      leftArm: null, rightArm: null, leftLeg: null, rightLeg: null,
    };
  }

  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtCol, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsCol, roughness: 0.85 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinCol, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairCol, roughness: 0.9 });

  let torsoMat = shirtMat;
  if (jacket) {
    torsoMat = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.55 });
  } else if (officer) {
    torsoMat = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.85 });
  }
  const torso = capsule(0.32, 0.55, torsoMat);
  torso.position.y = 1.15;
  group.add(torso);

  const beltMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.34, 0.09, 14), beltMat);
  belt.position.y = 0.88;
  group.add(belt);
  const buckleMat = new THREE.MeshStandardMaterial({ color: 0xd8b25a, roughness: 0.3, metalness: 0.8 });
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.03), buckleMat);
  buckle.position.set(0, 0.88, 0.33);
  group.add(buckle);

  const legs = [];
  for (const sx of [-0.14, 0.14]) {
    const hip = new THREE.Group();
    hip.position.set(sx, 0.85, 0);
    const leg = capsule(0.13, 0.55, pantsMat);
    leg.position.y = -0.35;
    hip.add(leg);
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.32), shoeMat);
    shoe.position.set(0, -0.8, 0.05);
    hip.add(shoe);
    group.add(hip);
    legs.push(hip);
  }

  const sleeveMat = jacket
    ? new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.55 })
    : shirtMat;
  const arms = [];
  for (const sx of [-0.4, 0.4]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx, 1.45, 0);
    const arm = capsule(0.1, 0.5, sleeveMat);
    arm.position.y = -0.3;
    shoulder.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), skinMat);
    hand.position.y = -0.62;
    shoulder.add(hand);
    group.add(shoulder);
    arms.push(shoulder);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 10), skinMat);
  neck.position.y = 1.58;
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), skinMat);
  head.position.y = 1.82;
  head.castShadow = true;
  group.add(head);
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
  for (const sx of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeWhite);
    eye.position.set(sx, 1.86, 0.23);
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), pupilMat);
    pupil.position.set(sx, 1.86, 0.265);
    group.add(pupil);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.78, 0.26);
  group.add(nose);
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x7a3a2a, roughness: 0.8 });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), mouthMat);
  mouth.position.set(0, 1.7, 0.25);
  group.add(mouth);

  if (hairStyle === 0) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairMat,
    );
    cap.position.y = 1.86;
    group.add(cap);
  } else if (hairStyle === 1) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairMat,
    );
    cap.position.y = 1.86;
    group.add(cap);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), hairMat);
    bun.position.set(0, 2.08, -0.12);
    group.add(bun);
  } else if (hairStyle === 2) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairMat,
    );
    cap.position.y = 1.86;
    group.add(cap);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.14), hairMat);
    back.position.set(0, 1.75, -0.2);
    group.add(back);
  } else {
    const capMat = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.7 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.29, 0.12, 14), capMat);
    cap.position.y = 2.02;
    group.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.22), capMat);
    brim.position.set(0, 1.97, 0.28);
    group.add(brim);
  }

  const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.6 });
  const pistol = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), gunMat);
  pistol.add(grip);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.22), gunMat);
  barrel.position.set(0, 0.05, 0.12);
  pistol.add(barrel);
  pistol.position.set(0, -0.66, 0.06);
  pistol.rotation.x = Math.PI / 2;
  arms[1].add(pistol);

  if (officer) {
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0xf2c94c, roughness: 0.3, metalness: 0.8,
    });
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), badgeMat);
    badge.position.set(-0.16, 1.32, 0.31);
    group.add(badge);
  }

  if (jacket) {
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x2a1608, roughness: 0.7 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 16), collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.5;
    group.add(collar);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.85 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.06), panelMat);
    panel.position.set(0, 1.18, 0.3);
    group.add(panel);
  }

  group.scale.setScalar(scale);

  const leftArm = arms[0];
  const rightArm = arms[1];
  const leftLeg = legs[0];
  const rightLeg = legs[1];

  function aim(on) {
    if (on) {
      // Two-handed pistol stance: right arm extended, left arm bracing
      // across to support it, legs staggered in a combat crouch.
      rightArm.rotation.x = -1.35;
      leftArm.rotation.x = -1.05;
      leftArm.rotation.z = 0.55;
      leftLeg.rotation.x = 0.22;
      rightLeg.rotation.x = -0.22;
    } else {
      rightArm.rotation.x = 0;
      leftArm.rotation.x = 0;
      leftArm.rotation.z = 0;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
    }
  }

  // Fallen body: arms splayed out to the sides and legs slightly apart,
  // so a downed figure reads as a body on the ground rather than a
  // standing figure tipped over. The caller lays the whole group flat
  // (rotation.z = PI/2, y = 0.32) after calling this.
  function lieDown() {
    leftArm.rotation.z = 1.1;
    rightArm.rotation.z = -1.1;
    leftArm.rotation.x = 0.2;
    rightArm.rotation.x = 0.2;
    leftLeg.rotation.x = 0.25;
    rightLeg.rotation.x = -0.15;
    leftLeg.rotation.z = 0.15;
    rightLeg.rotation.z = -0.15;
  }

  return { group, leftArm, rightArm, leftLeg, rightLeg, aim, lieDown };
}

export function makeRook() {
  const rook = makePerson({
    detail: 'full', jacket: true, shirt: 0x6b4423, hairStyle: 0,
    skin: 0xe8b88a, hair: 0x1a1a1a, pants: 0x2a3a5a, scale: 1,
  });
  rook.group.position.set(148, 0, -18);
  rook.group.visible = false;
  return rook;
}

export function makePedestrians(rng) {
  const peds = [];
  for (let i = 0; i < 26; i++) {
    const skin = pickOne(rng, SKINS);
    const shirt = pickOne(rng, SHIRTS);
    const pants = pickOne(rng, PANTS);
    const hair = pickOne(rng, HAIRS);
    const hairStyle = int(rng, 0, 4);
    const scale = 0.92 + rng() * 0.16;
    const x = -190 + rng() * 340;
    const z = -190 + rng() * 380;
    const rot = rng() * Math.PI * 2;
    const speed = 1 + rng() * 1.4;
    const walkDir = rng() * Math.PI * 2;
    const phase = rng() * Math.PI * 2;
    const person = makePerson({
      detail: 'full', skin, shirt, pants, hair, hairStyle, scale,
    });
    person.group.position.set(x, 0, z);
    person.group.rotation.y = rot;
    peds.push({
      ...person,
      speed,
      phase,
      walkDir,
      target: { x: x + Math.sin(walkDir) * 30, z: z + Math.cos(walkDir) * 30 },
      fallen: false,
    });
  }
  return peds;
}

export function updatePedestrians(peds, dt, time) {
  for (const p of peds) {
    if (p.fallen) continue;
    const g = p.group;
    const dx = p.target.x - g.position.x;
    const dz = p.target.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1) {
      const ang = Math.random() * Math.PI * 2;
      p.target.x = THREE.MathUtils.clamp(g.position.x + Math.sin(ang) * 40, -200, 200);
      p.target.z = THREE.MathUtils.clamp(g.position.z + Math.cos(ang) * 40, -200, 225);
      continue;
    }
    const vx = (dx / dist) * p.speed * dt;
    const vz = (dz / dist) * p.speed * dt;
    const nx = g.position.x + vx;
    const nz = g.position.z + vz;
    if (Math.abs(nx) > 208 || nz < -208 || nz > 232) {
      const ang = Math.random() * Math.PI * 2;
      p.target.x = THREE.MathUtils.clamp(g.position.x + Math.sin(ang) * 40, -200, 200);
      p.target.z = THREE.MathUtils.clamp(g.position.z + Math.cos(ang) * 40, -200, 225);
      continue;
    }
    g.position.x = nx;
    g.position.z = nz;
    g.rotation.y = Math.atan2(dx, dz);
    const swing = Math.sin(time * 6 + p.phase) * 0.5;
    p.leftLeg.rotation.x = swing;
    p.rightLeg.rotation.x = -swing;
    p.leftArm.rotation.x = -swing * 0.7;
    p.rightArm.rotation.x = swing * 0.7;
  }
}
