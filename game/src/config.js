// Vice Shores (3D) — every tuning number, colour, mission, rank and crew line in one
// place. The city is 2560x1920 world units on the XZ plane (x east, z south); the camera
// shows a 1280x800 window of it in third person.

export const VIEW = { width: 1280, height: 800 };
export const CITY = { width: 2560, height: 1920 };

/** Fixed simulation step: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walk: 260,
  sprint: 400,
  health: 100,
  punchRange: 34,
  shootCooldown: 0.24,
  smgCooldown: 0.09,
  bulletSpeed: 950,
  bulletDamage: 34,
  smgDamage: 16,
};

export const CAR = {
  length: 46,
  width: 22,
  radius: 17,
  accel: 430,
  brake: 720,
  reverseMax: 170,
  maxSpeed: 520,
  sportMaxSpeed: 640,
  turn: 2.7,
  drag: 0.55,
  health: 100,
};

export const TRAFFIC = {
  count: 24,
  accel: 210,
  maxSpeed: 240,
};

export const POLICE = {
  accel: 490,
  maxSpeed: 480,
  maxActive: 4,
  respawnDelay: 6,
  ramDamage: 14,
  bustRange: 52,
  bustTime: 1.2,
};

export const HELI = {
  followHeight: 170,
  speed: 260,
  spotlightRange: 320,
};

export const PEDS = { count: 22, walk: 62, run: 175 };

export const WANTED = {
  maxStars: 5,
  decayUnseen: 10,
  decayStep: 4,
  bustFine: 150,
};

export const MISSIONS = [
  { name: 'The Blue Coupe', payout: 250, stages: ['Get in the blue coupe', 'Drive the coupe to Coral Row'] },
  { name: 'Park Pickup', payout: 400, stages: ['Grab the package in Palm Park', 'Deliver it to the pier — the cops are watching'] },
  { name: 'Lose the Heat', payout: 600, stages: ['Lose the cops and reach the safehouse'] },
  { name: 'The Getaway Driver', payout: 500, stages: ['Pick up the client at Hotel Coral', 'Drive to Airport Rd — 60 seconds'] },
  { name: 'Turbo Boost', payout: 700, stages: ['Steal the red sports car from Lot B', 'Bring it to the garage'] },
  { name: 'Payback', payout: 800, stages: ['Wreck 3 police cars — ram them'] },
  { name: 'The Big Score', payout: 1200, stages: ['Reach the bank and crack the vault (hold E)', 'Escape to the safehouse — 3 stars'] },
  { name: 'King of Vice Shores', payout: 1500, stages: ['Reach the pier with 5 stars — survive 60 seconds'] },
];

export const RANKS = ['NOBODY', 'HUSTLER', 'WHEELMAN', 'FIXER', 'BOSS'];
export function rankFor(missionsDone) {
  if (missionsDone >= 7) return 'BOSS';
  if (missionsDone >= 5) return 'FIXER';
  if (missionsDone >= 3) return 'WHEELMAN';
  if (missionsDone >= 1) return 'HUSTLER';
  return 'NOBODY';
}

export const CREW = [
  { name: 'Marla', role: 'Fixer', unlock: 1, ability: "Marla's Word — bribes cost half" },
  { name: 'Dex', role: 'Wheelman', unlock: 3, ability: "Dex's Tune — your car is 15% faster" },
  { name: 'Lena', role: 'Lookout', unlock: 5, ability: "Lena's Eyes — wanted cools off twice as fast" },
];

export const RADIO = [
  { station: 'VICE FM 101.1', song: "'Neon Coast' — The Palms" },
  { station: 'VICE FM 101.1', song: "'Sunset Drive' — Coral Reefers" },
  { station: 'VICE FM 101.1', song: "'Golden Hour' — Marla & the Fixers" },
  { station: 'VICE FM 101.1', song: "'Top Down' — The Boulevards" },
];

export const GARAGE = {
  repair: 150,
  respray: 200,
  armour: 300,
  ammo: 50,
};

export const SAVE_KEY = 'vice-shores.save.v1';
export const SLOT_KEY = (n) => `vice-shores.save.slot${n}`;

export const PALETTE = {
  sky: '#ff9a5c',
  skyTop: '#7b4a8a',
  fog: '#c97a8a',
  ground: '#1a1e2c',
  block: '#232839',
  road: '#2b3040',
  roadLine: '#e8c33a',
  sidewalk: '#3a4157',
  park: '#1d5c2e',
  parkTree: '#2f8a44',
  sand: '#e0b96a',
  water: '#1a6a9a',
  building: '#3a4260',
  buildingRoof: '#2b3247',
  windowLit: '#ffd76a',
  text: '#eef1f5',
  muted: '#9aa3b5',
  gold: '#f2c94c',
  neonPink: '#ff4d8d',
  neonCyan: '#37e0d8',
  neonOrange: '#ff9a3d',
  police: '#e8ecf4',
  policeLightR: '#ff3b30',
  policeLightB: '#2f7bff',
  player: '#37e0d8',
  playerCar: '#2f7bff',
  health: '#4ade80',
  danger: '#ff5a4d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const NEON_SIGNS = ['HOTEL CORAL', 'PIER 9', 'NEON BAR', 'TACOS', '24H MART', 'CINEMA', 'OFFICES', 'LAUNDRY', 'PIZZA', 'ARCADE', 'MOTEL', 'GYM', 'DINER', 'BANK'];
