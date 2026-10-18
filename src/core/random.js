/**
 * Random choices. `createRandom(random)` binds them to a source of numbers in [0, 1): seeded
 * (mulberry32 in core/noise.js) for layouts that come back with their seed, or a test's; the
 * plain exports draw from Math.random.
 *
 * @param {() => number} [random]
 */
export function createRandom(random = Math.random) {
  /** @param {number} min @param {number} max */
  const between = (min, max) => min + random() * (max - min);
  /** @param {number[]} range [min, max] */
  const randomIn = ([min, max]) => between(min, max);
  /** @param {number[]} range [min, max], inclusive integers */
  const randomInt = ([min, max]) => min + Math.floor(random() * (max - min + 1));
  /** @template T @param {readonly T[]} items */
  const pick = (items) => items[Math.floor(random() * items.length)];
  return { random, between, randomIn, randomInt, pick };
}

export const { between, randomIn, randomInt, pick } = createRandom();
