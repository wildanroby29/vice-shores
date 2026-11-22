// missions.js — Vice Shores: eight numbered jobs for the fixer Marla, plus
// free roam after the last one. Each job has stages (go somewhere, steal a
// car, collect drops, race checkpoints, hold a robbery, survive a chase) and
// a line of dialogue. The golden beacon marks the current objective.
(function () {
  var VS = window.VS;

  VS.JOBS = [
    {
      name: 'FIRST WHEELS', payout: 250,
      intro: 'Rook. First rule of Vice Shores: nothing here is yours until you take it. Grab wheels and bring them to Coral Row.',
      stages: [
        { type: 'steal', label: 'Steal any car (E near a parked or driven car)' },
        { type: 'goto', x: 40, z: 120, label: 'Drive the car to the Coral Row marker' },
      ],
    },
    {
      name: 'PACKAGE RUN', payout: 400,
      intro: 'A package is waiting in Palm Park. The pier crew pays on delivery. Do not open it, do not drop it, do not get cute.',
      stages: [
        { type: 'goto', x: -60, z: -60, label: 'Pick up the package in Palm Park' },
        { type: 'goto', x: 0, z: 205, label: 'Deliver the package to the end of Pier 9' },
      ],
    },
    {
      name: 'HOT WHEELS', payout: 500,
      intro: 'The VSPD thinks this city is theirs. Prove them wrong: make some noise, get to two stars, then vanish and come home.',
      stages: [
        { type: 'wanted', stars: 2, label: 'Raise your wanted level to 2 stars (steal, speed, cause chaos)' },
        { type: 'escape', x: -128, z: 128, label: 'Lose the heat, then reach the Safehouse' },
      ],
    },
    {
      name: 'THE COLLECTOR', payout: 600,
      intro: 'Three drops are stashed around the city. Collect all three. If anyone asks, you were never there.',
      stages: [
        { type: 'collect', label: 'Collect the 3 cash drops', drops: [
          { x: -120, z: -40, taken: false },
          { x: 80, z: -120, taken: false },
          { x: 120, z: 80, taken: false },
        ]},
      ],
    },
    {
      name: 'TURBO TEST', payout: 750,
      intro: 'Five checkpoints, ninety seconds, one boulevard. Show me that car can actually move, Rook.',
      stages: [
        { type: 'race', label: 'Hit all 5 checkpoints before the timer runs out', time: 90, checkpoints: [
          { x: -120, z: 142 }, { x: 0, z: 142 }, { x: 120, z: 142 }, { x: 120, z: 0 }, { x: 0, z: 0 },
        ]},
      ],
    },
    {
      name: 'REPO JOB', payout: 900,
      intro: 'An orange Rukun Pelo GT is parked at the Coral Row lot. Its owner stopped paying. Bring it to Dockside Customs.',
      stages: [
        { type: 'stealTarget', label: 'Steal the orange Rukun Pelo GT from the Coral Row lot' },
        { type: 'goto', x: 44, z: 120, label: 'Deliver the GT to Dockside Customs' },
      ],
    },
    {
      name: 'HEAT WAVE', payout: 1200,
      intro: 'Four stars, Rook. Sixty seconds of it. The whole department is coming — survive, and the city learns your name.',
      stages: [
        { type: 'survive', label: 'Survive 60 seconds at 4 stars or more', need: 60 },
        { type: 'goto', x: -128, z: 128, label: 'Break away and reach the Safehouse' },
      ],
    },
    {
      name: 'THE BIG SCORE', payout: 1500,
      intro: 'Shore Bank. Five seconds at the vault, then every cop in Vice Shores on your tail. This is the one, Rook. Make it count.',
      stages: [
        { type: 'goto', x: -20, z: -88, label: 'Reach the front of Shore Bank' },
        { type: 'hold', x: -20, z: -88, label: 'Hold E at the vault for 5 seconds', need: 5 },
        { type: 'escape5', x: -128, z: 128, label: 'Escape the 5-star chase to the Safehouse' },
      ],
    },
  ];

  var targetCar = null;
  var stageProgress = 0;
  var raceIdx = 0;

  VS.startJob = function (i) {
    var st = VS.state;
    st.jobIndex = i;
    st.jobStage = 0;
    st.jobDone = false;
    stageProgress = 0;
    raceIdx = 0;
    if (i >= VS.JOBS.length) { VS.clearMarker(); return; }
    var job = VS.JOBS[i];
    VS.showDialogue('MARLA', job.intro);
    VS.showBanner('JOB ' + (i + 1) + '/8 — ' + job.name, 'Payout ' + VS.fmtMoney(job.payout));
    if (job.stages[0].type === 'stealTarget') VS.spawnTargetCar();
    VS.placeStageMarker();
    VS.updateHUDStatic();
  };

  VS.spawnTargetCar = function () {
    if (targetCar) return targetCar;
    var model = { name: 'Rukun Pelo GT', color: 0xff6a00, speed: 1.12 };
    var car = VS.makeCarMesh(model, false);
    car.driver = null;
    car.group.position.set(-20, 0, 92);
    car.yaw = 0;
    car.group.rotation.y = 0;
    car.isTarget = true;
    VS.parked.push(car);
    targetCar = car;
    return car;
  };

  VS.placeStageMarker = function () {
    var st = VS.state;
    if (st.jobIndex >= VS.JOBS.length) { VS.clearMarker(); return; }
    var stage = VS.JOBS[st.jobIndex].stages[st.jobStage];
    if (!stage) { VS.clearMarker(); return; }
    if (stage.type === 'stealTarget' && targetCar) {
      VS.setMarker(targetCar.group.position.x, targetCar.group.position.z);
    } else if (stage.type === 'collect') {
      var next = null;
      for (var i = 0; i < stage.drops.length; i++) if (!stage.drops[i].taken) { next = stage.drops[i]; break; }
      if (next) VS.setMarker(next.x, next.z); else VS.clearMarker();
    } else if (stage.type === 'race') {
      var cp = stage.checkpoints[raceIdx];
      if (cp) VS.setMarker(cp.x, cp.z); else VS.clearMarker();
    } else if (stage.x !== undefined) {
      VS.setMarker(stage.x, stage.z);
    } else {
      VS.clearMarker();
    }
  };

  VS.setMarker = function (x, z) {
    var b = VS.world.beacon;
    if (!b) return;
    b.position.set(x, 0, z);
    b.visible = true;
  };

  VS.clearMarker = function () {
    if (VS.world.beacon) VS.world.beacon.visible = false;
  };

  function advanceStage() {
    var st = VS.state;
    var job = VS.JOBS[st.jobIndex];
    stageProgress = 0;
    st.jobStage++;
    if (st.jobStage >= job.stages.length) {
      VS.completeJob();
      return;
    }
    var stage = job.stages[st.jobStage];
    if (stage.type === 'race') { st.jobTimer = stage.time; raceIdx = 0; }
    VS.showDialogue('MARLA', stage.label);
    VS.placeStageMarker();
    VS.updateHUDStatic();
  }

  VS.completeJob = function () {
    var st = VS.state;
    var job = VS.JOBS[st.jobIndex];
    st.money += job.payout;
    st.respect += Math.round(job.payout / 2);
    VS.audio.jingle();
    VS.showBanner('JOB COMPLETE — ' + job.name, 'Paid ' + VS.fmtMoney(job.payout) + ' · Respect +' + Math.round(job.payout / 2));
    VS.showDialogue('MARLA', 'Clean work, Rook. ' + VS.fmtMoney(job.payout) + ' is yours.');
    if (targetCar && job.name === 'REPO JOB') {
      var i = VS.parked.indexOf(targetCar);
      if (i !== -1) VS.parked.splice(i, 1);
      VS.world.scene.remove(targetCar.group);
      targetCar = null;
    }
    st.jobIndex++;
    st.jobStage = 0;
    stageProgress = 0;
    if (st.jobIndex >= VS.JOBS.length) {
      st.jobDone = true;
      VS.clearMarker();
      VS.showBanner('VICE SHORES LEGEND', 'All eight jobs done. The city is yours — free roam.');
      VS.showDialogue('MARLA', 'Eight jobs, zero excuses. You run this city now, Rook.');
    } else {
      setTimeout(function () { VS.startJob(st.jobIndex); }, 1800);
    }
    VS.updateHUDStatic();
  };

  VS.currentObjective = function () {
    var st = VS.state;
    if (st.jobIndex >= VS.JOBS.length) return 'Free roam — the city is yours. Build respect, steal cars, outrun the VSPD.';
    var job = VS.JOBS[st.jobIndex];
    var stage = job.stages[st.jobStage];
    return stage ? stage.label : '';
  };

  VS.currentJobName = function () {
    var st = VS.state;
    if (st.jobIndex >= VS.JOBS.length) return 'FREE ROAM';
    return 'JOB ' + (st.jobIndex + 1) + '/8 — ' + VS.JOBS[st.jobIndex].name;
  };

  VS.updateMissions = function (dt, input) {
    var st = VS.state;
    if (st.mode !== 'playing' || st.jobIndex >= VS.JOBS.length) return;
    var job = VS.JOBS[st.jobIndex];
    var stage = job.stages[st.jobStage];
    if (!stage) return;
    var pp = st.playerPos;
    var done = false;
    if (stage.type === 'steal') {
      done = !st.onFoot;
    } else if (stage.type === 'stealTarget') {
      done = st.car === targetCar;
      if (targetCar) VS.setMarker(targetCar.group.position.x, targetCar.group.position.z);
    } else if (stage.type === 'goto') {
      done = VS.dist2(pp.x, pp.z, stage.x, stage.z) < 6;
    } else if (stage.type === 'wanted') {
      done = st.wanted >= stage.stars;
    } else if (stage.type === 'escape') {
      done = st.wanted === 0 && VS.dist2(pp.x, pp.z, stage.x, stage.z) < 6;
    } else if (stage.type === 'escape5') {
      done = VS.dist2(pp.x, pp.z, stage.x, stage.z) < 6;
    } else if (stage.type === 'collect') {
      for (var i = 0; i < stage.drops.length; i++) {
        var d = stage.drops[i];
        if (!d.taken && VS.dist2(pp.x, pp.z, d.x, d.z) < 4) {
          d.taken = true;
          st.money += 50;
          VS.audio.pickup();
          VS.showDialogue('ROOK', 'Drop secured. +' + VS.fmtMoney(50));
          VS.placeStageMarker();
          VS.updateHUDStatic();
        }
      }
      done = stage.drops.every(function (d) { return d.taken; });
    } else if (stage.type === 'race') {
      st.jobTimer -= dt;
      var cp = stage.checkpoints[raceIdx];
      if (cp && VS.dist2(pp.x, pp.z, cp.x, cp.z) < 7) {
        raceIdx++;
        VS.audio.pickup();
        VS.showDialogue('MARLA', 'Checkpoint ' + raceIdx + '/' + stage.checkpoints.length + '. Keep it moving.');
        VS.placeStageMarker();
        if (raceIdx >= stage.checkpoints.length) done = true;
      }
      if (!done && st.jobTimer <= 0) {
        st.jobTimer = stage.time;
        raceIdx = 0;
        VS.showBanner('TOO SLOW', 'The timer ran out. The race restarts.');
        VS.placeStageMarker();
      }
    } else if (stage.type === 'hold') {
      var near = VS.dist2(pp.x, pp.z, stage.x, stage.z) < 8;
      if (near && input && input.interact) {
        stageProgress += dt;
        if (stageProgress >= stage.need) {
          done = true;
          VS.setWanted(5);
          st.money += 0;
          VS.showBanner('VAULT CRACKED', 'Five stars. Run, Rook — run!');
        }
      } else if (stageProgress > 0) {
        stageProgress = Math.max(0, stageProgress - dt * 2);
      }
    } else if (stage.type === 'survive') {
      if (st.wanted >= 4) stageProgress += dt;
      if (stageProgress >= stage.need) done = true;
    }
    if (done) advanceStage();
  };

  VS.jobTimerText = function () {
    var st = VS.state;
    if (st.jobIndex >= VS.JOBS.length) return '';
    var stage = VS.JOBS[st.jobIndex].stages[st.jobStage];
    if (!stage) return '';
    if (stage.type === 'race') return '⏱ ' + Math.max(0, Math.ceil(st.jobTimer)) + 's';
    if (stage.type === 'survive') return '⏱ ' + Math.floor(stageProgress) + '/' + stage.need + 's';
    if (stage.type === 'hold') return '⏱ ' + stageProgress.toFixed(1) + '/' + stage.need + 's';
    return '';
  };
})();
