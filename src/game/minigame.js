import * as THREE from "three";
import { CAR, MINIGAME, SPEED } from "../config.js";
import { createSpawner } from "../scene/spawner.js";

/**
 * @param {number[]} range [min, max] inclusive integers
 * @param {() => number} rng
 */
const randomInt = ([min, max], rng) => min + Math.floor(rng() * (max - min + 1));

/**
 * Box x positions from v1: boxes fill one lane (left or right of the centre safe zone) for a
 * batch of 1-3 boxes, then switch lanes. Lanes stay inside the car's steering range.
 *
 * @param {() => number} [rng]
 */
export function createLanePicker(rng = Math.random) {
  const { box, innerGap, outerMargin, safeZone, batch } = MINIGAME;
  const halfWidth = box.size[0] / 2;
  const reach = CAR.steer.maxOffset;
  const minLaneWidth = 0.1; // v1 guard for tiny steering ranges

  const lanes = {
    left: [-reach + outerMargin, -safeZone - halfWidth - innerGap],
    right: [safeZone + halfWidth + innerGap, reach - outerMargin],
  };
  for (const range of Object.values(lanes)) {
    if (range[1] <= range[0]) range[1] = range[0] + minLaneWidth;
  }

  /** @type {"left" | "right"} */
  let lane = "left";
  let count = 0;
  let batchSize = randomInt(batch, rng);

  return () => {
    const [min, max] = lanes[lane];
    const x = min + rng() * (max - min);
    count++;
    if (count >= batchSize) {
      lane = lane === "left" ? "right" : "left";
      count = 0;
      batchSize = randomInt(batch, rng);
    }
    return x;
  };
}

/**
 * Minigame obstacles: spawning, collision with the car and scoring. One shared geometry and
 * material for all boxes; the hitbox equals the visible box.
 *
 * @param {{ scene: THREE.Scene, car: ReturnType<typeof import("../scene/car.js").createCar>, materials: import("../scene/materials.js").Materials }} deps
 */
export function createMinigame({ scene, car, materials }) {
  const size = new THREE.Vector3().fromArray(MINIGAME.box.size);
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const nextX = createLanePicker();
  const [minInterval, maxInterval] = MINIGAME.interval;

  const spawner = createSpawner({
    parent: scene,
    speed: SPEED.box,
    interval: (roll) => minInterval + roll * (maxInterval - minInterval),
    create: () => {
      const box = new THREE.Mesh(geometry, materials.box);
      box.position.set(nextX(), MINIGAME.box.y, 0);
      box.userData.scored = false;
      return [box];
    },
  });
  spawner.spawning = false;

  const carBounds = new THREE.Box3();
  const boxBounds = new THREE.Box3();
  let score = 0;

  return {
    get score() {
      return score;
    },

    /** @param {boolean} value */
    set spawning(value) {
      spawner.spawning = value;
    },

    /** Removes all boxes, stops spawning and zeroes the score. */
    reset() {
      spawner.clear();
      spawner.spawning = false;
      score = 0;
    },

    /**
     * Moves boxes, scores the ones that passed the car and reports a crash.
     *
     * @param {number} dt
     * @param {number} speedMultiplier
     * @returns {{ crashed: boolean, scored: boolean }}
     */
    update(dt, speedMultiplier) {
      spawner.update(dt, speedMultiplier);
      if (spawner.objects.length === 0) return { crashed: false, scored: false };

      car.getBounds(carBounds);
      const carZ = car.group.position.z;
      let scored = false;

      for (const box of spawner.objects) {
        boxBounds.setFromCenterAndSize(box.position, size);
        if (carBounds.intersectsBox(boxBounds)) return { crashed: true, scored };
        if (!box.userData.scored && box.position.z > carZ) {
          box.userData.scored = true;
          score++;
          scored = true;
        }
      }

      return { crashed: false, scored };
    },
  };
}
