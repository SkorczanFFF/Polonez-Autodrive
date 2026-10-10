import { createSky } from "./environment/sky.js";
import { createLights } from "./environment/lights.js";
import { createGround } from "./environment/ground.js";
import { createSun } from "./environment/sun.js";
import { createHills } from "./environment/hills.js";
import { createSideHills } from "./environment/sideHills.js";
import { createScenery } from "./environment/scenery.js";
import { createMountainParams } from "./mountains.js";

/**
 * @typedef {object} WorldAssets
 * @property {import("three").Scene} scene
 * @property {import("./materials.js").Materials} materials
 * @property {Record<string, import("three").Group>} models
 */

/**
 * @typedef {WorldAssets & { mountains: import("./mountains.js").MountainParams }} WorldContext
 *   mountains: live generator settings shared by the side mountains and the horizon range
 */

/**
 * Every environment part follows this shape; parts are independent and can be swapped
 * (e.g. other mountains, a different sky) without touching the rest.
 *
 * @typedef {object} WorldPart
 * @property {(dt: number, speedMultiplier: number) => void} [update]
 */

/** @typedef {(context: WorldContext) => WorldPart} WorldPartFactory */

/**
 * The environment the car drives through. Owns the world speed shared by everything that
 * moves with the ground.
 *
 * @param {WorldAssets} assets
 */
export function createWorld(assets) {
  /** @type {WorldContext} */
  const context = { ...assets, mountains: createMountainParams() };

  // Order = update order. Swap a factory to replace a part.
  const parts = {
    sky: createSky(context),
    lights: createLights(context),
    ground: createGround(context),
    sun: createSun(context),
    hills: createHills(context),
    sideHills: createSideHills(context),
    scenery: createScenery(context),
  };
  /** @type {WorldPart[]} */
  const ordered = Object.values(parts);

  const world = {
    /** Named parts, e.g. parts.scenery.palms.density for the GUI. */
    parts,

    /** Mountain generator settings; the GUI edits them, then calls regenerate() on the parts. */
    mountains: context.mountains,

    /** 1 = base speed; the minigame raises it per tier. */
    speedMultiplier: 1,

    /** @param {number} dt */
    update(dt) {
      for (const part of ordered) part.update?.(dt, world.speedMultiplier);
    },
  };

  return world;
}
