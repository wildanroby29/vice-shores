// vehicles.js — cars built from explicit geometry: a chamfered lower body
// (extruded profile with a bevel), a tapered cabin as an extruded side
// profile with a sloped windshield and rear window, wheel arches, real
// wheels (tyre + 5-spoke rim + sidewall), bumpers, side skirts, mirrors, a
// rear wing, emissive lights, door seams and a racing stripe. Paint is a
// clearcoat physical material kept dim enough that the roof never blows out
// (clearcoat 0.8, roughness 0.35, envMapIntensity 0.6). Police cars get a
// black/white livery, a flashing red/blue light bar and a push bar.
// `detail` 'low' builds plain boxes.
const CAR_COLORS = [0xc23a2e, 0x2e6ac2, 0xe8b83a, 0x3a9a5a, 0xeeeeee, 0x222222, 0x7a3aa8, 0xe87a3a];

// A side-profile shape (x = along the car, y = up) extruded across the
// width, with a bevel so the edges read chamfered, not sharp. rotateY(-90°)
// puts the profile length on +Z (front) and the extrusion on X (width).
function extrudeProfile(points, width, bevel, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const depth = Math.max(0.05, width - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    steps: 1,
  });
  // rotateY(-90°): shape-x (length) -> +Z (front), extrusion -> X. The
  // extrusion spans z in [-bevel, depth+bevel], so after rotation its centre
  // sits at x = -depth/2; translate +depth/2 to centre it on the group.
  geo.rotateY(-Math.PI / 2);
  geo.translate(depth / 2, 0, 0);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function makeWheel() {
  const wheel = new THREE.Group();
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.25, metalness: 0.9 });
  // Tyre + a lighter sidewall ring so the wheel reads at screenshot scale.
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), tyreMat);
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  wheel.add(tyre);
  const sidewall = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 8, 18), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.8 }));
  sidewall.rotation.y = Math.PI / 2;
  sidewall.position.x = 0.14;
  wheel.add(sidewall);
  const sidewall2 = sidewall.clone();
  sidewall2.position.x = -0.14;
  wheel.add(sidewall2);
  // Rim: a disc + 5 spokes + hub.
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.28, 14), rimMat);
  rim.rotation.z = Math.PI / 2;
  wheel.add(rim);
  for (let i = 0; i < 5; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.05), new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.35, metalness: 0.8 }));
    const a = (i / 5) * Math.PI * 2;
    spoke.position.set(0, Math.sin(a) * 0.1, Math.cos(a) * 0.1);
    spoke.rotation.x = -a;
    spoke.position.x = 0.15;
    wheel.add(spoke);
    const spoke2 = spoke.clone();
    spoke2.position.x = -0.15;
    wheel.add(spoke2);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.6 }));
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  return wheel;
}

export function makeCar(color, opts = {}) {
  const detail = opts.detail || 'full';
  const group = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.6, metalness: 0.05,
    clearcoat: 0, clearcoatRoughness: 0.5, envMapIntensity: 0.2,
  }); // matte paint, clearcoat OFF: the clearcoat specular (even 0.3-0.45) caught the night fill light and blew the horizontal top face to white in the chase shot
  if (detail === 'low') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4.4), new THREE.MeshStandardMaterial({ color }));
    body.position.y = 0.8;
    group.add(body);
    return { group, paint };
  }

  // Lower body: chamfered 4.4 x 0.55 x 1.9, hood and trunk lower than the cabin.
  const lower = extrudeProfile(
    [[2.2, 0.02], [2.2, 0.42], [1.95, 0.55], [-1.95, 0.55], [-2.2, 0.42], [-2.2, 0.02]],
    1.9, 0.07, paint,
  );
  lower.position.y = 0.3;
  group.add(lower);

  // Cabin: tapered extruded profile — sloped windshield up to a flat roof,
  // sloped rear window down to the trunk. Dark glossy glass, not a body box.
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0e1a24, roughness: 0.15, metalness: 0.1, clearcoat: 0.15, envMapIntensity: 0.12, transparent: true, opacity: 0.96 }); // dimmed: clearcoat 1 / env 1.1 mirrored the sky and the cabin top read white
  const cabin = extrudeProfile(
    [[1.15, 0], [0.35, 0.52], [-0.55, 0.52], [-1.15, 0]],
    1.62, 0.05, glassMat,
  );
  cabin.position.y = 0.85;
  group.add(cabin);
  // Roof panel over the glass (paint, so the roof is body colour, not glass).
  // NOTE: plain standard material, NOT clearcoat — a clearcoat roof mirrors
  // the heli spotlight + sky and blows to white in the chase/title shots.
  // Hotfix: near-zero env reflection + high roughness so the roof stays the
  // car colour even under the spotlight.
  const roofMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, envMapIntensity: 0.05 });
  const roof = extrudeProfile(
    [[0.45, 0], [0.3, 0.06], [-0.6, 0.06], [-0.7, 0]],
    1.5, 0.03, roofMat,
  );
  roof.position.y = 1.33;
  group.add(roof);

  // Wheel arches: dark recess rings above each wheel.
  const archMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.95 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = makeWheel();
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
    wheels.push(wheel);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 8, 14, Math.PI), archMat);
    arch.rotation.y = Math.PI / 2;
    arch.position.set(wx * 1.01, 0.36, wz);
    group.add(arch);
  }

  // Bumpers, side skirts, mirrors.
  const bumpMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.4 });
  for (const bz of [2.2, -2.2]) {
    const bump = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.26, 0.22), bumpMat);
    bump.position.set(0, 0.48, bz);
    group.add(bump);
  }
  for (const sx of [-0.98, 0.98]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 2.6), bumpMat);
    skirt.position.set(sx, 0.34, 0);
    group.add(skirt);
  }
  for (const mx of [-1.0, 1.0]) {
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.28), bumpMat);
    mir.position.set(mx, 1.28, 0.72);
    group.add(mir);
  }

  // Thin door seams on both flanks.
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  for (const sx of [-0.96, 0.96]) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.04), seamMat);
    seam.position.set(sx, 0.72, 0.35);
    group.add(seam);
    const seam2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.04), seamMat);
    seam2.position.set(sx, 0.72, -0.45);
    group.add(seam2);
  }

  if (opts.spoiler) {
    // Rear wing on struts + racing stripe + front splitter (hero GT only).
    const sp = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 0.48), bumpMat);
    sp.position.set(0, 1.52, -2.0);
    sp.castShadow = true;
    group.add(sp);
    for (const sx of [-0.7, 0.7]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.09), bumpMat);
      strut.position.set(sx, 1.38, -2.0);
      group.add(strut);
    }
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.3 });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 3.9), stripeMat);
    stripe.position.set(0, 0.935, 0.2); // just above the hood/trunk top (y=0.92)
    group.add(stripe);
    const stripeRoof = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.9), stripeMat);
    stripeRoof.position.set(0, 1.435, -0.1); // just above the roof panel (y=1.42)
    group.add(stripeRoof);
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.09, 0.45), bumpMat);
    splitter.position.set(0, 0.3, 2.18);
    group.add(splitter);
  }

  // Emissive headlights + taillights.
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffe9a0, emissiveIntensity: 1.6 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0xff2020, emissiveIntensity: 1.2 });
  for (const hx of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.08), headMat);
    h.position.set(hx, 0.78, 2.22);
    group.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.08), tailMat);
    t.position.set(hx, 0.78, -2.22);
    group.add(t);
  }
  group.userData.wheels = wheels;
  return { group, paint };
}

