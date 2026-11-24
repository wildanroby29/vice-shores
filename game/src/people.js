// People: parametric pedestrians with walk cycles, clusters, and fleeing.
const THREE = window.THREE;
import { mulberry32 } from './city.js';
const SHIRTS = [0xe84a4a, 0x4a8ae8, 0x4ae88a, 0xe8c84a, 0x9a5ae8, 0xe88a4a, 0x4ad8e8, 0xe8e8e8, 0x3a3a3a, 0x8affc8];
const SKINS = [0xc89878, 0x8a5a3a, 0xe8b898, 0x6a4a2a, 0xd8a888];
const PANTS = [0x2a3a5a, 0x3a3a3a, 0x5a4a3a, 0x2a5a3a, 0x6a6a6a];
export function makePerson(rng) {
  const g = new THREE.Group();
  const shirt = SHIRTS[Math.floor(rng() * SHIRTS.length)];
  const skin = SKINS[Math.floor(rng() * SKINS.length)];
  const pants = PANTS[Math.floor(rng() * PANTS.length)];
  const shirtM = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const skinM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const pantsM = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.72, 8), shirtM);
  torso.position.y = 1.05; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skinM);
  head.position.y = 1.62; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), new THREE.MeshStandardMaterial({ color: rng() < 0.5 ? 0x1a1a1a : 0x4a2a1a, roughness: 0.9 }));
  hair.position.y = 1.72; hair.scale.set(1, 0.6, 1); g.add(hair);
  const arms = [], legs = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.62, 6), shirtM);
    arm.position.set(sx * 0.34, 1.05, 0); arm.castShadow = true; g.add(arm); arms.push(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), skinM);
    hand.position.set(sx * 0.34, 0.72, 0); g.add(hand);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.66, 6), pantsM);
    leg.position.set(sx * 0.13, 0.36, 0); leg.castShadow = true; g.add(leg); legs.push(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.3), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }));
    shoe.position.set(sx * 0.13, 0.05, 0.05); g.add(shoe);
  }
  g.userData.parts = { arms, legs, torso, head };
  g.userData.phase = rng() * Math.PI * 2;
  g.userData.speed = 0.8 + rng() * 0.9;
  g.userData.flee = false;
  return g;
}
const people = [];
export function spawnPeople(scene, count, clusters) {
  const rng = mulberry32(21);
  for (let i = 0; i < count; i++) {
    const p = makePerson(rng);
    let x, z;
    if (clusters && i < clusters.length * 4) {
      const c = clusters[Math.floor(i / 4)];
      x = c[0] + (rng() - 0.5) * 8; z = c[1] + (rng() - 0.5) * 8;
    } else {
      x = -150 + rng() * 300; z = -150 + rng() * 300;
    }
    p.position.set(x, 0, z);
    p.rotation.y = rng() * Math.PI * 2;
    p.userData.home = [x, z];
    p.userData.dir = rng() * Math.PI * 2;
    scene.add(p); people.push(p);
  }
  return people;
}
export function updatePeople(dt, dangerPos, danger) {
  for (const p of people) {
    const u = p.userData;
    let sp = u.speed;
    if (danger && dangerPos) {
      const dx = p.position.x - dangerPos.x, dz = p.position.z - dangerPos.z;
      const d = Math.hypot(dx, dz);
      if (d < 26) { u.flee = true; u.dir = Math.atan2(dx, dz); sp = 3.2; }
      else u.flee = false;
    }
    if (!u.flee && Math.random() < dt * 0.1) u.dir += (Math.random() - 0.5) * 1.4;
    p.position.x += Math.sin(u.dir) * sp * dt;
    p.position.z += Math.cos(u.dir) * sp * dt;
    if (p.position.x > 165 || p.position.x < -165) u.dir = Math.PI - u.dir;
    if (p.position.z > 165 || p.position.z < -165) u.dir = -u.dir;
    p.rotation.y = u.dir;
    u.phase += dt * (u.flee ? 11 : 6);
    const sw = Math.sin(u.phase) * 0.55;
    u.parts.arms[0].rotation.x = sw; u.parts.arms[1].rotation.x = -sw;
    u.parts.legs[0].rotation.x = -sw; u.parts.legs[1].rotation.x = sw;
    u.parts.torso.position.y = 1.05 + Math.abs(Math.sin(u.phase)) * 0.04;
  }
}
export function getPeople() { return people; }
