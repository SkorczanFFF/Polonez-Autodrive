import * as THREE from "three";
import { MOUNTAINS } from "../../config.js";
import { createHeightField, fillHeightField } from "../heightField.js";
import { createHorizonHeight } from "../mountains.js";
import { dress } from "../wire.js";

/**
 * Static mountain range in the mouth of the valley, in front of the sun (MOUNTAINS.horizon).
 * Far mountains barely move, so it stays put while the side mountains roll past it. A height
 * field like theirs, with coarser cells (MOUNTAINS.horizon.cell); "hills" layer materials.
 *
 * @param {import("../world.js").WorldContext} context
 */
export function createHills({ scene, materials, mountains }) {
  const { front, halfWidth, depth, cell } = MOUNTAINS.horizon;
  const geometry = createHeightField({ cols: (2 * halfWidth) / cell, rows: depth / cell, cell });
  const range = dress(new THREE.Mesh(geometry), materials.solid.hills, materials.wire.hills);
  range.traverse((object) => {
    object.castShadow = false; // far outside the shadow box
    object.receiveShadow = false;
  });
  range.position.set(-halfWidth, 0, front - depth); // local z = 0: the far ridge
  scene.add(range);

  /** Rebuilds the range from the current `mountains` settings (GUI). */
  function regenerate() {
    const heightAt = createHorizonHeight(mountains);
    fillHeightField(geometry, (x, z) => heightAt(x - halfWidth, z), {
      hideDiagonals: MOUNTAINS.lines === "squares",
    });
  }
  regenerate();

  return { range, regenerate };
}
