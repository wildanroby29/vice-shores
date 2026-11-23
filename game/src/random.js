// random.js — a tiny seeded generator (mulberry32) so the city, traffic and
// pedestrians come out identical on every load for a given seed. The live game
// and the screenshot scenes both draw from the same stream.
export function createRandom(seed) {
  let s = seed | 0;
  return function random() {
    s = (s + 0x6d2b79f5) | 0;
    let v = Math.imul(s ^ (s >>> 15), 1 | s);
    v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v;
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}
