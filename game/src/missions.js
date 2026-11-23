// missions.js — the 8 story jobs for fixer Marla, the respect ladder, crew
// abilities, radio stations and the dialogue lines. Fixer name is Marla
// everywhere. A mission completes when the hero reaches its marker.
import { MISSIONS, RANKS, RANK_AT, CREW, RADIO } from './config.js';

export function createMissions() {
  let index = 0;
  let completed = 0;
  let money = 2650;
  let radioIndex = 0;
  let activeWeapon = 0; // 0 fists, 1 pistol, 2 SMG
  const weapons = [
    { name: 'Fists', ammo: Infinity },
    { name: 'Pistol', ammo: 48 },
    { name: 'SMG', ammo: 120 },
  ];

  function current() { return MISSIONS[index]; }
  function rank() {
    let r = 0;
    for (let i = 0; i < RANK_AT.length; i += 1) if (completed >= RANK_AT[i]) r = i;
    return RANKS[r];
  }
  function progress() { return `${Math.min(completed + 1, 8)}/8`; }
  function complete() {
    const m = MISSIONS[index];
    money += m.reward;
    completed += 1;
    const done = index >= MISSIONS.length - 1;
    if (!done) index += 1;
    return { reward: m.reward, done, next: done ? null : MISSIONS[index] };
  }
  function setMission(i) { index = Math.max(0, Math.min(MISSIONS.length - 1, i)); }
  function cycleRadio() { radioIndex = (radioIndex + 1) % RADIO.length; return RADIO[radioIndex]; }
  function radio() { return RADIO[radioIndex]; }
  function weapon() { return weapons[activeWeapon]; }
  function cycleWeapon() { activeWeapon = (activeWeapon + 1) % weapons.length; return weapons[activeWeapon]; }
  function crew() { return CREW; }

  return { current, rank, progress, complete, setMission, cycleRadio, radio, weapon, cycleWeapon, crew,
    get money() { return money; }, set money(v) { money = v; },
    get completed() { return completed; }, get index() { return index; } };
}
