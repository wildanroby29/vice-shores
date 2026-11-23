// missions.js — the 8 story jobs for fixer Marla, the respect ladder, crew
// abilities, radio stations and the dialogue lines. Fixer name is Marla
// everywhere. A mission completes when the hero reaches its marker.
import { CREW, MISSIONS, RADIO, RANKS, RANK_AT } from './config.js';

export function createMissions() {
  let idx = 0;
  let done = 0;
  let cash = 2650;
  let station = 0;
  let weaponIdx = 0; // 0 fists, 1 pistol, 2 SMG
  const arsenal = [
    { name: 'Fists', ammo: Infinity },
    { name: 'Pistol', ammo: 48 },
    { name: 'SMG', ammo: 120 },
  ];

  function current() {
    return MISSIONS[idx];
  }
  function rank() {
    let r = 0;
    for (let i = 0; i < RANK_AT.length; i += 1) {
      if (done >= RANK_AT[i]) r = i;
    }
    return RANKS[r];
  }
  function progress() {
    return `${Math.min(done + 1, 8)}/8`;
  }
  function complete() {
    const msn = MISSIONS[idx];
    cash += msn.reward;
    done += 1;
    const finished = idx >= MISSIONS.length - 1;
    if (!finished) idx += 1;
    return { reward: msn.reward, done: finished, next: finished ? null : MISSIONS[idx] };
  }
  function setMission(i) {
    idx = Math.max(0, Math.min(MISSIONS.length - 1, i));
  }
  function cycleRadio() {
    station = (station + 1) % RADIO.length;
    return RADIO[station];
  }
  function radio() {
    return RADIO[station];
  }
  function weapon() {
    return arsenal[weaponIdx];
  }
  function cycleWeapon() {
    weaponIdx = (weaponIdx + 1) % arsenal.length;
    return arsenal[weaponIdx];
  }
  function crew() {
    return CREW;
  }

  return {
    current,
    rank,
    progress,
    complete,
    setMission,
    cycleRadio,
    radio,
    weapon,
    cycleWeapon,
    crew,
    get money() {
      return cash;
    },
    set money(v) {
      cash = v;
    },
    get completed() {
      return done;
    },
    get index() {
      return idx;
    },
  };
}
