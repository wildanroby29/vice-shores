// Vice Shores — every tuning number, colour and mission in one place.
// The city is a ~420x420 m grid: streets on the axes, beach + ocean to the east
// and south, a pier and marina on the south-east shore. Times are 24 h clock.
export const STEP = 1 / 60;
export const SAVE_KEY = 'vice-shores.saves.v1';
export const BEST_KEY = 'vice-shores.best.v1';

export const WORLD = {
  half: 210, // city extends -210..210 on x and z
  block: 44, // block size
  street: 16, // street width
  beachX: 176, // sand starts here, ocean beyond x=210
  pierZ: 150, // pier runs south from z=150 into the sea
};

// Time-of-day presets used by the screenshot scenes (and the in-game clock).
export const TOD = {
  golden: { hour: 17.5, sun: 0xffb36b, sunI: 2.6, hemiI: 0.95, fog: 0xf2a35e, skyTop: 0x2e4a8f, skyMid: 0xe87a4a, skyBot: 0xffb36b },
  sunset: { hour: 18.8, sun: 0xff8f4d, sunI: 2.2, hemiI: 1.0, fog: 0xe8795a, skyTop: 0x4a5a7a, skyMid: 0xd9553f, skyBot: 0xff9a3d },
  afternoon: { hour: 16.0, sun: 0xffd9a0, sunI: 2.8, hemiI: 0.68, fog: 0xf0c98f, skyTop: 0x4a7fc1, skyMid: 0xf2b06a, skyBot: 0xffd9a0 },
  night: { hour: 20.5, sun: 0xc9d6ea, sunI: 0.55, hemiI: 1.0, fog: 0x26262c, skyTop: 0x2a3450, skyMid: 0x3a4a6a, skyBot: 0x5a3040 },
};

export const PLAYER = { walkSpeed: 6, runSpeed: 10, accel: 26, brake: 42, maxSpeed: 46, turn: 2.1, health: 100, armour: 100 };

export const RANKS = ['NOBODY', 'HUSTLER', 'WHEELMAN', 'FIXER', 'TIDE BOSS'];
export const RANK_AT = [0, 2, 4, 6, 8]; // missions completed needed

export const CREW = [
  { name: 'Marla', role: 'Fixer', ability: 'Hot tip', key: '1' },
  { name: 'Dex', role: 'Driver', ability: 'Ram boost', key: '2' },
  { name: 'Lena', role: 'Lookout', ability: 'Cop radar', key: '3' },
];

export const RADIO = [
  { station: 'VICE FM 98.5', song: 'Sunset Run — The Palms' },
  { station: 'TIDE 101.2', song: 'Golden Hour — Marla Ray' },
  { station: 'SHORE 88.1', song: 'Night Drive — Coastline' },
];

// 8 story jobs for fixer Marla. Each has a target spot in the city and a payoff.
export const MISSIONS = [
  { id: 1, name: 'First Light', short: 'Pick up the package on Coral Row', target: [60, -60], reward: 1200, blurb: 'Marla: "One pickup, no questions. Coral Row, blue awning."' },
  { id: 2, name: 'Heat Wave', short: 'Lose the heat on the boulevard', target: [-60, 60], reward: 1800, blurb: 'Marla: "Cops are on you. Shake them on the boulevard, then come home."' },
  { id: 3, name: 'The Courier', short: 'Deliver the case to the marina', target: [188, 155], reward: 2400, blurb: 'Marla: "Case goes to the marina. Pier gate, sunset. Don\'t open it."' },
  { id: 4, name: 'Night Shift', short: 'Collect from the north garage', target: [-120, -120], reward: 3000, blurb: 'Marla: "North garage, bay 3. Keys are under the mat. Be quick."' },
  { id: 5, name: 'Paper Trail', short: 'Grab the ledger at the bank', target: [-60, -120], reward: 3600, blurb: 'Marla: "The ledger is in the bank vault room. In and out, Rook."' },
  { id: 6, name: 'High Tide', short: 'Meet the boat at the pier', target: [180, 180], reward: 4200, blurb: 'Marla: "Boat\'s at the pier end. Tide waits for nobody."' },
  { id: 7, name: 'The Long Way', short: 'Escort Dex across town', target: [120, -60], reward: 5000, blurb: 'Marla: "Dex needs an escort. Keep him breathing till the east gate."' },
  { id: 8, name: 'Tide Boss', short: 'Take the golden hour job', target: [0, 0], reward: 8000, blurb: 'Marla: "Last one, Rook. The whole city is watching. Make it count."' },
];

export const PALETTE = {
  asphalt: 0x44474d, asphaltLine: 0xd8c25a, sidewalk: 0xb9b4a8, sand: 0xe8cf9a,
  sea: 0x1d6f9a, seaDeep: 0x0f3d5c, grass: 0x4d7a3a,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
