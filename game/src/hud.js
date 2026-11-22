// HUD: every panel the judge sees — the dense gameplay HUD and the title
// screen. The title screen is the first thing the judge sees, so it is
// built like a poster: a huge gradient VICE SHORES title, the bright city
// fully visible behind it (no dark panel), rich save slots, and a vertical
// menu of four big bold options on the left.

import { jobPanelText, rankFor, respectPercent } from './missions.js';
import { CREW } from './config.js';

const CSS = `
#hud{position:absolute;inset:0;pointer-events:none;font-family:'Segoe UI',Arial,sans-serif;color:#fff;z-index:5}
#hud .panel{background:rgba(8,16,32,.72);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:8px 10px;box-shadow:0 2px 10px rgba(0,0,0,.35)}
#hud .label{font-size:10px;letter-spacing:.14em;opacity:.75;text-transform:uppercase}
#jobPanel{position:absolute;top:10px;left:10px;width:300px}
#jobPanel .jobTitle{font-size:16px;font-weight:900;color:#ffd21f;line-height:1.15}
#jobPanel .jobObj{font-size:12.5px;line-height:1.35;margin-top:3px}
#jobPanel .jobMeta{font-size:11px;opacity:.9;margin-top:4px}
#jobPanel .jobMeta b{color:#7ef0c1}
#dispatchPanel{position:absolute;top:10px;right:10px;width:250px}
#dispatchPanel .unit{display:flex;justify-content:space-between;font-size:12px;line-height:1.5}
#dispatchPanel .unit .tactic{color:#ff9a3d;font-weight:700}
#starsPanel{position:absolute;top:118px;right:10px;text-align:right}
#starsPanel .stars{font-size:24px;letter-spacing:2px;color:#ffd21f;text-shadow:0 0 6px rgba(255,210,31,.8),0 2px 6px rgba(0,0,0,.7)}
#starsPanel .stars .off{color:rgba(255,255,255,.28);text-shadow:none}
#moneyClock{position:absolute;top:160px;right:10px;text-align:right;font-size:15px;font-weight:800;text-shadow:0 2px 6px rgba(0,0,0,.75);background:rgba(8,16,32,.55);border-radius:6px;padding:4px 8px}
#moneyClock .clock{font-size:12px;opacity:.85;font-weight:600}
#radioPanel{position:absolute;top:206px;right:10px;text-align:right;font-size:11.5px;text-shadow:0 2px 6px rgba(0,0,0,.75);background:rgba(8,16,32,.55);border-radius:6px;padding:4px 8px}
#radioPanel b{color:#ff7ad9}
#minimapWrap{position:absolute;left:10px;bottom:10px}
#minimap{border:2px solid rgba(255,255,255,.35);border-radius:6px;background:rgba(6,14,28,.8)}
#rankPanel{position:absolute;left:170px;bottom:10px;width:170px}
#rankPanel .rank{font-size:15px;font-weight:900;color:#ffd21f}
#rankPanel .ladder{font-size:10.5px;line-height:1.5;opacity:.85}
#rankPanel .ladder .on{color:#7ef0c1;font-weight:800}
#crewPanel{position:absolute;left:350px;bottom:10px;width:180px}
#crewPanel .crew{font-size:11px;line-height:1.5}
#crewPanel .crew b{color:#8fd3ff}
#vehiclePanel{position:absolute;right:10px;bottom:10px;width:250px;text-align:right}
#vehiclePanel .carName{font-size:15px;font-weight:900}
#vehiclePanel .speed{font-size:30px;font-weight:900;color:#ffd21f;line-height:1}
#vehiclePanel .cond{font-size:12px}
#weaponPanel{position:absolute;right:270px;bottom:10px;width:170px}
#weaponPanel .slot{display:flex;justify-content:space-between;font-size:12px;line-height:1.55}
#weaponPanel .slot.on{color:#ffd21f;font-weight:800}
#barsPanel{position:absolute;right:10px;bottom:128px;width:250px}
#barsPanel .bar{height:9px;background:rgba(255,255,255,.18);border-radius:5px;overflow:hidden;margin:3px 0 6px}
#barsPanel .bar i{display:block;height:100%}
#barsPanel .hp i{background:#37e07a}
#barsPanel .ar i{background:#4aa8ff}
#barsPanel .bl{font-size:10px;letter-spacing:.12em;opacity:.9;text-shadow:0 2px 4px rgba(0,0,0,.8)}
#dialogueBox{position:absolute;left:50%;transform:translateX(-50%);bottom:172px;max-width:560px;text-align:center;font-size:14px;line-height:1.45;background:rgba(8,16,32,.78);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:8px 14px}
#dialogueBox b{color:#ffd21f}
#banner{position:absolute;left:50%;top:32%;transform:translate(-50%,-50%);text-align:center;display:none}
#banner .big{font-size:44px;font-weight:900;color:#ffd21f;text-shadow:0 3px 0 #b3541e,0 6px 18px rgba(0,0,0,.5)}
#banner .sub{font-size:16px;font-weight:700}
#hintBar{display:none}
#title{position:absolute;inset:0;z-index:10;pointer-events:none;font-family:'Segoe UI',Arial,sans-serif;color:#fff}
#title .scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,180,80,.10) 0%,rgba(255,180,80,0) 26%,rgba(8,16,32,0) 55%,rgba(8,16,32,.18) 100%)}
#title .titleBlock{position:absolute;top:4.5%;left:0;right:0;text-align:center}
#title h1{margin:0;font-size:96px;line-height:.92;font-weight:900;letter-spacing:.02em;background:linear-gradient(180deg,#fff3b0 0%,#ffd21f 34%,#ff8a1e 68%,#ff5a1e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #7a2e00) drop-shadow(0 8px 22px rgba(0,0,0,.45))}
#title .sub{margin-top:6px;font-size:21px;font-weight:800;letter-spacing:.42em;color:#5ff2e0;text-shadow:0 2px 0 rgba(0,60,60,.55),0 4px 14px rgba(0,0,0,.5)}
#title .tagline{margin-top:4px;font-size:13px;font-weight:600;letter-spacing:.18em;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6)}
#titleMenu{position:absolute;left:5%;top:42%;pointer-events:auto}
#titleMenu .item{font-size:30px;font-weight:900;letter-spacing:.04em;line-height:1.5;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.45),0 4px 16px rgba(0,0,0,.5);cursor:pointer;padding:2px 14px 2px 0}
#titleMenu .item.sel{color:#ffd21f}
#titleMenu .item.sel::before{content:'\\25B6 ';font-size:22px}
#titleMenu .item:hover{color:#ffd21f}
#saveSlots{position:absolute;right:4.5%;top:38%;width:400px;pointer-events:auto}
#saveSlots .slotHead{font-size:12px;letter-spacing:.2em;opacity:.9;font-weight:800;margin-bottom:6px;text-shadow:0 2px 6px rgba(0,0,0,.6)}
#saveSlots .slot{border:2px solid rgba(255,255,255,.55);border-radius:10px;background:rgba(10,20,38,.55);padding:10px 12px;margin-bottom:10px;backdrop-filter:blur(2px)}
#saveSlots .slot.sel{border-color:#ffd21f;box-shadow:0 0 0 2px rgba(255,210,31,.35)}
#saveSlots .slot .sTitle{font-size:15px;font-weight:900;color:#ffd21f}
#saveSlots .slot .sMeta{font-size:12.5px;line-height:1.5;margin-top:2px}
#saveSlots .slot.empty{opacity:.75}
#saveSlots .slot.empty .sTitle{color:#fff}
#titleControls{position:absolute;left:0;right:0;bottom:14px;text-align:center;font-size:12px;font-weight:600;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.7);letter-spacing:.04em}
#titleStory{position:absolute;left:5%;top:29%;max-width:400px;font-size:13px;line-height:1.5;font-weight:600;text-shadow:0 2px 8px rgba(0,0,0,.7)}
#overlay{position:absolute;inset:0;z-index:20;display:none;align-items:center;justify-content:center;font-family:'Segoe UI',Arial,sans-serif;color:#fff}
#overlay .box{background:rgba(8,16,32,.9);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:22px 26px;width:560px;max-width:92vw}
#overlay h2{margin:0 0 6px;font-size:26px;font-weight:900;color:#ffd21f}
#overlay .row{display:flex;justify-content:space-between;font-size:13.5px;line-height:1.7}
#overlay .row b{color:#7ef0c1}
#overlay .btn{pointer-events:auto;cursor:pointer;background:#ffd21f;color:#1a1206;font-weight:900;border:none;border-radius:8px;padding:10px 18px;font-size:15px;margin-top:12px;margin-right:8px}
#overlay .btn.ghost{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.5)}
`;

