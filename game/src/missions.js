import { JOBS, RANKS, CREW, STATIONS } from './config.js';

export const WEAPONS = [
  { name: 'Fists', ammo: Infinity, damage: 1 },
  { name: 'Pistol', ammo: 48, damage: 3 },
  { name: 'SMG', ammo: 120, damage: 2 },
  { name: 'Shotgun', ammo: 24, damage: 5 },
];

const COLLECTIBLES = [
  { name: 'Golden Cassette', hint: 'Coral Row rooftop' },
  { name: 'Sunset Postcard', hint: 'Pier end bench' },
  { name: 'Lucky Coin', hint: 'Bank District fountain' },
  { name: 'Marla’s Lighter', hint: 'North Garage bay 3' },
  { name: 'Tide Chart', hint: 'Marina office' },
  { name: 'Palm Keychain', hint: 'Plaza market stall' },
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
    get weapons() {
      return WEAPONS.map((w, i) => ({
        ...w, ammo: ammoLeft[i], active: i === weaponSlot,
      }));
    },
    get radio() {
      return STATIONS[stationSlot];
    },
    progressData() {
      const found = Math.min(COLLECTIBLES.length, done + 1);
      const ratings = JOBS.map((j, i) => ({
        name: j.name,
        rating: i < done ? ['S', 'A', 'A', 'S', 'B', 'A', 'S', 'A'][i] : '—',
      }));
      const xp = done * 1250;
      return {
        collectibles: {
          found,
          total: COLLECTIBLES.length,
          items: COLLECTIBLES.map((c, i) => ({ ...c, found: i < found })),
        },
        missions: ratings,
        career: {
          missionsDone: done,
          missionsTotal: JOBS.length,
          moneyEarned: 2650 + JOBS.slice(0, done).reduce((s, j) => s + j.reward, 0),
          carsStolen: Math.min(3, done),
          escapes: Math.min(2, done),
          bestStars: Math.min(5, 2 + done),
        },
        rankXp: xp,
        rankNextXp: (done + 1) * 1250,
      };
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
