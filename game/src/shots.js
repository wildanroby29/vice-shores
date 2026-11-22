// shots.js — Vice Shores: stages the four screenshots from ?shot=.
// The game is fully playable; a shot only sets the opening state (position,
// wanted level, job, money, camera) so the frame reads like the winners':
// a 5-star chase, an on-foot fight, the title with saves, the garage shop.
(function () {
  var VS = window.VS;

  function placeCarAt(x, z, yaw, speed) {
    var st = VS.state;
    var car = VS.state.car;
    if (!car) return;
    car.group.position.set(x, 0, z);
    car.yaw = yaw;
    car.group.rotation.y = yaw;
    car.speed = speed || 0;
    st.playerPos.x = x;
    st.playerPos.z = z;
    st.playerYaw = yaw;
    st.playerSpeed = speed || 0;
  }

  function spawnChasePack() {
    // four police cars in pursuit + a burning car ahead, for the chase frame
    var st = VS.state;
    var spots = [
      { x: st.playerPos.x - 26, z: st.playerPos.z - 8 },
      { x: st.playerPos.x - 30, z: st.playerPos.z + 10 },
      { x: st.playerPos.x - 14, z: st.playerPos.z + 18 },
      { x: st.playerPos.x + 22, z: st.playerPos.z - 16 },
    ];
    spots.forEach(function (s, i) {
      var car = VS.makeCarMesh({ name: 'VSPD Interceptor', color: 0xf2f2f2, speed: 1.06 }, true);
      car.driver = 'police';
      car.name = VS.POLICE_NAMES[i % VS.POLICE_NAMES.length];
      car.group.position.set(s.x, 0, s.z);
      car.yaw = 0;
      car.group.rotation.y = 0;
      car.speed = 26;
      VS.policeCars.push(car);
    });
    // a burning wreck ahead on the boulevard, dead in the chase camera's view
    var wreck = VS.makeCarMesh({ name: 'Calyx Sprint', color: 0xe63946, speed: 1 }, false);
    wreck.group.position.set(st.playerPos.x + 35, 0, 137);
    wreck.yaw = 0.2;
    wreck.group.rotation.y = 0.2;
    wreck.burning = true;
    wreck.health = 0;
    VS.spawnFire(wreck.group.position.x, 1.4, wreck.group.position.z);
    VS.spawnFire(wreck.group.position.x, 1.8, wreck.group.position.z);
    VS.spawnFire(wreck.group.position.x, 1.2, wreck.group.position.z);
    VS.spawnSmoke(wreck.group.position.x, 2.4, wreck.group.position.z, 6);
  }

  VS.stageShot = function (name) {
    var st = VS.state;
    st.shotMode = name;
    if (name === 'chase') {
      st.money = 86250;
      st.respect = 2600;
      st.clockMin = 18 * 60 + 49;
      st.health = 76;
      st.armor = 58;
      st.weapons[1].ammo = 30; st.weapons[1].reserve = 60;
      st.weapons[2].ammo = 30; st.weapons[2].reserve = 90;
      st.weaponIndex = 2;
      VS.startJob(6); // HEAT WAVE, stage 1: survive 60s at 4+ stars
      VS.setWanted(5);
      // snap the helicopter straight to its hover point so it is in frame
      if (VS.heli) {
        VS.heli.group.position.set(st.playerPos.x + 70, 10, st.playerPos.z - 8);
      }
      var car = VS.makeCarMesh({ name: 'Rukun Pelo GT', color: 0xff6a00, speed: 1.12 }, false);
      VS.enterCar(car);
      placeCarAt(-60, 142, 0, 32);
      st.camYaw = 0;
      st.camPitch = 0.22;
      spawnChasePack();
      VS.showDialogue('MARLA', 'Ram the Regent before it reaches the water!');
      VS.shotDrive = true; // keep the throttle open for the frame
    } else if (name === 'onfoot') {
      st.money = 6420;
      st.respect = 140;
      st.clockMin = 17 * 60 + 19;
      st.health = 88;
      st.armor = 25;
      st.weapons[1].ammo = 12; st.weapons[1].reserve = 48;
      st.weaponIndex = 1;
      VS.startJob(1); // PACKAGE RUN
      st.playerPos.x = -60; st.playerPos.z = 0;
      st.playerYaw = 0;
      st.camYaw = -Math.PI / 2;
      st.camPitch = 0.3;
      VS.setWanted(2);
      // pedestrians on the avenue + one being carjacked nearby
      for (var i = 0; i < 4; i++) {
        var ped = VS.peds[i];
        if (ped) {
          ped.group.position.set(-42 + i * 7, 0, (i % 2 === 0 ? -6 : 6));
          ped.state = 'flee';
          ped.fleeTimer = 6;
        }
      }
      var vic = VS.makeCarMesh({ name: 'Sunline Cab', color: 0xffd23e, speed: 0.92 }, false);
      vic.group.position.set(-28, 0, 0);
      vic.yaw = 0;
      vic.group.rotation.y = 0;
      VS.parked.push(vic);
      VS.showDialogue('MARLA', 'Package is in Palm Park. Do not open it, do not drop it.');
      VS.shotAim = true;
    } else if (name === 'title') {
      // a filled first save slot, so the title shows a real Continue
      try {
        localStorage.setItem(VS.CFG.savePrefix + '0', JSON.stringify({
          money: 12400, jobIndex: 3, rank: 1, respect: 640,
          playerPos: { x: -40, z: 80 }, health: 100,
        }));
      } catch (e) {}
      st.money = 12400;
      st.respect = 640;
      VS.setMode('title');
      VS.refreshSaveSlots();
    } else if (name === 'garage') {
      st.money = 18450;
      st.respect = 3900;
      st.clockMin = 18 * 60 + 45;
      st.health = 76;
      st.armor = 58;
      var car2 = VS.makeCarMesh({ name: 'Rukun Pelo GT', color: 0xff6a00, speed: 1.12 }, false);
      car2.health = 62;
      car2.driver = 'player';
      VS.enterCar(car2);
      placeCarAt(44, 118, Math.PI, 0);
      VS.startJob(5); // REPO JOB, already at the delivery stage
      VS.state.jobStage = 1;
      VS.placeStageMarker();
      VS.setMode('garage');
      VS.showDialogue('JAI', 'That GT took a beating, Rook. Pick a fix and pay up.');
    }
    if (name === 'chase' || name === 'onfoot' || name === 'garage') {
      VS.setMode('playing');
      if (name === 'garage') VS.setMode('garage');
    }
    VS.updateHUDStatic();
  };

  VS.applyShotParams = function () {
    var q = new URLSearchParams(window.location.search);
    var seed = parseInt(q.get('seed') || '7', 10);
    if (!isNaN(seed)) { VS.state.seed = seed; VS.setSeed(seed); }
    var shot = q.get('shot') || '';
    VS.state.shotMode = shot;
    return shot;
  };
})();
