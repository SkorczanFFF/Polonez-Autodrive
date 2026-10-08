import { SPAWN } from "../config.js";
import { createFadeIn } from "./fade.js";

/**
 * @typedef {object} SpawnerOptions
 * @property {import("three").Object3D} parent where instances are added
 * @property {number} speed units per second at speedMultiplier 1
 * @property {(roll: number) => number} interval seconds between spawns at speed 1 and density 1;
 *   `roll` is a random number in [0, 1) fixed for the current cycle (for random intervals)
 * @property {number} [minInterval] lower bound in seconds after speed and density scaling
 * @property {() => import("three").Object3D[]} create new instances placed in x/y; z is set here
 * @property {number} [startZ]
 * @property {number} [endZ]
 * @property {number} [fadeIn] seconds new instances take to fade in from transparent (0 = pop in)
 */

/**
 * Spawns objects at startZ on a time accumulator and moves them towards endZ with the world
 * speed, all inside update(dt). Speed and density changes apply immediately, including to
 * objects already on the way.
 *
 * @param {SpawnerOptions} options
 */
export function createSpawner({
  parent,
  speed,
  interval,
  minInterval = 0,
  create,
  startZ = SPAWN.startZ,
  endZ = SPAWN.endZ,
  fadeIn = 0,
}) {
  /** @type {import("three").Object3D[]} */
  const objects = [];
  let elapsed = 0;
  let roll = Math.random();
  const fader = createFadeIn(fadeIn);

  const spawner = {
    objects,
    /** Spawn-rate multiplier (GUI density). */
    density: 1,
    /** When false, existing objects keep moving but nothing new spawns. */
    spawning: true,

    /** @param {number} speedMultiplier */
    currentInterval(speedMultiplier) {
      return Math.max(minInterval, interval(roll) / (speedMultiplier * spawner.density));
    },

    /**
     * @param {number} dt
     * @param {number} speedMultiplier
     */
    update(dt, speedMultiplier) {
      const velocity = speed * speedMultiplier;
      fader.update(dt);

      for (let i = objects.length - 1; i >= 0; i--) {
        const object = objects[i];
        object.position.z += velocity * dt;
        if (object.position.z > endZ) {
          fader.stop(object);
          parent.remove(object);
          objects.splice(i, 1);
        }
      }

      if (!spawner.spawning) {
        elapsed = 0; // the first spawn after re-enabling waits a full interval
        return;
      }

      elapsed += dt;
      let wait = spawner.currentInterval(speedMultiplier);
      while (elapsed >= wait) {
        elapsed -= wait;
        // Objects spawned late in a long frame start a bit further, keeping the spacing even.
        for (const object of create()) {
          object.position.z = startZ + elapsed * velocity;
          parent.add(object);
          objects.push(object);
          fader.start(object, elapsed);
        }
        roll = Math.random();
        wait = spawner.currentInterval(speedMultiplier);
      }
    },

    /** Removes every instance and restarts the timer. */
    clear() {
      fader.clear();
      for (const object of objects) parent.remove(object);
      objects.length = 0;
      elapsed = 0;
    },
  };

  return spawner;
}
