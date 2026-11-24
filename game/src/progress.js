// Progress screen: district map from the actual city blocks, stats, save slots.
import { DISTRICTS } from './districts.js';
export class Progress {
  constructor() {
    this.cv = document.getElementById('progMap');
    this.ctx = this.cv.getContext('2d');
    this.side = document.getElementById('progSide');
    this.box = document.getElementById('progress');
    this.open = false;
  }
  show(state, saves) {
    this.open = true;
    this.box.style.display = 'flex';
    this.drawMap(state);
    const r = state.rank;
    const pct = Math.round((state.done / 8) * 100);
    this.side.innerHTML = `<h2>PROGRESSION — VICE SHORES</h2>
    <div><b>${r.name}</b> — ${r.cur} / ${r.need} XP</div>
    <div style="height:7px;border-radius:4px;background:rgba(255,255,255,.22);margin:6px 0"><div style="height:100%;width:${Math.min(100, (r.cur / r.need) * 100)}%;background:linear-gradient(90deg,#ffb347,#ff7b3d);border-radius:4px"></div></div>
    <div>Money: <b>$${state.money.toLocaleString('en-US')}</b> &nbsp; Wanted: ${'★'.repeat(state.wanted)}${'☆'.repeat(5 - state.wanted)}</div>
    <div>Missions: <b>${state.done} / 8 jobs · ${pct}% complete</b></div>
    <div>${state.ratings.map((x, i) => `Job ${i + 1}: ${x}`).join(' · ') || 'No jobs rated yet'}</div>
    <h3>CAREER STATS</h3>
    <div>Cars stolen: ${state.cars} · Distance: ${state.dist} km · Shots fired: ${state.shots} · Collectibles: ${state.coll} / 12</div>
    <h3>SAVE SLOTS — click a slot to save</h3>
    ${[0, 1, 2].map(i => {
      const s = saves[i];
      return `<div class="slot">SLOT ${i + 1} — ${s ? `Job ${s.job} of 8 — $${s.money} — ${s.date}` : 'empty — click to save'}</div>`;
    }).join('')}
    <div style="margin-top:12px;color:#cfe6ff">Press P or Esc to resume. E to enter/exit cars. 1–4 weapons. Q Swap Plates · F Quick Fix · C Eyes Out.</div>`;
  }
  hide() { this.open = false; this.box.style.display = 'none'; }
  drawMap(state) {
    const c = this.ctx, W = 800, H = 640;
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#2a3a55'; c.fillRect(0, 0, W, H);
    const toMap = (x, z) => [40 + ((x + 170) / 340) * 720, 20 + ((z + 170) / 340) * 580];
    for (const d of DISTRICTS) {
      const [x0, y0] = toMap(d.x0, d.z0);
      const [x1, y1] = toMap(d.x1, d.z1);
      c.fillStyle = '#' + d.tint.toString(16).padStart(6, '0');
      c.globalAlpha = 0.8;
      c.fillRect(x0, y0, x1 - x0, y1 - y0);
      c.globalAlpha = 1;
    }
    c.fillStyle = '#1d6f9a';
    c.fillRect(0, 20 + ((165 + 170) / 340) * 580, W, H);
    c.strokeStyle = '#e8b48a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, 20 + ((165 + 170) / 340) * 580); c.lineTo(W, 20 + ((165 + 170) / 340) * 580); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 5;
    for (let i = -160; i <= 160; i += 40) {
      const [x1, y1] = toMap(i, -170); const [x2, y2] = toMap(i, 170);
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      const [x3, y3] = toMap(-170, i); const [x4, y4] = toMap(170, i);
      c.beginPath(); c.moveTo(x3, y3); c.lineTo(x4, y4); c.stroke();
    }
    c.fillStyle = '#3a4a66';
    for (const f of state.footprints) {
      const [x, y] = toMap(f.x - f.w / 2, f.z - f.d / 2);
      c.fillRect(x, y, (f.w / 340) * 720, (f.d / 340) * 580);
    }
    c.fillStyle = '#ffffff'; c.font = 'bold 15px Inter, system-ui, sans-serif'; c.textAlign = 'center';
    for (const d of DISTRICTS) {
      const [x, y] = toMap((d.x0 + d.x1) / 2, (d.z0 + d.z1) / 2);
      c.fillText(d.name, x, y - 4);
      c.fillStyle = '#ffd166'; c.font = 'bold 13px Inter, system-ui, sans-serif';
      c.fillText((state.districtPct[d.id] ?? 0) + '%', x, y + 14);
      c.fillStyle = '#ffffff'; c.font = 'bold 15px Inter, system-ui, sans-serif';
    }
    if (state.player) {
      const [px, py] = toMap(state.player.x, state.player.z);
      c.fillStyle = '#ff4a4a';
      c.beginPath(); c.arc(px, py, 6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke();
    }
  }
}
