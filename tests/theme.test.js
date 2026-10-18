import { describe, expect, it } from "vitest";
import { LAYERS } from "../src/config.js";
import { oklchHue } from "../src/ui/color.js";
import { setSceneColor } from "../src/ui/theme.js";

/** A stand-in for <html>: records the custom properties set on it. */
function root() {
  /** @type {Map<string, string>} */
  const vars = new Map();
  const style = {
    setProperty: (/** @type {string} */ n, /** @type {string} */ v) => vars.set(n, v),
  };
  return { vars, element: /** @type {any} */ ({ style }) };
}

describe("scene colors for CSS", () => {
  it("exposes the color and, at its default, no hue turn", () => {
    const { vars, element } = root();
    setSceneColor("terrainWire", LAYERS.terrain.wire, element);
    expect(vars.get("--scene-terrain-wire")).toBe(LAYERS.terrain.wire);
    expect(Number(vars.get("--scene-terrain-wire-turn"))).toBeCloseTo(0);
  });

  it("reports how far the hue turned from the default, in oklch degrees", () => {
    const { vars, element } = root();
    setSceneColor("terrainWire", "#ff2a6d", element);
    const turn = oklchHue("#ff2a6d") - oklchHue(LAYERS.terrain.wire);
    expect(Number(vars.get("--scene-terrain-wire-turn"))).toBeCloseTo(turn, 0);
  });

  it("knows no turn for a color without a default", () => {
    const { vars, element } = root();
    setSceneColor("something", "#123456", element);
    expect(vars.get("--scene-something")).toBe("#123456");
    expect(vars.has("--scene-something-turn")).toBe(false);
  });
});
