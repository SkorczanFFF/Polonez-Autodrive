import * as THREE from "three";
import { CAR, MINIGAME, SPAWN, SPEED, TRAFFIC } from "../config.js";
import { createSpawner } from "../scene/spawner.js";
import { createTrafficModels, trafficHalfWidth } from "../scene/traffic.js";

/**
 * @param {number[]} range [min, max] inclusive integers
 * @param {() => number} rng
 */
const randomInt = ([min, max], rng) => min + Math.floor(rng() * (max - min + 1));

/**
 * Obstacle x positions from v1: obstacles fill one lane (left or right of the centre safe zone)
 * for a batch of 1-3, then switch lanes. Lanes stay inside the car's steering range.
 *
 * @param {number} [halfWidth] half the widest obstacle
 * @param {() => number} [rng]
 */
export function createLanePicker(halfWidth = trafficHalfWidth(), rng = Math.random) {
  const { innerGap, outerMargin, safeZone, batch } = MINIGAME;
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
 * Minigame obstacles: oncoming traffic (scene/traffic.js), collision with the car and scoring.
 * Each car is a clone of a random model; its hitbox is the model's body and wheels.
 *
 * @param {{ scene: THREE.Scene, car: ReturnType<typeof import("../scene/car.js").createCar>, materials: import("../scene/materials.js").Materials }} deps
 */
export function createMinigame({ scene, car, materials }) {
  const models = createTrafficModels(materials);
  const nextX = createLanePicker();
  const [minInterval, maxInterval] = MINIGAME.interval;

  const spawner = createSpawner({
    parent: scene,
    speed: SPEED.traffic,
    interval: (roll) => minInterval + roll * (maxInterval - minInterval),
    fadeIn: SPAWN.fadeIn,
    fadeOut: SPAWN.fadeOut,
    create: () => {
      const car = models[Math.floor(Math.random() * models.length)].clone();
      car.position.set(nextX(), TRAFFIC.y, 0);
      car.userData.scored = false;
      return [car];
    },
  });
  spawner.spawning = false;

  const carBounds = new THREE.Box3();
  const obstacleBounds = new THREE.Box3();
  let score = 0;

  return {
    get score() {
      return score;
    },

    /** @param {boolean} value */
    set spawning(value) {
      spawner.spawning = value;
    },

    /** Removes all traffic, stops spawning and zeroes the score. */
    reset() {
      spawner.clear();
      spawner.spawning = false;
      score = 0;
    },

    /**
     * Moves the traffic, scores the cars that passed and reports a crash.
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

      for (const obstacle of spawner.objects) {
        const { min, max } = obstacle.userData.hitbox;
        obstacleBounds.min.fromArray(min).add(obstacle.position);
        obstacleBounds.max.fromArray(max).add(obstacle.position);
        if (carBounds.intersectsBox(obstacleBounds)) return { crashed: true, scored };
        if (!obstacle.userData.scored && obstacle.position.z > carZ) {
          obstacle.userData.scored = true;
          score++;
          scored = true;
        }
      }

      return { crashed: false, scored };
    },
  };
}
