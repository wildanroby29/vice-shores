// Vehicles: one parametric car builder, traffic, damage with dents and smoke.
const THREE = window.THREE;
export const VEHICLE_TYPES = {
  gt: { name: 'GT', color: 0xff6a1a, len: 4.6, wid: 2.0, top: 1.35, speed: 34, hero: true },
  sedan: { name: 'SEDAN', color: 0x3a7ad8, len: 4.4, wid: 1.9, top: 1.3, speed: 22 },
  taxi: { name: 'TAXI', color: 0xffc81a, len: 4.4, wid: 1.9, top: 1.35, speed: 24 },
  truck: { name: 'TRUCK', color: 0x8a8f96, len: 7.2, wid: 2.4, top: 2.4, speed: 16 },
  cruiser: { name: 'CRUISER', color: 0x14161a, len: 4.8, wid: 2.0, top: 1.35, speed: 30, police: true },
  bike: { name: 'BIKE', color: 0xd83a2a, len: 2.2, wid: 0.8, top: 1.1, speed: 30 },
};
function paintMat(hex) { return new THREE.MeshStandardMaterial({ color: hex, metalness: 0.55, roughness: 0.28, envMapIntensity: 1.3 }); }
const glassMat = new THREE.MeshStandardMaterial({ color: 0x4a6a8a, metalness: 0.9, roughness: 0.08, envMapIntensity: 1.6 });
const tyreMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 });
const hubMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.85, roughness: 0.3 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.7, metalness: 0.3 });
export function makeCar(typeKey, colorHex) {
  const t = VEHICLE_TYPES[typeKey];
  const g = new THREE.Group();
  const paint = t.police
    ? new THREE.MeshStandardMaterial({ color: colorHex !== undefined ? colorHex : t.color, metalness: 0.2, roughness: 0.5, envMapIntensity: 0.3 })
    : paintMat(colorHex !== undefined ? colorHex : t.color);
  const L = t.len, W = t.wid;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, 0.62, L), paint);
  body.position.y = 0.62; body.castShadow = true; g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, 0.4, 0.5), paint);
  nose.position.set(0, 0.55, L / 2 - 0.2); nose.castShadow = true; g.add(nose);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, 0.55, L * 0.42), glassMat);
  cabin.position.set(0, 1.15, -L * 0.06); cabin.castShadow = true; g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.1, L * 0.4), t.hero ? darkMat : paint);
  roof.position.set(0, 1.46, -L * 0.06); g.add(roof);
  for (const sx of [-1, 1]) {
    const arch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 1.1), darkMat);
    arch.position.set(sx * (W / 2 - 0.02), 0.55, L * 0.32); g.add(arch);
    const arch2 = arch.clone(); arch2.position.z = -L * 0.32; g.add(arch2);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-W / 2 + 0.12, L * 0.32], [W / 2 - 0.12, L * 0.32], [-W / 2 + 0.12, -L * 0.32], [W / 2 - 0.12, -L * 0.32]]) {
    const w = new THREE.Mesh(wheelGeo, tyreMat); w.position.set(wx, 0.36, wz); w.castShadow = true; g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 10), hubMat);
    hub.rotation.z = Math.PI / 2; hub.position.set(wx, 0.36, wz); g.add(hub);
  }
  const hl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.16, 0.1), new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a8, emissiveIntensity: 1.6 }));
  hl.position.set(0, 0.72, L / 2 + 0.02); g.add(hl);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.14, 0.1), new THREE.MeshStandardMaterial({ color: 0xd81a1a, emissive: 0xd81a1a, emissiveIntensity: 1.2 }));
  tl.position.set(0, 0.72, -L / 2 - 0.02); g.add(tl);
  if (t.police) {
    const whiteM = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.5, roughness: 0.3 });
    const doors = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.5, L * 0.45), whiteM);
    doors.position.set(0, 0.62, -L * 0.04); g.add(doors);
    const roofW = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, 0.08, L * 0.42), whiteM);
    roofW.position.set(0, 1.5, -L * 0.06); g.add(roofW);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.3, L * 0.5), new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5, metalness: 0.3 }));
    skirt.position.set(0, 0.6, -L * 0.1); g.add(skirt);
    const barR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.34), new THREE.MeshStandardMaterial({ color: 0xff1a1a, emissive: 0xff1a1a, emissiveIntensity: 4 }));
    barR.position.set(-0.36, 1.62, -L * 0.06); g.add(barR);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.34), new THREE.MeshStandardMaterial({ color: 0x1a4aff, emissive: 0x1a4aff, emissiveIntensity: 4 }));
    barB.position.set(0.36, 1.62, -L * 0.06); g.add(barB);
    const pl = new THREE.PointLight(0xff2a2a, 0, 30, 1.6); pl.position.set(-0.36, 2.2, 0); g.add(pl);
    const pl2 = new THREE.PointLight(0x2a5aff, 0, 30, 1.6); pl2.position.set(0.36, 2.2, 0); g.add(pl2);
    g.userData.flash = { r: barR, b: barB, pl, pl2, t: Math.random() * 2 };
  }
  if (t.hero) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 0.95, 0.1, 0.55), darkMat);
    wing.position.set(0, 1.58, -L / 2 + 0.2); g.add(wing);
    for (const sx of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.09), darkMat);
      strut.position.set(sx * W * 0.3, 1.44, -L / 2 + 0.2); g.add(strut);
    }
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, L * 0.9), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.4 }));
    stripe.position.set(0, 0.95, 0); g.add(stripe);
  }
  if (typeKey === 'truck') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(W * 0.95, 2.0, L * 0.55), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.6, metalness: 0.2 }));
    box.position.set(0, 1.9, -L * 0.18); box.castShadow = true; g.add(box);
  }
  g.userData.type = t; g.userData.damage = 0; g.userData.speed = 0;
  return g;
}
export function makeBike() {
  const g = new THREE.Group();
  const wg = new THREE.CylinderGeometry(0.34, 0.34, 0.12, 12); wg.rotateZ(Math.PI / 2);
  for (const z of [0.7, -0.7]) { const w = new THREE.Mesh(wg, tyreMat); w.position.set(0, 0.34, z); g.add(w); }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 1.5), paintMat(0xd83a2a)); frame.position.y = 0.7; g.add(frame);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.6), darkMat); seat.position.set(0, 0.92, -0.4); g.add(seat);
  g.userData.type = VEHICLE_TYPES.bike; g.userData.damage = 0; g.userData.speed = 0;
  return g;
}
const traffic = [];
export function spawnTraffic(scene, count, rng) {
  const keys = ['sedan', 'taxi', 'sedan', 'truck', 'sedan', 'taxi'];
  for (let i = 0; i < count; i++) {
    const key = keys[i % keys.length];
    const car = makeCar(key);
    const axis = i % 2 === 0 ? 'x' : 'z';
    const lane = -160 + Math.floor(rng() * 9) * 40 + (rng() < 0.5 ? -3 : 3);
    const along = -160 + rng() * 320;
    car.position.set(axis === 'x' ? along : lane, 0, axis === 'x' ? lane : along);
    car.rotation.y = axis === 'x' ? (Math.PI / 2) * (rng() < 0.5 ? 1 : -1) : (rng() < 0.5 ? 0 : Math.PI);
    car.userData.axis = axis; car.userData.dir = car.rotation.y;
    car.userData.speed = VEHICLE_TYPES[key].speed * (0.5 + rng() * 0.5);
    scene.add(car); traffic.push(car);
  }
  return traffic;
}
export function updateTraffic(dt, time) {
  for (const car of traffic) {
    const s = car.userData.speed * dt;
    if (car.userData.axis === 'x') car.position.x += Math.sin(car.userData.dir) * s;
    else car.position.z += Math.cos(car.userData.dir) * s;
    if (car.position.x > 175) car.position.x = -175;
    if (car.position.x < -175) car.position.x = 175;
    if (car.position.z > 175) car.position.z = -175;
    if (car.position.z < -175) car.position.z = 175;
    if (car.userData.flash) {
      const f = car.userData.flash; f.t += dt * 6;
      const on = Math.sin(f.t) > 0;
      f.r.material.emissiveIntensity = on ? 4 : 0.4;
      f.b.material.emissiveIntensity = on ? 0.4 : 4;
      f.pl.intensity = on ? 5 : 0;
      f.pl2.intensity = on ? 0 : 5;
    }
  }
}
export function damageCar(car, amount, smokeFn) {
  car.userData.damage = Math.min(1, car.userData.damage + amount);
  if (car.userData.damage > 0.35 && !car.userData.dent) {
    const dent = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 1.2), darkMat);
    dent.position.set(car.userData.type.wid / 2, 0.7, 0.4);
    car.add(dent); car.userData.dent = dent;
  }
  if (car.userData.damage > 0.4 && smokeFn) smokeFn(car.position);
}
