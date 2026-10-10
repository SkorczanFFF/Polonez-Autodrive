/**
 * Seeded noise for procedural terrain, no dependencies. The same seed always gives the same
 * landscape, so a seed shown in the GUI brings a nice layout back.
 */

/**
 * mulberry32: a tiny, fast PRNG.
 *
 * @param {number} seed
 * @returns {() => number} random numbers in [0, 1)
 */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRADIENTS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * 2D simplex noise (Gustavson) with a permutation shuffled from the seed.
 *
 * @param {number} seed
 * @returns {(x: number, y: number) => number} smooth noise in about [-1, 1]
 */
export function createSimplex(seed) {
  const random = mulberry32(seed);
  const p = new Uint8Array(256).map((_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512).map((_, i) => p[i & 255]);

  /**
   * @param {number} gradient
   * @param {number} dx
   * @param {number} dy
   */
  const corner = (gradient, dx, dy) => {
    let t = 0.5 - dx * dx - dy * dy;
    if (t < 0) return 0;
    const [gx, gy] = GRADIENTS[gradient & 7];
    t *= t;
    return t * t * (gx * dx + gy * dy);
  };

  return (x, y) => {
    const skew = (x + y) * F2;
    const i = Math.floor(x + skew);
    const j = Math.floor(y + skew);
    const unskew = (i + j) * G2;
    const x0 = x - (i - unskew);
    const y0 = y - (j - unskew);
    const [i1, j1] = x0 > y0 ? [1, 0] : [0, 1];
    const ii = i & 255;
    const jj = j & 255;
    return (
      70 *
      (corner(perm[ii + perm[jj]], x0, y0) +
        corner(perm[ii + i1 + perm[jj + j1]], x0 - i1 + G2, y0 - j1 + G2) +
        corner(perm[ii + 1 + perm[jj + 1]], x0 - 1 + 2 * G2, y0 - 1 + 2 * G2))
    );
  };
}

/**
 * Ridged fBm: each octave folds the noise into `1 - |n|` (a crest where it crosses zero) and
 * squares it, so mountains get sharp ridges and soft valleys.
 *
 * @param {number} seed
 * @returns {(x: number, y: number, octaves: number, roughness: number) => number} 0..1;
 *   roughness: amplitude kept per octave (0 = only the big shapes, 1 = all detail at full)
 */
export function createRidged(seed) {
  const noise = createSimplex(seed);
  return (x, y, octaves, roughness) => {
    let sum = 0;
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    for (let octave = 0; octave < octaves; octave++) {
      const ridge = 1 - Math.min(Math.abs(noise(x * frequency, y * frequency)), 1);
      sum += ridge * ridge * amplitude;
      total += amplitude;
      amplitude *= roughness;
      frequency *= 2;
    }
    return total > 0 ? sum / total : 0;
  };
}
