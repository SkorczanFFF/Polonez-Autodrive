import { describe, expect, it } from "vitest";
import { createRidged, createSimplex, mulberry32 } from "../src/core/noise.js";

/** @type {[number, number][]} */
const points = [];
for (let x = 0; x < 20; x += 0.37) for (let y = 0; y < 20; y += 0.41) points.push([x, y]);

/** @param {(x: number, y: number) => number} f */
const samples = (f) => points.map(([x, y]) => f(x, y));

describe("mulberry32", () => {
  it("repeats for the same seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(mulberry32(43)()).not.toBe(mulberry32(42)());
  });
});

describe("simplex noise", () => {
  it("is deterministic per seed and differs between seeds", () => {
    expect(samples(createSimplex(7))).toEqual(samples(createSimplex(7)));
    expect(samples(createSimplex(7))).not.toEqual(samples(createSimplex(8)));
  });

  it("stays in [-1, 1] and uses most of it", () => {
    const values = samples(createSimplex(1));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(1);
  });

  it("is continuous", () => {
    const noise = createSimplex(3);
    for (const [x, y] of points) {
      expect(Math.abs(noise(x + 0.001, y) - noise(x, y))).toBeLessThan(0.02);
    }
  });
});

describe("ridged fBm", () => {
  it("stays in [0, 1] with sharp crests and low valleys", () => {
    const ridged = createRidged(5);
    const values = samples((x, y) => ridged(x, y, 4, 0.5));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
    expect(Math.max(...values)).toBeGreaterThan(0.6);
    expect(Math.min(...values)).toBeLessThan(0.3);
  });

  it("roughness 0 keeps only the first octave", () => {
    const ridged = createRidged(5);
    for (const [x, y] of [
      [0.3, 0.7],
      [4.1, 2.2],
    ]) {
      expect(ridged(x, y, 4, 0)).toBeCloseTo(ridged(x, y, 1, 0.5));
    }
  });
});
