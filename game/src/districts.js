// District data: 6 districts, each with a rect, wall palettes, accent and map tint.
export const DISTRICTS = [
  { id: 'north', name: 'NORTH GARAGE', x0: -160, z0: -160, x1: 160, z1: -80, tint: 0x8a6d4b, accent: 0xff9a3d, walls: [0xb8a58e, 0x9c8a76, 0xc2b49a, 0x8f8578, 0xd0c0a0], identity: 'industrial' },
  { id: 'bank', name: 'BANK DISTRICT', x0: -160, z0: -80, x1: -40, z1: 40, tint: 0x4a6a8a, accent: 0x9fd8ff, walls: [0x9fb4c8, 0x7e96b0, 0xb8c8dc, 0x6a86a4, 0xccd8e8], identity: 'glass towers' },
  { id: 'coral', name: 'CORAL ROW', x0: -40, z0: -80, x1: 80, z1: 40, tint: 0xd98a5a, accent: 0xffd166, walls: [0xf2d8b8, 0xe8b48a, 0xd98a5a, 0xc97a6a, 0xf7e6c8], identity: 'shops and awnings' },
  { id: 'plaza', name: 'PLAZA', x0: 80, z0: -80, x1: 160, z1: 40, tint: 0xb05a8a, accent: 0xff5e8a, walls: [0xf2e6c8, 0xd98a5a, 0x5a9aa8, 0xd8a8a8, 0xe8b48a], identity: 'night market' },
  { id: 'marina', name: 'MARINA', x0: -160, z0: 40, x1: 40, z1: 160, tint: 0x2a8a9a, accent: 0x6ad8e8, walls: [0x9fc8c8, 0x7ab8b8, 0xb8d8d8, 0x5a9aa8, 0xd8e8e8], identity: 'boats and cranes' },
  { id: 'pier', name: 'PIER', x0: 40, z0: 40, x1: 160, z1: 160, tint: 0x4a8a6a, accent: 0x8affc8, walls: [0xc8b89a, 0xa89878, 0xd8c8a8, 0x8aa888, 0xe8d8b8], identity: 'boardwalk' },
];
export const CITY = { min: -160, max: 160, road: 40, block: 32, lane: 8 };
export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  return DISTRICTS[2];
}
export function districtById(id) { return DISTRICTS.find(d => d.id === id) || DISTRICTS[2]; }
