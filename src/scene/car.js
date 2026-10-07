import * as THREE from "three";
import { CAR, SPEED } from "../config.js";
import { frames } from "../core/time.js";
import { dress } from "./wire.js";

/**
 * The Polonez: one group holding the body and the four wheels, so moving or tilting the group
 * moves everything together. Wheels share the "polonez" materials with the body.
 *
 * @param {{ scene: THREE.Scene, models: Record<string, THREE.Group>, materials: import("./materials.js").Materials }} deps
 */
export function createCar({ scene, models, materials }) {
  const solid = materials.solid.polonez;
  const wire = materials.wire.polonez;

  const body = dress(models.polonez, solid, wire);
  body.position.set(CAR.bodyX, 0, 0);

  const wheelTemplate = dress(models.wheel, solid, wire);
  const wheels = CAR.wheels.map(([x, y, z]) => {
    const wheel = wheelTemplate.clone();
    wheel.position.set(x, y, z);
    if (x > 0) wheel.rotation.y = Math.PI; // mirror the right side
    return wheel;
  });

  const group = new THREE.Group();
  group.add(body, ...wheels);
  scene.add(group);

  return {
    group,
    body,

    /**
     * @param {number} dt
     * @param {number} speedMultiplier
     */
    update(dt, speedMultiplier) {
      const spin = SPEED.wheelSpin * speedMultiplier * frames(dt);
      for (const wheel of wheels) wheel.rotation.x += spin;
    },
  };
}
