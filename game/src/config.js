// Vice Shores — every tuning number and colour in one place.
// The world is 2560x1920 of city: a street grid, beach and water on the
// south edge, a river and a bridge on the east edge. The camera shows a
// window-sized slice of it and follows the player.

export const WORLD = { width: 2560, height: 1920 };
export const STEP = 1 / 60;
export const VIEW_MINIMAP = { width: 208, height: 156 };

/** Street centrelines (the grid the whole city is built on). */
export const STREETS_X = [320, 800, 1280, 1760, 2240];
export const STREETS_Y = [320, 800, 1280, 1600];
export const ROAD_HALF = 52; // half the road width, kerb to kerb
export const BEACH_Y = 1760; // south of here is sand, then water
export const WATER_Y = 1864;
export const RIVER_X = 2400; // east of here is river, crossed by one bridge
export const BRIDGE_Y = 800; // the street that carries the bridge

export const PLAYER = {
  radius: 11,
  walkSpeed: 185,
  sprintSpeed: 295,
  health: 100,
  punchRange: 34,
};

export const CAR = {
  length: 46,
  width: 24,
  radius: 19, // collision circle, centre of the car
  accel: 330,
  brake: 520,
  reverseMax: 150,
  maxSpeed: 430,
  policeMaxSpeed: 400, // a touch slower than the player's car: a good driver can outrun them
  turnRate: 2.7, // radians per second at full lock and full speed
  drag: 0.55, // per-second speed loss factor
  health: 100,
  ramDamage: 22,
};

export const TRAFFIC_COUNT = 10;
export const PED_COUNT = 26;
export const POLICE_MAX = 3;

export const WANTED = {
  max: 3,
  // Seconds a cop must be unable to see the player before stars start to fall.
  unseenSeconds: 10,
  decayEverySeconds: 6,
  sightRange: 620,
};

export const MISSIONS = [
  {
    id: 1,
    name: 'First Job',
    giver: 'Marla',
    text: 'Drive the blue coupe to the drop-off on Coral Row.',
    payout: 250,
    marker: { x: 2240, y: 320 },
  },
  {
    id: 2,
    name: 'Hot Package',
    giver: 'Marla',
    text: 'Grab the package in Palm Park, then deliver it to the pier. The cops will be watching.',
    payout: 400,
    pickup: { x: 1040, y: 1040 },
    marker: { x: 2240, y: 1600 },
  },
  {
    id: 3,
    name: 'Heat',
    giver: 'Marla',
    text: 'Two stars and the whole force is coming. Lose them and get to the safehouse.',
    payout: 600,
    marker: { x: 320, y: 1600 },
  },
];

export const SAFEHOUSE = { x: 320, y: 1600 };
export const PLAYER_START = { x: 800, y: 1280 };

export const PALETTE = {
  water: '#123a5c',
  waterDeep: '#0d2a48',
  sand: '#c9a86a',
  sandDark: '#b3925a',
  grass: '#2e5d3a',
  grassDark: '#274f32',
  asphalt: '#23232e',
  asphaltLine: '#3d3d4d',
  lane: '#d8c95a',
  sidewalk: '#3b3b4a',
  kerb: '#4a4a5c',
  building: ['#4a3a6e', '#3a4a6e', '#6e3a5e', '#2f4a5e', '#5e3a3a', '#3a5e4a'],
  buildingRoof: ['#5d4a86', '#4a5d86', '#864a72', '#3d5d72', '#724a4a', '#4a7260'],
  windowLit: '#ffd76a',
  windowDark: '#1c1c2a',
  neonPink: '#ff4d8d',
  neonCyan: '#37e0d8',
  neonYellow: '#ffd23e',
  player: '#37e0d8',
  playerCar: '#2f7fe0',
  police: '#1c2f6e',
  policeLight: '#ff3b30',
  traffic: ['#c94f4f', '#4fc94f', '#c9a94f', '#8f8f9f', '#c97a3f', '#7a5fc9'],
  ped: ['#e0e0e0', '#f2a541', '#7ab8e0', '#e07a7a', '#a5e07a'],
  hud: '#0e0c18',
  hudText: '#f2f0ff',
  hudMuted: '#9a94b8',
  gold: '#ffd23e',
  red: '#ff4d4d',
  green: '#4dd06a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the save is kept between visits (this browser only). */
export const SAVE_KEY = 'vice-shores.save';
