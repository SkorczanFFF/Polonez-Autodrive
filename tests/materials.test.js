import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LAYERS, SHADING } from "../src/config.js";
import { createFadeIn } from "../src/scene/fade.js";
import { createMaterials } from "../src/scene/materials.js";

const materials = () => createMaterials({ [String(LAYERS.road.wireMap)]: new THREE.Texture() }, 1);

describe("solid materials", () => {
  it("are flat shaded per SHADING.flat", () => {
    for (const material of Object.values(materials().solid)) {
      expect(/** @type {any} */ (material).flatShading).toBe(SHADING.flat);
    }
  });

  // A copy on another shader variant is compiled on every spawn: a visible hitch.
  it("keep flat shading in fade-in copies (same shader program)", () => {
    const shared = materials().solid.rock;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), shared);
    createFadeIn(0.5).start(mesh);
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
