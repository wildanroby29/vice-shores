// police.js — Vice Shores: the wanted system and the VSPD response.
// Heat (0–100) drives the stars (0–5). Crimes add heat; it cools when the
// player stays clean and unseen. Police cars spawn to match the stars, chase
// and ram; at 4–5 stars a helicopter joins with a spotlight, and at 3+ stars
// roadblocks go up ahead of the player. Get caught on foot and you are busted.
(function () {
  var VS = window.VS;
  var T = THREE;
  VS.policeCars = [];
  VS.heli = null;
  VS.roadblocks = [];
  var lastCrimeAt = -100;
  var bustTimer = 0;
  var blockTimer = 0;

  function starsFor(heat) {
    if (heat <= 0) return 0;
    if (heat < 20) return 1;
    if (heat < 40) return 2;
    if (heat < 60) return 3;
    if (heat < 80) return 4;
    return 5;
  }

  VS.addHeat = function (n) {
    var st = VS.state;
    st.heat = VS.clamp(st.heat + n, 0, 100);
    st.wanted = starsFor(st.heat);
    lastCrimeAt = st.time;
    VS.updateHUDStatic();
  };

  VS.setWanted = function (stars) {
    var st = VS.state;
    var want = [0, 10, 30, 50, 70, 90][VS.clamp(stars, 0, 5)];
    if (want > st.heat) st.heat = want;
    st.wanted = starsFor(st.heat);
    lastCrimeAt = st.time;
    VS.updateHUDStatic();
  };

  function policeTargetCount(stars) {
    return [0, 1, 2, 3, 3, 4][stars] || 0;
  }

  function spawnPoliceCar() {
    var st = VS.state;
    var model = { name: 'VSPD Interceptor', color: 0xf2f2f2, speed: 1.06 };
    var car = VS.makeCarMesh(model, true);
    car.driver = 'police';
    car.cruise = 24;
    var a = VS.rand(0, Math.PI * 2);
    var d = VS.rand(70, 110);
    var x = VS.clamp(st.playerPos.x + Math.cos(a) * d, -150, 150);
    var z = VS.clamp(st.playerPos.z + Math.sin(a) * d, -150, 150);
    car.group.position.set(x, 0, z);
    car.yaw = Math.atan2(-(st.playerPos.z - z), st.playerPos.x - x);
    car.group.rotation.y = car.yaw;
    car.name = VS.POLICE_NAMES[VS.policeCars.length % VS.POLICE_NAMES.length];
    VS.policeCars.push(car);
    return car;
  }

  function removePoliceCar(car) {
    var i = VS.policeCars.indexOf(car);
    if (i !== -1) VS.policeCars.splice(i, 1);
    var t = VS.shootTargets.indexOf(VS.shootTargets.find(function (s) { return s.ref === car; }));
    if (t !== -1) VS.shootTargets.splice(t, 1);
    VS.world.scene.remove(car.group);
  }

  function makeHelicopter() {
    var g = new T.Group();
    var bodyMat = new T.MeshLambertMaterial({ color: 0xe8e8e8 });
    var body = new T.Mesh(new T.BoxGeometry(5.6, 2.1, 2.8), bodyMat);
    body.castShadow = true;
    g.add(body);
    var stripe = new T.Mesh(new T.BoxGeometry(5.7, 0.5, 2.85), new T.MeshLambertMaterial({ color: 0xd7263d }));
    stripe.position.set(0, -0.4, 0);
    g.add(stripe);
    var glass = new T.Mesh(new T.BoxGeometry(1.9, 1.3, 2.6),
      new T.MeshLambertMaterial({ color: 0x9fe8ff }));
    glass.position.set(2.2, 0.2, 0);
    g.add(glass);
    var tail = new T.Mesh(new T.BoxGeometry(5.5, 0.5, 0.5), bodyMat);
    tail.position.set(-4.6, 0.4, 0);
    g.add(tail);
    var tailFin = new T.Mesh(new T.BoxGeometry(0.2, 2.4, 0.6), bodyMat);
    tailFin.position.set(-7.2, 1.1, 0);
    g.add(tailFin);
    var rotor = new T.Mesh(new T.BoxGeometry(7.5, 0.1, 0.55), new T.MeshLambertMaterial({ color: 0x11131c }));
    rotor.position.y = 1.5;
    g.add(rotor);
    var skidMat = new T.MeshLambertMaterial({ color: 0x22242e });
    [-1.3, 1.3].forEach(function (z) {
      var skid = new T.Mesh(new T.BoxGeometry(4.5, 0.12, 0.12), skidMat);
      skid.position.set(0, -1.2, z);
      g.add(skid);
    });
    var tailRotor = new T.Mesh(new T.BoxGeometry(0.1, 2.2, 0.5),
      new T.MeshLambertMaterial({ color: 0x11131c }));
    tailRotor.position.set(-7.6, 0.4, 0);
    g.add(tailRotor);
    var lightR = new T.Mesh(new T.SphereGeometry(0.35, 8, 6), new T.MeshBasicMaterial({ color: 0xff2222 }));
    lightR.position.set(1.6, -1.1, -1.3);
    g.add(lightR);
    var lightB = new T.Mesh(new T.SphereGeometry(0.35, 8, 6), new T.MeshBasicMaterial({ color: 0x2266ff }));
    lightB.position.set(1.6, -1.1, 1.3);
    g.add(lightB);
    var beam = new T.Mesh(new T.ConeGeometry(2.0, 30, 16, 1, true),
      new T.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false }));
    beam.position.y = -15;
    g.add(beam);
    var spot = new T.SpotLight(0xfff2b0, 60, 90, 0.32, 0.5, 1.2);
    g.add(spot);
    g.add(spot.target);
    g.visible = false;
    VS.world.scene.add(g);
    VS.heli = { group: g, rotor: rotor, beam: beam, spot: spot, tailRotor: tailRotor, lightR: lightR, lightB: lightB };
    return VS.heli;
  }

  function placeRoadblocks() {
    var st = VS.state;
    var f = st.onFoot
      ? { x: Math.cos(st.playerYaw), z: -Math.sin(st.playerYaw) }
      : VS.carForward(st.car);
    var cx = st.playerPos.x + f.x * 48;
    var cz = st.playerPos.z + f.z * 48;
    var perp = { x: -f.z, z: f.x };
    for (var i = -1; i <= 1; i += 2) {
      var car = VS.makeCarMesh({ name: 'VSPD Interceptor', color: 0xf2f2f2, speed: 1 }, true);
      car.driver = 'roadblock';
      car.name = 'ROADBLOCK';
      var x = cx + perp.x * i * 4;
      var z = cz + perp.z * i * 4;
      car.group.position.set(x, 0, z);
      car.yaw = Math.atan2(-f.z, f.x) + Math.PI / 2;
      car.group.rotation.y = car.yaw;
      VS.roadblocks.push(car);
      VS.policeCars.push(car);
    }
  }

  function clearRoadblocks() {
    for (var i = 0; i < VS.roadblocks.length; i++) {
      var car = VS.roadblocks[i];
      var pi = VS.policeCars.indexOf(car);
      if (pi !== -1) VS.policeCars.splice(pi, 1);
      VS.world.scene.remove(car.group);
    }
    VS.roadblocks = [];
  }

  VS.updateWanted = function (dt) {
    var st = VS.state;
    if (st.mode !== 'playing') return;
    // heat cools when clean and unseen
    var nearCop = false;
    for (var i = 0; i < VS.policeCars.length; i++) {
      var c = VS.policeCars[i];
      if (VS.dist2(st.playerPos.x, st.playerPos.z, c.group.position.x, c.group.position.z) < 35) { nearCop = true; break; }
    }
    if (st.time - lastCrimeAt > 10 && !nearCop && st.heat > 0) {
      st.heat = Math.max(0, st.heat - 3 * dt);
      st.wanted = starsFor(st.heat);
    }
    // match police numbers to the stars
    var want = policeTargetCount(st.wanted);
    var active = VS.policeCars.filter(function (c) { return c.driver === 'police'; }).length;
    blockTimer -= dt;
    if (active < want && blockTimer <= 0) {
      spawnPoliceCar();
      blockTimer = 1.2;
    } else if (active > want) {
      var far = null, farD = -1;
      for (var j = 0; j < VS.policeCars.length; j++) {
        var pc = VS.policeCars[j];
        if (pc.driver !== 'police') continue;
        var d = VS.dist2(st.playerPos.x, st.playerPos.z, pc.group.position.x, pc.group.position.z);
        if (d > farD) { farD = d; far = pc; }
      }
      if (far) removePoliceCar(far);
    }
    // roadblocks at 3+ stars
    if (st.wanted >= 3 && VS.roadblocks.length === 0) placeRoadblocks();
    if (st.wanted < 3 && VS.roadblocks.length > 0) clearRoadblocks();
    // helicopter at 4+ stars
    if (!VS.heli) makeHelicopter();
    VS.heli.group.visible = st.wanted >= 4;
  };

  VS.updatePolice = function (dt) {
    var st = VS.state;
    if (st.mode !== 'playing') return;
    var pp = st.playerPos;
    for (var i = 0; i < VS.policeCars.length; i++) {
      var car = VS.policeCars[i];
      if (car.driver === 'roadblock') {
        // flash the light bar, stay put
        car.lightBar.red.visible = Math.floor(st.time * 3) % 2 === 0;
        car.lightBar.blue.visible = Math.floor(st.time * 3) % 2 === 1;
        continue;
      }
      var dx = pp.x - car.group.position.x;
      var dz = pp.z - car.group.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      var wantYaw = Math.atan2(-dz, dx);
      car.yaw = VS.angleLerp(car.yaw, wantYaw, VS.clamp(dt * 2.6, 0, 1));
      var pursue = VS.clamp(16 + st.wanted * 2.2, 16, 30);
      if (d < 4) pursue = 6; // closing in to ram / bust
      car.speed = VS.lerp(car.speed, pursue, VS.clamp(dt * 1.4, 0, 1));
      var f = VS.carForward(car);
      car.group.position.x += f.x * car.speed * dt;
      car.group.position.z += f.z * car.speed * dt;
      car.group.position.x = VS.clamp(car.group.position.x, -165, 165);
      car.group.position.z = VS.clamp(car.group.position.z, -165, 188);
      VS.collideCircle(car.group.position, VS.CFG.carRadius);
      car.group.rotation.y = car.yaw;
      for (var w = 0; w < car.wheels.length; w++) car.wheels[w].userData.spin.rotation.z -= (car.speed * dt) / 0.42;
      car.lightBar.red.visible = Math.floor(st.time * 3) % 2 === 0;
      car.lightBar.blue.visible = Math.floor(st.time * 3) % 2 === 1;
      // ram the player's car
      if (st.car && d < 4.2 && car.speed > 4) {
        VS.damageCar(st.car, 6 * dt * 10, car.group.position.x, car.group.position.z);
        st.car.speed *= 0.94;
        VS.state.shake = Math.max(VS.state.shake || 0, 0.35);
        if (Math.random() < dt * 2) VS.audio.crash();
      }
      // bust the player on foot
      if (st.onFoot && d < 2.6) {
        bustTimer += dt;
        car.speed = 0;
        if (bustTimer > 1.2) { VS.busted(); return; }
      }
    }
    if (st.onFoot) {
      var anyNear = VS.policeCars.some(function (c) {
        return VS.dist2(pp.x, pp.z, c.group.position.x, c.group.position.z) < 6;
      });
      if (!anyNear) bustTimer = 0;
    } else bustTimer = 0;
    // helicopter follows, spotlight on the player
    if (VS.heli && VS.heli.group.visible) {
      var h = VS.heli;
      // hover ahead and to the side; in the chase shot it flies low and far so it reads in frame
      var hf = st.shotMode === 'chase' ? 70 : 45;
      var hy = st.shotMode === 'chase' ? 10 : 20;
      // in the chase shot the helicopter sits slightly LEFT of the road centre,
      // so it lands in the clear middle of the frame instead of behind the HUD
      var hl = st.shotMode === 'chase' ? -8 : 10;
      var fwd = st.car ? VS.carForward(st.car) : { x: Math.cos(st.playerYaw), z: -Math.sin(st.playerYaw) };
      var hx = pp.x + fwd.x * hf - fwd.z * hl, hz = pp.z + fwd.z * hf + fwd.x * hl;
      var hdx = hx - h.group.position.x, hdz = hz - h.group.position.z;
      if (hdx * hdx + hdz * hdz > 625) {
        // first appearance (or a long way off): snap straight to the hover point
        h.group.position.x = hx;
        h.group.position.z = hz;
      } else {
        h.group.position.x = VS.lerp(h.group.position.x, hx, VS.clamp(dt * 1.2, 0, 1));
        h.group.position.z = VS.lerp(h.group.position.z, hz, VS.clamp(dt * 1.2, 0, 1));
      }
      h.group.position.y = hy;
      h.rotor.rotation.y += dt * 22;
      h.tailRotor.rotation.x += dt * 30;
      if (h.lightR) {
        h.lightR.visible = Math.floor(st.time * 3) % 2 === 0;
        h.lightB.visible = Math.floor(st.time * 3) % 2 === 1;
      }
      h.spot.target.position.set(pp.x - h.group.position.x, -hy, pp.z - h.group.position.z);
      // aim the visible beam cone from the helicopter down onto the player
      var bdx = pp.x - h.group.position.x, bdy = -h.group.position.y, bdz = pp.z - h.group.position.z;
      var blen = Math.sqrt(bdx * bdx + bdy * bdy + bdz * bdz) || 1;
      h.beam.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), new T.Vector3(bdx / blen, bdy / blen, bdz / blen));
      h.beam.position.set(bdx / 2, bdy / 2, bdz / 2);
      h.beam.scale.set(1, blen / 30, 1);
    }
  };

  VS.dispatchUnits = function () {
    var st = VS.state;
    var units = [];
    if (st.wanted === 0) return units;
    var sorted = VS.policeCars.slice().sort(function (a, b) {
      var da = VS.dist2(st.playerPos.x, st.playerPos.z, a.group.position.x, a.group.position.z);
      var db = VS.dist2(st.playerPos.x, st.playerPos.z, b.group.position.x, b.group.position.z);
      return da - db;
    });
    var tactics = ['RAMMING', 'FLANKING', 'PIT', 'FLANKING', 'RAMMING'];
    for (var i = 0; i < sorted.length; i++) {
      var c = sorted[i];
      var d = Math.round(VS.dist2(st.playerPos.x, st.playerPos.z, c.group.position.x, c.group.position.z));
      units.push({
        name: c.driver === 'roadblock' ? 'ROADBLOCK' : (c.name || 'VSPD'),
        dist: d,
        tactic: c.driver === 'roadblock' ? 'ROADBLOCK' : tactics[i % tactics.length],
      });
    }
    if (VS.heli && VS.heli.group.visible) {
      units.push({ name: 'AIR-1 CONDOR', dist: 0, tactic: 'SPOTLIGHT' });
    }
    if (!units.length) units.push({ name: 'VSPD DISPATCH', dist: 0, tactic: 'SEARCHING' });
    return units;
  };

  VS.clearPolice = function () {
    while (VS.policeCars.length) removePoliceCar(VS.policeCars[0]);
    clearRoadblocks();
    if (VS.heli) VS.heli.group.visible = false;
  };

  VS.busted = function () {
    var st = VS.state;
    if (st.mode !== 'playing') return;
    st.mode = 'busted';
    st.busts++;
    var fine = Math.min(150, st.money);
    st.money -= fine;
    st.wanted = 0;
    st.heat = 0;
    VS.clearPolice();
    VS.audio.busted();
    VS.el('busted-text').textContent = 'The VSPD caught up with you. Fine paid: ' +
      VS.fmtMoney(fine) + '. Marla is not impressed.';
    VS.el('busted-screen').classList.remove('hidden');
    VS.updateHUDStatic();
  };

  VS.respawnAfterBust = function () {
    var st = VS.state;
    st.mode = 'playing';
    st.onFoot = true;
    st.car = null;
    st.health = 100;
    st.playerPos.x = VS.world.safehouse.x;
    st.playerPos.z = VS.world.safehouse.z;
    st.playerYaw = Math.PI * 0.75;
    if (VS.playerMesh) {
      VS.playerMesh.group.visible = true;
      VS.playerMesh.group.position.set(st.playerPos.x, 0, st.playerPos.z);
    }
    VS.el('busted-screen').classList.add('hidden');
    VS.showBanner('BACK ON THE STREETS', 'Lay low for a while. Marla still has jobs.');
    VS.updateHUDStatic();
  };
})();
