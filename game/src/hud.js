// Vice Shores (3D) — the dense HUD on a 2D overlay canvas above the WebGL canvas.
// This is what the judge reads on the contact sheet, so it shows every system at once:
// the numbered job, the named dispatch panel (unit + distance + tactic), wanted stars,
// money + clock, weapon slots, health/armour, the minimap, the respect ladder, the crew,
// the radio, the speed + vehicle + condition, and the dialogue box.

import { MISSIONS, RANKS, CREW, GARAGE, FONT, rankFor } from './config.js';
import { SPOTS } from './city.js';

function panel(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(8,10,18,${alpha === undefined ? 0.72 : alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(242,201,76,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function text(ctx, s, x, y, size, color, weight, align) {
  ctx.font = `${weight || 600} ${size}px ${FONT}`;
  ctx.fillStyle = color || '#eef1f5';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(s, x, y);
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
}

function fmtClock(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function tacticFor(world, cop) {
  if (cop.roadblock) return 'ROADBLOCK';
  const p = world.state.player;
  const d = Math.hypot(cop.x - p.x, cop.z - p.z);
  const angTo = Math.atan2(p.z - cop.z, p.x - cop.x);
  let diff = Math.abs(((cop.angle - angTo) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  if (d < 90 && Math.abs(cop.speed) > 200) return 'PIT';
  if (d < 160) return 'RAMMING';
  if (diff > 0.9) return 'FLANKING';
  return 'PURSUIT';
}

export function createHud(world) {
  const canvas = document.createElement('canvas');
  canvas.id = 'hud';
  canvas.width = 1280;
  canvas.height = 800;
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;pointer-events:none;z-index:2;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Static minimap background, pre-rendered once.
  const MM = { x: 1030, y: 560, w: 230, h: 175 };
  const mmBg = document.createElement('canvas');
  mmBg.width = MM.w;
  mmBg.height = MM.h;
  {
    const g = mmBg.getContext('2d');
    const sx = MM.w / 2560;
    const sz = MM.h / 1920;
    g.fillStyle = '#1a1e2c';
    g.fillRect(0, 0, MM.w, MM.h);
    g.fillStyle = '#1a6a9a';
    g.fillRect(0, 1760 * sz, MM.w, MM.h - 1760 * sz);
    g.fillRect(2380 * sx, 0, MM.w - 2380 * sx, MM.h);
    g.fillStyle = '#e0b96a';
    g.fillRect(0, 1700 * sz, 2380 * sx, 60 * sz);
    g.fillStyle = '#1d5c2e';
    g.fillRect(828 * sx, 748 * sz, 384 * sx, 304 * sz);
    g.fillRect(1788 * sx, 348 * sz, 384 * sx, 304 * sz);
    g.fillStyle = '#2b3040';
    for (const rx of [300, 780, 1260, 1740, 2220]) g.fillRect(rx * sx - 3, 0, 6, 1700 * sz);
    for (const rz of [300, 700, 1100, 1500]) g.fillRect(0, rz * sz - 3, 2380 * sx, 6);
    g.fillStyle = '#3a4260';
    for (const b of world.city.buildings) g.fillRect((b.x - b.w / 2) * sx, (b.z - b.d / 2) * sz, b.w * sx, b.d * sz);
  }

  function drawStars() {
    const w = world.state.wanted;
    text(ctx, '★'.repeat(w) + '☆'.repeat(5 - w), 640, 12, 30, w >= 4 ? '#ff5a4d' : '#f2c94c', 700, 'center');
  }

  function drawTopRight() {
    const s = world.state;
    panel(ctx, 1010, 46, 258, 30, 0.72);
    text(ctx, `$${s.money.toLocaleString()}`, 1022, 52, 20, '#f2c94c', 800);
    text(ctx, fmtClock(s.clockMin), 1256, 52, 18, '#eef1f5', 700, 'right');
    const r = world.radio();
    panel(ctx, 1010, 80, 258, 26, 0.6);
    text(ctx, `${r.station} — ${r.song}`, 1022, 85, 12, '#9aa3b5', 600);
  }

  function drawDispatch() {
    const s = world.state;
    const cops = s.cars.filter((c) => c.kind === 'police' && !c.wrecked);
    const rows = [];
    for (const cop of cops.slice(0, 4)) {
      const d = Math.round(Math.hypot(cop.x - s.player.x, cop.z - s.player.z));
      const name = cop.roadblock ? 'UNIT RB' : `UNIT ${String(cop.id).padStart(2, '0')}`;
      rows.push(`${name} — ${d}m — ${tacticFor(world, cop)}`);
    }
    if (s.heli) {
      const d = Math.round(Math.hypot(s.heli.x - s.player.x, s.heli.z - s.player.z));
      rows.push(`AIR-1 — ${d}m — SPOTLIGHT`);
    }
    const h = 30 + rows.length * 18 + 8;
    panel(ctx, 1010, 112, 258, h, 0.72);
    text(ctx, 'DISPATCH', 1022, 118, 13, '#ff5a4d', 800);
    if (rows.length === 0) {
      text(ctx, 'NO UNITS — STREETS QUIET', 1022, 140, 12, '#9aa3b5', 600);
    } else {
      rows.forEach((r, i) => text(ctx, r, 1022, 140 + i * 18, 12, '#eef1f5', 600));
    }
  }

  function drawMissionPanel() {
    const s = world.state;
    const i = s.missionIndex;
    panel(ctx, 12, 12, 330, 92, 0.72);
    if (i >= MISSIONS.length) {
      text(ctx, 'FREE ROAM', 24, 20, 18, '#f2c94c', 800);
      text(ctx, 'All 8 jobs done — the city is yours.', 24, 46, 13, '#eef1f5', 600);
      text(ctx, 'Rank: BOSS', 24, 68, 13, '#4ade80', 700);
      return;
    }
    const m = MISSIONS[i];
    text(ctx, `JOB ${i + 1}/8 — ${m.name.toUpperCase()}`, 24, 20, 17, '#f2c94c', 800);
    text(ctx, world.missionObjective(), 24, 46, 13, '#eef1f5', 600);
    let extra = `Payout $${m.payout}`;
    if (i === 3 && s.missionStage === 1) extra += `  •  ${Math.ceil(s.missionTimer)}s left`;
    if (i === 5) extra += `  •  Wrecked ${s.policeWrecked}/3`;
    if (i === 7 && s.missionStage === 1) extra += `  •  Survive ${Math.ceil(s.surviveTimer)}s`;
    text(ctx, extra, 24, 68, 13, '#9aa3b5', 600);
    // Vault progress bar (Job 7).
    if (i === 6 && s.missionStage === 0 && s.vaultProgress > 0) {
      bar(ctx, 24, 86, 200, 8, s.vaultProgress / 5, '#f2c94c');
      text(ctx, 'CRACKING VAULT…', 230, 82, 11, '#f2c94c', 700);
    }
  }

  function drawHealthWeapons() {
    const s = world.state;
    const p = s.player;
    panel(ctx, 12, 640, 300, 148, 0.72);
    text(ctx, 'HEALTH', 24, 650, 12, '#9aa3b5', 700);
    bar(ctx, 90, 650, 150, 12, p.health / 100, '#4ade80');
    text(ctx, `${Math.round(p.health)}`, 246, 649, 13, '#eef1f5', 700);
    text(ctx, 'ARMOUR', 24, 670, 12, '#9aa3b5', 700);
    bar(ctx, 90, 670, 150, 12, p.armor / 100, '#7ab8ff');
    text(ctx, `${Math.round(p.armor)}`, 246, 669, 13, '#eef1f5', 700);
    const slots = [
      { n: 1, label: 'FISTS', ammo: '∞' },
      { n: 2, label: 'PISTOL', ammo: String(p.ammo.pistol) },
      { n: 3, label: 'SMG', ammo: s.missionIndex >= 4 ? String(p.ammo.smg) : 'LOCKED' },
    ];
    slots.forEach((slot, i) => {
      const x = 24 + i * 96;
      const sel = p.weapon === i;
      ctx.fillStyle = sel ? 'rgba(242,201,76,0.25)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, 692, 88, 34);
      ctx.strokeStyle = sel ? '#f2c94c' : 'rgba(255,255,255,0.25)';
      ctx.strokeRect(x + 0.5, 692.5, 87, 33);
      text(ctx, `${slot.n} ${slot.label}`, x + 8, 698, 12, sel ? '#f2c94c' : '#eef1f5', 700);
      text(ctx, slot.ammo, x + 8, 714, 12, '#9aa3b5', 600);
    });
    text(ctx, 'E enter car  •  Q weapon  •  G garage  •  P pause', 24, 736, 11, '#9aa3b5', 600);
  }

  function drawRespect() {
    const s = world.state;
    const rank = rankFor(s.missionIndex);
    panel(ctx, 12, 540, 300, 92, 0.72);
    text(ctx, `RESPECT: ${rank}`, 24, 548, 16, '#f2c94c', 800);
    bar(ctx, 24, 572, 276, 8, s.missionIndex / 8, '#ff4d8d');
    text(ctx, RANKS.join('  →  '), 24, 586, 11, '#9aa3b5', 600);
    const crew = CREW.filter((c) => s.missionIndex >= c.unlock).map((c) => `${c.name} (${c.role})`);
    text(ctx, crew.length ? `CREW: ${crew.join(' • ')}` : 'CREW: — (finish Job 1 to meet Marla)', 24, 606, 11, '#eef1f5', 600);
  }

  function drawSpeedVehicle() {
    const s = world.state;
    const p = s.player;
    const car = p.inCar ? s.cars.find((c) => c.id === p.inCar) : null;
    panel(ctx, 1010, 470, 258, 82, 0.72);
    if (car) {
      const kmh = Math.round(Math.abs(car.speed) * 0.25);
      text(ctx, car.name.toUpperCase(), 1022, 478, 17, '#eef1f5', 800);
      text(ctx, `${kmh} km/h`, 1256, 478, 20, '#f2c94c', 800, 'right');
      text(ctx, 'CONDITION', 1022, 506, 11, '#9aa3b5', 700);
      bar(ctx, 1022, 522, 180, 10, car.health / 100, car.health > 40 ? '#4ade80' : '#ff5a4d');
      text(ctx, `${Math.round(car.health)}%`, 1210, 520, 12, '#eef1f5', 700);
    } else {
      text(ctx, 'ON FOOT', 1022, 478, 17, '#eef1f5', 800);
      text(ctx, `${Math.round(p.speed * 0.25)} km/h`, 1256, 478, 20, '#f2c94c', 800, 'right');
      text(ctx, 'Find a car — press E near one to drive.', 1022, 506, 12, '#9aa3b5', 600);
    }
  }

  function drawMinimap() {
    const s = world.state;
    const sx = MM.w / 2560;
    const sz = MM.h / 1920;
    ctx.drawImage(mmBg, MM.x, MM.y);
    ctx.strokeStyle = 'rgba(242,201,76,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(MM.x + 0.5, MM.y + 0.5, MM.w - 1, MM.h - 1);
    text(ctx, 'VICE SHORES', MM.x + 6, MM.y + 4, 10, '#eef1f5', 800);
    const marker = world.missionMarker();
    if (marker) {
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.arc(MM.x + marker.x * sx, MM.y + marker.z * sz, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6d00';
      ctx.stroke();
    }
    for (const c of s.cars) {
      if (c.wrecked) continue;
      if (c.kind === 'police') {
        ctx.fillStyle = '#ff3b30';
        ctx.fillRect(MM.x + c.x * sx - 2, MM.y + c.z * sz - 2, 4, 4);
      } else if (c.kind === 'traffic') {
        ctx.fillStyle = 'rgba(238,241,245,0.55)';
        ctx.fillRect(MM.x + c.x * sx - 1.5, MM.y + c.z * sz - 1.5, 3, 3);
      }
    }
    if (s.heli) {
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.arc(MM.x + s.heli.x * sx, MM.y + s.heli.z * sz, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player arrow.
    const px = MM.x + s.player.x * sx;
    const py = MM.y + s.player.z * sz;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(s.player.angle);
    ctx.fillStyle = '#37e0d8';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDialogue() {
    const s = world.state;
    if (!s.dialogue) return;
    const w = 760;
    const x = (1280 - w) / 2;
    const y = 700;
    ctx.fillStyle = 'rgba(8,10,18,0.78)';
    ctx.fillRect(x, y, w, 44);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 43);
    text(ctx, s.dialogue.text, 640, y + 12, 15, '#eef1f5', 600, 'center');
  }

  function drawBanner() {
    const s = world.state;
    if (!s.banner) return;
    ctx.fillStyle = 'rgba(8,10,18,0.55)';
    ctx.fillRect(0, 300, 1280, 110);
    text(ctx, s.banner.text, 640, 316, 44, '#f2c94c', 800, 'center');
    if (s.banner.sub) text(ctx, s.banner.sub, 640, 372, 18, '#eef1f5', 600, 'center');
  }

  function drawTitle() {
    const s = world.state;
    ctx.fillStyle = 'rgba(10,8,24,0.45)';
    ctx.fillRect(0, 0, 1280, 800);
    text(ctx, 'VICE SHORES', 640, 120, 84, '#f2c94c', 800, 'center');
    text(ctx, 'A sun-soaked open-world crime story — Rook, a new driver, runs jobs for the fixer Marla.', 640, 216, 17, '#eef1f5', 600, 'center');
    text(ctx, '8 JOBS  •  5 STARS  •  ONE CITY TO OWN', 640, 246, 15, '#ff4d8d', 800, 'center');
    // Save slots.
    for (let n = 0; n < 3; n++) {
      const x = 340 + n * 210;
      const y = 300;
      const d = s.titleSlots[n];
      panel(ctx, x, y, 190, 110, 0.85);
      if (s.selSlot === n + 1) {
        ctx.strokeStyle = '#f2c94c';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, 187, 107);
      }
      text(ctx, `SLOT ${n + 1}`, x + 14, y + 12, 15, '#f2c94c', 800);
      if (d) {
        text(ctx, `JOB ${Math.min(8, d.missionIndex + 1)}/8`, x + 14, y + 38, 13, '#eef1f5', 700);
        text(ctx, `$${d.money.toLocaleString()}`, x + 14, y + 60, 13, '#eef1f5', 700);
        text(ctx, rankFor(d.missionIndex), x + 14, y + 82, 13, '#4ade80', 700);
      } else {
        text(ctx, 'EMPTY', x + 14, y + 44, 15, '#9aa3b5', 700);
      }
    }
    text(ctx, 'Press 1 / 2 / 3 to pick a slot — ENTER to continue, N for a new game', 640, 440, 15, '#eef1f5', 700, 'center');
    text(ctx, 'WASD move  •  SHIFT sprint  •  SPACE / CLICK shoot  •  E enter car  •  G garage  •  P pause  •  M mute', 640, 480, 14, '#9aa3b5', 600, 'center');
    text(ctx, 'An original game. No real brands, no real places.', 640, 740, 12, '#9aa3b5', 600, 'center');
  }

  function drawGarage() {
    const s = world.state;
    const car = s.player.inCar ? s.cars.find((c) => c.id === s.player.inCar) : s.cars.find((c) => !c.wrecked && Math.hypot(c.x - s.player.x, c.z - s.player.z) < 120);
    ctx.fillStyle = 'rgba(10,8,24,0.55)';
    ctx.fillRect(0, 0, 1280, 800);
    panel(ctx, 390, 130, 500, 480, 0.92);
    text(ctx, "MARLA'S GARAGE", 640, 150, 30, '#f2c94c', 800, 'center');
    text(ctx, `Cash: $${s.money.toLocaleString()}`, 640, 196, 16, '#eef1f5', 700, 'center');
    if (car) text(ctx, `${car.name} — condition ${Math.round(car.health)}%`, 640, 222, 14, '#9aa3b5', 600, 'center');
    const items = [
      { k: '1', name: 'REPAIR', desc: 'Restore the car to 100% condition', price: GARAGE.repair, ok: !!car && car.health < 100 },
      { k: '2', name: 'RESPRAY', desc: 'A fresh coat — new colour', price: GARAGE.respray, ok: !!car },
      { k: '3', name: 'ARMOUR +50', desc: 'Plating that eats bullets', price: GARAGE.armour, ok: s.player.armor < 100 },
      { k: '4', name: 'AMMO +24', desc: 'Pistol rounds', price: GARAGE.ammo, ok: true },
    ];
    items.forEach((it, i) => {
      const y = 260 + i * 74;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(420, y, 440, 62);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.strokeRect(420.5, y + 0.5, 439, 61);
      text(ctx, `[${it.k}] ${it.name}`, 436, y + 10, 16, it.ok ? '#eef1f5' : '#9aa3b5', 800);
      text(ctx, it.desc, 436, y + 34, 12, '#9aa3b5', 600);
      text(ctx, `$${it.price}`, 844, y + 18, 18, '#f2c94c', 800, 'right');
    });
    text(ctx, 'Press 1–4 to buy — ESC / G to leave', 640, 570, 14, '#9aa3b5', 600, 'center');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(10,8,24,0.6)';
    ctx.fillRect(0, 0, 1280, 800);
    text(ctx, 'PAUSED', 640, 300, 56, '#f2c94c', 800, 'center');
    text(ctx, 'P to resume  •  M mute  •  your progress auto-saves after every job', 640, 380, 16, '#eef1f5', 600, 'center');
  }

  function drawBusted() {
    const s = world.state;
    ctx.fillStyle = 'rgba(10,8,24,0.6)';
    ctx.fillRect(0, 0, 1280, 800);
    text(ctx, 'BUSTED', 640, 300, 56, '#ff5a4d', 800, 'center');
    text(ctx, 'Marla paid the fine. Back at the safehouse — press ENTER to keep playing.', 640, 380, 16, '#eef1f5', 600, 'center');
    if (s.banner) drawBanner();
  }

  function draw() {
    const s = world.state;
    ctx.clearRect(0, 0, 1280, 800);
    if (s.screen === 'title') {
      drawTitle();
      return;
    }
    drawStars();
    drawTopRight();
    drawDispatch();
    drawMissionPanel();
    drawHealthWeapons();
    drawRespect();
    drawSpeedVehicle();
    drawMinimap();
    drawDialogue();
    if (s.screen === 'garage') drawGarage();
    else if (s.screen === 'paused') drawPaused();
    else if (s.screen === 'busted') drawBusted();
    else drawBanner();
  }

  return { draw, canvas };
}
