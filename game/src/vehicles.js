// vehicles.js — cars built from explicit geometry: a chamfered lower body
// (extruded profile with a bevel), a tapered cabin as an extruded side
// profile with a sloped windshield and rear window, wheel arches, real
// wheels (tyre + 5-spoke rim + sidewall), bumpers, side skirts, mirrors, a
// rear wing, emissive lights, door seams and a racing stripe. Paint is a
// clearcoat physical material kept dim enough that the roof never blows out
// (clearcoat 0.8, roughness 0.35, envMapIntensity 0.6). Police cars get a
// black/white livery, a flashing red/blue light bar and a push bar.
// `level` 'low' builds plain boxes.
const CAR_COLORS = [0xc23a2e, 0x2e6ac2, 0xe8b83a, 0x3a9a5a, 0xeeeeee, 0x222222, 0x7a3aa8, 0xe87a3a];

// A side-profile shape (x = along the car, y = up) extruded across the
// width, with a bevel so the edges read chamfered, not sharp. rotateY(-90°)
// puts the profile length on +Z (front) and the extrusion on X (width).
function extrudeProfile(pts, beam, bevel, material) {
  const outline = new THREE.Shape();
  outline.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) outline.lineTo(pts[i][0], pts[i][1]);
  outline.closePath();
  const depth = Math.max(0.05, beam - bevel * 2);
  const form = new THREE.ExtrudeGeometry(outline, {
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
  form.rotateY(-Math.PI / 2);
  form.translate(depth / 2, 0, 0);
  form.computeVertexNormals();
  const part = new THREE.Mesh(form, material);
  part.castShadow = true;
  return part;
}

function makeWheel() {
  const wheel = new THREE.Group();
  const tyre = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.25, metalness: 0.9 });
  // Tyre + a lighter sidewall ring so the wheel reads at screenshot scale.
  const tyreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), tyre);
  tyreMesh.rotation.z = Math.PI / 2;
  tyreMesh.castShadow = true;
  wheel.add(tyreMesh);
  const sidewall = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 8, 18), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.8 }));
  sidewall.rotation.y = Math.PI / 2;
  sidewall.position.x = 0.14;
  wheel.add(sidewall);
  const sidewallB = sidewall.clone();
  sidewallB.position.x = -0.14;
  wheel.add(sidewallB);
  // Rim: a disc + 5 spokes + hub.
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.28, 14), rim);
  disc.rotation.z = Math.PI / 2;
  wheel.add(disc);
  for (let i = 0; i < 5; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.05), new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.35, metalness: 0.8 }));
    const ang = (i / 5) * Math.PI * 2;
    spoke.position.set(0, Math.sin(ang) * 0.1, Math.cos(ang) * 0.1);
    spoke.rotation.x = -ang;
    spoke.position.x = 0.15;
    wheel.add(spoke);
    const spokeB = spoke.clone();
    spokeB.position.x = -0.15;
    wheel.add(spokeB);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.6 }));
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  return wheel;
}

