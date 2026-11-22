// Seeded random numbers for Vice Shores: one deterministic stream per seed, so the
// same seed always builds the same city, the same traffic and the same pedestrians.
export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return {
    next,
    // Integer in [min, max).
    int(min, max) {
      return min + Math.floor(next() * (max - min));
    },
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // One item from an array.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // True with the given probability.
    chance(p) {
      return next() < p;
    },
    // A value with a random sign.
    signed(mag) {
      return (next() < 0.5 ? -1 : 1) * mag;
    },
  };
}

// A tiny shuffle that reuses a seeded stream.
export function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}
