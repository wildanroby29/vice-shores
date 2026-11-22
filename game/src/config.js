// Every tuning number, colour and piece of content in one place, so the rest of
// the game reads its numbers from here instead of hiding them in the logic.
// The look is a BRIGHT golden hour: a low warm sun, a warm orange-to-blue sky,
// saturated paint on everything, a bright blue ocean and a wide beachfront.

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** The city grid. Streets run on an 80-unit pitch; blocks sit between them. */
export const GRID = {
  pitch: 80,
  roadHalf: 7,
  blockHalf: 33,
  half: 320,
  boulevardX: 240,
  beachX: 284,
  oceanX: 336,
  riverZ: -288,
};

/** Bright golden-hour palette. Nothing grey, nothing muted on purpose. */
export const PALETTE = {
  skyTop: '#5fb4f0',
  skyMid: '#ff9e66',
  skyHorizon: '#ffd27d',
  sun: '#fff3c4',
  fog: '#ffd9a8',
  ocean: '#1fa8e0',
  oceanDeep: '#0f7fc4',
  sand: '#f4d9a0',
  road: '#41454f',
  roadLine: '#ffd94d',
  sidewalk: '#cfc3a8',
  ground: '#b9c4a8',
  building: ['#ffd9a0', '#ffb3a7', '#a8d8ff', '#ffe08a', '#c9f2c7', '#f2b8d8', '#ffc46b', '#e8e8e8', '#ffb27d', '#b8e6d5'],
  neon: ['#ff2e88', '#00e5ff', '#ffe600', '#7cff00', '#ff7a00'],
  palmTrunk: '#8a5a2b',
  palmLeaf: '#37b24d',
  palmLeaf2: '#69c24a',
  playerJacket: '#e63329',
};

/** The eight jobs Rook runs for the fixer Marla. */
export const JOBS = [
  {
    id: 'first-wheels', act: 'ACT I', name: 'FIRST WHEELS', payout: 250,
    dialogue: 'Marla: "New in town, Rook? Steal a car and bring it to Coral Row. Don\'t scratch it."',
    stages: [
      { type: 'steal', text: 'Steal any car', target: 'anyCar' },
      { type: 'goto', text: 'Drive to Coral Row', target: 'coralRow' },
    ],
  },
  {
    id: 'package-run', act: 'ACT I', name: 'PACKAGE RUN', payout: 400,
    dialogue: 'Marla: "A package is waiting in Palm Park. The pier, quick — and the cops are already watching."',
    stages: [
      { type: 'goto', text: 'Grab the package in Palm Park', target: 'palmPark' },
      { type: 'goto', text: 'Deliver it to the pier', target: 'pier' },
    ],
  },
  {
    id: 'cash-drop', act: 'ACT I', name: 'CASH DROP', payout: 600,
    dialogue: 'Marla: "Shore Bank left a drop for us. Pick it up, bring it home. Quietly."',
    stages: [
      { type: 'goto', text: 'Pick up the drop at Shore Bank', target: 'bank' },
      { type: 'goto', text: 'Deliver it to the safehouse', target: 'safehouse' },
    ],
  },
  {
    id: 'turbo-boost', act: 'ACT II', name: 'TURBO BOOST', payout: 800,
    dialogue: 'Marla: "Three checkpoints, ninety seconds. Show this city what that engine can do."',
    stages: [
      { type: 'race', text: 'Hit all 3 checkpoints in 90s', target: 'race', seconds: 90 },
    ],
  },
  {
    id: 'repo-job', act: 'ACT II', name: 'REPO JOB', payout: 900,
    dialogue: 'Marla: "A Rukun Pelo GT is parked at Dockside Customs. It\'s ours now. Bring it in."',
    stages: [
      { type: 'goto', text: 'Get the Rukun Pelo GT', target: 'garage' },
      { type: 'goto', text: 'Deliver the GT to Dockside Customs', target: 'garage' },
    ],
  },
  {
    id: 'heat-wave', act: 'ACT II', name: 'HEAT WAVE', payout: 1200,
    dialogue: 'Marla: "Five stars, Rook. Sixty seconds. Make them remember you."',
    stages: [
      { type: 'survive', text: 'Survive 60 seconds at 4 stars or more', target: 'survive', seconds: 60, stars: 4 },
    ],
  },
  {
    id: 'shore-bank-vault', act: 'ACT III', name: 'SHORE BANK VAULT', payout: 1500,
    dialogue: 'Marla: "The vault, Rook. Grab the cash and lose the heat at the safehouse."',
    stages: [
      { type: 'goto', text: 'Grab the vault cash at Shore Bank', target: 'bank' },
      { type: 'goto', text: 'Escape the chase to the safehouse', target: 'safehouse' },
    ],
  },
  {
    id: 'king-of-vice-shores', act: 'ACT III', name: 'KING OF VICE SHORES', payout: 1500,
    dialogue: 'Marla: "Last one. Five stars, sixty seconds, then the pier. Own this city."',
    stages: [
      { type: 'survive', text: 'Survive 60 seconds at 5 stars', target: 'survive', seconds: 60, stars: 5 },
      { type: 'goto', text: 'Reach the pier', target: 'pier' },
    ],
  },
];

