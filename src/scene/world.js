import { createSky } from "./environment/sky.js";
import { createLights } from "./environment/lights.js";
import { createGround } from "./environment/ground.js";
import { createSun } from "./environment/sun.js";
import { createHills } from "./environment/hills.js";
import { createSideHills } from "./environment/sideHills.js";

/**
 * @typedef {object} WorldContext
 * @property {import("three").Scene} scene
 * @property {import("./materials.js").Materials} materials
 * @property {Record<string, import("three").Group>} models
 */

/**
 * Every environment part follows this shape; parts are independent and can be swapped
 * (e.g. animated side hills -> procedural ones) without touching the rest.
 *
 * @typedef {object} WorldPart
 * @property {(dt: number, speedMultiplier: number) => void} [update]
 */

/** @typedef {(context: WorldContext) => WorldPart} WorldPartFactory */

/** @type {WorldPartFactory[]} */
const PARTS = [createSky, createLights, createGround, createSun, createHills, createSideHills];

/**
 * The environment the car drives through. Owns the world speed shared by everything that
 * moves with the ground.
 *
 * @param {WorldContext} context
 */
export function createWorld(context) {
  const parts = PARTS.map((create) => create(context));

  const world = {
    /** 1 = base speed; the minigame raises it per tier. */
    speedMultiplier: 1,

    /** @param {number} dt */
    update(dt) {
      for (const part of parts) part.update?.(dt, world.speedMultiplier);
    },
  };

  return world;
}