export function makeCar(color, opts = {}) {
  const level = opts.detail || 'full';
  const grp = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.6, metalness: 0.05,
    clearcoat: 0, clearcoatRoughness: 0.5, envMapIntensity: 0.2,
  }); // matte paint, clearcoat OFF: the clearcoat specular (even 0.3-0.45) caught the night fill light and blew the horizontal top face to white in the chase shot
  if (level === 'low') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4.4), new THREE.MeshStandardMaterial({ color }));
    body.position.y = 0.8;
    grp.add(body);
    return { group: grp, paint };
  }

  // Lower body: chamfered 4.4 x 0.55 x 1.9, hood and trunk lower than the cabin.
  const lower = extrudeProfile(
    [[2.2, 0.02], [2.2, 0.42], [1.95, 0.55], [-1.95, 0.55], [-2.2, 0.42], [-2.2, 0.02]],
    1.9, 0.07, paint,
  );
  lower.position.y = 0.3;
  grp.add(lower);

  // Cabin: tapered extruded profile — sloped windshield up to a flat roof,
  // sloped rear window down to the trunk. Dark glossy glass, not a body box.
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0e1a24, roughness: 0.15, metalness: 0.1, clearcoat: 0.15, envMapIntensity: 0.12, transparent: true, opacity: 0.96 }); // dimmed: clearcoat 1 / env 1.1 mirrored the sky and the cabin top read white
  const cabin = extrudeProfile(
    [[1.15, 0], [0.35, 0.52], [-0.55, 0.52], [-1.15, 0]],
    1.62, 0.05, glass,
  );
  cabin.position.y = 0.85;
  grp.add(cabin);
  // Roof panel over the glass (paint, so the roof is body colour, not glass).
  // NOTE: plain standard material, NOT clearcoat — a clearcoat roof mirrors
  // the heli spotlight + sky and blows to white in the chase/title shots.
  // Hotfix: near-zero env reflection + high roughness so the roof stays the
  // car colour even under the spotlight.
  const roof = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, envMapIntensity: 0.05 });
  const top = extrudeProfile(
    [[0.45, 0], [0.3, 0.06], [-0.6, 0.06], [-0.7, 0]],
    1.5, 0.03, roof,
  );
  top.position.y = 1.33;
  grp.add(top);

  // Wheel arches: dark recess rings above each wheel.
  const arch = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.95 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = makeWheel();
    wheel.position.set(wx, 0.36, wz);
    grp.add(wheel);
    wheels.push(wheel);
    const archMesh = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 8, 14, Math.PI), arch);
    archMesh.rotation.y = Math.PI / 2;
    archMesh.position.set(wx * 1.01, 0.36, wz);
    grp.add(archMesh);
  }

  // Bumpers, side skirts, mirrors.
  const bump = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.4 });
  for (const bz of [2.2, -2.2]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.26, 0.22), bump);
    bumper.position.set(0, 0.48, bz);
    grp.add(bumper);
  }
  for (const sx of [-0.98, 0.98]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 2.6), bump);
    skirt.position.set(sx, 0.34, 0);
    grp.add(skirt);
  }
  for (const mx of [-1.0, 1.0]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.28), bump);
    mirror.position.set(mx, 1.28, 0.72);
    grp.add(mirror);
  }

  // Thin door seams on both flanks.
  const seam = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  for (const sx of [-0.96, 0.96]) {
    const seamA = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.04), seam);
    seamA.position.set(sx, 0.72, 0.35);
    grp.add(seamA);
    const seamB = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.04), seam);
    seamB.position.set(sx, 0.72, -0.45);
    grp.add(seamB);
  }

  if (opts.spoiler) {
    // Rear wing on struts + racing stripe + front splitter (hero GT only).
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 0.48), bump);
    wing.position.set(0, 1.52, -2.0);
    wing.castShadow = true;
    grp.add(wing);
    for (const sx of [-0.7, 0.7]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.09), bump);
      strut.position.set(sx, 1.38, -2.0);
      grp.add(strut);
    }
    const stripe = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.3 });
    const stripeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 3.9), stripe);
    stripeMesh.position.set(0, 0.935, 0.2); // just above the hood/trunk top (y=0.92)
    grp.add(stripeMesh);
    const stripeTop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.9), stripe);
    stripeTop.position.set(0, 1.435, -0.1); // just above the roof panel (y=1.42)
    grp.add(stripeTop);
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.09, 0.45), bump);
    splitter.position.set(0, 0.3, 2.18);
    grp.add(splitter);
  }

  // Emissive headlights + taillights.
  const head = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffe9a0, emissiveIntensity: 1.6 });
  const tail = new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0xff2020, emissiveIntensity: 1.2 });
  for (const hx of [-0.65, 0.65]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.08), head);
    lamp.position.set(hx, 0.78, 2.22);
    grp.add(lamp);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.08), tail);
    rear.position.set(hx, 0.78, -2.22);
    grp.add(rear);
  }
  grp.userData.wheels = wheels;
  return { group: grp, paint };
}

export function makePoliceCar(level) {
  const { group, paint } = makeCar(0x1a1a22, { detail: level, clearcoat: 0.8 });
  // White doors + white roof band (slight emissive so it never reads as a
  // black silhouette at night).
  const band = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, emissive: 0x888888, emissiveIntensity: 0.3 });
  const bandMesh = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.42, 2.4), band);
  bandMesh.position.set(0, 0.62, 0);
  group.add(bandMesh);
  // Push bar on the nose.
  const push = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 });
  const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.12), push);
  pushBar.position.set(0, 0.55, 2.32);
  group.add(pushBar);
  for (const px of [-0.55, 0.55]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), push);
    upright.position.set(px, 0.55, 2.28);
    group.add(upright);
  }
  // Flashing light bar.
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  base.position.set(0, 1.42, 0.1);
  group.add(base);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.42), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 2.5 }));
  red.position.set(-0.28, 1.44, 0.1);
  group.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.42), new THREE.MeshStandardMaterial({ color: 0x2040ff, emissive: 0x2040ff, emissiveIntensity: 2.5 }));
  blue.position.set(0.28, 1.44, 0.1);
  group.add(blue);
  const beacon = new THREE.PointLight(0xff4040, 0, 18);
  beacon.position.set(0, 2.2, 0);
  group.add(beacon);
  group.userData.flash = { red, blue, light: beacon, phase: Math.random() * 6 };
  return { group, paint };
}

export function createTraffic(scn, rng, level, count) {
  const cars = [];
  const places = [];
  for (let i = 0; i < count; i += 1) {
    const colour = CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
    const { group } = makeCar(colour, { detail: level, clearcoat: 0.7 });
    const road = (Math.floor(rng() * 9) - 4) * 60;
    const dist = -200 + rng() * 400;
    const horizontal = rng() < 0.5;
    const x = horizontal ? dist : road + (rng() < 0.5 ? -4 : 4);
    const z = horizontal ? road + (rng() < 0.5 ? -4 : 4) : dist;
    group.position.set(x, 0, z);
    group.rotation.y = horizontal ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI);
    scn.add(group);
    cars.push({ group, speed: 8 + rng() * 8, horizontal, dir: rng() < 0.5 ? 1 : -1, x, z });
    places.push(group.position);
  }
  function update(dt) {
    for (const car of cars) {
      const step = car.speed * car.dir * dt;
      if (car.horizontal) {
        car.group.position.x += step;
        if (Math.abs(car.group.position.x) > 205) car.dir *= -1;
      } else {
        car.group.position.z += step;
        if (Math.abs(car.group.position.z) > 205) car.dir *= -1;
      }
      const wheels = car.group.userData.wheels || [];
      for (const wheel of wheels) wheel.rotation.x += (car.speed * dt) / 0.36;
    }
  }
  return { cars, update };
}