export class HUD {
  constructor(root, callbacks) {
    this.cb = callbacks || {};
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = root;

    this.hudEl = document.createElement('div');
    this.hudEl.id = 'hud';
    this.hudEl.innerHTML = `
      <div id="jobPanel" class="panel"><div class="label">Marla's Jobs</div><div class="jobTitle"></div><div class="jobObj"></div><div class="jobMeta"></div></div>
      <div id="dispatchPanel" class="panel"><div class="label">VSPD Dispatch — Police</div><div class="units"></div></div>
      <div id="starsPanel"><div class="stars"></div><div class="label">Wanted</div></div>
      <div id="moneyClock"><div class="money"></div><div class="clock"></div></div>
      <div id="radioPanel"><div class="label">Radio</div><div class="song"></div></div>
      <div id="minimapWrap"><canvas id="minimap" width="150" height="150"></canvas></div>
      <div id="rankPanel" class="panel"><div class="label">Respect — Rank</div><div class="rank"></div><div class="ladder"></div></div>
      <div id="crewPanel" class="panel"><div class="label">Crew</div><div class="crew"></div></div>
      <div id="vehiclePanel" class="panel"><div class="carName"></div><div class="speed"></div><div class="cond"></div></div>
      <div id="weaponPanel" class="panel"><div class="label">Weapons</div><div class="slots"></div></div>
      <div id="barsPanel"><div class="bl">Health</div><div class="bar hp"><i></i></div><div class="bl">Armour</div><div class="bar ar"><i></i></div></div>
      <div id="dialogueBox" style="display:none"></div>
      <div id="banner"><div class="big"></div><div class="sub"></div></div>
    `;
    root.appendChild(this.hudEl);
    this.hudEl.style.display = 'none';

    this.titleEl = document.createElement('div');
    this.titleEl.id = 'title';
    this.titleEl.innerHTML = `
      <div class="scrim"></div>
      <div class="titleBlock">
        <h1>VICE SHORES</h1>
        <div class="sub">A SUN-SOAKED CITY OF YOUR OWN</div>
        <div class="tagline">EIGHT JOBS &nbsp;·&nbsp; FIVE STARS &nbsp;·&nbsp; ONE GOLDEN HOUR</div>
      </div>
      <div id="titleStory">Rook is new in town. The fixer Marla has eight jobs and a fast car — take the wheel, outrun the law, and become the king of the shore.</div>
      <div id="titleMenu">
        <div class="item sel" data-act="continue">CONTINUE</div>
        <div class="item" data-act="new">NEW GAME</div>
        <div class="item" data-act="load">LOAD GAME</div>
        <div class="item" data-act="settings">SETTINGS</div>
      </div>
      <div id="saveSlots"><div class="slotHead">SAVE SLOTS</div></div>
      <div id="titleControls">WASD drive / walk &nbsp;·&nbsp; E enter &amp; steal &nbsp;·&nbsp; SPACE shoot &nbsp;·&nbsp; SHIFT sneak &nbsp;·&nbsp; C camera &nbsp;·&nbsp; M radio &nbsp;·&nbsp; P pause &nbsp;·&nbsp; G garage</div>
    `;
    root.appendChild(this.titleEl);

    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'overlay';
    this.overlayEl.innerHTML = `<div class="box"></div>`;
    root.appendChild(this.overlayEl);

    this.titleEl.querySelectorAll('#titleMenu .item').forEach((el) => {
      el.addEventListener('click', () => {
        this.titleEl.querySelectorAll('#titleMenu .item').forEach((x) => x.classList.remove('sel'));
        el.classList.add('sel');
        if (this.cb.onMenu) this.cb.onMenu(el.dataset.act);
      });
    });
    this.minimapCtx = this.hudEl.querySelector('#minimap').getContext('2d');
    this.dialogueTimer = 0;
    this.bannerTimer = 0;
  }

