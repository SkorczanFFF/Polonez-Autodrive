import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LAYERS, SHADING } from "../src/config.js";
import { createFader } from "../src/scene/fade.js";
import { testMaterials as materials } from "./helpers.js";

describe("solid materials", () => {
  it("are flat shaded per SHADING.flat, unlit layers unlit", () => {
    const { solid } = materials();
    for (const [key, material] of Object.entries(solid)) {
      if (LAYERS[key].unlit) expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
      else expect(/** @type {any} */ (material).flatShading).toBe(SHADING.flat);
    }
  });

  // A copy on another shader variant is compiled on every spawn: a visible hitch.
  it("keep flat shading in fade-in copies (same shader program)", () => {
    const shared = materials().solid.rock;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), shared);
    createFader().set(mesh, 0.5);
    expect(mesh.material).not.toBe(shared);
    expect(/** @type {any} */ (mesh.material).flatShading).toBe(SHADING.flat);
  });
});

describe("line materials", () => {
  it("carry the layer's glow for the bloom (default 1)", () => {
    const { wire } = materials();
    expect(wire.polonez.userData.glow).toBe(LAYERS.polonez.glow);
    expect(wire.hills.userData.glow).toBe(1);
    expect(wire.polonez.clone().userData.glow).toBe(LAYERS.polonez.glow); // fade-in copies
  });
});
