// Vehicles for Vice Shores: the hero GT, police cars and traffic.
//
// Every car is built the same way — a chamfered lower body and a tapered
// glass cabin, both extruded from 2D side profiles, with wheels, arches,
// bumpers, mirrors, seams and lights. The paint is deliberately matte:
// clearcoat and env-map intensity are kept low because a glossy top face
// caught the night fill light and blew the hero's roof and hood to white.
// The hero GT gets a rear wing, a racing stripe and a front splitter; the
// police cars get a black-and-white livery, a push bar and a flashing
// light bar. Traffic is fourteen cars in random colours, driving the grid.

export const TRAFFIC_COLOURS = [
  0xc23a2e, 0x2e6ac2, 0xe8b83a, 0x3a9a5a,
  0xeeeeee, 0x222222, 0x7a3aa8, 0xe87a3a,
];

// Build a 2D side-profile shape, extrude it across a width, and rotate it
// so the profile's length lands on +Z (front) and the extrusion on X.
function extrudeProfile(points, width, bevel) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 1, steps: 1,
  });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2);
  return geo;
}

function stdBox(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// One wheel: tyre, sidewall rings, rim disc, five spokes and a hub, all in
// a group whose X rotation is the spin. The axle runs along X.
function makeWheel() {
  const group = new THREE.Group();
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 });
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), tyreMat);
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  group.add(tyre);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.8 });
  for (const sx of [-0.14, 0.14]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 8, 20), ringMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = sx;
    group.add(ring);
  }
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xc8ccd2, roughness: 0.25, metalness: 0.9,
  });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.28, 16), rimMat);
  rim.rotation.z = Math.PI / 2;
  group.add(rim);
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.4, metalness: 0.8 });
  for (let s = 0; s < 5; s++) {
    const ang = (s / 5) * Math.PI * 2;
    for (const sx of [-0.15, 0.15]) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.07), spokeMat);
      spoke.position.set(sx, Math.cos(ang) * 0.12, Math.sin(ang) * 0.12);
      spoke.rotation.x = -ang;
      group.add(spoke);
    }
  }
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.6 });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10), hubMat);
  hub.rotation.z = Math.PI / 2;
  group.add(hub);
  return group;
}

