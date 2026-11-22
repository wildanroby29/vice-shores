// people.js — Vice Shores: the player character on foot and the pedestrians.
// People are simple low-poly figures (boxes for torso, head, limbs) with a
// walk-cycle swing. Pedestrians wander the sidewalks and flee from gunfire,
// car theft and crashes near them.
(function () {
  var VS = window.VS;
  var T = THREE;
  VS.peds = [];
  VS.playerMesh = null;
  VS.shootTargets = [];

  VS.makePersonMesh = function (shirt, pants, skin, scale) {
    var g = new T.Group();
    var s = scale || 1;
    var shirtMat = new T.MeshLambertMaterial({ color: shirt });
    var pantsMat = new T.MeshLambertMaterial({ color: pants });
    var skinMat = new T.MeshLambertMaterial({ color: skin || 0xd9a066 });
    var legL = new T.Mesh(new T.BoxGeometry(0.22 * s, 0.78 * s, 0.24 * s), pantsMat);
    legL.position.set(-0.14 * s, 0.39 * s, 0);
    var legR = legL.clone();
    legR.position.x = 0.14 * s;
    var torso = new T.Mesh(new T.BoxGeometry(0.62 * s, 0.72 * s, 0.34 * s), shirtMat);
    torso.position.y = 1.14 * s;
    var armL = new T.Mesh(new T.BoxGeometry(0.16 * s, 0.62 * s, 0.18 * s), shirtMat);
    armL.position.set(-0.4 * s, 1.18 * s, 0);
    var armR = armL.clone();
    armR.position.x = 0.4 * s;
    var head = new T.Mesh(new T.BoxGeometry(0.34 * s, 0.36 * s, 0.32 * s), skinMat);
    head.position.y = 1.68 * s;
    var hair = new T.Mesh(new T.BoxGeometry(0.36 * s, 0.14 * s, 0.34 * s),
      new T.MeshLambertMaterial({ color: 0x241a12 }));
    hair.position.y = 1.9 * s;
    [legL, legR, torso, armL, armR, head, hair].forEach(function (m) {
      m.castShadow = true;
      g.add(m);
    });
    g.userData.parts = { legL: legL, legR: legR, armL: armL, armR: armR, torso: torso, head: head };
    return g;
  };

  VS.buildPlayerMesh = function () {
    var g = VS.makePersonMesh(0xe63946, 0x23233a, 0xd9a066, 1.05);
    var cap = new T.Mesh(new T.BoxGeometry(0.4, 0.1, 0.38),
      new T.MeshLambertMaterial({ color: 0xffd23e }));
    cap.position.y = 1.98;
    g.add(cap);
    // a small pistol in the right hand, shown when aiming
    var gun = new T.Mesh(new T.BoxGeometry(0.09, 0.14, 0.42),
      new T.MeshLambertMaterial({ color: 0x181820 }));
    gun.position.set(0.42, 1.0, 0.3);
    gun.name = 'pistol';
    g.add(gun);
    g.visible = true;
    VS.world.scene.add(g);
    VS.playerMesh = { group: g, parts: g.userData.parts, phase: 0 };
    return VS.playerMesh;
  };

  VS.updatePlayerMesh = function (dt, moveSpeed, aiming) {
    var pm = VS.playerMesh;
    if (!pm) return;
    var st = VS.state;
    pm.group.position.set(st.playerPos.x, 0, st.playerPos.z);
    pm.group.rotation.y = st.playerYaw;
    var p = pm.parts;
    if (moveSpeed > 0.2) {
      pm.phase += dt * moveSpeed * 1.9;
      var swing = Math.sin(pm.phase) * 0.55;
      p.legL.rotation.x = swing;
      p.legR.rotation.x = -swing;
      p.armL.rotation.x = -swing * 0.8;
      p.armR.rotation.x = aiming ? -Math.PI / 2 : swing * 0.8;
    } else {
      p.legL.rotation.x *= 0.8; p.legR.rotation.x *= 0.8;
      p.armL.rotation.x *= 0.8;
      p.armR.rotation.x = aiming ? -Math.PI / 2 : p.armR.rotation.x * 0.8;
    }
    var gun = pm.group.getObjectByName('pistol');
    if (gun) gun.visible = !st.onFoot ? false : true;
  };

  function sidewalkPoint() {
    var roads = [];
    for (var i = -3; i <= 3; i++) roads.push(i * 40);
    var vertical = VS.rng() < 0.5;
    var line = VS.pick(roads);
    var along = VS.rand(-120, 120);
    var off = VS.pick([-8.5, 8.5]);
    return vertical ? { x: line + off, z: along } : { x: along, z: line + off };
  }

  VS.spawnPedestrians = function (n) {
    var shirts = [0x7bd389, 0xffafcc, 0xa0c4ff, 0xffd23e, 0xffffff, 0xf4845f, 0xc77dff];
    for (var i = 0; i < n; i++) {
      var g = VS.makePersonMesh(VS.pick(shirts), VS.pick([0x23233a, 0x3a3a4a, 0x5a4a3a]), 0xd9a066, VS.rand(0.95, 1.08));
      var start = sidewalkPoint();
      g.position.set(start.x, 0, start.z);
      VS.world.scene.add(g);
      var ped = {
        group: g, parts: g.userData.parts, phase: VS.rand(0, 6),
        yaw: VS.rand(0, Math.PI * 2), speed: VS.rand(1.1, 1.9),
        target: sidewalkPoint(), state: 'walk', fleeTimer: 0, health: 100,
      };
      g.rotation.y = ped.yaw;
      VS.peds.push(ped);
      VS.shootTargets.push({ obj: g, kind: 'ped', ref: ped });
    }
  };

  VS.updatePedestrians = function (dt) {
    var pp = VS.state.playerPos;
    for (var i = 0; i < VS.peds.length; i++) {
      var ped = VS.peds[i];
      if (ped.state === 'down') {
        ped.downTimer -= dt;
        if (ped.downTimer <= 0) {
          var s = sidewalkPoint();
          ped.group.position.set(s.x, 0, s.z);
          ped.group.rotation.x = 0;
          ped.state = 'walk';
          ped.health = 100;
          ped.target = sidewalkPoint();
        }
        continue;
      }
      if (ped.state === 'flee') {
        ped.fleeTimer -= dt;
        if (ped.fleeTimer <= 0) { ped.state = 'walk'; ped.target = sidewalkPoint(); }
      }
      var tx = ped.target.x, tz = ped.target.z;
      var dx = tx - ped.group.position.x;
      var dz = tz - ped.group.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < 2) {
        if (ped.state === 'flee') { ped.target = sidewalkPoint(); }
        else { ped.target = sidewalkPoint(); }
        continue;
      }
      var wantYaw = Math.atan2(-dz, dx);
      ped.yaw = VS.angleLerp(ped.yaw, wantYaw, VS.clamp(dt * 3, 0, 1));
      var sp = ped.state === 'flee' ? 5.2 : ped.speed;
      ped.group.position.x += Math.cos(ped.yaw) * sp * dt;
      ped.group.position.z += -Math.sin(ped.yaw) * sp * dt;
      ped.group.position.x = VS.clamp(ped.group.position.x, -148, 148);
      ped.group.position.z = VS.clamp(ped.group.position.z, -148, 148);
      ped.group.rotation.y = ped.yaw;
      ped.phase += dt * sp * 2.2;
      var swing = Math.sin(ped.phase) * 0.5;
      ped.parts.legL.rotation.x = swing;
      ped.parts.legR.rotation.x = -swing;
      ped.parts.armL.rotation.x = -swing * 0.7;
      ped.parts.armR.rotation.x = swing * 0.7;
    }
  };

  VS.fleeFrom = function (x, z, radius) {
    for (var i = 0; i < VS.peds.length; i++) {
      var ped = VS.peds[i];
      if (ped.state === 'down') continue;
      var d = VS.dist2(x, z, ped.group.position.x, ped.group.position.z);
      if (d < radius) {
        ped.state = 'flee';
        ped.fleeTimer = 4;
        var away = Math.atan2(-(ped.group.position.z - z), ped.group.position.x - x);
        ped.target = {
          x: VS.clamp(ped.group.position.x + Math.cos(away) * 40, -148, 148),
          z: VS.clamp(ped.group.position.z - Math.sin(away) * 40, -148, 148),
        };
      }
    }
  };

  VS.nearestPed = function (x, z, maxD) {
    var best = null, bestD = maxD;
    for (var i = 0; i < VS.peds.length; i++) {
      var ped = VS.peds[i];
      if (ped.state === 'down') continue;
      var d = VS.dist2(x, z, ped.group.position.x, ped.group.position.z);
      if (d < bestD) { bestD = d; best = ped; }
    }
    return best;
  };

  VS.damagePed = function (ped, amount) {
    if (!ped || ped.state === 'down') return;
    ped.health -= amount;
    if (ped.health <= 0) {
      ped.state = 'down';
      ped.downTimer = 12;
      ped.group.rotation.x = -Math.PI / 2;
      ped.group.position.y = 0.3;
      VS.addHeat(30);
      VS.fleeFrom(ped.group.position.x, ped.group.position.z, 35);
    }
  };

  // Hitscan against pedestrians and cars. Returns {kind, ref, point, dist} or null.
  var raycaster = null;
  VS.shootRay = function (origin, dir, maxDist) {
    if (!raycaster) raycaster = new T.Raycaster();
    raycaster.set(origin, dir);
    raycaster.far = maxDist;
    var objs = [];
    for (var i = 0; i < VS.shootTargets.length; i++) objs.push(VS.shootTargets[i].obj);
    var hits = raycaster.intersectObjects(objs, true);
    if (!hits.length) return null;
    var hit = hits[0];
    var o = hit.object;
    while (o) {
      for (var j = 0; j < VS.shootTargets.length; j++) {
        if (VS.shootTargets[j].obj === o) {
          return { kind: VS.shootTargets[j].kind, ref: VS.shootTargets[j].ref, point: hit.point, dist: hit.distance };
        }
      }
      o = o.parent;
    }
    return { kind: 'world', ref: null, point: hit.point, dist: hit.distance };
  };

  VS.registerShootTarget = function (obj, kind, ref) {
    VS.shootTargets.push({ obj: obj, kind: kind, ref: ref });
  };
})();
