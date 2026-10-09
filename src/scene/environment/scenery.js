import { SPAWN, WORLD } from "../../config.js";
import { createSpawner } from "../spawner.js";
import { dress } from "../wire.js";

const FULL_TURN = 2 * Math.PI;

/** @param {number[]} range [min, max] */
const randomIn = ([min, max]) => min + Math.random() * (max - min);

/** @template T @param {T[]} items */
const pick = (items) => items[Math.floor(Math.random() * items.length)];

/**
 * @param {import("three").Object3D} template
 * @param {number} x
 * @param {number} [scale]
 */
function place(template, x, scale = 1) {
  const instance = template.clone();
  instance.position.set(x, 0, 0);
  instance.rotation.set(0, Math.random() * FULL_TURN, 0);
  instance.scale.setScalar(scale);
  return instance;
}

/**
 * Roadside props: palm pairs on both road edges and rocks scattered further out. Exposes
 * `palms.density` and `rocks.density` for the GUI.
 *
 * @param {import("../world.js").WorldContext} context
 */
export function createScenery({ scene, models, materials }) {
  const { palms: palmCfg, rocks: rockCfg } = SPAWN;

  const palm = dress(models[palmCfg.model], materials.solid.palm, materials.wire.palm);
  const rocks = rockCfg.models.map((key) =>
    dress(models[key], materials.solid.rock, materials.wire.rock),
  );

  const palmSpawner = createSpawner({
    parent: scene,
    speed: WORLD.speed,
    interval: () => palmCfg.interval,
    minInterval: palmCfg.minInterval,
    fadeIn: SPAWN.fadeIn,
    fadeOut: SPAWN.fadeOut,
    create: () => palmCfg.x.map((x) => place(palm, x)),
  });

  const rockSpawner = createSpawner({
    parent: scene,
    speed: WORLD.speed,
    interval: () => rockCfg.interval,
    minInterval: rockCfg.minInterval,
    fadeIn: SPAWN.fadeIn,
    fadeOut: SPAWN.fadeOut,
    create: () => [place(pick(rocks), randomIn(pick(rockCfg.xRanges)), randomIn(rockCfg.scale))],
  });

  return {
    palms: palmSpawner,
    rocks: rockSpawner,
    /**
     * @param {number} dt
     * @param {number} speedMultiplier
     */
    update(dt, speedMultiplier) {
      palmSpawner.update(dt, speedMultiplier);
      rockSpawner.update(dt, speedMultiplier);
    },
  };
}