// A car in a colour. Options: detail ('full' or 'low'), spoiler (the GT's
// rear wing), clearcoat (the paint's clearcoat value — the paint material
// itself stays matte regardless). Returns the group with its wheels and
// light lenses attached as userData for the game loop.
export function makeCar(colour, opts = {}) {
  const detail = opts.detail ?? 'full';
  const spoiler = opts.spoiler ?? false;
  const clearcoat = opts.clearcoat ?? 0;
  const group = new THREE.Group();
  const wheels = [];

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: colour, roughness: 0.6, metalness: 0.05,
    clearcoat: 0, clearcoatRoughness: 0.5, envMapIntensity: 0.2,
  });

  if (detail !== 'full') {
    const body = stdBox(2, 1, 4.4, paintMat, 0, 0.8, 0);
    group.add(body);
    return { group, wheels, paintMat };
  }

  // Lower body: chamfered, 4.4 long, 0.55 tall, 1.9 wide. The hood and
  // trunk sit lower than the cabin.
  const bodyGeo = extrudeProfile(
    [[2.2, 0.02], [2.2, 0.42], [1.95, 0.55], [-1.95, 0.55], [-2.2, 0.42], [-2.2, 0.02]],
    1.9, 0.07,
  );
  const body = new THREE.Mesh(bodyGeo, paintMat);
  body.position.y = 0.3;
  body.castShadow = true;
  group.add(body);

  // Cabin: a tapered glasshouse with sloped windshield and rear window.
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e1a24, roughness: 0.15, metalness: 0.1,
    clearcoat: 0.15, envMapIntensity: 0.12, transparent: true, opacity: 0.96,
  });
  const cabinGeo = extrudeProfile(
    [[1.15, 0], [0.35, 0.52], [-0.55, 0.52], [-1.15, 0]],
    1.62, 0.05,
  );
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.y = 0.85;
  cabin.castShadow = true;
  group.add(cabin);

  // Roof panel in body colour, plain matte — never glass, never clearcoat.
  // A clearcoat roof mirrors the heli spotlight and the sky and blows white.
  const roofMat = new THREE.MeshStandardMaterial({
    color: colour, roughness: 0.7, metalness: 0, envMapIntensity: 0.05,
  });
  const roofGeo = extrudeProfile(
    [[0.45, 0], [0.3, 0.06], [-0.6, 0.06], [-0.7, 0]],
    1.5, 0.03,
  );
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 1.33;
  roof.castShadow = true;
  group.add(roof);

  // Wheel arches: dark recess rings above each wheel.
  const archMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.9 });
  for (const ax of [-0.96, 0.96]) {
    for (const az of [-1.45, 1.45]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 8, 20), archMat);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(ax, 0.36, az);
      group.add(arch);
    }
  }

  // Four wheels.
  for (const wx of [-0.95, 0.95]) {
    for (const wz of [-1.45, 1.45]) {
      const wheel = makeWheel();
      wheel.position.set(wx, 0.36, wz);
      group.add(wheel);
      wheels.push(wheel);
    }
  }

  // Bumpers, side skirts, mirrors, door seams.
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.4 });
  group.add(stdBox(1.95, 0.26, 0.22, darkMat, 0, 0.48, 2.2));
  group.add(stdBox(1.95, 0.26, 0.22, darkMat, 0, 0.48, -2.2));
  for (const sx of [-0.98, 0.98]) group.add(stdBox(0.08, 0.16, 2.6, darkMat, sx, 0.34, 0));
  for (const sx of [-1.0, 1.0]) group.add(stdBox(0.1, 0.16, 0.28, paintMat, sx, 1.28, 0.72));
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  for (const sx of [-0.96, 0.96]) {
    for (const sz of [0.35, -0.45]) {
      group.add(stdBox(0.02, 0.5, 0.04, seamMat, sx, 0.72, sz));
    }
  }

  // Headlights and taillights, emissive so they glow at night.
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff2c8, emissive: 0xffe9a0, emissiveIntensity: 1.6, roughness: 0.3,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xaa0000, emissive: 0xff2020, emissiveIntensity: 1.2, roughness: 0.3,
  });
  for (const sx of [-0.65, 0.65]) {
    group.add(stdBox(0.45, 0.16, 0.08, headMat, sx, 0.78, 2.22));
    group.add(stdBox(0.45, 0.15, 0.08, tailMat, sx, 0.78, -2.22));
  }

  // The GT's extras: rear wing on struts, racing stripe, front splitter.
  if (spoiler) {
    const wingMat = paintMat;
    group.add(stdBox(1.8, 0.07, 0.48, wingMat, 0, 1.52, -2.0));
    for (const sx of [-0.7, 0.7]) group.add(stdBox(0.09, 0.3, 0.09, darkMat, sx, 1.38, -2.0));
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
    group.add(stdBox(0.55, 0.02, 3.9, stripeMat, 0, 0.935, 0.2));
    group.add(stdBox(0.55, 0.02, 0.9, stripeMat, 0, 1.435, -0.1));
    group.add(stdBox(2.0, 0.09, 0.45, darkMat, 0, 0.3, 2.18));
  }

  group.userData.wheels = wheels;
  group.userData.paintMat = paintMat;
  group.userData.clearcoat = clearcoat;
  return { group, wheels, paintMat };
}

// The hero GT Sunline: orange, winged, striped.
export function makeHeroCar() {
  const car = makeCar(0xe87a1a, { detail: 'full', spoiler: true, clearcoat: 0.45 });
  car.group.position.set(150, 0, -20);
  // A soft dark ellipse under the car, grounding it on the road.
  const shadowGeo = new THREE.CircleGeometry(1, 24);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  shadow.scale.set(1.15, 2.3, 1);
  shadow.renderOrder = 1;
  car.group.add(shadow);
  return car;
}

