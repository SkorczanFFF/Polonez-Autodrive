import { dress } from "../wire.js";

/**
 * Static hills on the horizon. hills.fbx contains an animation that v1 never played; it stays
 * static on purpose.
 *
 * @type {import("../world.js").WorldPartFactory}
 */
export function createHills({ scene, models, materials }) {
  scene.add(dress(models.hills, materials.solid.hills, materials.wire.hills));
  return {};
}
