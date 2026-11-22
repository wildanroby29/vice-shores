// The HUD: every system visible at once — job, dispatch, stars, money and
// clock, weapons, health and armor, minimap, respect, crew, dialogue, radio,
// vehicle and speed — plus the title screen, the garage shop, pause and
// busted overlays. The DOM lives in index.html; this module keeps it true.
import { S, JOBS, CREW, RANKS, RADIO, WEAPONS, rankFor } from './config.js';
import { currentJob, rankProgress } from './missions.js';
import { dispatchList } from './police.js';

let minimapCtx = null;
let minimapCanvas = null;

function el(id) { return document.getElementById(id); }
function fmtClock() {
  const t = Math.floor(S.time) % 86400;
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60);
  const day = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][Math.floor(S.time / 86400) % 7];
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} · ${day}`;
}

export function initHud() {
  minimapCanvas = el('minimap');
  if (minimapCanvas) minimapCtx = minimapCanvas.getContext('2d');
  // Weapon slots.
  const w = el('weapons');
  if (w) {
    w.innerHTML = WEAPONS.map((wp, i) =>
      `<div class="wslot" id="wslot-${i}"><b>${i + 1}</b> ${wp.name}<span id="wammo-${i}"></span></div>`).join('');
  }
  // Crew slots.
  const c = el('crew');
  if (c) {
    c.innerHTML = CREW.map((cr) =>
      `<div class="crew"><b>${cr.key}</b> ${cr.name} — ${cr.ability}<i>${cr.desc}</i></div>`).join('');
  }
  // Respect ladder.
  const r = el('respect-ladder');
  if (r) r.innerHTML = RANKS.map((name, i) => `<span id="rank-${i}">${name}</span>`).join('<em>›</em>');
}

export function setDialogue(text, seconds) {
  S.dialogue = text; S.dialogueTimer = seconds || 6;
}

function starsHtml() {
  let s = '';
  for (let i = 0; i < 5; i += 1) s += `<span class="${i < S.wanted ? 'on' : ''}">★</span>`;
  return s;
}

export function updateHud() {
  const job = currentJob();
  const jp = el('job-title');
  if (jp) jp.textContent = job ? `JOB ${job.id}/8 — ${job.name}` : 'FREE ROAM — VICE SHORES';
  const jg = el('job-goal');
  if (jg) jg.textContent = job ? job.goal : 'The city is yours. Drive, steal, survive.';
  const jpay = el('job-pay');
  if (jpay) jpay.textContent = job ? `PAYOUT $${job.pay} · ${job.act} · ${job.place}` : `RESPECT ${S.respect} RP`;
  const dl = el('dispatch-list');
  if (dl) {
    const units = dispatchList({ x: S.player ? S.player.x : 0, z: S.player ? S.player.z : 0 });
    dl.innerHTML = units.length
      ? units.map((u) => `<div><b>${u.id}</b><span>${u.dist}m</span><i>${u.tactic}</i></div>`).join('')
      : '<div><b>VSPD</b><span>—</span><i>ALL QUIET</i></div>';
  }
  const st = el('stars');
  if (st) st.innerHTML = starsHtml();
  const wl = el('wanted-label');
  if (wl) wl.textContent = S.wanted > 0 ? 'WANTED' : 'CLEAN';
  const mo = el('money'); if (mo) mo.textContent = `$${S.money.toLocaleString()}`;
  const cl = el('clock'); if (cl) cl.textContent = fmtClock();
  const rs = el('radio-song');
  if (rs) { const r = RADIO[Math.floor(S.clock / 180) % RADIO.length]; el('radio-station').textContent = r.station; rs.textContent = r.song; }
  for (let i = 0; i < WEAPONS.length; i += 1) {
    const slot = el(`wslot-${i}`);
    if (slot) slot.classList.toggle('sel', S.weapon === i);
    const am = el(`wammo-${i}`);
    if (am) am.textContent = WEAPONS[i].ammo === Infinity ? '∞' : ` ${WEAPONS[i].ammo}`;
  }
  const hb = el('health-bar'); if (hb) hb.style.width = `${S.health}%`;
  const ab = el('armor-bar'); if (ab) ab.style.width = `${S.armor}%`;
  const hv = el('health-val'); if (hv) hv.textContent = `HEALTH ${Math.round(S.health)}`;
  const av = el('armor-val'); if (av) av.textContent = `ARMOR ${Math.round(S.armor)}`;
  const rp = rankProgress();
  const rr = el('respect-rank');
  if (rr) rr.textContent = `${RANKS[rp.rank]} · ${rp.pct}%`;
  const rb = el('respect-bar'); if (rb) rb.style.width = `${rp.pct}%`;
  for (let i = 0; i < RANKS.length; i += 1) {
    const node = el(`rank-${i}`);
    if (node) node.classList.toggle('cur', i === rp.rank);
  }
  const dg = el('dialogue');
  if (dg) {
    dg.textContent = S.dialogueTimer > 0 ? S.dialogue : '';
    dg.style.opacity = S.dialogueTimer > 0 ? '1' : '0';
  }
  const vn = el('vehicle-name');
  if (vn) {
    if (S.inCar && S.car) {
      vn.textContent = S.car.model.name.toUpperCase();
      el('vehicle-cond').textContent = `CONDITION ${Math.round(S.car.condition)}% · ${S.car.burning ? 'ON FIRE' : 'NO NITRO'}`;
      el('speed').textContent = `${Math.round(Math.abs(S.car.speed) * 3.6)} km/h`;
    } else {
      vn.textContent = 'ON FOOT — ROOK';
      el('vehicle-cond').textContent = 'Find a car — press E near one';
      el('speed').textContent = '0 km/h';
    }
  }
}

export function drawMinimap() {
  if (!minimapCtx || !minimapCanvas) return;
  const g = minimapCtx, W = minimapCanvas.width, H = minimapCanvas.height;
  const half = 200;
  const px = (x) => ((x + half) / (half * 2)) * W;
  const pz = (z) => ((z + half) / (half * 2)) * H;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#0e2a3a'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f2d8a0'; g.fillRect(px(178), 0, W - px(178), H); // beach
  g.fillStyle = '#1e9fc4'; g.fillRect(px(196), 0, W - px(196), H); // ocean
  g.strokeStyle = '#3a3f4a'; g.lineWidth = 3;
  for (let v = -182; v <= 182; v += 52) {
    g.beginPath(); g.moveTo(px(v), 0); g.lineTo(px(v), H); g.stroke();
    g.beginPath(); g.moveTo(0, pz(v)); g.lineTo(W, pz(v)); g.stroke();
  }
  g.strokeStyle = '#f7c948'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(px(156), 0); g.lineTo(px(156), H); g.stroke();
  if (S.marker) {
    g.fillStyle = '#ffc93c';
    g.beginPath(); g.arc(px(S.marker.x), pz(S.marker.z), 6, 0, 7); g.fill();
  }
  for (const car of S.traffic || []) { g.fillStyle = '#e8e8e8'; g.fillRect(px(car.x) - 2, pz(car.z) - 2, 4, 4); }
  for (const car of S.police || []) { g.fillStyle = '#ff2222'; g.fillRect(px(car.x) - 3, pz(car.z) - 3, 6, 6); }
  if (S.heli) { g.fillStyle = '#ff2222'; g.beginPath(); g.arc(px(S.heli.x), pz(S.heli.z), 5, 0, 7); g.fill(); }
  const pp = S.player ? { x: S.player.x, z: S.player.z } : (S.car ? { x: S.car.x, z: S.car.z } : { x: 0, z: 0 });
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(px(pp.x), pz(pp.z), 5, 0, 7); g.fill();
  g.fillStyle = '#d7263d';
  g.beginPath(); g.arc(px(pp.x), pz(pp.z), 3, 0, 7); g.fill();
}

// --- Overlays ---
export function showTitle() {
  el('title-screen').classList.add('show');
  el('hud').classList.add('dim');
  el('garage-screen').classList.remove('show');
  el('pause-screen').classList.remove('show');
  el('busted-screen').classList.remove('show');
}
export function hideTitle() {
  el('title-screen').classList.remove('show');
  el('hud').classList.remove('dim');
}
export function showGarage() {
  el('garage-screen').classList.add('show');
  el('hud').classList.add('dim');
  const gm = el('garage-money'); if (gm) gm.textContent = `$${S.money.toLocaleString()}`;
  const gc = el('garage-cond');
  if (gc && S.car) gc.textContent = `CONDITION ${Math.round(S.car.condition)}%`;
}
export function hideGarage() {
  el('garage-screen').classList.remove('show');
  el('hud').classList.remove('dim');
}
export function showPaused() { el('pause-screen').classList.add('show'); }
export function hidePaused() { el('pause-screen').classList.remove('show'); }
export function showBusted() {
  el('busted-screen').classList.add('show');
  el('busted-fine').textContent = `BAIL $150 — the VSPD took your cash and dropped you at the safehouse.`;
}
export function hideBusted() { el('busted-screen').classList.remove('show'); }

export function fillSaveSlots() {
  const slots = [
    { act: 'ACT II — MARKET SQUEEZE', pct: '32.8%', missions: '3/6 missions', place: 'Kumala Strand', money: '$12,650', time: '18:23', rank: 'WHEELMAN' },
    { act: 'ACT I — NEON RUN', pct: '18.5%', missions: '2/6 missions', place: 'Neon Row', money: '$4,380', time: '09:41', rank: 'HUSTLER' },
    null,
  ];
  const host = el('save-slots');
  if (!host) return;
  host.innerHTML = slots.map((s, i) => s
    ? `<div class="slot"><b>SLOT ${i + 1} · ${s.act}</b><span>${s.pct} complete · ${s.missions} · ${s.place} · ${s.money} · ${s.time}</span><i>Rank ${s.rank}</i></div>`
    : `<div class="slot empty"><b>SLOT ${i + 1} · EMPTY</b><span>No save yet — start a new game and write your story.</span></div>`).join('');
}
