import { describe, expect, it } from "vitest";
import { MOUNTAINS } from "../src/config.js";
import {
  createHorizonHeight,
  createMountainHeight,
  createMountainParams,
} from "../src/scene/mountains.js";

/** @param {(x: number) => number} f @param {number} from @param {number} to */
const average = (f, from, to) => {
  let sum = 0;
  for (let i = 0; i < 100; i++) sum += f(from + ((to - from) * i) / 99);
  return sum / 100;
};

describe("mountain height", () => {
  it("is the flat lift up to the start, mountains past it", () => {
    const heightAt = createMountainHeight(createMountainParams(1));
    for (const x of [0, 30, -60, MOUNTAINS.start, -MOUNTAINS.start]) {
      expect(heightAt(x, 123)).toBe(MOUNTAINS.lift);
    }
    expect(average((s) => heightAt(MOUNTAINS.outer, s), 0, 2000)).toBeGreaterThan(5);
  });

  it("follows the live settings and the seed", () => {
    const params = createMountainParams(1);
    const before = createMountainHeight(params)(250, 40);
    params.height *= 2;
    expect(createMountainHeight(params)(250, 40) - MOUNTAINS.lift).toBeCloseTo(
      2 * (before - MOUNTAINS.lift),
    );
    expect(createMountainHeight(createMountainParams(2))(250, 40)).not.toBe(before);
  });
});

describe("horizon range height", () => {
  const { halfWidth, depth } = MOUNTAINS.horizon;

  it("parts for the road: flat in the pass, steep walls tallest beside it", () => {
    const { pass, wall } = MOUNTAINS.horizon;
    const heightAt = createHorizonHeight(createMountainParams(3));
    for (const x of [0, 10, -pass, pass]) expect(heightAt(x, depth / 2)).toBe(MOUNTAINS.lift);
    const walls = average((x) => heightAt(x, depth / 2), pass + wall, pass + wall + 20);
    const ends = average((x) => heightAt(x, depth / 2), halfWidth - 20, halfWidth);
    expect(walls).toBeGreaterThan(0.3 * MOUNTAINS.height);
    expect(walls).toBeGreaterThan(ends);
  });

  it("rises from the ground at its front edge to its highest at the far ridge", () => {
    const heightAt = createHorizonHeight(createMountainParams(3));
    for (const x of [-100, 0, 77]) expect(heightAt(x, depth)).toBeCloseTo(MOUNTAINS.lift);
    const wallsAt = (/** @type {number} */ z) => average((x) => heightAt(x, z), 50, halfWidth);
    expect(wallsAt(0)).toBeGreaterThan(wallsAt(depth / 2));
    expect(wallsAt(depth / 2)).toBeGreaterThan(wallsAt(0.9 * depth));
  });
});
