// The dense HUD for Vice Shores: job panel, named police dispatch, wanted stars,
// money and clock, weapon slots, health and armor, minimap, respect ladder, crew
// abilities, dialogue, radio, and the vehicle readout — all updated every frame.
import { JOBS, CREW, RANKS, RANK_THRESHOLDS, WEAPONS, RADIO, WORLD } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  const jobName = el('hud-job-name');
  const jobObj = el('hud-job-obj');
  const jobPay = el('hud-job-pay');
  const jobBar = el('hud-job-bar');
  const stars = el('hud-stars');
  const money = el('hud-money');
  const clock = el('hud-clock');
  const radio = el('hud-radio');
  const dispatch = el('hud-dispatch');
  const healthBar = el('hud-health-bar');
  const healthText = el('hud-health-text');
  const armorBar = el('hud-armor-bar');
  const armorText = el('hud-armor-text');
  const rankName = el('hud-rank');
  const rankBar = el('hud-rank-bar');
  const rankLadder = el('hud-ladder');
  const crewRow = el('hud-crew');
  const weaponsRow = el('hud-weapons');
  const dialogue = el('hud-dialogue');
  const message = el('hud-message');
  const vehicle = el('hud-vehicle');
  const speed = el('hud-speed');
  const minimap = el('hud-minimap');
  const mapCtx = minimap ? minimap.getContext('2d') : null;

  const weaponSlots = {};
  for (const w of WEAPONS) {
    const node = document.createElement('div');
    node.className = 'weapon';
    node.id = `weapon-${w.slot}`;
    weaponsRow.appendChild(node);
    weaponSlots[w.slot] = node;
  }
  const crewSlots = {};
  for (const c of CREW) {
    const node = document.createElement('div');
    node.className = 'crew';
    node.id = `crew-${c.key}`;
    crewRow.appendChild(node);
    crewSlots[c.key] = node;
  }
  const ladderSlots = {};
  for (const rank of RANKS) {
    const node = document.createElement('span');
    node.className = 'ladder-rank';
    node.textContent = rank;
    rankLadder.appendChild(node);
    ladderSlots[rank] = node;
  }

  function rankIndex(respect) {
    let idx = 0;
    for (let i = 0; i < RANK_THRESHOLDS.length; i += 1) {
      if (respect >= RANK_THRESHOLDS[i]) idx = i;
    }
    return idx;
  }

  function drawMinimap(state, dots) {
    if (!mapCtx) return;
    const W = 150;
    const H = 150;
    mapCtx.clearRect(0, 0, W, H);
    mapCtx.fillStyle = 'rgba(10,18,28,0.85)';
    mapCtx.fillRect(0, 0, W, H);
    const mx = (x) => ((x - WORLD.minX) / (WORLD.maxX - WORLD.minX)) * W;
    const mz = (z) => ((z - WORLD.minZ) / (WORLD.maxZ - WORLD.minZ)) * H;
    // Ocean and beach.
    mapCtx.fillStyle = '#1f8fb8';
    mapCtx.fillRect(0, 0, mx(WORLD.beachX), H);
    mapCtx.fillStyle = '#e8cf9a';
    mapCtx.fillRect(mx(WORLD.beachX), 0, mx(WORLD.oceanX + 8) - mx(WORLD.beachX), H);
    // Roads.
    mapCtx.strokeStyle = '#5a6068';
    mapCtx.lineWidth = 4;
    for (const x of WORLD.roadXs) {
      mapCtx.beginPath();
      mapCtx.moveTo(mx(x), 0);
      mapCtx.lineTo(mx(x), H);
      mapCtx.stroke();
    }
    for (const z of WORLD.roadZs) {
      mapCtx.beginPath();
      mapCtx.moveTo(0, mz(z));
      mapCtx.lineTo(W, mz(z));
      mapCtx.stroke();
    }
    // Boulevard.
    mapCtx.strokeStyle = '#7a828c';
    mapCtx.lineWidth = 7;
    mapCtx.beginPath();
    mapCtx.moveTo(mx(WORLD.boulevardX), 0);
    mapCtx.lineTo(mx(WORLD.boulevardX), H);
    mapCtx.stroke();
    // Mission beacon.
    if (dots.beacon) {
      mapCtx.fillStyle = '#ffd21f';
      mapCtx.beginPath();
      mapCtx.arc(mx(dots.beacon.x), mz(dots.beacon.z), 5, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Police dots.
    mapCtx.fillStyle = '#ff4444';
    for (const p of dots.police || []) {
      mapCtx.beginPath();
      mapCtx.arc(mx(p.x), mz(p.z), 3, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Player arrow.
    const px = mx(state.player.x);
    const pz = mz(state.player.z);
    mapCtx.save();
    mapCtx.translate(px, pz);
    mapCtx.rotate(-state.player.heading);
    mapCtx.fillStyle = '#ffe14d';
    mapCtx.beginPath();
    mapCtx.moveTo(6, 0);
    mapCtx.lineTo(-4, -4);
    mapCtx.lineTo(-4, 4);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  return {
    update(state, view) {
      const job = JOBS[state.jobIndex];
      if (job) {
        jobName.textContent = `JOB ${job.id}/8 — ${job.name}`;
        jobObj.textContent = job.blurb;
        jobPay.textContent = `PAYOUT $${job.payout} · ${job.act} · ${job.place}`;
        jobBar.style.width = `${Math.round((state.jobProgress || 0) * 100)}%`;
      }
      // Wanted stars.
      let starHtml = '';
      for (let i = 0; i < 5; i += 1) {
        starHtml += `<span class="star ${i < state.wanted ? 'lit' : ''}">★</span>`;
      }
      stars.innerHTML = starHtml;
      const hours = Math.floor(state.time);
      const mins = Math.floor((state.time - hours) * 60);
      money.textContent = `$${state.money.toLocaleString('en-US')}`;
      clock.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} · ${state.day}`;
      radio.textContent = `${RADIO[state.radioIndex].station} — ${RADIO[state.radioIndex].song}`;
      // Dispatch rows.
      if (view.dispatch && view.dispatch.length > 0) {
        dispatch.innerHTML = `<div class="dispatch-head">VSPD DISPATCH — POLICE</div>` + view.dispatch.map((d) => (
          `<div class="dispatch-row"><span>${d.name}</span><span>${d.dist}m</span><span>${d.tactic}</span></div>`
        )).join('');
      } else {
        dispatch.innerHTML = '<div class="dispatch-head">VSPD DISPATCH — POLICE</div><div class="dispatch-row"><span>VSPD</span><span>—</span><span>ALL QUIET</span></div>';
      }
      healthBar.style.width = `${Math.max(0, state.health)}%`;
      healthText.textContent = `HEALTH ${Math.round(state.health)}`;
      armorBar.style.width = `${Math.max(0, state.armor)}%`;
      armorText.textContent = `ARMOR ${Math.round(state.armor)}`;
      const rIdx = rankIndex(state.respect);
      rankName.textContent = `${RANKS[rIdx]} — ${Math.round((state.respect / RANK_THRESHOLDS[Math.min(rIdx + 1, RANKS.length - 1)]) * 100)}%`;
      rankBar.style.width = `${Math.min(100, (state.respect / RANK_THRESHOLDS[Math.min(rIdx + 1, RANKS.length - 1)]) * 100)}%`;
      for (const rank of RANKS) {
        ladderSlots[rank].classList.toggle('active', RANKS.indexOf(rank) <= rIdx);
      }
      // Crew abilities with cooldowns.
      for (const c of CREW) {
        const cd = state.crewCooldown[c.key] || 0;
        crewSlots[c.key].innerHTML = `<b>${c.key} ${c.name} — ${c.ability}</b><span>${cd > 0 ? `READY IN ${Math.ceil(cd)}s` : c.desc}</span>`;
        crewSlots[c.key].classList.toggle('ready', cd <= 0);
      }
      // Weapons.
      for (const w of WEAPONS) {
        const ammo = w.ammo === Infinity ? '∞' : (state.ammo[w.slot] ?? 0);
        weaponSlots[w.slot].innerHTML = `<b>${w.slot}</b> ${w.name} ${ammo}`;
        weaponSlots[w.slot].classList.toggle('active', state.weaponSlot === w.slot);
      }
      dialogue.textContent = state.dialogue || '';
      dialogue.style.opacity = state.dialogueTimer > 0 ? '1' : '0';
      message.textContent = state.message || '';
      message.style.opacity = state.messageTimer > 0 ? '1' : '0';
      if (view.vehicleName) {
        vehicle.textContent = `${view.vehicleName} · CONDITION ${Math.round(view.condition)}%${view.nitro ? ' · NITRO' : ' · NO NITRO'}`;
        speed.textContent = `${Math.round(Math.abs(view.speedKmh))} km/h`;
      } else {
        vehicle.textContent = 'ON FOOT — ROOK';
        speed.textContent = '0 km/h';
      }
      drawMinimap(state, view);
    },
    showScreen(name) {
      for (const id of ['screen-title', 'screen-pause', 'screen-busted', 'screen-garage']) {
        const node = document.getElementById(id);
        if (node) node.style.display = id === `screen-${name}` ? 'flex' : 'none';
      }
      const hud = document.getElementById('hud');
      if (hud) hud.style.display = name === 'play' ? 'block' : 'none';
    },
  };
}
