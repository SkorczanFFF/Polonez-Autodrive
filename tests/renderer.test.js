import { describe, expect, it } from "vitest";
import { SCENE } from "../src/config.js";
import { fitFov } from "../src/core/renderer.js";

/** Horizontal fov in degrees for a vertical fov and an aspect ratio. */
const horizontal = (/** @type {number} */ fov, /** @type {number} */ aspect) =>
  (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * aspect) * 180) / Math.PI;

describe("camera fov", () => {
  it("keeps the configured fov on wide screens", () => {
    expect(fitFov(16 / 9)).toBe(SCENE.camera.fov);
  });

  it("widens the vertical fov on portrait screens to keep the minimum horizontal fov", () => {
    const aspect = 400 / 860; // phone
    const fov = fitFov(aspect);
    expect(fov).toBeGreaterThan(SCENE.camera.fov);
    expect(horizontal(fov, aspect)).toBeCloseTo(SCENE.camera.minHorizontalFov);
  });
});
