import * as THREE from "three";
import { dress } from "../wire.js";

/**
 * Hills along both sides of the road.
 *
 * This is the seam for a future procedural generator: any replacement only has to follow the
 * WorldPart contract (`createSideHills(context) -> { update(dt, speedMultiplier) }`), use the
 * "side" layer materials (so the GUI keeps working) and move its geometry with WORLD.speed.
 *
 * Current implementation: the baked animation from side.fbx, played by a single mixer and scaled
 * by the world speed.
 *
 * @type {import("../world.js").WorldPartFactory}
 */
export function createSideHills({ scene, models, materials }) {
  const hills = dress(models.side, materials.solid.side, materials.wire.side);
  scene.add(hills);

  const mixer = new THREE.AnimationMixer(hills);
  const [clip] = hills.animations;
  if (clip) mixer.clipAction(clip).play();

  return {
    update(dt, speedMultiplier) {
      mixer.update(dt * speedMultiplier);
    },
  };
}
