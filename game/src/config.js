// Vice Shores — shared configuration: the city, the story, the jobs, the
// crew, the ranks, the radio and the weapons. One place for all the names
// and numbers so every module agrees about the world.
export const CITY = {
  name: 'VICE SHORES',
  subtitle: 'A SUN-SOAKED CITY OF YOUR OWN',
  tagline: 'EIGHT JOBS · FIVE STARS · ONE GOLDEN HOUR',
  // Street grid: blocks 34 wide, streets 12 wide, 5 x 5 blocks.
  block: 34, street: 12, blocks: 5,
  // The beachfront boulevard runs along z at this x; the ocean is west of it.
  boulevardX: -46, oceanX: -62,
  // Dockside Customs workshop (garage) plot.
  garage: { x: 18, z: 88, w: 26, d: 20 },
  // Safehouse / respawn.
  safehouse: { x: -30, z: 60 },
  // Pier head and marina.
  pier: { x: -52, z: 10, len: 26 },
  marina: { x: -52, z: -38 },
};

export const JOBS = [
  { id: 1, name: 'FIRST GEAR', act: 'ACT I — THE NEW DRIVER', target: 'Drive to the pier and collect the package', payout: 250, place: 'Kumala Strand', say: 'New in town, Rook? One package, one pier. Do not make me regret this.' },
  { id: 2, name: 'PACKAGE RUN', act: 'ACT I — THE NEW DRIVER', target: 'Steal the Sunline Cab and deliver it to Palm Row', payout: 350, place: 'Palm Row', say: 'That cab on Palm Row is yours, Rook. Take it — the driver already knows the drill.' },
  { id: 3, name: 'NEON RUN', act: 'ACT I — THE NEW DRIVER', target: 'Lose the cops, then meet Mira at Neon Row', payout: 500, place: 'Neon Row', say: 'Neon Row, midnight. Bring the car, not the cops.' },
  { id: 4, name: 'MARKET SQUEEZE', act: 'ACT II — THE FIXER\'S FAVOUR', target: 'Collect three drops around the market', payout: 650, place: 'Kumala Strand', say: 'Three drops, one market. Quick hands, quiet feet.' },
  { id: 5, name: 'GOLD PAINT', act: 'ACT II — THE FIXER\'S FAVOUR', target: 'Respray the GT sunrise orange at Dockside', payout: 700, place: 'Dockside Customs', say: 'Gold paint, Rook. Make it shine like the sunset owes us money.' },
  { id: 6, name: 'HIGH TIDE', act: 'ACT II — THE FIXER\'S FAVOUR', target: 'Outrun the VSPD convoy along the boulevard', payout: 900, place: 'Sunset Boulevard', say: 'High tide, Rook. The whole city is watching the boulevard.' },
  { id: 7, name: 'HEAT WAVE', act: 'ACT II — THE FIXER\'S FAVOUR', target: 'Survive 60 seconds at 4 stars or more', payout: 1200, place: 'Sunset Boulevard', say: 'Five stars, Rook — and the whole city is watching the boulevard. Do not slow down.' },
  { id: 8, name: 'KING OF THE SHORE', act: 'ACT III — KING OF THE SHORE', target: 'Reach the pier, lose every tail, claim the crown', payout: 1500, place: 'Kumala Strand', say: 'One last run, Rook. Take the crown and the shore is ours.' },
];

export const CREW = [
  { key: 'Q', name: 'MIRA', ability: 'SWAP PLATES', desc: 'Lose 1 wanted star', cooldown: 45 },
  { key: 'C', name: 'JAI', ability: 'QUICK FIX', desc: 'Repair the car +35%', cooldown: 60 },
  { key: 'V', name: 'KIRI', ability: 'EYES OUT', desc: 'Police lose you for 20s', cooldown: 75 },
];

export const RANKS = ['NOBODY', 'HUSTLER', 'WHEELMAN', 'FIXER', 'BOSS'];
export function rankFor(respect) {
  if (respect >= 90) return 'BOSS';
  if (respect >= 65) return 'FIXER';
  if (respect >= 40) return 'WHEELMAN';
  if (respect >= 15) return 'HUSTLER';
  return 'NOBODY';
}

export const RADIO = [
  { station: 'SHORE FM 98.6', song: 'Neon Tide — Palm Static' },
  { station: 'SHORE FM 98.6', song: 'Sunset Drive — Golden Hour' },
  { station: 'TIDE FM 101.2', song: 'Marla\'s Theme — Fixer Blues' },
  { station: 'TIDE FM 101.2', song: 'Boulevard Nights — Chrome' },
];

export const WEAPONS = [
  { slot: 1, name: 'FISTS', ammo: Infinity },
  { slot: 2, name: 'P9 PISTOL', ammo: 36 },
  { slot: 3, name: 'SMG', ammo: 90 },
  { slot: 4, name: 'SHOTGUN', ammo: 12 },
];

export const GARAGE_PRICES = [
  { name: 'Full repair — back to 100%', price: 250 },
  { name: 'Respray — sunrise orange airbrush', price: 150 },
  { name: 'Armour plating +40', price: 400 },
  { name: 'Ammo — pistol + SMG refill', price: 180 },
  { name: 'Nitro tune — faster top speed', price: 600 },
];

// The player car: the orange Rukun Pelo GT.
export const PLAYER_CAR = { name: 'RUKUN PELO GT', color: 0xf25c05, topSpeed: 46, accel: 22 };
export const TAXI = { name: 'SUNLINE CAB', color: 0xffd21f };

export function freshState() {
  return {
    money: 500, respect: 0, wanted: 0, health: 100, armor: 60,
    jobIndex: 0, jobDone: 0, clockMin: 18 * 60 + 23, day: 'SUNDAY',
    onFoot: true, speedKmh: 0, carCondition: 97, nitro: false,
    weaponSlot: 1, ammo: { 2: 36, 3: 90, 4: 12 },
    crewCooldown: { Q: 0, C: 0, V: 0 },
    radioIndex: 0, busted: false, paused: false, inGarage: false,
    saveSlots: [
      { act: 'ACT II — MARKET SQUEEZE', pct: 32.8, missions: '3/6', place: 'Kumala Strand', money: 12650, time: '18:23', rank: 'WHEELMAN' },
      { act: 'ACT I — NEON RUN', pct: 18.5, missions: '2/6', place: 'Neon Row', money: 4380, time: '09:41', rank: 'HUSTLER' },
      null,
    ],
  };
}