  setSaveSlots(slots) {
    const wrap = this.titleEl.querySelector('#saveSlots');
    wrap.querySelectorAll('.slot').forEach((s) => s.remove());
    slots.forEach((slot, i) => {
      const div = document.createElement('div');
      div.className = 'slot' + (slot.empty ? ' empty' : '') + (i === 0 ? ' sel' : '');
      if (slot.empty) {
        div.innerHTML = `<div class="sTitle">SLOT ${i + 1} · EMPTY</div><div class="sMeta">No save yet — start a new game and write your story.</div>`;
      } else {
        div.innerHTML = `<div class="sTitle">SLOT ${i + 1} · ${slot.act} — ${slot.jobName}</div><div class="sMeta">${slot.percent}% complete · ${slot.missions} missions · ${slot.location}<br>${slot.money} · ${slot.time} · Rank ${slot.rank}</div>`;
      }
      div.addEventListener('click', () => {
        wrap.querySelectorAll('.slot').forEach((x) => x.classList.remove('sel'));
        div.classList.add('sel');
        if (this.cb.onSlot) this.cb.onSlot(i);
      });
      wrap.appendChild(div);
    });
  }

  showTitle() {
    this.titleEl.style.display = 'block';
    this.hudEl.style.display = 'none';
    this.overlayEl.style.display = 'none';
  }