/** Respect ladder: name and the RP it starts at. */
export const RANKS = [
  { name: 'NOBODY', rp: 0 },
  { name: 'HUSTLER', rp: 500 },
  { name: 'WHEELMAN', rp: 1500 },
  { name: 'FIXER', rp: 3000 },
  { name: 'BOSS', rp: 5200 },
];

/** The crew and what each of them does for Rook. */
export const CREW = [
  { key: 'Q', name: 'MIRA', ability: 'SWAP PLATES', desc: 'Lose 1 wanted star', cooldown: 45 },
  { key: 'C', name: 'JAI', ability: 'QUICK FIX', desc: 'Repair the car +35%', cooldown: 30 },
  { key: 'V', name: 'KIRI', ability: 'EYES OUT', desc: 'Police lose you for 20s', cooldown: 60 },
];

/** Radio stations and the songs they play. */
export const RADIO = [
  { station: 'SHORE FM 98.6', song: 'Neon Tide — Palm Static' },
  { station: 'VICE FM 101.1', song: 'Sunset Drive — Coral Reef' },
  { station: 'PALM 94.2', song: 'Golden Hour — The Breakers' },
];

/** What Dockside Customs sells. */
export const GARAGE = [
  { id: 'repair', name: 'FULL REPAIR', price: 150, desc: 'Condition back to 100%' },
  { id: 'respray', name: 'RESPRAY', price: 200, desc: 'Fresh paint, any colour' },
  { id: 'armour', name: 'ARMOUR +50', price: 300, desc: 'Plating that eats bullets' },
  { id: 'ammo', name: 'AMMO +24', price: 50, desc: 'A box of rounds' },
  { id: 'nitro', name: 'NITRO KIT', price: 400, desc: 'SHIFT for a boost' },
  { id: 'tires', name: 'GRIP TIRES', price: 250, desc: 'Corner like it is on rails' },
  { id: 'engine', name: 'TUNED ENGINE', price: 600, desc: '+15 km/h top speed' },
  { id: 'tint', name: 'DARK TINT', price: 120, desc: 'Cops see less of you' },
];

/** The four weapon slots. */
export const WEAPONS = [
  { name: 'FISTS', ammo: Infinity, damage: 12, rate: 0.35, range: 2.2, auto: false },
  { name: 'P9 PISTOL', ammo: 36, damage: 22, rate: 0.28, range: 46, auto: false },
  { name: 'SMG', ammo: 90, damage: 13, rate: 0.09, range: 40, auto: true },
  { name: 'SHOTGUN', ammo: 24, damage: 55, rate: 0.8, range: 22, auto: false },
];

/** Where the three save slots live in this browser. */
export const SAVE_KEY = 'vice-shores.saves';

/** Bright car paint, so the traffic reads as colourful, not grey. */
export const CAR_PAINTS = ['#ff5a3c', '#ffb020', '#2ec4ff', '#ff8fd1', '#7be07b', '#c77dff', '#ffdf3c', '#4dd0c4', '#f4f4f4', '#ff9e57'];

/** Pedestrian shirt and trouser colours, varied per person. */
export const SHIRTS = ['#e63329', '#2ec4ff', '#ffb020', '#7be07b', '#ff8fd1', '#c77dff', '#f4f4f4', '#4dd0c4', '#ff9e57', '#3a6fd8'];
export const PANTS = ['#2b2f38', '#3a4a6b', '#5b3a2b', '#274b34', '#6b3a5b', '#37424e'];
export const SKINS = ['#f2c9a0', '#d9a066', '#a9713f', '#8a5a2b', '#f7d7b5'];

/** Neon signs that hang on the buildings. */
export const SIGNS = ['HOTEL', 'CASINO', 'ARCADE', 'PIZZA', 'NEON', 'BAR', 'TACOS', 'SURF', 'MOTEL', 'DISCO'];

/** Street and place names the HUD and the save slots quote. */
export const PLACES = ['Kumala Strand', 'Coral Row', 'Palm Park', 'Dockside Customs', 'Shore Bank', 'Marina Row', 'Sunset Pier', 'Neon Mile'];

/** The font stack for the HUD and the title. */
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
