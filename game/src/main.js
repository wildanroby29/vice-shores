// main.js — Vice Shores: boot, the game loop, third-person cameras, on-foot
// movement and combat, and save/load. Wires every module together.
(function () {
  var VS = window.VS;
  var T = THREE;
  var renderer = null, scene = null, camera = null;
  var clock = null;
  var shootCooldown = 0, reloadTimer = 0, prevShoot = false;
  var hudTimer = 0, readyFrames = 0;
  var camTarget = null;

  function freshWeapons() {
    return VS.WEAPONS.map(function (w) {
      return { name: w.name, damage: w.damage, rate: w.rate, range: w.range,
        mag: w.mag, ammo: w.mag === Infinity ? Infinity : w.mag, reserve: w.reserve, auto: w.auto };
    });
  }

  VS.switchWeapon = function (i) {
    var st = VS.state;
    if (st.mode !== 'playing' || i < 0 || i > 3) return;
    st.weaponIndex = i;
    reloadTimer = 0;
    VS.audio.click();
    VS.updateHUDStatic();
  };

  VS.reloadWeapon = function () {
    var st = VS.state;
    if (st.mode !== 'playing' || st.onFoot === false) return;
    var w = st.weapons[st.weaponIndex];
    if (!w || w.mag === Infinity || w.ammo === w.mag || w.reserve <= 0 || reloadTimer > 0) return;
    reloadTimer = 0.9;
    VS.audio.reload();
  };

  function fireWeapon() {
    var st = VS.state;
    var w = st.weapons[st.weaponIndex];
    if (!w) return;
    if (w.name === 'FISTS') {
      var ped = VS.nearestPed(st.playerPos.x, st.playerPos.z, 2.6);
      if (ped) {
        VS.damagePed(ped, w.damage);
        VS.audio.punch();
        VS.spawnSparks(ped.group.position.x, 1.4, ped.group.position.z);
      } else {
        VS.audio.punch();
      }
      shootCooldown = w.rate;
      return;
    }
    if (w.ammo <= 0) {
      if (w.reserve > 0) VS.reloadWeapon();
      shootCooldown = 0.25;
      return;
    }
    w.ammo--;
    var origin = camera.position.clone();
    var dir = new T.Vector3();
    camera.getWorldDirection(dir);
    var muzzle = new T.Vector3(
      st.playerPos.x + Math.cos(st.playerYaw) * 0.7,
      1.45,
      st.playerPos.z - Math.sin(st.playerYaw) * 0.7);
    var hit = VS.shootRay(origin, dir, w.range);
    var end = hit ? hit.point : origin.clone().add(dir.clone().multiplyScalar(w.range));
    VS.spawnTracer(muzzle.x, muzzle.y, muzzle.z, end.x, end.y, end.z);
    VS.spawnSparks(muzzle.x, muzzle.y, muzzle.z);
    VS.audio.shot();
    VS.addHeat(6);
    VS.fleeFrom(st.playerPos.x, st.playerPos.z, 30);
    if (hit) {
      if (hit.kind === 'ped') {
        VS.damagePed(hit.ref, w.damage);
        VS.addHeat(12);
      } else if (hit.kind === 'car' || hit.kind === 'policecar') {
        VS.damageCar(hit.ref, w.damage, hit.point.x, hit.point.z);
        if (hit.kind === 'policecar') VS.addHeat(20);
      }
    }
    shootCooldown = w.rate;
    if (w.ammo === 0 && w.reserve > 0) VS.reloadWeapon();
    VS.updateHUDStatic();
  }

  function tryInteract() {
    var st = VS.state;
    if (st.onFoot) {
      var car = VS.nearestStealableCar(st.playerPos.x, st.playerPos.z, 4.5);
      if (car) VS.enterCar(car);
    } else {
      VS.exitCar(false);
    }
  }

  function moveOnFoot(dt, input) {
    var st = VS.state;
    var Y = st.camYaw;
    var fx = -Math.sin(Y), fz = -Math.cos(Y);
    var rx = Math.cos(Y), rz = -Math.sin(Y);
    var fwd = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    var str = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    var mx = fx * fwd + rx * str;
    var mz = fz * fwd + rz * str;
    var len = Math.sqrt(mx * mx + mz * mz);
    var speed = 0;
    if (len > 0.01) {
      mx /= len; mz /= len;
      speed = input.sprint ? VS.CFG.sprintSpeed : VS.CFG.walkSpeed;
      st.playerPos.x += mx * speed * dt;
      st.playerPos.z += mz * speed * dt;
      st.playerYaw = Math.atan2(-mz, mx);
    }
    // bounds: beach and pier are walkable, the river is not (except the bridge)
    var p = st.playerPos;
    p.x = VS.clamp(p.x, -165, 205);
    p.z = VS.clamp(p.z, -165, 242);
    if (p.x > 150 && !(p.z > -7 && p.z < 7)) p.x = 150;
    if (p.z > 190 && !(Math.abs(p.x) < 5 && p.z <= 240)) p.z = 190;
    var pos = { x: p.x, z: p.z };
    VS.collideCircle(pos, VS.CFG.playerRadius);
    p.x = pos.x; p.z = pos.z;
    st.playerSpeed = speed;
    // cars that hit the player hurt
    var all = VS.traffic.concat(VS.policeCars);
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (Math.abs(c.speed) < 3) continue;
      var d = VS.dist2(p.x, p.z, c.group.position.x, c.group.position.z);
      if (d < 2.2) {
        st.health -= 18;
        VS.addHeat(10);
        VS.audio.crash();
        VS.state.shake = 0.6;
        p.x += (p.x - c.group.position.x) * 0.9;
        p.z += (p.z - c.group.position.z) * 0.9;
        if (st.health <= 0) { st.health = 100; VS.busted(); }
        break;
      }
    }
    VS.updatePlayerMesh(dt, speed, input.shoot || VS.shotAim);
  }

  function updateCamera(dt) {
    var st = VS.state;
    // mouse drag orbits the camera
    st.camYaw -= VS.mouse.dx * 0.005;
    st.camPitch = VS.clamp(st.camPitch + VS.mouse.dy * 0.004, 0.06, 1.05);
    VS.mouse.dx = 0; VS.mouse.dy = 0;
    if (st.mode === 'title') {
      var a = st.time * 0.045;
      camera.position.set(Math.cos(a) * 135, 58, 20 + Math.sin(a) * 135);
      camera.lookAt(0, 10, 0);
      return;
    }
    var target = camTarget;
    var dist = st.camDist;
    var pitch = st.camPitch;
    if (!st.onFoot && st.car) {
      // chase cam: swing behind the car's heading
      var wantYaw = st.car.yaw - Math.PI / 2;
      st.camYaw = VS.angleLerp(st.camYaw, wantYaw, VS.clamp(dt * 2.6, 0, 1));
      pitch = 0.42;
      dist = 7.5 + VS.clamp(Math.abs(st.car.speed) / VS.CFG.maxCarSpeed, 0, 1) * 2.0;
      target.set(st.playerPos.x, 1.6, st.playerPos.z);
    } else {
      target.set(st.playerPos.x, 1.7, st.playerPos.z);
    }
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var ox = Math.sin(st.camYaw) * cp * dist;
    var oz = Math.cos(st.camYaw) * cp * dist;
    var oy = sp * dist;
    camera.position.set(target.x + ox, target.y + oy, target.z + oz);
    if (!st.onFoot && st.car) {
      // slight side offset so a ramming police car cannot hide the player car
      var cy = st.car.yaw;
      camera.position.x += Math.sin(cy) * 1.5;
      camera.position.z += Math.cos(cy) * 1.5;
    }
    if (camera.position.y < 0.8) camera.position.y = 0.8;
    var shake = st.shake || 0;
    if (shake > 0.01) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake * 0.6;
      st.shake = Math.max(0, shake - dt * 1.8);
    }
    var look = target.clone();
    if (!st.onFoot && st.car) {
      var f = VS.carForward(st.car);
      look.x += f.x * 4; look.z += f.z * 4;
    } else {
      look.x += -Math.sin(st.camYaw) * 2.5;
      look.z += -Math.cos(st.camYaw) * 2.5;
    }
    camera.lookAt(look);
  }

  function updatePlaying(dt) {
    var st = VS.state;
    var input = VS.readInput();
    if (VS.shotDrive) { input.up = true; input.down = false; input.left = false; input.right = false; }
    if (input.interactEdge) { tryInteract(); VS.consumeInteractEdge(); }
    shootCooldown -= dt;
    if (reloadTimer > 0) {
      reloadTimer -= dt;
      if (reloadTimer <= 0) {
        var w = st.weapons[st.weaponIndex];
        if (w && w.mag !== Infinity) {
          var need = w.mag - w.ammo;
          var take = Math.min(need, w.reserve);
          w.ammo += take; w.reserve -= take;
          VS.updateHUDStatic();
        }
      }
    }
    if (st.onFoot) {
      moveOnFoot(dt, input);
      var edge = input.shoot && !prevShoot;
      if ((input.shoot && st.weapons[st.weaponIndex].auto) || edge) {
        if (shootCooldown <= 0) fireWeapon();
      }
    } else if (st.car) {
      VS.updatePlayerCar(dt, input);
    }
    prevShoot = input.shoot;
    VS.mouse.clicked = false;
    if (VS.shotFireAt && st.time >= VS.shotFireAt) {
      VS.shotFireAt = 0;
      if (st.onFoot) fireWeapon();
    }
    VS.updateTraffic(dt);
    VS.updatePedestrians(dt);
    VS.updateWanted(dt);
    VS.updatePolice(dt);
    VS.updateMissions(dt, input);
    VS.tickCrew(dt);
    VS.updateParticles(dt);
    // beacon spin + foam drift
    if (VS.world.beacon && VS.world.beacon.visible) {
      VS.world.beacon.userData.diamond.rotation.y += dt * 2;
      VS.world.beacon.userData.diamond.position.y = 9 + Math.sin(st.time * 2) * 0.6;
    }
    if (VS.world.foam) VS.world.foam.position.z = VS.CFG.oceanZ + 1 + Math.sin(st.time * 0.5) * 0.8;
    st.clockMin += dt * 2;
    VS.audio.update(dt, st.car ? Math.abs(st.car.speed) / VS.CFG.maxCarSpeed : 0, input.up, st.wanted);
    hudTimer -= dt;
    if (hudTimer <= 0) { hudTimer = 0.15; VS.updateHUD(dt); }
  }

  VS.togglePause = function () {
    var st = VS.state;
    if (st.mode === 'playing') VS.setMode('paused');
    else if (st.mode === 'paused') VS.setMode('playing');
  };

  VS.toggleGarage = function () {
    var st = VS.state;
    if (st.mode === 'garage') { VS.setMode('playing'); return; }
    if (st.mode !== 'playing') return;
    var d = VS.dist2(st.playerPos.x, st.playerPos.z, VS.world.garage.x, VS.world.garage.z);
    if (d < 22 || st.shotMode === 'garage') VS.setMode('garage');
    else VS.showDialogue('JAI', 'The garage is at Dockside Customs, by the pier road. Bring the car in.');
  };

  VS.saveGame = function (slot) {
    var st = VS.state;
    try {
      localStorage.setItem(VS.CFG.savePrefix + slot, JSON.stringify({
        money: st.money, respect: st.respect, rank: st.rank,
        jobIndex: st.jobIndex, health: st.health, armor: st.armor,
        clockMin: st.clockMin, nitro: st.nitro, armour: st.armour,
        playerPos: { x: st.playerPos.x, z: st.playerPos.z },
        weapons: st.weapons.map(function (w) { return { ammo: w.ammo, reserve: w.reserve }; }),
      }));
    } catch (e) {}
  };

  VS.loadGame = function (slot) {
    var st = VS.state;
    var raw = null;
    try { raw = localStorage.getItem(VS.CFG.savePrefix + slot); } catch (e) {}
    if (!raw) return false;
    try {
      var d = JSON.parse(raw);
      st.money = d.money; st.respect = d.respect; st.rank = d.rank || 0;
      st.health = d.health; st.armor = d.armor || 0;
      st.clockMin = d.clockMin || 17 * 60 + 41;
      st.nitro = !!d.nitro; st.armour = !!d.armour;
      st.playerPos.x = d.playerPos.x; st.playerPos.z = d.playerPos.z;
      st.onFoot = true; st.car = null;
      if (d.weapons) d.weapons.forEach(function (w, i) {
        if (st.weapons[i]) { st.weapons[i].ammo = w.ammo; st.weapons[i].reserve = w.reserve; }
      });
      if (VS.playerMesh) VS.playerMesh.group.visible = true;
      VS.startJob(Math.min(d.jobIndex || 0, VS.JOBS.length - 1));
      VS.setMode('playing');
      VS.updateHUDStatic();
      return true;
    } catch (e) { return false; }
  };

  VS.startNewGame = function () {
    var st = VS.state;
    st.money = 1250; st.respect = 0; st.rank = 0;
    st.wanted = 0; st.heat = 0;
    st.health = 100; st.armor = 0;
    st.weaponIndex = 1;
    st.weapons = freshWeapons();
    st.onFoot = true; st.car = null;
    st.nitro = false; st.armour = false;
    st.clockMin = 17 * 60 + 41;
    st.playerPos.x = VS.world.safehouse.x;
    st.playerPos.z = VS.world.safehouse.z;
    st.playerYaw = Math.PI * 0.75;
    st.camYaw = Math.PI * 0.75;
    if (VS.playerMesh) {
      VS.playerMesh.group.visible = true;
      VS.playerMesh.group.position.set(st.playerPos.x, 0, st.playerPos.z);
    }
    VS.clearPolice();
    VS.startJob(0);
    VS.setMode('playing');
    VS.updateHUDStatic();
  };

  function wireButtons() {
    var slot = 0;
    document.querySelectorAll('.slot').forEach(function (el) {
      el.addEventListener('click', function () {
        document.querySelectorAll('.slot').forEach(function (s) { s.classList.remove('sel'); });
        el.classList.add('sel');
        slot = parseInt(el.getAttribute('data-slot'), 10);
        VS.state.slot = slot;
        VS.audio.click();
      });
    });
    VS.el('btn-continue').addEventListener('click', function () {
      VS.audio.init(); VS.audio.radio(true);
      if (!VS.loadGame(slot)) VS.startNewGame();
    });
    VS.el('btn-new').addEventListener('click', function () {
      VS.audio.init(); VS.audio.radio(true);
      VS.startNewGame();
    });
    VS.el('btn-resume').addEventListener('click', function () { VS.setMode('playing'); });
    VS.el('btn-quit-title').addEventListener('click', function () {
      VS.saveGame(VS.state.slot);
      VS.setMode('title');
    });
    VS.el('btn-busted').addEventListener('click', function () { VS.respawnAfterBust(); });
    VS.el('garage-close').addEventListener('click', function () { VS.setMode('playing'); });
  }

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    var st = VS.state;
    st.time += dt;
    if (st.mode === 'playing') updatePlaying(dt);
    else {
      VS.updateParticles(dt);
      if (VS.world.beacon && VS.world.beacon.visible) {
        VS.world.beacon.userData.diamond.rotation.y += dt * 2;
      }
      hudTimer -= dt;
      if (hudTimer <= 0) { hudTimer = 0.3; VS.updateHUD(dt); }
    }
    updateCamera(dt);
    renderer.render(scene, camera);
    readyFrames++;
    if (readyFrames === 10) window.__VS_READY__ = true;
  }

  function boot() {
    try {
      if (typeof THREE === 'undefined') throw new Error('three.js did not load');
      var shot = VS.applyShotParams();
      var st = VS.state;
      st.weapons = freshWeapons();
      st.shake = 0;
      st.crewCd0 = 0; st.crewCd1 = 0; st.crewCd2 = 0;
      renderer = new T.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;
      VS.el('gl').appendChild(renderer.domElement);
      scene = new T.Scene();
      camera = new T.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
      camTarget = new T.Vector3(0, 1.7, 0);
      VS.world.scene = scene;
      VS.world.camera = camera;
      VS.world.renderer = renderer;
      clock = new T.Clock();
      VS.buildCity();
      VS.spawnTraffic(10);
      VS.spawnParked(8);
      VS.spawnPedestrians(14);
      VS.buildPlayerMesh();
      VS.playerMesh.group.position.set(st.playerPos.x, 0, st.playerPos.z);
      VS.initInput();
      wireButtons();
      window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
      if (shot) {
        VS.stageShot(shot);
        if (shot === 'onfoot') VS.shotFireAt = st.time + 1.2;
        VS.updateHUDStatic();
      } else {
        VS.setMode('title');
        VS.startJob(0);
        VS.setMode('title');
      }
      animate();
    } catch (err) {
      var e = VS.el('err');
      if (e) { e.style.display = 'flex'; e.firstElementChild.innerHTML = 'VICE SHORES failed to start.<br>' + String(err && err.message ? err.message : err); }
      window.__VS_ERROR__ = String(err && err.stack ? err.stack : err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
