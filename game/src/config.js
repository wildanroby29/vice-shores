export const STEP = 1 / 60;
export const SAVE_KEY = 'vice-shores.saves.v1';
export const BEST_KEY = 'vice-shores.best.v1';

export const WORLD = {
  half: 210,
  block: 44,
  street: 16,
  beachX: 176,
  pierX: 185,
  pierZ: 150,
};

export const DAYTIME = {
  golden: {
    hour: 17.5, sun: 0xffb36b, sunStrength: 2.6, hemiStrength: 0.95,
    fog: 0xffb36b, top: 0x2e4a8f, mid: 0xea8a5e, bot: 0xeacb83, exposure: 0.94,
  },
  sunset: {
    hour: 18.8, sun: 0xff8f4d, sunStrength: 2.2, hemiStrength: 1.0,
    fog: 0xe8795a, top: 0x4a5a7a, mid: 0xdd6f52, bot: 0xe39568, exposure: 0.94,
  },
  afternoon: {
    hour: 16.0, sun: 0xffd9a0, sunStrength: 2.8, hemiStrength: 0.68,
    fog: 0xf0c98f, top: 0x4a7fc1, mid: 0xf2b06a, bot: 0xffd9a0,
  },
  night: {
    hour: 20.5, sun: 0xc9d6ea, sunStrength: 0.55, hemiStrength: 1.0,
    fog: 0x26262c, top: 0x2a3450, mid: 0x3a4a6a, bot: 0x5a3040,
  },
};

export const PLAYER = {
  walk: 6,
  run: 10,
  accel: 26,
  brake: 42,
  topSpeed: 46,
  turn: 2.1,
  health: 100,
  armour: 100,
};

export const RANKS = [
  { at: 0, name: 'NOBODY' },
  { at: 2, name: 'HUSTLER' },
  { at: 4, name: 'WHEELMAN' },
  { at: 6, name: 'FIXER' },
  { at: 8, name: 'TIDE BOSS' },
];

export const CREW = [
  { key: '1', name: 'Marla', role: 'Fixer', perk: 'Hot tip' },
  { key: '2', name: 'Dex', role: 'Driver', perk: 'Ram boost' },
  { key: '3', name: 'Lena', role: 'Lookout', perk: 'Cop radar' },
];

export const STATIONS = [
  { name: 'VICE FM 98.5', song: 'Sunset Run — The Palms' },
  { name: 'TIDE 101.2', song: 'Golden Hour — Marla Ray' },
  { name: 'SHORE 88.1', song: 'Night Drive — Coastline' },
];

export const JOBS = [
  {
    id: 1, name: 'First Light', goal: 'Pick up the package on Coral Row',
    target: [60, -60], reward: 1200,
    blurb: 'Marla: "One pickup, no questions. Coral Row, blue awning."',
  },
  {
    id: 2, name: 'Heat Wave', goal: 'Lose the heat on the boulevard',
    target: [-60, 60], reward: 1800,
    blurb: 'Marla: "Cops are on you. Shake them on the boulevard, then come home."',
  },
  {
    id: 3, name: 'The Courier', goal: 'Deliver the case to the marina',
    target: [188, 155], reward: 2400,
    blurb: 'Marla: "Case goes to the marina. Pier gate, sunset. Don\'t open it."',
  },
  {
    id: 4, name: 'Night Shift', goal: 'Collect from the north garage',
    target: [-120, -120], reward: 3000,
    blurb: 'Marla: "North garage, bay 3. Keys are under the mat. Be quick."',
  },
  {
    id: 5, name: 'Paper Trail', goal: 'Grab the ledger at the bank',
    target: [-60, -120], reward: 3600,
    blurb: 'Marla: "The ledger is in the bank vault room. In and out, Rook."',
  },
  {
    id: 6, name: 'High Tide', goal: 'Meet the boat at the pier',
    target: [180, 180], reward: 4200,
    blurb: 'Marla: "Boat\'s at the pier end. Tide waits for nobody."',
  },
  {
    id: 7, name: 'The Long Way', goal: 'Escort Dex across town',
    target: [120, -60], reward: 5000,
    blurb: 'Marla: "Dex needs an escort. Keep him breathing till the east gate."',
  },
  {
    id: 8, name: 'Tide Boss', goal: 'Take the golden hour job',
    target: [0, 0], reward: 8000,
    blurb: 'Marla: "Last one, Rook. The whole city is watching. Make it count."',
  },
];

export const PAINT = {
  asphalt: 0x44474d,
  lane: 0xd8c25a,
  sidewalk: 0xb9b4a8,
  sand: 0xe8cf9a,
  sea: 0x1568b8,
  seaDeep: 0x0d3a6e,
  grass: 0x4d7a3a,
};

export const DISTRICTS = [
  { name: 'CORAL ROW', colour: '#c23a5a', pct: 62, note: 'Shops & awning' },
  { name: 'MARINA', colour: '#2e6ac2', pct: 45, note: 'Pier & boats' },
  { name: 'BANK DISTRICT', colour: '#e8b83a', pct: 38, note: 'The ledger' },
  { name: 'NORTH GARAGE', colour: '#3a9a5a', pct: 71, note: 'Bay 3' },
  { name: 'PLAZA', colour: '#9a5ae8', pct: 54, note: 'Night market' },
  { name: 'PIER', colour: '#e87a3a', pct: 29, note: 'The boat' },
];

export const ABILITIES = [
  { name: 'Swap Plates', role: 'Lose a star', crew: 'Marla' },
  { name: 'Quick Fix', role: 'Repair the car', crew: 'Dex' },
  { name: 'Eyes Out', role: 'Cop radar', crew: 'Lena' },
];

export const RADIO_LINES = [
  'All units, keep the boulevard clear. Nothing to see here.',
  'Unit 7, check the marina gate. Suspect was last seen on foot.',
  'All units, suspect is on foot near the market. KITE-1, take the high ground.',
  'All units, suspect is armed and mobile. MARLIN-3, shore watch. CORAL-48, ram on my mark.',
  'All units, four-star chase on the boulevard. TIDE-7, spotlight. REEF-22, flank him.',
  'All units, this is a five-star chase. Do not let him reach the pier.',
];

export const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';
