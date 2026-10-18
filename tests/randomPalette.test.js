import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LAYERS } from "../src/config.js";
import { mulberry32 } from "../src/core/noise.js";
import { contrast, hueDistance, hueOf } from "../src/ui/color.js";
import { MIN_LINE_CONTRAST, createRandomPalette } from "../src/ui/randomPalette.js";

/** Many palettes from fixed seeds, every layer's fill and line from each. */
function samples(count = 300) {
  const random = mulberry32(42);
  return Array.from({ length: count }, () => {
    const palette = createRandomPalette(random);
    const layers = Object.keys(LAYERS).map(() => {
      const fill = palette.solid();
      return { fill, line: palette.wire(fill) };
    });
    return { palette, layers, sky: palette.sky(), fog: palette.fog() };
  });
}

describe("random palette", () => {
  it("gives valid hex colors", () => {
    const palette = createRandomPalette(mulberry32(1));
    const roles = [palette.solid(), palette.sky(), palette.fog(), palette.crt()];
    roles.push(palette.night(), palette.stars(), palette.moon());
    for (const color of roles) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("keeps every line readable against its fill", () => {
    for (const { layers } of samples()) {
      for (const { fill, line } of layers) {
        expect(contrast(line, fill)).toBeGreaterThanOrEqual(MIN_LINE_CONTRAST);
      }
    }
  });

  it("keeps lines saturated neon, not washed out to white", () => {
    for (const { layers } of samples()) {
      for (const { line } of layers) {
        const { s, l } = new THREE.Color(line).getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);
        expect(s).toBeGreaterThan(0.8);
        expect(l).toBeGreaterThanOrEqual(0.11); // dark lines on light fills stay colored too
        expect(l).toBeLessThanOrEqual(0.86);
      }
    }
  });

  it("gives lines another hue than their fill", () => {
    for (const { layers } of samples()) {
      for (const { fill, line } of layers) {
        expect(hueDistance(hueOf(line), hueOf(fill))).toBeGreaterThan(0.08);
      }
    }
  });

  it("at night keeps the sky darker than the fog glowing at the horizon", () => {
    for (const { palette, sky, fog } of samples()) {
      if (palette.mood !== "night") continue;
      expect(contrast(fog, "#000")).toBeGreaterThan(contrast(sky, "#000"));
    }
  });

  it("goes night, day and mixed: dark and light fills, lines flipping with them", () => {
    const lightness = (/** @type {string} */ color) =>
      new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace).l;
    const moods = new Set();
    let mixedLight = 0;
    let mixedDark = 0;
    for (const { palette, layers, sky } of samples()) {
      moods.add(palette.mood);
      for (const { fill, line } of layers) {
        const light = lightness(fill) > 0.5;
        if (palette.mood === "night") expect(light).toBe(false);
        if (palette.mood === "day") expect(light).toBe(true);
        if (palette.mood === "mixed") light ? mixedLight++ : mixedDark++;
        expect(lightness(line) < lightness(fill)).toBe(light); // dark lines on light fills
      }
      if (palette.mood === "day") expect(lightness(sky)).toBeGreaterThan(0.6);
    }
    expect([...moods].sort()).toEqual(["day", "mixed", "night"]);
    expect(mixedLight).toBeGreaterThan(0);
    expect(mixedDark).toBeGreaterThan(0);
  });

  it("is reproducible with a seeded random", () => {
    const a = createRandomPalette(mulberry32(7));
    const b = createRandomPalette(mulberry32(7));
    expect([a.solid(), a.sky(), a.fog()]).toEqual([b.solid(), b.sky(), b.fog()]);
  });
});
