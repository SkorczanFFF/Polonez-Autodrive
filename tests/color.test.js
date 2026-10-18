import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import { contrast, hsl, hslOf, luminance, oklchHue } from "../src/ui/color.js";
import { PALETTE } from "../src/config.js";

const managed = THREE.ColorManagement.enabled;
afterEach(() => (THREE.ColorManagement.enabled = managed));

describe("color math", () => {
  // the app turns ColorManagement off (main.js, vitest.setup.js); the results must not depend on it
  for (const enabled of [true, false]) {
    it(`gives WCAG luminance and contrast with ColorManagement ${enabled ? "on" : "off"}`, () => {
      THREE.ColorManagement.enabled = enabled;
      expect(luminance("#ffffff")).toBeCloseTo(1);
      expect(luminance("#000000")).toBe(0);
      expect(luminance("#808080")).toBeCloseTo(0.2159, 3);
      expect(luminance(PALETTE.uiDeep)).toBeCloseTo(0.0555, 3);
      expect(contrast("#000000", "#ffffff")).toBeCloseTo(21);
    });

    it(`round-trips HSL as seen on screen with ColorManagement ${enabled ? "on" : "off"}`, () => {
      THREE.ColorManagement.enabled = enabled;
      expect(hsl(0, 1, 0.5)).toBe("#ff0000");
      expect(hslOf(PALETTE.uiDeep).l).toBeCloseTo(0.2216, 3);
    });
  }

  it("gives the oklch hue, as CSS sees it", () => {
    expect(oklchHue("#ff0000")).toBeCloseTo(29.2, 0);
    expect(oklchHue("#00ff00")).toBeCloseTo(142.5, 0);
    expect(oklchHue("#0000ff")).toBeCloseTo(264.1, 0);
  });
});
