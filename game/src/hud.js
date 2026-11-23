// Vice Shores — the HUD and all menus. Dense, like the winners: job panel,
// named police dispatch, wanted stars, money + clock, weapon slots, health
// and armour, minimap, respect ladder, crew abilities, dialogue box, radio
// and vehicle info — all at once. Plus the poster title screen, the garage
// menu, pause and busted overlays.
//
// POSTER TITLE — the typography follows the classic GTA-logo style Tem
// sent as reference: VERY bold condensed letters, slanted forward (italic
// skew), stacked in two lines, a vivid yellow → orange → red gradient, and
// a THICK black outline with a strong drop shadow. The words are our own
// ("VICE SHORES") and the subtitle is our own ("A SUN-SOAKED CITY OF YOUR
// OWN") — the style is the reference, never the Rockstar name or logo.
import { JOBS, CREW, RANKS, rankFor, WEAPONS, GARAGE_PRICES, RADIO, CITY } from './config.js';

export function posterTitleSVG() {
  // Two stacked lines, slanted forward like the classic logo, with flames
  // licking up from the top of VICE and a band of flames burning along the
  // seam between VICE and SHORES, and three white stars top-right and three
  // bottom-left — matching Tem's approved title image. Each line is drawn
  // three times: dark extrusion copies offset down-right, then the gradient
  // face with a thick black outline and a drop shadow.
  const defs = `
    <defs>
      <linearGradient id="vsGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffe95e"/>
        <stop offset="0.45" stop-color="#ffb01e"/>
        <stop offset="0.75" stop-color="#ff6b1a"/>
        <stop offset="1" stop-color="#e63b2e"/>
      </linearGradient>
      <linearGradient id="vsFlame" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#ff3d00"/>
        <stop offset="0.55" stop-color="#ff8a00"/>
        <stop offset="1" stop-color="#ffe95e"/>
      </linearGradient>
      <filter id="vsShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="7" dy="9" stdDeviation="4" flood-color="#000" flood-opacity="0.65"/>
      </filter>
    </defs>`;
  function line(text, x, y, size) {
    const extr = [9, 6, 3].map((o) => `<text x="${x + o}" y="${y + o}" font-family="Arial Black, Arial, sans-serif" font-size="${size}" font-weight="900" fill="#7a1408" text-anchor="middle">${text}</text>`).join('');
    const face = `<text x="${x}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-size="${size}" font-weight="900" fill="url(#vsGrad)" stroke="#0a0a0a" stroke-width="13" stroke-linejoin="round" paint-order="stroke" text-anchor="middle" filter="url(#vsShadow)">${text}</text>`;
    const shine = `<text x="${x}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-size="${size}" font-weight="900" fill="#ffffff" opacity="0.18" text-anchor="middle" clip-path="url(#vsClip)">${text}</text>`;
    return extr + face + shine;
  }
  const star = (cx, cy, s) => `<path d="M ${cx} ${cy - 14 * s} L ${cx + 3.5 * s} ${cy - 3.5 * s} L ${cx + 14 * s} ${cy} L ${cx + 3.5 * s} ${cy + 3.5 * s} L ${cx} ${cy + 14 * s} L ${cx - 3.5 * s} ${cy + 3.5 * s} L ${cx - 14 * s} ${cy} L ${cx - 3.5 * s} ${cy - 3.5 * s} Z" fill="#ffffff" stroke="#0a0a0a" stroke-width="2.5" stroke-linejoin="round"/>`;
  // One flame tongue: base (x, y), width w, height h, filled with the flame
  // gradient and outlined in black — a vector flame, not a copied logo.
  const flame = (x, y, w, h) => {
    const p = [
      `M ${x} ${y}`,
      `C ${x - 0.42 * w} ${y - 0.22 * h} ${x - 0.45 * w} ${y - 0.62 * h} ${x - 0.10 * w} ${y - h}`,
      `C ${x - 0.14 * w} ${y - 0.72 * h} ${x + 0.02 * w} ${y - 0.66 * h} ${x + 0.06 * w} ${y - 0.80 * h}`,
      `C ${x + 0.22 * w} ${y - 0.55 * h} ${x + 0.42 * w} ${y - 0.28 * h} ${x} ${y}`,
      'Z',
    ].join(' ');
    return `<path d="${p}" fill="url(#vsFlame)" stroke="#0a0a0a" stroke-width="3" stroke-linejoin="round"/>`;
  };
  // Flames licking up from the top of VICE (bases y=30, tongues 20-38 tall).
  const topFlames = [
    [150, 30, 48, 36], [235, 30, 54, 38], [330, 30, 46, 30], [430, 30, 58, 38],
    [530, 30, 50, 32], [630, 30, 56, 36], [720, 30, 46, 26], [790, 30, 40, 22],
  ].map(([x, y, w, h]) => flame(x, y, w, h)).join('');
  // A BIG band of flames burning along the seam between VICE and SHORES:
  // tall tongues (36-60) that lick up into the gap and over VICE's base,
  // so the fire reads as one dramatic band, not scattered drops.
  const seamFlames = [];
  for (let x = 60; x <= 860; x += 50) {
    const h = 36 + ((x * 37) % 24);
    seamFlames.push(flame(x, 198, 52, h));
  }
  return `
  <svg viewBox="0 0 900 300" width="100%" style="display:block;overflow:visible;height:auto" aria-label="VICE SHORES">
    ${defs}
    <clipPath id="vsClip"><rect x="0" y="0" width="900" height="300"/></clipPath>
    ${topFlames}
    ${seamFlames.join('')}
    <g transform="translate(450 20) skewX(-8)">
      ${line('VICE', 0, 128, 160)}
      ${line('SHORES', 0, 272, 160)}
    </g>
    ${star(720, 24, 0.9)}${star(782, 12, 1)}${star(842, 28, 0.85)}
    ${star(40, 288, 0.7)}${star(92, 298, 0.78)}${star(142, 286, 0.68)}
  </svg>`;
}

