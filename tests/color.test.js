import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import { contrast, hsl, hslOf, luminance } from "../src/ui/color.js";

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
      expect(luminance("#004671")).toBeCloseTo(0.0555, 3);
      expect(contrast("#000000", "#ffffff")).toBeCloseTo(21);
    });

    it(`round-trips HSL as seen on screen with ColorManagement ${enabled ? "on" : "off"}`, () => {
      THREE.ColorManagement.enabled = enabled;
      expect(hsl(0, 1, 0.5)).toBe("#ff0000");
      expect(hslOf("#004671").l).toBeCloseTo(0.2216, 3);
    });
  }
});