// A police car: black body, white doors and roof band, push bar, and a
// light bar whose red and blue lenses alternate. The flash phase is random
// per car so the fleet does not blink in unison.
export function makePoliceCar(rng) {
  const car = makeCar(0x1a1a22, { detail: 'full', spoiler: false, clearcoat: 0 });
  const g = car.group;
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf2f2f2, roughness: 0.4,
    emissive: 0x888888, emissiveIntensity: 0.3,
  });
  g.add(stdBox(1.94, 0.42, 2.4, whiteMat, 0, 0.62, 0));
  const barMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 });
  g.add(stdBox(1.5, 0.5, 0.12, barMat, 0, 0.55, 2.32));
  for (const sx of [-0.55, 0.55]) g.add(stdBox(0.09, 0.5, 0.09, barMat, sx, 0.55, 2.32));
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  g.add(stdBox(1.1, 0.14, 0.4, baseMat, 0, 1.42, 0.1));
  const redMat = new THREE.MeshStandardMaterial({
    color: 0x550000, emissive: 0xff2020, emissiveIntensity: 2.5, roughness: 0.3,
  });
  const blueMat = new THREE.MeshStandardMaterial({
    color: 0x000055, emissive: 0x2040ff, emissiveIntensity: 2.5, roughness: 0.3,
  });
  const redLens = stdBox(0.5, 0.16, 0.42, redMat, -0.28, 1.44, 0.1);
  const blueLens = stdBox(0.5, 0.16, 0.42, blueMat, 0.28, 1.44, 0.1);
  g.add(redLens);
  g.add(blueLens);
  const light = new THREE.PointLight(0xff4040, 0, 18);
  light.position.set(0, 2.2, 0);
  g.add(light);
  const phase = rng ? rng() * 6 : 0;
  g.userData.redMat = redMat;
  g.userData.blueMat = blueMat;
  g.userData.flashLight = light;
  g.userData.phase = phase;
  return { ...car, redMat, blueMat, light, phase };
}

// Flash one police car's light bar: the lenses alternate red-bright /
// blue-dim and back on a sine, and the point light follows.
export function flashPolice(car, time) {
  const s = Math.sin(time * 10 + (car.phase ?? 0));
  const redOn = s > 0;
  car.redMat.emissiveIntensity = redOn ? 2.5 : 0.4;
  car.blueMat.emissiveIntensity = redOn ? 0.4 : 2.5;
  car.light.color.setHex(redOn ? 0xff4040 : 0x2040ff);
  car.light.intensity = 6 + Math.sin(time * 10) * 3;
}

// Fourteen traffic cars on the grid, in random colours and lanes.
export function makeTraffic(rng) {
  const cars = [];
  for (let i = 0; i < 14; i++) {
    const colour = TRAFFIC_COLOURS[Math.floor(rng() * TRAFFIC_COLOURS.length)];
    const lane = (Math.floor(rng() * 9) - 4) * 60;
    const along = -200 + rng() * 400;
    const horizontal = rng() < 0.5;
    const side = rng() < 0.5 ? -4 : 4;
    const speed = 8 + rng() * 8;
    const dir = rng() < 0.5 ? 1 : -1;
    const car = makeCar(colour, { detail: 'full', spoiler: false, clearcoat: 0 });
    const g = car.group;
    if (horizontal) {
      g.position.set(along, 0, lane + side);
      g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      g.position.set(lane + side, 0, along);
      g.rotation.y = dir > 0 ? 0 : Math.PI;
    }
    g.userData.horizontal = horizontal;
    g.userData.speed = speed;
    g.userData.dir = dir;
    g.userData.traffic = true;
    cars.push({ ...car, speed, dir, horizontal });
  }
  return cars;
}

// Drive the traffic: along its road, turning around past the city edge,
// wheels spinning as it goes.
export function updateTraffic(cars, dt) {
  for (const car of cars) {
    const g = car.group;
    const step = car.dir * car.speed * dt;
    if (car.horizontal) {
      g.position.x += step;
      if (Math.abs(g.position.x) > 205) {
        car.dir *= -1;
        g.userData.dir = car.dir;
        g.rotation.y += Math.PI;
      }
    } else {
      g.position.z += step;
      if (Math.abs(g.position.z) > 205) {
        car.dir *= -1;
        g.userData.dir = car.dir;
        g.rotation.y += Math.PI;
      }
    }
    for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.36;
  }
}
