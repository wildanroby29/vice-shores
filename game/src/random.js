// Seeded randomness for Vice Shores.
//
// The whole city is generated from one seed so that a given seed always
// produces the exact same streets, buildings, traffic and pedestrians. That
// is what makes the four staged screenshots reproducible: the same seed
// always gives the same frame. The generator below is mulberry32, a small
// and well-known seeded PRNG — a 32-bit state advanced by a fixed constant,
// scrambled with a couple of xor-shifts and multiplies, and read out as a
// float in [0, 1). Every random choice in the game (a building's width, a
// pedestrian's shirt, a traffic car's lane) draws from this one stream, in
// the order the world is built, so nothing ever depends on Math.random.

export function makeRng(seed) {
  let state = seed | 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one element of an array using the seeded stream.
export function pickOne(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// A float in [min, max) from the seeded stream.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}
