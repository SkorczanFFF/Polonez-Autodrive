import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { SCENE, SUN } from "../src/config.js";
import { sunDirections } from "../src/scene/environment/lights.js";

describe("sun light directions", () => {
  const directions = sunDirections();

  it("creates one unit direction per sample, all above the horizon and towards -z", () => {
    expect(directions).toHaveLength(SCENE.lights.sun.samples);
    for (const d of directions) {
      expect(d.length()).toBeCloseTo(1);
      expect(d.y).toBeGreaterThan(0);
      expect(d.z).toBeLessThan(0);
    }
  });

  it("is centred on the visible part of the sun disc", () => {
    const mean = directions.reduce((sum, d) => sum.add(d), new THREE.Vector3()).normalize();
    const [x, y, z] = SUN.disc.position;
    const centroid = new THREE.Vector3(x, y + (4 * SUN.disc.radius) / (3 * Math.PI), z).normalize();
    expect(mean.angleTo(centroid)).toBeLessThan(0.05);
  });

  it("spreads wider with a larger spread and collapses to one direction without it", () => {
    const spreadOf = (/** @type {THREE.Vector3[]} */ ds) =>
      Math.max(...ds.flatMap((a) => ds.map((b) => a.angleTo(b))));
    expect(spreadOf(sunDirections({ samples: 5, spread: 0.8 }))).toBeGreaterThan(
      spreadOf(sunDirections({ samples: 5, spread: 0.4 })),
    );
    expect(spreadOf(sunDirections({ samples: 5, spread: 0 }))).toBeCloseTo(0);
  });
});
