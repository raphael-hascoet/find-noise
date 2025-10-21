// Returns a deterministic pseudo-random number in [0, 1) based on the input string
export function seededRandom(str: string) {
  let h = 0x811c9dc5; // deterministic hash-based pseudo-random
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // finalizer to improve avalanche
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
}
