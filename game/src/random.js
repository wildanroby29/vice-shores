// A small seeded random number generator (mulberry32) plus the helpers the game
// uses to pick colours, positions and names: the same seed always gives the same
// city, traffic and crowds, which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [a, b). */
export function range(rng, a, b) {
  return a + rng() * (b - a);
}

/** An integer in [a, b]. */
export function int(rng, a, b) {
  return a + Math.floor(rng() * (b - a + 1));
}

/** One element of an array, picked by the seeded stream. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** The array shuffled in place by the seeded stream (Fisher-Yates). */
export function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}
