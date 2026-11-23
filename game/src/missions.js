// Story, progression and equipment for Vice Shores.
//
// Marla's eight jobs are the spine of the game: each one names a place in
// the city and pays out when Rook reaches it. Finishing jobs climbs the
// respect ladder (NOBODY to TIDE BOSS), and the crew, the radio and the
// weapons all live here too, so the HUD and the game loop both read one
// source of truth instead of keeping their own copies.

import { JOBS, RANKS, CREW, STATIONS } from './config.js';

export const WEAPONS = [
  { name: 'Fists', ammo: Infinity, damage: 1 },
  { name: 'Pistol', ammo: 48, damage: 3 },
  { name: 'SMG', ammo: 120, damage: 2 },
];

export function createMissions() {
  let index = 0;
  let done = 0;
  let cash = 2650;
  let weaponSlot = 0;
  let stationSlot = 0;
  const ammoLeft = WEAPONS.map((w) => w.ammo);

  function rankName() {
    let name = RANKS[0].name;
    for (const r of RANKS) if (done >= r.at) name = r.name;
    return name;
  }

  return {
    get current() {
      return JOBS[index];
    },
    get index() {
      return index;
    },
    get completed() {
      return done;
    },
    get money() {
      return cash;
    },
    set money(v) {
      cash = v;
    },
    get rank() {
      return rankName();
    },
    get progress() {
      return `${done}/8`;
    },
    get weapon() {
      return { ...WEAPONS[weaponSlot], ammo: ammoLeft[weaponSlot] };
    },
    get radio() {
      return STATIONS[stationSlot];
    },
    get crew() {
      return CREW;
    },
    setMission(i) {
      index = Math.max(0, Math.min(JOBS.length - 1, i));
    },
    complete() {
      const job = JOBS[index];
      cash += job.reward;
      done += 1;
      const finishedAll = done >= JOBS.length;
      if (!finishedAll) index = Math.min(index + 1, JOBS.length - 1);
      return { job, finishedAll };
    },
    spend(amount) {
      if (cash < amount) return false;
      cash -= amount;
      return true;
    },
    cycleRadio() {
      stationSlot = (stationSlot + 1) % STATIONS.length;
      return STATIONS[stationSlot];
    },
    cycleWeapon() {
      weaponSlot = (weaponSlot + 1) % WEAPONS.length;
      return { ...WEAPONS[weaponSlot], ammo: ammoLeft[weaponSlot] };
    },
    useAmmo() {
      const w = WEAPONS[weaponSlot];
      if (!Number.isFinite(w.ammo)) return true;
      if (ammoLeft[weaponSlot] <= 0) return false;
      ammoLeft[weaponSlot] -= 1;
      return true;
    },
    load(save) {
      if (!save) return;
      if (typeof save.money === 'number') cash = save.money;
      if (typeof save.mission === 'number') index = save.mission;
      if (typeof save.completed === 'number') done = save.completed;
    },
    snapshot() {
      return { money: cash, mission: index, completed: done, rank: rankName() };
    },
  };
}