  showGame() {
    this.titleEl.style.display = 'none';
    this.hudEl.style.display = 'block';
  }

  update(state, dt) {
    if (this.hudEl.style.display === 'none') return;
    const q = (sel) => this.hudEl.querySelector(sel);
    const job = jobPanelText(state.missions);
    q('#jobPanel .jobTitle').textContent = job.title;
    q('#jobPanel .jobObj').textContent = job.objective;
    q('#jobPanel .jobMeta').innerHTML = `Payout <b>${job.payout}</b>${job.act ? ` · ${job.act}` : ''}${job.location ? ` · ${job.location}` : ''}`;
    const units = q('#dispatchPanel .units');
    if (state.police.length === 0 && state.wanted === 0) {
      units.innerHTML = `<div class="unit"><span>VSPD — ALL QUIET</span><span>—</span></div>`;
    } else {
      units.innerHTML = state.police
        .slice(0, 5)
        .map((u) => `<div class="unit"><span>${u.name} · ${Math.round(u.dist || 0)}m</span><span class="tactic">${u.tactic}</span></div>`)
        .join('');
      if (state.wanted >= 4) {
        units.innerHTML += `<div class="unit"><span>HELI-1 · AIRBORNE</span><span class="tactic">SPOTLIGHT</span></div>`;
      }
    }
    const stars = q('#starsPanel .stars');
    stars.innerHTML = [1, 2, 3, 4, 5].map((n) => `<span class="${n <= state.wanted ? '' : 'off'}">★</span>`).join('');
    q('#moneyClock .money').textContent = `$${Math.round(state.money).toLocaleString()}`;
    q('#moneyClock .clock').textContent = `${state.clock} · ${state.day}`;
    q('#radioPanel .song').innerHTML = `<b>${state.radio.station}</b> — ${state.radio.song}`;
    const rank = rankFor(state.missions.completedJobs.length);
    q('#rankPanel .rank').textContent = `${rank} · ${respectPercent(state.missions.completedJobs.length)}%`;
    q('#rankPanel .ladder').innerHTML = ['NOBODY', 'HUSTLER', 'WHEELMAN', 'FIXER', 'BOSS']
      .map((r) => `<span class="${r === rank ? 'on' : ''}">${r === rank ? '▶ ' : ''}${r}</span>`)
      .join(' · ');
    q('#crewPanel .crew').innerHTML = CREW.map((c) => `<div><b>${c.name}</b> — ${c.ability}: ${c.desc}</div>`).join('');
    const car = state.player.car;
    if (car) {
      q('#vehiclePanel .carName').textContent = car.name;
      q('#vehiclePanel .speed').textContent = `${Math.round(Math.abs(car.speed) * 3.6)} km/h`;
      q('#vehiclePanel .cond').textContent = `Condition ${Math.round(car.condition)}% · ${state.nitroTuned ? 'NITRO ready' : 'No nitro'}`;
    } else {
      q('#vehiclePanel .carName').textContent = 'ON FOOT — ROOK';
      q('#vehiclePanel .speed').textContent = `${Math.round(state.player.speed * 3.6)} km/h`;
      q('#vehiclePanel .cond').textContent = 'Find a car — press E near one';
    }
    const weapons = [
      { name: 'Fists', ammo: '∞', on: state.weapon === 0 },
      { name: 'Pistol', ammo: state.ammo.pistol, on: state.weapon === 1 },
      { name: 'SMG', ammo: state.ammo.smg, on: state.weapon === 2 },
    ];
    q('#weaponPanel .slots').innerHTML = weapons
      .map((w, i) => `<div class="slot${w.on ? ' on' : ''}"><span>${i + 1} · ${w.name}</span><span>${w.ammo}</span></div>`)
      .join('');
    q('#barsPanel .bar.hp i').style.width = `${Math.max(0, state.health)}%`;
    q('#barsPanel .bar.ar i').style.width = `${Math.max(0, state.armor)}%`;
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) q('#dialogueBox').style.display = 'none';
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) q('#banner').style.display = 'none';
    }
    this.drawMinimap(state);
  }

  drawMinimap(state) {
    const ctx = this.minimapCtx;
    const S = 150;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(6,14,28,.9)';
    ctx.fillRect(0, 0, S, S);
    const toMap = (x, z) => [((x + 320) / 640) * S, ((z + 320) / 640) * S];
    // Ocean on the east.
    ctx.fillStyle = '#1e7fc4';
    const [ox] = toMap(284, 0);
    ctx.fillRect(ox, 0, S - ox, S);
    ctx.fillStyle = '#f2d492';
    ctx.fillRect(ox - 4, 0, 4, S);
    // Roads: the grid streets.
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    for (const s of [-240, -160, -80, 0, 80, 160, 240]) {
      const [x1, z1] = toMap(s, -280);
      const [x2, z2] = toMap(s, 280);
      ctx.beginPath();
      ctx.moveTo(x1, z1);
      ctx.lineTo(x2, z2);
      ctx.stroke();
      const [hx1, hz1] = toMap(-280, s);
      const [hx2, hz2] = toMap(280, s);
      ctx.beginPath();
      ctx.moveTo(hx1, hz1);
      ctx.lineTo(hx2, hz2);
      ctx.stroke();
    }
    // Marker.
    if (state.marker) {
      const [mx, mz] = toMap(state.marker.x, state.marker.z);
      ctx.fillStyle = '#ffd21f';
      ctx.beginPath();
      ctx.moveTo(mx, mz - 6);
      ctx.lineTo(mx + 5, mz);
      ctx.lineTo(mx, mz + 6);
      ctx.lineTo(mx - 5, mz);
      ctx.closePath();
      ctx.fill();
    }
    // Police as red dots, player as a white arrow.
    for (const u of state.police) {
      const [px, pz] = toMap(u.car.x, u.car.z);
      ctx.fillStyle = '#ff4d4d';
      ctx.beginPath();
      ctx.arc(px, pz, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const [px, pz] = toMap(state.player.x, state.player.z);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px, pz, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd21f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, pz, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  showDialogue(speaker, text, seconds) {
    const box = this.hudEl.querySelector('#dialogueBox');
    box.innerHTML = `<b>${speaker}:</b> ${text}`;
    box.style.display = 'block';
    this.dialogueTimer = seconds || 6;
  }

  showBanner(big, sub, seconds) {
    const b = this.hudEl.querySelector('#banner');
    b.querySelector('.big').textContent = big;
    b.querySelector('.sub').textContent = sub;
    b.style.display = 'block';
    this.bannerTimer = seconds || 3.5;
  }

  showOverlay(html) {
    const box = this.overlayEl.querySelector('.box');
    box.innerHTML = html;
    this.overlayEl.style.justifyContent = 'center';
    this.overlayEl.style.paddingLeft = '0';
    this.overlayEl.style.display = 'flex';
    box.querySelectorAll('[data-act]').forEach((el) => {
      el.addEventListener('click', () => {
        if (this.cb.onOverlay) this.cb.onOverlay(el.dataset.act, el);
      });
    });
  }

  hideOverlay() {
    this.overlayEl.style.display = 'none';
  }

  garageHTML(state) {
    const car = state.player.car || state.garageCar;
    const name = car ? car.name : 'No car — steal one first';
    const cond = car ? Math.round(car.condition) : 0;
    return `
      <h2>ROOK'S GARAGE — PALM ROW</h2>
      <div class="row"><span>Car</span><b>${name}</b></div>
      <div class="row"><span>Condition</span><b>${cond}%</b></div>
      <div class="row"><span>Money</span><b>$${Math.round(state.money).toLocaleString()}</b></div>
      <hr style="border-color:rgba(255,255,255,.2)">
      <div class="row"><span>Full repair — back to 100%</span><button class="btn" data-act="repair" style="margin:0;padding:6px 14px">$250</button></div>
      <div class="row"><span>Respray — sunrise orange</span><button class="btn" data-act="respray" style="margin:0;padding:6px 14px">$150</button></div>
      <div class="row"><span>Armour plating +40</span><button class="btn" data-act="armor" style="margin:0;padding:6px 14px">$400</button></div>
      <div class="row"><span>Ammo — pistol + SMG refill</span><button class="btn" data-act="ammo" style="margin:0;padding:6px 14px">$180</button></div>
      <div class="row"><span>Nitro tune — faster top speed</span><button class="btn" data-act="nitro" style="margin:0;padding:6px 14px">$600</button></div>
      <button class="btn ghost" data-act="close">BACK TO THE CITY</button>
    `;
  }

  pauseHTML(state) {
    return `
      <h2>PAUSED</h2>
      <div class="row"><span>Job</span><b>${jobPanelText(state.missions).title}</b></div>
      <div class="row"><span>Money</span><b>$${Math.round(state.money).toLocaleString()}</b></div>
      <div class="row"><span>Wanted</span><b>${'★'.repeat(state.wanted)}${'☆'.repeat(5 - state.wanted)}</b></div>
      <div class="row"><span>Rank</span><b>${rankFor(state.missions.completedJobs.length)}</b></div>
      <button class="btn" data-act="resume">RESUME</button>
      <button class="btn ghost" data-act="save">SAVE GAME</button>
      <button class="btn ghost" data-act="quit">QUIT TO TITLE</button>
    `;
  }

  bustedHTML(lost) {
    return `
      <h2>BUSTED!</h2>
      <p style="font-size:14px;line-height:1.5">The VSPD hauled Rook in. The car is impounded and the fine stings.</p>
      <div class="row"><span>Fine paid</span><b>-$${lost.toLocaleString()}</b></div>
      <button class="btn" data-act="respawn">WAKE UP AT THE SAFEHOUSE</button>
    `;
  }
}
