// Every tuning number, name and colour for Vice Shores in one place. The city is a
// hand-laid grid: a wide beachfront boulevard runs north-south along the ocean on the
// west edge, and the street grid fills the land to its east. Units are metres.

export const STEP = 1 / 60;
export const WORLD = {
  // The boulevard's centre line and width; the ocean starts west of it.
  boulevardX: -52,
  boulevardHalf: 11,
  oceanX: -86,
  beachX: -72,
  // The city's street grid: roads run at these x and z lines, blocks between them.
  roadXs: [-36, 0, 36, 72, 108],
  roadZs: [-72, -36, 0, 36, 72, 108],
  roadHalf: 5,
  // Playable bounds.
  minX: -84,
  maxX: 132,
  minZ: -92,
  maxZ: 128,
  // The workshop (Dockside Customs) sits at the south end of the boulevard.
  garage: { x: -52, z: 96, heading: Math.PI },
  // The safehouse (respawn point) on Palm Row.
  safehouse: { x: 18, z: 18 },
};

export const PLAYER = {
  walkSpeed: 7,
  sprintSpeed: 11,
  radius: 0.55,
  height: 1.8,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 46,
  maxReverse: 12,
  steer: 1.9,
  grip: 6.5,
};

// Rook's story: eight numbered jobs for the fixer Marla, from first errand to the
// final heat. Each job names its target place and pays on completion.
export const JOBS = [
  { id: 1, name: 'FIRST GEAR', act: 'ACT I — THE NEW DRIVER', place: 'Kumala Strand', payout: 250, kind: 'drive', target: { x: -52, z: -60 }, blurb: 'Drive to the pier and collect the package.', line: 'New in town, Rook? One package, one pier. Do not make me regret this.' },
  { id: 2, name: 'PACKAGE RUN', act: 'ACT I — THE NEW DRIVER', place: 'Palm Row', payout: 350, kind: 'steal', target: { x: 0, z: 36 }, blurb: 'Steal the Sunline Cab and deliver it to Palm Row.', line: 'That cab on Palm Row is yours, Rook. Take it — the driver already knows the drill.' },
  { id: 3, name: 'NEON RUN', act: 'ACT I — THE NEW DRIVER', place: 'Neon Row', payout: 500, kind: 'drive', target: { x: 72, z: -36 }, blurb: 'Outrun the patrols and drop the goods on Neon Row.', line: 'Neon Row is watching. Drive like the whole street is yours — because tonight it is.' },
  { id: 4, name: 'MARKET SQUEEZE', act: 'ACT II — MARKET SQUEEZE', place: 'Kumala Strand', payout: 650, kind: 'collect', target: { x: -52, z: 0 }, blurb: 'Collect three drops along the boulevard, then vanish.', line: 'Three drops, one boulevard, no witnesses. You are the ghost, Rook.' },
  { id: 5, name: 'GOLD PAINT', act: 'ACT II — MARKET SQUEEZE', place: 'Dockside Customs', payout: 800, kind: 'garage', target: { x: -52, z: 96 }, blurb: 'Get the GT resprayed sunrise orange at the workshop.', line: 'A sunrise paint job buys you a new face. Park it inside, keep the doors shut.' },
  { id: 6, name: 'PIER PRESSURE', act: 'ACT II — MARKET SQUEEZE', place: 'The Pier', payout: 1000, kind: 'drive', target: { x: -66, z: -72 }, blurb: 'Meet the boat at the pier and bring the cargo home.', line: 'The boat does not wait, Rook. Neither do I. Bring it home.' },
  { id: 7, name: 'HEAT WAVE', act: 'ACT II — MARKET SQUEEZE', place: 'Sunset Boulevard', payout: 1200, kind: 'survive', target: { x: -52, z: 36 }, blurb: 'Survive 60 seconds at 4 stars or more.', line: 'Five stars, Rook — and the whole city is watching the boulevard. Do not slow down.' },
  { id: 8, name: 'KING OF THE SHORE', act: 'ACT III — KING OF THE SHORE', place: 'Vice Shores', payout: 1500, kind: 'drive', target: { x: 108, z: 108 }, blurb: 'One last run across the whole city. Own it.', line: 'Last run, Rook. From the pier to the far corner — make the city remember your name.' },
];

// The crew: three named allies with one ability each, on cooldown.
export const CREW = [
  { key: 'Q', name: 'MIRA', ability: 'SWAP PLATES', desc: 'Lose 1 wanted star', cooldown: 45 },
  { key: 'C', name: 'JAI', ability: 'QUICK FIX', desc: 'Repair the car +35%', cooldown: 40 },
  { key: 'V', name: 'KIRI', ability: 'EYES OUT', desc: 'Police lose you for 20s', cooldown: 60 },
];

export const RANKS = ['NOBODY', 'HUSTLER', 'WHEELMAN', 'FIXER', 'BOSS'];
export const RANK_THRESHOLDS = [0, 800, 2400, 5200, 9000];

export const WEAPONS = [
  { slot: 1, name: 'FISTS', ammo: Infinity, damage: 25 },
  { slot: 2, name: 'P9 PISTOL', ammo: 36, damage: 34 },
  { slot: 3, name: 'SMG', ammo: 90, damage: 18 },
  { slot: 4, name: 'SHOTGUN', ammo: 12, damage: 70 },
];

export const RADIO = [
  { station: 'SHORE FM 98.6', song: 'Neon Tide — Palm Static' },
  { station: 'VICE WAVE 101.2', song: 'Golden Hour — The Sunliners' },
  { station: 'BOULEVARD 87.9', song: 'Heat Haze — Marla & the Fixers' },
];

export const PALETTE = {
  skyTop: 0x2e6fb0,
  skyHorizon: 0xffc46b,
  sun: 0xffd98a,
  fog: 0xffd9a0,
  ocean: 0x1f8fb8,
  beach: 0xe8cf9a,
  asphalt: 0x3a3f47,
  sidewalk: 0x9a938a,
  grass: 0x5da24a,
};

export const SAVE_KEY = 'vice-shores.save.v1';

// One shared mutable game state object, built by main.js and read by every module.
export function createState() {
  return {
    time: 18.38, // 18:23 on the in-game clock
    day: 'SUNDAY',
    money: 500,
    respect: 0,
    wanted: 0,
    wantedHeat: 0,
    health: 100,
    armor: 60,
    jobIndex: 0,
    jobDone: [false, false, false, false, false, false, false, false],
    jobProgress: 0,
    jobTimer: 0,
    weaponSlot: 1,
    ammo: { 2: 36, 3: 90, 4: 12 },
    radioIndex: 0,
    screen: 'title', // title | play | pause | busted | garage
    paused: false,
    busted: false,
    bustedTimer: 0,
    garageOpen: false,
    dialogue: '',
    dialogueTimer: 0,
    message: '',
    messageTimer: 0,
    crewCooldown: { Q: 0, C: 0, V: 0 },
    eyesOutTimer: 0,
    stats: { carsStolen: 0, distance: 0, shotsFired: 0 },
    player: { x: 18, z: 18, heading: 0, speed: 0, inCar: null, onFoot: true },
    cameraMode: 0,
    saveSlots: [
      { act: 'ACT II — MARKET SQUEEZE', job: 'MARKET SQUEEZE', pct: 32.8, done: 3, total: 6, place: 'Kumala Strand', money: 12650, time: '18:23', rank: 'WHEELMAN' },
      { act: 'ACT I — NEON RUN', job: 'NEON RUN', pct: 18.5, done: 2, total: 6, place: 'Neon Row', money: 4380, time: '09:41', rank: 'HUSTLER' },
      null,
    ],
  };
}
