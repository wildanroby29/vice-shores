// vehicles.js — Vice Shores: cars, traffic, carjacking and the particle pool.
// Cars are built from boxes and cylinders. The player car uses simple arcade
// physics (accelerate, steer, brake, handbrake, nitro); traffic follows
// rectangular loops on the road grid and brakes for the car ahead.
(function () {
  var VS = window.VS;
  var T = THREE;
  VS.traffic = [];
  VS.parked = [];
  var carId = 0;

  // --- shared circle-vs-building collision. pos is {x, z}; moves it out.
  VS.collideCircle = function (pos, r) {
    var hit = 0;
    var cols = VS.world.colliders;
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i];
      if (pos.x < c.minX - r || pos.x > c.maxX + r || pos.z < c.minZ - r || pos.z > c.maxZ + r) continue;
      var nx = VS.clamp(pos.x, c.minX, c.maxX);
      var nz = VS.clamp(pos.z, c.minZ, c.maxZ);
      var dx = pos.x - nx, dz = pos.z - nz;
      var d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      var d = Math.sqrt(d2) || 0.001;
      var push = r - d;
      if (d2 < 0.0001) { pos.x += r; hit = Math.max(hit, push); continue; }
      pos.x += (dx / d) * push;
      pos.z += (dz / d) * push;
      hit = Math.max(hit, push);
    }
    return hit;
  };

  function wheelMesh() {
    var pivot = new T.Group();
    var spin = new T.Group();
    var tire = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.32, 12),
      new T.MeshLambertMaterial({ color: 0x14141a }));
    tire.rotation.x = Math.PI / 2;
    spin.add(tire);
    var hub = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.34, 8),
      new T.MeshLambertMaterial({ color: 0xb8bcc8 }));
    hub.rotation.x = Math.PI / 2;
    spin.add(hub);
    pivot.add(spin);
    pivot.userData.spin = spin;
    return pivot;
  }

  VS.makeCarMesh = function (model, isPolice) {
    var group = new T.Group();
    var bodyColor = isPolice ? 0xf2f2f2 : model.color;
    var bodyMat = new T.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.45 });
    var body = new T.Mesh(new T.BoxGeometry(4.4, 0.72, 2.0), bodyMat);
    body.position.y = 0.62; body.castShadow = true;
    group.add(body);
    var cabin = new T.Mesh(new T.BoxGeometry(2.3, 0.62, 1.75),
      new T.MeshStandardMaterial({ color: 0x141c2c, roughness: 0.15, metalness: 0.6 }));
    cabin.position.set(-0.25, 1.28, 0); cabin.castShadow = true;
    group.add(cabin);
    if (!isPolice && model.name.indexOf('GT') !== -1) {
      var spoiler = new T.Mesh(new T.BoxGeometry(0.5, 0.08, 1.9), bodyMat);
      spoiler.position.set(-2.1, 1.15, 0);
      group.add(spoiler);
    }
    var headMat = new T.MeshBasicMaterial({ color: 0xfff6c8 });
    [-0.62, 0.62].forEach(function (z) {
      var h = new T.Mesh(new T.BoxGeometry(0.12, 0.2, 0.34), headMat);
      h.position.set(2.22, 0.66, z);
      group.add(h);
    });
    var tailMat = new T.MeshBasicMaterial({ color: 0xff2222 });
    [-0.62, 0.62].forEach(function (z) {
      var t = new T.Mesh(new T.BoxGeometry(0.12, 0.2, 0.34), tailMat);
      t.position.set(-2.22, 0.66, z);
      group.add(t);
    });
    var wheels = [];
    [[1.45, 0.98, true], [1.45, -0.98, true], [-1.45, 0.98, false], [-1.45, -0.98, false]].forEach(function (w) {
      var pivot = wheelMesh();
      pivot.position.set(w[0], 0.42, w[1]);
      pivot.userData.front = w[2];
      group.add(pivot);
      wheels.push(pivot);
    });
    var lightBar = null;
    if (isPolice) {
      var red = new T.Mesh(new T.BoxGeometry(0.5, 0.22, 0.7), new T.MeshBasicMaterial({ color: 0xff2222 }));
      red.position.set(-0.25, 1.72, -0.4);
      var blue = new T.Mesh(new T.BoxGeometry(0.5, 0.22, 0.7), new T.MeshBasicMaterial({ color: 0x2266ff }));
      blue.position.set(-0.25, 1.72, 0.4);
      group.add(red); group.add(blue);
      lightBar = { red: red, blue: blue };
    }
    var car = {
      id: ++carId, model: model, isPolice: !!isPolice, group: group, wheels: wheels,
      yaw: 0, speed: 0, health: 100, burning: false, driver: null,
      route: null, routeIdx: 0, cruise: 11, lightBar: lightBar,
      smokeTimer: 0, fireTimer: 0,
    };
    group.userData.car = car;
    VS.world.scene.add(group);
    if (VS.registerShootTarget) VS.registerShootTarget(group, isPolice ? 'policecar' : 'car', car);
    return car;
  };

  VS.carForward = function (car) {
    return { x: Math.cos(car.yaw), z: -Math.sin(car.yaw) };
  };

  function randomRoadPoint() {
    var roads = [];
    for (var i = -3; i <= 3; i++) roads.push(i * VS.CFG.roadStep);
    var vertical = VS.rng() < 0.5;
    var line = VS.pick(roads);
    var along = VS.rand(-120, 120);
    return vertical ? { x: line, z: along } : { x: along, z: line };
  }

  function makeLoop() {
    var xs = [], zs = [];
    for (var i = -3; i <= 3; i++) { xs.push(i * 40); zs.push(i * 40); }
    var x1 = VS.pick(xs), x2 = VS.pick(xs), z1 = VS.pick(zs), z2 = VS.pick(zs);
    if (x1 === x2) x2 = x1 + 40;
    if (z1 === z2) z2 = z1 + 40;
    return [
      { x: x1, z: z1 }, { x: x2, z: z1 }, { x: x2, z: z2 }, { x: x1, z: z2 },
    ];
  }

  VS.spawnTraffic = function (n) {
    for (var i = 0; i < n; i++) {
      var model = VS.pick(VS.CAR_MODELS);
      var car = VS.makeCarMesh(model, false);
      car.driver = 'npc';
      car.route = makeLoop();
      car.routeIdx = 0;
      car.cruise = VS.rand(9, 13);
      var p = car.route[0];
      car.group.position.set(p.x, 0, p.z);
      car.yaw = Math.atan2(-(car.route[1].z - p.z), car.route[1].x - p.x);
      car.group.rotation.y = car.yaw;
      VS.traffic.push(car);
    }
  };

  VS.spawnParked = function (n) {
    var spots = [];
    [[-20, 100], [100, -60]].forEach(function (lot) {
      for (var k = -2; k <= 2; k++) spots.push({ x: lot[0] + k * 5, z: lot[1] - 8, yaw: 0 });
    });
    for (var i = 0; i < 6; i++) {
      var line = VS.pick([-120, -80, -40, 0, 40, 80, 120]);
      spots.push({ x: line + 5.5, z: VS.rand(-110, 110), yaw: Math.PI / 2 });
    }
    for (var s = 0; s < Math.min(n, spots.length); s++) {
      var sp = spots[s];
      var car = VS.makeCarMesh(VS.pick(VS.CAR_MODELS), false);
      car.driver = null;
      car.group.position.set(sp.x, 0, sp.z);
      car.yaw = sp.yaw;
      car.group.rotation.y = sp.yaw;
      VS.parked.push(car);
    }
  };

  function carAheadBlocked(car, all) {
    var f = VS.carForward(car);
    for (var i = 0; i < all.length; i++) {
      var o = all[i];
      if (o === car) continue;
      var dx = o.group.position.x - car.group.position.x;
      var dz = o.group.position.z - car.group.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d > 9 || d < 0.01) continue;
      if ((dx * f.x + dz * f.z) / d > 0.72) return true;
    }
    return false;
  }

  VS.updateTraffic = function (dt) {
    var all = VS.traffic.concat(VS.parked).concat(VS.policeCars || []);
    if (VS.state.car) all.push(VS.state.car);
    for (var i = 0; i < VS.traffic.length; i++) {
      var car = VS.traffic[i];
      var target = car.route[car.routeIdx];
      var dx = target.x - car.group.position.x;
      var dz = target.z - car.group.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < 5) { car.routeIdx = (car.routeIdx + 1) % car.route.length; continue; }
      var wantYaw = Math.atan2(-dz, dx);
      car.yaw = VS.angleLerp(car.yaw, wantYaw, VS.clamp(dt * 2.2, 0, 1));
      var blocked = carAheadBlocked(car, all);
      var want = blocked ? 0 : car.cruise;
      car.speed = VS.lerp(car.speed, want, VS.clamp(dt * 1.6, 0, 1));
      var f = VS.carForward(car);
      car.group.position.x += f.x * car.speed * dt;
      car.group.position.z += f.z * car.speed * dt;
      car.group.rotation.y = car.yaw;
      spinWheels(car, dt);
      // keep the city alive: recycle a car that drifted far from the player
      var pp = VS.state.playerPos;
      if (VS.dist2(car.group.position.x, car.group.position.z, pp.x, pp.z) > 230) {
        var near = randomRoadPoint();
        car.group.position.set(near.x, 0, near.z);
        car.route = makeLoop();
        car.routeIdx = 0;
      }
    }
  };

  function spinWheels(car, dt) {
    for (var i = 0; i < car.wheels.length; i++) {
      var w = car.wheels[i];
      w.userData.spin.rotation.z -= (car.speed * dt) / 0.42;
    }
  }

  VS.updatePlayerCar = function (dt, input) {
    var car = VS.state.car;
    if (!car) return;
    var model = car.model;
    var maxSpeed = VS.CFG.maxCarSpeed * model.speed * (VS.state.nitro && input.nitro ? 1.35 : 1);
    var accel = 15 * model.speed;
    if (input.up) car.speed += accel * dt;
    else if (input.down) car.speed -= (car.speed > 0.5 ? 26 : 10) * dt;
    else car.speed -= car.speed * 0.55 * dt;
    if (input.handbrake) car.speed -= car.speed * 1.8 * dt;
    car.speed = VS.clamp(car.speed, -11, maxSpeed);
    var steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    var turn = steer * 1.9 * VS.clamp(Math.abs(car.speed) / 10, 0, 1) * (input.handbrake ? 1.6 : 1);
    car.yaw += turn * dt * (car.speed < 0 ? -1 : 1);
    var f = VS.carForward(car);
    var before = car.speed;
    car.group.position.x += f.x * car.speed * dt;
    car.group.position.z += f.z * car.speed * dt;
    // bounds: beach ok, ocean and river blocked (except the bridge corridor)
    var p = car.group.position;
    p.x = VS.clamp(p.x, -165, 205);
    p.z = VS.clamp(p.z, -165, 188);
    if (p.x > 150 && !(p.z > -7 && p.z < 7)) p.x = 150;
    if (p.z > 188) p.z = 188;
    var pen = VS.collideCircle(p, VS.CFG.carRadius);
    if (pen > 0) {
      var impact = Math.abs(before);
      car.speed *= 0.55;
      if (impact > 9) {
        VS.damageCar(car, (impact - 9) * 1.4, p.x, p.z);
        VS.audio.crash();
        VS.state.shake = Math.min(1, impact / 30);
      }
    }
    car.group.rotation.y = car.yaw;
    // front-wheel steer visual
    for (var i = 0; i < car.wheels.length; i++) {
      var w = car.wheels[i];
      if (w.userData.front) w.rotation.y = steer * 0.32;
    }
    spinWheels(car, dt);
    if (car.health <= 0 && !car.burning) VS.wreckCar(car);
    if (car.burning) {
      car.fireTimer -= dt;
      if (car.fireTimer <= 0) {
        VS.spawnFire(p.x, 1.4, p.z);
        VS.spawnFire(p.x, 1.9, p.z);
        VS.spawnSmoke(p.x, 2.2, p.z, 2);
        car.fireTimer = 0.12;
      }
    }
    VS.state.playerPos.x = p.x;
    VS.state.playerPos.z = p.z;
    VS.state.playerYaw = car.yaw;
    VS.state.playerSpeed = car.speed;
  };

  VS.damageCar = function (car, amount, hx, hz) {
    if (!car || car.health <= 0) return;
    car.health -= amount * (VS.state.armour && car === VS.state.car ? 0.6 : 1);
    if (car.health <= 30 && car.health > 0) {
      car.smokeTimer -= 1;
      VS.spawnSmoke(car.group.position.x, 1.6, car.group.position.z, 1);
    }
    if (car.health <= 0) VS.wreckCar(car);
  };

  VS.wreckCar = function (car) {
    if (car.burning) return;
    car.burning = true;
    car.health = 0;
    VS.spawnFire(car.group.position.x, 1.4, car.group.position.z);
    VS.spawnSmoke(car.group.position.x, 2.4, car.group.position.z, 4);
    VS.audio.crash();
    if (car === VS.state.car) {
      VS.exitCar(true);
      VS.showBanner('CAR WRECKED', 'Your ride is scrap. Find another one.');
    }
  };

  VS.nearestStealableCar = function (x, z, maxD) {
    var best = null, bestD = maxD;
    var list = VS.parked.concat(VS.traffic);
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c === VS.state.car || c.burning) continue;
      var d = VS.dist2(x, z, c.group.position.x, c.group.position.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  };

  VS.enterCar = function (car) {
    var st = VS.state;
    var wasParked = car.driver === null;
    car.driver = 'player';
    st.car = car;
    st.onFoot = false;
    st.playerSpeed = 0;
    if (VS.playerMesh) VS.playerMesh.group.visible = false;
    var idx = VS.parked.indexOf(car);
    if (idx !== -1) VS.parked.splice(idx, 1);
    var tidx = VS.traffic.indexOf(car);
    if (tidx !== -1) VS.traffic.splice(tidx, 1);
    if (wasParked || tidx !== -1) {
      st.carsStolen++;
      VS.addHeat(tidx !== -1 ? 32 : 25);
      VS.showBanner(tidx !== -1 ? 'CARJACKED' : 'CAR STOLEN',
        car.model.name + ' is yours now. The VSPD has been called.');
      VS.audio.pickup();
      VS.fleeFrom(car.group.position.x, car.group.position.z, 30);
    }
    VS.updateHUDStatic();
  };

  VS.exitCar = function (wrecked) {
    var st = VS.state;
    var car = st.car;
    if (!car) return;
    var f = VS.carForward(car);
    var exitPos = { x: car.group.position.x - f.z * 3, z: car.group.position.z + f.x * 3 };
    VS.collideCircle(exitPos, VS.CFG.playerRadius);
    st.playerPos.x = exitPos.x;
    st.playerPos.z = exitPos.z;
    st.playerYaw = car.yaw;
    st.playerSpeed = 0;
    st.car = null;
    st.onFoot = true;
    if (!wrecked) {
      car.driver = null;
      car.speed = 0;
      VS.parked.push(car);
    }
    if (VS.playerMesh) {
      VS.playerMesh.group.visible = true;
      VS.playerMesh.group.position.set(px, 0, pz);
    }
    VS.updateHUDStatic();
  };

  // --- particle pool: smoke, fire, sparks and bullet tracers
  var P = { list: [], geo: null };
  function particleMat(color, opacity) {
    return new T.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, depthWrite: false });
  }
  VS.spawnSmoke = function (x, y, z, n) {
    for (var i = 0; i < (n || 1); i++) {
      if (P.list.length > 90) return;
      var m = new T.Mesh(new T.PlaneGeometry(1.6, 1.6), particleMat(0x888899, 0.5));
      m.position.set(x + VS.rand(-0.6, 0.6), y + VS.rand(0, 0.5), z + VS.rand(-0.6, 0.6));
      m.userData = { kind: 'smoke', life: VS.rand(1.2, 2), vy: VS.rand(1.5, 2.6), grow: 0.9 };
      VS.world.scene.add(m);
      P.list.push(m);
    }
  };
  VS.spawnFire = function (x, y, z) {
    if (P.list.length > 90) return;
    var px = x + VS.rand(-0.5, 0.5), pz = z + VS.rand(-0.5, 0.5);
    // two crossed planes so the flame reads from any camera angle
    for (var i = 0; i < 2; i++) {
      var m = new T.Mesh(new T.PlaneGeometry(3.0, 3.4), particleMat(VS.pick([0xff7a00, 0xffc400, 0xff3d00]), 0.9));
      m.position.set(px, y, pz);
      m.rotation.y = i * Math.PI / 2;
      m.userData = { kind: 'fire', life: VS.rand(0.25, 0.5), vy: 2.5, grow: 0.4 };
      VS.world.scene.add(m);
      P.list.push(m);
    }
  };
  VS.spawnSparks = function (x, y, z) {
    for (var i = 0; i < 5; i++) {
      if (P.list.length > 90) return;
      var m = new T.Mesh(new T.PlaneGeometry(0.22, 0.22), particleMat(0xffe27a, 1));
      m.position.set(x, y, z);
      m.userData = { kind: 'spark', life: VS.rand(0.2, 0.4), vy: VS.rand(1, 3), vx: VS.rand(-3, 3), vz: VS.rand(-3, 3), grow: 0 };
      VS.world.scene.add(m);
      P.list.push(m);
    }
  };
  VS.spawnTracer = function (ax, ay, az, bx, by, bz) {
    var dx = bx - ax, dy = by - ay, dz = bz - az;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.1) return;
    var m = new T.Mesh(new T.BoxGeometry(len, 0.05, 0.05), particleMat(0xffe27a, 0.95));
    m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    m.lookAt(bx, by, bz);
    m.userData = { kind: 'tracer', life: 0.09, vy: 0, grow: 0 };
    VS.world.scene.add(m);
    P.list.push(m);
  };
  VS.updateParticles = function (dt) {
    for (var i = P.list.length - 1; i >= 0; i--) {
      var m = P.list[i];
      var u = m.userData;
      u.life -= dt;
      if (u.life <= 0) {
        VS.world.scene.remove(m);
        m.material.dispose();
        m.geometry.dispose();
        P.list.splice(i, 1);
        continue;
      }
      m.position.y += (u.vy || 0) * dt;
      if (u.vx) m.position.x += u.vx * dt;
      if (u.vz) m.position.z += u.vz * dt;
      if (u.grow) { var s = 1 + u.grow * dt; m.scale.multiplyScalar(s); }
      if (u.kind === 'smoke') m.material.opacity = Math.max(0, u.life * 0.35);
      if (u.kind === 'fire') { m.rotation.z += dt * 6; m.material.opacity = Math.max(0, u.life * 2); }
      if (u.kind === 'tracer') m.material.opacity = Math.max(0, u.life * 10);
      m.lookAt(VS.world.camera.position);
    }
  };
})();
