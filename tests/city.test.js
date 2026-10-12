import { describe, expect, it } from "vitest";
import { CITY, MOUNTAINS, WORLD } from "../src/config.js";
import { layoutCity } from "../src/scene/environment/city.js";

const params = { buildings: CITY.buildings, height: CITY.height, lit: CITY.lit };

describe("city", () => {
  it("stands far behind the side mountains' conveyor, clear of the road", () => {
    for (const b of layoutCity(params, 1)) {
      expect(b.z - b.d / 2).toBeGreaterThanOrEqual(CITY.near - 1e-6);
      expect(CITY.near).toBeGreaterThan(WORLD.length + MOUNTAINS.chunkRows * MOUNTAINS.cell);
      expect(Math.abs(b.x) - b.w / 2).toBeGreaterThanOrEqual(CITY.roadGap - 1e-6);
    }
  });

  it("bends like a banana: downtown nearest, densest and tallest", () => {
    const list = layoutCity(params, 5);
    const middle = list.filter((b) => Math.abs(b.x) < CITY.halfWidth / 3);
    const ends = list.filter((b) => Math.abs(b.x) > (2 * CITY.halfWidth) / 3);
    const mean = (/** @type {number[]} */ values) =>
      values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean(middle.map((b) => b.z))).toBeLessThan(mean(ends.map((b) => b.z)));
    expect(middle.length).toBeGreaterThan(ends.length);
    expect(mean(middle.map((b) => b.h))).toBeGreaterThan(mean(ends.map((b) => b.h)));
  });

  it("never overlaps two towers", () => {
    const list = layoutCity(params, 2);
    for (const [i, a] of list.entries()) {
      for (const b of list.slice(i + 1)) {
        const apart =
          Math.abs(a.x - b.x) > (a.w + b.w) / 2 || Math.abs(a.z - b.z) > (a.d + b.d) / 2;
        expect(apart).toBe(true);
      }
    }
  });

  it("varies the lit windows between towers and follows the seed", () => {
    const list = layoutCity(params, 3);
    expect(new Set(list.map((b) => b.style)).size).toBeGreaterThan(1);
    expect(
      Math.max(...list.map((b) => b.lit)) - Math.min(...list.map((b) => b.lit)),
    ).toBeGreaterThan(0.3);
    expect(layoutCity(params, 3)).toEqual(list);
    expect(layoutCity(params, 4)).not.toEqual(list);
  });
});