export function buildHUD(doc, state) {
  const hud = doc.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <div id="jobPanel" class="panel"></div>
    <div id="stars" class="stars"></div>
    <div id="money" class="money"></div>
    <div id="dispatch" class="panel"></div>
    <div id="minimapWrap"><canvas id="minimap" width="150" height="150"></canvas></div>
    <div id="bars">
      <div class="barLabel">HEALTH <span id="healthNum"></span></div>
      <div class="bar"><div id="healthFill"></div></div>
      <div class="barLabel">ARMOR <span id="armorNum"></span></div>
      <div class="bar"><div id="armorFill"></div></div>
    </div>
    <div id="respect"></div>
    <div id="crew"></div>
    <div id="weapons"></div>
    <div id="vehicle"></div>
    <div id="dialogue"></div>
    <div id="radio"></div>
  `;
  doc.body.appendChild(hud);
  return hud;
}

export function updateHUD(doc, state, police, player) {
  const job = JOBS[Math.min(state.jobIndex, JOBS.length - 1)];
  const jobEl = doc.getElementById('jobPanel');
  if (jobEl) {
    jobEl.innerHTML = `<b>JOB ${job.id}/8 — ${job.name}</b><br>${job.target}<br><span class="muted">PAYOUT $${job.payout} · ${job.act} · ${job.place}</span><div class="jobBar"><div style="width:${(state.jobDone / 8) * 100}%"></div></div>`;
  }
  const starsEl = doc.getElementById('stars');
  if (starsEl) {
    let s = '';
    for (let i = 0; i < 5; i++) s += `<span class="star ${i < state.wanted ? 'on' : ''}">★</span>`;
    starsEl.innerHTML = s + '<div class="wantedLabel">WANTED</div>';
  }
  const moneyEl = doc.getElementById('money');
  if (moneyEl) {
    const radio = RADIO[state.radioIndex % RADIO.length];
    const hh = String(Math.floor(state.clockMin / 60) % 24).padStart(2, '0');
    const mm = String(state.clockMin % 60).padStart(2, '0');
    moneyEl.innerHTML = `<b>$${state.money.toLocaleString()}</b><br>${hh}:${mm} · ${state.day}<br><span class="muted">${radio.station} — ${radio.song}</span>`;
  }
  const dispEl = doc.getElementById('dispatch');
  if (dispEl) {
    const rows = (police && police.units ? police.units.slice(0, 7) : []).map((u) => `<div class="dispRow"><span>${u.name}</span><span>${Math.round(u.dist)}m</span><span class="tactic">${u.tactic}</span></div>`).join('');
    dispEl.innerHTML = `<b>VSPD DISPATCH — POLICE</b>${rows || '<div class="muted">ALL QUIET</div>'}`;
  }
  const healthFill = doc.getElementById('healthFill');
  if (healthFill) healthFill.style.width = state.health + '%';
  const armorFill = doc.getElementById('armorFill');
  if (armorFill) armorFill.style.width = state.armor + '%';
  const healthNum = doc.getElementById('healthNum');
  if (healthNum) healthNum.textContent = Math.round(state.health);
  const armorNum = doc.getElementById('armorNum');
  if (armorNum) armorNum.textContent = Math.round(state.armor);
  const respectEl = doc.getElementById('respect');
  if (respectEl) {
    const rank = rankFor(state.respect);
    const idx = RANKS.indexOf(rank);
    respectEl.innerHTML = `<b>${rank} — ${Math.round(state.respect)}%</b><div class="ladder">${RANKS.map((r, i) => `<span class="${i <= idx ? 'on' : ''}">${r}</span>`).join(' · ')}</div>`;
  }
  const crewEl = doc.getElementById('crew');
  if (crewEl) {
    crewEl.innerHTML = CREW.map((c) => `<div class="crewChip"><b>${c.key} ${c.name} — ${c.ability}</b><br><span class="muted">${c.desc}</span></div>`).join('');
  }
  const weaponsEl = doc.getElementById('weapons');
  if (weaponsEl) {
    weaponsEl.innerHTML = WEAPONS.map((w) => {
      const ammo = w.ammo === Infinity ? '∞' : (state.ammo[w.slot] ?? w.ammo);
      return `<div class="wpn ${state.weaponSlot === w.slot ? 'on' : ''}">${w.slot} · ${w.name} ${ammo}</div>`;
    }).join('');
  }
  const vehEl = doc.getElementById('vehicle');
  if (vehEl) {
    vehEl.innerHTML = state.onFoot
      ? `<b>ON FOOT — ROOK</b><br><span class="muted">${Math.round(state.speedKmh)} km/h</span>`
      : `<b>RUKUN PELO GT · CONDITION ${Math.round(state.carCondition)}%${state.nitro ? ' · NITRO' : ' · NO NITRO'}</b><br><span class="muted">${Math.round(state.speedKmh)} km/h</span>`;
  }
}

export function setDialogue(doc, text) {
  const el = doc.getElementById('dialogue');
  if (el) el.textContent = text;
}

export function drawMinimap(doc, player, police, beaconPos, jobDone) {
  const cv = doc.getElementById('minimap');
  if (!cv) return;
  const g = cv.getContext('2d');
  const W = 150, H = 150;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#0e2a33';
  g.fillRect(0, 0, W, H);
  // Ocean strip on the left.
  g.fillStyle = '#2a9db8';
  g.fillRect(0, 0, 22, H);
  // Street grid.
  g.strokeStyle = '#3a4a55';
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    g.beginPath(); g.moveTo(22 + i * 24, 0); g.lineTo(22 + i * 24, H); g.stroke();
    g.beginPath(); g.moveTo(0, i * 26); g.lineTo(W, i * 26); g.stroke();
  }
  // Boulevard.
  g.strokeStyle = '#e8c84a';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(30, 0); g.lineTo(30, H); g.stroke();
  const toMap = (x, z) => [30 + ((x + 60) / 160) * 118, 75 + (z / 120) * 72];
  // Mission beacon.
  if (beaconPos) {
    const [bx, by] = toMap(beaconPos.x, beaconPos.z);
    g.fillStyle = '#ffe95e';
    g.beginPath(); g.arc(bx, by, 5, 0, Math.PI * 2); g.fill();
  }
  // Police dots.
  if (police) {
    g.fillStyle = '#ff4d4d';
    for (const car of police.cars || []) {
      const [px, py] = toMap(car.position.x, car.position.z);
      g.fillRect(px - 2, py - 2, 4, 4);
    }
  }
  // Player.
  const [px, py] = toMap(player.x, player.z);
  g.fillStyle = '#ffe95e';
  g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#0a0a0a';
  g.lineWidth = 1.5;
  g.stroke();
}

export function buildTitleOverlay(doc, state, onStart) {
  const ov = doc.createElement('div');
  ov.id = 'titleOverlay';
  const slots = state.saveSlots.map((s, i) => {
    if (!s) return `<div class="slot"><b>SLOT ${i + 1} · EMPTY</b><br><span class="muted">No save yet — start a new game and write your story.</span></div>`;
    return `<div class="slot"><b>SLOT ${i + 1} · ${s.act}</b><br>${s.pct}% complete · ${s.missions} missions · ${s.place} · $${s.money.toLocaleString()} · ${s.time}<br><span class="muted">Rank ${s.rank}</span></div>`;
  }).join('');
  ov.innerHTML = `
    <div id="titleTop">${posterTitleSVG()}
      <div class="subtitle">${CITY.subtitle}</div>
      <div class="tagline">${CITY.tagline}</div>
    </div>
    <div id="titleLeft">
      <p class="story">Rook is new in town. The fixer Marla has eight jobs and a fast car — take the wheel, outrun the law, and become the king of the shore.</p>
      <div class="menu">
        <button data-act="continue" class="menuBtn hot">▶ CONTINUE</button>
        <button data-act="new" class="menuBtn">NEW GAME</button>
        <button data-act="load" class="menuBtn">LOAD GAME</button>
        <button data-act="settings" class="menuBtn">SETTINGS</button>
      </div>
    </div>
    <div id="titleRight">${slots}</div>
    <div id="titleBottom">WASD drive / walk · E enter &amp; steal · SPACE shoot · SHIFT sneak · C camera · M radio · P pause · G garage</div>
  `;
  doc.body.appendChild(ov);
  ov.querySelectorAll('.menuBtn').forEach((b) => {
    b.addEventListener('click', () => onStart(b.getAttribute('data-act')));
  });
  return ov;
}

export function buildGarageOverlay(doc, state, onBuy, onClose) {
  const ov = doc.createElement('div');
  ov.id = 'garageOverlay';
  ov.className = 'hidden';
  const rows = GARAGE_PRICES.map((p, i) => `<button class="shopRow" data-i="${i}"><span>${p.name}</span><b>$${p.price}</b></button>`).join('');
  ov.innerHTML = `
    <div class="shopPanel">
      <h2>DOCKSIDE CUSTOMS</h2>
      <p class="muted">Airbrush workshop — your GT is on the lift, mid-paint.</p>
      <p>Car: <b>Rukun Pelo GT</b> · CONDITION <span id="garageCond">${Math.round(state.carCondition)}%</span> · $${state.money.toLocaleString()}</p>
      ${rows}
      <button id="garageClose" class="menuBtn hot">BACK TO THE CITY</button>
    </div>
  `;
  doc.body.appendChild(ov);
  ov.querySelectorAll('.shopRow').forEach((b) => {
    b.addEventListener('click', () => onBuy(Number(b.getAttribute('data-i'))));
  });
  ov.querySelector('#garageClose').addEventListener('click', onClose);
  return ov;
}

export function buildPauseOverlay(doc, onResume) {
  const ov = doc.createElement('div');
  ov.id = 'pauseOverlay';
  ov.className = 'hidden';
  ov.innerHTML = `<div class="shopPanel"><h2>PAUSED</h2><p class="muted">Take a breath, Rook. The city waits.</p><button id="resumeBtn" class="menuBtn hot">RESUME</button></div>`;
  doc.body.appendChild(ov);
  ov.querySelector('#resumeBtn').addEventListener('click', onResume);
  return ov;
}

export function buildBustedOverlay(doc, onRespawn) {
  const ov = doc.createElement('div');
  ov.id = 'bustedOverlay';
  ov.className = 'hidden';
  ov.innerHTML = `<div class="shopPanel"><h2>BUSTED</h2><p>The VSPD caught up with you. Fine paid — back to the safehouse.</p><button id="respawnBtn" class="menuBtn hot">BACK TO THE STREETS</button></div>`;
  doc.body.appendChild(ov);
  ov.querySelector('#respawnBtn').addEventListener('click', onRespawn);
  return ov;
}
