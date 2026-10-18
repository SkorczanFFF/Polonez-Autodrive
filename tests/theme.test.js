import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LAYERS, PALETTE, SUN } from "../src/config.js";
import { contrast } from "../src/ui/color.js";
import { UI_TINTS, turnHue } from "../src/ui/theme.js";

/** @param {string} color */
const hsl = (color) => new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);

describe("UI tints", () => {
  it("keep the PALETTE colors with the default scene", () => {
    for (const { base, tokens } of UI_TINTS) {
      for (const token of tokens) expect(turnHue(PALETTE[token], base, base)).toBe(PALETTE[token]);
    }
  });

  it("turn the hue with the scene color, keeping saturation and luminance", () => {
    const from = "#2de2e6"; // the default ground grid, cyan
    for (const to of ["#39ff14", "#ffe600", "#ff2a6d", "#4f33d9"]) {
      for (const token of /** @type {const} */ (["uiDeep", "aqua", "red"])) {
        const turned = turnHue(PALETTE[token], from, to);
        const turn = hsl(to).h - hsl(from).h;
        expect(hsl(turned).h).toBeCloseTo((hsl(PALETTE[token]).h + turn + 1) % 1, 1);
        // same luminance: text on panels keeps the contrast of the default look
        expect(contrast(turned, PALETTE[token])).toBeLessThan(1.05);
      }
    }
  });

  it("follow scene colors that exist, with PALETTE tokens", () => {
    /** @type {Map<string, string>} the scene colors the GUI reports, at their defaults */
    const scene = new Map();
    for (const [key, layer] of Object.entries(LAYERS)) {
      scene.set(`${key}Solid`, layer.solid).set(`${key}Wire`, layer.wire);
    }
    scene.set("sunTop", SUN.top).set("sunBottom", SUN.bottom);
    for (const { source, base, tokens } of UI_TINTS) {
      expect(scene.get(source)).toBe(base); // its default is the scene's starting color
      for (const token of tokens) expect(PALETTE[token]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