export function makePoliceCar(detail) {
  const { group, paint } = makeCar(0x1a1a22, { detail, clearcoat: 0.8 });
  // White doors + white roof band (slight emissive so it never reads as a
  // black silhouette at night).
  const bandMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, emissive: 0x888888, emissiveIntensity: 0.3 });
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.42, 2.4), bandMat);
  band.position.set(0, 0.62, 0);
  group.add(band);
  // Push bar on the nose.
  const pushMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 });
  const push = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.12), pushMat);
  push.position.set(0, 0.55, 2.32);
  group.add(push);
  for (const px of [-0.55, 0.55]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), pushMat);
    bar.position.set(px, 0.55, 2.28);
    group.add(bar);
  }
  // Flashing light bar.
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  barBase.position.set(0, 1.42, 0.1);
  group.add(barBase);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.42), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 2.5 }));
  red.position.set(-0.28, 1.44, 0.1);
  group.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.42), new THREE.MeshStandardMaterial({ color: 0x2040ff, emissive: 0x2040ff, emissiveIntensity: 2.5 }));
  blue.position.set(0.28, 1.44, 0.1);
  group.add(blue);
  const flash = new THREE.PointLight(0xff4040, 0, 18);
  flash.position.set(0, 2.2, 0);
  group.add(flash);
  group.userData.flash = { red, blue, light: flash, phase: Math.random() * 6 };
  return { group, paint };
}

export function createTraffic(scene, rand, detail, count) {
  const cars = [];
  const spots = [];
  for (let i = 0; i < count; i += 1) {
    const col = CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)];
    const { group } = makeCar(col, { detail, clearcoat: 0.7 });
    const lane = (Math.floor(rand() * 9) - 4) * 60;
    const along = -200 + rand() * 400;
    const horizontal = rand() < 0.5;
    const x = horizontal ? along : lane + (rand() < 0.5 ? -4 : 4);
    const z = horizontal ? lane + (rand() < 0.5 ? -4 : 4) : along;
    group.position.set(x, 0, z);
    group.rotation.y = horizontal ? (rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rand() < 0.5 ? 0 : Math.PI);
    scene.add(group);
    cars.push({ group, speed: 8 + rand() * 8, horizontal, dir: rand() < 0.5 ? 1 : -1, x, z });
    spots.push(group.position);
  }
  function update(dt) {
    for (const c of cars) {
      const d = c.speed * c.dir * dt;
      if (c.horizontal) { c.group.position.x += d; if (Math.abs(c.group.position.x) > 205) c.dir *= -1; }
      else { c.group.position.z += d; if (Math.abs(c.group.position.z) > 205) c.dir *= -1; }
      const wheels = c.group.userData.wheels || [];
      for (const w of wheels) w.rotation.x += (c.speed * dt) / 0.36;
    }
  }
  return { cars, update };
}
