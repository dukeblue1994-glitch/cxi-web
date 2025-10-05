/**
 * Deterministic pseudo-random number generator seeded from a string.
 * Uses an xorshift-like algorithm that is fast and reproducible.
 */
export function createRng(seedInput = "cxi") {
  const seedString = String(seedInput);
  let state = 1779033703 ^ seedString.length;
  for (let i = 0; i < seedString.length; i += 1) {
    state = Math.imul(state ^ seedString.charCodeAt(i), 3432918353);
    state = (state << 13) | (state >>> 19);
  }
  return function next() {
    state = Math.imul(state ^ (state >>> 16), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    const t = (state ^= state >>> 16) >>> 0;
    return t / 4294967296;
  };
}

export function randomize(items, rng = Math.random) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
