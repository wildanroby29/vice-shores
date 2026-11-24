// HUD: mission card, rank, stars, money, dispatch, round minimap, weapons, abilities.
import { DISTRICTS } from './districts.js';
export class HUD {
  constructor() {
    this.el = id => document.getElementById(id);
    this.map = this.el('minimap').getContext('2d');
    this.subTimer = 0;
  }
  setMission(stage, obj, next) {
    this.el('missionTitle').textContent = stage;
    this.el('missionObj').textContent = obj;
    this.el('missionNext').textContent = next ? 'NEXT: ' + next : '';
  }
  setRank(name, xp, need) {
    this.el('rankName').textContent = name;
    this.el('rankXpText').textContent = `${xp} / ${need} XP`;
    this.el('xpFill').style.width = Math.min(100, (xp / need) * 100) + '%';
  }
  setStars(n) {
    let s = '';
    for (let i = 0; i < 5; i++) s += `<span class="${i < n ? '' : 'off'}">★</span>`;
    this.el('stars').innerHTML = s;
  }
  setMoney(m, time, radio) {
    this.el('moneyVal').textContent = '$' + m.toLocaleString('en-US');
    this.el('clockVal').textContent = time;
    this.el('radioVal').textContent = radio;
  }
  setDispatch(units, line) {
    this.el('dispatchUnits').innerHTML = units.map(u => `<div class="unit">▸ ${u.call} · ${u.role}</div>`).join('');
    this.el('dispatchLine').textContent = line ? `"${line}"` : '';
  }
  setWeapons(weapons, ammo, slot) {
    this.el('weapons').innerHTML = weapons.map((w, i) => `<div class="glass wslot ${i === slot ? 'on' : ''}">${i + 1} ${w.name} · <b>${ammo[i]}</b></div>`).join('');
  }
  setAbilities() {
    const a = [['Q', 'Swap Plates'], ['F', 'Quick Fix'], ['C', 'Eyes Out']];
    this.el('abilities').innerHTML = a.map(x => `<div class="glass acard"><span class="k">${x[0]}</span>${x[1]}</div>`).join('');
  }
  subtitle(speaker, text, dur) {
    const box = this.el('subtitle');
    this.el('subSpeaker').textContent = speaker;
    this.el('subText').textContent = text;
    box.style.display = 'block';
    this.subTimer = dur || 4;
  }
  setSpeed(num, label) {
    this.el('speedNum').textContent = Math.round(num);
    this.el('speedCar').textContent = label;
  }
  prompt(text) {
    const p = this.el('prompt');
    if (!text) { p.style.display = 'none'; return; }
    p.innerHTML = text; p.style.display = 'block';
  }
  tick(dt) { if (this.subTimer > 0) { this.subTimer -= dt; if (this.subTimer <= 0) this.el('subtitle').style.display = 'none'; } }
  drawMinimap(footprints, player, cops, target) {
    const c = this.map, S = 168, R = 84;
    c.clearRect(0, 0, S, S);
    c.save();
    c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#101828'; c.fillRect(0, 0, S, S);
    const toMap = (x, z) => [R + (x / 170) * R, R + (z / 170) * R];
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2;
    for (let i = -160; i <= 160; i += 40) {
      const [x1, y1] = toMap(i, -170); const [x2, y2] = toMap(i, 170);
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      const [x3, y3] = toMap(-170, i); const [x4, y4] = toMap(170, i);
      c.beginPath(); c.moveTo(x3, y3); c.lineTo(x4, y4); c.stroke();
    }
    c.fillStyle = '#1d6f9a';
    c.fillRect(0, R + (165 / 170) * R, S, S);
    for (const f of footprints) {
      const [x, y] = toMap(f.x - f.w / 2, f.z - f.d / 2);
      c.fillStyle = 'rgba(200,210,225,0.55)';
      c.fillRect(x, y, (f.w / 170) * R, (f.d / 170) * R);
    }
    if (target) {
      const [tx, ty] = toMap(target[0], target[1]);
      c.fillStyle = '#ffd166';
      c.beginPath(); c.arc(tx, ty, 5, 0, Math.PI * 2); c.fill();
    }
    for (const cop of cops) {
      const [cx, cy] = toMap(cop.position.x, cop.position.z);
      c.fillStyle = '#ff4a4a';
      c.beginPath(); c.arc(cx, cy, 3.5, 0, Math.PI * 2); c.fill();
    }
    const [px, py] = toMap(player.x, player.z);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(px, py - 6); c.lineTo(px + 5, py + 5); c.lineTo(px - 5, py + 5); c.closePath(); c.fill();
    c.restore();
  }
}
export function districtColor(id) {
  const d = DISTRICTS.find(x => x.id === id);
  return d ? '#' + d.tint.toString(16).padStart(6, '0') : '#888888';
}
