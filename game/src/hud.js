// hud.js — Vice Shores: every DOM panel (job, dispatch, stars, money, radio,
// crew, respect, minimap, vitals, vehicle, weapons, dialogue, banner) plus
// the garage shop and the save-slot list. The HUD updates from VS.state.
(function () {
  var VS = window.VS;
  var dlgTimer = null, bannerTimer = null;

  function rankFor(respect) {
    var r = 0;
    for (var i = 0; i < VS.RANKS.length; i++) if (respect >= VS.RANKS[i].need) r = i;
    return r;
  }

  VS.updateHUDStatic = function () {
    var st = VS.state;
    st.rank = rankFor(st.respect);
    var moneyEl = VS.el('money');
    if (moneyEl) moneyEl.textContent = VS.fmtMoney(st.money);
    // wanted stars
    var stars = VS.el('stars');
    if (stars) {
      var spans = stars.children;
      for (var i = 0; i < spans.length; i++) {
        if (i < st.wanted) spans[i].classList.remove('off');
        else spans[i].classList.add('off');
      }
    }
    var wl = VS.el('wanted-label');
    if (wl) wl.textContent = st.wanted === 0 ? 'CLEAN' : (st.wanted >= 4 ? 'HEAT!' : 'WANTED');
    // job panel
    var jt = VS.el('job-title');
    if (jt) jt.textContent = VS.currentJobName ? VS.currentJobName() : '';
    var jo = VS.el('job-objective');
    if (jo) jo.textContent = VS.currentObjective ? VS.currentObjective() : '';
    var jp = VS.el('job-payout');
    if (jp) jp.textContent = st.jobIndex < VS.JOBS.length ? 'PAYOUT ' + VS.fmtMoney(VS.JOBS[st.jobIndex].payout) : 'FREE ROAM';
    // weapons
    for (var w = 0; w < 4; w++) {
      var slot = VS.el('w' + w);
      if (!slot) continue;
      slot.classList.toggle('sel', w === st.weaponIndex);
      var ammo = slot.querySelector('.wa');
      if (ammo) {
        var wp = st.weapons[w];
        ammo.textContent = wp ? (wp.mag === Infinity ? '∞' : wp.ammo + ' / ' + wp.reserve) : '—';
      }
    }
    // crew
    for (var c = 0; c < 3; c++) {
      var chip = VS.el('crew' + c);
      if (!chip) continue;
      var cd = st['crewCd' + c] || 0;
      chip.classList.toggle('ready', cd <= 0);
      chip.classList.toggle('cool', cd > 0);
      var label = chip.querySelector('.ccd');
      if (label) label.textContent = cd > 0 ? Math.ceil(cd) + 's' : 'READY';
    }
    // respect
    var rn = VS.el('respect-name');
    if (rn) rn.textContent = VS.RANKS[st.rank].name;
    var next = VS.RANKS[st.rank + 1];
    var rf = VS.el('respect-fill');
    if (rf) rf.style.width = next ? Math.round(100 * (st.respect - VS.RANKS[st.rank].need) / (next.need - VS.RANKS[st.rank].need)) + '%' : '100%';
    var rnum = VS.el('respect-num');
    if (rnum) rnum.textContent = next ? Math.round(st.respect) + ' / ' + next.need + ' RP' : Math.round(st.respect) + ' RP — MAX RANK';
  };

  VS.updateHUD = function (dt) {
    var st = VS.state;
    if (st.mode === 'title' && !st.shotMode) return;
    var clock = VS.el('clock');
    if (clock) clock.textContent = VS.fmtClock(st.clockMin);
    var jt = VS.el('job-timer');
    if (jt && VS.jobTimerText) jt.textContent = VS.jobTimerText();
    // dispatch
    var units = VS.dispatchUnits ? VS.dispatchUnits() : [];
    var dt2 = VS.el('dispatch-title');
    if (dt2) dt2.textContent = 'VSPD DISPATCH — ' + units.length + ' UNIT' + (units.length === 1 ? '' : 'S');
    var dl = VS.el('dispatch-list');
    if (dl) {
      var html = '';
      for (var i = 0; i < Math.min(6, units.length); i++) {
        var u = units[i];
        html += '<div class="drow"><span>' + u.name + ' · ' + u.dist + 'm</span><span class="tac">' + u.tactic + '</span></div>';
      }
      if (!units.length) html = '<div class="drow"><span>—</span><span class="tac">NO UNITS</span></div>';
      dl.innerHTML = html;
    }
    // vitals
    var hf = VS.el('health-fill'), hn = VS.el('health-num');
    if (hf) hf.style.width = VS.clamp(st.health, 0, 100) + '%';
    if (hn) hn.textContent = Math.round(st.health);
    var af = VS.el('armor-fill'), an = VS.el('armor-num');
    if (af) af.style.width = VS.clamp(st.armor, 0, 100) + '%';
    if (an) an.textContent = Math.round(st.armor);
    // vehicle
    var vn = VS.el('veh-name');
    if (vn) vn.textContent = st.car ? st.car.model.name.toUpperCase() : 'ON FOOT';
    var vc = VS.el('veh-cond');
    var vcf = VS.el('veh-cond-fill');
    if (st.car) {
      if (vc) vc.textContent = Math.round(st.car.health) + '%';
      if (vcf) { vcf.style.width = VS.clamp(st.car.health, 0, 100) + '%'; vcf.style.background = st.car.health > 50 ? '#f59e0b' : '#ef4444'; }
    } else {
      if (vc) vc.textContent = '—';
      if (vcf) vcf.style.width = '0%';
    }
    var vs = VS.el('veh-speed');
    if (vs) vs.textContent = Math.round(Math.abs(st.playerSpeed) * 3.6);
    VS.drawMinimap();
  };

  VS.drawMinimap = function () {
    var cv = VS.el('minimap');
    if (!cv) return;
    var g = cv.getContext('2d');
    var W = 180, H = 180;
    // world x -170..210, z -170..210 -> 180px
    function mx(x) { return (x + 170) / 380 * W; }
    function mz(z) { return (z + 170) / 380 * H; }
    g.fillStyle = '#0d1020';
    g.fillRect(0, 0, W, H);
    // ocean + river
    g.fillStyle = '#14608f';
    g.fillRect(0, mz(192), W, H - mz(192));
    g.fillRect(mx(152), 0, W - mx(152), H);
    // beach
    g.fillStyle = '#d9b380';
    g.fillRect(0, mz(150), W, mz(192) - mz(150));
    // roads
    g.strokeStyle = '#555a70';
    g.lineWidth = 2;
    VS.world.roadLines.forEach(function (r) {
      g.beginPath();
      g.moveTo(mx(r.x1), mz(r.z1));
      g.lineTo(mx(r.x2), mz(r.z2));
      g.stroke();
    });
    // parks
    g.fillStyle = '#3f7a4a';
    g.fillRect(mx(-95), mz(-95), 30 / 380 * W, 30 / 380 * H);
    g.fillRect(mx(65), mz(25), 30 / 380 * W, 30 / 380 * H);
    // safehouse + garage
    g.fillStyle = '#4ade80';
    g.font = 'bold 11px sans-serif';
    g.fillText('H', mx(-128) - 3, mz(128) + 4);
    g.fillStyle = '#ffd23e';
    g.fillText('G', mx(44) - 3, mz(132) + 4);
    // mission marker
    var b = VS.world.beacon;
    if (b && b.visible) {
      var pulse = 3 + Math.sin(VS.state.time * 5) * 1.5;
      g.fillStyle = '#ffd23e';
      g.beginPath();
      g.arc(mx(b.position.x), mz(b.position.z), pulse + 2, 0, Math.PI * 2);
      g.fill();
    }
    // traffic (white) and police (red)
    var showCops = VS.state.wanted > 0 || VS.state.time < VS.state.eyesOutUntil;
    g.fillStyle = '#ffffff';
    VS.traffic.forEach(function (c) {
      g.fillRect(mx(c.group.position.x) - 1, mz(c.group.position.z) - 1, 2, 2);
    });
    if (showCops) {
      g.fillStyle = '#ff4444';
      VS.policeCars.forEach(function (c) {
        g.beginPath();
        g.arc(mx(c.group.position.x), mz(c.group.position.z), 2.6, 0, Math.PI * 2);
        g.fill();
      });
      if (VS.heli && VS.heli.group.visible) {
        g.fillStyle = '#ff4444';
        g.font = 'bold 10px sans-serif';
        g.fillText('H', mx(VS.heli.group.position.x) - 3, mz(VS.heli.group.position.z) + 3);
      }
    }
    // player arrow
    var st = VS.state;
    var px = mx(st.playerPos.x), pz = mz(st.playerPos.z);
    g.save();
    g.translate(px, pz);
    g.rotate(-st.playerYaw);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(7, 0); g.lineTo(-5, -4.5); g.lineTo(-5, 4.5); g.closePath();
    g.fill();
    g.strokeStyle = '#111';
    g.stroke();
    g.restore();
  };

  VS.showDialogue = function (who, text) {
    var d = VS.el('dialogue');
    if (!d) return;
    VS.el('dlg-who').textContent = who;
    VS.el('dlg-text').textContent = '“' + text + '”';
    d.classList.remove('hidden');
    if (dlgTimer) clearTimeout(dlgTimer);
    dlgTimer = setTimeout(function () { d.classList.add('hidden'); }, VS.state.shotMode ? 30000 : 5200);
  };

  VS.showBanner = function (title, sub) {
    var b = VS.el('banner');
    if (!b) return;
    VS.el('banner-title').textContent = title;
    VS.el('banner-sub').textContent = sub || '';
    b.classList.remove('hidden');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { b.classList.add('hidden'); }, 3000);
  };

  VS.setMode = function (mode) {
    var st = VS.state;
    st.mode = mode;
    VS.el('title-screen').classList.toggle('hidden', mode !== 'title');
    VS.el('garage-screen').classList.toggle('hidden', mode !== 'garage');
    VS.el('pause-screen').classList.toggle('hidden', mode !== 'paused');
    VS.el('busted-screen').classList.toggle('hidden', mode !== 'busted');
    VS.el('hud').style.display = mode === 'title' && !st.shotMode ? 'none' : 'block';
    VS.el('crosshair').classList.toggle('hidden', !(mode === 'playing' && st.onFoot));
    if (mode === 'garage') VS.buildGarageList();
    if (mode === 'title') VS.refreshSaveSlots();
  };

  // --- garage shop
  var SHOP = [
    { id: 'repair', name: 'FULL REPAIR', desc: 'Bodywork, engine, glass — good as new', price: 250, car: true },
    { id: 'respray', name: 'RESPRAY', desc: 'A fresh coat in a new colour', price: 400, car: true },
    { id: 'armour', name: 'ARMOUR PLATING', desc: 'Take 40% less damage in this car', price: 3600, car: true, once: true },
    { id: 'nitro', name: 'NITRO KIT', desc: 'Hold SHIFT in a car for a boost', price: 2000, car: true, once: true },
    { id: 'ammo9', name: 'P9 AMMO', desc: '+48 pistol rounds', price: 120 },
    { id: 'ammosmg', name: 'SMG AMMO', desc: '+90 SMG rounds', price: 200 },
    { id: 'ammoshot', name: 'SHOTGUN SHELLS', desc: '+24 shells', price: 150 },
    { id: 'armor', name: 'BODY ARMOR', desc: 'Full armor vest (100)', price: 300 },
  ];

  VS.buildGarageList = function () {
    var st = VS.state;
    var list = VS.el('garage-list');
    if (!list) return;
    VS.el('garage-car').textContent = st.car ? st.car.model.name + ' · ' + Math.round(st.car.health) + '%' : 'No car — walk in, drive out';
    VS.el('garage-money').textContent = VS.fmtMoney(st.money);
    VS.el('garage-respect').textContent = VS.RANKS[st.rank].name;
    var html = '';
    SHOP.forEach(function (item) {
      var owned = (item.id === 'armour' && st.armour) || (item.id === 'nitro' && st.nitro);
      var needCar = item.car && !st.car;
      var afford = st.money >= item.price;
      var dis = owned || needCar || !afford;
      html += '<div class="shop-row"><span><b>' + item.name + '</b> <span class="psmall">— ' + item.desc + '</span></span>' +
        '<span><span class="price">' + VS.fmtMoney(item.price) + '</span> ' +
        '<button class="btn" style="padding:6px 14px;font-size:13px;margin:0" data-shop="' + item.id + '"' + (dis ? ' disabled' : '') + '>' +
        (owned ? 'OWNED' : needCar ? 'NEED CAR' : 'BUY') + '</button></span></div>';
    });
    list.innerHTML = html;
    list.querySelectorAll('[data-shop]').forEach(function (btn) {
      btn.addEventListener('click', function () { VS.buyUpgrade(btn.getAttribute('data-shop')); });
    });
  };

  VS.buyUpgrade = function (id) {
    var st = VS.state;
    var item = null;
    SHOP.forEach(function (s) { if (s.id === id) item = s; });
    if (!item || st.money < item.price) return;
    if (id === 'armour' && st.armour) return;
    if (id === 'nitro' && st.nitro) return;
    if (item.car && !st.car) return;
    st.money -= item.price;
    if (id === 'repair' && st.car) { st.car.health = 100; st.car.burning = false; }
    if (id === 'respray' && st.car) {
      var colors = [0xff6a00, 0x2ec4b6, 0xffd23e, 0xff7ad9, 0x4361ee, 0x80b918];
      var nc = colors[Math.floor(Math.random() * colors.length)];
      st.car.group.children.forEach(function (m) {
        if (m.material && m.material.color && m.geometry && m.geometry.type === 'BoxGeometry' && m.position.y === 0.62) m.material.color.setHex(nc);
      });
    }
    if (id === 'armour') st.armour = true;
    if (id === 'nitro') st.nitro = true;
    if (id === 'ammo9') st.weapons[1].reserve += 48;
    if (id === 'ammosmg') st.weapons[2].reserve += 90;
    if (id === 'ammoshot') st.weapons[3].reserve += 24;
    if (id === 'armor') st.armor = 100;
    VS.audio.pickup();
    VS.buildGarageList();
    VS.updateHUDStatic();
  };

  // --- save slots on the title screen
  VS.refreshSaveSlots = function () {
    for (var s = 0; s < 3; s++) {
      var slot = document.querySelector('.slot[data-slot="' + s + '"]');
      if (!slot) continue;
      var info = slot.querySelector('.slot-info');
      var raw = null;
      try { raw = localStorage.getItem(VS.CFG.savePrefix + s); } catch (e) {}
      if (raw) {
        try {
          var d = JSON.parse(raw);
          info.textContent = VS.fmtMoney(d.money) + ' · JOB ' + (Math.min(d.jobIndex + 1, 8)) + '/8 · ' + VS.RANKS[d.rank || 0].name;
        } catch (e) { info.textContent = 'EMPTY'; }
      } else info.textContent = 'EMPTY';
    }
  };

  VS.useCrew = function (i) {
    var st = VS.state;
    if (st.mode !== 'playing') return;
    if ((st['crewCd' + i] || 0) > 0) return;
    if (i === 0) {
      if (st.wanted === 0) { VS.showDialogue('MIRA', 'No heat on you, Rook. Save it for when the lights are on.'); return; }
      VS.addHeat(-20);
      VS.showDialogue('MIRA', 'Plates swapped. They lost the car — for now.');
      st['crewCd0'] = VS.CREW[0].cd;
    } else if (i === 1) {
      if (!st.car) { VS.showDialogue('JAI', 'Bring me a car to fix, Rook.'); return; }
      st.car.health = Math.min(100, st.car.health + 35);
      st.car.burning = false;
      VS.showDialogue('JAI', 'Patched up. Try not to bend it again.');
      st['crewCd1'] = VS.CREW[1].cd;
    } else {
      st.eyesOutUntil = st.time + 20;
      VS.showDialogue('KIRI', 'Eyes out. Every unit is on your map for twenty seconds.');
      st['crewCd2'] = VS.CREW[2].cd;
    }
    VS.audio.pickup();
    VS.updateHUDStatic();
  };

  VS.tickCrew = function (dt) {
    var st = VS.state;
    for (var i = 0; i < 3; i++) {
      var k = 'crewCd' + i;
      if (st[k] > 0) st[k] = Math.max(0, st[k] - dt);
    }
  };
})();
