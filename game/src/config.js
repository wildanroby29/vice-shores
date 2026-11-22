// Every tuning number, colour and story fact in one place. Vice Shores is a
// sun-soaked coastal city: a street grid west of a wide beachfront boulevard,
// the beach and the ocean east of it, a pier and a marina in the south-east.
// X runs west(-) to east(+), Z runs north(-) to south(+). Roads are 12 wide,
// blocks are 40 across, so the road centrelines sit on multiples of 52.
export const STEP = 1 / 60;
export const CITY = { half: 182, road: 12, block: 40, pitch: 52 };
export const BOULEVARD_X = 156;      // beachfront boulevard centreline
export const BEACH_X = 178;          // sand starts here
export const OCEAN_X = 196;          // water starts here
export const PIER_Z = 120;           // pier runs east from the boulevard
export const GARAGE = { x: 104, z: 104, name: 'Dockside Customs' };
export const SAFEHOUSE = { x: -104, z: -104, name: "Rook's Loft" };

export const PALETTE = {
  sun: 0xffd9a0, sunSky: 0xffe9c4, skyTop: 0x7fb8e8, skyHorizon: 0xffc98a,
  ocean: 0x1e9fc4, sand: 0xf2d8a0, asphalt: 0x3a3f4a, sidewalk: 0xc9bda6,
  building: [0xf5e6c8, 0xe8a56b, 0x7fc4b8, 0xe87a5d, 0xf2c94c, 0x9db8d6, 0xd98a7a, 0x8fc7a3],
  neon: [0xff4d6d, 0x2ee6c8, 0xffc93c, 0x7a5cff, 0xff8a3d],
  playerJacket: 0xd7263d, policeWhite: 0xf2f2f2, policeBlue: 0x1d4ed8,
  taxiYellow: 0xf7c948, sportsOrange: 0xff6b1a, heliWhite: 0xf5f5f0, heliRed: 0xc22730,
};

export const JOBS = [
  { id: 1, name: 'FIRST GEAR', act: 'ACT I — THE NEW DRIVER', place: 'Kumala Strand', pay: 250,
    goal: 'Drive to the pier and collect the package', line: 'New in town, Rook? One package, one pier. Do not make me regret this.' },
  { id: 2, name: 'PACKAGE RUN', act: 'ACT I — THE NEW DRIVER', place: 'Palm Row', pay: 350,
    goal: 'Steal the Sunline Cab and deliver it to Palm Row', line: 'That cab on Palm Row is yours, Rook. Take it — the driver already knows the drill.' },
  { id: 3, name: 'LOSE THE HEAT', act: 'ACT I — THE NEW DRIVER', place: 'Neon Row', pay: 400,
    goal: 'Lose a 3-star wanted level', line: 'Three stars, Rook. Shake them off and meet me at Neon Row.' },
  { id: 4, name: 'CASH DROP', act: 'ACT II — MARKET SQUEEZE', place: 'Kumala Strand', pay: 600,
    goal: 'Pick up the cash at the market and bring it to the safehouse', line: 'The market stall has an envelope with your name on it. Bring it home.' },
  { id: 5, name: 'TIMED RACE', act: 'ACT II — MARKET SQUEEZE', place: 'Sunset Boulevard', pay: 800,
    goal: 'Reach the marina in 90 seconds', line: 'Ninety seconds to the marina, Rook. The GT can do it. Can you?' },
  { id: 6, name: 'REPO JOB', act: 'ACT II — MARKET SQUEEZE', place: 'Dockside Customs', pay: 900,
    goal: 'Deliver the GT to Dockside Customs', line: 'Take the GT to the shop. It needs a new coat before the buyer sees it.' },
  { id: 7, name: 'HEAT WAVE', act: 'ACT II — MARKET SQUEEZE', place: 'Sunset Boulevard', pay: 1200,
    goal: 'Survive 60 seconds at 4 stars or more', line: 'Five stars, Rook — and the whole city is watching the boulevard. Do not slow down.' },
  { id: 8, name: 'THE SHORE BANK', act: 'ACT III — THE BIG ONE', place: 'Shore Bank', pay: 1500,
    goal: 'Hit the Shore Bank vault and escape to the pier', line: 'The vault, Rook. One job, one vault, and we never work again. Go.' },
];

export const CREW = [
  { key: 'Q', name: 'MIRA', ability: 'SWAP PLATES', desc: 'Lose 1 wanted star' },
  { key: 'C', name: 'JAI', ability: 'QUICK FIX', desc: 'Repair the car +35%' },
  { key: 'V', name: 'KIRI', ability: 'EYES OUT', desc: 'Police lose you for 20s' },
];

export const RANKS = ['NOBODY', 'HUSTLER', 'WHEELMAN', 'FIXER', 'BOSS'];
export const RANK_RP = [0, 600, 1800, 3600, 6500];

export const RADIO = [
  { station: 'SHORE FM 98.6', song: 'Neon Tide — Palm Static' },
  { station: 'VICE WAVE 101.2', song: 'Sunset Drive — The Palms' },
  { station: 'BOULEVARD 88.4', song: 'Golden Hour — Marla Ray' },
];

export const WEAPONS = [
  { name: 'FISTS', ammo: Infinity, max: Infinity },
  { name: 'P9 PISTOL', ammo: 36, max: 60 },
  { name: 'SMG', ammo: 90, max: 120 },
  { name: 'SHOTGUN', ammo: 12, max: 24 },
];

export const SAVE_KEY = 'vice-shores.save.v1';

// One shared mutable state object; every module imports it.
export const S = {
  mode: 'title',            // title | play | garage | paused | busted
  time: 18 * 3600 + 23 * 60, // seconds since midnight (18:23)
  clock: 0,                 // seconds the game has run
  money: 500,
  respect: 0,
  jobIndex: 0,              // 0-based, JOBS[jobIndex] is current
  jobDone: false,
  jobTimer: 0,
  heatTimer: 0,
  wanted: 0,
  wantedHeat: 0,            // 0..1, builds while committing crimes
  health: 100,
  armor: 60,
  weapon: 1,
  busted: false,
  muted: false,
  inCar: false,
  car: null,                // the player's car (vehicles.js object)
  player: null,             // the player person (people.js object)
  traffic: [],
  peds: [],
  police: [],
  heli: null,
  roadblocks: [],
  marker: null,             // {x, z, label} current mission target
  dialogue: '',
  dialogueTimer: 0,
  shot: null,               // 'chase' | 'onfoot' | 'title' | 'garage' | null
  ready: false,
};

export function rankFor(rp) {
  let r = 0;
  for (let i = 0; i < RANK_RP.length; i += 1) if (rp >= RANK_RP[i]) r = i;
  return r;
}
