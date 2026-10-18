import { describe, expect, it } from "vitest";
import { CITY, SCENE } from "../src/config.js";
import { bandCity, layoutCity } from "../src/scene/environment/city.js";
import { CONVEYOR_END } from "../src/scene/environment/sideHills.js";

const params = { buildings: CITY.buildings, height: CITY.height, lit: CITY.lit };

describe("city", () => {
  it("stands far behind the side mountains' conveyor, clear of the road", () => {
    for (const b of layoutCity(params, 1)) {
      expect(b.z - b.d / 2).toBeGreaterThanOrEqual(CITY.near - 1e-6);
      expect(CITY.near).toBeGreaterThan(CONVEYOR_END);
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

  it("is drawn in bands, each staying behind the camera however it is bounded", () => {
    const buildings = layoutCity(params, 1);
    const bands = bandCity(buildings);
    expect(bands).toHaveLength(CITY.bands);
    expect(bands.flat()).toHaveLength(buildings.length);
    const width = (2 * CITY.halfWidth) / CITY.bands;
    bands.forEach((band, i) => {
      for (const b of band) {
        expect(b.x).toBeGreaterThanOrEqual(-CITY.halfWidth + i * width - 1e-6);
        expect(b.x).toBeLessThanOrEqual(-CITY.halfWidth + (i + 1) * width + 1e-6);
      }
      if (band.length === 0) return;
      // a bounding sphere around the band (half the box diagonal) ends behind the camera, so
      // frustum culling drops the band while the camera looks ahead
      const xs = band.flatMap((b) => [b.x - b.w / 2, b.x + b.w / 2]);
      const zs = band.flatMap((b) => [b.z - b.d / 2, b.z + b.d / 2]);
      const height = Math.max(...band.map((b) => b.h));
      const size = [Math.max(...xs) - Math.min(...xs), height, Math.max(...zs) - Math.min(...zs)];
      const radius = Math.hypot(...size) / 2;
      const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2;
      expect(centerZ - radius).toBeGreaterThan(SCENE.camera.position[2]);
    });
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
